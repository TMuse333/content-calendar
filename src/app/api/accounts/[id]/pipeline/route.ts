/**
 * GET /api/accounts/[id]/pipeline
 * Admin view: pending posts for this client, grouped by who they're waiting on.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPosts } from "@/lib/notion";
import { buildPipeline } from "@/lib/pipeline/summary";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const account = await getAccountById(id);
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (!account.notion?.postsDataSourceId) {
      return NextResponse.json({ error: "Notion not connected for this account" }, { status: 400 });
    }
    const posts = await getPosts({
      postsDataSourceId: account.notion.postsDataSourceId,
      topicsDataSourceId: account.notion.topicsDataSourceId || "",
    });
    return NextResponse.json({ success: true, accountName: account.name, ...buildPipeline(posts) });
  } catch (error) {
    console.error("[api:accounts/pipeline]", error);
    return NextResponse.json({ error: "Failed to load pipeline" }, { status: 500 });
  }
}
