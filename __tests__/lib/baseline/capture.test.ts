import { describe, it, expect, vi } from "vitest";
import {
  captureBaseline,
  fetchInstagramBaseline,
  type BaselineDb,
  type FetchLike,
} from "@/lib/baseline/capture";

// ---------- helpers ----------

function fakeFetch(responses: { insights: unknown; user: unknown }): FetchLike {
  return vi.fn(async (url: string) => ({
    json: async () => (url.includes("/insights") ? responses.insights : responses.user),
  }));
}

const goodInsights = {
  data: [
    { name: "reach", total_value: { value: 1000 } },
    { name: "profile_views", total_value: { value: 120 } },
    { name: "website_clicks", total_value: { value: 8 } },
    { name: "accounts_engaged", total_value: { value: 50 } },
    { name: "total_interactions", values: [{ value: 30 }, { value: 40 }] },
  ],
};
const goodUser = { followers_count: 2400, media_count: 310 };

function fakeDb(opts: { account?: Record<string, unknown> | null; existingBaseline?: Record<string, unknown> | null }) {
  const inserted: Record<string, unknown>[] = [];
  const updates: Array<{ filter: unknown; update: Record<string, unknown> }> = [];
  const db: BaselineDb = {
    collection(name: string) {
      return {
        findOne: async () => (name === "accounts" ? opts.account ?? null : opts.existingBaseline ?? null),
        insertOne: async (doc) => {
          inserted.push(doc);
          return {};
        },
        updateOne: async (filter, update) => {
          updates.push({ filter, update });
          return {};
        },
      };
    },
  };
  return { db, inserted, updates };
}

const connectedAccount = {
  id: "greg-caseley",
  platforms: { instagram: { connected: true, accessToken: "fake-token", userId: "1789" } },
};

// ---------- fetchInstagramBaseline ----------

describe("fetchInstagramBaseline", () => {
  it("sums metrics from both total_value and daily values", async () => {
    const r = await fetchInstagramBaseline("t", "1", fakeFetch({ insights: goodInsights, user: goodUser }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      reach: 1000,
      profileVisits: 120,
      websiteClicks: 8,
      accountsEngaged: 50,
      totalInteractions: 70,
      followers: 2400,
      postsCount: 310,
      avgEngagementRate: 5,
    });
  });

  it("fails (does not return zeros) when insights returns an error", async () => {
    const r = await fetchInstagramBaseline(
      "t",
      "1",
      fakeFetch({ insights: { error: { message: "(#10) Permission denied" } }, user: goodUser })
    );
    expect(r).toEqual({ ok: false, error: "Instagram insights: (#10) Permission denied" });
  });

  it("fails when insights returns no data", async () => {
    const r = await fetchInstagramBaseline("t", "1", fakeFetch({ insights: { data: [] }, user: goodUser }));
    expect(r.ok).toBe(false);
  });

  it("fails when the profile call errors", async () => {
    const r = await fetchInstagramBaseline(
      "t",
      "1",
      fakeFetch({ insights: goodInsights, user: { error: { message: "expired token" } } })
    );
    expect(r).toEqual({ ok: false, error: "Instagram profile: expired token" });
  });

  it("fails cleanly when the network throws", async () => {
    const throwing: FetchLike = async () => {
      throw new Error("ECONNRESET");
    };
    expect(await fetchInstagramBaseline("t", "1", throwing)).toEqual({ ok: false, error: "ECONNRESET" });
  });
});

// ---------- captureBaseline ----------

describe("captureBaseline", () => {
  const fetchOk = fakeFetch({ insights: goodInsights, user: goodUser });
  const now = new Date("2026-10-20T18:00:00Z");

  it("auto-connect: saves a baseline and records captured status on the account", async () => {
    const { db, inserted, updates } = fakeDb({ account: connectedAccount });
    const r = await captureBaseline(db, { accountId: "greg-caseley", source: "auto-connect", fetchImpl: fetchOk, now });

    expect(r.status).toBe("captured");
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ accountId: "greg-caseley", source: "auto-connect", period: "30d" });
    const status = (updates[0].update.$set as Record<string, Record<string, unknown>>).baselineStatus;
    expect(status).toMatchObject({ state: "captured", source: "auto-connect" });
  });

  it("does NOT save a baseline when Instagram errors, and records the failure", async () => {
    const { db, inserted, updates } = fakeDb({ account: connectedAccount });
    const r = await captureBaseline(db, {
      accountId: "greg-caseley",
      source: "auto-connect",
      fetchImpl: fakeFetch({ insights: { error: { message: "not a business account" } }, user: goodUser }),
      now,
    });

    expect(r).toEqual({ status: "failed", error: "Instagram insights: not a business account" });
    expect(inserted).toHaveLength(0);
    const status = (updates[0].update.$set as Record<string, Record<string, unknown>>).baselineStatus;
    expect(status).toMatchObject({ state: "failed", error: "Instagram insights: not a business account" });
  });

  it("auto-connect is idempotent: skips when a baseline already exists", async () => {
    const { db, inserted } = fakeDb({
      account: connectedAccount,
      existingBaseline: { id: "baseline_old", instagram: { reach: 1507 } },
    });
    const r = await captureBaseline(db, { accountId: "greg-caseley", source: "auto-connect", fetchImpl: fetchOk, now });
    expect(r).toEqual({ status: "skipped", reason: "Account already has a baseline", existingBaselineId: "baseline_old" });
    expect(inserted).toHaveLength(0);
  });

  it("auto-connect ignores an EMPTY old baseline (instagram: null) and captures a real one", async () => {
    const { db, inserted } = fakeDb({ account: connectedAccount, existingBaseline: { id: "baseline_empty", instagram: null } });
    const r = await captureBaseline(db, { accountId: "greg-caseley", source: "auto-connect", fetchImpl: fetchOk, now });
    expect(r.status).toBe("captured");
    expect(inserted).toHaveLength(1);
  });

  it("manual capture still works when a baseline already exists", async () => {
    const { db, inserted } = fakeDb({ account: connectedAccount, existingBaseline: { id: "baseline_old" } });
    const r = await captureBaseline(db, { accountId: "greg-caseley", source: "manual", fetchImpl: fetchOk, now });
    expect(r.status).toBe("captured");
    expect(inserted).toHaveLength(1);
  });

  it("dry run returns data without saving or touching the account", async () => {
    const { db, inserted, updates } = fakeDb({ account: connectedAccount });
    const r = await captureBaseline(db, { accountId: "greg-caseley", source: "manual", dryRun: true, fetchImpl: fetchOk, now });
    expect(r.status).toBe("dry-run");
    expect(inserted).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it("fails when Instagram is not connected", async () => {
    const { db, inserted } = fakeDb({ account: { id: "x", platforms: {} } });
    const r = await captureBaseline(db, { accountId: "x", source: "auto-connect", fetchImpl: fetchOk, now });
    expect(r).toEqual({ status: "failed", error: "Instagram is not connected for this account" });
    expect(inserted).toHaveLength(0);
  });

  it("fails when the account does not exist", async () => {
    const { db } = fakeDb({ account: null });
    const r = await captureBaseline(db, { accountId: "nope", source: "manual", fetchImpl: fetchOk, now });
    expect(r).toEqual({ status: "failed", error: "Account not found" });
  });
});
