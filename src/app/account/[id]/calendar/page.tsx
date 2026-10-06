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
  Target,
  Users,
  Sparkles,
  ListOrdered,
  MousePointer,
  Palette,
  Megaphone,
  MessageSquare,
  Plus,
  ExternalLink,
  Calendar,
  Loader2,
  Send,
  Eye,
  AlertCircle,
  Library,
  Layers,
  Zap,
  RefreshCw,
} from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";
import { GraphicsLibraryModal } from "@/components/GraphicsLibraryModal";
import type { Post } from "@/lib/types/post";
import {
  ENTROPY_LEVELS,
  LEVEL_COLORS,
  suggestLevel,
  type EntropyLevel,
} from "@/lib/entropy";
import type { ScheduledCarousel } from "@/lib/types/graphic-package";
import type { ScheduledPost, ScheduledPostStatus } from "@/lib/types/scheduled-post";
import { getStatusDisplay } from "@/lib/types/scheduled-post";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type CalendarFilter = "all" | "posts" | "graphics";

type ScheduledCarouselWithPackage = ScheduledCarousel & { packageName?: string };

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
  const [scheduledCarousels, setScheduledCarousels] = useState<ScheduledCarouselWithPackage[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedCarousel, setSelectedCarousel] = useState<ScheduledCarouselWithPackage | null>(null);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<{ day: number } | null>(null);
  const [creating, setCreating] = useState(false);
  const [showGraphicsLibrary, setShowGraphicsLibrary] = useState(false);

  // Entropy editing state
  const [editingEntropy, setEditingEntropy] = useState(false);
  const [entropyLevel, setEntropyLevel] = useState<EntropyLevel | null>(null);
  const [uncertaintyAddressed, setUncertaintyAddressed] = useState("");
  const [isEvergreen, setIsEvergreen] = useState(false);
  const [savingEntropy, setSavingEntropy] = useState(false);

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

  // Fetch scheduled carousels for the current month
  const fetchScheduledCarousels = useCallback(async () => {
    if (!currentAccount) return;
    try {
      const res = await fetch(
        `/api/accounts/${currentAccount.id}/scheduled-carousels?month=${currentMonth + 1}&year=${currentYear}`
      );
      const data = await res.json();
      if (data.data) {
        setScheduledCarousels(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch scheduled carousels:", error);
    }
  }, [currentAccount, currentMonth, currentYear]);

  // Fetch scheduled posts (new pipeline system) for the current month
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
    Promise.all([fetchPosts(), fetchScheduledCarousels(), fetchScheduledPosts()]).finally(() => {
      setLoading(false);
    });
  }, [fetchPosts, fetchScheduledCarousels, fetchScheduledPosts]);

  // Get posts for a specific day
  const getPostsForDay = (day: number) => {
    if (filter === "graphics") return [];
    return posts.filter((post) => {
      const postDate = new Date(post.postedAt);
      return (
        postDate.getDate() === day &&
        postDate.getMonth() === currentMonth &&
        postDate.getFullYear() === currentYear
      );
    });
  };

  // Get scheduled carousels for a specific day
  const getCarouselsForDay = (day: number) => {
    if (filter === "posts") return [];
    return scheduledCarousels.filter((carousel) => {
      const carouselDate = new Date(carousel.scheduledDate);
      return (
        carouselDate.getDate() === day &&
        carouselDate.getMonth() === currentMonth &&
        carouselDate.getFullYear() === currentYear
      );
    });
  };

  // Get scheduled posts (pipeline) for a specific day
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

  // Open Graphics App for rendering
  const openGraphicsApp = (post: ScheduledPost) => {
    // Graphics App URL - adjust for your setup
    const graphicsAppUrl = process.env.NEXT_PUBLIC_GRAPHICS_APP_URL || "http://localhost:3003";
    const params = new URLSearchParams({
      postId: post.id,
      agentId: post.agentId,
      format: post.intent.suggestedFormat || "",
    });
    window.open(`${graphicsAppUrl}/wizard?${params.toString()}`, "_blank");
  };

  // Send rendered post for client review
  const handleSendForReview = async (postId: string) => {
    if (!currentAccount) return;
    try {
      const res = await fetch(`/api/calendar/${currentAccount.id}/posts/${postId}/send-for-review`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        await fetchScheduledPosts();
        setSelectedPost(data.data);
      }
    } catch (error) {
      console.error("Failed to send for review:", error);
    }
  };

  // Open client review page
  const openReviewPage = () => {
    if (!currentAccount) return;
    window.open(`/review/${currentAccount.id}`, "_blank");
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
    { value: "posts", label: "Posts Only" },
    { value: "graphics", label: "Graphics Only" },
  ];

  const handleDesignInListingGraphics = (carousel: ScheduledCarouselWithPackage) => {
    const brief = {
      id: carousel.id,
      question: carousel.question,
      ...carousel.brief,
    };
    const encoded = btoa(JSON.stringify(brief));
    console.log("Would open listing-graphics with brief:", brief);
    console.log("URL would be: /generate/carousel?brief=" + encoded);
  };

  // Start editing entropy for selected carousel
  const startEditingEntropy = (carousel: ScheduledCarouselWithPackage) => {
    setEntropyLevel((carousel.level as EntropyLevel) || null);
    setUncertaintyAddressed(carousel.uncertaintyAddressed || "");
    setIsEvergreen(carousel.isEvergreen || false);
    setEditingEntropy(true);
  };

  // Auto-suggest level based on question
  const handleAutoSuggest = () => {
    if (!selectedCarousel?.question) return;
    const result = suggestLevel(selectedCarousel.question);
    setEntropyLevel(result.level);
    setUncertaintyAddressed(result.suggestedUncertainty);
  };

  // Save entropy fields
  const saveEntropyFields = async () => {
    if (!selectedCarousel || !currentAccount) return;
    setSavingEntropy(true);
    try {
      const res = await fetch(
        `/api/accounts/${currentAccount.id}/carousels/${selectedCarousel.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: entropyLevel,
            uncertaintyAddressed,
            isEvergreen,
          }),
        }
      );
      if (res.ok) {
        // Update local state
        setSelectedCarousel({
          ...selectedCarousel,
          level: entropyLevel || undefined,
          uncertaintyAddressed,
          isEvergreen,
        });
        setEditingEntropy(false);
        // Refresh carousels
        await fetchScheduledCarousels();
      }
    } catch (error) {
      console.error("Failed to save entropy fields:", error);
    } finally {
      setSavingEntropy(false);
    }
  };

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
          {/* Graphics Library */}
          <button
            onClick={() => setShowGraphicsLibrary(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <Library className="w-4 h-4" />
            Graphics Library
          </button>

          {/* Client Review Link */}
          <button
            onClick={openReviewPage}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            Client Review
          </button>

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
            const dayCarousels = day !== null ? getCarouselsForDay(day) : [];
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

                      {/* Scheduled Carousels */}
                      {dayCarousels.map((carousel) => (
                        <div
                          key={carousel.id}
                          onClick={() => setSelectedCarousel(carousel)}
                          className={`flex items-center gap-1.5 p-1 rounded transition-colors group cursor-pointer ${
                            carousel.status === "published"
                              ? "bg-purple-500/20 hover:bg-purple-500/30"
                              : carousel.status === "ready"
                              ? "bg-emerald-500/20 hover:bg-emerald-500/30 border border-dashed border-emerald-500/30"
                              : "bg-amber-500/10 hover:bg-amber-500/20 border border-dashed border-amber-500/30"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded flex items-center justify-center ${
                              carousel.status === "published"
                                ? "bg-purple-500/30"
                                : carousel.status === "ready"
                                ? "bg-emerald-500/30"
                                : "bg-amber-500/20"
                            }`}
                          >
                            <LayoutGrid
                              className={`w-3 h-3 ${
                                carousel.status === "published"
                                  ? "text-purple-400"
                                  : carousel.status === "ready"
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span
                              className={`text-xs truncate block ${
                                carousel.status === "published"
                                  ? "text-purple-300"
                                  : carousel.status === "ready"
                                  ? "text-emerald-300"
                                  : "text-amber-300"
                              }`}
                            >
                              {carousel.question?.slice(0, 18) || "Carousel"}
                              {carousel.question && carousel.question.length > 18 ? "..." : ""}
                            </span>
                            {carousel.packageName && (
                              <span className="text-[10px] text-slate-500 truncate block">
                                {carousel.packageName}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Pipeline Scheduled Posts */}
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

      {/* Legend */}
      {(filter === "all" || filter === "graphics") && scheduledCarousels.length > 0 && (
        <div className="mt-4 flex items-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500/20 border border-dashed border-amber-500/30" />
            <span>Draft</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500/20 border border-dashed border-emerald-500/30" />
            <span>Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500/30" />
            <span>Published</span>
          </div>
        </div>
      )}

      {/* Carousel Detail Modal */}
      {selectedCarousel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      selectedCarousel.status === "published"
                        ? "bg-purple-500/20 text-purple-400"
                        : selectedCarousel.status === "ready"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {selectedCarousel.status}
                  </span>
                  <span className="text-sm text-slate-500">
                    {new Date(selectedCarousel.scheduledDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-white mt-2">
                  {selectedCarousel.question}
                </h2>
                {selectedCarousel.packageName && (
                  <p className="text-sm text-slate-500 mt-1">{selectedCarousel.packageName}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedCarousel(null)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Entropy Level Section */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white">Content Strategy</span>
                </div>
                {!editingEntropy ? (
                  <button
                    onClick={() => startEditingEntropy(selectedCarousel)}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingEntropy(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEntropyFields}
                      disabled={savingEntropy}
                      className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded"
                    >
                      {savingEntropy ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </div>

              {editingEntropy ? (
                <div className="space-y-3">
                  {/* Level selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-slate-400">Entropy Level</label>
                      <button
                        onClick={handleAutoSuggest}
                        className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                      >
                        <Zap className="w-3 h-3" />
                        Auto-suggest
                      </button>
                    </div>
                    <select
                      value={entropyLevel || ""}
                      onChange={(e) => setEntropyLevel(e.target.value as EntropyLevel)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">Select level...</option>
                      {(Object.keys(ENTROPY_LEVELS) as EntropyLevel[]).map((level) => (
                        <option key={level} value={level}>
                          {level} - {ENTROPY_LEVELS[level].name}: {ENTROPY_LEVELS[level].question}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Uncertainty addressed */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Uncertainty Addressed</label>
                    <input
                      type="text"
                      value={uncertaintyAddressed}
                      onChange={(e) => setUncertaintyAddressed(e.target.value)}
                      placeholder="What question does this resolve?"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Evergreen toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEvergreen(!isEvergreen)}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isEvergreen
                          ? "bg-emerald-600 border-emerald-500"
                          : "bg-slate-700 border-slate-600"
                      }`}
                    >
                      {isEvergreen && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <label className="text-sm text-slate-300">
                      Evergreen content (can be reposted)
                    </label>
                    <RefreshCw className={`w-3 h-3 ${isEvergreen ? "text-emerald-400" : "text-slate-600"}`} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {selectedCarousel.level ? (
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                        LEVEL_COLORS[selectedCarousel.level as EntropyLevel]?.bg || "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`text-xs font-mono font-bold ${
                          LEVEL_COLORS[selectedCarousel.level as EntropyLevel]?.text || "text-slate-300"
                        }`}
                      >
                        {selectedCarousel.level}
                      </span>
                      <span className="text-sm text-slate-300">
                        {ENTROPY_LEVELS[selectedCarousel.level as EntropyLevel]?.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">No level assigned</span>
                  )}

                  {selectedCarousel.isEvergreen && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded-lg">
                      <RefreshCw className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs text-emerald-400">Evergreen</span>
                    </div>
                  )}

                  {selectedCarousel.uncertaintyAddressed && (
                    <div className="w-full mt-1">
                      <span className="text-xs text-slate-500">Resolves: </span>
                      <span className="text-xs text-slate-300">{selectedCarousel.uncertaintyAddressed}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedCarousel.brief ? (
                <div className="space-y-6">
                  {/* Goal */}
                  {selectedCarousel.brief.goal && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium text-slate-400">Goal</span>
                      </div>
                      <p className="text-white">{selectedCarousel.brief.goal}</p>
                    </div>
                  )}

                  {/* Target Audience */}
                  {selectedCarousel.brief.targetAudience && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-medium text-slate-400">Target Audience</span>
                      </div>
                      <p className="text-white">{selectedCarousel.brief.targetAudience}</p>
                    </div>
                  )}

                  {/* Hook */}
                  {selectedCarousel.brief.hook && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium text-slate-400">Hook</span>
                      </div>
                      <p className="text-white italic">"{selectedCarousel.brief.hook}"</p>
                    </div>
                  )}

                  {/* Key Points */}
                  {selectedCarousel.brief.keyPoints && selectedCarousel.brief.keyPoints.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <ListOrdered className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-slate-400">Key Points (Slide by Slide)</span>
                      </div>
                      <div className="space-y-2">
                        {selectedCarousel.brief.keyPoints.map((point, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg"
                          >
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <p className="text-white text-sm">{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  {selectedCarousel.brief.cta && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MousePointer className="w-4 h-4 text-rose-400" />
                        <span className="text-sm font-medium text-slate-400">Call to Action</span>
                      </div>
                      <p className="text-white">{selectedCarousel.brief.cta}</p>
                    </div>
                  )}

                  {/* Tone & Design */}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedCarousel.brief.tone && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Megaphone className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-slate-400">Tone</span>
                        </div>
                        <p className="text-white">{selectedCarousel.brief.tone}</p>
                      </div>
                    )}
                    {selectedCarousel.brief.designNotes && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Palette className="w-4 h-4 text-pink-400" />
                          <span className="text-sm font-medium text-slate-400">Design Notes</span>
                        </div>
                        <p className="text-white">{selectedCarousel.brief.designNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-2">No strategy brief yet</p>
                  <p className="text-sm text-slate-500">
                    Add goal, key points, and design direction for this carousel
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedCarousel(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleDesignInListingGraphics(selectedCarousel)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                <Palette className="w-4 h-4" />
                Design in Listing Graphics
              </button>
            </div>
          </div>
        </div>
      )}

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

              {/* Graphic Preview */}
              {selectedPost.graphicPreviewUrl && (
                <div className="pt-4 border-t border-slate-800">
                  <span className="text-sm text-slate-400 block mb-2">Rendered Graphic</span>
                  <img
                    src={selectedPost.graphicPreviewUrl}
                    alt="Graphic preview"
                    className="w-full rounded-lg"
                  />
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
                {/* Status progression buttons based on workflow */}

                {/* Proposed → Scheduled (client approval via review page) */}
                {selectedPost.status === "proposed" && (
                  <span className="text-xs text-slate-500 italic">
                    Awaiting client approval
                  </span>
                )}

                {/* Scheduled → Content Ready */}
                {selectedPost.status === "scheduled" && (
                  <button
                    onClick={() => handleUpdatePostStatus(selectedPost.id, "content-ready")}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Mark Content Ready
                  </button>
                )}

                {/* Content Ready → Render in Graphics App */}
                {selectedPost.status === "content-ready" && (
                  <button
                    onClick={() => openGraphicsApp(selectedPost)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Render in Graphics App
                  </button>
                )}

                {/* Rendered → Send for Review */}
                {selectedPost.status === "rendered" && (
                  <button
                    onClick={() => handleSendForReview(selectedPost.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Send for Review
                  </button>
                )}

                {/* In Review → Awaiting client */}
                {selectedPost.status === "in-review" && (
                  <span className="text-xs text-orange-400 italic flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Awaiting client review
                  </span>
                )}

                {/* Revision → Client feedback */}
                {selectedPost.status === "revision" && (
                  <div className="flex flex-col gap-2">
                    {selectedPost.clientFeedback && (
                      <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                        <span className="font-medium">Feedback:</span> {selectedPost.clientFeedback}
                      </div>
                    )}
                    <button
                      onClick={() => openGraphicsApp(selectedPost)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Revise in Graphics App
                    </button>
                  </div>
                )}

                {/* Approved → Post to Instagram */}
                {selectedPost.status === "approved" && (
                  <button
                    onClick={() => handleUpdatePostStatus(selectedPost.id, "posted")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Mark as Posted
                  </button>
                )}

                {/* Posted → View on Instagram */}
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

      {/* Graphics Library Modal */}
      <GraphicsLibraryModal
        isOpen={showGraphicsLibrary}
        onClose={() => setShowGraphicsLibrary(false)}
        accountId={currentAccount?.id}
      />
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
