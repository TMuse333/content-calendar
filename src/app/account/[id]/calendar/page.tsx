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
  Download,
  Heart,
  MessageCircle,
  Sparkles,
  Target,
  Lightbulb,
  BookOpen,
  Bookmark,
  TrendingUp,
  Eye,
  Share2,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/contexts/AccountContext";
import type { Post, CreativeIntent, CraftNotes, StrategyHypothesis, StrategyLearning } from "@/lib/types/post";
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
  const router = useRouter();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [posts, setPosts] = useState<Post[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [selectedPublishedPost, setSelectedPublishedPost] = useState<Post | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<{ day: number } | null>(null);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  // Sync posts from Instagram
  const handleSync = async () => {
    if (!currentAccount) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/posts/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        await fetchPosts();
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

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
          <button
            onClick={handleSync}
            disabled={syncing || !currentAccount}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <Download className={`w-4 h-4 ${syncing ? "animate-pulse" : ""}`} />
            {syncing ? "Syncing..." : "Sync"}
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
                          onClick={() => setSelectedPublishedPost(post)}
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

      {/* Published Post Detail Modal */}
      {selectedPublishedPost && (
        <PublishedPostModal
          post={selectedPublishedPost}
          accountId={currentAccount?.id || ""}
          onClose={() => setSelectedPublishedPost(null)}
          onPostUpdate={(updatedPost) => {
            setSelectedPublishedPost(updatedPost);
            // Update in the posts array too
            setPosts(posts.map(p =>
              p.instagramId === updatedPost.instagramId ? updatedPost : p
            ));
          }}
        />
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

// Published Post Modal with Strategy Tab
function PublishedPostModal({
  post,
  accountId,
  onClose,
  onPostUpdate,
}: {
  post: Post;
  accountId: string;
  onClose: () => void;
  onPostUpdate: (post: Post) => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"post" | "strategy" | "analytics">("post");
  const [rawNotes, setRawNotes] = useState(post.strategy?.rawNotes || "");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [updatingHypothesis, setUpdatingHypothesis] = useState<string | null>(null);

  const hasStrategy = Boolean(post.strategy?.intent || post.strategy?.craft);

  const updateHypothesisStatus = async (hypothesisId: string, status: "confirmed" | "refuted" | "unclear" | "pending") => {
    if (!post.strategy?.hypotheses) return;

    setUpdatingHypothesis(hypothesisId);

    // Update locally first for immediate feedback
    const updatedHypotheses = post.strategy.hypotheses.map(h =>
      h.id === hypothesisId ? { ...h, status } : h
    );

    try {
      const res = await fetch(
        `/api/accounts/${accountId}/posts/${post._id}/parse-strategy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawNotes: post.strategy.rawNotes || "",
            updateHypotheses: updatedHypotheses,
          }),
        }
      );

      const data = await res.json();
      if (data.success && data.post) {
        onPostUpdate(data.post);
      }
    } catch (err) {
      console.error("Failed to update hypothesis:", err);
    } finally {
      setUpdatingHypothesis(null);
    }
  };

  const handleParseStrategy = async () => {
    if (!rawNotes.trim()) return;

    setParsing(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/accounts/${accountId}/posts/${post._id}/parse-strategy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawNotes }),
        }
      );

      const data = await res.json();

      if (data.success && data.post) {
        onPostUpdate(data.post);
      } else {
        setError(data.error || "Failed to parse strategy");
      }
    } catch (err) {
      setError("Failed to parse strategy");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
              {post.mediaType === "VIDEO" && (
                <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                  <Video className="w-3 h-3" /> Reel
                </span>
              )}
              {post.mediaType === "CAROUSEL_ALBUM" && (
                <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                  <LayoutGrid className="w-3 h-3" /> Carousel
                </span>
              )}
              {post.mediaType === "IMAGE" && (
                <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                  <Image className="w-3 h-3" /> Image
                </span>
              )}
              {post.format && (
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded capitalize">
                  {post.format.replace("-", " ")}
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
            onClick={() => setActiveTab("strategy")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "strategy"
                ? "text-white border-b-2 border-emerald-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Strategy
            {hasStrategy && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
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
            <div className="flex gap-6">
              {/* Media */}
              <div className="flex-shrink-0">
                {post.thumbnailUrl ? (
                  <img
                    src={post.thumbnailUrl}
                    alt=""
                    className="w-48 h-48 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-48 h-48 rounded-lg bg-slate-800 flex items-center justify-center">
                    {post.mediaType === "VIDEO" ? (
                      <Video className="w-12 h-12 text-slate-600" />
                    ) : post.mediaType === "CAROUSEL_ALBUM" ? (
                      <LayoutGrid className="w-12 h-12 text-slate-600" />
                    ) : (
                      <Image className="w-12 h-12 text-slate-600" />
                    )}
                  </div>
                )}

                {/* Engagement */}
                <div className="flex items-center gap-4 mt-3 text-sm">
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
                </div>
              </div>

              {/* Caption */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-400 mb-2">Caption</h3>
                <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">
                  {post.caption || "No caption"}
                </p>
              </div>
            </div>
          ) : activeTab === "strategy" ? (
            <div className="space-y-6 relative">
              {/* Parsing Overlay */}
              {parsing && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                  <div className="flex items-center gap-3 text-purple-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-lg font-medium">Analyzing with AI...</span>
                  </div>
                </div>
              )}

              {/* Raw Notes Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-400">
                    Your Notes
                  </label>
                  {post.strategy?.parsedAt && (
                    <span className="text-xs text-slate-500">
                      Parsed {new Date(post.strategy.parsedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {!hasStrategy ? (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">No strategy notes yet</p>
                        <p className="text-sm text-slate-400 mt-1">
                          What was your intent with this post? Paste your notes or describe what you were going for...
                        </p>
                      </div>
                    </div>
                    <textarea
                      value={rawNotes}
                      onChange={(e) => setRawNotes(e.target.value)}
                      placeholder="e.g., Lake poem about unseen growth. Want viewers to feel hope about their own progress. Using plants as metaphor. Open ending so they imagine their own future..."
                      rows={6}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                    {error && (
                      <p className="text-red-400 text-sm mt-2">{error}</p>
                    )}
                    <button
                      onClick={handleParseStrategy}
                      disabled={parsing || !rawNotes.trim()}
                      className="mt-3 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {parsing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {parsing ? "Parsing..." : "Parse with AI"}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Summary */}
                    {post.strategy?.intent && (
                      <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-xl p-4 mb-4">
                        <p className="text-white">
                          <span className="text-purple-400 font-medium">Goal:</span>{" "}
                          {post.strategy.intent.desiredEffect}
                        </p>
                        {post.strategy.intent.emotionalTargets && post.strategy.intent.emotionalTargets.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-slate-400 text-sm">Evoking:</span>
                            {post.strategy.intent.emotionalTargets.slice(0, 4).map((e, i) => (
                              <span key={i} className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded text-xs">
                                {e}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Raw notes with edit/re-parse */}
                    <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 mb-4">
                      {!editingNotes ? (
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm text-slate-400 flex-1">
                            {post.strategy?.rawNotes || rawNotes || "No notes"}
                          </p>
                          <button
                            onClick={() => {
                              setEditingNotes(true);
                              setRawNotes(post.strategy?.rawNotes || "");
                            }}
                            className="text-xs text-purple-400 hover:text-purple-300 flex-shrink-0"
                          >
                            Edit & Re-parse
                          </button>
                        </div>
                      ) : (
                        <div>
                          <textarea
                            value={rawNotes}
                            onChange={(e) => setRawNotes(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none mb-2"
                            placeholder="Your notes about this post's intent..."
                          />
                          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingNotes(false)}
                              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                await handleParseStrategy();
                                setEditingNotes(false);
                              }}
                              disabled={parsing || !rawNotes.trim()}
                              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                            >
                              {parsing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              {parsing ? "Parsing..." : "Re-parse"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Structured Strategy Display */}
                    <div className="space-y-4">
                      {/* Intent */}
                      {post.strategy?.intent && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Target className="w-4 h-4 text-cyan-400" />
                            <h4 className="text-sm font-medium text-white">Intent</h4>
                          </div>
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="text-slate-500">Audience:</span>
                              <span className="text-white ml-2">{post.strategy.intent.targetAudience}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Effect:</span>
                              <span className="text-white ml-2">{post.strategy.intent.desiredEffect}</span>
                            </div>
                            {post.strategy.intent.emotionalTargets && post.strategy.intent.emotionalTargets.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                <span className="text-slate-500">Emotions:</span>
                                {post.strategy.intent.emotionalTargets.map((e, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded text-xs">
                                    {e}
                                  </span>
                                ))}
                              </div>
                            )}
                            {post.strategy.intent.psychologicalLevers && post.strategy.intent.psychologicalLevers.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                <span className="text-slate-500">Levers:</span>
                                {post.strategy.intent.psychologicalLevers.map((l, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                                    {l}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Craft */}
                      {post.strategy?.craft && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Lightbulb className="w-4 h-4 text-amber-400" />
                            <h4 className="text-sm font-medium text-white">Craft</h4>
                          </div>
                          <div className="space-y-3 text-sm">
                            {post.strategy.craft.techniques && post.strategy.craft.techniques.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                <span className="text-slate-500">Techniques:</span>
                                {post.strategy.craft.techniques.map((t, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                            {post.strategy.craft.structure && (
                              <div>
                                <span className="text-slate-500">Structure:</span>
                                <span className="text-white ml-2">{post.strategy.craft.structure}</span>
                              </div>
                            )}
                            {post.strategy.craft.keyDecisions && (
                              <div>
                                <span className="text-slate-500">Key Decisions:</span>
                                <p className="text-white mt-1">{post.strategy.craft.keyDecisions}</p>
                              </div>
                            )}
                            {post.strategy.craft.mediaStrategy && (
                              <div>
                                <span className="text-slate-500">Media:</span>
                                <span className="text-white ml-2">{post.strategy.craft.mediaStrategy}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Hypotheses */}
                      {post.strategy?.hypotheses && post.strategy.hypotheses.length > 0 && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Target className="w-4 h-4 text-blue-400" />
                            <h4 className="text-sm font-medium text-white">Hypotheses</h4>
                          </div>
                          <div className="space-y-3">
                            {post.strategy.hypotheses.map((h, i) => (
                              <div key={h.id || i} className="flex items-start gap-3 text-sm">
                                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                  h.status === "confirmed" ? "bg-emerald-500" :
                                  h.status === "refuted" ? "bg-red-500" :
                                  h.status === "unclear" ? "bg-amber-500" :
                                  "bg-slate-500"
                                }`} />
                                <div>
                                  <p className="text-white">{h.prediction}</p>
                                  {h.rationale && (
                                    <p className="text-slate-400 text-xs mt-1">{h.rationale}</p>
                                  )}
                                  {h.metric && (
                                    <p className="text-slate-500 text-xs mt-1">Metric: {h.metric}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Learnings */}
                      {post.strategy?.learnings && post.strategy.learnings.length > 0 && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="w-4 h-4 text-emerald-400" />
                            <h4 className="text-sm font-medium text-white">Learnings</h4>
                          </div>
                          <div className="space-y-3">
                            {post.strategy.learnings.map((l, i) => (
                              <div key={l.id || i} className="text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs capitalize">
                                    {l.category}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    l.confidence === "established" ? "bg-emerald-500/20 text-emerald-400" :
                                    l.confidence === "supported" ? "bg-blue-500/20 text-blue-400" :
                                    "bg-slate-600 text-slate-400"
                                  }`}>
                                    {l.confidence}
                                  </span>
                                </div>
                                <p className="text-white">{l.insight}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : activeTab === "analytics" ? (
            /* Analytics Tab */
            <div className="space-y-6">
              {/* Engagement Metrics */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <h4 className="text-sm font-medium text-white mb-4">Engagement</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Heart className="w-4 h-4 text-pink-500" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {post.metrics?.likes?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-slate-500">Likes</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <MessageCircle className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {post.metrics?.comments?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-slate-500">Comments</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Bookmark className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {post.metrics?.saves?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-slate-500">Saves</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Eye className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {post.metrics?.reach?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-slate-500">Reach</div>
                  </div>
                </div>
              </div>

              {/* Hypothesis Validation */}
              {post.strategy?.hypotheses && post.strategy.hypotheses.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-white mb-4">Hypothesis Tracking</h4>
                  <div className="space-y-3">
                    {post.strategy.hypotheses.map((h, i) => (
                      <div key={h.id || i} className="bg-slate-900/50 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm text-white">{h.prediction}</p>
                            {h.metric && (
                              <p className="text-xs text-slate-500 mt-1">
                                Metric: {h.metric}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {updatingHypothesis === h.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                            ) : (
                              <>
                                <button
                                  onClick={() => updateHypothesisStatus(h.id, h.status === "confirmed" ? "pending" : "confirmed")}
                                  className={`p-1.5 rounded transition-colors ${
                                    h.status === "confirmed"
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : "hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-400"
                                  }`}
                                  title="Confirmed"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => updateHypothesisStatus(h.id, h.status === "refuted" ? "pending" : "refuted")}
                                  className={`p-1.5 rounded transition-colors ${
                                    h.status === "refuted"
                                      ? "bg-red-500/20 text-red-400"
                                      : "hover:bg-red-500/10 text-slate-500 hover:text-red-400"
                                  }`}
                                  title="Refuted"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => updateHypothesisStatus(h.id, h.status === "unclear" ? "pending" : "unclear")}
                                  className={`p-1.5 rounded transition-colors ${
                                    h.status === "unclear"
                                      ? "bg-amber-500/20 text-amber-400"
                                      : "hover:bg-amber-500/10 text-slate-500 hover:text-amber-400"
                                  }`}
                                  title="Unclear"
                                >
                                  <HelpCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link to Strategy */}
              {!hasStrategy && (
                <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-6 text-center">
                  <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400">Add strategy notes to track hypotheses</p>
                  <button
                    onClick={() => setActiveTab("strategy")}
                    className="mt-3 text-sm text-purple-400 hover:text-purple-300"
                  >
                    Go to Strategy tab →
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                router.push(`/account/${accountId}/library/${post._id}`);
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              View in Library
            </button>
            {post.permalink && (
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Instagram
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
