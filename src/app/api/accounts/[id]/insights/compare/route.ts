/**
 * Compare Posts API
 * POST /api/accounts/[id]/insights/compare - Generate and save a comparison
 * GET /api/accounts/[id]/insights/compare - Get comparison history
 *
 * Uses Claude API to analyze why one post performed better than another.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MongoClient } from "mongodb";
import { getAccountById } from "@/lib/mongodb/accounts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PostData {
  id?: string;
  caption: string;
  mediaType: string;
  postedAt: string;
  thumbnailUrl?: string;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  videoViews: number;
  classification?: {
    contentType?: string;
    subject?: string;
    coreMessage?: string;
  } | null;
  transcript?: string | null;
}

interface SavedComparison {
  id: string;
  accountId: string;
  postA: {
    instagramId: string;
    thumbnailUrl?: string;
    postedAt: string;
    reach: number;
    engagement: number;
  };
  postB: {
    instagramId: string;
    thumbnailUrl?: string;
    postedAt: string;
    reach: number;
    engagement: number;
  };
  hypothesis: string | null;
  winner: string;
  analysis: string;
  createdAt: Date;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Parse request body
    const body = await request.json();
    const { postA, postB, hypothesis } = body as { postA: PostData; postB: PostData; hypothesis?: string | null };

    if (!postA || !postB) {
      return NextResponse.json(
        { error: "Both postA and postB are required" },
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

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Determine winner
    const aScore = postA.reach + postA.engagement * 2;
    const bScore = postB.reach + postB.engagement * 2;
    const winner = aScore > bScore ? "Post A" : bScore > aScore ? "Post B" : "Neither";

    // Format posting date/time
    const formatPostDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
      const fullDate = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      return `${dayOfWeek}, ${fullDate} at ${time}`;
    };

    // Build comparison prompt using the Three Lenses framework
    const prompt = `You are analyzing two social media videos to understand what made one perform better than the other. Analyze through THREE strategic lenses.

=== POST A ===
Posted: ${formatPostDate(postA.postedAt)}
Type: ${postA.mediaType}
Reach: ${postA.reach.toLocaleString()} | Engagement: ${postA.engagement} (${postA.likes} likes, ${postA.comments} comments, ${postA.saves} saves, ${postA.shares} shares)
${postA.videoViews > 0 ? `Video Views: ${postA.videoViews.toLocaleString()}` : ""}
${postA.classification?.contentType ? `Content Type: ${postA.classification.contentType}` : ""}
${postA.classification?.coreMessage ? `Core Message: ${postA.classification.coreMessage}` : ""}
Caption: "${postA.caption.slice(0, 500)}${postA.caption.length > 500 ? "..." : ""}"
${postA.transcript ? `Transcript: "${postA.transcript.slice(0, 800)}${postA.transcript.length > 800 ? "..." : ""}"` : ""}

=== POST B ===
Posted: ${formatPostDate(postB.postedAt)}
Type: ${postB.mediaType}
Reach: ${postB.reach.toLocaleString()} | Engagement: ${postB.engagement} (${postB.likes} likes, ${postB.comments} comments, ${postB.saves} saves, ${postB.shares} shares)
${postB.videoViews > 0 ? `Video Views: ${postB.videoViews.toLocaleString()}` : ""}
${postB.classification?.contentType ? `Content Type: ${postB.classification.contentType}` : ""}
${postB.classification?.coreMessage ? `Core Message: ${postB.classification.coreMessage}` : ""}
Caption: "${postB.caption.slice(0, 500)}${postB.caption.length > 500 ? "..." : ""}"
${postB.transcript ? `Transcript: "${postB.transcript.slice(0, 800)}${postB.transcript.length > 800 ? "..." : ""}"` : ""}

=== RESULT ===
${winner !== "Neither" ? `${winner} performed better overall.` : "Both posts performed similarly."}
${hypothesis ? `
=== USER'S HYPOTHESIS ===
"${hypothesis}"
(Address this theory/question specifically in your analysis)
` : ""}
Analyze through these THREE LENSES:

**LENS 1: INFORMATION THEORY**
How does information flow between channels?
- SIGNAL: What is the ONE core idea being communicated in each?
- CHANNELS: How are audio, visual, and text used?
- MODE: Redundant (visual repeats audio), Complementary (visual adds new info), or Primary (one channel dominates)?
- Which video had clearer signal-to-noise ratio?

**LENS 2: HUMAN NATURE**
What psychological mechanisms are engaged?
- PRIMARY DESIRE: Which desires are activated? (Status, Belonging, Security, Mastery, Autonomy, Novelty)
- PRIMARY FEAR: Which fears are triggered? (Missing out, Falling behind, Looking foolish, Being judged)
- EMOTIONAL ARC: Does it create Curiosity → Understanding → Desire → Urgency?
- IDENTITY PLAY: Does it speak to "the type of person who..."?

**LENS 3: LITERARY DEVICES**
What storytelling techniques are employed?
- NARRATIVE STRUCTURE: Problem→Solution? Before→After? Question→Answer?
- DEVICES USED: Metaphor, Contrast, Rule of Three, Open Loop, Social Proof, Future Pacing, Scarcity, Authority?
- What story is being told, and how?

**OUTPUT FORMAT:**
${hypothesis ? `**HYPOTHESIS CHECK:** First, directly address the user's theory/question: "${hypothesis}"

Then analyze through the three lenses:
` : ""}For each lens, briefly compare both posts, then identify WHY the winner performed better (or why they tied).

End with: **TRANSFERABLE INSIGHT** - One subject-agnostic principle that can be applied to ANY future content.

Be direct and specific. Reference actual content from the transcripts/captions.`;

    // Call Claude API
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
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

    // Save comparison to database
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
      try {
        const client = await MongoClient.connect(mongoUri);
        const db = client.db("strategy");

        const savedComparison: SavedComparison = {
          id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          accountId: id,
          postA: {
            instagramId: postA.id || "unknown",
            thumbnailUrl: postA.thumbnailUrl,
            postedAt: postA.postedAt,
            reach: postA.reach,
            engagement: postA.engagement,
          },
          postB: {
            instagramId: postB.id || "unknown",
            thumbnailUrl: postB.thumbnailUrl,
            postedAt: postB.postedAt,
            reach: postB.reach,
            engagement: postB.engagement,
          },
          hypothesis: hypothesis || null,
          winner,
          analysis: textContent.text,
          createdAt: new Date(),
        };

        await db.collection("comparisons").insertOne(savedComparison);
        await client.close();

        return NextResponse.json({
          success: true,
          comparison: textContent.text,
          winner,
          comparisonId: savedComparison.id,
        });
      } catch (dbError) {
        console.error("[api:insights/compare] Failed to save:", dbError);
        // Still return the comparison even if save fails
      }
    }

    return NextResponse.json({
      success: true,
      comparison: textContent.text,
      winner,
    });
  } catch (error) {
    console.error("[api:insights/compare]", error);
    return NextResponse.json(
      { error: "Failed to generate comparison" },
      { status: 500 }
    );
  }
}

// GET - Fetch comparison history
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: accountId } = await params;

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const client = await MongoClient.connect(mongoUri);
    const db = client.db("strategy");

    const comparisons = await db
      .collection("comparisons")
      .find({ accountId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    await client.close();

    return NextResponse.json({
      comparisons,
      count: comparisons.length,
    });
  } catch (error) {
    console.error("[api:insights/compare] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comparisons" },
      { status: 500 }
    );
  }
}
