/**
 * Approve Post/Carousel API
 * POST /api/review/:agentId/:postId/approve
 *
 * Handles both ScheduledPosts and ScheduledCarousels:
 * - ScheduledPost: proposed → scheduled, or in-review/revision → approved
 * - ScheduledCarousel: ready → published
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getScheduledPostById,
  approvePost,
  approveScheduleSlot,
} from "@/lib/mongodb/scheduled-posts";
import {
  getScheduledCarouselById,
  approveCarousel,
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

    // First, try ScheduledPosts (pipeline system)
    const scheduledPost = await getScheduledPostById(postId);
    if (scheduledPost && scheduledPost.agentId === agentId) {
      let updated;

      if (scheduledPost.status === "proposed") {
        updated = await approveScheduleSlot(postId);
        console.log(`[review:approve] Schedule slot approved: ${postId}`);
        return NextResponse.json(
          { success: true, type: "scheduled_post", data: updated, message: "Schedule slot approved" },
          { headers: corsHeaders }
        );
      } else if (scheduledPost.status === "in-review" || scheduledPost.status === "revision") {
        updated = await approvePost(postId);
        console.log(`[review:approve] Graphic approved: ${postId}`);
        return NextResponse.json(
          { success: true, type: "scheduled_post", data: updated, message: "Graphic approved" },
          { headers: corsHeaders }
        );
      } else {
        return NextResponse.json(
          { error: `Cannot approve post in status: ${scheduledPost.status}` },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Try ScheduledCarousels (graphic packages system)
    const carousel = await getScheduledCarouselById(postId);
    if (carousel) {
      if (carousel.status !== "ready") {
        return NextResponse.json(
          { error: `Cannot approve carousel in status: ${carousel.status}. Must be "ready".` },
          { status: 400, headers: corsHeaders }
        );
      }

      const updated = await approveCarousel(postId);
      if (!updated) {
        return NextResponse.json(
          { error: "Failed to approve carousel" },
          { status: 500, headers: corsHeaders }
        );
      }

      console.log(`[review:approve] Carousel approved: ${postId}`);
      return NextResponse.json(
        { success: true, type: "scheduled_carousel", data: updated, message: "Carousel approved and published" },
        { headers: corsHeaders }
      );
    }

    // Not found in either collection
    return NextResponse.json(
      { error: "Post or carousel not found" },
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[api:review/approve]", error);
    return NextResponse.json(
      { error: "Failed to approve" },
      { status: 500, headers: corsHeaders }
    );
  }
}
