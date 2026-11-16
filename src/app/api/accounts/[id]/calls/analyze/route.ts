/**
 * POST /api/accounts/[id]/calls/analyze — the "process a call" function.
 * Body: { transcript: string, title?: string, date?: string }
 *
 * transcript × tree → Claude coverage analysis → saved as a Calls row in
 * Notion (Nodes touched relations + full breakdown). Returns the analysis
 * either way; the Notion write is best-effort.
 *
 * Guarded by PUBLISH_SECRET (x-publish-secret header) — it spends Claude
 * tokens and writes to the client's Notion.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getTree } from "@/lib/notion/tree";
import { analyzeTranscript, writeCallAnalysisToNotion } from "@/lib/calls/analyze";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await req.json().catch(() => ({}));
    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    if (transcript.length < 200) {
      return NextResponse.json({ error: "Transcript missing or too short" }, { status: 400 });
    }
    if (transcript.length > 500_000) {
      return NextResponse.json({ error: "Transcript too large" }, { status: 413 });
    }

    const nodes = await getTree(notion);
    if (nodes.length === 0) {
      return NextResponse.json({ error: "No tree found for this account" }, { status: 400 });
    }

    const analysis = await analyzeTranscript(transcript, nodes);

    const date = typeof body.date === "string" && body.date ? body.date : new Date().toISOString().slice(0, 10);
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : `Story call — ${date} (auto-analyzed)`;

    const saved = await writeCallAnalysisToNotion(notion, { title, date, analysis });

    return NextResponse.json({
      analysis,
      notion: saved ? { pageId: saved.pageId, url: saved.url } : null,
      nodeCount: nodes.length,
    });
  } catch (error) {
    console.error("[api:calls:analyze]", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
