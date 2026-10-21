"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, ExternalLink, Loader2, RefreshCw, Share2 } from "lucide-react";
import { PostPreview } from "@/components/media/PostPreview";
import { SharePanel } from "@/components/share/SharePanel";

type Column = "waiting-client" | "building" | "to-schedule" | "scheduled" | "ideas";

interface Item {
  id: string;
  title: string;
  status: string;
  type?: string;
  questionAnswered?: string;
  postDate?: string;
  slides: number;
  thumbnail?: string;
  previewUrls: string[];
  notionUrl: string;
  issues: string[];
}

interface PipelineData {
  accountName: string;
  columns: Record<Column, Item[]>;
  counts: Record<Column, number>;
  issueCount: number;
}

const COLUMNS: { id: Column; title: string; who: string; tone: string }[] = [
  { id: "waiting-client", title: "Ready for review", who: "Waiting on client", tone: "text-orange-400 border-orange-500/40" },
  { id: "building", title: "Draft", who: "You're building", tone: "text-amber-300 border-amber-500/30" },
  { id: "to-schedule", title: "Approved", who: "You: schedule it", tone: "text-blue-400 border-blue-500/40" },
  { id: "scheduled", title: "Scheduled", who: "Done, going out", tone: "text-violet-400 border-violet-500/40" },
  { id: "ideas", title: "Ideas", who: "Backlog", tone: "text-slate-400 border-slate-700" },
];

function fmtDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PipelinePage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<PipelineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIdeas, setShowIdeas] = useState(false);
  const [open, setOpen] = useState<Item | null>(null);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${id}/pipeline`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-6 text-red-400">{error ?? "Failed to load"}</div>;
  }

  const visible = COLUMNS.filter((c) => c.id !== "ideas" || showIdeas);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline</h1>
          <p className="text-slate-400 mt-1 text-sm">What&apos;s pending for {data.accountName}, live from Notion.</p>
        </div>
        <div className="flex gap-2">
        <button
          onClick={() => setSharing(true)}
          className="flex items-center gap-2 text-sm text-white px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-slate-300 hover:text-white px-3 py-2 rounded-lg bg-slate-800"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {COLUMNS.slice(0, 4).map((c) => (
          <div key={c.id} className={`bg-slate-900 border rounded-xl p-3 ${c.tone}`}>
            <p className="text-2xl font-bold text-white">{data.counts[c.id]}</p>
            <p className="text-xs">{c.who}</p>
          </div>
        ))}
      </div>

      {data.issueCount > 0 && (
        <div className="mb-6 flex items-center gap-2 text-sm rounded-lg px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {data.issueCount} post{data.issueCount === 1 ? "" : "s"} need fixing before the client sees them (flagged below).
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visible.map((c) => (
          <section key={c.id}>
            <div className={`flex items-baseline justify-between border-b pb-2 mb-3 ${c.tone}`}>
              <h2 className="font-semibold">{c.title}</h2>
              <span className="text-xs">{c.who} · {data.counts[c.id]}</span>
            </div>
            {data.columns[c.id].length === 0 ? (
              <p className="text-xs text-slate-600">Nothing here.</p>
            ) : (
              <div className="space-y-2">
                {data.columns[c.id].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setOpen(item)}
                    className="block w-full text-left bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg p-3"
                  >
                    <div className="flex gap-3">
                      <div className="w-12 h-14 bg-slate-800 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                        <PostPreview url={item.thumbnail} iconClassName="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium leading-snug line-clamp-2">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {[item.type, fmtDate(item.postDate), item.slides > 1 ? `${item.slides} slides` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                    {item.issues.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {item.issues.map((iss) => (
                          <li key={iss} className="text-xs text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {iss}
                          </li>
                        ))}
                      </ul>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <button onClick={() => setShowIdeas((v) => !v)} className="mt-6 text-sm text-slate-400 hover:text-white">
        {showIdeas ? "Hide ideas" : `Show ideas (${data.counts.ideas})`}
      </button>

      {open && <PostViewer item={open} onClose={() => setOpen(null)} />}
      {sharing && (
        <SharePanel
          accountId={id}
          posts={(["waiting-client", "building", "to-schedule", "scheduled"] as Column[]).flatMap((c) =>
            data.columns[c].map((i) => ({ id: i.id, title: i.title, status: i.status, slides: i.slides }))
          )}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  );
}

function PostViewer({ item, onClose }: { item: Item; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button aria-label="Close" className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[95vh] overflow-y-auto bg-slate-900 rounded-2xl shadow-2xl">
        <div className="aspect-[4/5] bg-black">
          {item.previewUrls.length > 0 ? (
            <PostPreview urls={item.previewUrls} alt={item.title} controls className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">No slides attached yet</div>
          )}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white font-semibold leading-snug">{item.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {[item.status, item.type, fmtDate(item.postDate), item.slides > 1 ? `${item.slides} slides` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <button onClick={onClose} className="text-sm text-slate-400 hover:text-white">Close</button>
          </div>
          {item.questionAnswered && (
            <p className="text-sm text-slate-300">&ldquo;{item.questionAnswered}&rdquo;</p>
          )}
          {item.issues.length > 0 && (
            <ul className="space-y-0.5">
              {item.issues.map((iss) => (
                <li key={iss} className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {iss}
                </li>
              ))}
            </ul>
          )}
          <a
            href={item.notionUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 pt-1"
          >
            Open in Notion <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
