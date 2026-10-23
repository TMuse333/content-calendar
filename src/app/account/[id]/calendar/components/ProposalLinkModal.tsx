"use client";

import { useState, useMemo } from "react";
import { X, Link2, Check, Copy, Calendar, Loader2, AlertCircle } from "lucide-react";
import type { Post } from "@/lib/types/post";

interface ProposalLinkModalProps {
  posts: Post[];
  accountId: string;
  onClose: () => void;
}

const MAX_POSTS = 20;

export function ProposalLinkModal({ posts, accountId, onClose }: ProposalLinkModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter posts by date range
  const filteredPosts = useMemo(() => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return posts.filter((post) => {
      const postDate = new Date(post.postedAt);
      return postDate >= start && postDate <= end;
    }).sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }, [posts, startDate, endDate]);

  const togglePost = (postId: string) => {
    const newSet = new Set(selectedPostIds);
    if (newSet.has(postId)) {
      newSet.delete(postId);
    } else if (newSet.size < MAX_POSTS) {
      newSet.add(postId);
    }
    setSelectedPostIds(newSet);
  };

  const selectAll = () => {
    const ids = filteredPosts.slice(0, MAX_POSTS).map(p => p.instagramId || p._id?.toString() || "");
    setSelectedPostIds(new Set(ids));
  };

  const clearAll = () => setSelectedPostIds(new Set());

  const handleCreate = async () => {
    if (selectedPostIds.size === 0) {
      setError("Select at least one post");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch(`/api/accounts/${accountId}/share-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postIds: Array.from(selectedPostIds),
          message: message || undefined,
          expiresInDays: 30,
        }),
      });
      const data = await res.json();
      if (data.url) {
        setGeneratedUrl(data.url);
      } else {
        setError(data.error || "Failed to create link");
      }
    } catch (err) {
      setError("Failed to create link");
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Create Proposal Link</h2>
              <p className="text-sm text-slate-500">Bundle posts for client review</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {generatedUrl ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Link Created!</h3>
              <p className="text-slate-400 mb-6">Share this link with your client</p>
              <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-3 max-w-md mx-auto">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="flex-1 bg-transparent text-white text-sm outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <div className="space-y-6">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Date Range
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <span className="text-slate-500">to</span>
                  <div className="flex-1">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Posts Selection */}
              {startDate && endDate && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-400">
                      Select Posts ({selectedPostIds.size}/{Math.min(filteredPosts.length, MAX_POSTS)} max {MAX_POSTS})
                    </label>
                    <div className="flex items-center gap-2">
                      <button onClick={selectAll} className="text-xs text-emerald-400 hover:text-emerald-300">
                        Select all
                      </button>
                      <span className="text-slate-600">|</span>
                      <button onClick={clearAll} className="text-xs text-slate-400 hover:text-white">
                        Clear
                      </button>
                    </div>
                  </div>

                  {filteredPosts.length === 0 ? (
                    <div className="bg-slate-800/50 rounded-lg p-6 text-center">
                      <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400">No posts in this date range</p>
                    </div>
                  ) : (
                    <div className="bg-slate-800/50 rounded-lg max-h-64 overflow-y-auto">
                      {filteredPosts.map((post) => {
                        const postId = post.instagramId || post._id?.toString() || "";
                        const isSelected = selectedPostIds.has(postId);
                        return (
                          <button
                            key={postId}
                            onClick={() => togglePost(postId)}
                            className={`w-full flex items-center gap-3 p-3 border-b border-slate-700/50 last:border-0 transition-colors ${
                              isSelected ? "bg-emerald-500/10" : "hover:bg-slate-700/50"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                              isSelected ? "bg-emerald-500 text-white" : "border border-slate-600"
                            }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            {post.thumbnailUrl && (
                              <img src={post.thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm text-white truncate">
                                {post.caption?.slice(0, 40) || "Post"}
                                {post.caption && post.caption.length > 40 ? "..." : ""}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDate(post.postedAt.toString())} · {post.metrics?.reach?.toLocaleString() || 0} reach
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Message <span className="text-slate-500">(optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a note for your client..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!generatedUrl && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-2 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || selectedPostIds.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
