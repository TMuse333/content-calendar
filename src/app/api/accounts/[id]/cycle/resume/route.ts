/**
 * Cycle resume — arm everything this call has waiting.
 *
 * POST /api/accounts/[id]/cycle/resume
 * Headers: x-publish-secret: <PUBLISH_SECRET>   (it ARMS real auto-publishes)
 * Body: { callId: string, startDate?: "YYYY-MM-DD" }
 *
 * Every APPROVED post tied to the call (no IG link yet) gets a Post date —
 * one per day starting startDate (default tomorrow) — and Status=Scheduled.
 * The existing ~11:00 Atlantic publish cron takes it from there. Emits
 * post.scheduled per post with lineage.callId.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { updatePostStatus } from "@/lib/notion";
import { getNotionClient } from "@/lib/notion/client";
import { postsForCall } from "@/lib/pipeline/cycle";
import { sendNotification } from "@/lib/notify";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const secret = process.env.PUBLISH_SECRET;
  if (!secret || req.headers.get("x-publish-secret") !== secret) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { callId?: string; startDate?: string };
    if (!body.callId) return NextResponse.json({ error: "callId is required" }, { status: 400 });
    const callId = body.callId;

    const account = await getAccountById(id);
    if (!account?.notion?.postsDataSourceId) {
      return NextResponse.json({ error: `Account "${id}" has no Notion config` }, { status: 404 });
    }
    const notion = account.notion as NotionConfig;

    const posts = await postsForCall(id, callId, notion);
    const approved = posts.filter((p) => p.status === "Approved" && !p.igPostLink);
    if (approved.length === 0) {
      return NextResponse.json({
        scheduled: [],
        message: "Nothing to arm — no Approved, unpublished posts tied to this call.",
      });
    }

    const start =
      body.startDate && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate)
        ? new Date(`${body.startDate}T00:00:00Z`)
        : new Date(Date.now() + 86_400_000); // tomorrow

    const scheduled: Array<{ postId: string; title: string; date: string }> = [];
    for (let i = 0; i < approved.length; i++) {
      const post = approved[i];
      const date = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (getNotionClient().pages as any).update({
        page_id: post.postId,
        properties: { "Post date": { date: { start: date } } },
      });
      await updatePostStatus(notion, post.postId, "Scheduled");
      scheduled.push({ postId: post.postId, title: post.title, date });
      await sendNotification({
        accountId: id,
        event: "post.scheduled",
        data: { title: post.title, postId: post.postId, date, via: "cycle.resume" },
        lineage: { callId },
      });
    }

    return NextResponse.json({
      scheduled,
      message: `${scheduled.length} post(s) armed, one per day from ${scheduled[0].date}. The publish cron takes it from here.`,
    });
  } catch (error) {
    console.error("[api:cycle:resume]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Resume failed" },
      { status: 500 }
    );
  }
}
