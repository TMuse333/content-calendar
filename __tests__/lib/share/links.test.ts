import { describe, it, expect } from "vitest";
import { buildShareLink, isShareLinkActive, newShareCode, reactionComment } from "@/lib/share/links";

const now = new Date("2026-10-21T16:00:00Z");

describe("buildShareLink", () => {
  it("builds a link with posts + question set, 30-day default expiry", () => {
    const l = buildShareLink({ accountId: "greg", postIds: ["a", "b", "a", 5], questionSet: "content", message: "  Hi  " }, now);
    if ("error" in l) throw new Error(l.error);
    expect(l.postIds).toEqual(["a", "b"]);
    expect(l.questionSet).toBe("content");
    expect(l.message).toBe("Hi");
    expect(l.expiresAt.getTime() - now.getTime()).toBe(30 * 86400000);
    expect(l.code.length).toBeGreaterThanOrEqual(20);
  });
  it("allows questions only, and caps expiry at 90 days", () => {
    const l = buildShareLink({ accountId: "g", postIds: [], questionSet: "strategy", expiresInDays: 365 }, now);
    if ("error" in l) throw new Error(l.error);
    expect(l.expiresAt.getTime() - now.getTime()).toBe(90 * 86400000);
  });
  it("rejects an empty link and unknown question sets", () => {
    expect(buildShareLink({ accountId: "g", postIds: [], questionSet: "nope" }, now)).toEqual({ error: "Pick at least one post or a question set." });
  });
});

describe("isShareLinkActive", () => {
  it("is false when missing, revoked or expired", () => {
    expect(isShareLinkActive(null, now)).toBe(false);
    expect(isShareLinkActive({ expiresAt: new Date("2026-10-22"), revoked: true }, now)).toBe(false);
    expect(isShareLinkActive({ expiresAt: new Date("2026-10-20") }, now)).toBe(false);
    expect(isShareLinkActive({ expiresAt: new Date("2026-11-20") }, now)).toBe(true);
  });
});

describe("codes and comments", () => {
  it("codes are random and url-safe", () => {
    const a = newShareCode();
    expect(a).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(a).not.toBe(newShareCode());
  });
  it("formats Notion comments with the client's first name", () => {
    expect(reactionComment("Greg Caseley", "looks-good")).toBe("Greg (share link): 👍 Looks good");
    expect(reactionComment("Greg Caseley", "change", "Swap photo")).toBe("Greg (share link): ✏️ Change requested — Swap photo");
  });
});
