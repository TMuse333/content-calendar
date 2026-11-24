/**
 * Call intake — the First Mile of THE CYCLE.
 *
 * POST /api/accounts/[id]/calls/intake
 * Headers: x-publish-secret: <PUBLISH_SECRET>
 * Body: { transcript: string, name?: string, date?: string, recordingUrl?: string }
 *
 * One POST does the whole landing:
 *   1. Create the Notion Call row (analysis summary + Nodes touched in the body)
 *   2. Child page "Transcript — <name>" (EXACT prefix — getCallTranscript
 *      discovers by it; transcript is page-body only, never a property)
 *   3. Auto-chain the existing debrief: coverage analysis + video ideas →
 *      Mongo cache → staged recap draft
 *   4. Emit call.transcript_landed → debrief.ready → ideas.ready
 *
 * Idempotent by transcript hash: re-POSTing the same text returns the
 * original call untouched. The Zoom webhook becomes caller #2 later.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getTree, markPrimaryNiche } from "@/lib/notion/tree";
import { getNotionClient } from "@/lib/notion/client";
import { analyzeTranscript, writeCallAnalysisToNotion } from "@/lib/calls/analyze";
import { generateVideoIdeas } from "@/lib/calls/ideas";
import { writeTranscriptChildPage } from "@/lib/notion/transcript-write";
import { saveDebrief, hashTranscript } from "@/lib/mongodb/debriefs";
import { getCallIntake, insertCallIntake } from "@/lib/mongodb/call-intakes";
import { buildRecap } from "@/lib/calls/recap";
import { upsertDraft } from "@/lib/mongodb/recaps";
import { sendNotification } from "@/lib/notify";
import type { NotionConfig } from "@/lib/notion/types";

const MODEL = "claude-opus-4-8";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const secret = process.env.PUBLISH_SECRET;
  if (secret && req.headers.get("x-publish-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const account = await getAccountById(id);
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    const notion = account.notion as NotionConfig | undefined;
    if (!notion?.postsDataSourceId) {
      return NextResponse.json({ error: "Account has no Notion config" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      transcript?: string;
      name?: string;
      date?: string;
      recordingUrl?: string;
    };
    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    if (transcript.length < 200) {
      return NextResponse.json({ error: "Transcript missing or too short" }, { status: 400 });
    }
    if (transcript.length > 500_000) {
      return NextResponse.json({ error: "Transcript too large" }, { status: 413 });
    }

    // Idempotency: the same transcript lands exactly once.
    const transcriptHash = hashTranscript(transcript);
    const existing = await getCallIntake(id, transcriptHash);
    if (existing) {
      return NextResponse.json({
        duplicate: true,
        callId: existing.callId,
        url: existing.callUrl ?? null,
        name: existing.name,
      });
    }

    const date = typeof body.date === "string" && body.date ? body.date : new Date().toISOString().slice(0, 10);
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : `Story call — ${date}`;

    const nodes = markPrimaryNiche(await getTree(notion), account.primaryNiche);
    if (nodes.length === 0) {
      return NextResponse.json({ error: "No tree found for this account" }, { status: 400 });
    }

    // S1 + S2 in one pass (two Opus calls, ~50s).
    const [analysis, ideas] = await Promise.all([
      analyzeTranscript(transcript, nodes),
      generateVideoIdeas(transcript, nodes),
    ]);

    // Call row with the analysis breakdown in its body.
    const saved = await writeCallAnalysisToNotion(notion, { title: name, date, analysis });
    if (!saved) {
      return NextResponse.json({ error: "Could not create the Call row in Notion" }, { status: 502 });
    }
    const callId = saved.pageId;

    if (body.recordingUrl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (getNotionClient().pages as any)
        .update({ page_id: callId, properties: { Recording: { url: body.recordingUrl } } })
        .catch((e: unknown) => console.warn("[api:calls:intake] recording url write failed", e));
    }

    const transcriptPage = await writeTranscriptChildPage(callId, name, transcript);
    await sendNotification({
      accountId: id,
      event: "call.transcript_landed",
      data: { callId, name, date, blocks: transcriptPage.blocks, source: "intake" },
      lineage: { callId },
    });

    // Cache the debrief + stage the recap draft (same as the debrief route).
    await saveDebrief({ accountId: id, callId, transcriptHash, analysis, ideas, model: MODEL }).catch((e) =>
      console.warn("[api:calls:intake] debrief cache save failed", e)
    );
    await sendNotification({
      accountId: id,
      event: "debrief.ready",
      data: {
        callId,
        name,
        hit: analysis.coverage.filter((c) => c.verdict === "hit").length,
        grazed: analysis.coverage.filter((c) => c.verdict === "grazed").length,
        silent: analysis.coverage.filter((c) => c.verdict === "silent").length,
      },
      lineage: { callId },
    });

    await buildRecap(id, callId)
      .then((r) => (r.ok ? upsertDraft(id, callId, r.data) : undefined))
      .catch((e) => console.warn("[api:calls:intake] recap draft failed", e));

    await sendNotification({
      accountId: id,
      event: "ideas.ready",
      data: { callId, name, count: ideas.length },
      lineage: { callId },
    });

    await insertCallIntake({
      accountId: id,
      transcriptHash,
      callId,
      callUrl: saved.url,
      name,
      createdAt: new Date(),
    }).catch((e) => console.warn("[api:calls:intake] ledger write failed", e));

    return NextResponse.json({
      callId,
      url: saved.url,
      name,
      date,
      analysis,
      ideas,
      transcriptBlocks: transcriptPage.blocks,
    });
  } catch (error) {
    console.error("[api:calls:intake]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Intake failed" },
      { status: 500 }
    );
  }
}
