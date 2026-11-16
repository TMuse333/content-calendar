/**
 * MCP read tools, end to end with every data source mocked.
 * Checks output shape, unknown-account errors, and that no secret-shaped
 * field (tokens, recording URLs, transcripts) can come back in a response.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const SECRETS = ["EAA-page-token", "EAA-user-token", "https://rec.example/secret.mp4", "VERBATIM TRANSCRIPT"];

const account = {
  id: "greg-caseley",
  name: "Greg Caseley",
  primaryNiche: "Moving here from away",
  platforms: { instagram: { connected: true, username: "greg", accessToken: SECRETS[0], userAccessToken: SECRETS[1] } },
  notion: { postsDataSourceId: "collection://posts", treeDataSourceId: "collection://tree" },
};

const igPosts = [
  { instagramId: "1", permalink: "https://www.instagram.com/p/STORY/", postedAt: "2026-11-10", mediaType: "CAROUSEL_ALBUM",
    caption: "Saint John to PEI", metrics: { reach: 197, likes: 20, comments: 3, saves: 6 },
    classification: { contentType: "insight" }, transcript: SECRETS[3], accessToken: SECRETS[0] },
  { instagramId: "2", permalink: "https://www.instagram.com/p/LIST1/", postedAt: "2026-11-08", mediaType: "IMAGE",
    caption: "Just listed", metrics: { reach: 45, likes: 4, comments: 0, saves: 0 }, classification: { contentType: "showcase" } },
  { instagramId: "3", permalink: "https://www.instagram.com/p/LIST2/", postedAt: "2026-11-01", mediaType: "IMAGE",
    caption: "Open house", metrics: { reach: 55, likes: 6, comments: 1, saves: 1 }, classification: { contentType: "showcase" } },
];

const notionPosts = [
  { id: "np1", title: "Saint John story", status: "Posted", igPostLink: "https://instagram.com/p/story", storyIds: ["s1"], previewUrls: ["a", "b"] },
  { id: "np2", title: "Pricing story", status: "Ready for review", postDate: "2026-11-20", previewUrls: ["1","2","3","4","5","6"], caption: "x" },
  { id: "np3", title: "Winter idea", status: "Idea" },
  { id: "np4", title: "Old", status: "Archived" },
];

const tree = [
  { id: "root", name: "Buyers", level: "Structure", childIds: [], storyIds: [], postIds: [], callIds: [], askIds: [], changeIds: [] },
  { id: "away", name: "Moving here from away", level: "Situation", status: "Working", parentId: "root", childIds: ["away-kids"],
    storyIds: ["s1"], postIds: ["np1"], callIds: ["c1"], askIds: [], changeIds: [], notes: "internal" },
  { id: "away-kids", name: "Moving with kids", level: "Sub-branch", status: "Untested", parentId: "away", childIds: [],
    storyIds: [], postIds: [], callIds: [], askIds: [], changeIds: [] },
  { id: "winter", name: "Listing in winter", level: "Situation", status: "Untested", parentId: "root", childIds: [],
    storyIds: [], postIds: [], callIds: [], askIds: [], changeIds: [] },
];

const calls = [
  { id: "c1", name: "Nov 5 story call", type: "Story", date: "2026-11-05", followUps: "send Paragon links", followUpsDone: false,
    recordingUrl: SECRETS[2], transcript: SECRETS[3], nodesTouchedIds: ["away", "winter"], storyIds: ["s1"],
    postsProposedIds: [], treeChangeIds: [], questionIds: [], askIds: [] },
];

const getAccountById = vi.fn();
const notionGetPosts = vi.fn();

vi.mock("@/lib/mongodb/accounts", () => ({
  getAccounts: vi.fn(async () => [account]),
  getAccountById: (...a: unknown[]) => getAccountById(...a),
}));
vi.mock("@/lib/mongodb/posts", () => ({
  getPosts: vi.fn(async () => igPosts),
  getPostStats: vi.fn(async () => ({ total: 3, videos: 0, images: 2, carousels: 1, transcribed: 0, classified: 3 })),
}));
vi.mock("@/lib/notion", () => ({ getPosts: (...a: unknown[]) => notionGetPosts(...a) }));
vi.mock("@/lib/notion/tree", async () => {
  const actual = await vi.importActual<typeof import("@/lib/notion/tree")>("@/lib/notion/tree");
  return { markPrimaryNiche: actual.markPrimaryNiche, getTree: vi.fn(async () => tree) };
});
vi.mock("@/lib/notion/calls", () => ({ getCalls: vi.fn(async () => calls) }));

import { registerReadTools } from "@/lib/mcp/tools";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (args: any) => Promise<{ content: { text: string }[]; isError?: boolean }>;
const handlers = new Map<string, Handler>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
registerReadTools({ registerTool: (name: string, _cfg: unknown, h: Handler) => handlers.set(name, h) } as any);

async function call(name: string, args: Record<string, unknown> = {}) {
  const res = await handlers.get(name)!(args);
  const text = res.content[0].text;
  for (const s of SECRETS) expect(text, `${name} leaked a secret`).not.toContain(s);
  return { res, text, data: res.isError ? undefined : JSON.parse(text) };
}

beforeEach(() => {
  getAccountById.mockImplementation(async (id: string) => (id === "greg-caseley" ? account : null));
  notionGetPosts.mockImplementation(async () => notionPosts);
});

describe("MCP read tools", () => {
  it("registers exactly the five read-only tools", () => {
    expect([...handlers.keys()].sort()).toEqual(["get_calls", "get_post_metrics", "get_tree", "get_upcoming", "list_accounts"]);
  });

  it("list_accounts: slug, niche, IG username — no tokens", async () => {
    const { data } = await call("list_accounts");
    expect(data).toEqual([{ id: "greg-caseley", name: "Greg Caseley", primaryNiche: "Moving here from away",
      instagram: { connected: true, username: "greg" } }]);
  });

  it("get_post_metrics: story vs listing split from the Notion Story link + classifier", async () => {
    const { data } = await call("get_post_metrics", { accountId: "greg-caseley", limit: 2 });
    expect(data.posts).toHaveLength(2);
    expect(data.posts[0]).toMatchObject({ instagramId: "1", kind: "story", kindSource: "notion-story" });
    expect(data.byKind.story).toMatchObject({ posts: 1, avgReach: 197 });
    expect(data.byKind.listing).toMatchObject({ posts: 2, avgReach: 50 }); // covers all posts, not just the page
    expect(data.storyVsListing).toBe(3.9);
    expect(data.warning).toBeUndefined();
  });

  it("get_post_metrics: Notion down → classifier-only kinds + a warning, not an error", async () => {
    notionGetPosts.mockRejectedValueOnce(new Error("Notion 502"));
    const { res, data } = await call("get_post_metrics", { accountId: "greg-caseley", limit: 25 });
    expect(res.isError).toBeFalsy();
    expect(data.warning).toMatch(/Notion 502/);
    expect(data.posts[0]).toMatchObject({ kind: "other", kindSource: "classifier" });
  });

  it("get_tree: evidence counts, niche flag, silent nodes niche-branch first, no relation id arrays", async () => {
    const { data } = await call("get_tree", { accountId: "greg-caseley" });
    expect(data.count).toBe(4);
    const away = data.nodes.find((n: { id: string }) => n.id === "away");
    expect(away).toMatchObject({ isPrimaryNiche: true, evidence: { stories: 1, posts: 1, calls: 1, asks: 0 } });
    expect(away.storyIds).toBeUndefined();
    expect(data.silentNodes.map((n: { id: string }) => n.id)).toEqual(["away-kids", "winter"]);
  });

  it("get_calls: counts only — no recording URL or transcript", async () => {
    const { data } = await call("get_calls", { accountId: "greg-caseley" });
    expect(data[0]).toEqual({ id: "c1", name: "Nov 5 story call", type: "Story", date: "2026-11-05",
      followUps: "send Paragon links", followUpsDone: false, nodesTouched: 2, stories: 1 });
  });

  it("get_upcoming: everything not Posted/Archived, with slide counts", async () => {
    const { data } = await call("get_upcoming", { accountId: "greg-caseley" });
    expect(data.map((p: { title: string }) => p.title)).toEqual(["Pricing story", "Winter idea"]);
    expect(data[0]).toMatchObject({ status: "Ready for review", postDate: "2026-11-20", slides: 6, hasCaption: true });
  });

  it.each(["get_post_metrics", "get_tree", "get_calls", "get_upcoming"])("%s: unknown account is a clear error", async (name) => {
    const { res, text } = await call(name, { accountId: "nobody", limit: 5 });
    expect(res.isError).toBe(true);
    expect(text).toMatch(/"nobody" not found/);
  });
});
