"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { ScheduledPost } from "@/lib/types/scheduled-post";
import { getStatusDisplay } from "@/lib/types/scheduled-post";

interface ReviewData {
  proposed: ScheduledPost[];
  inReview: ScheduledPost[];
  revision: ScheduledPost[];
  all: ScheduledPost[];
}

export default function ClientReviewPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const [agentId, setAgentId] = useState<string>("");
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    params.then((p) => setAgentId(p.agentId));
  }, [params]);

  const fetchData = useCallback(async () => {
    if (!agentId) return;

    try {
      const res = await fetch(`/api/review/${agentId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json.data);
      setError(null);
    } catch (err) {
      setError("Failed to load review items");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (agentId) {
      fetchData();
    }
  }, [agentId, fetchData]);

  const handleApprove = async (post: ScheduledPost) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/review/${agentId}/${post.id}/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to approve");
      await fetchData();
      setSelectedPost(null);
    } catch (err) {
      console.error(err);
      alert("Failed to approve. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevision = async (post: ScheduledPost) => {
    if (!feedback.trim()) {
      alert("Please provide feedback for the revision request.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/review/${agentId}/${post.id}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim() }),
      });
      if (!res.ok) throw new Error("Failed to request revision");
      await fetchData();
      setSelectedPost(null);
      setFeedback("");
    } catch (err) {
      console.error(err);
      alert("Failed to request revision. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  const hasItems = data && data.all.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold">Content Review</h1>
          <p className="text-sm text-slate-400 mt-1">
            Review and approve your scheduled content
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {!hasItems ? (
          <div className="text-center py-16">
            <div className="text-slate-500 text-lg">No items to review</div>
            <p className="text-slate-600 mt-2">
              Check back later for new content to approve.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Schedule Approvals */}
            {data.proposed.length > 0 && (
              <section>
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Schedule Approval
                  <span className="text-sm text-slate-500 font-normal">
                    ({data.proposed.length})
                  </span>
                </h2>
                <div className="space-y-3">
                  {data.proposed.map((post) => (
                    <ScheduleCard
                      key={post.id}
                      post={post}
                      onApprove={() => handleApprove(post)}
                      disabled={submitting}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Graphic Reviews */}
            {data.inReview.length > 0 && (
              <section>
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  Ready for Review
                  <span className="text-sm text-slate-500 font-normal">
                    ({data.inReview.length})
                  </span>
                </h2>
                <div className="grid gap-4">
                  {data.inReview.map((post) => (
                    <GraphicCard
                      key={post.id}
                      post={post}
                      onSelect={() => setSelectedPost(post)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Revision Requested */}
            {data.revision.length > 0 && (
              <section>
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Revision In Progress
                  <span className="text-sm text-slate-500 font-normal">
                    ({data.revision.length})
                  </span>
                </h2>
                <div className="grid gap-4">
                  {data.revision.map((post) => (
                    <GraphicCard
                      key={post.id}
                      post={post}
                      onSelect={() => setSelectedPost(post)}
                      showFeedback
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium">
                    {selectedPost.intent.topic || "Untitled Post"}
                  </h3>
                  <p className="text-sm text-slate-400">
                    Scheduled for{" "}
                    {new Date(selectedPost.scheduledFor).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPost(null);
                    setFeedback("");
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Graphic Preview */}
              {selectedPost.graphicPreviewUrl ? (
                <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-800 mb-6">
                  <Image
                    src={selectedPost.graphicPreviewUrl}
                    alt="Graphic preview"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square rounded-lg bg-slate-800 flex items-center justify-center mb-6">
                  <span className="text-slate-500">No preview available</span>
                </div>
              )}

              {/* Previous Feedback */}
              {selectedPost.clientFeedback && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400 font-medium mb-1">
                    Your previous feedback:
                  </p>
                  <p className="text-sm text-slate-300">
                    {selectedPost.clientFeedback}
                  </p>
                </div>
              )}

              {/* Feedback Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Feedback (if requesting changes)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe what changes you'd like..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(selectedPost)}
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  {submitting ? "Processing..." : "Approve"}
                </button>
                <button
                  onClick={() => handleRevision(selectedPost)}
                  disabled={submitting || !feedback.trim()}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  {submitting ? "Processing..." : "Request Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Schedule approval card
function ScheduleCard({
  post,
  onApprove,
  disabled,
}: {
  post: ScheduledPost;
  onApprove: () => void;
  disabled?: boolean;
}) {
  const date = new Date(post.scheduledFor);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
      <div>
        <div className="font-medium">
          {date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </div>
        <div className="text-sm text-slate-400 mt-1">
          {post.intent.topic || "General content"} &bull;{" "}
          <span className="capitalize">{post.intent.audience}</span> audience
        </div>
      </div>
      <button
        onClick={onApprove}
        disabled={disabled}
        className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        Approve Slot
      </button>
    </div>
  );
}

// Graphic review card
function GraphicCard({
  post,
  onSelect,
  showFeedback,
}: {
  post: ScheduledPost;
  onSelect: () => void;
  showFeedback?: boolean;
}) {
  const date = new Date(post.scheduledFor);
  const status = getStatusDisplay(post.status);

  return (
    <div
      onClick={onSelect}
      className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden cursor-pointer hover:border-slate-700 transition-colors"
    >
      <div className="flex">
        {/* Preview thumbnail */}
        <div className="w-32 h-32 bg-slate-800 flex-shrink-0 relative">
          {post.graphicPreviewUrl ? (
            <Image
              src={post.graphicPreviewUrl}
              alt="Preview"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium">
                {post.intent.topic || "Untitled Post"}
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full ${status.bgColor} ${status.color}`}
            >
              {status.label}
            </span>
          </div>

          {showFeedback && post.clientFeedback && (
            <div className="mt-3 text-sm text-slate-400 bg-slate-800/50 rounded p-2 line-clamp-2">
              &ldquo;{post.clientFeedback}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
