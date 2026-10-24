import { useState } from "react";
import { X, Check, Send, Loader2 } from "lucide-react";
import { PostPreview } from "@/components/media/PostPreview";
import type { CalendarPost } from "./types";

/**
 * Calendar post detail — same layout as the Review tab's modal: big preview
 * left, client-safe details right (topic, question, decision stage, format,
 * CTA), with comment + Approve for posts that are "Ready for review".
 * Strategy-internal fields are never shown here.
 */
export function ClientCalendarPostModal({
  post,
  accountId,
  onClose,
  onActionDone,
}: {
  post: CalendarPost;
  accountId: string;
  onClose: () => void;
  onActionDone: () => void;
}) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const canReview = post.source === "notion" && post.status === "Ready for review";
  // "4 - Worked for others?" / "4 Worked for others?" → "Worked for others?"
  const stageLabel = post.decisionStage?.replace(/^\d+\s*-?\s*/, "");
  const dateLabel = (post.postedAt || post.scheduledFor)
    ? new Date(post.postedAt || post.scheduledFor!).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;

  const handleAction = async (action: "approve" | "request-changes") => {
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}/posts/${post.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: comment || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ kind: "error", text: json?.error || "Something went wrong. Please try again." });
        return;
      }
      setNotice({ kind: "ok", text: json?.data?.message || "Saved." });
      setTimeout(onActionDone, 1200);
    } catch {
      setNotice({ kind: "error", text: "Couldn't reach the server. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              {post.topic && (
                <span className="text-xs text-emerald-500 font-medium uppercase tracking-wider">
                  {post.topic}
                </span>
              )}
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  post.status === "Posted"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : post.status === "Ready for review"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {post.status === "Ready for review" ? "Needs your OK" : post.status}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-white mt-1">{post.title || "Post"}</h3>
            {dateLabel && <p className="text-sm text-slate-500 mt-0.5">{dateLabel}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col md:flex-row gap-5">
          {/* Preview */}
          <div className="flex-1">
            <div className="aspect-[4/5] bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden">
              <PostPreview url={post.previewUrl} urls={post.previewUrls} alt={post.title} controls className="w-full h-full object-contain bg-black" iconClassName="w-20 h-20 text-slate-600" />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col">
            {post.questionAnswered && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-1">Question this answers:</p>
                <p className="text-white">&ldquo;{post.questionAnswered}&rdquo;</p>
              </div>
            )}

            {post.caption && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-1">Caption:</p>
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{post.caption}</p>
              </div>
            )}

            {(stageLabel || post.type || post.cta) && (
              <div className="mb-4 bg-slate-800/50 rounded-lg divide-y divide-slate-800">
                {stageLabel && (
                  <div className="flex items-start gap-3 px-3 py-2">
                    <span className="text-xs text-slate-500 w-28 flex-shrink-0 pt-0.5">Helps decide</span>
                    <span className="text-sm text-slate-300">{stageLabel}</span>
                  </div>
                )}
                {post.type && (
                  <div className="flex items-start gap-3 px-3 py-2">
                    <span className="text-xs text-slate-500 w-28 flex-shrink-0 pt-0.5">Format</span>
                    <span className="text-sm text-slate-300">{post.type}</span>
                  </div>
                )}
                {post.cta && (
                  <div className="flex items-start gap-3 px-3 py-2">
                    <span className="text-xs text-slate-500 w-28 flex-shrink-0 pt-0.5">Call to action</span>
                    <span className="text-sm text-slate-300">{post.cta}</span>
                  </div>
                )}
              </div>
            )}

            {notice && (
              <div
                role="status"
                className={`mb-3 rounded-lg px-4 py-3 text-sm ${
                  notice.kind === "ok"
                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                    : "bg-red-500/10 text-red-300 border border-red-500/30"
                }`}
              >
                {notice.text}
              </div>
            )}

            {/* Actions — same pattern as the Review tab modal */}
            {canReview && notice?.kind !== "ok" ? (
              <div className="mt-auto">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a note or request changes..."
                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => handleAction("request-changes")}
                    disabled={!comment.trim() || submitting}
                    title="Send change request"
                    className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl transition-colors"
                  >
                    <Send className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction("approve")}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Approve
                      </>
                    )}
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-auto flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
