/**
 * Sync Posts API
 * POST /api/accounts/[id]/posts/sync
 *
 * Fetches posts from Instagram and saves to database with metrics.
 *
 * Body options:
 * - { postIds: string[] } - Sync only specific posts by Instagram ID
 * - {} or no body - Sync all posts (with optional ?limit= query param)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { upsertPosts } from "@/lib/mongodb/posts";
import { fetchPostInsights } from "@/lib/platforms/instagram";
import type { Post } from "@/lib/types/post";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface SyncRequestBody {
  postIds?: string[];
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

    // Parse body for selective sync
    let body: SyncRequestBody = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // No body or invalid JSON - sync all
    }

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const instagram = account.platforms?.instagram;
    if (!instagram?.connected || !instagram.userId || !instagram.accessToken) {
      return NextResponse.json(
        { error: "Instagram not connected for this account" },
        { status: 400 }
      );
    }

    // Fetch posts with insights from Instagram
    const result = await fetchPostInsights({
      credentials: {
        instagramId: instagram.userId,
        accessToken: instagram.accessToken,
      },
      limit,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Filter to selected posts if postIds provided
    let postsToSync = result.data;
    if (body.postIds && body.postIds.length > 0) {
      const selectedIds = new Set(body.postIds);
      postsToSync = result.data.filter((p) => selectedIds.has(p.id));
    }

    // Transform to Post format
    const posts: Omit<Post, "_id">[] = postsToSync.map((p) => ({
      accountId: id,
      instagramId: p.id,
      mediaType: p.mediaType as "VIDEO" | "IMAGE" | "CAROUSEL_ALBUM",
      mediaUrl: p.thumbnailUrl, // We'll use thumbnail for display
      thumbnailUrl: p.thumbnailUrl,
      caption: p.caption || undefined,
      permalink: `https://www.instagram.com/p/${p.id}/`,
      postedAt: new Date(p.timestamp),
      metrics: {
        likes: 0, // Not available in current insights response
        comments: 0,
        reach: p.reach,
        impressions: p.impressions,
        engagement: p.engagement,
        videoViews: p.videoViews || undefined,
      },
      syncedAt: new Date(),
      updatedAt: new Date(),
    }));

    // Upsert to database
    const syncResult = await upsertPosts(posts);

    return NextResponse.json({
      success: true,
      synced: syncResult.synced,
      new: syncResult.new,
    });
  } catch (error) {
    console.error("[api:posts/sync] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to sync posts: ${message}` },
      { status: 500 }
    );
  }
}
