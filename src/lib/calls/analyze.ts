/**
 * Call-coverage analysis: transcript × situation tree → per-node verdicts,
 * saved to the Notion Calls db. The "process a call" function (plumbing lane).
 *
 * Reads the tree through src/lib/notion/tree.ts (strategy lane's reader —
 * never parse the Tree db here). Calls-db discovery below is TEMP — swap to
 * lib/notion/calls.ts when the strategy session merges it.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getNotionClient } from "@/lib/notion/client";
import type { NotionConfig } from "@/lib/notion/types";
import type { TreeNode } from "@/lib/notion/tree";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export interface NodeVerdict {
  nodeId: string;
  nodeName: string;
  verdict: "hit" | "grazed" | "silent";
  evidence?: string; // short quote/paraphrase from the transcript
}

export interface CallAnalysis {
  summary: string;
  coverage: NodeVerdict[];
  newStories: { title: string; summary: string }[];
  factsConfirmed: string[];
  stillOpen: string[];
}

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "coverage", "newStories", "factsConfirmed", "stillOpen"],
  properties: {
    summary: { type: "string", description: "2-3 sentence summary of the call" },
    coverage: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nodeId", "nodeName", "verdict"],
        properties: {
          nodeId: { type: "string" },
          nodeName: { type: "string" },
          verdict: { type: "string", enum: ["hit", "grazed", "silent"] },
          evidence: { type: "string", description: "Short supporting quote for hit/grazed" },
        },
      },
    },
    newStories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "summary"],
        properties: { title: { type: "string" }, summary: { type: "string" } },
      },
    },
    factsConfirmed: { type: "array", items: { type: "string" } },
    stillOpen: { type: "array", items: { type: "string" } },
  },
} as const;

/**
 * One Claude call: the transcript against every status-bearing tree node.
 * Structure nodes (no status) are skipped — they're containers, not coverage
 * targets.
 */
export async function analyzeTranscript(
  transcript: string,
  nodes: TreeNode[]
): Promise<CallAnalysis> {
  const targets = nodes.filter((n) => n.status);
  const nodeList = targets
    .map((n) => `- id: ${n.id} | ${n.name} (status: ${n.status})${n.why ? ` — context: ${n.why.slice(0, 200)}` : ""}`)
    .join("\n");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `You analyze a real-estate agent's story-call transcript against his content "situation tree" — the client situations he should own. For EVERY node below, judge whether this call substantively discussed it (hit — with a short supporting quote), mentioned it in passing (grazed), or did not touch it (silent). Also extract: new client-story candidates told on the call, concrete facts the agent stated on tape (numbers, contact info, process rules), and important topics that remain uncovered.

TREE NODES:
${nodeList}

TRANSCRIPT:
${transcript}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Analysis was refused");
  }
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("No analysis output");
  return JSON.parse(text.text) as CallAnalysis;
}

const TTL_MS = 10 * 60 * 1000;
const discovered = new Map<string, { id: string | null; at: number }>();
const stripId = (id: string) => id.replace("collection://", "");

/**
 * TEMP — replace with lib/notion/calls.ts when the strategy session merges
 * its Calls reader. Discover the "Calls" child db on the client's page.
 */
export async function findCallsDataSource(
  config: NotionConfig,
  client: AnyClient = getNotionClient()
): Promise<string | null> {
  const key = `calls:${config.postsDataSourceId}`;
  const hit = discovered.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.id;

  let found: string | null = null;
  try {
    const ds = await client.dataSources.retrieve({ data_source_id: stripId(config.postsDataSourceId) });
    const databaseId: string | undefined = ds?.parent?.database_id;
    if (databaseId) {
      const db = await client.databases.retrieve({ database_id: databaseId });
      const pageId: string | undefined = db?.parent?.page_id;
      if (pageId) {
        let cursor: string | undefined;
        do {
          const res = await client.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
          for (const b of res.results ?? []) {
            const title = b.type === "child_database" ? (b.child_database?.title ?? "") : "";
            if (/^calls$/i.test(title.trim())) {
              const callsDb = await client.databases.retrieve({ database_id: b.id });
              found = callsDb?.data_sources?.[0]?.id ?? null;
              break;
            }
          }
          cursor = found ? undefined : res.has_more ? res.next_cursor : undefined;
        } while (cursor);
      }
    }
  } catch (err) {
    console.warn("[calls:discovery] failed", err);
  }
  discovered.set(key, { id: found, at: Date.now() });
  return found;
}

export interface CallRow {
  id: string;
  url: string;
  title: string;
  date?: string;
  nodeIds: string[];
}

/** List rows in the Calls db, newest first. Best effort — [] when absent. */
export async function listCalls(
  config: NotionConfig,
  client: AnyClient = getNotionClient()
): Promise<CallRow[]> {
  const dataSourceId = await findCallsDataSource(config, client);
  if (!dataSourceId) return [];
  try {
    const res = await client.dataSources.query({ data_source_id: dataSourceId, page_size: 50 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: CallRow[] = (res.results ?? []).map((p: any) => ({
      id: p.id,
      url: p.url ?? "",
      title: p.properties?.Call?.title?.map((t: AnyClient) => t.plain_text).join("") ?? "(untitled)",
      date: p.properties?.Date?.date?.start,
      nodeIds: p.properties?.["Nodes touched"]?.relation?.map((r: AnyClient) => r.id) ?? [],
    }));
    rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    return rows;
  } catch (err) {
    console.warn("[calls:list] failed", err);
    return [];
  }
}

const para = (text: string) => ({
  type: "paragraph",
  paragraph: { rich_text: [{ text: { content: text.slice(0, 1900) } }] },
});
const heading = (text: string) => ({
  type: "heading_3",
  heading_3: { rich_text: [{ text: { content: text } }] },
});

/**
 * Save the analysis as a Calls row: title, date, Nodes touched (hit+grazed),
 * follow-ups, and the full breakdown in the page body. Best effort.
 */
export async function writeCallAnalysisToNotion(
  config: NotionConfig,
  input: { title: string; date: string; analysis: CallAnalysis },
  client: AnyClient = getNotionClient()
): Promise<{ pageId: string; url: string } | null> {
  try {
    const dataSourceId = await findCallsDataSource(config, client);
    if (!dataSourceId) return null;

    const { analysis } = input;
    const touched = analysis.coverage.filter((c) => c.verdict !== "silent");
    const silent = analysis.coverage.filter((c) => c.verdict === "silent");

    const children: unknown[] = [para(analysis.summary)];
    children.push(heading("Tree coverage"));
    for (const c of touched) {
      children.push(para(`${c.verdict === "hit" ? "HIT" : "GRAZED"} — ${c.nodeName}${c.evidence ? `: "${c.evidence}"` : ""}`));
    }
    if (silent.length) children.push(para(`Silent: ${silent.map((c) => c.nodeName).join(" · ")}`));
    if (analysis.newStories.length) {
      children.push(heading("New story candidates"));
      for (const s of analysis.newStories) children.push(para(`${s.title} — ${s.summary}`));
    }
    if (analysis.factsConfirmed.length) {
      children.push(heading("Facts confirmed on tape"));
      for (const f of analysis.factsConfirmed) children.push(para(f));
    }

    const page = await client.pages.create({
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties: {
        Call: { title: [{ text: { content: input.title } }] },
        Type: { select: { name: "Story call" } },
        Date: { date: { start: input.date } },
        "Nodes touched": { relation: touched.map((c) => ({ id: c.nodeId })) },
        "Follow-ups": {
          rich_text: [{ text: { content: analysis.stillOpen.join("; ").slice(0, 1900) } }],
        },
      },
      children,
    });
    return { pageId: page.id, url: page.url ?? "" };
  } catch (err) {
    console.warn("[calls:write] failed", err);
    return null;
  }
}
