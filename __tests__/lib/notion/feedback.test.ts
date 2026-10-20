import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
const retrieve = vi.fn();
vi.mock("@/lib/notion/client", () => ({
  getNotionClient: () => ({ pages: { create, retrieve } }),
}));

import { createPostFeedback, getPostById, pageBelongsToDataSource } from "@/lib/notion/service";

const config = {
  postsDataSourceId: "collection://09d0f481-0d99-4e07-a65d-685ac13c4304",
  topicsDataSourceId: "collection://topics",
  feedbackDataSourceId: "collection://b1a1e31b-1425-4f4e-a4bf-8b8541ef76de",
};

beforeEach(() => {
  create.mockReset();
  retrieve.mockReset();
});

describe("pageBelongsToDataSource", () => {
  it("matches regardless of dashes / collection:// prefix", () => {
    const page = { parent: { data_source_id: "09d0f4810d994e07a65d685ac13c4304" } };
    expect(pageBelongsToDataSource(page, config.postsDataSourceId)).toBe(true);
  });
  it("rejects a page from another account's posts database", () => {
    const page = { parent: { data_source_id: "1c008d8f-d602-8240-b6c2-873a1e071c55" } };
    expect(pageBelongsToDataSource(page, config.postsDataSourceId)).toBe(false);
  });
  it("allows when Notion doesn't report a data source parent", () => {
    expect(pageBelongsToDataSource({ parent: { database_id: "x" } }, config.postsDataSourceId)).toBe(true);
  });
});

describe("getPostById ownership check", () => {
  it("returns null for a post in a different account's database", async () => {
    retrieve.mockResolvedValue({
      id: "p1",
      parent: { data_source_id: "1c008d8f-d602-8240-b6c2-873a1e071c55" },
      properties: {},
    });
    expect(await getPostById(config, "p1")).toBeNull();
  });
});

describe("createPostFeedback", () => {
  it("creates a row in the account's Feedback database with the form's fields", async () => {
    create.mockResolvedValue({ id: "fb-123" });
    const r = await createPostFeedback(config, {
      postId: "3fc0-aaaa-bbbb",
      postTitle: "71 Morrison Lane",
      comment: "Swap the second photo",
    });

    expect(r).toEqual({ feedbackId: "fb-123" });
    const arg = create.mock.calls[0][0];
    expect(arg.parent).toEqual({ type: "data_source_id", data_source_id: "b1a1e31b-1425-4f4e-a4bf-8b8541ef76de" });
    expect(arg.properties.Feedback.title[0].text.content).toBe("Changes requested: 71 Morrison Lane");
    expect(arg.properties.About.select.name).toBe("A specific post");
    expect(arg.properties["How do you feel about it?"].select.name).toBe("Needs changes");
    expect(arg.properties.Comments.rich_text[0].text.content).toBe("Swap the second photo");
    expect(arg.properties.Handled.status.name).toBe("New");
    expect(arg.properties["Which post?"].rich_text[1].text.link.url).toBe("https://www.notion.so/3fc0aaaabbbb");
    // Never writes strategy fields
    expect(Object.keys(arg.properties)).not.toContain("Status");
  });

  it("throws when the account has no Feedback database", async () => {
    await expect(
      createPostFeedback({ ...config, feedbackDataSourceId: undefined }, { postId: "p", postTitle: "t", comment: "c" })
    ).rejects.toThrow("Feedback database not configured");
  });
});
