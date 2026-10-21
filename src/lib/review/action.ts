/**
 * Client review actions (Approve / Request changes)
 *
 * Kept separate from the route so it can be tested with mocked Notion calls.
 *
 * Rules (Spec: review portal):
 *  - Approve        → Post Status = "Approved"
 *  - Request changes → comment saved to the account's Feedback database, then
 *                      Post Status = "Draft"
 *  - Only Status and Feedback are written. Strategy fields are never touched.
 *  - Idempotent: repeating the same action (double-tap, retry) succeeds
 *    without a second write or a duplicate feedback row.
 *  - Feedback is written BEFORE the status change, so if saving the comment
 *    fails the post stays in review and the client can simply try again.
 */

import type { NotionConfig, NotionPost, PostStatus } from "@/lib/notion/types";

export type ReviewAction = "approve" | "request-changes";

export interface ReviewDeps {
  getPostById(config: NotionConfig, postId: string): Promise<NotionPost | null>;
  updatePostStatus(config: NotionConfig, postId: string, status: PostStatus): Promise<unknown>;
  createPostFeedback(
    config: NotionConfig,
    input: { postId: string; postTitle: string; comment: string }
  ): Promise<{ feedbackId: string }>;
}

export type ReviewResult =
  | { ok: true; postId: string; newStatus: PostStatus; action: ReviewAction; alreadyDone?: boolean; feedbackId?: string; message: string }
  | { ok: false; status: number; error: string };

const TARGET: Record<ReviewAction, PostStatus> = {
  approve: "Approved",
  "request-changes": "Draft",
};

export async function performReviewAction(
  deps: ReviewDeps,
  config: NotionConfig,
  postId: string,
  action: unknown,
  comment: unknown
): Promise<ReviewResult> {
  if (action !== "approve" && action !== "request-changes") {
    return { ok: false, status: 400, error: "Invalid action. Must be 'approve' or 'request-changes'" };
  }
  const text = typeof comment === "string" ? comment.trim() : "";
  if (action === "request-changes" && !text) {
    return { ok: false, status: 400, error: "Please add a comment so we know what to change." };
  }

  const post = await deps.getPostById(config, postId);
  if (!post) return { ok: false, status: 404, error: "Post not found" };

  const target = TARGET[action];

  // Idempotent repeat: already in the state this action produces.
  if (post.status === target) {
    return {
      ok: true,
      postId,
      newStatus: target,
      action,
      alreadyDone: true,
      message: action === "approve" ? "Already approved." : "Changes already requested. We're on it.",
    };
  }

  if (post.status !== "Ready for review") {
    return { ok: false, status: 400, error: "This post is not available for review" };
  }

  if (action === "approve") {
    await deps.updatePostStatus(config, postId, target);
    return { ok: true, postId, newStatus: target, action, message: "Approved. Thanks!" };
  }

  if (!config.feedbackDataSourceId) {
    return {
      ok: false,
      status: 503,
      error: "Feedback isn't set up for this account yet. Please message Thomas directly.",
    };
  }

  const { feedbackId } = await deps.createPostFeedback(config, {
    postId,
    postTitle: post.title,
    comment: text,
  });
  await deps.updatePostStatus(config, postId, target);

  return {
    ok: true,
    postId,
    newStatus: target,
    action,
    feedbackId,
    message: "Got it. Your notes were sent and we'll revise this post.",
  };
}
