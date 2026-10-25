/**
 * Publish a video as an Instagram Reel for any connected account.
 *
 * Usage:
 *   npx tsx scripts/publish-video.ts <accountId> <videoPath> --caption "..." [--cover image.png] [--thumb-offset 3.5] [--live]
 *
 * DRY-RUN BY DEFAULT: uploads to Vercel Blob and prints what would happen.
 * Nothing touches Instagram until --live is passed.
 *
 * Chain (live): video (+ cover → JPEG) → Vercel Blob → REELS container
 * → poll processing → media_publish → permalink.
 */

import { readFileSync } from "fs";
import { basename } from "path";
import { MongoClient } from "mongodb";
import { put } from "@vercel/blob";
import sharp from "sharp";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const GRAPH_VERSION = "v21.0";

function graphHost(apiHost?: string | null): string {
  return apiHost === "instagram" ? "https://graph.instagram.com" : "https://graph.facebook.com";
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const [accountId, videoPath] = process.argv.slice(2);
  const caption = arg("--caption") ?? "";
  const coverPath = arg("--cover");
  const thumbOffset = arg("--thumb-offset");
  const live = process.argv.includes("--live");

  if (!accountId || !videoPath) {
    console.error('Usage: npx tsx scripts/publish-video.ts <accountId> <videoPath> --caption "..." [--cover img] [--thumb-offset s] [--live]');
    process.exit(1);
  }

  const mongo = await MongoClient.connect(process.env.MONGODB_URI!);
  const account = await mongo.db("strategy").collection("accounts").findOne({ id: accountId });
  await mongo.close();

  const ig = account?.platforms?.instagram;
  if (!ig?.connected || !ig.accessToken || !ig.userId) {
    console.error(`Instagram not connected on "${accountId}"`);
    process.exit(1);
  }
  console.log(`Account: ${accountId} → IG @${ig.username ?? ig.userId} (${ig.apiHost ?? "facebook"} host)`);

  // 1. Upload video to Blob (public URL Instagram can fetch).
  console.log(`Uploading video (${basename(videoPath)})…`);
  const video = readFileSync(videoPath);
  const videoBlob = await put(`publish/${accountId}/reels/${Date.now()}-${basename(videoPath)}`, video, {
    access: "public",
    contentType: "video/mp4",
    multipart: true,
  });
  console.log(`  video url: ${videoBlob.url}`);

  // 2. Optional cover → JPEG → Blob.
  let coverUrl: string | undefined;
  if (coverPath) {
    const jpeg = await sharp(readFileSync(coverPath)).jpeg({ quality: 90 }).toBuffer();
    const coverBlob = await put(`publish/${accountId}/reels/${Date.now()}-cover.jpg`, jpeg, {
      access: "public",
      contentType: "image/jpeg",
    });
    coverUrl = coverBlob.url;
    console.log(`  cover url: ${coverUrl}`);
  }

  console.log(`\nCaption (${caption.length} chars):\n${caption || "(empty)"}\n`);

  if (!live) {
    console.log("DRY RUN — nothing sent to Instagram. Re-run with --live to publish.");
    return;
  }

  // 3. Create REELS container.
  const host = graphHost(ig.apiHost);
  const containerPayload: Record<string, unknown> = {
    media_type: "REELS",
    video_url: videoBlob.url,
    caption,
    access_token: ig.accessToken,
  };
  if (coverUrl) containerPayload.cover_url = coverUrl;
  else if (thumbOffset) containerPayload.thumb_offset = Math.round(parseFloat(thumbOffset) * 1000);

  const containerRes = await fetch(`${host}/${GRAPH_VERSION}/${ig.userId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerPayload),
  });
  const container = await containerRes.json();
  if (container.error) throw new Error(`Container failed: ${container.error.message}`);
  console.log(`Container ${container.id} created — waiting for Instagram to process the video…`);

  // 4. Poll processing (videos take a while).
  for (let i = 0; i < 60; i++) {
    const r = await fetch(`${host}/${GRAPH_VERSION}/${container.id}?fields=status_code&access_token=${ig.accessToken}`);
    const j = await r.json();
    if (j.status_code === "FINISHED") break;
    if (j.status_code === "ERROR") throw new Error("Instagram rejected the video during processing");
    if (i === 59) throw new Error("Timed out waiting for processing (~5 min)");
    process.stdout.write(".");
    await new Promise((res) => setTimeout(res, 5000));
  }
  console.log("\nProcessed. Publishing…");

  // 5. Publish.
  const pubRes = await fetch(`${host}/${GRAPH_VERSION}/${ig.userId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: container.id, access_token: ig.accessToken }),
  });
  const pub = await pubRes.json();
  if (pub.error || !pub.id) throw new Error(`Publish failed: ${pub.error?.message ?? "no id"}`);

  let permalink = `https://www.instagram.com/${ig.username ?? ""}`;
  try {
    const r = await fetch(`${host}/${GRAPH_VERSION}/${pub.id}?fields=permalink&access_token=${ig.accessToken}`);
    const j = await r.json();
    if (j.permalink) permalink = j.permalink;
  } catch {
    /* fallback kept */
  }
  console.log(`\n✅ Published: ${permalink}`);
}

main().catch((e) => {
  console.error("\nFailed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
