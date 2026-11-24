/**
 * Content feed for external consumers (syntellic-agent).
 *
 * GET /api/accounts/[id]/content/feed
 * Headers: x-read-secret: <MCP_READ_SECRET>  (read-tier key, never the publish key)
 *
 * PUBLIC-filtered, server-side: only Posted posts (their captions are already
 * live on Instagram — nothing here can leak an unapproved story) plus the
 * topics those posts answer. Internal strategy fields (beliefs, patterns,
 * levers) and preview URLs never leave this server.
 *
 * Every item carries updatedAt (Notion last_edited_time) so the consumer can
 * sync incrementally via ?since=<ISO>.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPosts, getTopics } from "@/lib/notion";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const secret = process.env.MCP_READ_SECRET;
  if (!secret || req.headers.get("x-read-secret") !== secret) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const account = await getAccountById(id);
    if (!account?.notion?.postsDataSourceId) {
      return NextResponse.json({ error: `Account "${id}" has no Notion config` }, { status: 404 });
    }
    const notion: NotionConfig = {
      postsDataSourceId: account.notion.postsDataSourceId,
      topicsDataSourceId: account.notion.topicsDataSourceId || "",
    };

    const since = req.nextUrl.searchParams.get("since");
    const sinceDate = since ? new Date(since) : null;
    if (sinceDate && isNaN(sinceDate.getTime())) {
      return NextResponse.json({ error: "Invalid ?since= — use an ISO date" }, { status: 400 });
    }

    const allPosted = (await getPosts(notion, { status: "Posted" })).filter((p) => p.igPostLink);

    const posts = allPosted
      .filter((p) => !sinceDate || (p.updatedAt && p.updatedAt > sinceDate))
      .map((p) => ({
        id: p.id,
        title: p.title,
        caption: p.caption ?? "",
        cta: p.cta ?? null,
        type: p.type ?? null,
        questionAnswered: p.questionAnswered ?? null,
        permalink: p.igPostLink!,
        postDate: p.postDate ?? null,
        topicId: p.topicId ?? null,
        updatedAt: p.updatedAt?.toISOString() ?? null,
      }));

    // Topics referenced by ANY posted post (not just the since-window) so the
    // consumer's topic set stays complete across incremental syncs.
    const topicIds = new Set(allPosted.map((p) => p.topicId).filter(Boolean));
    const topics = notion.topicsDataSourceId
      ? (await getTopics(notion)).filter((t) => topicIds.has(t.id)).map((t) => ({
          id: t.id,
          topic: t.title,
          audience: t.audience || null,
          whyItMatters: t.whyItMatters || null,
          localAngle: t.localAngle || null,
        }))
      : [];

    return NextResponse.json({
      accountId: id,
      generatedAt: new Date().toISOString(),
      posts,
      topics,
    });
  } catch (error) {
    console.error("[api:content:feed]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Feed failed" },
      { status: 500 }
    );
  }
}
