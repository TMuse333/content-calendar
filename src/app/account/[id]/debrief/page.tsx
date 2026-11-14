"use client";

/**
 * Debrief — paste a story-call transcript → coverage (what the call hit on the
 * tree, niches) + video ideas to show the client ("based on our last call…").
 */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Sparkles, ChevronDown, ChevronRight, Film, Target, Phone } from "lucide-react";

interface CallRow {
  id: string;
  url: string;
  title: string;
  date?: string;
}
interface NodeVerdict {
  nodeId: string;
  nodeName: string;
  verdict: "hit" | "grazed" | "silent";
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
  surprise?: string;
  factsToConfirm: string[];
  isPrimaryNiche: boolean;
}

export default function DebriefPage() {
  const { id } = useParams<{ id: string }>();
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(true);

  useEffect(() => {
    fetch(`/api/accounts/${id}/calls`)
      .then((r) => r.json())
      .then((d) => setCalls(d.data ?? []))
      .catch(() => {});
  }, [id]);

  const run = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setAnalysis(null);
    setIdeas([]);
    try {
      const res = await fetch(`/api/accounts/${id}/debrief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Debrief failed");
      setAnalysis(d.analysis);
      setIdeas(d.ideas ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Debrief failed");
    } finally {
      setLoading(false);
    }
  }, [id, transcript]);

  const hit = analysis?.coverage.filter((c) => c.verdict === "hit") ?? [];
  const grazed = analysis?.coverage.filter((c) => c.verdict === "grazed") ?? [];
  const silent = analysis?.coverage.filter((c) => c.verdict === "silent") ?? [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Debrief</h1>
        <p className="text-slate-500 mb-6 text-sm">
          Paste a story-call transcript — get what it covered on the tree, the niches, and video ideas to show {id}.
        </p>

        {/* past calls — neon blue */}
        {calls.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            {calls.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-400/10 text-cyan-600 shadow-[0_0_12px_rgba(34,211,238,0.35)]"
              >
                <Phone className="w-3.5 h-3.5 text-cyan-500" />
                {c.title}
                {c.date ? ` · ${c.date.slice(0, 10)}` : ""}
              </span>
            ))}
          </div>
        )}

        {/* transcript input */}
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste the story-call transcript…"
          className="w-full h-40 p-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 mb-3 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
        />
        <button
          onClick={run}
          disabled={loading || transcript.trim().length < 50}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Analyzing (2 passes)…" : "Debrief this call"}
        </button>
        {err && <p className="text-red-600 text-sm mt-3">{err}</p>}

        {analysis && (
          <div className="mt-8 grid md:grid-cols-5 gap-6">
            {/* left: summary + coverage */}
            <div className="md:col-span-2 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <button
                  onClick={() => setSummaryOpen((o) => !o)}
                  className="flex items-center gap-2 font-semibold text-slate-900 text-sm"
                >
                  {summaryOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Summary
                </button>
                {summaryOpen && <p className="text-sm text-slate-600 mt-2 leading-relaxed">{analysis.summary}</p>}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm mb-3">
                  <Target className="w-4 h-4" /> Coverage
                </div>
                {hit.map((c) => (
                  <CoverRow key={c.nodeId} v={c} dot="bg-emerald-500" />
                ))}
                {grazed.map((c) => (
                  <CoverRow key={c.nodeId} v={c} dot="bg-amber-500" />
                ))}
                {silent.length > 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    {silent.length} silent: {silent.map((s) => s.nodeName).join(" · ")}
                  </p>
                )}
                {analysis.newStories.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">New stories / niches</div>
                    {analysis.newStories.map((s, i) => (
                      <p key={i} className="text-xs text-slate-600">
                        <span className="font-medium text-slate-800">{s.title}</span> — {s.summary}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* right: ideas */}
            <div className="md:col-span-3 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                <Film className="w-4 h-4" /> Video ideas ({ideas.length})
              </div>
              {ideas.map((idea, i) => (
                <IdeaCard key={i} idea={idea} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CoverRow({ v, dot }: { v: NodeVerdict; dot: string }) {
  return (
    <div className="flex items-start gap-2 py-1 text-sm">
      <span className={`mt-1.5 w-2 h-2 rounded-full flex-none ${dot}`} />
      <div>
        <span className="text-slate-800">{v.nodeName}</span>
        {v.evidence && <span className="block text-xs text-slate-400 italic">&ldquo;{v.evidence}&rdquo;</span>}
      </div>
    </div>
  );
}

function IdeaCard({ idea }: { idea: VideoIdea }) {
  return (
    <div
      className={`rounded-xl border p-4 bg-white ${
        idea.isPrimaryNiche ? "border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)]" : "border-slate-200"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase flex-wrap">
        <span className="text-slate-700 font-semibold normal-case">{idea.node}</span>
        {idea.isPrimaryNiche && <span className="text-cyan-500">★ edge</span>}
        <span>· {idea.lens}</span>
        <span>· {idea.suggestedFormat}</span>
      </div>
      <p className="text-sm text-slate-800 font-medium mt-1">{idea.angle}</p>
      <p className="text-xs text-slate-500 mt-1">
        {idea.beliefBefore} → <span className="text-slate-700">{idea.beliefAfter}</span>
      </p>
      <div className="mt-2 space-y-1">
        {idea.hooks.map((h, j) => (
          <div key={j} className="text-xs flex items-start gap-1.5">
            <span className={h.preferred ? "text-slate-900" : "text-slate-300"}>{h.preferred ? "▶" : "·"}</span>
            <span className={`font-mono ${h.type === "spoken" ? "text-emerald-600" : "text-slate-400"}`}>[{h.type}]</span>
            <span className="text-slate-600">&ldquo;{h.text}&rdquo;</span>
          </div>
        ))}
      </div>
      {idea.factsToConfirm.length > 0 && (
        <p className="text-[11px] text-amber-600 mt-2">verify: {idea.factsToConfirm.join(" · ")}</p>
      )}
    </div>
  );
}
