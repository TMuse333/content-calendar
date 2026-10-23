"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, Heart, MessageCircle, Bookmark, TrendingUp, BarChart3 } from "lucide-react";
import type { Post } from "@/lib/types/post";

interface MonthSummaryProps {
  posts: Post[];
  month: number;
  year: number;
}

export function MonthSummary({ posts, month, year }: MonthSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  // Filter posts for this month
  const monthPosts = posts.filter((post) => {
    const d = new Date(post.postedAt);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  if (monthPosts.length === 0) {
    return null;
  }

  // Calculate totals
  const totals = monthPosts.reduce(
    (acc, post) => ({
      reach: acc.reach + (post.metrics?.reach || 0),
      likes: acc.likes + (post.metrics?.likes || 0),
      comments: acc.comments + (post.metrics?.comments || 0),
      saves: acc.saves + (post.metrics?.saves || 0),
    }),
    { reach: 0, likes: 0, comments: 0, saves: 0 }
  );

  // Calculate averages
  const count = monthPosts.length;
  const avgReach = Math.round(totals.reach / count);
  const avgLikes = Math.round(totals.likes / count);
  const avgComments = Math.round(totals.comments / count);
  const avgSaves = Math.round(totals.saves / count);

  // Find top performer
  const topPost = monthPosts.reduce((best, post) =>
    (post.metrics?.reach || 0) > (best.metrics?.reach || 0) ? post : best
  );

  // Engagement rate (likes + comments + saves) / reach
  const engagementRate = totals.reach > 0
    ? ((totals.likes + totals.comments + totals.saves) / totals.reach * 100).toFixed(2)
    : "0.00";

  const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString();

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl mb-6 overflow-hidden">
      {/* Collapsed View */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-white">{count} posts</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              {formatNum(totals.reach)}
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              {formatNum(totals.likes)}
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
              {totals.comments}
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              {engagementRate}%
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Expanded View */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <StatCard
              icon={<Eye className="w-5 h-5 text-cyan-400" />}
              label="Total Reach"
              value={formatNum(totals.reach)}
              subValue={`avg ${formatNum(avgReach)}/post`}
            />
            <StatCard
              icon={<Heart className="w-5 h-5 text-pink-400" />}
              label="Total Likes"
              value={formatNum(totals.likes)}
              subValue={`avg ${avgLikes}/post`}
            />
            <StatCard
              icon={<MessageCircle className="w-5 h-5 text-blue-400" />}
              label="Comments"
              value={totals.comments.toString()}
              subValue={`avg ${avgComments}/post`}
            />
            <StatCard
              icon={<Bookmark className="w-5 h-5 text-amber-400" />}
              label="Saves"
              value={totals.saves.toString()}
              subValue={`avg ${avgSaves}/post`}
            />
          </div>

          {/* Top Performer */}
          {topPost && (topPost.metrics?.reach || 0) > 0 && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400 font-medium">TOP POST</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white truncate block">
                    {topPost.caption?.slice(0, 50) || "Post"}
                    {topPost.caption && topPost.caption.length > 50 ? "..." : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-400 font-medium">
                    {formatNum(topPost.metrics?.reach || 0)} reach
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500">{subValue}</div>
    </div>
  );
}
