import { describe, it, expect } from "vitest";
import { buildPipeline, issuesFor } from "@/lib/pipeline/summary";
import type { NotionPost } from "@/lib/notion/types";

const post = (o: Partial<NotionPost>): NotionPost => ({ id: "a-b", title: "T", status: "Idea", ...o } as NotionPost);

describe("buildPipeline", () => {
  const posts = [
    post({ id: "1", status: "Ready for review", questionAnswered: "Q", previewUrls: ["a", "b", "c"] }),
    post({ id: "2", status: "Ready for review", questionAnswered: "Q" }),
    post({ id: "3", status: "Draft", postDate: "2026-10-25", questionAnswered: "Q", previewUrls: ["x"] }),
    post({ id: "4", status: "Draft", postDate: "2026-10-22", questionAnswered: "Q", previewUrls: ["y"] }),
    post({ id: "5", status: "Approved", questionAnswered: "Q", previewUrls: ["z"] }),
    post({ id: "6", status: "Posted" }),
    post({ id: "7", status: "Idea" }),
  ];
  const r = buildPipeline(posts);

  it("groups by who it's waiting on and hides Posted", () => {
    expect(r.counts).toEqual({ "waiting-client": 2, building: 2, "to-schedule": 1, scheduled: 0, ideas: 1 });
  });
  it("sorts by post date", () => {
    expect(r.columns.building.map((i) => i.id)).toEqual(["4", "3"]);
  });
  it("counts slides and links to Notion", () => {
    expect(r.columns["waiting-client"][0].slides).toBe(3);
    expect(r.columns["waiting-client"][0].previewUrls).toEqual(["a", "b", "c"]);
    expect(r.columns["waiting-client"][0].notionUrl).toBe("https://www.notion.so/1");
  });
  it("flags posts the client would see broken", () => {
    expect(r.columns["waiting-client"][1].issues).toContain("No preview: client sees an empty box");
    expect(r.columns["to-schedule"][0].issues).toContain("No post date");
    expect(r.issueCount).toBe(2);
  });
});

describe("issuesFor", () => {
  it("ideas have no issues", () => {
    expect(issuesFor(post({ status: "Idea" }))).toEqual([]);
  });
});
