/**
 * Nightly orchestrator — one Hobby-plan cron slot doing everything due daily:
 *
 *   1. publish backstop  → /api/cron/publish-scheduled (same-day catch-up)
 *   2. IG token refresh  → /api/auth/instagram/refresh (all expiring ≤7 days;
 *                          tokens die ~60 days — this kills the silent cliff)
 *   3. metrics sync      → /api/accounts/[id]/posts/sync per connected account
 *                          (keeps Mongo metrics fresh daily)
 *
 * Wired to the 23:30 UTC slot in vercel.json. On a Pro plan, split these into
 * separate schedules and retire this route. Steps are independent — one
 * failing never blocks the others; everything is reported in the response.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccounts } from "@/lib/mongodb/accounts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface StepResult {
  step: string;
  ok: boolean;
  detail?: unknown;
  error?: string;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  const results: StepResult[] = [];

  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      const detail = await fn();
      results.push({ step: name, ok: true, detail });
    } catch (err) {
      results.push({ step: name, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  };

  // 1. Publish backstop (same auth, same host)
  await step("publish-scheduled", async () => {
    const res = await fetch(`${origin}/api/cron/publish-scheduled`, {
      headers: { authorization: `Bearer ${cronSecret}` },
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
    return body;
  });

  // 2. Token refresh — all tokens expiring within the route's 7-day window
  await step("token-refresh", async () => {
    const res = await fetch(`${origin}/api/auth/instagram/refresh`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
    return body;
  });

  // 3. Metrics sync per connected account
  await step("metrics-sync", async () => {
    const accounts = await getAccounts();
    const synced: Record<string, string> = {};
    for (const account of accounts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ig = (account as any).platforms?.instagram;
      if (!ig?.connected || !ig.accessToken) continue;
      try {
        const res = await fetch(`${origin}/api/accounts/${account.id}/posts/sync`, { method: "POST" });
        synced[account.id] = res.ok ? "ok" : `HTTP ${res.status}`;
      } catch (err) {
        synced[account.id] = err instanceof Error ? err.message : "failed";
      }
    }
    return synced;
  });

  const ok = results.every((r) => r.ok);
  if (!ok) console.error("[cron:orchestrator] failures:", JSON.stringify(results));
  return NextResponse.json({ ok, ranAt: new Date().toISOString(), results });
}
