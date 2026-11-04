/**
 * Instagram carousel publishing — the proven chain used by the manual
 * "Publish to Instagram" button, extracted so the scheduled-publish cron
 * runs through the exact same path.
 *
 * Flow: Notion slide URLs → JPEG (sharp) → Vercel Blob (public) →
 *       IG child containers → carousel container → publish → permalink.
 */

import sharp from "sharp";
import { put } from "@vercel/blob";
import { graphHost } from "@/lib/platforms/ig-graph";

export const GRAPH_VERSION = "v21.0";

export interface IgTarget {
  accessToken: string;
  userId: string;
  apiHost?: string;
  username?: string;
}

/** IG containers need a moment to process before they can be published. */
export async function waitForContainer(host: string, containerId: string, token: string) {
  for (let i = 0; i < 10; i++) {
    const r = await fetch(`${host}/${GRAPH_VERSION}/${containerId}?fields=status_code&access_token=${token}`);
    const j = await r.json();
    if (j.status_code === "FINISHED") return;
    if (j.status_code === "ERROR") throw new Error(`Container ${containerId} failed processing`);
    await new Promise((res) => setTimeout(res, 2000));
  }
}

/**
 * Download slides, host them as JPEGs on Blob, and publish them as an IG
 * carousel. Returns the media id and permalink. Does NOT touch Notion —
 * the caller owns status/link write-back.
 */
export async function publishSlidesToInstagram(opts: {
  slides: string[]; // fresh Notion signed URLs or any fetchable image URLs
  caption: string;
  ig: IgTarget;
  blobPrefix: string; // e.g. "publish/<accountId>/<postId>" — namespaces the Blob objects
}): Promise<{ mediaId: string; permalink: string; jpegUrls: string[] }> {
  const { slides, caption, ig, blobPrefix } = opts;

  if (slides.length === 0) throw new Error("No slides to publish");
  if (slides.length > 10) throw new Error("Instagram carousels max out at 10 slides");

  // 1. Slides → JPEG → Blob (Instagram must fetch public URLs).
  const jpegUrls: string[] = [];
  for (let i = 0; i < slides.length; i++) {
    const res = await fetch(slides[i]);
    if (!res.ok) throw new Error(`Slide ${i + 1} download failed (${res.status})`);
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).jpeg({ quality: 90 }).toBuffer();
    const blob = await put(`${blobPrefix}/slide-${i + 1}.jpg`, jpeg, {
      access: "public",
      contentType: "image/jpeg",
      allowOverwrite: true,
    });
    jpegUrls.push(blob.url);
  }

  // 2. IG child containers → carousel container → publish.
  const host = graphHost(ig.apiHost);
  const token = ig.accessToken;
  const userId = ig.userId;

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
      caption,
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

  // 3. Permalink (fall back to profile link if the field is unavailable).
  let permalink = `https://www.instagram.com/${ig.username ?? ""}`;
  try {
    const r = await fetch(`${host}/${GRAPH_VERSION}/${published.id}?fields=permalink&access_token=${token}`);
    const j = await r.json();
    if (j.permalink) permalink = j.permalink;
  } catch {
    /* keep fallback */
  }

  return { mediaId: published.id, permalink, jpegUrls };
}
