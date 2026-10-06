/**
 * Client Review API
 * GET /api/review/:agentId - Get all posts pending client review
 *
 * Returns posts in status: proposed, in-review, revision
 */

import { NextRequest, NextResponse } from "next/server";
import { getPostsForReview } from "@/lib/mongodb/scheduled-posts";

export const dynamic = "force-dynamic";

// CORS headers for client access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

interface RouteParams {
  params: Promise<{ agentId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await params;

    const posts = await getPostsForReview(agentId);

    // Group by review type
    const proposed = posts.filter((p) => p.status === "proposed");
    const inReview = posts.filter((p) => p.status === "in-review");
    const revision = posts.filter((p) => p.status === "revision");

    return NextResponse.json(
      {
        data: {
          proposed,
          inReview,
          revision,
          all: posts,
        },
        counts: {
          proposed: proposed.length,
          inReview: inReview.length,
          revision: revision.length,
          total: posts.length,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[api:review GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch posts for review" },
      { status: 500, headers: corsHeaders }
    );
  }
}
