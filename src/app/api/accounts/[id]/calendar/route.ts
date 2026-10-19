/**
 * Calendar API
 *
 * GET /api/accounts/[id]/calendar?month=2024-01
 *
 * Returns posts for calendar view combining:
 * - Scheduled posts from Notion (planned content)
 * - Posted posts from MongoDB/Instagram (published content)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPosts as getMongoPosts } from "@/lib/mongodb/posts";
import { getPosts as getNotionPosts } from "@/lib/notion";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CalendarPost {
  id: string;
  title: string;
  caption?: string;
  status: "Posted" | "Scheduled";
  type?: string;
  previewUrl?: string;
  postedAt?: string;
  scheduledFor?: string;
  source: "instagram" | "notion";
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // Format: 2024-01

    // 1. Get account
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const calendarPosts: CalendarPost[] = [];

    // 2. Fetch POSTED posts from MongoDB (synced from Instagram)
    const instagramPosts = await getMongoPosts(id);
    for (const post of instagramPosts) {
      calendarPosts.push({
        id: post._id?.toString() || post.instagramId,
        title: post.caption?.slice(0, 50) || "Post",
        caption: post.caption,
        status: "Posted",
        type: post.mediaType,
        previewUrl: post.thumbnailUrl || post.mediaUrl,
        postedAt: post.postedAt.toISOString(),
        source: "instagram",
      });
    }

    // 3. Fetch SCHEDULED posts from Notion (if configured)
    if (account.notion?.postsDataSourceId) {
      const notionConfig: NotionConfig = {
        postsDataSourceId: account.notion.postsDataSourceId,
        topicsDataSourceId: account.notion.topicsDataSourceId || "",
      };

      const notionPosts = await getNotionPosts(notionConfig);

      // Only include Scheduled posts from Notion
      for (const post of notionPosts) {
        if (post.status === "Scheduled") {
          calendarPosts.push({
            id: post.id,
            title: post.title,
            caption: post.caption,
            status: "Scheduled",
            type: post.type,
            previewUrl: post.previewUrl,
            scheduledFor: post.updatedAt?.toISOString(),
            source: "notion",
          });
        }
      }
    }

    // 4. Filter by month if provided
    let filteredPosts = calendarPosts;
    if (month) {
      const [year, monthNum] = month.split("-").map(Number);
      filteredPosts = calendarPosts.filter((post) => {
        const dateStr = post.postedAt || post.scheduledFor;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        return date.getFullYear() === year && date.getMonth() === monthNum - 1;
      });
    }

    return NextResponse.json({
      posts: filteredPosts,
      count: filteredPosts.length,
    });
  } catch (error) {
    console.error("[api:calendar:get]", error);
    return NextResponse.json(
      { error: "Failed to load calendar" },
      { status: 500 }
    );
  }
}
