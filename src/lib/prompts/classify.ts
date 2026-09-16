/**
 * Classification Prompt Template
 *
 * Used to classify Instagram posts via Claude API.
 */

import type { Post, PostClassification, ContentType } from "../types/post";
import type { UnderlyingNeed } from "../types/account";

export interface ClassifyPostInput {
  caption?: string;
  transcript?: string;
  mediaType: string;
  postedAt: Date;
}

/**
 * Build the classification prompt for a single post
 */
export function buildClassificationPrompt(post: ClassifyPostInput): string {
  return `You are analyzing an Instagram post for content strategy classification.

=== POST DATA ===
Caption: "${post.caption || "(no caption)"}"
Transcript: "${post.transcript || "N/A - image post"}"
Media Type: ${post.mediaType}
Posted: ${post.postedAt.toISOString().split("T")[0]}

=== TASK ===
Classify this post. Return ONLY valid JSON, no other text:

{
  "contentType": "...",
  "subject": "...",
  "underlyingNeed": "...",
  "coreMessage": "..."
}

=== CONTENT TYPES ===
- case-study: Showing client results or completed work
- tutorial: Teaching how to do something step by step
- insight: Sharing a perspective, opinion, or realization
- behind-scenes: Showing your process or how you work
- showcase: Demonstrating capabilities or portfolio
- announcement: News, updates, or new offerings

=== UNDERLYING NEEDS ===
- security: Appeals to safety, risk reduction, protection
- status: Appeals to reputation, being seen as successful/competent
- belonging: Appeals to community, connection, fitting in
- autonomy: Appeals to independence, control, freedom
- certainty: Appeals to predictability, clarity, confidence
- growth: Appeals to improvement, learning, progress
- meaning: Appeals to purpose, impact, significance

=== GUIDELINES ===
- subject: 2-5 words describing the topic (e.g., "AI client onboarding", "web design process")
- coreMessage: 1 sentence summarizing the main point
- Choose the SINGLE most dominant content type
- Choose the SINGLE most dominant underlying need

=== EXAMPLES ===

Post: "We automated this client's onboarding and saved them 10 hrs/week. Here's how..."
→ {"contentType": "case-study", "subject": "automation client results", "underlyingNeed": "autonomy", "coreMessage": "Automation frees up time for what matters"}

Post: "Here's how to set up AI workflows in 5 minutes"
→ {"contentType": "tutorial", "subject": "AI workflow setup", "underlyingNeed": "certainty", "coreMessage": "AI workflows are simple to implement"}

Post: "Why most agencies fail at delivering results (and what we do differently)"
→ {"contentType": "insight", "subject": "agency differentiation", "underlyingNeed": "status", "coreMessage": "Results-focused approach sets successful agencies apart"}

Return ONLY the JSON object.`;
}

/**
 * Parse the classification response from Claude
 */
export function parseClassificationResponse(
  response: string
): PostClassification | null {
  try {
    // Try to extract JSON from the response
    let jsonStr = response.trim();

    // Handle markdown code blocks
    if (jsonStr.startsWith("```")) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        jsonStr = match[1].trim();
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    const validContentTypes: ContentType[] = [
      "case-study",
      "tutorial",
      "insight",
      "behind-scenes",
      "showcase",
      "announcement",
    ];
    const validNeeds: UnderlyingNeed[] = [
      "security",
      "status",
      "belonging",
      "autonomy",
      "certainty",
      "growth",
      "meaning",
    ];

    if (!validContentTypes.includes(parsed.contentType)) {
      console.warn("Invalid content type:", parsed.contentType);
      return null;
    }
    if (!validNeeds.includes(parsed.underlyingNeed)) {
      console.warn("Invalid underlying need:", parsed.underlyingNeed);
      return null;
    }
    if (typeof parsed.subject !== "string" || !parsed.subject) {
      console.warn("Invalid subject:", parsed.subject);
      return null;
    }
    if (typeof parsed.coreMessage !== "string" || !parsed.coreMessage) {
      console.warn("Invalid core message:", parsed.coreMessage);
      return null;
    }

    return {
      contentType: parsed.contentType,
      subject: parsed.subject,
      underlyingNeed: parsed.underlyingNeed,
      coreMessage: parsed.coreMessage,
      classifiedAt: new Date(),
    };
  } catch (err) {
    console.error("Failed to parse classification response:", err);
    console.error("Response was:", response);
    return null;
  }
}
