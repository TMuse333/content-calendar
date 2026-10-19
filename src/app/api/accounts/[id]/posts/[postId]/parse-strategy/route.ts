/**
 * Parse Strategy API
 * POST /api/accounts/[id]/posts/[postId]/parse-strategy
 *
 * Takes raw notes from the user and uses Claude to parse them
 * into structured strategy fields.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPostById, updatePostFullStrategy } from "@/lib/mongodb/posts";
import { buildStrategyParsePrompt, parseStrategyResponse } from "@/lib/prompts/strategy";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ id: string; postId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, postId } = await params;
    const body = await request.json();
    const { rawNotes, updateHypotheses } = body;

    // If just updating hypotheses, skip AI parsing
    if (updateHypotheses && Array.isArray(updateHypotheses)) {
      const account = await getAccountById(id);
      if (!account) {
        return NextResponse.json({ error: `Account "${id}" not found` }, { status: 404 });
      }

      const post = await getPostById(id, postId);
      if (!post) {
        return NextResponse.json({ error: `Post "${postId}" not found` }, { status: 404 });
      }

      const strategy = {
        ...post.strategy,
        hypotheses: updateHypotheses,
      };

      const updatedPost = await updatePostFullStrategy(id, postId, {
        format: post.format,
        strategy,
      });

      return NextResponse.json({ success: true, post: updatedPost });
    }

    if (!rawNotes || typeof rawNotes !== "string" || rawNotes.trim().length === 0) {
      return NextResponse.json(
        { error: "rawNotes is required" },
        { status: 400 }
      );
    }

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

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
    const anthropic = new Anthropic({
      apiKey,
      defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
    });

    // Build prompt
    const prompt = buildStrategyParsePrompt({
      rawNotes,
      caption: post.caption,
      mediaType: post.mediaType,
    });

    // Call Claude API
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
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
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse the response
    const parsed = parseStrategyResponse(textContent.text);
    if (!parsed) {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: textContent.text },
        { status: 500 }
      );
    }

    // Build the strategy object
    const strategy = {
      // Preserve existing fields
      campaignId: post.strategy?.campaignId,
      infoPoints: post.strategy?.infoPoints,
      deliveryNotes: post.strategy?.deliveryNotes,
      // Add new fields
      rawNotes,
      parsedAt: new Date(),
      intent: parsed.intent,
      craft: parsed.craft,
      hypotheses: parsed.hypotheses,
      learnings: parsed.learnings,
    };

    // Update the post
    const updatedPost = await updatePostFullStrategy(id, postId, {
      format: parsed.format,
      strategy,
    });

    return NextResponse.json({
      success: true,
      parsed,
      post: updatedPost,
    });
  } catch (error) {
    console.error("[api:parse-strategy]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to parse strategy", details: errorMessage },
      { status: 500 }
    );
  }
}
