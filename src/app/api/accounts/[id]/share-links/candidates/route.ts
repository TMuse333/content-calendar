/**
 * Candidate posts for a proposal/share link.
 * GET /api/accounts/[id]/share-links/candidates
 *
 * Returns planned posts from Notion (anything not yet Posted/Archived) with
 * their Notion page IDs — the IDs share links store and /s/[code] resolves.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPosts } from "@/lib/notion";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json({ error: `Account "${id}" not found` }, { status: 404 });
    }
    if (!account.notion?.postsDataSourceId) {
      return NextResponse.json({ error: "Notion is not configured for this account" }, { status: 400 });
    }

    const notionConfig: NotionConfig = {
      postsDataSourceId: account.notion.postsDataSourceId,
      topicsDataSourceId: account.notion.topicsDataSourceId || "",
    };

    const posts = await getPosts(notionConfig);
    const candidates = posts
      .filter((p) => p.status !== "Posted" && p.status !== "Archived")
      .map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        type: p.type,
        postDate: p.postDate,
        caption: p.caption,
        previewUrl: p.previewUrls?.[0] ?? p.previewUrl,
      }))
      .sort((a, b) => (a.postDate || "9999").localeCompare(b.postDate || "9999"));

    return NextResponse.json({ posts: candidates });
  } catch (error) {
    console.error("[api:share-links:candidates]", error);
    return NextResponse.json({ error: "Failed to load posts from Notion" }, { status: 500 });
  }
}
