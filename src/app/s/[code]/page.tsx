"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, Mic, Pencil, ThumbsUp } from "lucide-react";
import { PostPreview } from "@/components/media/PostPreview";

interface SharePost {
  id: string;
  title: string;
  questionAnswered?: string;
  type?: string;
  status: string;
  postDate?: string;
  caption?: string;
  previewUrls: string[];
}

interface ShareData {
  clientName: string;
  message: string | null;
  posts: SharePost[];
  questionSet: {
    id: string;
    label: string;
    intro: string;
    questions: { id: string; prompt: string; hint?: string }[];
  } | null;
}

function fmtDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function PostCard({ post, code, index }: { post: SharePost; code: string; index: number }) {
  const [mode, setMode] = useState<"idle" | "change" | "sending" | "done">("idle");
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (reaction: "looks-good" | "change") => {
    setMode("sending");
    setError(null);
    try {
      const r = await fetch(`/api/share/${code}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, reaction, comment: reaction === "change" ? comment : undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Something went wrong");
      setResult(j.message);
      setMode("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setMode(reaction === "change" ? "change" : "idle");
    }
  };

  const date = fmtDate(post.postDate);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="aspect-[4/5] bg-black">
        <PostPreview urls={post.previewUrls} alt={post.title} controls className="w-full h-full object-contain" />
      </div>
      <div className="p-4">
        <p className="text-xs text-slate-500 mb-1">
          {[`Post ${index + 1}`, post.type, date].filter(Boolean).join(" · ")}
        </p>
        <h2 className="text-lg font-semibold leading-snug">{post.questionAnswered || post.title}</h2>

        {mode === "done" ? (
          <p className="mt-4 flex items-center gap-2 text-emerald-400 text-sm">
            <CheckCircle2 className="w-4 h-4" /> {result}
          </p>
        ) : mode === "change" || (mode === "sending" && comment) ? (
          <div className="mt-4 space-y-2">
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What should change? (🎤 works too)"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none p-3 text-base"
            />
            <div className="flex gap-2">
              <button
                onClick={() => send("change")}
                disabled={!comment.trim() || mode === "sending"}
                className="flex-1 py-3 rounded-lg bg-blue-500 disabled:opacity-40 font-semibold"
              >
                {mode === "sending" ? "Sending…" : "Send"}
              </button>
              <button onClick={() => setMode("idle")} className="px-4 py-3 rounded-lg bg-slate-800 text-slate-300">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => send("looks-good")}
              disabled={mode === "sending"}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-50"
            >
              <ThumbsUp className="w-4 h-4" /> Looks good
            </button>
            <button
              onClick={() => setMode("change")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold"
            >
              <Pencil className="w-4 h-4" /> Change…
            </button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    </section>
  );
}

export default function SharePage() {
  const params = useParams();
  const code = params.code as string;
  const [data, setData] = useState<ShareData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  const draftKey = `share-draft:${code}`;

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("preview") === "1";
    fetch(`/api/share/${code}${preview ? "?preview=1" : ""}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setData(j);
      })
      .catch((e) => setLoadError(e.message || "This link isn't working."));
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) setAnswers(JSON.parse(saved));
    } catch {
      /* optional */
    }
  }, [code, draftKey]);

  const setAnswer = (id: string, v: string) => {
    const next = { ...answers, [id]: v };
    setAnswers(next);
    try {
      localStorage.setItem(draftKey, JSON.stringify(next));
    } catch {
      /* optional */
    }
  };

  const submitAnswers = async () => {
    setSending(true);
    setAnswerError(null);
    try {
      const r = await fetch(`/api/share/${code}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Something went wrong");
      setSent(true);
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* optional */
      }
    } catch (e) {
      setAnswerError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-bold text-white mb-2">Link expired or invalid</h1>
          <p className="text-slate-400">Please ask Thomas for a new link.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  const first = data.clientName.split(" ")[0];
  const qs = data.questionSet?.questions ?? [];
  const answered = qs.filter((q) => answers[q.id]?.trim()).length;
  const parts = [
    data.posts.length ? `${data.posts.length} post${data.posts.length === 1 ? "" : "s"} to look at` : null,
    qs.length ? `${qs.length} quick questions` : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-xl mx-auto px-4 py-8 pb-16 space-y-8">
        <header>
          <p className="text-xs tracking-widest text-blue-400 uppercase mb-3">Syntellic · For {first}</p>
          <h1 className="text-2xl font-bold leading-tight">Hi {first}, {parts.join(" + ")}</h1>
          {data.message && <p className="text-slate-300 mt-3 whitespace-pre-line">{data.message}</p>}
        </header>

        {data.posts.length > 0 && (
          <div className="space-y-6">
            <p className="text-sm text-slate-400">Swipe through each one, then tap Looks good or Change.</p>
            {data.posts.map((p, i) => (
              <PostCard key={p.id} post={p} code={code} index={i} />
            ))}
          </div>
        )}

        {data.questionSet && (
          <section className="pt-2">
            <h2 className="text-xl font-bold mb-1">{data.questionSet.label}</h2>
            <p className="text-slate-400 mb-4">{data.questionSet.intro}</p>
            {sent ? (
              <p className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" /> Thanks, got your answers!
              </p>
            ) : (
              <>
                <div className="flex items-start gap-2 text-sm text-slate-300 bg-slate-900 border border-slate-800 rounded-lg p-3 mb-6">
                  <Mic className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Faster: tap the 🎤 on your phone&apos;s keyboard and just talk.</span>
                </div>
                <div className="space-y-6">
                  {qs.map((q, i) => (
                    <div key={q.id}>
                      <label htmlFor={q.id} className="block font-medium mb-1">
                        <span className="text-slate-500 mr-1">{i + 1}.</span> {q.prompt}
                      </label>
                      {q.hint && <p className="text-xs text-slate-500 mb-2">{q.hint}</p>}
                      <textarea
                        id={q.id}
                        rows={4}
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        placeholder="Type or talk…"
                        className="w-full rounded-lg bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none p-3 text-base"
                      />
                    </div>
                  ))}
                </div>
                {answerError && <p className="mt-4 text-sm text-red-400">{answerError}</p>}
                <div className="mt-6 flex items-center gap-3">
                  <span className="text-sm text-slate-400 flex-1">
                    {answered}/{qs.length} answered
                  </span>
                  <button
                    onClick={submitAnswers}
                    disabled={sending || answered === 0}
                    className="px-5 py-3 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-40 font-semibold"
                  >
                    {sending ? "Sending…" : "Send answers"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
