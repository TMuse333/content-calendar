"use client";

import { X, Users, MessageSquare, LayoutGrid, ExternalLink } from "lucide-react";
import type { ScheduledPost, ScheduledPostStatus } from "@/lib/types/scheduled-post";
import { getStatusDisplay } from "@/lib/types/scheduled-post";

interface ScheduledPostModalProps {
  post: ScheduledPost;
  onClose: () => void;
  onUpdateStatus: (postId: string, status: ScheduledPostStatus) => void;
}

export function ScheduledPostModal({
  post,
  onClose,
  onUpdateStatus,
}: ScheduledPostModalProps) {
  const statusInfo = getStatusDisplay(post.status);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}
              >
                {statusInfo.label}
              </span>
              <span className="text-sm text-slate-500">
                {new Date(post.scheduledFor).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white mt-2">
              {post.intent.topic || `${post.intent.audience} content`}
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
        <div className="p-6 space-y-4">
          {/* Intent */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-slate-400">Audience</span>
            </div>
            <p className="text-white capitalize">{post.intent.audience}</p>
          </div>

          {post.intent.viewerQuestion && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-slate-400">
                  Viewer Question
                </span>
              </div>
              <p className="text-white">{post.intent.viewerQuestion}</p>
            </div>
          )}

          {post.intent.suggestedFormat && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <LayoutGrid className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-slate-400">
                  Suggested Format
                </span>
              </div>
              <p className="text-white">{post.intent.suggestedFormat}</p>
            </div>
          )}

          {/* Content (if entered) */}
          {post.content && (
            <div className="pt-4 border-t border-slate-800">
              {post.content.headline && (
                <div className="mb-3">
                  <span className="text-sm text-slate-400">Headline</span>
                  <p className="text-white font-medium">{post.content.headline}</p>
                </div>
              )}
              {post.content.body && (
                <div>
                  <span className="text-sm text-slate-400">Body</span>
                  <p className="text-white text-sm">{post.content.body}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {post.status === "scheduled" && (
              <button
                onClick={() => onUpdateStatus(post.id, "posted")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Mark as Posted
              </button>
            )}

            {post.status === "posted" && post.instagramPermalink && (
              <a
                href={post.instagramPermalink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on Instagram
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
