import { describe, it, expect } from "vitest";
import { buildComingUp } from "@/lib/share/coming-up";

const posts = [
  { id: "aaaa-1", title: "In link", status: "Draft", postDate: "2026-10-23" },
  { id: "bbbb-2", title: "Later carousel", questionAnswered: "Sell first or buy first?", type: "Carousel", status: "Draft", postDate: "2026-10-30" },
  { id: "cccc-3", title: "Planned idea", status: "Idea", postDate: "2026-10-25" },
  { id: "dddd-4", title: "Already posted", status: "Posted", postDate: "2026-10-25" },
  { id: "eeee-5", title: "In the past", status: "Draft", postDate: "2026-10-01" },
  { id: "ffff-6", title: "No date", status: "Draft" },
];

describe("buildComingUp", () => {
  it("lists future planned posts not in the link, by date, titles only", () => {
    const r = buildComingUp(posts, ["aaaa1"], "2026-10-21");
    expect(r).toEqual([
      { date: "2026-10-25", title: "Planned idea", type: undefined },
      { date: "2026-10-30", title: "Sell first or buy first?", type: "Carousel" },
    ]);
  });

  it("never includes slides or strategy fields", () => {
    const r = buildComingUp(posts, [], "2026-10-21");
    for (const item of r) expect(Object.keys(item).sort()).toEqual(["date", "title", "type"]);
  });

  it("respects the limit", () => {
    expect(buildComingUp(posts, [], "2026-10-21", 1)).toHaveLength(1);
  });
});
