import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Check, Filter, Loader2, Video, Image, LayoutGrid } from "lucide-react";
import { ClientCalendarPostModal } from "./ClientCalendarPostModal";
import type { CalendarPost, CalendarFilter } from "./types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function CalendarTab({ accountId }: { accountId: string }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Fetch posts for calendar (Notion planned + Instagram posted)
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const fetchCalendarPosts = async () => {
      setLoading(true);
      try {
        const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
        const res = await fetch(`/api/accounts/${accountId}/calendar?month=${monthStr}`);
        const data = await res.json();
        if (data?.posts) {
          setPosts(data.posts);
        }
      } catch (error) {
        console.error("Failed to fetch calendar posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarPosts();
  }, [accountId, currentMonth, currentYear, refreshKey]);

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

  // Get posts for a specific day
  const getPostsForDay = (day: number) => {
    return posts.filter((post) => {
      const dateStr = post.postedAt || post.scheduledFor;
      if (!dateStr) return false;
      const postDate = new Date(dateStr);
      return (
        postDate.getDate() === day &&
        postDate.getMonth() === currentMonth &&
        postDate.getFullYear() === currentYear
      );
    }).filter((post) => {
      if (filter === "all") return true;
      if (filter === "posts") return post.status === "Posted";
      if (filter === "scheduled") return post.status !== "Posted";
      return true;
    });
  };

  const calendarDays: (number | null)[] = [];
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
    { value: "posts", label: "Published" },
    { value: "scheduled", label: "Planned" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">
            {MONTHS[currentMonth]} {currentYear}
          </h2>
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
              <div className="absolute right-0 top-full mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
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

            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 border-b border-r border-slate-800 ${
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
                    </div>
                    <div className="space-y-1">
                      {dayPosts.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className={`flex items-center gap-1.5 p-1 rounded transition-colors cursor-pointer ${
                            post.status === "Posted"
                              ? "bg-emerald-500/10 hover:bg-emerald-500/20"
                              : "bg-blue-500/10 hover:bg-blue-500/20 border border-dashed border-blue-500/30"
                          }`}
                        >
                          {post.previewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={post.previewUrl}
                              alt=""
                              className="w-5 h-5 rounded object-cover"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center">
                              {post.type === "VIDEO" ? (
                                <Video className="w-3 h-3 text-slate-400" />
                              ) : post.type === "CAROUSEL_ALBUM" ? (
                                <LayoutGrid className="w-3 h-3 text-slate-400" />
                              ) : (
                                <Image className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                          )}
                          <span className={`text-xs truncate flex-1 ${
                            post.status === "Posted" ? "text-emerald-400" : "text-blue-400"
                          }`}>
                            {post.title?.slice(0, 15) || "Post"}
                            {post.title && post.title.length > 15 ? "..." : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Post Detail Modal (client-safe fields + approve / request changes) */}
      {selectedPost && (
        <ClientCalendarPostModal
          post={selectedPost}
          accountId={accountId}
          onClose={() => setSelectedPost(null)}
          onActionDone={() => {
            setSelectedPost(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
