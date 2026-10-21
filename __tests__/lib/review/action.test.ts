import { describe, it, expect, vi, beforeEach } from "vitest";
import { performReviewAction, type ReviewDeps } from "@/lib/review/action";
import type { NotionConfig, NotionPost, PostStatus } from "@/lib/notion/types";

const config: NotionConfig = {
  postsDataSourceId: "collection://posts",
  topicsDataSourceId: "collection://topics",
  feedbackDataSourceId: "collection://feedback",
};

function post(status: PostStatus): NotionPost {
  return { id: "post-1", title: "Fall market explainer", status } as NotionPost;
}

let deps: ReviewDeps & {
  getPostById: ReturnType<typeof vi.fn>;
  updatePostStatus: ReturnType<typeof vi.fn>;
  createPostFeedback: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  deps = {
    getPostById: vi.fn(async () => post("Ready for review")),
    updatePostStatus: vi.fn(async () => ({})),
    createPostFeedback: vi.fn(async () => ({ feedbackId: "fb-1" })),
  };
});

describe("performReviewAction — approve", () => {
  it("sets Status = Approved and writes no feedback", async () => {
    const r = await performReviewAction(deps, config, "post-1", "approve", undefined);
    expect(r).toMatchObject({ ok: true, newStatus: "Approved" });
    expect(deps.updatePostStatus).toHaveBeenCalledWith(config, "post-1", "Approved");
    expect(deps.createPostFeedback).not.toHaveBeenCalled();
  });

  it("is idempotent: approving an Approved post does not write again", async () => {
    deps.getPostById.mockResolvedValue(post("Approved"));
    const r = await performReviewAction(deps, config, "post-1", "approve", undefined);
    expect(r).toMatchObject({ ok: true, alreadyDone: true });
    expect(deps.updatePostStatus).not.toHaveBeenCalled();
  });
});

describe("performReviewAction — request changes", () => {
  it("saves the comment to Feedback, then sets Status = Draft", async () => {
    const order: string[] = [];
    deps.createPostFeedback.mockImplementation(async () => {
      order.push("feedback");
      return { feedbackId: "fb-1" };
    });
    deps.updatePostStatus.mockImplementation(async () => {
      order.push("status");
      return {};
    });

    const r = await performReviewAction(deps, config, "post-1", "request-changes", "  Use the blue cover photo  ");

    expect(r).toMatchObject({ ok: true, newStatus: "Draft", feedbackId: "fb-1" });
    expect(deps.createPostFeedback).toHaveBeenCalledWith(config, {
      postId: "post-1",
      postTitle: "Fall market explainer",
      comment: "Use the blue cover photo",
    });
    expect(deps.updatePostStatus).toHaveBeenCalledWith(config, "post-1", "Draft");
    expect(order).toEqual(["feedback", "status"]);
  });

  it("requires a comment", async () => {
    const r = await performReviewAction(deps, config, "post-1", "request-changes", "   ");
    expect(r).toMatchObject({ ok: false, status: 400 });
    expect(deps.createPostFeedback).not.toHaveBeenCalled();
  });

  it("is idempotent: a double-tap does not create a second feedback row", async () => {
    deps.getPostById.mockResolvedValue(post("Draft"));
    const r = await performReviewAction(deps, config, "post-1", "request-changes", "again");
    expect(r).toMatchObject({ ok: true, alreadyDone: true });
    expect(deps.createPostFeedback).not.toHaveBeenCalled();
    expect(deps.updatePostStatus).not.toHaveBeenCalled();
  });

  it("leaves the post in review if saving feedback fails (client can retry)", async () => {
    deps.createPostFeedback.mockRejectedValue(new Error("Notion down"));
    await expect(
      performReviewAction(deps, config, "post-1", "request-changes", "fix caption")
    ).rejects.toThrow("Notion down");
    expect(deps.updatePostStatus).not.toHaveBeenCalled();
  });

  it("returns a friendly error when the account has no Feedback database", async () => {
    const noFeedback = { ...config, feedbackDataSourceId: undefined };
    const r = await performReviewAction(deps, noFeedback, "post-1", "request-changes", "fix caption");
    expect(r).toMatchObject({ ok: false, status: 503 });
    expect(deps.updatePostStatus).not.toHaveBeenCalled();
  });
});

describe("performReviewAction — guards", () => {
  it("rejects unknown actions", async () => {
    const r = await performReviewAction(deps, config, "post-1", "delete", undefined);
    expect(r).toMatchObject({ ok: false, status: 400 });
  });

  it("404s when the post is not in this account (wrong-account token)", async () => {
    deps.getPostById.mockResolvedValue(null);
    const r = await performReviewAction(deps, config, "other-post", "approve", undefined);
    expect(r).toMatchObject({ ok: false, status: 404 });
    expect(deps.updatePostStatus).not.toHaveBeenCalled();
  });

  it("refuses posts that aren't in review (e.g. Posted)", async () => {
    deps.getPostById.mockResolvedValue(post("Posted"));
    const r = await performReviewAction(deps, config, "post-1", "approve", undefined);
    expect(r).toMatchObject({ ok: false, status: 400 });
    expect(deps.updatePostStatus).not.toHaveBeenCalled();
  });
});
