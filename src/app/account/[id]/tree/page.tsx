"use client";

/**
 * Interactive situation tree (React Flow). Dark UI. Click a node → the evidence
 * behind its status: stories, breakthrough, posts, IG metrics. Replaces the Miro
 * picture with a live, analytics-connected instrument.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface NodeMetrics {
  posts: number;
  totalReach: number;
  avgReach: number;
  bestReach: number;
  totalSaves: number;
}
interface NodeEvidence {
  id: string;
  name: string;
  level: string;
  status?: "Untested" | "Testing" | "Working" | "Dropped";
  parentId?: string;
  childIds: string[];
  why?: string;
  isPrimaryNiche?: boolean;
  storyCount: number;
  topBreakthrough?: number;
  postCount: number;
  metrics: NodeMetrics;
}

const STATUS_COLOR: Record<string, string> = {
  Working: "#10b981",
  Testing: "#f59e0b",
  Untested: "#3f3f46",
  Dropped: "#ef4444",
};
const NODE_W = 190;
const Y_GAP = 100;
const X_GAP = 26;

/** Tidy top-down layout; forest-safe (multiple roots laid out left to right). */
function layout(nodes: NodeEvidence[]): Record<string, { x: number; y: number }> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = (id: string) => nodes.filter((n) => n.parentId === id);
  const roots = nodes.filter((n) => !n.parentId || !byId.has(n.parentId));
  const pos: Record<string, { x: number; y: number }> = {};
  let cursor = 0;

  const place = (n: NodeEvidence, depth: number) => {
    const kids = childrenOf(n.id);
    if (kids.length === 0) {
      pos[n.id] = { x: cursor * (NODE_W + X_GAP), y: depth * Y_GAP };
      cursor++;
      return;
    }
    kids.forEach((k) => place(k, depth + 1));
    const xs = kids.map((k) => pos[k.id].x);
    pos[n.id] = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: depth * Y_GAP };
  };
  roots.forEach((r) => place(r, 0));
  return pos;
}

export default function TreePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<NodeEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/accounts/${id}/tree/evidence`)
      .then((r) => r.json())
      .then((d) => setData(d.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [id]);

  const { nodes, edges } = useMemo(() => {
    const pos = layout(data);
    const nodes: Node[] = data.map((n) => {
      const color = n.status ? STATUS_COLOR[n.status] : "#52525b";
      const niche = n.isPrimaryNiche;
      return {
        id: n.id,
        position: pos[n.id] ?? { x: 0, y: 0 },
        data: {
          label: (
            <div className="text-left leading-tight">
              <div className="font-semibold text-zinc-100 text-[12px]">
                {niche ? "★ " : ""}
                {n.name}
              </div>
              <div className="text-[9px] uppercase tracking-wide" style={{ color }}>
                {n.status ?? n.level}
                {n.storyCount ? ` · ${n.storyCount}s` : ""}
                {n.postCount ? ` · ${n.postCount}p` : ""}
              </div>
            </div>
          ),
        },
        style: {
          background: "#18181b",
          border: `1.5px solid ${niche ? "#22d3ee" : color}`,
          borderRadius: 10,
          padding: "6px 10px",
          width: NODE_W,
          boxShadow: niche ? "0 0 14px rgba(34,211,238,0.35)" : "none",
        },
      };
    });
    const edges: Edge[] = data
      .filter((n) => n.parentId && data.some((d) => d.id === n.parentId))
      .map((n) => ({
        id: `${n.parentId}-${n.id}`,
        source: n.parentId as string,
        target: n.id,
        style: { stroke: "#3f3f46" },
      }));
    return { nodes, edges };
  }, [data]);

  const onNodeClick = useCallback((_e: unknown, node: Node) => setSelectedId(node.id), []);
  const selected = data.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="flex h-screen bg-zinc-950">
      <div className="flex-1 relative">
        {loading && <div className="absolute inset-0 grid place-items-center text-zinc-500 text-sm z-10">Loading tree…</div>}
        <ReactFlow nodes={nodes} edges={edges} onNodeClick={onNodeClick} fitView proOptions={{ hideAttribution: true }}>
          <Background color="#27272a" gap={20} />
          <Controls className="!bg-zinc-900 !border-zinc-800" />
        </ReactFlow>
      </div>

      {/* evidence panel */}
      <aside className="w-80 border-l border-zinc-800 bg-zinc-950 p-5 overflow-y-auto">
        {!selected ? (
          <p className="text-zinc-500 text-sm">Click a node to see the evidence behind its status.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-100">{selected.name}</h2>
                {selected.isPrimaryNiche && <span className="text-cyan-400 text-xs font-semibold">★ edge</span>}
              </div>
              <div
                className="text-xs uppercase tracking-wide mt-0.5"
                style={{ color: selected.status ? STATUS_COLOR[selected.status] : "#a1a1aa" }}
              >
                {selected.status ?? selected.level}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Stat label="Stories" value={selected.storyCount} />
              <Stat label="Best story" value={selected.topBreakthrough ? `${selected.topBreakthrough}/5` : "—"} />
              <Stat label="Posts" value={selected.postCount} />
              <Stat label="Avg reach" value={selected.metrics.posts ? selected.metrics.avgReach : "—"} />
              <Stat label="Best reach" value={selected.metrics.posts ? selected.metrics.bestReach : "—"} />
              <Stat label="Saves" value={selected.metrics.posts ? selected.metrics.totalSaves : "—"} />
            </div>

            {selected.why && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Why</div>
                <p className="text-sm text-zinc-300 leading-relaxed">{selected.why}</p>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-base font-semibold text-zinc-100 tabular-nums">{value}</div>
    </div>
  );
}
