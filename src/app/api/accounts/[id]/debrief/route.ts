/**
 * Debrief = coverage (transcript × tree) + video ideas for a story call.
 *
 * GET  ?callId=…  → the cached debrief for that call (instant), or { cached:false }.
 * GET  (no callId) → list of calls that already have a cached debrief (nav badges).
 * POST { callId }  → computes (two Opus calls, ~50s), caches to Mongo, returns it.
 *
 * The compute is expensive, so the UI loads via GET first and only POSTs on a
 * cache miss or an explicit re-run.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getTree, markPrimaryNiche } from "@/lib/notion/tree";
import { getCallTranscript } from "@/lib/notion/calls";
import { analyzeTranscript } from "@/lib/calls/analyze";
import { generateVideoIdeas } from "@/lib/calls/ideas";
import { getDebrief, listDebriefs, saveDebrief, hashTranscript } from "@/lib/mongodb/debriefs";
import type { NotionConfig } from "@/lib/notion/types";

const MODEL = "claude-opus-4-8";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const callId = request.nextUrl.searchParams.get("callId");

    // no callId → which calls are already analyzed (for the nav list badges)
    if (!callId) {
      const cached = await listDebriefs(id);
      return NextResponse.json({ cached });
    }

    const doc = await getDebrief(id, callId);
    if (!doc) return NextResponse.json({ cached: false });
    return NextResponse.json({
      cached: true,
      analysis: doc.analysis,
      ideas: doc.ideas,
      createdAt: doc.createdAt,
    });
  } catch (error) {
    console.error("[api:debrief:get]", error);
    return NextResponse.json({ error: "Failed to load debrief" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json({ error: `Account "${id}" not found` }, { status: 404 });
    }
    const notion = account.notion as NotionConfig | undefined;
    if (!notion?.treeDataSourceId && !notion?.postsDataSourceId) {
      return NextResponse.json({ error: "Account has no Notion config" }, { status: 400 });
    }

    const body = (await request.json()) as { callId?: string; transcript?: string; refresh?: boolean };
    // Pull the transcript from Notion by callId (preferred); transcript body is a fallback.
    let transcript = body.transcript ?? "";
    if (!transcript && body.callId) {
      transcript = await getCallTranscript(body.callId);
    }
    if (!transcript || transcript.trim().length < 50) {
      return NextResponse.json(
        {
          error: body.callId
            ? "No transcript in Notion for this call yet. Add a 'Transcript —' page under the call row (the video app should write it there)."
            : "Provide a callId or transcript.",
        },
        { status: 400 }
      );
    }

    // Serve the cache unless the transcript changed or a refresh was asked for.
    const transcriptHash = hashTranscript(transcript);
    if (body.callId && !body.refresh) {
      const cached = await getDebrief(id, body.callId);
      if (cached && cached.transcriptHash === transcriptHash) {
        return NextResponse.json({
          analysis: cached.analysis,
          ideas: cached.ideas,
          primaryNiche: account.primaryNiche ?? null,
          cached: true,
          createdAt: cached.createdAt,
        });
      }
    }

    const nodes = markPrimaryNiche(await getTree(notion), account.primaryNiche);
    const [analysis, ideas] = await Promise.all([
      analyzeTranscript(transcript, nodes),
      generateVideoIdeas(transcript, nodes),
    ]);

    // Cache the result per call so reloads are instant (only story calls — i.e. callId).
    if (body.callId) {
      await saveDebrief({ accountId: id, callId: body.callId, transcriptHash, analysis, ideas, model: MODEL }).catch(
        (e) => console.warn("[api:debrief] cache save failed", e)
      );
    }

    return NextResponse.json({ analysis, ideas, primaryNiche: account.primaryNiche ?? null, cached: false });
  } catch (error) {
    console.error("[api:debrief]", error);
    return NextResponse.json({ error: "Debrief failed" }, { status: 500 });
  }
}
