/**
 * MCP publish tools — every external call mocked. Checks the guard rails:
 * confirm required, blockers refuse, never double-posts, no token leaks, and a
 * Notion write-back failure still reports the post as live (no retry bait).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const TOKEN = "EAA-secret-page-token";

const account = {
  id: "greg-caseley",
  platforms: { instagram: { connected: true, username: "silver250", accessToken: TOKEN, userId: "ig1" } },
  notion: { postsDataSourceId: "collection://posts" },
};

const approved = {
  id: "p550", title: "What should I list my house at?", status: "Approved",
  caption: "So what should I list it at?", previewUrls: ["s1", "s2", "s3", "s4", "s5", "s6"],
};

const getAccountById = vi.fn();
const getPostById = vi.fn();
const getPosts = vi.fn();
const updatePostStatus = vi.fn();
const pagesUpdate = vi.fn();
const publishSlides = vi.fn();

vi.mock("@/lib/mongodb/accounts", () => ({ getAccountById: (...a: unknown[]) => getAccountById(...a) }));
vi.mock("@/lib/notion", () => ({
  getPosts: (...a: unknown[]) => getPosts(...a),
  getPostById: (...a: unknown[]) => getPostById(...a),
  updatePostStatus: (...a: unknown[]) => updatePostStatus(...a),
}));
vi.mock("@/lib/notion/client", () => ({ getNotionClient: () => ({ pages: { update: (...a: unknown[]) => pagesUpdate(...a) } }) }));
vi.mock("@/lib/publish/instagram", () => ({ publishSlidesToInstagram: (...a: unknown[]) => publishSlides(...a) }));

import { registerPublishTools, publishBlockers } from "@/lib/mcp/publish-tools";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (args: any) => Promise<{ content: { text: string }[]; isError?: boolean }>;
const handlers = new Map<string, Handler>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
registerPublishTools({ registerTool: (name: string, _c: unknown, h: Handler) => handlers.set(name, h) } as any);

async function call(name: string, args: Record<string, unknown>) {
  const res = await handlers.get(name)!(args);
  const text = res.content[0].text;
  expect(text, `${name} leaked the token`).not.toContain(TOKEN);
  return { res, text, data: res.isError ? undefined : JSON.parse(text) };
}

beforeEach(() => {
  vi.clearAllMocks();
  getAccountById.mockImplementation(async (id: string) => (id === "greg-caseley" ? account : null));
  getPostById.mockImplementation(async () => ({ ...approved }));
  getPosts.mockImplementation(async () => [
    approved,
    { id: "done", title: "Saint John", status: "Posted", igPostLink: "https://instagram.com/p/x", previewUrls: ["a"] },
    { id: "rev", title: "Pending", status: "Ready for review", previewUrls: ["a"], caption: "c" },
  ]);
  publishSlides.mockResolvedValue({ mediaId: "m1", permalink: "https://www.instagram.com/p/NEW/", jpegUrls: [] });
  updatePostStatus.mockResolvedValue({ success: true });
  pagesUpdate.mockResolvedValue({});
});

describe("publishBlockers", () => {
  it("passes an approved post with slides + caption", () => expect(publishBlockers(approved)).toEqual([]));
  it("flags posted / wrong status / no slides / too many / no caption", () => {
    expect(publishBlockers({ ...approved, igPostLink: "x" })[0]).toMatch(/Already posted/);
    expect(publishBlockers({ ...approved, status: "Ready for review" })[0]).toMatch(/Approved or Scheduled/);
    expect(publishBlockers({ ...approved, previewUrls: [] })).toContain("No slides attached in Notion");
    expect(publishBlockers({ ...approved, previewUrls: Array(11).fill("s") })[0]).toMatch(/max out at 10/);
    expect(publishBlockers({ ...approved, caption: " " })).toContain("No caption");
  });
});

describe("MCP publish tools", () => {
  it("registers exactly three tools", () => {
    expect([...handlers.keys()].sort()).toEqual(["list_publishable", "preview_post", "publish_post"]);
  });

  it("list_publishable: only Approved/Scheduled and not yet posted", async () => {
    const { data } = await call("list_publishable", { accountId: "greg-caseley" });
    expect(data.instagram).toBe("silver250");
    expect(data.posts.map((p: { id: string }) => p.id)).toEqual(["p550"]);
  });

  it("preview_post: full caption + slides, ready, no side effects", async () => {
    const { data } = await call("preview_post", { accountId: "greg-caseley", postId: "p550" });
    expect(data).toMatchObject({ ready: true, instagram: "silver250", caption: approved.caption });
    expect(data.slides).toHaveLength(6);
    expect(publishSlides).not.toHaveBeenCalled();
    expect(updatePostStatus).not.toHaveBeenCalled();
  });

  it("publish_post: refuses without confirm", async () => {
    const { res } = await call("publish_post", { accountId: "greg-caseley", postId: "p550", confirm: false });
    expect(res.isError).toBe(true);
    expect(publishSlides).not.toHaveBeenCalled();
  });

  it("publish_post: refuses an already-posted post (no double post)", async () => {
    getPostById.mockResolvedValueOnce({ ...approved, igPostLink: "https://instagram.com/p/old" });
    const { res, text } = await call("publish_post", { accountId: "greg-caseley", postId: "p550", confirm: true });
    expect(res.isError).toBe(true);
    expect(text).toMatch(/Already posted/);
    expect(publishSlides).not.toHaveBeenCalled();
  });

  it("publish_post: refuses when Instagram isn't connected", async () => {
    getAccountById.mockResolvedValueOnce({ ...account, platforms: { instagram: { connected: false } } });
    const { res, text } = await call("publish_post", { accountId: "greg-caseley", postId: "p550", confirm: true });
    expect(res.isError).toBe(true);
    expect(text).toMatch(/not connected/);
  });

  it("publish_post: publishes, then writes Posted + IG link back to Notion", async () => {
    const { data } = await call("publish_post", { accountId: "greg-caseley", postId: "p550", confirm: true });
    expect(data).toMatchObject({ published: true, permalink: "https://www.instagram.com/p/NEW/", notionUpdated: true });
    expect(publishSlides).toHaveBeenCalledWith(expect.objectContaining({ slides: approved.previewUrls, caption: approved.caption }));
    expect(updatePostStatus).toHaveBeenCalledWith(expect.anything(), "p550", "Posted");
    expect(pagesUpdate).toHaveBeenCalledWith({ page_id: "p550", properties: { "IG post link": { url: "https://www.instagram.com/p/NEW/" } } });
  });

  it("publish_post: Notion write-back failure still reports published (with a warning)", async () => {
    updatePostStatus.mockRejectedValueOnce(new Error("Notion 502"));
    const { res, data } = await call("publish_post", { accountId: "greg-caseley", postId: "p550", confirm: true });
    expect(res.isError).toBeFalsy();
    expect(data).toMatchObject({ published: true, notionUpdated: false });
    expect(data.warning).toMatch(/by hand/);
  });

  it("publish_post: Instagram failure is an error and Notion is untouched", async () => {
    publishSlides.mockRejectedValueOnce(new Error("Carousel container failed"));
    const { res, text } = await call("publish_post", { accountId: "greg-caseley", postId: "p550", confirm: true });
    expect(res.isError).toBe(true);
    expect(text).toMatch(/Carousel container failed/);
    expect(updatePostStatus).not.toHaveBeenCalled();
  });
});
