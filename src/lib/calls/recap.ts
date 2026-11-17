/**
 * Client recap builder — turns a call's cached debrief into the plain-language,
 * client-facing takeaways page (served at /recap/[id]/[callId], print → PDF).
 *
 * Reuses the strategy readers: the cached analysis+ideas (Mongo), the tree (for
 * niche/edge classification), and the transcript (to trace each idea back to the
 * real moment it came from). No new LLM calls — the debrief must already be run.
 */
import { getAccountById } from "@/lib/mongodb/accounts";
import { getDebrief } from "@/lib/mongodb/debriefs";
import { getTree, markPrimaryNiche } from "@/lib/notion/tree";
import { getCalls, getCallTranscript } from "@/lib/notion/calls";
import type { NotionConfig } from "@/lib/notion/types";
import type { VideoIdea } from "@/lib/calls/ideas";

export interface RecapVideo {
  title: string;
  node: string;
  lens: string;
  format: string;
  edge: boolean;
  source: string; // the transcript window this idea came from
}
export interface RecapData {
  client: string;
  niche: string;
  callTitle: string;
  callDate: string;
  touchedCount: number;
  totalSituations: number;
  edgeTouched: string[];
  otherTouched: string[];
  opportunities: { title: string; summary: string }[];
  videos: RecapVideo[];
  confirm: string[];
}
export type RecapResult =
  | { ok: true; data: RecapData }
  | { ok: false; reason: "no-account" | "no-config" | "not-analyzed" };

const FMT: Record<string, string> = {
  "talking-head": "Talking head",
  explainer: "Explainer",
  listing: "Listing tour",
  kinetic: "Kinetic",
};

export async function buildRecap(accountId: string, callId: string): Promise<RecapResult> {
  const account = await getAccountById(accountId);
  if (!account) return { ok: false, reason: "no-account" };
  const notion = account.notion as NotionConfig | undefined;
  if (!notion) return { ok: false, reason: "no-config" };

  const doc = await getDebrief(accountId, callId);
  if (!doc) return { ok: false, reason: "not-analyzed" };
  const { analysis, ideas } = doc;

  const [nodesRaw, calls] = await Promise.all([getTree(notion), getCalls(notion).catch(() => [])]);
  const nodes = markPrimaryNiche(nodesRaw, account.primaryNiche);
  const call = calls.find((c) => c.id === callId);

  // niche node + all its descendants = the "edge"
  const niche = nodes.find((n) => n.isPrimaryNiche);
  const edgeIds = new Set<string>();
  if (niche) {
    const stack = [niche.id];
    while (stack.length) {
      const cur = stack.pop() as string;
      edgeIds.add(cur);
      for (const n of nodes) if (n.parentId === cur) stack.push(n.id);
    }
  }

  // coverage, deduped by node
  const seen = new Set<string>();
  const touched: { nodeId: string; nodeName: string }[] = [];
  for (const c of analysis.coverage) {
    if (c.verdict === "silent" || seen.has(c.nodeId)) continue;
    seen.add(c.nodeId);
    touched.push({ nodeId: c.nodeId, nodeName: c.nodeName });
  }
  const edgeTouched = touched.filter((c) => edgeIds.has(c.nodeId)).map((c) => c.nodeName);
  const otherTouched = touched.filter((c) => !edgeIds.has(c.nodeId)).map((c) => c.nodeName);
  const totalSituations = new Set(analysis.coverage.map((c) => c.nodeId)).size;

  // trace each idea to its transcript moment (best-effort; empty on failure)
  let sources: string[] = ideas.map(() => "");
  try {
    const transcript = await getCallTranscript(callId);
    sources = matchSources(transcript, ideas);
  } catch {
    /* transcript unavailable — ideas still render, just without provenance */
  }

  const videos: RecapVideo[] = ideas.map((i, idx) => ({
    title: i.angle,
    node: i.node,
    lens: i.lens,
    format: FMT[i.suggestedFormat] ?? i.suggestedFormat,
    edge: i.isPrimaryNiche,
    source: sources[idx] ?? "",
  }));

  const confirm = Array.from(new Set(ideas.flatMap((i) => i.factsToConfirm))).slice(0, 4);

  return {
    ok: true,
    data: {
      client: account.name || accountId,
      niche: account.primaryNiche || niche?.name || "",
      callTitle: call?.name || "Our call",
      callDate: call?.date ? call.date.slice(0, 10) : "",
      touchedCount: touched.length,
      totalSituations,
      edgeTouched,
      otherTouched,
      opportunities: analysis.newStories ?? [],
      videos,
      confirm,
    },
  };
}

/* ---------- transcript → per-idea source matching ---------- */

const STOP = new Set(
  "the a an and or of to in on for i im is it be at we you they them that this with my your their he she her his can could would should what when how who why where do does".split(" ")
);
function clean(t: string): string {
  return t
    .replace(/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/g, " ") // SRT ranges
    .replace(/\[Speaker\s*\d+\]/g, " ")
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, " ")
    .replace(/\b(?:um|uh|uhh|uhm)\b,?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
function kws(s: string): Set<string> {
  return new Set((s.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length > 3 && !STOP.has(w)));
}
function bigrams(s: string): Set<string> {
  const c = s.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const b = new Set<string>();
  for (let i = 0; i < c.length - 1; i++) b.add(c.slice(i, i + 2));
  return b;
}
function dice(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return (2 * inter) / (a.size + b.size);
}

/** For each idea, find the transcript sentence(s) it most likely came from. */
export function matchSources(transcript: string, ideas: VideoIdea[]): string[] {
  const c = clean(transcript);
  const sents = c.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter((s) => s.length > 12);
  const data = sents.map((s) => ({ kw: kws(s), bg: bigrams(s) }));

  return ideas.map((idea) => {
    const spoken = idea.hooks.find((h) => h.type === "spoken");
    const pref = idea.hooks.find((h) => h.preferred) ?? idea.hooks[0];
    const q = spoken?.text ?? pref?.text ?? idea.angle;
    const qk = kws(q);
    const qb = bigrams(q);
    let best = -1;
    let bi = 0;
    data.forEach((d, idx) => {
      const overlap = qk.size ? [...qk].filter((w) => d.kw.has(w)).length / qk.size : 0;
      const score = 0.5 * dice(qb, d.bg) + 0.5 * overlap;
      if (score > best) {
        best = score;
        bi = idx;
      }
    });
    let win = sents[bi] ?? "";
    if (win.length < 90 && bi + 1 < sents.length) win += " " + sents[bi + 1];
    win = win.trim();
    if (win.length > 230) win = win.slice(0, 228).replace(/\s+\S*$/, "") + "…";
    return win;
  });
}
