/**
 * Preview Posts API
 * GET /api/accounts/[id]/posts/preview
 *
 * Fetches posts from Instagram WITHOUT saving - for selection UI.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { fetchPostInsights } from "@/lib/platforms/instagram";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

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

    // Fetch posts from Instagram (don't save)
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

    // Return preview data
    return NextResponse.json({
      success: true,
      posts: result.data.map((p) => ({
        instagramId: p.id,
        caption: p.caption,
        mediaType: p.mediaType,
        thumbnailUrl: p.thumbnailUrl,
        timestamp: p.timestamp,
        reach: p.reach,
        impressions: p.impressions,
        engagement: p.engagement,
      })),
    });
  } catch (error) {
    console.error("[api:posts/preview] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch posts: ${message}` },
      { status: 500 }
    );
  }
}
