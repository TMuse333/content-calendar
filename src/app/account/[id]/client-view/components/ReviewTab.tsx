import { useState } from "react";
import { CheckCircle2, Check, Eye, X, Send, Loader2 } from "lucide-react";
import { PostPreview } from "@/components/media/PostPreview";
import type { ReviewPost, UpcomingPost } from "./types";

export function ReviewTab({
  posts,
  upcoming,
  topicNames,
  onRefresh,
  accountId,
}: {
  posts: ReviewPost[];
  upcoming: UpcomingPost[];
  topicNames: Record<string, string>;
  onRefresh: () => void;
  accountId: string;
}) {
  const [selectedPost, setSelectedPost] = useState<ReviewPost | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const handleAction = async (postId: string, action: "approve" | "request-changes") => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/posts/${postId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: comment || undefined }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Review action failed:", json);
        setNotice({ kind: "error", text: json?.error || "Something went wrong. Please try again." });
        return;
      }

      setNotice({ kind: "ok", text: json?.data?.message || "Saved." });
      setSelectedPost(null);
      setComment("");
      onRefresh();
    } catch (err) {
      console.error(err);
      setNotice({ kind: "error", text: "Couldn't reach the server. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Needs Your OK</h2>
      <p className="text-slate-400 mb-6">
        Review and approve content before it goes live.
      </p>

      {notice && (
        <div
          role="status"
          className={`mb-4 rounded-lg px-4 py-3 text-sm flex items-start justify-between gap-3 ${
            notice.kind === "ok"
              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
              : "bg-red-500/10 text-red-300 border border-red-500/30"
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="text-xs opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <p className="text-white font-medium mb-1">All caught up!</p>
          <p className="text-slate-400 text-sm">No posts waiting for review.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex gap-5"
            >
              {/* Preview */}
              <div className="w-24 h-24 bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                <PostPreview url={post.previewUrl} urls={post.previewUrls} alt={post.title} iconClassName="w-8 h-8 text-slate-600" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {post.topicId && topicNames[post.topicId] && (
                  <p className="text-xs text-emerald-500 font-medium mb-1">
                    {topicNames[post.topicId]}
                  </p>
                )}
                <h3 className="text-white font-medium mb-1">{post.title}</h3>
                {post.questionAnswered && (
                  <p className="text-sm text-slate-400 mb-3">
                    Answers: &ldquo;{post.questionAnswered}&rdquo;
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(post.id, "approve")}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => setSelectedPost(post)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          topicName={selectedPost.topicId ? topicNames[selectedPost.topicId] : undefined}
          comment={comment}
          setComment={setComment}
          submitting={submitting}
          onApprove={() => handleAction(selectedPost.id, "approve")}
          onRequestChanges={() => handleAction(selectedPost.id, "request-changes")}
          onClose={() => {
            setSelectedPost(null);
            setComment("");
          }}
        />
      )}

      <ComingUp posts={upcoming} topicNames={topicNames} />
    </div>
  );
}

function formatPostDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function ComingUp({
  posts,
  topicNames,
}: {
  posts: UpcomingPost[];
  topicNames: Record<string, string>;
}) {
  const [open, setOpen] = useState<UpcomingPost | null>(null);
  if (posts.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold text-white mb-1">Coming Up</h2>
      <p className="text-slate-400 mb-4 text-sm">
        What we&apos;re working on next. You&apos;ll be asked to approve each one before it goes out.
      </p>
      <div className="space-y-3">
        {posts.map((post) => {
          const date = formatPostDate(post.postDate);
          const hasPreview = (post.previewUrls?.length ?? 0) > 0;
          return (
            <button
              key={post.id}
              onClick={() => hasPreview && setOpen(post)}
              className={`w-full text-left bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4 ${
                hasPreview ? "hover:border-slate-700" : "cursor-default"
              }`}
            >
              <div className="w-16 h-20 bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                <PostPreview urls={post.previewUrls} alt={post.title} iconClassName="w-6 h-6 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {post.type && <span className="text-xs text-slate-500">{post.type}</span>}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      post.status === "Approved"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {post.status === "Approved" ? "Approved" : "In progress"}
                  </span>
                  {date && <span className="text-xs text-slate-400">· {date}</span>}
                </div>
                <p className="text-white font-medium leading-snug">
                  {post.questionAnswered || post.title}
                </p>
                {post.topicId && topicNames[post.topicId] && (
                  <p className="text-xs text-emerald-500 mt-1">{topicNames[post.topicId]}</p>
                )}
                {hasPreview && <p className="text-xs text-slate-500 mt-1">Tap for a first look</p>}
              </div>
            </button>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Close" className="absolute inset-0 bg-black/80" onClick={() => setOpen(null)} />
          <div className="relative w-full max-w-md bg-slate-900 rounded-2xl overflow-hidden">
            <div className="aspect-[4/5] bg-black">
              <PostPreview urls={open.previewUrls} alt={open.title} controls className="w-full h-full object-contain" />
            </div>
            <div className="p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-white font-medium">{open.questionAnswered || open.title}</p>
                <p className="text-xs text-slate-400 mt-1">Draft preview, not final yet.</p>
              </div>
              <button onClick={() => setOpen(null)} className="text-sm text-slate-300 hover:text-white">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostDetailModal({
  post,
  topicName,
  comment,
  setComment,
  submitting,
  onApprove,
  onRequestChanges,
  onClose,
}: {
  post: ReviewPost;
  topicName?: string;
  comment: string;
  setComment: (c: string) => void;
  submitting: boolean;
  onApprove: () => void;
  onRequestChanges: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            {topicName && (
              <span className="text-xs text-emerald-500 font-medium uppercase tracking-wider">
                {topicName}
              </span>
            )}
            <h3 className="text-xl font-semibold text-white mt-1">{post.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
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
                <p className="text-slate-300 text-sm">{post.caption}</p>
              </div>
            )}

            {/* Comment */}
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
                  onClick={onRequestChanges}
                  disabled={!comment.trim() || submitting}
                  className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onApprove}
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
          </div>
        </div>
      </div>
    </div>
  );
}
