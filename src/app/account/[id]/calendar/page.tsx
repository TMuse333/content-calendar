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
  Plus,
  Calendar,
  Download,
  Link2,
} from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";
import type { Post } from "@/lib/types/post";
import type { ScheduledPost, ScheduledPostStatus } from "@/lib/types/scheduled-post";
import { getStatusDisplay } from "@/lib/types/scheduled-post";
import { CreatePostModal } from "./components/CreatePostModal";
import { ScheduledPostModal } from "./components/ScheduledPostModal";
import { PublishedPostModal } from "./components/PublishedPostModal";
import { MonthSummary } from "./components/MonthSummary";
import { ProposalLinkModal } from "./components/ProposalLinkModal";
import { NotionPostModal, type NotionCalendarPost } from "./components/NotionPostModal";
import { PipelineStrip } from "./components/PipelineStrip";

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
  const [notionPosts, setNotionPosts] = useState<NotionCalendarPost[]>([]);
  const [selectedNotionPost, setSelectedNotionPost] = useState<NotionCalendarPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [selectedPublishedPost, setSelectedPublishedPost] = useState<Post | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<{ day: number } | null>(null);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const fetchPosts = useCallback(async () => {
    if (!currentAccount) return;
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/posts`);
      const data = await res.json();
      if (data.data) setPosts(data.data);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    }
  }, [currentAccount]);

  const fetchScheduledPosts = useCallback(async () => {
    if (!currentAccount) return;
    try {
      const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/calendar/${currentAccount.id}/posts?month=${monthStr}`);
      const data = await res.json();
      if (data.data) setScheduledPosts(data.data);
    } catch (error) {
      console.error("Failed to fetch scheduled posts:", error);
    }
  }, [currentAccount, currentMonth, currentYear]);

  // Planned Notion posts (the content pipeline: Draft → Ready → Approved).
  // Posted ones arrive via the Instagram sync above, so only planned here.
  const fetchNotionPosts = useCallback(async () => {
    if (!currentAccount) return;
    try {
      const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/accounts/${currentAccount.id}/calendar?month=${monthStr}`);
      const data = await res.json();
      if (data?.posts) {
        setNotionPosts(
          (data.posts as (NotionCalendarPost & { source?: string })[]).filter(
            (p) => p.source === "notion" && p.status !== "Posted"
          )
        );
      }
    } catch (error) {
      console.error("Failed to fetch Notion posts:", error);
    }
  }, [currentAccount, currentMonth, currentYear]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPosts(), fetchScheduledPosts(), fetchNotionPosts()]).finally(() => setLoading(false));
  }, [fetchPosts, fetchScheduledPosts, fetchNotionPosts]);

  const handleSync = async () => {
    if (!currentAccount) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/posts/sync`, { method: "POST" });
      const data = await res.json();
      if (data.success) await fetchPosts();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  const getPostsForDay = (day: number) => {
    if (filter === "scheduled") return [];
    return posts.filter((post) => {
      const d = new Date(post.postedAt);
      return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  };

  const getScheduledPostsForDay = (day: number) => {
    if (filter === "posts") return [];
    return scheduledPosts.filter((post) => {
      const d = new Date(post.scheduledFor);
      return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  };

  const getNotionPostsForDay = (day: number) => {
    if (filter === "posts") return [];
    return notionPosts.filter((post) => {
      const iso = post.scheduledFor || post.postedAt;
      if (!iso) return false;
      const d = new Date(iso);
      return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  };

  const handleCreatePost = async (day: number, intent: { audience: string; topic?: string }) => {
    if (!currentAccount) return;
    setCreating(true);
    try {
      const scheduledFor = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const res = await fetch(`/api/calendar/${currentAccount.id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor, intent: { audience: intent.audience, topic: intent.topic } }),
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
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const goToToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); };

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);

  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const avgReach = posts.length > 0
    ? posts.reduce((sum, p) => sum + (p.metrics?.reach || 0), 0) / posts.length
    : 0;

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
            <h1 className="text-2xl font-bold text-white">{MONTHS[currentMonth]} {currentYear}</h1>
            {currentAccount && <p className="text-sm text-slate-500">{currentAccount.name}</p>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <button onClick={goToToday} className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
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
          <button
            onClick={() => setShowProposalModal(true)}
            disabled={!currentAccount || posts.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <Link2 className="w-4 h-4" />
            Share
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter !== "all" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Filter className="w-4 h-4" />
            {filterOptions.find(o => o.value === filter)?.label}
          </button>
          {showFilterMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => { setFilter(option.value); setShowFilterMenu(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                      filter === option.value ? "bg-emerald-500/20 text-emerald-400" : "text-slate-300 hover:bg-slate-700"
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
      </div>

      {/* What's ready to be posted, at a glance */}
      <PipelineStrip posts={notionPosts} onSelect={setSelectedNotionPost} />

      {/* Month Summary */}
      <MonthSummary posts={posts} month={currentMonth} year={currentYear} />

      {/* Calendar Grid */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-800">
          {DAYS.map((day) => (
            <div key={day} className="px-4 py-3 text-sm font-medium text-slate-500 text-center">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayPosts = day !== null ? getPostsForDay(day) : [];
            const dayScheduledPosts = day !== null ? getScheduledPostsForDay(day) : [];
            const dayNotionPosts = day !== null ? getNotionPostsForDay(day) : [];

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
                      <div className={`text-sm font-medium ${isToday(day) ? "w-7 h-7 flex items-center justify-center bg-emerald-600 text-white rounded-full" : "text-slate-400"}`}>
                        {day}
                      </div>
                      <button onClick={() => setShowCreateModal({ day })} className="opacity-0 group-hover/cell:opacity-100 p-1 hover:bg-slate-700 rounded transition-all" title="Schedule post">
                        <Plus className="w-3.5 h-3.5 text-slate-500 hover:text-emerald-400" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {dayPosts.map((post) => {
                        const reach = post.metrics?.reach || 0;
                        const perf = reach > avgReach * 1.2 ? "high" : reach < avgReach * 0.8 ? "low" : "normal";
                        return (
                          <div
                            key={post.instagramId || post._id?.toString()}
                            onClick={() => setSelectedPublishedPost(post)}
                            className={`flex items-center gap-1.5 p-1 rounded transition-colors cursor-pointer ${
                              perf === "high" ? "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20"
                                : "bg-slate-800/50 hover:bg-slate-700/50"
                            }`}
                          >
                            {post.thumbnailUrl ? (
                              <img src={post.thumbnailUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center flex-shrink-0">
                                {post.mediaType === "VIDEO" ? <Video className="w-3 h-3 text-slate-400" />
                                  : post.mediaType === "CAROUSEL_ALBUM" ? <LayoutGrid className="w-3 h-3 text-slate-400" />
                                  : <Image className="w-3 h-3 text-slate-400" />}
                              </div>
                            )}
                            <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                              <span className="text-xs text-slate-400 truncate">{post.caption?.slice(0, 12) || "Post"}{post.caption && post.caption.length > 12 ? "…" : ""}</span>
                              {reach > 0 && <span className={`text-[10px] font-medium flex-shrink-0 ${perf === "high" ? "text-emerald-400" : "text-slate-500"}`}>{reach >= 1000 ? `${(reach / 1000).toFixed(1)}k` : reach}</span>}
                            </div>
                          </div>
                        );
                      })}
                      {dayNotionPosts.map((post) => {
                        const tone =
                          post.status === "Approved"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            : post.status === "Ready for review"
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                            : "border-blue-500/40 bg-blue-500/10 text-blue-400";
                        return (
                          <div
                            key={post.id}
                            onClick={() => setSelectedNotionPost(post)}
                            className={`flex items-center gap-1.5 p-1 rounded border border-dashed transition-colors cursor-pointer hover:opacity-80 ${tone}`}
                          >
                            {post.previewUrl ? (
                              <img src={post.previewUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center flex-shrink-0">
                                <LayoutGrid className="w-3 h-3 text-slate-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-xs truncate block">{post.title?.slice(0, 18) || "Post"}</span>
                              <span className="text-[10px] text-slate-500 truncate block">{post.status}</span>
                            </div>
                          </div>
                        );
                      })}
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
                              <span className={`text-xs truncate block ${statusInfo.color}`}>{post.intent.topic?.slice(0, 18) || post.intent.audience}</span>
                              <span className="text-[10px] text-slate-500 truncate block">{statusInfo.label}</span>
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
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500/10 border border-dashed border-emerald-500/40" />
          Approved — ready to publish
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500/10 border border-dashed border-amber-500/40" />
          Waiting on client OK
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500/10 border border-dashed border-blue-500/40" />
          Draft / idea
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-800 border border-slate-700" />
          Published on Instagram
        </span>
      </div>

      {/* Modals */}
      {selectedPost && (
        <ScheduledPostModal post={selectedPost} onClose={() => setSelectedPost(null)} onUpdateStatus={handleUpdatePostStatus} />
      )}
      {selectedPublishedPost && (
        <PublishedPostModal
          post={selectedPublishedPost}
          accountId={currentAccount?.id || ""}
          onClose={() => setSelectedPublishedPost(null)}
          onPostUpdate={(updated) => {
            setSelectedPublishedPost(updated);
            setPosts(posts.map(p => p.instagramId === updated.instagramId ? updated : p));
          }}
        />
      )}
      {showCreateModal && (
        <CreatePostModal day={showCreateModal.day} month={currentMonth} year={currentYear} creating={creating} onClose={() => setShowCreateModal(null)} onCreate={handleCreatePost} />
      )}
      {showProposalModal && currentAccount && (
        <ProposalLinkModal accountId={currentAccount.id} onClose={() => setShowProposalModal(false)} />
      )}
      {selectedNotionPost && currentAccount && (
        <NotionPostModal
          post={selectedNotionPost}
          accountId={currentAccount.id}
          igUsername={
            (currentAccount as { platforms?: { instagram?: { username?: string } } }).platforms?.instagram?.username
          }
          onClose={() => setSelectedNotionPost(null)}
          onPublished={() => {
            fetchNotionPosts();
            fetchPosts();
          }}
        />
      )}
    </div>
  );
}
