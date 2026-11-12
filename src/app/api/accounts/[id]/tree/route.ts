/**
 * Waterline tree API
 * GET /api/accounts/[id]/tree — live situation-tree nodes with status + relations.
 *
 * First checkpoint for task/CT-tree-read-models. Reads Notion live (no sync).
 * Internal fields (why/notes) are included here because this is the admin route;
 * the public, permission-filtered surface is /stories (separate).
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getTree } from "@/lib/notion/tree";
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
      return NextResponse.json(
        { error: `Account "${id}" has no Notion config (need treeDataSourceId or postsDataSourceId)` },
        { status: 400 }
      );
    }

    const nodes = await getTree(notion);
    return NextResponse.json({ data: nodes, count: nodes.length });
  } catch (error) {
    console.error("[api:tree]", error);
    return NextResponse.json({ error: "Failed to read tree" }, { status: 500 });
  }
}
