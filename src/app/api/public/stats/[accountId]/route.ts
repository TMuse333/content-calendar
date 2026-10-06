/**
 * Public Stats API
 * GET /api/public/stats/[accountId]
 *
 * Returns formatted stats for embedding on external sites.
 * No auth required - read-only public data.
 *
 * CORS enabled for cross-domain requests.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb/clientPromise";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ accountId: string }>;
}

// CORS headers for cross-domain access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = await params;

    const client = await clientPromise;
    const db = client.db("strategy");

    // Get account info
    const account = await db.collection("accounts").findOne({ id: accountId });
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get all posts for this account
    const posts = await db.collection("posts")
      .find({ accountId })
      .sort({ postedAt: -1 })
      .toArray();

    if (posts.length === 0) {
      return NextResponse.json({
        account: {
          name: account.name,
          handle: account.handle,
        },
        stats: null,
        message: "No posts tracked yet",
      }, { headers: corsHeaders });
    }

    // Calculate totals
    const totals = {
      posts: posts.length,
      reach: 0,
      impressions: 0,
      engagement: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      videoViews: 0,
    };

    posts.forEach(post => {
      const m = post.metrics || {};
      totals.reach += m.reach || 0;
      totals.impressions += m.impressions || 0;
      totals.engagement += m.engagement || 0;
      totals.likes += m.likes || 0;
      totals.comments += m.comments || 0;
      totals.shares += m.shares || 0;
      totals.saves += m.saves || 0;
      totals.videoViews += m.videoViews || 0;
    });

    // Calculate averages
    const avgReach = Math.round(totals.reach / posts.length);
    const avgEngagement = Math.round(totals.engagement / posts.length);
    const engagementRate = totals.reach > 0
      ? ((totals.engagement / totals.reach) * 100).toFixed(2)
      : "0";

    // Get top performers with content
    const sortedByReach = [...posts].sort((a, b) =>
      (b.metrics?.reach || 0) - (a.metrics?.reach || 0)
    );
    const sortedByEngagement = [...posts].sort((a, b) =>
      (b.metrics?.engagement || 0) - (a.metrics?.engagement || 0)
    );

    const formatPost = (post: typeof posts[0]) => ({
      caption: post.caption?.slice(0, 150) || "No caption",
      mediaType: post.mediaType,
      postedAt: post.postedAt,
      permalink: post.permalink,
      metrics: {
        reach: post.metrics?.reach || 0,
        impressions: post.metrics?.impressions || 0,
        engagement: post.metrics?.engagement || 0,
        likes: post.metrics?.likes || 0,
        comments: post.metrics?.comments || 0,
        videoViews: post.metrics?.videoViews || 0,
      },
    });

    // Content breakdown by type
    const byType = {
      videos: posts.filter(p => p.mediaType === "VIDEO").length,
      images: posts.filter(p => p.mediaType === "IMAGE").length,
      carousels: posts.filter(p => p.mediaType === "CAROUSEL_ALBUM").length,
    };

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentPosts = posts.filter(p => new Date(p.postedAt) > thirtyDaysAgo);
    const recentReach = recentPosts.reduce((sum, p) => sum + (p.metrics?.reach || 0), 0);

    // Build response
    const response = {
      account: {
        name: account.name,
        handle: account.handle,
      },

      // Headline stats for display
      headline: {
        totalReach: totals.reach,
        totalReachFormatted: formatNumber(totals.reach),
        totalEngagement: totals.engagement,
        totalEngagementFormatted: formatNumber(totals.engagement),
        totalPosts: totals.posts,
        videoViews: totals.videoViews,
        videoViewsFormatted: formatNumber(totals.videoViews),
        engagementRate: `${engagementRate}%`,
      },

      // Averages
      averages: {
        reachPerPost: avgReach,
        reachPerPostFormatted: formatNumber(avgReach),
        engagementPerPost: avgEngagement,
        engagementPerPostFormatted: formatNumber(avgEngagement),
      },

      // Content breakdown
      content: {
        byType,
        total: posts.length,
      },

      // Recent activity
      recent: {
        posts: recentPosts.length,
        reach: recentReach,
        reachFormatted: formatNumber(recentReach),
        period: "Last 30 days",
      },

      // Top performers WITH content
      topPosts: {
        byReach: sortedByReach.slice(0, 3).map(formatPost),
        byEngagement: sortedByEngagement.slice(0, 3).map(formatPost),
      },

      // Full breakdown (optional, for detailed views)
      detailed: {
        likes: totals.likes,
        comments: totals.comments,
        shares: totals.shares,
        saves: totals.saves,
      },

      // Metadata
      meta: {
        generatedAt: new Date().toISOString(),
        dataFrom: posts[posts.length - 1]?.postedAt,
        dataTo: posts[0]?.postedAt,
      },
    };

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    console.error("[api:public/stats]", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500, headers: corsHeaders }
    );
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
}
