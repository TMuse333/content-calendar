/**
 * Review Item API
 *
 * PATCH /api/review/[token]/[postId] - Client approves or requests changes
 *
 * Updates post status in Notion:
 * - "approve" → status becomes "Approved"
 * - "request-changes" → status stays "Ready for review" (could add comment)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountByReviewToken } from "@/lib/mongodb/accounts";
import { getPostById, updatePostStatus } from "@/lib/notion";
import type { NotionConfig, PostStatus } from "@/lib/notion/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ token: string; itemId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { token, itemId: postId } = await params;
    const body = await request.json();

    // 1. Validate token
    const account = await getAccountByReviewToken(token);
    if (!account) {
      return NextResponse.json(
        { error: "Invalid or expired review link" },
        { status: 404 }
      );
    }

    // 2. Check Notion config
    if (!account.notion?.postsDataSourceId) {
      return NextResponse.json(
        { error: "Account not configured" },
        { status: 400 }
      );
    }

    const notionConfig: NotionConfig = {
      postsDataSourceId: account.notion.postsDataSourceId,
      topicsDataSourceId: account.notion.topicsDataSourceId || "",
    };

    // 3. Get the post
    const post = await getPostById(notionConfig, postId);
    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // 4. Check if post is reviewable
    if (post.status !== "Ready for review") {
      return NextResponse.json(
        { error: "This post is not available for review" },
        { status: 400 }
      );
    }

    // 5. Validate action
    const { action, comment } = body;

    if (!action || !["approve", "request-changes"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'request-changes'" },
        { status: 400 }
      );
    }

    // 6. Determine new status
    let newStatus: PostStatus;
    if (action === "approve") {
      newStatus = "Approved";
    } else {
      // For "request-changes", keep as Ready for Review
      // The comment could be stored in a separate field
      // For now, we just acknowledge the request
      newStatus = "Ready for review";
    }

    // 7. Update in Notion (only if approving)
    if (action === "approve") {
      const result = await updatePostStatus(notionConfig, postId, newStatus, comment);

      return NextResponse.json({
        success: true,
        data: {
          postId: result.postId,
          newStatus: result.newStatus,
          action,
        },
      });
    } else {
      // For changes requested, just acknowledge
      // In a full implementation, you'd store the comment somewhere
      return NextResponse.json({
        success: true,
        data: {
          postId,
          newStatus: post.status,
          action,
          comment: comment || null,
          message: "Changes requested. We'll review your feedback.",
        },
      });
    }
  } catch (error) {
    console.error("[api:review-item:update]", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}
