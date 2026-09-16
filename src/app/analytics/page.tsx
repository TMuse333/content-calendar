"use client";

import { useState } from "react";
import { TrendingUp, Eye, Heart, MessageCircle, Play, RefreshCw } from "lucide-react";

// Analytics page - Instagram insights and performance tracking

// Mock data - will come from Instagram API
const mockPosts = [
  {
    id: "1",
    caption: "The compound effect of 4 hours of deep work daily...",
    mediaType: "VIDEO",
    thumbnailUrl: "/api/placeholder/100/100",
    timestamp: "2026-09-10T09:00:00Z",
    impressions: 1245,
    reach: 892,
    engagement: 156,
    videoViews: 743,
  },
  {
    id: "2",
    caption: "Systems beat motivation every time...",
    mediaType: "IMAGE",
    thumbnailUrl: "/api/placeholder/100/100",
    timestamp: "2026-09-07T12:00:00Z",
    impressions: 876,
    reach: 654,
    engagement: 98,
    videoViews: 0,
  },
  {
    id: "3",
    caption: "Why I switched from websites to video...",
    mediaType: "VIDEO",
    thumbnailUrl: "/api/placeholder/100/100",
    timestamp: "2026-09-03T10:00:00Z",
    impressions: 2341,
    reach: 1823,
    engagement: 287,
    videoViews: 1456,
  },
];

const mockTotals = {
  impressions: 4462,
  reach: 3369,
  engagement: 541,
  posts: 3,
};

type Period = "week" | "month" | "all";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Fetch fresh data from Instagram API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Analytics</h1>
          <p className="text-zinc-400">Instagram performance insights</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Period Selector */}
          <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1">
            {(["week", "month", "all"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  period === p
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {p === "week" ? "7 days" : p === "month" ? "30 days" : "All time"}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Impressions</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {mockTotals.impressions.toLocaleString()}
          </p>
          <p className="text-sm text-emerald-400 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            +12% vs last period
          </p>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Reach</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {mockTotals.reach.toLocaleString()}
          </p>
          <p className="text-sm text-emerald-400 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            +8% vs last period
          </p>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Heart className="w-4 h-4" />
            <span className="text-sm">Engagement</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {mockTotals.engagement.toLocaleString()}
          </p>
          <p className="text-sm text-emerald-400 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            +23% vs last period
          </p>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">Posts</span>
          </div>
          <p className="text-2xl font-bold text-white">{mockTotals.posts}</p>
          <p className="text-sm text-zinc-500 mt-1">this period</p>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Recent Posts</h2>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-6 py-3 text-sm font-medium text-zinc-500">
                Post
              </th>
              <th className="text-right px-6 py-3 text-sm font-medium text-zinc-500">
                Impressions
              </th>
              <th className="text-right px-6 py-3 text-sm font-medium text-zinc-500">
                Reach
              </th>
              <th className="text-right px-6 py-3 text-sm font-medium text-zinc-500">
                Engagement
              </th>
              <th className="text-right px-6 py-3 text-sm font-medium text-zinc-500">
                Views
              </th>
            </tr>
          </thead>
          <tbody>
            {mockPosts.map((post) => (
              <tr
                key={post.id}
                className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center">
                      {post.mediaType === "VIDEO" ? (
                        <Play className="w-5 h-5 text-zinc-500" />
                      ) : (
                        <div className="w-5 h-5 bg-zinc-600 rounded" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-zinc-300 line-clamp-1 max-w-xs">
                        {post.caption}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(post.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm text-zinc-300">
                  {post.impressions.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-sm text-zinc-300">
                  {post.reach.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-sm text-zinc-300">
                  {post.engagement.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-sm text-zinc-300">
                  {post.videoViews > 0 ? post.videoViews.toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
