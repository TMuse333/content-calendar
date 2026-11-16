/**
 * GET /api/accounts/[id]/tree/evidence
 * The situation tree with the data behind each node (stories, breakthrough,
 * posts, IG metrics). Powers the React Flow interactive tree.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getTreeWithEvidence } from "@/lib/notion/tree-evidence";
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
      return NextResponse.json({ data: [], count: 0 });
    }
    const nodes = await getTreeWithEvidence(id, notion, account.primaryNiche);
    return NextResponse.json({ data: nodes, count: nodes.length });
  } catch (error) {
    console.error("[api:tree:evidence]", error);
    return NextResponse.json({ error: "Failed to read tree evidence" }, { status: 500 });
  }
}
