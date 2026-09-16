/**
 * Classify Posts API
 * POST /api/accounts/[id]/posts/classify
 *
 * Uses Claude API to classify posts that have transcripts/captions.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPostsNeedingClassification, updatePostClassification } from "@/lib/mongodb/posts";
import { buildClassificationPrompt, parseClassificationResponse } from "@/lib/prompts/classify";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 minutes

interface RouteParams {
  params: Promise<{ id: string }>;
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

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Get posts needing classification
    const posts = await getPostsNeedingClassification(id);

    if (posts.length === 0) {
      return NextResponse.json({
        success: true,
        classified: 0,
        skipped: 0,
        message: "No posts need classification",
      });
    }

    let classified = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process posts
    for (const post of posts) {
      try {
        console.log(`[classify] Processing post ${post.instagramId}...`);

        // Build prompt
        const prompt = buildClassificationPrompt({
          caption: post.caption,
          transcript: post.transcript,
          mediaType: post.mediaType,
          postedAt: post.postedAt,
        });

        // Call Claude API
        const message = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        // Extract text response
        const textContent = message.content.find((c) => c.type === "text");
        if (!textContent || textContent.type !== "text") {
          console.warn(`[classify] No text response for ${post.instagramId}`);
          skipped++;
          continue;
        }

        // Parse classification
        const classification = parseClassificationResponse(textContent.text);
        if (!classification) {
          console.warn(`[classify] Failed to parse classification for ${post.instagramId}`);
          errors.push(post.instagramId);
          skipped++;
          continue;
        }

        // Save to database
        await updatePostClassification(id, post.instagramId, classification);
        classified++;

        console.log(
          `[classify] Classified ${post.instagramId}: ${classification.contentType} / ${classification.underlyingNeed}`
        );

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`[classify] Error processing ${post.instagramId}:`, err);
        errors.push(post.instagramId);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      classified,
      skipped,
      total: posts.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[api:classify]", error);
    return NextResponse.json(
      { error: "Failed to classify posts" },
      { status: 500 }
    );
  }
}
