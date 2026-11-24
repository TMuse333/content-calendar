/**
 * Asset ingest — video-system POSTs approved renders here.
 *
 * POST /api/accounts/[id]/assets/ingest
 * Headers: x-publish-secret: <PUBLISH_SECRET>
 * Body (RenderDelivery):
 *   { blobUrl, lineage: { accountId, projectId, renderId, callId?, postId? },
 *     format?, durationSec?, quality?, reviewStatus?, approvedAt? }
 *
 * lineage.postId present → attach the video to that Posts row's Preview.
 * Absent → STAGE a new Posts row (Draft, same pattern as carousel staging).
 * Idempotent by renderId: a re-POST returns the original binding untouched.
 * Emits asset.ingested on accept (video-system emits asset.delivered on its
 * side — the gap between the two is the alarm).
 */
import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getAssetDelivery, insertAssetDelivery } from "@/lib/mongodb/asset-deliveries";
import { getNotionClient } from "@/lib/notion/client";
import { getPostById } from "@/lib/notion";
import { sendNotification } from "@/lib/notify";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface RenderDelivery {
  blobUrl?: string;
  lineage?: { accountId?: string; projectId?: string; renderId?: string; callId?: string; postId?: string };
  format?: string;
  durationSec?: number;
  quality?: string;
  reviewStatus?: string;
  approvedAt?: string;
}

/** Attach the hosted video to a Posts row's Preview as an external file. */
async function attachVideo(postId: string, blobUrl: string, name: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (getNotionClient().pages as any).update({
    page_id: postId,
    properties: {
      Preview: { files: [{ type: "external", name: name.slice(0, 100), external: { url: blobUrl } }] },
    },
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const secret = process.env.PUBLISH_SECRET;
  if (!secret || req.headers.get("x-publish-secret") !== secret) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as RenderDelivery | null;

    const blobUrl = body?.blobUrl;
    const lineage = body?.lineage ?? {};
    const renderId = lineage.renderId;
    if (!blobUrl || !/^https:\/\//.test(blobUrl)) {
      return NextResponse.json({ error: "blobUrl (https) is required" }, { status: 400 });
    }
    if (!renderId) {
      return NextResponse.json({ error: "lineage.renderId is required" }, { status: 400 });
    }
    if (lineage.accountId && lineage.accountId !== id) {
      return NextResponse.json(
        { error: `lineage.accountId "${lineage.accountId}" doesn't match route account "${id}"` },
        { status: 400 }
      );
    }

    const account = await getAccountById(id);
    if (!account?.notion?.postsDataSourceId) {
      return NextResponse.json({ error: `Account "${id}" has no Notion config` }, { status: 404 });
    }
    const notion: NotionConfig = {
      postsDataSourceId: account.notion.postsDataSourceId,
      topicsDataSourceId: account.notion.topicsDataSourceId || "",
    };

    // Idempotent by renderId — the first binding wins, re-POSTs are no-ops.
    const existing = await getAssetDelivery(renderId);
    if (existing) {
      return NextResponse.json({
        ingested: true,
        duplicate: true,
        postId: existing.boundPostId,
        stagedNewPost: existing.stagedNewPost,
      });
    }

    let boundPostId: string;
    let stagedNewPost = false;
    const videoName = `render-${renderId}${body?.format ? `.${body.format.replace(/^\./, "")}` : ".mp4"}`;

    if (lineage.postId) {
      const post = await getPostById(notion, lineage.postId);
      if (!post) {
        return NextResponse.json({ error: `Post ${lineage.postId} not found in Notion` }, { status: 404 });
      }
      await attachVideo(lineage.postId, blobUrl, videoName);
      boundPostId = lineage.postId;
    } else {
      // Stage a fresh Draft row — same pattern as carousel staging.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page = await (getNotionClient().pages as any).create({
        parent: {
          type: "data_source_id",
          data_source_id: notion.postsDataSourceId.replace("collection://", ""),
        },
        properties: {
          Post: { title: [{ text: { content: `Video — ${lineage.projectId ?? renderId}` } }] },
          Status: { status: { name: "Draft" } },
        },
      });
      boundPostId = page.id as string;
      stagedNewPost = true;
      await attachVideo(boundPostId, blobUrl, videoName);
    }

    await insertAssetDelivery({
      renderId,
      accountId: id,
      blobUrl,
      format: body?.format,
      durationSec: body?.durationSec,
      quality: body?.quality,
      reviewStatus: body?.reviewStatus,
      approvedAt: body?.approvedAt,
      lineage: { projectId: lineage.projectId, callId: lineage.callId, postId: lineage.postId },
      boundPostId,
      stagedNewPost,
      ingestedAt: new Date(),
    });

    await sendNotification({
      accountId: id,
      event: "asset.ingested",
      data: {
        renderId,
        postId: boundPostId,
        stagedNewPost,
        format: body?.format ?? null,
        reviewStatus: body?.reviewStatus ?? null,
      },
      lineage: { callId: lineage.callId, projectId: lineage.projectId },
    });

    return NextResponse.json({ ingested: true, postId: boundPostId, stagedNewPost });
  } catch (error) {
    console.error("[api:assets:ingest]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingest failed" },
      { status: 500 }
    );
  }
}
