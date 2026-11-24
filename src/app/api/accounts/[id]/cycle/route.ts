/**
 * Cycle state — WHERE one call's content cycle stands, derived on read.
 *
 * GET /api/accounts/[id]/cycle?callId=X
 * → { callId, station, waitingOn, nextAction, detail }
 *
 * Stations: S1 analyze → S2 ideate (Gate A) → S3 make → S4 schedule/publish →
 * S5 report. Everything is DERIVED from stores that already exist (debrief
 * cache, recap doc, asset_deliveries, Call row relations, Notion post
 * statuses) — there is deliberately NO pipeline collection to drift.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getDebrief } from "@/lib/mongodb/debriefs";
import { getRecap } from "@/lib/mongodb/recaps";
import { postsForCall } from "@/lib/pipeline/cycle";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Days after the last publish before the cycle report is due. */
const METRICS_WINDOW_DAYS = 7;

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const callId = req.nextUrl.searchParams.get("callId");
    if (!callId) return NextResponse.json({ error: "callId is required" }, { status: 400 });

    const account = await getAccountById(id);
    if (!account?.notion?.postsDataSourceId) {
      return NextResponse.json({ error: `Account "${id}" has no Notion config` }, { status: 404 });
    }
    const notion = account.notion as NotionConfig;

    const [debrief, recap] = await Promise.all([getDebrief(id, callId), getRecap(id, callId)]);

    // S1: nothing analyzed yet.
    if (!debrief) {
      return NextResponse.json({
        callId,
        station: "S1 analyze",
        waitingOn: "transcript debrief",
        nextAction: `Drop the transcript at /account/${id}/calls (or POST /api/accounts/${id}/calls/intake)`,
        detail: { debrief: false },
      });
    }

    const posts = await postsForCall(id, callId, notion);
    const approved = posts.filter((p) => p.status === "Approved" && !p.igPostLink);
    const scheduled = posts.filter((p) => p.status === "Scheduled" && !p.igPostLink);
    const published = posts.filter((p) => !!p.igPostLink);
    const detail = {
      debrief: true,
      ideas: debrief.ideas.length,
      recap: recap?.status ?? "none",
      posts: posts.length,
      approved: approved.length,
      scheduled: scheduled.length,
      published: published.length,
    };

    // S2 (Gate A): ideas exist but the operator hasn't approved the recap.
    if (!recap || recap.status === "draft") {
      return NextResponse.json({
        callId,
        station: "S2 ideate (Gate A)",
        waitingOn: "operator taste — approve the recap",
        nextAction: `Review + approve at /account/${id}/recaps (call ${callId})`,
        detail,
      });
    }

    // S3: approved direction, but nothing made/staged yet.
    if (posts.length === 0) {
      return NextResponse.json({
        callId,
        station: "S3 make",
        waitingOn: "renders/carousels for this call",
        nextAction: `video-system POSTs approved renders to /api/accounts/${id}/assets/ingest (carousels: stage_carousel)`,
        detail,
      });
    }

    // S4a: made + approved, not yet armed.
    if (approved.length > 0) {
      return NextResponse.json({
        callId,
        station: "S4 schedule",
        waitingOn: `${approved.length} approved post(s) not yet scheduled`,
        nextAction: `POST /api/accounts/${id}/cycle/resume {"callId":"${callId}"}`,
        detail,
      });
    }

    // S4b: armed, cron will take them.
    if (scheduled.length > 0) {
      return NextResponse.json({
        callId,
        station: "S4 publish",
        waitingOn: `${scheduled.length} scheduled post(s) — publish cron (~11:00 Atlantic)`,
        nextAction: "Nothing — the cron takes it from here",
        detail,
      });
    }

    // Everything published (or nothing ever made it past draft).
    if (published.length > 0) {
      const lastPublish = published
        .map((p) => p.postDate ?? "")
        .sort()
        .at(-1);
      const windowEnd = lastPublish
        ? new Date(new Date(lastPublish).getTime() + METRICS_WINDOW_DAYS * 86_400_000)
        : null;
      const windowOpen = windowEnd && windowEnd > new Date();
      return NextResponse.json({
        callId,
        station: windowOpen ? "S5 metrics window" : "S5 report",
        waitingOn: windowOpen
          ? `metrics window (until ${windowEnd!.toISOString().slice(0, 10)})`
          : "cycle report compile",
        nextAction: windowOpen
          ? "Nothing — nightly metrics sync is collecting"
          : `POST /api/accounts/${id}/reports/cycle {"callId":"${callId}"}`,
        detail,
      });
    }

    // Posts exist but none approved/scheduled/published → still in draft.
    return NextResponse.json({
      callId,
      station: "S3 make",
      waitingOn: `${posts.length} post(s) still in draft/review`,
      nextAction: "Approve the drafts in Notion (Status=Approved), then /cycle/resume",
      detail,
    });
  } catch (error) {
    console.error("[api:cycle]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cycle state failed" },
      { status: 500 }
    );
  }
}
