/**
 * Request Revision API
 * POST /api/review/:agentId/:postId/revision
 *
 * Client requests changes to a rendered graphic.
 * Handles both ScheduledPosts and ScheduledCarousels.
 * Body: { feedback: string }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getScheduledPostById,
  requestRevision,
} from "@/lib/mongodb/scheduled-posts";
import {
  getScheduledCarouselById,
  requestCarouselRevision,
} from "@/lib/mongodb/graphic-packages";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

interface RouteParams {
  params: Promise<{ agentId: string; postId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId, postId } = await params;
    const body = await request.json();

    // Validate feedback
    if (!body.feedback || typeof body.feedback !== "string") {
      return NextResponse.json(
        { error: "feedback is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // First, try ScheduledPosts (pipeline system)
    const scheduledPost = await getScheduledPostById(postId);
    if (scheduledPost && scheduledPost.agentId === agentId) {
      if (scheduledPost.status !== "in-review" && scheduledPost.status !== "revision") {
        return NextResponse.json(
          { error: `Cannot request revision for post in status: ${scheduledPost.status}` },
          { status: 400, headers: corsHeaders }
        );
      }

      const updated = await requestRevision(postId, body.feedback);
      if (!updated) {
        return NextResponse.json(
          { error: "Failed to request revision" },
          { status: 500, headers: corsHeaders }
        );
      }

      console.log(`[review:revision] Revision requested for post ${postId}: "${body.feedback}"`);
      return NextResponse.json(
        { success: true, type: "scheduled_post", data: updated, message: "Revision requested" },
        { headers: corsHeaders }
      );
    }

    // Try ScheduledCarousels (graphic packages system)
    const carousel = await getScheduledCarouselById(postId);
    if (carousel) {
      if (carousel.status !== "ready") {
        return NextResponse.json(
          { error: `Cannot request revision for carousel in status: ${carousel.status}. Must be "ready".` },
          { status: 400, headers: corsHeaders }
        );
      }

      const updated = await requestCarouselRevision(postId, body.feedback);
      if (!updated) {
        return NextResponse.json(
          { error: "Failed to request revision" },
          { status: 500, headers: corsHeaders }
        );
      }

      console.log(`[review:revision] Revision requested for carousel ${postId}: "${body.feedback}"`);
      return NextResponse.json(
        { success: true, type: "scheduled_carousel", data: updated, message: "Revision requested" },
        { headers: corsHeaders }
      );
    }

    // Not found in either collection
    return NextResponse.json(
      { error: "Post or carousel not found" },
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[api:review/revision]", error);
    return NextResponse.json(
      { error: "Failed to request revision" },
      { status: 500, headers: corsHeaders }
    );
  }
}
