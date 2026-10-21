/**
 * Client-view review action
 *
 * PATCH /api/accounts/[id]/posts/[postId]/review
 * Body: { action: "approve" | "request-changes", comment?: string }
 *
 * Used by the Approve / Request changes buttons on the client view
 * (/account/[id]/client-view). Same rules as the review-portal route:
 * see src/lib/review/action.ts.
 *
 * Note: the client view is reached by account slug (no token yet). Admin/
 * client auth is a separate follow-up task.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPostById, updatePostStatus, createPostFeedback } from "@/lib/notion";
import type { NotionConfig } from "@/lib/notion/types";
import { performReviewAction } from "@/lib/review/action";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; postId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, postId } = await params;
    const body = await request.json().catch(() => ({}));

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    if (!account.notion?.postsDataSourceId) {
      return NextResponse.json({ error: "Account not configured" }, { status: 400 });
    }

    const config: NotionConfig = {
      postsDataSourceId: account.notion.postsDataSourceId,
      topicsDataSourceId: account.notion.topicsDataSourceId || "",
      feedbackDataSourceId: account.notion.feedbackDataSourceId,
    };

    const result = await performReviewAction(
      { getPostById, updatePostStatus, createPostFeedback },
      config,
      postId,
      body.action,
      body.comment
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
    console.error("[api:accounts/posts/review]", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}
