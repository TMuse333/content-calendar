"use client";

/**
 * Situation tree — one canvas, two modes.
 *
 *  • Overall mode (default): Greg's board. Nodes colored by STATUS, each carrying
 *    cumulative evidence (all stories/posts/analytics). "Where does he stand?"
 *  • Call mode: pick a call → nodes repaint with that call's HIT/GRAZED/SILENT and
 *    a right slide-over opens with the call's LLM output (Coverage / Ideas /
 *    Analysis). This is the old Debrief, folded into the tree.
 *
 * Live + repeatable per subject and per call:
 *   GET /tree/evidence        → structure + posts + stories + metrics (per subject)
 *   GET /debrief?callId=X      → cached analysis + ideas               (per call)
 * Dark UI (zinc-950 ground, cyan accents). Nothing hardcoded — keyed by [id].
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { Loader2, X, RotateCw, ZoomIn, ZoomOut, Maximize2, Eye, EyeOff, ArrowLeft, Sparkles, FileDown } from "lucide-react";

interface NodeMetrics {
  posts: number;
  totalReach: number;
  avgReach: number;
  bestReach: number;
  totalSaves: number;
}
interface NodePost {
  id: string;
  title: string;
  status?: string;
  format?: string;
  date?: string;
  igPostLink?: string;
  reach?: number;
  saves?: number;
  hasMetrics: boolean;
}
interface NodeEvidence {
  id: string;
  name: string;
  level: string;
  status?: "Untested" | "Testing" | "Working" | "Dropped";
  parentId?: string;
  why?: string;
  isPrimaryNiche?: boolean;
  storyCount: number;
  topBreakthrough?: number;
  postCount: number;
  metrics: NodeMetrics;
  posts: NodePost[];
}
type Verdict = "hit" | "grazed" | "silent";
interface CallRow {
  id: string;
  title: string;
  date?: string;
}
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
  lens: string;
  angle: string;
  suggestedFormat: string;
  hooks: IdeaHook[];
  beliefBefore: string;
  beliefAfter: string;
  factsToConfirm: string[];
  isPrimaryNiche: boolean;
}

const C = {
  ground: "#09090b",
  canvas: "#0c0c0f",
  card: "#141417",
  cardHi: "#1a1a1f",
  border: "#26262b",
  borderHi: "#35353c",
  txHi: "#f4f4f5",
  txMid: "#a1a1aa",
  txDim: "#6b6b73",
  edge: "#22d3ee",
  hit: "#10b981",
  grazed: "#f59e0b",
  silent: "#52525b",
};
const VCOL: Record<Verdict, string> = { hit: C.hit, grazed: C.grazed, silent: C.silent };
const STATUS_COLOR: Record<string, string> = {
  Working: "#10b981",
  Testing: "#f59e0b",
  Untested: "#3f3f46",
  Dropped: "#ef4444",
};
const POST_STATUS_COLOR: Record<string, string> = {
  Posted: "#10b981",
  Approved: "#22d3ee",
  Scheduled: "#3b82f6",
  "Ready for review": "#f59e0b",
  Idea: "#52525b",
  Draft: "#52525b",
};

const COL_W = 196,
  H_GAP = 66,
  NH = 52,
  V_GAP = 15,
  SLOT = NH + V_GAP,
  PAD = 32;

/** Tidy horizontal (left→right) tree layout; forest-safe. */
function layout(nodes: NodeEvidence[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const kids = (id: string) => nodes.filter((n) => n.parentId === id);
  const roots = nodes.filter((n) => !n.parentId || !byId.has(n.parentId));
  const pos: Record<string, { x: number; y: number }> = {};
  let cursor = 0;
  const place = (n: NodeEvidence, depth: number) => {
    const ch = kids(n.id);
    if (ch.length === 0) {
      pos[n.id] = { x: depth * (COL_W + H_GAP) + PAD, y: cursor * SLOT + PAD };
      cursor++;
      return;
    }
    ch.forEach((c) => place(c, depth + 1));
    const ys = ch.map((c) => pos[c.id].y);
    pos[n.id] = { x: depth * (COL_W + H_GAP) + PAD, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  };
  roots.forEach((r) => {
    place(r, 0);
    cursor += 0.6;
  });
  return pos;
}

export default function TreePage() {
  const { id } = useParams<{ id: string }>();
  const [nodes, setNodes] = useState<NodeEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [mode, setMode] = useState<string>("overall"); // "overall" | callId
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [covState, setCovState] = useState<"none" | "loading" | "ready" | "missing">("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"coverage" | "ideas" | "analysis">("coverage");
  const [scale, setScale] = useState(1);
  const [hideQuiet, setHideQuiet] = useState(true);
  const [panning, setPanning] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const isCall = mode !== "overall";

  // live structure (per subject)
  useEffect(() => {
    setLoading(true);
    fetch(`/api/accounts/${id}/tree/evidence`)
      .then((r) => r.json())
      .then((d) => setNodes(d.data ?? []))
      .catch(() => setNodes([]))
      .finally(() => setLoading(false));
    fetch(`/api/accounts/${id}/calls`)
      .then((r) => r.json())
      .then((d) => setCalls(d.data ?? []))
      .catch(() => {});
  }, [id]);

  /**
   * Load a call's analysis. On switch we only read the cache (compute=false) so we
   * never kick off a ~50s Opus job unasked — a miss surfaces an "analyze" button.
   */
  const loadCall = useCallback(
    async (cid: string, opts?: { compute?: boolean; refresh?: boolean }) => {
      const { compute = false, refresh = false } = opts ?? {};
      setCovState("loading");
      setAnalysis(null);
      setIdeas([]);
      try {
        if (!refresh) {
          const r = await fetch(`/api/accounts/${id}/debrief?callId=${cid}`);
          const d = await r.json();
          if (r.ok && d.cached) {
            setAnalysis(d.analysis ?? null);
            setIdeas(d.ideas ?? []);
            setCovState("ready");
            return;
          }
          if (!compute) {
            setCovState("missing");
            return;
          }
        }
        const res = await fetch(`/api/accounts/${id}/debrief`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callId: cid, refresh }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error ?? "Analyze failed");
        setAnalysis(d.analysis ?? null);
        setIdeas(d.ideas ?? []);
        setCovState("ready");
      } catch {
        setAnalysis(null);
        setIdeas([]);
        setCovState("missing");
      }
    },
    [id]
  );

  // react to mode changes
  useEffect(() => {
    setSelectedId(null);
    if (mode === "overall") {
      setCovState("none");
      setAnalysis(null);
      setIdeas([]);
    } else {
      setTab("coverage");
      loadCall(mode);
    }
  }, [mode, loadCall]);

  // verdict (+ evidence) per node, deduped (LLM can emit a node twice)
  const verdicts = useMemo(() => {
    const m = new Map<string, NodeVerdict>();
    const rank = (v: Verdict) => (v === "hit" ? 2 : v === "grazed" ? 1 : 0);
    for (const c of analysis?.coverage ?? []) {
      const prev = m.get(c.nodeId);
      if (!prev || rank(c.verdict) > rank(prev.verdict)) m.set(c.nodeId, c);
    }
    return m;
  }, [analysis]);

  // quiet leaves = silent (call) / Untested (overall) with no content; hidden by
  // default to free up canvas. Niche + structure nodes never hide.
  const quietLeafIds = useMemo(() => {
    const hasChild = new Set(nodes.filter((n) => n.parentId).map((n) => n.parentId));
    const ids = new Set<string>();
    for (const n of nodes) {
      const isLeaf = !hasChild.has(n.id);
      if (!isLeaf || n.isPrimaryNiche || n.level === "Structure") continue;
      const quiet = isCall ? (verdicts.get(n.id)?.verdict ?? "silent") === "silent" : n.status === "Untested";
      if (quiet && n.postCount === 0 && n.storyCount === 0) ids.add(n.id);
    }
    return ids;
  }, [nodes, verdicts, isCall]);
  const visibleNodes = useMemo(
    () => (hideQuiet ? nodes.filter((n) => !quietLeafIds.has(n.id)) : nodes),
    [nodes, hideQuiet, quietLeafIds]
  );

  const pos = useMemo(() => layout(visibleNodes), [visibleNodes]);
  const byId = useMemo(() => new Map(visibleNodes.map((n) => [n.id, n])), [visibleNodes]);
  const dims = useMemo(() => {
    const xs = visibleNodes.map((n) => pos[n.id]?.x ?? 0);
    const ys = visibleNodes.map((n) => pos[n.id]?.y ?? 0);
    return { w: Math.max(0, ...xs) + COL_W + PAD, h: Math.max(0, ...ys) + NH + PAD };
  }, [visibleNodes, pos]);

  // call-mode coverage counts
  const covCounts = useMemo(() => {
    const c = { hit: 0, grazed: 0, silent: 0 };
    for (const v of verdicts.values()) c[v.verdict]++;
    return c;
  }, [verdicts]);
  const covTotal = covCounts.hit + covCounts.grazed + covCounts.silent;

  // overall-mode aggregate summary
  const agg = useMemo(() => {
    const sit = nodes.filter((n) => n.status);
    const status = { Working: 0, Testing: 0, Untested: 0, Dropped: 0 } as Record<string, number>;
    let stories = 0,
      posts = 0,
      reach = 0;
    for (const n of sit) {
      if (n.status) status[n.status] = (status[n.status] ?? 0) + 1;
      stories += n.storyCount;
      posts += n.postCount;
      reach += n.metrics.totalReach;
    }
    return { status, stories, posts, reach, situations: sit.length };
  }, [nodes]);

  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const selectedCov = selectedId ? verdicts.get(selectedId) : undefined;
  const activeCall = calls.find((c) => c.id === mode);

  // drag-to-pan (ignore drags that start on a node so clicks still work)
  const onPanStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".tree-node")) return;
    const el = stageRef.current;
    if (!el) return;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    setPanning(true);
  };
  const onPanMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!drag.current || !el) return;
    el.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
    el.scrollTop = drag.current.top - (e.clientY - drag.current.y);
  };
  const onPanEnd = () => {
    drag.current = null;
    setPanning(false);
  };
  const fit = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const s = Math.min(1, (el.clientWidth - 24) / dims.w, (el.clientHeight - 24) / dims.h);
    setScale(Math.max(0.4, s));
    el.scrollTo({ left: 0, top: 0 });
  }, [dims]);

  // frame the board once, on first load
  const didFit = useRef(false);
  useEffect(() => {
    if (!loading && visibleNodes.length && !didFit.current) {
      didFit.current = true;
      requestAnimationFrame(fit);
    }
  }, [loading, visibleNodes.length, fit]);

  return (
    <div className="flex flex-col h-screen" style={{ background: C.ground, color: C.txHi }}>
      {/* header */}
      <header
        className="flex flex-wrap items-end gap-x-8 gap-y-3 px-6 py-4 border-b"
        style={{ borderColor: C.border, background: "linear-gradient(180deg,#0e0e12,#09090b)" }}
      >
        <div>
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase mb-1.5" style={{ color: C.txDim }}>
            Situation tree · {id}
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{isCall ? "Call coverage" : "Overall board"}</h1>
        </div>

        {/* mode picker: Overall ↔ a specific call */}
        <div>
          <div className="font-mono text-[10px] tracking-[0.12em] uppercase mb-1.5" style={{ color: C.txDim }}>
            View
          </div>
          <div className="flex items-center gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="text-sm rounded-lg border px-3 py-1.5 outline-none"
              style={{ background: C.card, borderColor: C.borderHi, color: C.txHi }}
            >
              <option value="overall">Overall board</option>
              {calls.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c.date ? ` · ${c.date.slice(0, 10)}` : ""}
                </option>
              ))}
            </select>
            {isCall && covState === "loading" && <Loader2 className="w-4 h-4 animate-spin" style={{ color: C.edge }} />}
            {isCall && covState === "ready" && (
              <>
                <button
                  onClick={() => loadCall(mode, { compute: true, refresh: true })}
                  title="Re-analyze this call"
                  className="p-1.5 rounded-md hover:text-cyan-300 transition-colors"
                  style={{ color: C.txDim }}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <a
                  href={`/recap/${id}/${mode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open a client-ready recap to print or save as PDF"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-cyan-500/10"
                  style={{ borderColor: C.borderHi, color: C.txMid }}
                >
                  <FileDown className="w-3.5 h-3.5" /> Export recap
                </a>
              </>
            )}
          </div>
        </div>

        {/* summary: aggregate (overall) or coverage (call) */}
        {!isCall && (
          <div>
            <div className="font-mono text-[10px] tracking-[0.12em] uppercase mb-1.5" style={{ color: C.txDim }}>
              {agg.situations} situations
            </div>
            <div className="flex items-center gap-4">
              <Metric n={agg.status.Working} label="working" color={STATUS_COLOR.Working} />
              <Metric n={agg.status.Testing} label="testing" color={STATUS_COLOR.Testing} />
              <Metric n={agg.status.Untested} label="untested" color={C.silent} />
              <span className="text-[11px]" style={{ color: C.txMid }}>
                {agg.stories} stories · {agg.posts} posts
              </span>
            </div>
          </div>
        )}
        {isCall && covState === "ready" && covTotal > 0 && (
          <div>
            <div className="font-mono text-[10px] tracking-[0.12em] uppercase mb-1.5" style={{ color: C.txDim }}>
              Coverage · {covTotal} situations
            </div>
            <div className="flex items-center gap-4">
              <Metric n={covCounts.hit} label="hit" color={C.hit} />
              <Metric n={covCounts.grazed} label="grazed" color={C.grazed} />
              <Metric n={covCounts.silent} label="silent" color={C.silent} />
            </div>
          </div>
        )}

        {/* legend */}
        <div className="ml-auto flex items-center gap-3.5 text-[11px]" style={{ color: C.txMid }}>
          {isCall ? (
            <>
              <Dot color={C.hit} label="Hit" />
              <Dot color={C.grazed} label="Grazed" />
              <Dot color={C.silent} label="Silent" />
            </>
          ) : (
            <>
              <Dot color={STATUS_COLOR.Working} label="Working" />
              <Dot color={STATUS_COLOR.Testing} label="Testing" />
              <Dot color={C.silent} label="Untested" />
            </>
          )}
          <Dot color={C.edge} label="Edge" />
        </div>
      </header>

      {/* body: stage + right panel */}
      <div className="flex flex-1 min-h-0">
        <div
          ref={stageRef}
          className="flex-1 overflow-auto relative select-none"
          onPointerDown={onPanStart}
          onPointerMove={onPanMove}
          onPointerUp={onPanEnd}
          onPointerLeave={onPanEnd}
          style={{
            background: `radial-gradient(circle at 1px 1px, #17171c 1px, transparent 0) 0 0 / 22px 22px, ${C.canvas}`,
            cursor: panning ? "grabbing" : "grab",
          }}
        >
          {loading && (
            <div className="absolute inset-0 grid place-items-center text-sm z-10" style={{ color: C.txDim }}>
              Loading tree…
            </div>
          )}

          <div style={{ width: dims.w * scale, height: dims.h * scale }}>
            <div style={{ position: "relative", width: dims.w, height: dims.h, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
              <svg width={dims.w} height={dims.h} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
                {visibleNodes.map((n) => {
                  const p = n.parentId ? byId.get(n.parentId) : undefined;
                  if (!p || !pos[n.id] || !pos[p.id]) return null;
                  const x1 = pos[p.id].x + COL_W,
                    y1 = pos[p.id].y + NH / 2,
                    x2 = pos[n.id].x,
                    y2 = pos[n.id].y + NH / 2,
                    mx = (x1 + x2) / 2;
                  return (
                    <path
                      key={n.id}
                      d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                      fill="none"
                      stroke={n.isPrimaryNiche ? C.edge : "#2f2f36"}
                      strokeWidth={n.isPrimaryNiche ? 2 : 1.3}
                      opacity={n.isPrimaryNiche ? 0.9 : 0.8}
                    />
                  );
                })}
              </svg>

              {visibleNodes.map((n) => (
                <NodeCard
                  key={n.id}
                  n={n}
                  p={pos[n.id]}
                  mode={isCall ? "call" : "overall"}
                  verdict={verdicts.get(n.id)?.verdict}
                  selected={selectedId === n.id}
                  childCount={nodes.filter((x) => x.parentId === n.id).length}
                  onClick={() => setSelectedId(n.id)}
                />
              ))}
            </div>
          </div>

          <div className="absolute bottom-5 left-5 flex items-center gap-3 z-10">
            {quietLeafIds.size > 0 && (
              <button
                onClick={() => setHideQuiet((h) => !h)}
                className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors hover:text-cyan-300"
                style={{ background: C.card, borderColor: C.borderHi, color: C.txMid }}
              >
                {hideQuiet ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {hideQuiet
                  ? `${quietLeafIds.size} ${isCall ? "silent" : "untested"} hidden · show`
                  : `hide ${quietLeafIds.size} ${isCall ? "silent" : "untested"}`}
              </button>
            )}
            <span className="font-mono text-[11px]" style={{ color: C.txDim }}>
              drag to pan · click a node for its tests
            </span>
          </div>
          <div className="absolute bottom-4 right-4 flex gap-1.5 z-10">
            <ZoomBtn onClick={fit} title="Fit to screen">
              <Maximize2 className="w-4 h-4" />
            </ZoomBtn>
            <ZoomBtn onClick={() => setScale((s) => Math.max(0.5, s - 0.15))} title="Zoom out">
              <ZoomOut className="w-4 h-4" />
            </ZoomBtn>
            <ZoomBtn onClick={() => setScale((s) => Math.min(1.6, s + 0.15))} title="Zoom in">
              <ZoomIn className="w-4 h-4" />
            </ZoomBtn>
          </div>
        </div>

        {/* right panel: node detail, else the call slide-over */}
        {selected ? (
          <NodeDrawer
            n={selected}
            cov={selectedCov}
            mode={isCall ? "call" : "overall"}
            onClose={() => setSelectedId(null)}
            onBack={isCall ? () => setSelectedId(null) : undefined}
            childCount={nodes.filter((x) => x.parentId === selected.id).length}
          />
        ) : (
          isCall && (
            <CallPanel
              call={activeCall}
              state={covState}
              analysis={analysis}
              ideas={ideas}
              tab={tab}
              setTab={setTab}
              onAnalyze={() => loadCall(mode, { compute: true })}
              onClose={() => setMode("overall")}
            />
          )
        )}
      </div>
    </div>
  );
}

/* ---------- small header atoms ---------- */
function Metric({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-base font-semibold tabular-nums" style={{ color }}>
        {n}
      </span>
      <span className="text-[11px]" style={{ color: C.txMid }}>
        {label}
      </span>
    </div>
  );
}
function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
function ZoomBtn({ onClick, children, title }: { onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 rounded-lg border grid place-items-center hover:text-cyan-300 transition-colors"
      style={{ background: C.card, borderColor: C.borderHi, color: C.txMid }}
    >
      {children}
    </button>
  );
}

/* ---------- node card ---------- */
function NodeCard({
  n,
  p,
  mode,
  verdict,
  selected,
  childCount,
  onClick,
}: {
  n: NodeEvidence;
  p?: { x: number; y: number };
  mode: "overall" | "call";
  verdict?: Verdict;
  selected: boolean;
  childCount: number;
  onClick: () => void;
}) {
  if (!p) return null;
  const isStruct = n.level === "Structure";
  const isRoot = !n.parentId;
  const niche = n.isPrimaryNiche;
  // stripe color: verdict in call mode, status in overall mode
  const stripe = mode === "call" ? (verdict ? VCOL[verdict] : C.silent) : n.status ? STATUS_COLOR[n.status] : C.silent;

  const style: CSSProperties = {
    position: "absolute",
    left: p.x,
    top: p.y,
    width: COL_W,
    minHeight: NH,
    background: niche ? "linear-gradient(180deg, rgba(34,211,238,.07), #141417)" : isStruct ? C.cardHi : C.card,
    border: `1px solid ${niche ? C.edge : selected ? C.edge : isStruct ? C.borderHi : C.border}`,
    borderLeft: !isStruct ? `3px solid ${stripe}` : undefined,
    borderRadius: isStruct ? 9 : 11,
    padding: "9px 12px",
    cursor: "pointer",
    boxShadow: niche
      ? "0 0 0 1px rgba(34,211,238,.25), 0 0 22px rgba(34,211,238,.28)"
      : selected
      ? `0 0 0 1px ${C.edge}`
      : "none",
  };

  return (
    <div className="tree-node" style={style} onClick={onClick}>
      {n.postCount > 0 && (
        <span
          className="font-mono text-[9px] px-1.5 rounded-full absolute -top-2 right-2.5"
          style={{ background: C.cardHi, border: `1px solid ${C.borderHi}`, color: C.txMid }}
        >
          {n.postCount} {n.postCount === 1 ? "test" : "tests"}
        </span>
      )}
      {niche && (
        <div className="font-mono text-[9px] tracking-[0.16em] uppercase mb-0.5" style={{ color: C.edge }}>
          ★ Your edge
        </div>
      )}
      <div
        className="font-medium leading-tight"
        style={{
          fontSize: isStruct && !isRoot ? 11 : isStruct ? 12 : 13,
          letterSpacing: isStruct ? "0.1em" : "-0.005em",
          textTransform: isStruct ? "uppercase" : "none",
          fontFamily: isStruct ? "var(--font-mono, ui-monospace), monospace" : "inherit",
          color: isStruct ? C.txMid : niche ? "#cffafe" : C.txHi,
        }}
      >
        {n.name}
      </div>
      <div className="flex items-center gap-2 mt-1.5 font-mono text-[10.5px] tabular-nums" style={{ color: C.txDim }}>
        {isStruct ? (
          <span style={{ color: C.txMid }}>{childCount} situations</span>
        ) : (
          <>
            <span className="w-[7px] h-[7px] rounded-full" style={{ background: stripe }} />
            <span className="uppercase tracking-wide">{mode === "call" ? verdict ?? "—" : n.status ?? ""}</span>
            <span style={{ color: C.txMid }}>
              {n.storyCount}s · {n.postCount}p
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- node detail drawer ---------- */
function NodeDrawer({
  n,
  cov,
  mode,
  onClose,
  onBack,
  childCount,
}: {
  n: NodeEvidence;
  cov?: NodeVerdict;
  mode: "overall" | "call";
  onClose: () => void;
  onBack?: () => void;
  childCount: number;
}) {
  const isStruct = n.level === "Structure";
  const hasM = n.metrics.posts > 0;
  return (
    <aside className="w-[380px] flex-none border-l overflow-y-auto" style={{ borderColor: C.border, background: "#101013" }}>
      <div className="px-5 pt-5 pb-4 border-b relative" style={{ borderColor: C.border }}>
        {onBack ? (
          <button onClick={onBack} className="flex items-center gap-1.5 text-[11px] mb-2.5 hover:text-cyan-300" style={{ color: C.txDim }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to call
          </button>
        ) : null}
        <button onClick={onClose} className="absolute top-4 right-4 hover:text-zinc-100" style={{ color: C.txDim }}>
          <X className="w-5 h-5" />
        </button>
        <div className="font-mono text-[10px] tracking-[0.12em] uppercase" style={{ color: n.isPrimaryNiche ? C.edge : C.txDim }}>
          {n.isPrimaryNiche ? "★ Your edge" : isStruct ? "Group" : "Situation"}
        </div>
        <div className="text-lg font-semibold mt-1.5 mb-2.5 tracking-tight text-balance pr-6">{n.name}</div>
        <div className="flex gap-1.5 flex-wrap">
          {mode === "call" && cov && <Chip label={`${cov.verdict} on this call`} color={VCOL[cov.verdict]} />}
          {n.status && <Chip label={n.status} color={n.status ? STATUS_COLOR[n.status] : C.txMid} muted={mode === "call"} />}
          {isStruct && <Chip label={`${childCount} situations`} color={C.txMid} muted />}
        </div>
      </div>

      {mode === "call" && cov?.evidence && (
        <Section title="Heard on this call">
          <div className="text-sm italic leading-relaxed border-l-2 pl-3" style={{ color: C.txMid, borderColor: C.borderHi }}>
            &ldquo;{cov.evidence}&rdquo;
          </div>
        </Section>
      )}

      {n.why && !isStruct && (
        <Section title="Why this node">
          <div className="text-[13px] leading-relaxed" style={{ color: C.txMid }}>
            {n.why}
          </div>
        </Section>
      )}

      {!isStruct && (
        <Section title="Stories">
          {n.storyCount ? (
            <div className="text-[13px]" style={{ color: C.txMid }}>
              {n.storyCount} client {n.storyCount === 1 ? "story" : "stories"}
              {n.topBreakthrough ? (
                <>
                  {" "}
                  · strongest{" "}
                  <b className="font-mono" style={{ color: C.txHi }}>
                    {n.topBreakthrough}/5
                  </b>{" "}
                  breakthrough
                </>
              ) : null}
            </div>
          ) : (
            <div className="text-[13px]" style={{ color: C.txDim }}>
              No client stories captured on this node yet.
            </div>
          )}
        </Section>
      )}

      <Section title={`Analytics${isStruct ? " (rollup)" : ""}`}>
        <div className="grid grid-cols-2 gap-2">
          <Stat k="Tests / posts" v={String(n.postCount)} />
          <Stat k="Avg reach" v={hasM ? n.metrics.avgReach.toLocaleString() : "—"} />
          <Stat k="Best reach" v={hasM ? n.metrics.bestReach.toLocaleString() : "—"} />
          <Stat k="Saves" v={hasM ? n.metrics.totalSaves.toLocaleString() : "—"} />
        </div>
        {!hasM && n.postCount > 0 && (
          <div className="mt-2.5 text-[11.5px] flex items-center gap-2" style={{ color: C.grazed }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.grazed }} />
            Metrics pending — Instagram sync hasn&rsquo;t run for these posts yet.
          </div>
        )}
      </Section>

      {n.postCount > 0 ? (
        <Section title="Tests — the posts training this node">
          {n.posts.map((p) => (
            <div key={p.id} className="flex gap-2.5 py-2.5 border-t first:border-t-0" style={{ borderColor: C.border }}>
              <span className="w-2 h-2 rounded-full flex-none mt-[5px]" style={{ background: POST_STATUS_COLOR[p.status ?? ""] ?? C.silent }} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] leading-snug" style={{ color: C.txHi }}>
                  {p.title}
                </div>
                <div className="mt-1 font-mono text-[10px] flex gap-2.5 flex-wrap" style={{ color: C.txDim }}>
                  <span>{[p.status, p.date, p.format && p.format !== "None" ? p.format : null].filter(Boolean).join(" · ")}</span>
                  <span style={{ color: C.txMid }}>
                    {p.hasMetrics ? `${(p.reach ?? 0).toLocaleString()} reach · ${p.saves ?? 0} saves` : "awaiting metrics"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </Section>
      ) : (
        !isStruct && (
          <Section title="">
            <div className="text-[12.5px] leading-relaxed" style={{ color: C.txDim }}>
              No posts training this node yet.
              {mode === "call" && cov && (cov.verdict === "hit" || cov.verdict === "grazed")
                ? " It came up on this call — a good candidate to film next."
                : ""}
            </div>
          </Section>
        )
      )}
    </aside>
  );
}

/* ---------- call slide-over (the old Debrief, folded in) ---------- */
function CallPanel({
  call,
  state,
  analysis,
  ideas,
  tab,
  setTab,
  onAnalyze,
  onClose,
}: {
  call?: CallRow;
  state: "none" | "loading" | "ready" | "missing";
  analysis: CallAnalysis | null;
  ideas: VideoIdea[];
  tab: "coverage" | "ideas" | "analysis";
  setTab: (t: "coverage" | "ideas" | "analysis") => void;
  onAnalyze: () => void;
  onClose: () => void;
}) {
  const cov = analysis?.coverage ?? [];
  const hit = cov.filter((c) => c.verdict === "hit");
  const grazed = cov.filter((c) => c.verdict === "grazed");
  const silent = cov.filter((c) => c.verdict === "silent");

  return (
    <aside className="w-[400px] flex-none border-l overflow-y-auto" style={{ borderColor: C.border, background: "#101013" }}>
      <div className="px-5 pt-5 pb-4 border-b relative" style={{ borderColor: C.border }}>
        <button onClick={onClose} className="absolute top-4 right-4 hover:text-zinc-100" style={{ color: C.txDim }}>
          <X className="w-5 h-5" />
        </button>
        <div className="font-mono text-[10px] tracking-[0.12em] uppercase" style={{ color: C.txDim }}>
          Call analysis
        </div>
        <div className="text-base font-semibold mt-1.5 tracking-tight text-balance pr-6">{call?.title ?? "Call"}</div>
        {call?.date && <div className="text-[11px] mt-0.5" style={{ color: C.txDim }}>{call.date.slice(0, 10)}</div>}
      </div>

      {state === "loading" && (
        <div className="px-5 py-8 text-sm flex items-center gap-2" style={{ color: C.txMid }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Loading analysis…
        </div>
      )}

      {state === "missing" && (
        <div className="px-5 py-8">
          <div className="text-[13px] leading-relaxed mb-4" style={{ color: C.txMid }}>
            This call hasn&rsquo;t been analyzed yet. Running it pulls the transcript from Notion and generates coverage + video
            ideas (~50s).
          </div>
          <button
            onClick={onAnalyze}
            className="inline-flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-lg border transition-colors hover:bg-cyan-500/10"
            style={{ borderColor: C.edge, color: C.edge }}
          >
            <Sparkles className="w-4 h-4" /> Analyze this call
          </button>
        </div>
      )}

      {state === "ready" && analysis && (
        <>
          <div className="flex border-b" style={{ borderColor: C.border }}>
            {(["coverage", "ideas", "analysis"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-xs font-medium capitalize transition-colors"
                style={{
                  color: tab === t ? C.edge : C.txDim,
                  borderBottom: `2px solid ${tab === t ? C.edge : "transparent"}`,
                }}
              >
                {t}
                {t === "ideas" && ideas.length ? ` (${ideas.length})` : ""}
              </button>
            ))}
          </div>

          {tab === "coverage" && (
            <div className="px-5 py-4 space-y-3">
              <CovGroup label="Hit" color={C.hit} items={hit} />
              <CovGroup label="Grazed" color={C.grazed} items={grazed} />
              {silent.length > 0 && (
                <div>
                  <GroupLabel label="Silent" color={C.silent} n={silent.length} />
                  <p className="text-[12px] leading-relaxed mt-1" style={{ color: C.txDim }}>
                    {silent.map((s) => s.nodeName).join(" · ")}
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "ideas" && (
            <div className="px-5 py-4 space-y-3">
              {ideas.length === 0 && <p className="text-[13px]" style={{ color: C.txDim }}>No ideas generated.</p>}
              {ideas.map((idea, i) => (
                <IdeaCard key={i} idea={idea} />
              ))}
            </div>
          )}

          {tab === "analysis" && (
            <div className="px-5 py-4 space-y-5">
              <div>
                <GroupLabel label="Summary" color={C.txMid} />
                <p className="text-[13px] leading-relaxed mt-1.5" style={{ color: C.txMid }}>
                  {analysis.summary}
                </p>
              </div>
              {analysis.factsConfirmed.length > 0 && (
                <div>
                  <GroupLabel label="Facts stated on tape" color={C.hit} n={analysis.factsConfirmed.length} />
                  <ul className="mt-1.5 space-y-1">
                    {analysis.factsConfirmed.map((f, i) => (
                      <li key={i} className="text-[12.5px] leading-snug pl-3 relative" style={{ color: C.txMid }}>
                        <span className="absolute left-0" style={{ color: C.txDim }}>·</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.newStories.length > 0 && (
                <div>
                  <GroupLabel label="New story candidates" color={C.edge} n={analysis.newStories.length} />
                  <div className="mt-1.5 space-y-2">
                    {analysis.newStories.map((s, i) => (
                      <div key={i} className="text-[12.5px] leading-snug" style={{ color: C.txMid }}>
                        <span className="font-semibold" style={{ color: C.txHi }}>{s.title}</span> — {s.summary}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {analysis.stillOpen.length > 0 && (
                <div>
                  <GroupLabel label="Still open" color={C.grazed} n={analysis.stillOpen.length} />
                  <ul className="mt-1.5 space-y-1">
                    {analysis.stillOpen.map((o, i) => (
                      <li key={i} className="text-[12.5px] leading-snug pl-3 relative" style={{ color: C.txMid }}>
                        <span className="absolute left-0" style={{ color: C.txDim }}>·</span>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  );
}

function GroupLabel({ label, color, n }: { label: string; color: string; n?: number }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] uppercase font-semibold" style={{ color }}>
      {label}
      {typeof n === "number" && <span style={{ color: C.txDim }}>({n})</span>}
    </div>
  );
}
function CovGroup({ label, color, items }: { label: string; color: string; items: NodeVerdict[] }) {
  if (!items.length) return null;
  return (
    <div>
      <GroupLabel label={label} color={color} n={items.length} />
      <div className="mt-1.5 space-y-1.5">
        {items.map((c) => (
          <div key={c.nodeId} className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full flex-none mt-1.5" style={{ background: color }} />
            <div className="min-w-0">
              <span className="text-[13px]" style={{ color: C.txHi }}>{c.nodeName}</span>
              {c.evidence && (
                <span className="block text-[11px] italic leading-snug" style={{ color: C.txDim }}>
                  &ldquo;{c.evidence}&rdquo;
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function IdeaCard({ idea }: { idea: VideoIdea }) {
  return (
    <div
      className="rounded-xl border p-3.5"
      style={{
        background: C.card,
        borderColor: idea.isPrimaryNiche ? "rgba(34,211,238,.6)" : C.border,
        boxShadow: idea.isPrimaryNiche ? "0 0 14px rgba(34,211,238,.18)" : "none",
      }}
    >
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase flex-wrap" style={{ color: C.txDim }}>
        <span className="font-semibold normal-case" style={{ color: C.txHi }}>{idea.node}</span>
        {idea.isPrimaryNiche && <span style={{ color: C.edge }}>★ edge</span>}
        <span>· {idea.lens}</span>
        <span>· {idea.suggestedFormat}</span>
      </div>
      <p className="text-[13px] font-medium mt-1" style={{ color: C.txHi }}>{idea.angle}</p>
      <p className="text-[12px] mt-1" style={{ color: C.txMid }}>
        {idea.beliefBefore} → <span style={{ color: C.txHi }}>{idea.beliefAfter}</span>
      </p>
      <div className="mt-2 space-y-1">
        {idea.hooks.map((h, j) => (
          <div key={j} className="text-[11.5px] flex items-start gap-1.5">
            <span style={{ color: h.preferred ? C.edge : C.txDim }}>{h.preferred ? "▶" : "·"}</span>
            <span className="font-mono" style={{ color: h.type === "spoken" ? C.hit : C.txDim }}>[{h.type}]</span>
            <span style={{ color: C.txMid }}>&ldquo;{h.text}&rdquo;</span>
          </div>
        ))}
      </div>
      {idea.factsToConfirm.length > 0 && (
        <p className="text-[11px] mt-2" style={{ color: C.grazed }}>verify: {idea.factsToConfirm.join(" · ")}</p>
      )}
    </div>
  );
}

/* ---------- shared bits ---------- */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-5 py-4 border-b" style={{ borderColor: C.border }}>
      {title && (
        <h3 className="font-mono text-[10px] tracking-[0.12em] uppercase mb-3 font-semibold" style={{ color: C.txDim }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border px-2.5 py-2" style={{ background: C.card, borderColor: C.border }}>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: C.txDim }}>{k}</div>
      <div className="font-mono text-[17px] font-semibold mt-0.5 tabular-nums">{v}</div>
    </div>
  );
}
function Chip({ label, color, muted }: { label: string; color: string; muted?: boolean }) {
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-wide px-2 py-[3px] rounded-full border"
      style={{ color, borderColor: muted ? C.borderHi : color, background: muted ? "transparent" : `${color}1f` }}
    >
      {label}
    </span>
  );
}
