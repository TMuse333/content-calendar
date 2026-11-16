/**
 * POST /api/accounts/[id]/debrief
 * Body: { transcript }
 * Runs coverage (transcript × tree) + video ideas in one shot → the recap.
 * Two Claude calls, so give it room.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getTree, markPrimaryNiche } from "@/lib/notion/tree";
import { getCallTranscript } from "@/lib/notion/calls";
import { analyzeTranscript } from "@/lib/calls/analyze";
import { generateVideoIdeas } from "@/lib/calls/ideas";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ id: string }>;
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

    const body = (await request.json()) as { callId?: string; transcript?: string };
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

    const nodes = markPrimaryNiche(await getTree(notion), account.primaryNiche);
    const [analysis, ideas] = await Promise.all([
      analyzeTranscript(transcript, nodes),
      generateVideoIdeas(transcript, nodes),
    ]);

    return NextResponse.json({ analysis, ideas, primaryNiche: account.primaryNiche ?? null });
  } catch (error) {
    console.error("[api:debrief]", error);
    return NextResponse.json({ error: "Debrief failed" }, { status: 500 });
  }
}
