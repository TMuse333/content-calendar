/**
 * Graphics Queue API
 * GET /api/graphics/queue?agentId={agentId}
 *
 * Returns posts ready for graphic creation.
 * Designed for Graphics App to embed/fetch.
 *
 * Returns posts in status: content-ready, revision
 */

import { NextRequest, NextResponse } from "next/server";
import { getScheduledPostsByAgent } from "@/lib/mongodb/scheduled-posts";

export const dynamic = "force-dynamic";

// CORS headers for Graphics App access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get all posts for this agent
    const allPosts = await getScheduledPostsByAgent(agentId, { limit: 200 });

    // Filter to posts needing graphics work
    const contentReady = allPosts.filter((p) => p.status === "content-ready");
    const revision = allPosts.filter((p) => p.status === "revision");
    const rendered = allPosts.filter((p) => p.status === "rendered");
    const inReview = allPosts.filter((p) => p.status === "in-review");

    return NextResponse.json(
      {
        data: {
          // Posts needing graphics
          needsGraphic: contentReady.map((p) => ({
            id: p.id,
            agentId: p.agentId,
            scheduledFor: p.scheduledFor,
            dayOfWeek: p.dayOfWeek,
            intent: p.intent,
            content: p.content,
            status: p.status,
          })),

          // Posts needing revision
          needsRevision: revision.map((p) => ({
            id: p.id,
            agentId: p.agentId,
            scheduledFor: p.scheduledFor,
            dayOfWeek: p.dayOfWeek,
            intent: p.intent,
            content: p.content,
            status: p.status,
            graphicId: p.graphicId,
            clientFeedback: p.clientFeedback,
            revisionHistory: p.revisionHistory,
          })),

          // Recently rendered (for reference)
          recentlyRendered: [...rendered, ...inReview].map((p) => ({
            id: p.id,
            agentId: p.agentId,
            scheduledFor: p.scheduledFor,
            intent: p.intent,
            status: p.status,
            graphicId: p.graphicId,
            graphicPreviewUrl: p.graphicPreviewUrl,
          })),
        },
        counts: {
          needsGraphic: contentReady.length,
          needsRevision: revision.length,
          recentlyRendered: rendered.length + inReview.length,
        },
        // Include webhook URL for convenience
        webhookUrl: `/api/calendar/${agentId}/posts/{postId}/link-graphic`,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[api:graphics/queue]", error);
    return NextResponse.json(
      { error: "Failed to fetch graphics queue" },
      { status: 500, headers: corsHeaders }
    );
  }
}
