/**
 * Review Item API
 *
 * PATCH /api/review/[token]/[postId] - Client approves or requests changes
 *
 * Updates post status in Notion:
 * - "approve" → status becomes "Approved"
 * - "request-changes" → comment saved to the account's Feedback database,
 *   status becomes "Draft"
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountByReviewToken } from "@/lib/mongodb/accounts";
import { getPostById, updatePostStatus, createPostFeedback } from "@/lib/notion";
import type { NotionConfig } from "@/lib/notion/types";
import { performReviewAction } from "@/lib/review/action";

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
      feedbackDataSourceId: account.notion.feedbackDataSourceId,
    };

    // 3. Approve / request changes (validation, idempotency, feedback write)
    const { action, comment } = body;
    const result = await performReviewAction(
      { getPostById, updatePostStatus, createPostFeedback },
      notionConfig,
      postId,
      action,
      comment
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      data: {
        postId: result.postId,
        newStatus: result.newStatus,
        action: result.action,
        alreadyDone: result.alreadyDone ?? false,
        message: result.message,
      },
    });
  } catch (error) {
    console.error("[api:review-item:update]", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}
