/**
 * Manual "Publish to Instagram" — admin button, not automated.
 *
 * POST /api/accounts/[id]/posts/[postId]/publish
 * Headers: x-publish-secret: <PUBLISH_SECRET>
 * Body: { dryRun?: boolean, igAccountId?: string }
 *   - dryRun: converts + uploads slides but never touches Instagram
 *   - igAccountId: publish to a DIFFERENT account's Instagram (safe-test:
 *     Greg's content on Thomas's IG before trusting it on a client's)
 *
 * Chain: Notion post (must be Approved, have slides, no IG link yet)
 *   → fetch slides (fresh signed URLs) → PNG→JPEG via sharp
 *   → Vercel Blob (public URLs Instagram can fetch)
 *   → IG carousel containers → publish → permalink
 *   → Notion write-back: Status=Posted + IG post link.
 */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPostById, updatePostStatus } from "@/lib/notion";
import { getNotionClient } from "@/lib/notion/client";
import { graphHost } from "@/lib/platforms/ig-graph";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string; postId: string }> };

const GRAPH_VERSION = "v21.0";

async function waitForContainer(host: string, containerId: string, token: string) {
  // IG containers need a moment to process before they can be used/published.
  for (let i = 0; i < 10; i++) {
    const r = await fetch(`${host}/${GRAPH_VERSION}/${containerId}?fields=status_code&access_token=${token}`);
    const j = await r.json();
    if (j.status_code === "FINISHED") return;
    if (j.status_code === "ERROR") throw new Error(`Container ${containerId} failed processing`);
    await new Promise((res) => setTimeout(res, 2000));
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const secret = process.env.PUBLISH_SECRET;
  if (!secret || req.headers.get("x-publish-secret") !== secret) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  try {
    const { id, postId } = await params;
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    // Content account (Notion) — may differ from the IG account for safe tests.
    const account = await getAccountById(id);
    if (!account?.notion?.postsDataSourceId) {
      return NextResponse.json({ error: "Account has no Notion config" }, { status: 400 });
    }
    const igAccount =
      typeof body.igAccountId === "string" && body.igAccountId !== id
        ? await getAccountById(body.igAccountId)
        : account;
    const instagram = igAccount?.platforms?.instagram;
    if (!instagram?.connected || !instagram.accessToken || !instagram.userId) {
      return NextResponse.json({ error: `Instagram not connected on ${igAccount?.id ?? "account"}` }, { status: 400 });
    }

    const notionConfig: NotionConfig = {
      postsDataSourceId: account.notion.postsDataSourceId,
      topicsDataSourceId: account.notion.topicsDataSourceId || "",
    };
    const post = await getPostById(notionConfig, postId);
    if (!post) return NextResponse.json({ error: "Post not found in Notion" }, { status: 404 });
    if (post.igPostLink) {
      return NextResponse.json({ error: `Already posted: ${post.igPostLink}` }, { status: 409 });
    }
    if (post.status !== "Approved") {
      return NextResponse.json({ error: `Post is "${post.status}" — approve it first` }, { status: 400 });
    }
    const slides = post.previewUrls?.length ? post.previewUrls : post.previewUrl ? [post.previewUrl] : [];
    if (slides.length === 0) {
      return NextResponse.json({ error: "No slides attached in Notion" }, { status: 400 });
    }
    if (slides.length > 10) {
      return NextResponse.json({ error: "Instagram carousels max out at 10 slides" }, { status: 400 });
    }

    // 1. Download slides (Notion signed URLs are fresh from the fetch above),
    //    convert to JPEG, host on Vercel Blob so Instagram can fetch them.
    const jpegUrls: string[] = [];
    for (let i = 0; i < slides.length; i++) {
      const res = await fetch(slides[i]);
      if (!res.ok) throw new Error(`Slide ${i + 1} download failed (${res.status})`);
      const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).jpeg({ quality: 90 }).toBuffer();
      const blob = await put(`publish/${id}/${postId}/slide-${i + 1}.jpg`, jpeg, {
        access: "public",
        contentType: "image/jpeg",
        allowOverwrite: true,
      });
      jpegUrls.push(blob.url);
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        post: post.title,
        igAccount: igAccount!.id,
        slides: jpegUrls,
        caption: post.caption ?? "",
      });
    }

    // 2. Instagram: child containers → carousel container → publish.
    const host = graphHost(instagram.apiHost);
    const token = instagram.accessToken;
    const userId = instagram.userId;

    const children: string[] = [];
    for (const url of jpegUrls) {
      const r = await fetch(`${host}/${GRAPH_VERSION}/${userId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: token }),
      });
      const j = await r.json();
      if (j.error) throw new Error(`Slide container failed: ${j.error.message}`);
      children.push(j.id);
    }

    const carouselRes = await fetch(`${host}/${GRAPH_VERSION}/${userId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "CAROUSEL",
        children: children.join(","),
        caption: post.caption ?? "",
        access_token: token,
      }),
    });
    const carousel = await carouselRes.json();
    if (carousel.error) throw new Error(`Carousel container failed: ${carousel.error.message}`);

    await waitForContainer(host, carousel.id, token);

    const publishRes = await fetch(`${host}/${GRAPH_VERSION}/${userId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: carousel.id, access_token: token }),
    });
    const published = await publishRes.json();
    if (published.error || !published.id) {
      throw new Error(`Publish failed: ${published.error?.message ?? "no media id returned"}`);
    }

    // 3. Permalink (fall back to a profile link if the field is unavailable).
    let permalink = `https://www.instagram.com/${instagram.username ?? ""}`;
    try {
      const r = await fetch(`${host}/${GRAPH_VERSION}/${published.id}?fields=permalink&access_token=${token}`);
      const j = await r.json();
      if (j.permalink) permalink = j.permalink;
    } catch {
      /* keep fallback */
    }

    // 4. Notion write-back — only when it went to the real account's IG.
    //    A safe-test to another IG account must not mark the post Posted.
    const wroteBack = igAccount!.id === id;
    if (wroteBack) {
      await updatePostStatus(notionConfig, postId, "Posted");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (getNotionClient().pages as any).update({
        page_id: postId,
        properties: { "IG post link": { url: permalink } },
      });
    }

    return NextResponse.json({
      success: true,
      mediaId: published.id,
      permalink,
      igAccount: igAccount!.id,
      notionUpdated: wroteBack,
    });
  } catch (error) {
    console.error("[api:posts:publish]", error);
    const message = error instanceof Error ? error.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
