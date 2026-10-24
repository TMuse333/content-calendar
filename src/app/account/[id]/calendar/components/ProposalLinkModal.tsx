"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Link2, Check, Copy, Calendar, Loader2, AlertCircle, MessageCircleQuestion } from "lucide-react";
import { QUESTION_SETS, type QuestionSetId } from "@/lib/questions/sets";

/**
 * Creates a client share link (/s/<code>) bundling upcoming planned posts
 * from Notion and, optionally, a question set the client answers on the
 * same page. Share links store NOTION page IDs — never Instagram or Mongo
 * IDs — because /api/share/[code] resolves posts via getPostById(notion).
 */

interface CandidatePost {
  id: string;        // Notion page ID
  title: string;
  status: string;
  type?: string;
  postDate?: string; // ISO date
  caption?: string;
  previewUrl?: string;
}

interface ProposalLinkModalProps {
  accountId: string;
  onClose: () => void;
}

const MAX_POSTS = 20;

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function ProposalLinkModal({ accountId, onClose }: ProposalLinkModalProps) {
  // Default range: today → two weeks out (the window we propose to clients)
  const [startDate, setStartDate] = useState(() => isoDate(new Date()));
  const [endDate, setEndDate] = useState(() => isoDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)));
  const [candidates, setCandidates] = useState<CandidatePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [questionSet, setQuestionSet] = useState<QuestionSetId | null>(null);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/accounts/${accountId}/share-links/candidates`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(data.posts)) {
          setCandidates(data.posts);
        } else {
          setLoadError(data.error || "Failed to load planned posts");
        }
      } catch {
        if (!cancelled) setLoadError("Failed to load planned posts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [accountId]);

  // Planned posts whose Notion "Post date" falls inside the range
  const filteredPosts = useMemo(() => {
    if (!startDate || !endDate) return [];
    return candidates.filter((post) => {
      if (!post.postDate) return false;
      const day = post.postDate.split("T")[0];
      return day >= startDate && day <= endDate;
    });
  }, [candidates, startDate, endDate]);

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
    setSelectedPostIds(new Set(filteredPosts.slice(0, MAX_POSTS).map((p) => p.id)));
  };

  const clearAll = () => setSelectedPostIds(new Set());

  const handleCreate = async () => {
    if (selectedPostIds.size === 0 && !questionSet) {
      setError("Pick at least one post or a question set");
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
          questionSet,
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
    } catch {
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
    return new Date(dateStr.split("T")[0] + "T12:00:00").toLocaleDateString("en-US", {
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
              <p className="text-sm text-slate-500">Bundle upcoming posts & questions for client approval</p>
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
              <a
                href={`${generatedUrl}${generatedUrl.includes("?") ? "&" : "?"}preview=1`}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-4 text-sm text-emerald-400 hover:text-emerald-300"
              >
                Preview as client →
              </a>
            </div>
          ) : (
            /* Creation Form */
            <div className="space-y-6">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Date Range <span className="text-slate-500">(planned post dates)</span>
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
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-400">
                    Planned Posts ({selectedPostIds.size} selected, max {MAX_POSTS})
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

                {loading ? (
                  <div className="bg-slate-800/50 rounded-lg p-6 flex items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading planned posts from Notion...
                  </div>
                ) : loadError ? (
                  <div className="bg-slate-800/50 rounded-lg p-6 text-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-slate-400">{loadError}</p>
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="bg-slate-800/50 rounded-lg p-6 text-center">
                    <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400">No planned posts in this date range</p>
                    <p className="text-xs text-slate-500 mt-1">Posts need a &quot;Post date&quot; in Notion to show here</p>
                  </div>
                ) : (
                  <div className="bg-slate-800/50 rounded-lg max-h-64 overflow-y-auto">
                    {filteredPosts.map((post) => {
                      const isSelected = selectedPostIds.has(post.id);
                      return (
                        <button
                          key={post.id}
                          onClick={() => togglePost(post.id)}
                          className={`w-full flex items-center gap-3 p-3 border-b border-slate-700/50 last:border-0 transition-colors ${
                            isSelected ? "bg-emerald-500/10" : "hover:bg-slate-700/50"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "bg-emerald-500 text-white" : "border border-slate-600"
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          {post.previewUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.previewUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm text-white truncate">{post.title || "Untitled post"}</p>
                            <p className="text-xs text-slate-500">
                              {post.postDate ? formatDate(post.postDate) : "No date"} · {post.status}
                              {post.type ? ` · ${post.type}` : ""}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Question Set */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircleQuestion className="w-4 h-4" />
                    Questions for the client <span className="text-slate-500">(optional)</span>
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setQuestionSet(null)}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                      questionSet === null
                        ? "bg-emerald-500/10 border-emerald-500 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    None
                  </button>
                  {(Object.keys(QUESTION_SETS) as QuestionSetId[]).map((setId) => (
                    <button
                      key={setId}
                      onClick={() => setQuestionSet(setId)}
                      className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                        questionSet === setId
                          ? "bg-emerald-500/10 border-emerald-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                      }`}
                    >
                      {QUESTION_SETS[setId].label}
                    </button>
                  ))}
                </div>
                {questionSet && (
                  <p className="text-xs text-slate-500 mt-2">
                    {QUESTION_SETS[questionSet].questions.length} questions — the client answers them on the same page.
                  </p>
                )}
              </div>

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
              disabled={creating || (selectedPostIds.size === 0 && !questionSet)}
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
