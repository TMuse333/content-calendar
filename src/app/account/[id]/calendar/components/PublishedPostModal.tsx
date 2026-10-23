"use client";

import { useState } from "react";
import {
  X,
  Video,
  Image,
  LayoutGrid,
  ExternalLink,
  Heart,
  MessageCircle,
  Bookmark,
  Eye,
  Share2,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import type { Post } from "@/lib/types/post";

interface PublishedPostModalProps {
  post: Post;
  accountId: string;
  onClose: () => void;
  onPostUpdate?: (post: Post) => void;
}

export function PublishedPostModal({
  post,
  accountId,
  onClose,
  onPostUpdate,
}: PublishedPostModalProps) {
  const [activeTab, setActiveTab] = useState<"post" | "analytics">("post");
  const [editing, setEditing] = useState(false);
  const [niche, setNiche] = useState(post.niche || "");
  const [topic, setTopic] = useState(post.topic || "");
  const [notes, setNotes] = useState(post.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSaveNotes = async () => {
    if (!onPostUpdate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/posts/${post._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, topic, notes }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        onPostUpdate(data.data);
        setEditing(false);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const MediaIcon = post.mediaType === "VIDEO" ? Video
    : post.mediaType === "CAROUSEL_ALBUM" ? LayoutGrid
    : Image;

  const mediaLabel = post.mediaType === "VIDEO" ? "Reel"
    : post.mediaType === "CAROUSEL_ALBUM" ? "Carousel"
    : "Image";

  const mediaColor = post.mediaType === "VIDEO" ? "purple"
    : post.mediaType === "CAROUSEL_ALBUM" ? "blue"
    : "amber";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                Published
              </span>
              <span className="text-sm text-slate-500">
                {new Date(post.postedAt).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`flex items-center gap-1 text-xs text-${mediaColor}-400 bg-${mediaColor}-500/10 px-2 py-0.5 rounded`}>
                <MediaIcon className="w-3 h-3" /> {mediaLabel}
              </span>
              {post.niche && (
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {post.niche}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 flex-shrink-0">
          <button
            onClick={() => setActiveTab("post")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "post"
                ? "text-white border-b-2 border-emerald-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Post Info
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "analytics"
                ? "text-white border-b-2 border-emerald-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Analytics
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "post" ? (
            <div className="space-y-6">
              {/* Media and Caption */}
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  {post.thumbnailUrl ? (
                    <img
                      src={post.thumbnailUrl}
                      alt=""
                      className="w-40 h-40 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-40 h-40 rounded-lg bg-slate-800 flex items-center justify-center">
                      <MediaIcon className="w-10 h-10 text-slate-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Caption</h3>
                  <p className="text-white text-sm whitespace-pre-wrap leading-relaxed line-clamp-6">
                    {post.caption || "No caption"}
                  </p>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span>{post.metrics?.likes?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                  <span>{post.metrics?.comments?.toLocaleString() || 0}</span>
                </div>
                {post.metrics?.saves && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Bookmark className="w-4 h-4 text-amber-500" />
                    <span>{post.metrics.saves.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>{post.metrics?.reach?.toLocaleString() || 0} reach</span>
                </div>
              </div>

              {/* Strategy Notes */}
              <div className="border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-400">Strategy Notes</h3>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      {post.notes ? "Edit" : "Add notes"}
                    </button>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Niche</label>
                        <input
                          type="text"
                          value={niche}
                          onChange={(e) => setNiche(e.target.value)}
                          placeholder="e.g., first-time buyers"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Topic</label>
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder="e.g., market timing"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="What was your intent? What worked?"
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditing(false)}
                        className="px-3 py-1.5 text-sm text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        disabled={saving}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {post.niche || post.topic ? (
                      <div className="flex items-center gap-2">
                        {post.niche && (
                          <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded text-xs">
                            {post.niche}
                          </span>
                        )}
                        {post.topic && (
                          <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs">
                            {post.topic}
                          </span>
                        )}
                      </div>
                    ) : null}
                    {post.notes ? (
                      <p className="text-sm text-slate-300">{post.notes}</p>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No strategy notes yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Analytics Tab */
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MetricCard
                  icon={<Eye className="w-5 h-5 text-cyan-400" />}
                  value={post.metrics?.reach || 0}
                  label="Reach"
                />
                <MetricCard
                  icon={<Heart className="w-5 h-5 text-pink-500" />}
                  value={post.metrics?.likes || 0}
                  label="Likes"
                />
                <MetricCard
                  icon={<MessageCircle className="w-5 h-5 text-blue-400" />}
                  value={post.metrics?.comments || 0}
                  label="Comments"
                />
                <MetricCard
                  icon={<Bookmark className="w-5 h-5 text-amber-500" />}
                  value={post.metrics?.saves || 0}
                  label="Saves"
                />
              </div>

              {(post.metrics?.shares || post.metrics?.impressions || post.metrics?.videoViews) && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                  {post.metrics.shares !== undefined && (
                    <MetricCard
                      icon={<Share2 className="w-5 h-5 text-emerald-400" />}
                      value={post.metrics.shares}
                      label="Shares"
                    />
                  )}
                  {post.metrics.impressions !== undefined && (
                    <MetricCard
                      icon={<Eye className="w-5 h-5 text-slate-400" />}
                      value={post.metrics.impressions}
                      label="Impressions"
                    />
                  )}
                  {post.metrics.videoViews !== undefined && (
                    <MetricCard
                      icon={<Video className="w-5 h-5 text-purple-400" />}
                      value={post.metrics.videoViews}
                      label="Video Views"
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
          {post.permalink && (
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View on Instagram
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  value,
  label
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
      <div className="flex items-center justify-center mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white">
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
