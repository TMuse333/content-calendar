"use client";

/**
 * Debrief — pick a story call → the transcript is pulled from Notion, then you
 * see (1) how it hit the niche + taxonomy tree (coverage rendered ON the tree)
 * and (2) the video ideas it produced. Dark UI (zinc-950 ground, cyan accents).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Sparkles, ChevronDown, ChevronRight, Film, Target, Phone, Check, RotateCw } from "lucide-react";

interface CallRow {
  id: string;
  url: string;
  title: string;
  date?: string;
}
type Verdict = "hit" | "grazed" | "silent";
interface NodeVerdict {
  nodeId: string;
  nodeName: string;
  verdict: Verdict;
  evidence?: string;
}
interface CallAnalysis {
  summary: string;
  coverage: NodeVerdict[];
  newStories: { title: string; summary: string }[];
  factsConfirmed: string[];
  stillOpen: string[];
}
interface IdeaHook {
  text: string;
  style: string;
  type: "spoken" | "card";
  preferred: boolean;
}
interface VideoIdea {
  node: string;
  nodeId?: string;
  lens: string;
  form?: "video" | "carousel"; // older cached debriefs predate the field
  angle: string;
  suggestedFormat: string;
  hooks: IdeaHook[];
  beliefBefore: string;
  beliefAfter: string;
  surprise?: string;
  factsToConfirm: string[];
  isPrimaryNiche: boolean;
}
/** Subset of the /tree/evidence node we need to draw the taxonomy. */
interface TreeNode {
  id: string;
  name: string;
  level: string;
  parentId?: string;
  isPrimaryNiche?: boolean;
}

/** The 8 faceted lenses a node can be covered through. */
const LENSES = ["Who", "What", "When", "Where", "Why", "How", "How much", "What if"];

const VERDICT_DOT: Record<Verdict, string> = {
  hit: "bg-emerald-500",
  grazed: "bg-amber-500",
  silent: "bg-zinc-700",
};
const VERDICT_TEXT: Record<Verdict, string> = {
  hit: "text-emerald-300",
  grazed: "text-amber-300",
  silent: "text-zinc-500",
};

export default function DebriefPage() {
  const { id } = useParams<{ id: string }>();
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    fetch(`/api/accounts/${id}/calls`)
      .then((r) => r.json())
      .then((d) => setCalls(d.data ?? []))
      .catch(() => {});
    fetch(`/api/accounts/${id}/tree/evidence`)
      .then((r) => r.json())
      .then((d) => setTree(d.data ?? []))
      .catch(() => {});
    // which calls already have a cached debrief → badges on the list
    fetch(`/api/accounts/${id}/debrief`)
      .then((r) => r.json())
      .then((d) => setCachedIds(new Set((d.cached ?? []).map((c: { callId: string }) => c.callId))))
      .catch(() => {});
  }, [id]);

  const run = useCallback(
    async (callId: string, refresh = false) => {
      setActiveCallId(callId);
      setErr(null);
      setAnalysis(null);
      setIdeas([]);
      setFromCache(false);

      // 1) try the cache first (instant) unless re-running
      if (!refresh) {
        try {
          const cr = await fetch(`/api/accounts/${id}/debrief?callId=${callId}`);
          const cd = await cr.json();
          if (cr.ok && cd.cached) {
            setAnalysis(cd.analysis);
            setIdeas(cd.ideas ?? []);
            setFromCache(true);
            return;
          }
        } catch {
          /* fall through to compute */
        }
      }

      // 2) cache miss (or refresh) → compute (two Opus calls, ~50s)
      setLoading(true);
      try {
        const res = await fetch(`/api/accounts/${id}/debrief`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callId, refresh }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error ?? "Debrief failed");
        setAnalysis(d.analysis);
        setIdeas(d.ideas ?? []);
        setCachedIds((prev) => new Set(prev).add(callId));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Debrief failed");
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  /** verdict (+ evidence) per node id, deduped — the LLM can emit a node twice. */
  const verdicts = useMemo(() => {
    const m = new Map<string, NodeVerdict>();
    for (const c of analysis?.coverage ?? []) {
      const prev = m.get(c.nodeId);
      // keep the strongest verdict if a node shows up more than once
      if (!prev || rank(c.verdict) > rank(prev.verdict)) m.set(c.nodeId, c);
    }
    return m;
  }, [analysis]);

  const scored = [...verdicts.values()];
  const counts = {
    hit: scored.filter((c) => c.verdict === "hit").length,
    grazed: scored.filter((c) => c.verdict === "grazed").length,
    silent: scored.filter((c) => c.verdict === "silent").length,
  };
  const nicheNode = tree.find((n) => n.isPrimaryNiche);
  const nicheVerdict = nicheNode ? verdicts.get(nicheNode.id)?.verdict : undefined;
  const nicheIdeas = ideas.filter((i) => i.isPrimaryNiche).length;
  const litLenses = new Set(
    ideas.filter((i) => i.isPrimaryNiche).map((i) => i.lens.trim().toLowerCase())
  );

  // forest roots for the coverage tree
  const byId = useMemo(() => new Map(tree.map((n) => [n.id, n])), [tree]);
  const roots = tree.filter((n) => !n.parentId || !byId.has(n.parentId));

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Debrief</h1>
        <p className="text-zinc-400 mb-6 text-sm">
          Pick a story call — the transcript is pulled from Notion, then you see how it hit the niche and taxonomy
          tree, plus the video ideas it produced.
        </p>

        {/* pick a call — scrollable list; badge shows which are already analyzed */}
        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800 max-h-64 overflow-y-auto">
          {calls.length === 0 && <p className="text-zinc-500 text-sm p-3">No calls found for this account.</p>}
          {calls.map((c) => {
            const isActive = activeCallId === c.id;
            const isLoadingThis = isActive && loading;
            const isCached = cachedIds.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => run(c.id)}
                disabled={loading}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors disabled:opacity-60 ${
                  isActive ? "bg-cyan-500/10" : "hover:bg-zinc-800/60"
                }`}
              >
                {isLoadingThis ? (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400 flex-none" />
                ) : (
                  <Phone className={`w-4 h-4 flex-none ${isActive ? "text-cyan-400" : "text-zinc-500"}`} />
                )}
                <span className="flex-1 min-w-0">
                  <span className={`font-medium ${isActive ? "text-cyan-200" : "text-zinc-200"}`}>{c.title}</span>
                  {c.date ? <span className="text-zinc-500"> · {c.date.slice(0, 10)}</span> : ""}
                </span>
                {isCached ? (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 flex-none">
                    <Check className="w-3.5 h-3.5" /> analyzed
                  </span>
                ) : (
                  <span className="text-[11px] text-zinc-600 flex-none">not run</span>
                )}
              </button>
            );
          })}
        </div>
        {loading && (
          <p className="text-zinc-400 text-sm mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Pulling transcript from Notion + analyzing (2 passes)…
          </p>
        )}
        {analysis && !loading && (
          <div className="flex items-center gap-3 mb-4 text-xs">
            {fromCache && <span className="text-zinc-500">Loaded from saved analysis.</span>}
            <button
              onClick={() => activeCallId && run(activeCallId, true)}
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-cyan-300 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" /> Re-run
            </button>
          </div>
        )}
        {err && <p className="text-red-400 text-sm mb-4">{err}</p>}

        {analysis && (
          <>
            {/* scorecard — niche verdict + coverage at a glance + lens strip */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 mb-6">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                {nicheNode && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Your edge</div>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400">★</span>
                      <span className="text-zinc-100 font-semibold">{nicheNode.name}</span>
                      {nicheVerdict && (
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full border ${
                            nicheVerdict === "hit"
                              ? "border-emerald-500/60 text-emerald-300 bg-emerald-500/10"
                              : nicheVerdict === "grazed"
                              ? "border-amber-500/60 text-amber-300 bg-amber-500/10"
                              : "border-zinc-700 text-zinc-500"
                          }`}
                        >
                          {nicheVerdict}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="min-w-[180px]">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">
                    Coverage · {scored.length} situations
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
                    <Seg n={counts.hit} total={scored.length} cls="bg-emerald-500" />
                    <Seg n={counts.grazed} total={scored.length} cls="bg-amber-500" />
                    <Seg n={counts.silent} total={scored.length} cls="bg-zinc-700" />
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[11px] text-zinc-400">
                    <span className="text-emerald-400">{counts.hit} hit</span>
                    <span className="text-amber-400">{counts.grazed} grazed</span>
                    <span className="text-zinc-500">{counts.silent} silent</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Ideas</div>
                  <div className="text-zinc-100 font-semibold">
                    {ideas.length} <span className="text-zinc-500 font-normal text-sm">video ideas</span>
                    {nicheIdeas > 0 && <span className="text-cyan-400 text-sm font-normal"> · {nicheIdeas} on your edge</span>}
                  </div>
                </div>
              </div>

              {/* lens strip — which of the 8 facets the ideas cover on the edge */}
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-2">
                  Lenses covered on your edge
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LENSES.map((l) => {
                    const lit = litLenses.has(l.toLowerCase());
                    return (
                      <span
                        key={l}
                        className={`text-[11px] px-2 py-0.5 rounded-md border ${
                          lit
                            ? "border-cyan-500/60 text-cyan-300 bg-cyan-500/10"
                            : "border-zinc-800 text-zinc-600"
                        }`}
                      >
                        {l}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
              {/* left: summary + coverage rendered ON the taxonomy tree */}
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <button
                    onClick={() => setSummaryOpen((o) => !o)}
                    className="flex items-center gap-2 font-semibold text-zinc-100 text-sm"
                  >
                    {summaryOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    Summary
                  </button>
                  {summaryOpen && <p className="text-sm text-zinc-300 mt-2 leading-relaxed">{analysis.summary}</p>}
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center gap-2 font-semibold text-zinc-100 text-sm mb-3">
                    <Target className="w-4 h-4" /> Coverage on the tree
                  </div>
                  <div className="space-y-0.5">
                    {roots.map((r) => (
                      <CoverNode key={r.id} node={r} tree={tree} verdicts={verdicts} depth={0} />
                    ))}
                  </div>

                  {analysis.newStories.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-zinc-800">
                      <div className="text-xs font-semibold text-zinc-500 uppercase mb-1">New stories / niches</div>
                      {analysis.newStories.map((s, i) => (
                        <p key={i} className="text-xs text-zinc-400 mb-1">
                          <span className="font-medium text-zinc-200">{s.title}</span> — {s.summary}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* right: ideas */}
              <div className="lg:col-span-3 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-zinc-100 text-sm">
                  <Film className="w-4 h-4" /> Video ideas ({ideas.length})
                </div>
                {ideas.map((idea, i) => (
                  <IdeaCard key={i} idea={idea} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function rank(v: Verdict): number {
  return v === "hit" ? 2 : v === "grazed" ? 1 : 0;
}

function Seg({ n, total, cls }: { n: number; total: number; cls: string }) {
  if (!n || !total) return null;
  return <div className={cls} style={{ width: `${(n / total) * 100}%` }} />;
}

/** One node in the coverage tree. Structure/parent nodes are headers (no dot);
 *  scored situations get a verdict dot + evidence. Recurses over children. */
function CoverNode({
  node,
  tree,
  verdicts,
  depth,
}: {
  node: TreeNode;
  tree: TreeNode[];
  verdicts: Map<string, NodeVerdict>;
  depth: number;
}) {
  const children = tree.filter((n) => n.parentId === node.id);
  const v = verdicts.get(node.id);
  const isHeader = !v && children.length > 0;
  const niche = node.isPrimaryNiche;

  return (
    <div>
      <div
        className={`flex items-start gap-2 py-0.5 rounded ${niche ? "bg-cyan-500/5 -mx-1 px-1" : ""}`}
        style={{ paddingLeft: depth * 14 + (niche ? 4 : 0) }}
      >
        {isHeader ? (
          <span className="mt-[7px] w-1.5 h-1.5 rounded-full flex-none bg-zinc-700/60" />
        ) : (
          <span className={`mt-[7px] w-2 h-2 rounded-full flex-none ${v ? VERDICT_DOT[v.verdict] : "bg-zinc-800"}`} />
        )}
        <div className="min-w-0">
          <span
            className={`text-sm ${
              isHeader
                ? "text-zinc-500 font-semibold uppercase text-xs tracking-wide"
                : niche
                ? "text-cyan-300 font-semibold"
                : v
                ? VERDICT_TEXT[v.verdict]
                : "text-zinc-600"
            }`}
          >
            {niche ? "★ " : ""}
            {node.name}
          </span>
          {v?.evidence && (
            <span className="block text-[11px] text-zinc-600 italic leading-snug">&ldquo;{v.evidence}&rdquo;</span>
          )}
        </div>
      </div>
      {children.map((c) => (
        <CoverNode key={c.id} node={c} tree={tree} verdicts={verdicts} depth={depth + 1} />
      ))}
    </div>
  );
}

function IdeaCard({ idea }: { idea: VideoIdea }) {
  return (
    <div
      className={`rounded-xl border p-4 bg-zinc-900 ${
        idea.isPrimaryNiche ? "border-cyan-500/70 shadow-[0_0_14px_rgba(34,211,238,0.22)]" : "border-zinc-800"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase flex-wrap">
        <span className="text-zinc-200 font-semibold normal-case">{idea.node}</span>
        {idea.isPrimaryNiche && <span className="text-cyan-400">★ edge</span>}
        <span>· {idea.lens}</span>
        <span>· {idea.suggestedFormat}</span>
        {idea.form === "carousel" && (
          <span className="text-fuchsia-400 border border-fuchsia-500/40 rounded px-1">carousel</span>
        )}
      </div>
      <p className="text-sm text-zinc-100 font-medium mt-1">{idea.angle}</p>
      <p className="text-xs text-zinc-400 mt-1">
        {idea.beliefBefore} → <span className="text-zinc-200">{idea.beliefAfter}</span>
      </p>
      <div className="mt-2 space-y-1">
        {idea.hooks.map((h, j) => (
          <div key={j} className="text-xs flex items-start gap-1.5">
            <span className={h.preferred ? "text-cyan-400" : "text-zinc-600"}>{h.preferred ? "▶" : "·"}</span>
            <span className={`font-mono ${h.type === "spoken" ? "text-emerald-400" : "text-zinc-500"}`}>[{h.type}]</span>
            <span className="text-zinc-300">&ldquo;{h.text}&rdquo;</span>
          </div>
        ))}
      </div>
      {idea.factsToConfirm.length > 0 && (
        <p className="text-[11px] text-amber-400 mt-2">verify: {idea.factsToConfirm.join(" · ")}</p>
      )}
    </div>
  );
}
