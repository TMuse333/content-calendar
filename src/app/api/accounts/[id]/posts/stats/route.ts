/**
 * Account Post Stats API
 * GET /api/accounts/[id]/posts/stats - Aggregate stats from cached MongoDB data
 *
 * Query params:
 * - since: ISO date string (optional)
 * - until: ISO date string (optional)
 * - format: "json" (default) or "csv"
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import clientPromise from "@/lib/mongodb/clientPromise";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PostMetrics {
  likes?: number;
  comments?: number;
  reach?: number;
  impressions?: number;
  engagement?: number;
  videoViews?: number;
  saves?: number;
  shares?: number;
}

interface PostClassification {
  contentType: string;
  subject: string;
  underlyingNeed: string;
  coreMessage: string;
  classifiedAt: Date;
}

interface Post {
  instagramId: string;
  accountId: string;
  caption?: string;
  mediaType: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  postedAt: Date;
  metrics?: PostMetrics;
  classification?: PostClassification;
  transcript?: string;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const format = searchParams.get("format") || "json";
    const sinceParam = searchParams.get("since");
    const untilParam = searchParams.get("until");

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const client = await clientPromise;
    const db = client.db("strategy");

    // Build query
    const query: Record<string, unknown> = { accountId: id };

    if (sinceParam || untilParam) {
      query.postedAt = {};
      if (sinceParam) (query.postedAt as Record<string, Date>).$gte = new Date(sinceParam);
      if (untilParam) (query.postedAt as Record<string, Date>).$lte = new Date(untilParam);
    }

    const posts = await db.collection<Post>("posts")
      .find(query)
      .sort({ postedAt: -1 })
      .toArray();

    // Calculate aggregates
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

    const postDetails = posts.map(post => {
      const m = post.metrics || {};
      totals.reach += m.reach || 0;
      totals.impressions += m.impressions || 0;
      totals.engagement += m.engagement || 0;
      totals.likes += m.likes || 0;
      totals.comments += m.comments || 0;
      totals.shares += m.shares || 0;
      totals.saves += m.saves || 0;
      totals.videoViews += m.videoViews || 0;

      return {
        id: post.instagramId,
        caption: post.caption?.slice(0, 100) || "",
        fullCaption: post.caption || "",
        mediaType: post.mediaType,
        thumbnailUrl: post.thumbnailUrl || post.mediaUrl || "",
        postedAt: post.postedAt,
        permalink: post.permalink,
        reach: m.reach || 0,
        impressions: m.impressions || 0,
        engagement: m.engagement || 0,
        likes: m.likes || 0,
        comments: m.comments || 0,
        shares: m.shares || 0,
        saves: m.saves || 0,
        videoViews: m.videoViews || 0,
        // AI classification
        classification: post.classification ? {
          contentType: post.classification.contentType,
          subject: post.classification.subject,
          coreMessage: post.classification.coreMessage,
        } : null,
        transcript: post.transcript || null,
      };
    });

    // Calculate averages
    const avgPerPost = posts.length > 0 ? {
      reach: Math.round(totals.reach / posts.length),
      impressions: Math.round(totals.impressions / posts.length),
      engagement: Math.round(totals.engagement / posts.length),
      engagementRate: totals.reach > 0
        ? ((totals.engagement / totals.reach) * 100).toFixed(2) + "%"
        : "0%",
    } : null;

    // Find top performers
    const topByReach = [...postDetails].sort((a, b) => b.reach - a.reach).slice(0, 3);
    const topByEngagement = [...postDetails].sort((a, b) => b.engagement - a.engagement).slice(0, 3);

    // CSV export
    if (format === "csv") {
      const headers = [
        "Posted At",
        "Media Type",
        "Caption",
        "Reach",
        "Impressions",
        "Engagement",
        "Likes",
        "Comments",
        "Shares",
        "Saves",
        "Video Views",
        "Permalink",
      ];

      const rows = postDetails.map(p => [
        new Date(p.postedAt).toISOString(),
        p.mediaType,
        `"${p.caption.replace(/"/g, '""')}"`,
        p.reach,
        p.impressions,
        p.engagement,
        p.likes,
        p.comments,
        p.shares,
        p.saves,
        p.videoViews,
        p.permalink || "",
      ]);

      // Add summary row
      rows.push([]);
      rows.push(["TOTALS", "", "", totals.reach, totals.impressions, totals.engagement, totals.likes, totals.comments, totals.shares, totals.saves, totals.videoViews, ""]);

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${id}-stats-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // JSON response
    return NextResponse.json({
      account: {
        id: account.id,
        name: account.name,
        handle: account.handle,
      },
      period: {
        since: sinceParam || "all time",
        until: untilParam || new Date().toISOString(),
      },
      totals,
      averagePerPost: avgPerPost,
      topPerformers: {
        byReach: topByReach,
        byEngagement: topByEngagement,
      },
      posts: postDetails,
    });
  } catch (error) {
    console.error("[api:posts/stats]", error);
    return NextResponse.json(
      { error: "Failed to fetch post stats" },
      { status: 500 }
    );
  }
}
