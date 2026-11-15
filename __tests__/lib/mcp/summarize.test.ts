import { describe, it, expect } from "vitest";
import {
  classifyPostKind,
  findSilentNodes,
  indexNotionByLink,
  normLink,
  storyVsListingRatio,
  summarizeByKind,
} from "@/lib/mcp/summarize";
import type { TreeNode } from "@/lib/notion/tree";

const node = (o: Partial<TreeNode> & { id: string }): TreeNode => ({
  name: o.id,
  level: "Situation",
  status: "Untested",
  childIds: [],
  storyIds: [],
  postIds: [],
  callIds: [],
  askIds: [],
  changeIds: [],
  ...o,
});

describe("normLink", () => {
  it("matches on shortcode: www, /reel/ vs /p/, query, trailing slash, case", () => {
    const key = normLink("https://www.instagram.com/p/ABC/?igsh=x");
    expect(normLink("https://instagram.com/p/abc")).toBe(key);
    expect(normLink("instagram.com/reel/ABC/")).toBe(key);
    expect(normLink("https://www.instagram.com/gregcaseley/p/ABC/")).toBe(key);
    expect(normLink("https://www.instagram.com/p/XYZ/")).not.toBe(key);
  });
  it("empty stays empty (never joins)", () => {
    expect(normLink(undefined)).toBe("");
  });
});

describe("classifyPostKind", () => {
  const byLink = indexNotionByLink([
    { igPostLink: "https://instagram.com/p/STORY/", storyIds: ["s1"] },
    { igPostLink: "https://instagram.com/p/NOSTORY/", storyIds: [] },
  ]);

  it("a Notion Story link wins over the classifier", () => {
    expect(classifyPostKind({ permalink: "https://instagram.com/p/STORY?x=1", contentType: "showcase" }, byLink))
      .toEqual({ kind: "story", kindSource: "notion-story" });
  });
  it("falls back to classifier: case-study = story, showcase = listing", () => {
    expect(classifyPostKind({ permalink: "https://instagram.com/p/NOSTORY/", contentType: "case-study" }, byLink).kind).toBe("story");
    expect(classifyPostKind({ permalink: "https://instagram.com/p/OTHER/", contentType: "showcase" }, byLink))
      .toEqual({ kind: "listing", kindSource: "classifier" });
  });
  it("other classifier types and no signal both land in other", () => {
    expect(classifyPostKind({ contentType: "tutorial" }, byLink)).toEqual({ kind: "other", kindSource: "classifier" });
    expect(classifyPostKind({}, byLink)).toEqual({ kind: "other", kindSource: "none" });
  });
});

describe("summarizeByKind / storyVsListingRatio", () => {
  const s = summarizeByKind([
    { kind: "story", metrics: { reach: 197, likes: 20, saves: 6 } },
    { kind: "story", metrics: { reach: 143, likes: 10, saves: 2 } },
    { kind: "listing", metrics: { reach: 45, likes: 3, saves: 0 } },
    { kind: "listing", metrics: { reach: 55, likes: 5 } },
    { kind: "listing" },
  ]);

  it("averages per kind, missing metrics count as 0", () => {
    expect(s.story).toEqual({ posts: 2, avgReach: 170, avgLikes: 15, avgSaves: 4, bestReach: 197 });
    expect(s.listing).toEqual({ posts: 3, avgReach: 33, avgLikes: 3, avgSaves: 0, bestReach: 55 });
    expect(s.other).toEqual({ posts: 0, avgReach: 0, avgLikes: 0, avgSaves: 0, bestReach: 0 });
  });
  it("ratio is story ÷ listing avg reach, null when a side is empty", () => {
    expect(storyVsListingRatio(s)).toBe(5.2);
    expect(storyVsListingRatio(summarizeByKind([{ kind: "story", metrics: { reach: 100 } }]))).toBeNull();
  });
});

describe("findSilentNodes", () => {
  const nodes = [
    node({ id: "root", level: "Structure", status: undefined }),            // structure: skipped
    node({ id: "a", parentId: "root" }),                                     // silent
    node({ id: "b", parentId: "root", postIds: ["p1"] }),                    // has a post
    node({ id: "c", parentId: "root", storyIds: ["s1"] }),                   // has a story
    node({ id: "d", parentId: "root", status: "Dropped" }),                  // dropped: skipped
    node({ id: "niche", parentId: "root", isPrimaryNiche: true, storyIds: ["s2"] }),
    node({ id: "niche-child", parentId: "niche" }),                          // silent, under niche
  ];

  it("returns only testable nodes with no posts and no stories, niche branch first", () => {
    const silent = findSilentNodes(nodes);
    expect(silent.map((n) => n.id)).toEqual(["niche-child", "a"]);
    expect(silent[0]).toMatchObject({ underPrimaryNiche: true, isPrimaryNiche: false });
  });
  it("survives a parent cycle", () => {
    const cyc = [node({ id: "x", parentId: "y" }), node({ id: "y", parentId: "x" })];
    expect(findSilentNodes(cyc)).toHaveLength(2);
  });
});
