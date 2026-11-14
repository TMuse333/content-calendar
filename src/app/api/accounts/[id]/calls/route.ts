/**
 * GET /api/accounts/[id]/calls — list the client's story calls (live Notion).
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { listCalls } from "@/lib/calls/analyze";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const account = await getAccountById(id);
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const notion = account.notion as NotionConfig | undefined;
    if (!notion?.postsDataSourceId) {
      return NextResponse.json({ data: [], count: 0 });
    }
    const calls = await listCalls(notion);
    return NextResponse.json({ data: calls, count: calls.length });
  } catch (error) {
    console.error("[api:calls]", error);
    return NextResponse.json({ error: "Failed to list calls" }, { status: 500 });
  }
}
