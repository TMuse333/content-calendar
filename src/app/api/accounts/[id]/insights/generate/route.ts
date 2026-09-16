/**
 * Generate Insights API
 * POST /api/accounts/[id]/insights/generate
 *
 * Uses Claude API to analyze all classified posts and generate insights.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getClassifiedPosts, saveInsights } from "@/lib/mongodb/posts";
import {
  buildInsightsPrompt,
  parseInsightsResponse,
  extractCitationIndices,
  buildCitations,
} from "@/lib/prompts/insights";
import type { InsightsPeriod } from "@/lib/types/post";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Parse request body for period
    let period: InsightsPeriod = "all-time";
    let periodStart: Date | undefined;
    let periodEnd: Date | undefined;

    try {
      const body = await request.json();
      if (body.period) period = body.period;
      if (body.periodStart) periodStart = new Date(body.periodStart);
      if (body.periodEnd) periodEnd = new Date(body.periodEnd);
    } catch {
      // No body or invalid JSON, use defaults
    }

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

    // Get classified posts (optionally filtered by date)
    let posts = await getClassifiedPosts(id);

    // Filter by period if specified
    if (periodStart || periodEnd) {
      posts = posts.filter((p) => {
        const postedAt = new Date(p.postedAt);
        if (periodStart && postedAt < periodStart) return false;
        if (periodEnd && postedAt > periodEnd) return false;
        return true;
      });
    }

    if (posts.length === 0) {
      return NextResponse.json(
        { error: "No classified posts found. Run classification first." },
        { status: 400 }
      );
    }

    if (posts.length < 5) {
      return NextResponse.json(
        { error: `Only ${posts.length} classified posts. Need at least 5 for meaningful insights.` },
        { status: 400 }
      );
    }

    console.log(`[insights] Generating insights from ${posts.length} posts...`);

    // Build prompt
    const prompt = buildInsightsPrompt(posts);

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
        { error: "No response from Claude" },
        { status: 500 }
      );
    }

    const insightsText = parseInsightsResponse(textContent.text);

    // Extract citations from the response
    const citationIndices = extractCitationIndices(insightsText);
    const citations = buildCitations(posts, citationIndices);

    // Save insights to database
    const insightsId = await saveInsights({
      accountId: id,
      generatedAt: new Date(),
      period,
      periodStart,
      periodEnd,
      postCount: posts.length,
      postsAnalyzed: posts.map((p) => p.instagramId),
      insights: insightsText,
      citations,
    });

    console.log(`[insights] Generated insights for ${id} (${citations.length} citations)`);

    return NextResponse.json({
      success: true,
      insightsId,
      postCount: posts.length,
      citationCount: citations.length,
      insights: insightsText,
    });
  } catch (error) {
    console.error("[api:insights/generate]", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
