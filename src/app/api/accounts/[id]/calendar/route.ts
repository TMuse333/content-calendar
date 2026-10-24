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
import { getPosts as getNotionPosts, getTopics } from "@/lib/notion";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Client-safe fields only. Internal strategy fields (Belief before/after,
// Pattern, Human nature lever, Literary device) stay hidden, same as client-hub.
interface CalendarPost {
  id: string;
  title: string;
  caption?: string;
  status: string;
  type?: string;
  previewUrl?: string;
  previewUrls?: string[];
  postedAt?: string;
  scheduledFor?: string;
  topic?: string;
  questionAnswered?: string;
  decisionStage?: string;
  cta?: string;
  source: "instagram" | "notion";
}

/**
 * Notion "Post date" is usually date-only (2026-10-22). Parsed as-is it
 * becomes UTC midnight, which shifts to the previous day in western
 * timezones — so anchor date-only values at local noon.
 */
function stableDate(iso: string): string {
  return iso.includes("T") ? iso : `${iso}T12:00:00`;
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

      const [notionPosts, topics] = await Promise.all([
        getNotionPosts(notionConfig),
        getTopics(notionConfig).catch(() => []),
      ]);
      const topicNames = new Map(topics.map((t) => [t.id, t.title]));

      // Include every Notion post with a planned "Post date".
      // A Posted post whose IG link matches a synced Instagram post already
      // appears via Mongo above, so skip only those to avoid duplicates.
      const syncedIgUrls = new Set(instagramPosts.map((p) => p.permalink).filter(Boolean));
      for (const post of notionPosts) {
        if (post.status === "Archived" || !post.postDate) continue;
        if (post.status === "Posted" && post.igPostLink && syncedIgUrls.has(post.igPostLink)) continue;
        const date = stableDate(post.postDate);
        calendarPosts.push({
          id: post.id,
          title: post.title,
          caption: post.caption,
          status: post.status,
          type: post.type,
          previewUrl: post.previewUrls?.[0] ?? post.previewUrl,
          previewUrls: post.previewUrls,
          topic: post.topicId ? topicNames.get(post.topicId) : undefined,
          questionAnswered: post.questionAnswered || undefined,
          decisionStage: post.decisionStage,
          cta: post.cta || undefined,
          ...(post.status === "Posted" ? { postedAt: date } : { scheduledFor: date }),
          source: "notion",
        });
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
