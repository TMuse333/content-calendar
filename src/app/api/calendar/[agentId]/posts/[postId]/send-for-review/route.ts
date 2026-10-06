/**
 * Send for Review API
 * POST /api/calendar/:agentId/posts/:postId/send-for-review
 *
 * Sends a rendered graphic to the client for approval.
 * Transitions status: rendered → in-review
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getScheduledPostById,
  sendForReview,
} from "@/lib/mongodb/scheduled-posts";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ agentId: string; postId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId, postId } = await params;

    // Verify post exists and belongs to agent
    const existing = await getScheduledPostById(postId);
    if (!existing) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (existing.agentId !== agentId) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Must be rendered to send for review
    if (existing.status !== "rendered") {
      return NextResponse.json(
        { error: `Cannot send for review: post status is ${existing.status}, expected "rendered"` },
        { status: 400 }
      );
    }

    // Must have a graphic
    if (!existing.graphicId) {
      return NextResponse.json(
        { error: "Cannot send for review: no graphic linked to post" },
        { status: 400 }
      );
    }

    const updated = await sendForReview(postId);

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to send for review" },
        { status: 500 }
      );
    }

    console.log(`[calendar:send-for-review] Post ${postId} sent for client review`);

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Sent for client review",
    });
  } catch (error) {
    console.error("[api:send-for-review]", error);
    return NextResponse.json(
      { error: "Failed to send for review" },
      { status: 500 }
    );
  }
}
