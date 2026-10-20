/**
 * Baseline capture
 *
 * One shared function used by:
 *  - the Instagram OAuth callback (auto-capture on connect, via next/server `after`)
 *  - POST /api/accounts/[id]/baseline (manual capture / dry run)
 *
 * Rules:
 *  - Never save a baseline built from a failed Instagram call. A failed call
 *    used to be saved as all zeros, which made later reports show fake growth.
 *  - Every attempt records its outcome on the account (account.baselineStatus)
 *    so the admin can see whether a baseline exists and why it failed.
 *  - Auto-capture is idempotent: if the account already has a baseline with
 *    Instagram data, reconnecting does not create a second one. Empty
 *    baselines (saved by the old bug) don't count.
 */

import type { Baseline } from "@/lib/types/results";

const GRAPH = "https://graph.facebook.com/v21.0";
const INSIGHT_METRICS = [
  "reach",
  "profile_views",
  "website_clicks",
  "accounts_engaged",
  "total_interactions",
] as const;

export type FetchLike = (url: string) => Promise<{ json: () => Promise<unknown> }>;

export type InstagramBaselineResult =
  | { ok: true; data: NonNullable<Baseline["instagram"]> }
  | { ok: false; error: string };

interface GraphError {
  error?: { message?: string; code?: number };
}

interface InsightsResponse extends GraphError {
  data?: Array<{
    name: string;
    total_value?: { value?: number };
    values?: Array<{ value?: number }>;
  }>;
}

interface UserResponse extends GraphError {
  followers_count?: number;
  media_count?: number;
}

export async function fetchInstagramBaseline(
  accessToken: string,
  userId: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  now: number = Date.now()
): Promise<InstagramBaselineResult> {
  try {
    const until = Math.floor(now / 1000);
    const since = until - 30 * 24 * 60 * 60;

    const insightsUrl = new URL(`${GRAPH}/${userId}/insights`);
    insightsUrl.searchParams.set("metric", INSIGHT_METRICS.join(","));
    insightsUrl.searchParams.set("period", "day");
    insightsUrl.searchParams.set("metric_type", "total_value");
    insightsUrl.searchParams.set("since", String(since));
    insightsUrl.searchParams.set("until", String(until));
    insightsUrl.searchParams.set("access_token", accessToken);

    const insights = (await (await fetchImpl(insightsUrl.toString())).json()) as InsightsResponse;
    if (insights.error) {
      return { ok: false, error: `Instagram insights: ${insights.error.message ?? "unknown error"}` };
    }
    if (!Array.isArray(insights.data) || insights.data.length === 0) {
      return { ok: false, error: "Instagram insights returned no data" };
    }

    const totals: Record<string, number> = {};
    for (const metric of insights.data) {
      let total = 0;
      if (metric.total_value?.value !== undefined) {
        total = metric.total_value.value;
      } else if (metric.values) {
        total = metric.values.reduce((sum, v) => sum + (v.value || 0), 0);
      }
      totals[metric.name] = total;
    }

    const userUrl = new URL(`${GRAPH}/${userId}`);
    userUrl.searchParams.set("fields", "followers_count,media_count");
    userUrl.searchParams.set("access_token", accessToken);
    const user = (await (await fetchImpl(userUrl.toString())).json()) as UserResponse;
    if (user.error) {
      return { ok: false, error: `Instagram profile: ${user.error.message ?? "unknown error"}` };
    }

    const reach = totals.reach ?? 0;
    const accountsEngaged = totals.accounts_engaged ?? 0;
    const avgEngagementRate = reach > 0 ? (accountsEngaged / reach) * 100 : 0;

    return {
      ok: true,
      data: {
        reach,
        profileVisits: totals.profile_views ?? 0,
        websiteClicks: totals.website_clicks ?? 0,
        accountsEngaged,
        totalInteractions: totals.total_interactions ?? 0,
        followers: user.followers_count ?? 0,
        followersGained: 0,
        postsCount: user.media_count ?? 0,
        avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/** Minimal slice of the Mongo Db API used here (keeps tests simple). */
export interface BaselineDb {
  collection(name: string): {
    findOne(filter: Record<string, unknown>, options?: Record<string, unknown>): Promise<Record<string, unknown> | null>;
    insertOne(doc: Record<string, unknown>): Promise<unknown>;
    updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<unknown>;
  };
}

export type BaselineSource = "auto-connect" | "manual";

export interface CaptureOptions {
  accountId: string;
  source: BaselineSource;
  notes?: string;
  clientEstimate?: Baseline["clientEstimate"];
  dryRun?: boolean;
  fetchImpl?: FetchLike;
  now?: Date;
}

export type CaptureResult =
  | { status: "captured"; baseline: Baseline & { source: BaselineSource } }
  | { status: "dry-run"; baseline: Baseline & { source: BaselineSource } }
  | { status: "skipped"; reason: string; existingBaselineId?: string }
  | { status: "failed"; error: string };

export async function captureBaseline(db: BaselineDb, opts: CaptureOptions): Promise<CaptureResult> {
  const now = opts.now ?? new Date();
  const accounts = db.collection("accounts");
  const baselines = db.collection("baselines");

  const recordStatus = async (status: Record<string, unknown>) => {
    if (opts.dryRun) return;
    await accounts.updateOne(
      { id: opts.accountId },
      { $set: { baselineStatus: { ...status, source: opts.source, attemptedAt: now }, updatedAt: now } }
    );
  };

  const account = await accounts.findOne({ id: opts.accountId });
  if (!account) return { status: "failed", error: "Account not found" };

  if (opts.source === "auto-connect" && !opts.dryRun) {
    // Only a baseline that actually has Instagram data counts. Empty records
    // saved by the old bug must not block a proper capture.
    const existing = await baselines.findOne({ accountId: opts.accountId, instagram: { $ne: null } });
    if (existing && existing.instagram) {
      return {
        status: "skipped",
        reason: "Account already has a baseline",
        existingBaselineId: existing.id as string | undefined,
      };
    }
  }

  const ig = (account.platforms as { instagram?: { connected?: boolean; accessToken?: string; userId?: string } } | undefined)
    ?.instagram;
  if (!ig?.connected || !ig.accessToken || !ig.userId) {
    const error = "Instagram is not connected for this account";
    await recordStatus({ state: "failed", error });
    return { status: "failed", error };
  }

  const result = await fetchInstagramBaseline(ig.accessToken, ig.userId, opts.fetchImpl, now.getTime());
  if (!result.ok) {
    await recordStatus({ state: "failed", error: result.error });
    return { status: "failed", error: result.error };
  }

  const baseline: Baseline & { source: BaselineSource } = {
    id: `baseline_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    accountId: opts.accountId,
    capturedAt: now,
    period: "30d",
    instagram: result.data,
    clientEstimate: opts.clientEstimate,
    notes: opts.notes || `Baseline captured on ${now.toLocaleDateString()}`,
    source: opts.source,
  };

  if (opts.dryRun) return { status: "dry-run", baseline };

  await baselines.insertOne(baseline as unknown as Record<string, unknown>);
  await recordStatus({ state: "captured", baselineId: baseline.id, capturedAt: now });
  return { status: "captured", baseline };
}
