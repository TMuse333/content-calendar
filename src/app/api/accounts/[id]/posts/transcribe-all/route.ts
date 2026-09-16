/**
 * Transcribe All Posts API
 * POST /api/accounts/[id]/posts/transcribe-all
 *
 * Transcribes all video posts that don't have transcripts yet.
 * Runs sequentially to avoid overwhelming the system.
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPostsNeedingTranscription, updatePostTranscript } from "@/lib/mongodb/posts";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface WhisperOutput {
  text: string;
  language?: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify account exists
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const instagram = account.platforms?.instagram;
    if (!instagram?.connected || !instagram.userId || !instagram.accessToken) {
      return NextResponse.json(
        { error: "Instagram not connected" },
        { status: 400 }
      );
    }

    // Get posts needing transcription
    const posts = await getPostsNeedingTranscription(id);

    if (posts.length === 0) {
      return NextResponse.json({
        success: true,
        transcribed: 0,
        skipped: 0,
        message: "No posts need transcription",
      });
    }

    let transcribed = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process sequentially
    for (const post of posts) {
      let videoPath: string | null = null;
      let jsonPath: string | null = null;

      try {
        console.log(`[transcribe-all] Processing post ${post.instagramId}...`);

        // Fetch fresh media URL
        const mediaRes = await fetch(
          `https://graph.facebook.com/${post.instagramId}?fields=media_url&access_token=${instagram.accessToken}`
        );
        const mediaData = await mediaRes.json();

        if (mediaData.error || !mediaData.media_url) {
          console.warn(`[transcribe-all] Could not get media URL for ${post.instagramId}`);
          skipped++;
          continue;
        }

        // Download video
        const videoRes = await fetch(mediaData.media_url);
        if (!videoRes.ok) {
          console.warn(`[transcribe-all] Failed to download video for ${post.instagramId}`);
          skipped++;
          continue;
        }

        const videoBuffer = await videoRes.arrayBuffer();
        videoPath = join(tmpdir(), `whisper-${post.instagramId}-${Date.now()}.mp4`);
        await writeFile(videoPath, Buffer.from(videoBuffer));

        // Run Whisper
        const whisperCmd = `whisper "${videoPath}" --model small --output_format json --output_dir "${tmpdir()}"`;

        try {
          await execAsync(whisperCmd, { timeout: 180000 }); // 3 minute timeout per video
        } catch (whisperError) {
          console.warn(`[transcribe-all] Whisper failed for ${post.instagramId}`);
          skipped++;
          await unlink(videoPath).catch(() => {});
          continue;
        }

        // Read JSON output
        jsonPath = videoPath.replace(".mp4", ".json");
        const jsonContent = await readFile(jsonPath, "utf-8");
        const whisperOutput: WhisperOutput = JSON.parse(jsonContent);

        const transcript = whisperOutput.text.trim();

        // Save to database
        await updatePostTranscript(id, post.instagramId, transcript);
        transcribed++;

        console.log(`[transcribe-all] Transcribed ${post.instagramId}: ${transcript.substring(0, 50)}...`);

        // Cleanup
        await Promise.all([
          unlink(videoPath).catch(() => {}),
          unlink(jsonPath).catch(() => {}),
        ]);
      } catch (err) {
        console.error(`[transcribe-all] Error processing ${post.instagramId}:`, err);
        errors.push(post.instagramId);
        skipped++;

        // Cleanup on error
        if (videoPath) await unlink(videoPath).catch(() => {});
        if (jsonPath) await unlink(jsonPath).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      transcribed,
      skipped,
      total: posts.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[api:transcribe-all]", error);
    return NextResponse.json(
      { error: "Failed to transcribe posts" },
      { status: 500 }
    );
  }
}
