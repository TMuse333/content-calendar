import { useState } from "react";
import { X, Check, Send, Loader2, MessageSquare } from "lucide-react";
import { PostPreview } from "@/components/media/PostPreview";
import type { CalendarPost } from "./types";

/**
 * Calendar post detail: client-safe metadata (topic, question, decision
 * stage, format, CTA) plus Approve / Request-a-change for posts that are
 * "Ready for review". Strategy-internal fields are never shown here.
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
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const canReview = post.source === "notion" && post.status === "Ready for review";
  // "4 - Worked for others?" / "4 Worked for others?" → "Worked for others?"
  const stageLabel = post.decisionStage?.replace(/^\d+\s*-?\s*/, "");

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

  const metadata: { label: string; value: string }[] = [
    ...(post.topic ? [{ label: "Topic", value: post.topic }] : []),
    ...(post.questionAnswered ? [{ label: "Answers the question", value: `"${post.questionAnswered}"` }] : []),
    ...(stageLabel ? [{ label: "Helps people decide", value: stageLabel }] : []),
    ...(post.type ? [{ label: "Format", value: post.type }] : []),
    ...(post.cta ? [{ label: "Call to action", value: post.cta }] : []),
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
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
              {(post.postedAt || post.scheduledFor) && (
                <span className="text-sm text-slate-500">
                  {new Date(post.postedAt || post.scheduledFor!).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-white mt-2">
              {post.title || "Post"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="flex gap-5">
            {/* Preview */}
            <div className="w-32 h-32 bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
              <PostPreview url={post.previewUrl} urls={post.previewUrls} alt={post.title} iconClassName="w-8 h-8 text-slate-600" />
            </div>

            {/* Caption */}
            <div className="flex-1 min-w-0">
              {post.caption ? (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Caption</p>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap line-clamp-6">
                    {post.caption}
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No caption yet.</p>
              )}
            </div>
          </div>

          {/* Metadata */}
          {metadata.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg divide-y divide-slate-800">
              {metadata.map((m) => (
                <div key={m.label} className="flex items-start gap-3 px-4 py-2.5">
                  <span className="text-xs text-slate-500 w-36 flex-shrink-0 pt-0.5">{m.label}</span>
                  <span className="text-sm text-slate-300">{m.value}</span>
                </div>
              ))}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className={`rounded-lg px-4 py-3 text-sm ${
                notice.kind === "ok"
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                  : "bg-red-500/10 text-red-300 border border-red-500/30"
              }`}
            >
              {notice.text}
            </div>
          )}

          {/* Feedback (only for posts waiting on the client) */}
          {canReview && notice?.kind !== "ok" && (
            <div>
              {showCommentBox ? (
                <div className="space-y-2">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What should we change?"
                    rows={3}
                    autoFocus
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction("request-changes")}
                      disabled={submitting || !comment.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Send className="w-4 h-4" />
                      Send feedback
                    </button>
                    <button
                      onClick={() => setShowCommentBox(false)}
                      disabled={submitting}
                      className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction("approve")}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => setShowCommentBox(true)}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Request a change
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
