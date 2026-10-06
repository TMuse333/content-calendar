/**
 * Single Scheduled Post API
 * GET    /api/calendar/:agentId/posts/:postId - Get post details
 * PATCH  /api/calendar/:agentId/posts/:postId - Update post
 * DELETE /api/calendar/:agentId/posts/:postId - Delete post
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getScheduledPostById,
  updateScheduledPost,
  deleteScheduledPost,
} from "@/lib/mongodb/scheduled-posts";
import type { UpdateScheduledPostRequest } from "@/lib/types/scheduled-post";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ agentId: string; postId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId, postId } = await params;

    const post = await getScheduledPostById(postId);

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Verify post belongs to this agent
    if (post.agentId !== agentId) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: post });
  } catch (error) {
    console.error("[api:calendar/posts/[postId] GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId, postId } = await params;
    const body: UpdateScheduledPostRequest = await request.json();

    // First verify the post exists and belongs to this agent
    const existing = await getScheduledPostById(postId);
    if (!existing || existing.agentId !== agentId) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    const updated = await updateScheduledPost(postId, body);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[api:calendar/posts/[postId] PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId, postId } = await params;

    // First verify the post exists and belongs to this agent
    const existing = await getScheduledPostById(postId);
    if (!existing || existing.agentId !== agentId) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    const deleted = await deleteScheduledPost(postId);

    return NextResponse.json({
      success: deleted,
    });
  } catch (error) {
    console.error("[api:calendar/posts/[postId] DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
