"use client";

import { useState } from "react";
import { Clock, CheckCircle, XCircle, MoreHorizontal, Play, Image } from "lucide-react";
import Link from "next/link";

// Queue page - Pending, posted, and failed posts

type Status = "scheduled" | "posted" | "failed";

// Mock data
const mockPosts = [
  {
    id: "1",
    caption: "The compound effect of 4 hours of deep work daily...",
    mediaType: "VIDEO",
    scheduledFor: "2026-09-16T09:00:00Z",
    status: "scheduled" as Status,
    platform: "instagram",
  },
  {
    id: "2",
    caption: "Systems beat motivation every time...",
    mediaType: "IMAGE",
    scheduledFor: "2026-09-18T12:00:00Z",
    status: "scheduled" as Status,
    platform: "instagram",
  },
  {
    id: "3",
    caption: "Why I switched from websites to video...",
    mediaType: "VIDEO",
    postedAt: "2026-09-10T10:00:00Z",
    status: "posted" as Status,
    platform: "instagram",
    platformPostId: "123456",
  },
  {
    id: "4",
    caption: "Information theory basics explained...",
    mediaType: "VIDEO",
    scheduledFor: "2026-09-08T09:00:00Z",
    status: "failed" as Status,
    platform: "instagram",
    lastError: "Video processing failed: file too large",
  },
];

export default function QueuePage() {
  const [filter, setFilter] = useState<Status | "all">("all");

  const filteredPosts = mockPosts.filter(
    (post) => filter === "all" || post.status === filter
  );

  const counts = {
    scheduled: mockPosts.filter((p) => p.status === "scheduled").length,
    posted: mockPosts.filter((p) => p.status === "posted").length,
    failed: mockPosts.filter((p) => p.status === "failed").length,
  };

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case "scheduled":
        return <Clock className="w-4 h-4 text-blue-400" />;
      case "posted":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case "scheduled":
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
            Scheduled
          </span>
        );
      case "posted":
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full">
            Posted
          </span>
        );
      case "failed":
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
            Failed
          </span>
        );
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Queue</h1>
          <p className="text-zinc-400">Manage your scheduled and posted content</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            filter === "all"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          }`}
        >
          All ({mockPosts.length})
        </button>
        <button
          onClick={() => setFilter("scheduled")}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
            filter === "scheduled"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          }`}
        >
          <Clock className="w-4 h-4" />
          Scheduled ({counts.scheduled})
        </button>
        <button
          onClick={() => setFilter("posted")}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
            filter === "posted"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Posted ({counts.posted})
        </button>
        <button
          onClick={() => setFilter("failed")}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
            filter === "failed"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          }`}
        >
          <XCircle className="w-4 h-4" />
          Failed ({counts.failed})
        </button>
      </div>

      {/* Posts List */}
      <div className="space-y-3">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* Thumbnail */}
              <div className="w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                {post.mediaType === "VIDEO" ? (
                  <Play className="w-6 h-6 text-zinc-500" />
                ) : (
                  <Image className="w-6 h-6 text-zinc-500" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(post.status)}
                  {getStatusBadge(post.status)}
                  <span className="text-xs text-zinc-500 capitalize">
                    {post.platform}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 line-clamp-2 mb-2">
                  {post.caption}
                </p>
                <div className="text-xs text-zinc-500">
                  {post.status === "scheduled" && post.scheduledFor && (
                    <>
                      Scheduled for{" "}
                      {new Date(post.scheduledFor).toLocaleString()}
                    </>
                  )}
                  {post.status === "posted" && post.postedAt && (
                    <>Posted on {new Date(post.postedAt).toLocaleString()}</>
                  )}
                  {post.status === "failed" && post.lastError && (
                    <span className="text-red-400">{post.lastError}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {post.status === "failed" && (
                  <button className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
                    Retry
                  </button>
                )}
                {post.status === "scheduled" && (
                  <Link
                    href={`/post/${post.id}`}
                    className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                  >
                    Edit
                  </Link>
                )}
                <button className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                  <MoreHorizontal className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredPosts.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No posts found
          </div>
        )}
      </div>
    </div>
  );
}
