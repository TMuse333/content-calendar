"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Video,
  Image,
  LayoutGrid,
  Filter,
  Check,
  X,
  Users,
  MessageSquare,
  Plus,
  ExternalLink,
  Calendar,
  Loader2,
  Send,
  AlertCircle,
} from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";
import type { Post } from "@/lib/types/post";
import type { ScheduledPost, ScheduledPostStatus } from "@/lib/types/scheduled-post";
import { getStatusDisplay } from "@/lib/types/scheduled-post";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type CalendarFilter = "all" | "posts" | "scheduled";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function CalendarPage() {
  const { currentAccount } = useAccount();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [posts, setPosts] = useState<Post[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<{ day: number } | null>(null);
  const [creating, setCreating] = useState(false);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Fetch posts for the current month
  const fetchPosts = useCallback(async () => {
    if (!currentAccount) return;
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/posts`);
      const data = await res.json();
      if (data.data) {
        setPosts(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    }
  }, [currentAccount]);

  // Fetch scheduled posts for the current month
  const fetchScheduledPosts = useCallback(async () => {
    if (!currentAccount) return;
    try {
      const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
      const res = await fetch(
        `/api/calendar/${currentAccount.id}/posts?month=${monthStr}`
      );
      const data = await res.json();
      if (data.data) {
        setScheduledPosts(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch scheduled posts:", error);
    }
  }, [currentAccount, currentMonth, currentYear]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPosts(), fetchScheduledPosts()]).finally(() => {
      setLoading(false);
    });
  }, [fetchPosts, fetchScheduledPosts]);

  // Get posts for a specific day
  const getPostsForDay = (day: number) => {
    if (filter === "scheduled") return [];
    return posts.filter((post) => {
      const postDate = new Date(post.postedAt);
      return (
        postDate.getDate() === day &&
        postDate.getMonth() === currentMonth &&
        postDate.getFullYear() === currentYear
      );
    });
  };

  // Get scheduled posts for a specific day
  const getScheduledPostsForDay = (day: number) => {
    if (filter === "posts") return [];
    return scheduledPosts.filter((post) => {
      const postDate = new Date(post.scheduledFor);
      return (
        postDate.getDate() === day &&
        postDate.getMonth() === currentMonth &&
        postDate.getFullYear() === currentYear
      );
    });
  };

  // Create a new scheduled post
  const handleCreatePost = async (day: number, intent: { audience: string; topic?: string }) => {
    if (!currentAccount) return;
    setCreating(true);
    try {
      const scheduledFor = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const res = await fetch(`/api/calendar/${currentAccount.id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledFor,
          intent: {
            audience: intent.audience,
            topic: intent.topic,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchScheduledPosts();
        setShowCreateModal(null);
      }
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setCreating(false);
    }
  };

  // Update post status
  const handleUpdatePostStatus = async (postId: string, status: ScheduledPostStatus) => {
    if (!currentAccount) return;
    try {
      const res = await fetch(`/api/calendar/${currentAccount.id}/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchScheduledPosts();
        setSelectedPost(data.data);
      }
    } catch (error) {
      console.error("Failed to update post:", error);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const filterOptions: { value: CalendarFilter; label: string }[] = [
    { value: "all", label: "All Content" },
    { value: "posts", label: "Published Posts" },
    { value: "scheduled", label: "Scheduled Posts" },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {MONTHS[currentMonth]} {currentYear}
            </h1>
            {currentAccount && (
              <p className="text-sm text-slate-500">{currentAccount.name}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter !== "all"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Filter className="w-4 h-4" />
              {filterOptions.find(o => o.value === filter)?.label}
            </button>

            {showFilterMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFilterMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilter(option.value);
                        setShowFilterMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                        filter === option.value
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {option.label}
                      {filter === option.value && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg">
            Month
          </button>
          <button className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            Week
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-800">
          {DAYS.map((day) => (
            <div
              key={day}
              className="px-4 py-3 text-sm font-medium text-slate-500 text-center"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayPosts = day !== null ? getPostsForDay(day) : [];
            const dayScheduledPosts = day !== null ? getScheduledPostsForDay(day) : [];

            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border-b border-r border-slate-800 group/cell ${
                  day === null ? "bg-slate-900/50" : "hover:bg-slate-800/50"
                } ${index % 7 === 6 ? "border-r-0" : ""}`}
              >
                {day !== null && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`text-sm font-medium ${
                          isToday(day)
                            ? "w-7 h-7 flex items-center justify-center bg-emerald-600 text-white rounded-full"
                            : "text-slate-400"
                        }`}
                      >
                        {day}
                      </div>
                      <button
                        onClick={() => setShowCreateModal({ day })}
                        className="opacity-0 group-hover/cell:opacity-100 p-1 hover:bg-slate-700 rounded transition-all"
                        title="Schedule post"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500 hover:text-emerald-400" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {/* Published Posts */}
                      {dayPosts.map((post) => (
                        <div
                          key={post.instagramId || post._id?.toString()}
                          className="flex items-center gap-1.5 p-1 rounded bg-slate-800/50 hover:bg-slate-700/50 transition-colors group cursor-pointer"
                        >
                          {post.thumbnailUrl ? (
                            <img
                              src={post.thumbnailUrl}
                              alt=""
                              className="w-6 h-6 rounded object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center">
                              {post.mediaType === "VIDEO" ? (
                                <Video className="w-3 h-3 text-slate-400" />
                              ) : post.mediaType === "CAROUSEL_ALBUM" ? (
                                <LayoutGrid className="w-3 h-3 text-slate-400" />
                              ) : (
                                <Image className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                          )}
                          <span className="text-xs text-slate-400 truncate flex-1 group-hover:text-slate-300">
                            {post.caption?.slice(0, 20) || "Post"}
                            {post.caption && post.caption.length > 20 ? "..." : ""}
                          </span>
                        </div>
                      ))}

                      {/* Scheduled Posts */}
                      {dayScheduledPosts.map((post) => {
                        const statusInfo = getStatusDisplay(post.status);
                        return (
                          <div
                            key={post.id}
                            onClick={() => setSelectedPost(post)}
                            className={`flex items-center gap-1.5 p-1 rounded transition-colors cursor-pointer ${statusInfo.bgColor} hover:opacity-80 border border-dashed border-current/30`}
                          >
                            <div className={`w-6 h-6 rounded flex items-center justify-center ${statusInfo.bgColor}`}>
                              <Calendar className={`w-3 h-3 ${statusInfo.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-xs truncate block ${statusInfo.color}`}>
                                {post.intent.topic?.slice(0, 18) || post.intent.audience}
                                {post.intent.topic && post.intent.topic.length > 18 ? "..." : ""}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate block">
                                {statusInfo.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scheduled Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusDisplay(selectedPost.status).bgColor} ${getStatusDisplay(selectedPost.status).color}`}
                  >
                    {getStatusDisplay(selectedPost.status).label}
                  </span>
                  <span className="text-sm text-slate-500">
                    {new Date(selectedPost.scheduledFor).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-white mt-2">
                  {selectedPost.intent.topic || `${selectedPost.intent.audience} content`}
                </h2>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
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
                <p className="text-white capitalize">{selectedPost.intent.audience}</p>
              </div>

              {selectedPost.intent.viewerQuestion && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-slate-400">Viewer Question</span>
                  </div>
                  <p className="text-white">{selectedPost.intent.viewerQuestion}</p>
                </div>
              )}

              {selectedPost.intent.suggestedFormat && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <LayoutGrid className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-slate-400">Suggested Format</span>
                  </div>
                  <p className="text-white">{selectedPost.intent.suggestedFormat}</p>
                </div>
              )}

              {/* Content (if entered) */}
              {selectedPost.content && (
                <div className="pt-4 border-t border-slate-800">
                  {selectedPost.content.headline && (
                    <div className="mb-3">
                      <span className="text-sm text-slate-400">Headline</span>
                      <p className="text-white font-medium">{selectedPost.content.headline}</p>
                    </div>
                  )}
                  {selectedPost.content.body && (
                    <div>
                      <span className="text-sm text-slate-400">Body</span>
                      <p className="text-white text-sm">{selectedPost.content.body}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedPost(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {/* Simple status progression */}
                {selectedPost.status === "scheduled" && (
                  <button
                    onClick={() => handleUpdatePostStatus(selectedPost.id, "posted")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Mark as Posted
                  </button>
                )}

                {selectedPost.status === "posted" && selectedPost.instagramPermalink && (
                  <a
                    href={selectedPost.instagramPermalink}
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
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal
          day={showCreateModal.day}
          month={currentMonth}
          year={currentYear}
          creating={creating}
          onClose={() => setShowCreateModal(null)}
          onCreate={handleCreatePost}
        />
      )}
    </div>
  );
}

// Simple create post modal component
function CreatePostModal({
  day,
  month,
  year,
  creating,
  onClose,
  onCreate,
}: {
  day: number;
  month: number;
  year: number;
  creating: boolean;
  onClose: () => void;
  onCreate: (day: number, intent: { audience: string; topic?: string }) => void;
}) {
  const [audience, setAudience] = useState<"buyers" | "sellers" | "both">("both");
  const [topic, setTopic] = useState("");

  const dateStr = new Date(year, month, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Schedule Post</h2>
          <p className="text-sm text-slate-500">{dateStr}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Audience */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Audience</label>
            <div className="flex gap-2">
              {(["buyers", "sellers", "both"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAudience(opt)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg capitalize transition-colors ${
                    audience === opt
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Topic <span className="text-slate-500">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Market update, Buying tips..."
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate(day, { audience, topic: topic || undefined })}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
