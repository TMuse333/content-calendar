import { useState } from "react";
import { CheckCircle2, Pencil, ThumbsUp } from "lucide-react";
import { PostPreview } from "@/components/media/PostPreview";
import { fmtDate, type SharePost, type Reaction } from "./types";

/**
 * One post per screen. A successful 👍 / change-request saves the reaction
 * server-side immediately, reports it up, and the wizard advances.
 */
export function PostStep({
  post,
  code,
  index,
  total,
  priorReaction,
  onReacted,
  onNext,
  showNext = true,
  sandbox = false,
}: {
  post: SharePost;
  code: string;
  index: number;
  total: number;
  priorReaction?: Reaction;
  onReacted: (postId: string, reaction: Reaction) => void;
  onNext: () => void;
  /** List mode renders no Next button and doesn't auto-advance. */
  showNext?: boolean;
  /** Sandbox (dev-only walkthrough): record locally, never hit the API. */
  sandbox?: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "change" | "sending">("idle");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const send = async (reaction: Reaction) => {
    if (sandbox) {
      onReacted(post.id, reaction);
      onNext();
      return;
    }
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
      onReacted(post.id, reaction);
      onNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setMode(reaction === "change" ? "change" : "idle");
    }
  };

  const date = fmtDate(post.postDate);

  return (
    <div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="aspect-[4/5] bg-black">
          <PostPreview urls={post.previewUrls} alt={post.title} controls className="w-full h-full object-contain" />
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500 mb-1">
            {[`Post ${index + 1} of ${total}`, post.type, date].filter(Boolean).join(" · ")}
          </p>
          <h2 className="text-lg font-semibold leading-snug">{post.questionAnswered || post.title}</h2>
        </div>
      </div>

      <div className="mt-4">
        {priorReaction ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              {priorReaction === "looks-good" ? "You said this looks good." : "You asked for a change here."}
            </p>
            {showNext && (
              <button onClick={onNext} className="w-full py-3 rounded-lg bg-blue-500 hover:bg-blue-400 font-semibold">
                Next →
              </button>
            )}
          </div>
        ) : mode === "change" || (mode === "sending" && comment) ? (
          <div className="space-y-2">
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What should change? (🎤 works too)"
              autoFocus
              className="w-full rounded-lg bg-slate-900 border border-slate-800 focus:border-blue-500 focus:outline-none p-3 text-base"
            />
            <div className="flex gap-2">
              <button
                onClick={() => send("change")}
                disabled={!comment.trim() || mode === "sending"}
                className="flex-1 py-3 rounded-lg bg-blue-500 disabled:opacity-40 font-semibold"
              >
                {mode === "sending" ? "Sending…" : "Send & next"}
              </button>
              <button onClick={() => setMode("idle")} className="px-4 py-3 rounded-lg bg-slate-800 text-slate-300">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setMode("change")}
              disabled={mode === "sending"}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold"
            >
              <Pencil className="w-4 h-4" /> Change something
            </button>
            <button
              onClick={() => send("looks-good")}
              disabled={mode === "sending"}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-50"
            >
              <ThumbsUp className="w-4 h-4" /> {mode === "sending" ? "Saving…" : "Looks good"}
            </button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
