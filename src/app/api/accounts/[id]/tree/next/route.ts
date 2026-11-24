/**
 * GET /api/accounts/[id]/tree/next
 * The tree's decision layer: per-node verdicts vs the account's own baseline
 * + ranked next actions ("post this next, and why"). Read-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getTreeNext } from "@/lib/notion/tree-verdicts";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json({ error: `Account "${id}" not found` }, { status: 404 });
    }
    const notion = account.notion as NotionConfig | undefined;
    if (!notion?.treeDataSourceId && !notion?.postsDataSourceId) {
      return NextResponse.json({
        data: { baseline: { avgReach: 0, measuredPosts: 0 }, verdicts: [], next: [] },
      });
    }
    const data = await getTreeNext(id, notion, account.primaryNiche);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[api:tree:next]", error);
    return NextResponse.json({ error: "Failed to compute tree verdicts" }, { status: 500 });
  }
}
