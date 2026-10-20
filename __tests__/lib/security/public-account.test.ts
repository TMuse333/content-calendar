import { describe, it, expect } from "vitest";
import { toPublicAccount, toPublicAccounts } from "@/lib/security/public-account";

const account = {
  _id: { toHexString: () => "6aa8d43c269d732dd91392e5" },
  id: "thomas-musial",
  name: "Thomas Musial",
  platforms: {
    instagram: {
      connected: true,
      accessToken: "EAA-page-token",
      userAccessToken: "EAA-user-token",
      userId: "1784",
      username: "thomas__musial",
      facebookPageName: "Thomas",
      connectedAt: new Date("2026-10-01T00:00:00Z"),
      expiresAt: new Date("2026-11-30T00:00:00Z"),
    },
  },
  reviewPortal: {
    token: "secret-review-token",
    tokenCreatedAt: "2026-10-16",
    tokenExpiresAt: "2027-01-14",
    checklist: [{ apiKey: "nested-secret", label: "ok" }],
  },
  notion: { postsDataSourceId: "collection://x" },
};

describe("toPublicAccount", () => {
  const clean = toPublicAccount(account) as unknown as Record<string, any>;
  const json = JSON.stringify(clean);

  it("removes Instagram/Facebook tokens", () => {
    expect(json).not.toContain("EAA-page-token");
    expect(json).not.toContain("EAA-user-token");
    expect(clean.platforms.instagram.accessToken).toBeUndefined();
    expect(clean.platforms.instagram.userAccessToken).toBeUndefined();
  });

  it("removes the review portal token but says one exists", () => {
    expect(json).not.toContain("secret-review-token");
    expect(clean.reviewPortal.hasToken).toBe(true);
    expect(clean.reviewPortal.tokenExpiresAt).toBe("2027-01-14");
  });

  it("removes secrets nested in arrays", () => {
    expect(json).not.toContain("nested-secret");
    expect(clean.reviewPortal.checklist[0].label).toBe("ok");
  });

  it("keeps everything the UI needs", () => {
    expect(clean.id).toBe("thomas-musial");
    expect(clean._id).toBe("6aa8d43c269d732dd91392e5");
    expect(clean.platforms.instagram).toMatchObject({ connected: true, username: "thomas__musial", userId: "1784" });
    expect(clean.platforms.instagram.connectedAt).toBeInstanceOf(Date);
    expect(clean.notion.postsDataSourceId).toBe("collection://x");
  });

  it("does not mutate the original", () => {
    expect(account.platforms.instagram.accessToken).toBe("EAA-page-token");
  });

  it("handles lists and empty values", () => {
    expect(toPublicAccounts([account, account])).toHaveLength(2);
    expect(toPublicAccount(null)).toBeNull();
  });
});
