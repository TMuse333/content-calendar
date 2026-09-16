/**
 * Posts API
 * GET /api/accounts/[id]/posts - List posts
 * PATCH /api/accounts/[id]/posts - Bulk update (reserved for future)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPosts, getPostStats } from "@/lib/mongodb/posts";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;

    // Verify account exists
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    // Parse query params
    const hasTranscript = searchParams.get("hasTranscript");
    const hasClassification = searchParams.get("hasClassification");
    const contentType = searchParams.get("contentType");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const includeStats = searchParams.get("includeStats") === "true";

    const posts = await getPosts(id, {
      hasTranscript:
        hasTranscript === "true" ? true : hasTranscript === "false" ? false : undefined,
      hasClassification:
        hasClassification === "true" ? true : hasClassification === "false" ? false : undefined,
      contentType: contentType || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    const response: {
      data: typeof posts;
      count: number;
      stats?: Awaited<ReturnType<typeof getPostStats>>;
    } = {
      data: posts,
      count: posts.length,
    };

    if (includeStats) {
      response.stats = await getPostStats(id);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api:posts GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
