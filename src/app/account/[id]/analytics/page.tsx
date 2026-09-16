"use client";

import { useState, useEffect } from "react";
import { useAccount } from "@/contexts/AccountContext";
import { BarChart3, TrendingUp, Eye, Heart, Loader2, Play, Image, RefreshCw } from "lucide-react";

interface PostWithInsights {
  id: string;
  caption: string;
  mediaType: string;
  thumbnailUrl: string;
  timestamp: string;
  impressions: number;
  reach: number;
  engagement: number;
  videoViews: number;
}

export default function AnalyticsPage() {
  const { currentAccount } = useAccount();
  const [posts, setPosts] = useState<PostWithInsights[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");

  const fetchInsights = async () => {
    if (!currentAccount) return;

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      let since: string | undefined;

      if (period === "week") {
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (period === "month") {
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const params = new URLSearchParams();
      if (since) params.set("since", since);
      params.set("until", now.toISOString());

      // Use account-scoped endpoint
      const res = await fetch(`/api/accounts/${currentAccount.id}/instagram/insights?${params}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setPosts(data.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentAccount) {
      fetchInsights();
    }
  }, [period, currentAccount]);

  // Calculate totals
  const totalReach = posts.reduce((sum, p) => sum + p.reach, 0);
  const totalImpressions = posts.reduce((sum, p) => sum + p.impressions, 0);
  const totalEngagement = posts.reduce((sum, p) => sum + p.engagement, 0);
  const totalPosts = posts.length;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const stats = [
    { label: "Total Reach", value: formatNumber(totalReach), icon: Eye, color: "text-blue-400" },
    { label: "Impressions", value: formatNumber(totalImpressions), icon: TrendingUp, color: "text-emerald-400" },
    { label: "Engagement", value: formatNumber(totalEngagement), icon: Heart, color: "text-pink-400" },
    { label: "Posts", value: totalPosts.toString(), icon: BarChart3, color: "text-amber-400" },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 mt-1">
            Performance insights for {currentAccount?.name || "..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as "week" | "month" | "all")}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-sm text-slate-400">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {loading ? "—" : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Posts Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Posts</h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchInsights}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-sm"
            >
              Try Again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No posts found for this period</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group relative bg-slate-800 rounded-lg overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="aspect-square relative">
                  {post.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.thumbnailUrl}
                      alt={post.caption || "Post"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                      <Image className="w-8 h-8 text-slate-500" />
                    </div>
                  )}

                  {/* Video indicator */}
                  {post.mediaType === "VIDEO" && (
                    <div className="absolute top-2 right-2 p-1 bg-black/50 rounded">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Hover overlay with stats */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="text-center text-white space-y-1">
                      <div className="flex items-center justify-center gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {formatNumber(post.reach)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {formatNumber(post.engagement)}
                        </span>
                      </div>
                      {post.mediaType === "VIDEO" && post.videoViews > 0 && (
                        <div className="text-sm text-slate-300">
                          {formatNumber(post.videoViews)} views
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Caption preview */}
                <div className="p-2">
                  <p className="text-xs text-slate-400 truncate">
                    {post.caption || "No caption"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(post.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
