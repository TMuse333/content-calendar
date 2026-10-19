"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  MessageSquare,
  Loader2,
  Image,
  Video,
  LayoutGrid,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  FileText,
  Calendar,
} from "lucide-react";

/**
 * Client-safe post view (subset of NotionPost)
 * Hides: Drive links, strategy fields (Belief before/after, Lever, Device, Pattern)
 */
interface ReviewPost {
  id: string;
  title: string;
  status: string;
  type?: string;
  topicName?: string;
  questionAnswered?: string;
  caption?: string;
  cta?: string;
  previewUrl?: string;
}

interface AccountInfo {
  name: string;
  isPaid: boolean;
  checklist: {
    id: string;
    text: string;
    completed: boolean;
  }[];
}

interface ReviewSummary {
  total: number;
  readyForReview: number;
  published: number;
}

interface ReviewData {
  account: AccountInfo;
  summary: ReviewSummary;
  posts: {
    needsReview: ReviewPost[];
    approved: ReviewPost[];
    published: ReviewPost[];
  };
}

export default function ReviewPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/review/${token}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to load");
        return;
      }

      setData(json);
    } catch {
      setError("Failed to load review portal");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (postId: string, action: "approve" | "request-changes") => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/review/${token}/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          comment: comment || undefined,
        }),
      });

      if (res.ok) {
        await fetchData();
        setActiveItem(null);
        setComment("");
      }
    } catch (err) {
      console.error("Failed to submit:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Link Expired or Invalid</h1>
          <p className="text-slate-400">
            This review link is no longer valid. Please contact us for a new link.
          </p>
        </div>
      </div>
    );
  }

  const { account, summary, posts } = data;

  const getTypeIcon = (type?: string) => {
    if (!type) return <FileText className="w-4 h-4" />;
    switch (type.toLowerCase()) {
      case "carousel":
        return <LayoutGrid className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      default:
        return <Image className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case "Ready for Review":
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
            <Clock className="w-3 h-3" /> Ready for Review
          </span>
        );
      case "Published":
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
            <Check className="w-3 h-3" /> Published
          </span>
        );
      case "Scheduled":
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full">
            <Calendar className="w-3 h-3" /> Scheduled
          </span>
        );
      default:
        return (
          <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-bold text-white">{account.name}</h1>
          <p className="text-sm text-slate-400">Content Review Portal</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Summary Stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-medium text-slate-400 mb-3">Overview</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {summary.readyForReview}
              </div>
              <div className="text-xs text-slate-500">Needs Review</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">
                {posts.approved.length}
              </div>
              <div className="text-xs text-slate-500">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {summary.published}
              </div>
              <div className="text-xs text-slate-500">Published</div>
            </div>
          </div>
        </div>

        {/* Ready for Review */}
        {posts.needsReview.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Ready for Your Review ({posts.needsReview.length})
            </h2>
            <div className="space-y-4">
              {posts.needsReview.map((post) => (
                <div
                  key={post.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
                >
                  {/* Preview Image */}
                  {post.previewUrl ? (
                    <div className="aspect-video bg-slate-800 relative">
                      <img
                        src={post.previewUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      {!account.isPaid && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-amber-400 text-xs rounded">
                          Preview
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video bg-slate-800 flex items-center justify-center">
                      <div className="text-center text-slate-500">
                        <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Preview coming soon</p>
                      </div>
                    </div>
                  )}

                  {/* Post Info */}
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-white truncate">{post.title}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {post.type && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              {getTypeIcon(post.type)}
                              {post.type}
                            </span>
                          )}
                          {post.topicName && (
                            <span className="text-xs text-slate-500">
                              • {post.topicName}
                            </span>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(post.status)}
                    </div>

                    {/* Question Answered */}
                    {post.questionAnswered && (
                      <div className="mb-3 p-3 bg-slate-800/50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">What this answers:</p>
                        <p className="text-sm text-slate-300">{post.questionAnswered}</p>
                      </div>
                    )}

                    {/* Caption */}
                    {post.caption && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-1">Caption:</p>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap line-clamp-4">
                          {post.caption}
                        </p>
                      </div>
                    )}

                    {/* CTA */}
                    {post.cta && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 mb-1">Call to Action:</p>
                        <p className="text-sm text-slate-300">{post.cta}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {activeItem === post.id ? (
                      <div className="space-y-3 pt-3 border-t border-slate-800">
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Add a comment (optional)..."
                          rows={2}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(post.id, "approve")}
                            disabled={submitting}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            {submitting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(post.id, "request-changes")}
                            disabled={submitting || !comment.trim()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Request Changes
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setActiveItem(null);
                            setComment("");
                          }}
                          className="w-full text-sm text-slate-400 hover:text-white py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveItem(post.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        Review This Post
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved Posts */}
        {posts.approved.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Approved ({posts.approved.length})
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {posts.approved.map((post) => (
                <div
                  key={post.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
                >
                  {post.previewUrl ? (
                    <div className="aspect-square bg-slate-800 relative">
                      <img
                        src={post.previewUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square bg-slate-800 flex items-center justify-center relative">
                      <Image className="w-6 h-6 text-slate-600" />
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium text-white truncate">{post.title}</p>
                    {post.type && (
                      <p className="text-xs text-slate-500 capitalize mt-0.5">{post.type}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Published Posts */}
        {posts.published.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-purple-500" />
              Published ({posts.published.length})
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {posts.published.map((post) => (
                <div
                  key={post.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
                >
                  {post.previewUrl ? (
                    <div className="aspect-square bg-slate-800">
                      <img
                        src={post.previewUrl}
                        alt={post.title}
                        className="w-full h-full object-cover opacity-80"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-slate-800 flex items-center justify-center">
                      <Image className="w-6 h-6 text-slate-600" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium text-white truncate">{post.title}</p>
                    {post.type && (
                      <p className="text-xs text-slate-500 capitalize mt-0.5">{post.type}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist */}
        {account.checklist.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-medium text-slate-400 mb-3">What I Need From You</h2>
            <div className="space-y-2">
              {account.checklist.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center mt-0.5 ${
                      item.completed
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-slate-600"
                    }`}
                  >
                    {item.completed && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span
                    className={`text-sm ${
                      item.completed ? "text-slate-500 line-through" : "text-slate-300"
                    }`}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {posts.needsReview.length === 0 &&
          posts.approved.length === 0 &&
          posts.published.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No content yet</p>
              <p className="text-sm text-slate-500">
                We&apos;re working on your content. Check back soon!
              </p>
            </div>
          )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 py-4 mt-8">
        <p className="text-center text-xs text-slate-500">
          Questions? Reply to the email that sent you this link.
        </p>
      </footer>
    </div>
  );
}
