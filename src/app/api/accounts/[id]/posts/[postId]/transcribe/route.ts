/**
 * Transcribe Post API
 * POST /api/accounts/[id]/posts/[postId]/transcribe
 *
 * Downloads video and runs Whisper locally for transcription.
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPostById, updatePostTranscript } from "@/lib/mongodb/posts";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for transcription

interface RouteParams {
  params: Promise<{ id: string; postId: string }>;
}

interface WhisperOutput {
  text: string;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
  language?: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id, postId } = await params;
  let videoPath: string | null = null;
  let jsonPath: string | null = null;

  try {
    // Verify account exists
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    // Get the post
    const post = await getPostById(id, postId);
    if (!post) {
      return NextResponse.json(
        { error: `Post "${postId}" not found` },
        { status: 404 }
      );
    }

    if (post.mediaType !== "VIDEO") {
      return NextResponse.json(
        { error: "Post is not a video" },
        { status: 400 }
      );
    }

    if (!post.mediaUrl) {
      return NextResponse.json(
        { error: "No media URL available" },
        { status: 400 }
      );
    }

    // Check if we need to refresh the media URL
    // Instagram media URLs expire, so we might need to fetch fresh
    const instagram = account.platforms?.instagram;
    if (!instagram?.connected || !instagram.userId || !instagram.accessToken) {
      return NextResponse.json(
        { error: "Instagram not connected" },
        { status: 400 }
      );
    }

    // Fetch fresh media URL from Instagram
    const mediaRes = await fetch(
      `https://graph.facebook.com/${post.instagramId}?fields=media_url&access_token=${instagram.accessToken}`
    );
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
      return NextResponse.json(
        { error: `Instagram API error: ${mediaData.error.message}` },
        { status: 500 }
      );
    }

    const mediaUrl = mediaData.media_url;
    if (!mediaUrl) {
      return NextResponse.json(
        { error: "Could not get media URL from Instagram" },
        { status: 500 }
      );
    }

    // Download the video
    console.log(`[transcribe] Downloading video for post ${postId}...`);
    const videoRes = await fetch(mediaUrl);
    if (!videoRes.ok) {
      return NextResponse.json(
        { error: "Failed to download video" },
        { status: 500 }
      );
    }

    const videoBuffer = await videoRes.arrayBuffer();
    videoPath = join(tmpdir(), `whisper-${postId}-${Date.now()}.mp4`);
    await writeFile(videoPath, Buffer.from(videoBuffer));
    console.log(`[transcribe] Video saved to ${videoPath}`);

    // Run Whisper
    console.log(`[transcribe] Running Whisper...`);
    const whisperCmd = `whisper "${videoPath}" --model small --output_format json --output_dir "${tmpdir()}"`;

    try {
      await execAsync(whisperCmd, { timeout: 240000 }); // 4 minute timeout
    } catch (whisperError) {
      console.error("[transcribe] Whisper error:", whisperError);
      return NextResponse.json(
        { error: "Whisper transcription failed" },
        { status: 500 }
      );
    }

    // Read the JSON output
    jsonPath = videoPath.replace(".mp4", ".json");
    const jsonContent = await readFile(jsonPath, "utf-8");
    const whisperOutput: WhisperOutput = JSON.parse(jsonContent);

    const transcript = whisperOutput.text.trim();
    console.log(`[transcribe] Transcript: ${transcript.substring(0, 100)}...`);

    // Save to database
    await updatePostTranscript(id, postId, transcript);

    // Cleanup
    await Promise.all([
      unlink(videoPath).catch(() => {}),
      unlink(jsonPath).catch(() => {}),
    ]);

    return NextResponse.json({
      success: true,
      transcript,
      language: whisperOutput.language,
    });
  } catch (error) {
    console.error("[api:transcribe]", error);

    // Cleanup on error
    if (videoPath) await unlink(videoPath).catch(() => {});
    if (jsonPath) await unlink(jsonPath).catch(() => {});

    return NextResponse.json(
      { error: "Failed to transcribe video" },
      { status: 500 }
    );
  }
}
