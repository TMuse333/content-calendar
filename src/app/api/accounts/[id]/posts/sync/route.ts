/**
 * Sync Posts API
 * POST /api/accounts/[id]/posts/sync
 *
 * Fetches posts from Instagram and saves to database with metrics.
 *
 * Body options:
 * - { postIds: string[] } - Sync only specific posts by Instagram ID
 * - {} or no body - Sync all posts (with optional ?limit= query param)
 *
 * Logic lives in lib/sync/instagram-posts (shared with the MCP sync_metrics tool).
 */

import { NextRequest, NextResponse } from "next/server";
import { syncAccountPosts, SyncError } from "@/lib/sync/instagram-posts";

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

    const result = await syncAccountPosts(id, { limit, postIds: body.postIds });
    return NextResponse.json({ success: true, synced: result.synced, new: result.new });
  } catch (error) {
    if (error instanceof SyncError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[api:posts/sync] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to sync posts: ${message}` },
      { status: 500 }
    );
  }
}
