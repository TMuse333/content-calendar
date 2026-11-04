/**
 * Edit a planned post's caption in Notion — admin, from the calendar modal.
 *
 * PATCH /api/accounts/[id]/posts/[postId]/caption
 * Headers: x-publish-secret: <PUBLISH_SECRET>
 * Body: { caption: string }
 *
 * Writes straight to the Notion post's Caption property. Gated by the same
 * secret as publish (no admin login yet); the modal caches it in localStorage.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { updatePostCaption } from "@/lib/notion";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; postId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const secret = process.env.PUBLISH_SECRET;
  if (!secret || req.headers.get("x-publish-secret") !== secret) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  try {
    const { id, postId } = await params;
    const body = await req.json().catch(() => ({}));
    if (typeof body.caption !== "string") {
      return NextResponse.json({ error: "caption (string) required" }, { status: 400 });
    }

    const account = await getAccountById(id);
    if (!account?.notion?.postsDataSourceId) {
      return NextResponse.json({ error: "Account has no Notion config" }, { status: 400 });
    }

    const notionConfig: NotionConfig = {
      postsDataSourceId: account.notion.postsDataSourceId,
      topicsDataSourceId: account.notion.topicsDataSourceId || "",
    };

    await updatePostCaption(notionConfig, postId, body.caption);

    return NextResponse.json({ success: true, caption: body.caption });
  } catch (error) {
    console.error("[api:posts/[postId]/caption PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save caption" },
      { status: 500 }
    );
  }
}
