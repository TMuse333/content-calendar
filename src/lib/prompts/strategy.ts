/**
 * Strategy Parsing Prompt
 *
 * Takes raw user notes about a post's creative intent and
 * structures them into the PostStrategy schema fields.
 */

import type {
  CreativeIntent,
  CraftNotes,
  StrategyHypothesis,
  StrategyLearning,
  ContentFormat,
} from "../types/post";

export interface ParseStrategyInput {
  rawNotes: string;
  caption?: string;
  mediaType: string;
}

export interface ParsedStrategy {
  format?: ContentFormat;
  intent?: CreativeIntent;
  craft?: CraftNotes;
  hypotheses?: StrategyHypothesis[];
  learnings?: StrategyLearning[];
}

/**
 * Build the prompt for parsing raw strategy notes
 */
export function buildStrategyParsePrompt(input: ParseStrategyInput): string {
  return `You are analyzing a content creator's notes about their Instagram post. Parse their raw notes into structured strategy fields.

=== POST CONTEXT ===
Media Type: ${input.mediaType}
Caption: "${input.caption || "(no caption)"}"

=== RAW NOTES FROM CREATOR ===
${input.rawNotes}

=== TASK ===
Parse these notes into structured fields. Return ONLY valid JSON:

{
  "format": "...",
  "intent": {
    "targetAudience": "...",
    "desiredEffect": "...",
    "emotionalTargets": ["...", "..."],
    "psychologicalLevers": ["...", "..."]
  },
  "craft": {
    "techniques": ["...", "..."],
    "keyDecisions": "...",
    "structure": "...",
    "mediaStrategy": "..."
  },
  "hypotheses": [
    {
      "id": "h1",
      "prediction": "...",
      "rationale": "...",
      "metric": "...",
      "status": "pending"
    }
  ],
  "learnings": [
    {
      "id": "l1",
      "category": "craft|psychology|process|audience",
      "insight": "...",
      "reusable": true,
      "confidence": "tentative"
    }
  ]
}

=== FIELD DEFINITIONS ===

**format** (required): poem | reflective-caption | essay | short-video | carousel | story | reel | static-image | other

**intent** (required):
- targetAudience: Who this content is for (be specific about mindset/situation)
- desiredEffect: What the creator wants the audience to think, understand, or do
- emotionalTargets: Emotions to evoke (e.g., hope, wonder, curiosity, confidence, belonging)
- psychologicalLevers: Mechanisms used (e.g., reframing, metaphor, social proof, future projection, contrast)

**craft** (optional):
- techniques: Literary or communication techniques (e.g., metaphor, imagery, open ending, repetition)
- keyDecisions: Important creative choices and reasoning
- structure: How the content unfolds (e.g., "observation → reflection → expansion → wonder")
- mediaStrategy: How visuals, music, or editing contribute to the effect

**hypotheses** (optional): Predictions about how the content will perform or affect the audience
- prediction: What you expect to happen
- rationale: Why you expect it (the reasoning)
- metric: How you'd measure it (saves, comments about X, DMs, etc.)
- status: Always "pending" for new hypotheses

**learnings** (optional): Insights or principles extracted from creating this content
- category: craft (technique), psychology (audience behavior), process (how you work), audience (who they are)
- insight: The observation or principle
- reusable: Whether this applies to future content
- confidence: "tentative" for new insights, "supported" after testing, "established" after multiple confirmations

=== GUIDELINES ===
- Extract what's in the notes, don't invent things not mentioned
- If something isn't mentioned, omit that field (except required fields)
- Be concise but preserve the creator's specific language where meaningful
- For hypotheses, separate predictions about engagement (saves, comments) from predictions about emotional effect
- Generate unique IDs for hypotheses (h1, h2...) and learnings (l1, l2...)
- All new learnings should have confidence: "tentative"

Return ONLY the JSON object.`;
}

/**
 * Parse the strategy response from Claude
 */
export function parseStrategyResponse(response: string): ParsedStrategy | null {
  try {
    let jsonStr = response.trim();

    // Handle markdown code blocks
    if (jsonStr.startsWith("```")) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        jsonStr = match[1].trim();
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Validate format
    const validFormats = [
      "poem", "reflective-caption", "essay", "short-video",
      "carousel", "story", "reel", "static-image", "other"
    ];
    if (parsed.format && !validFormats.includes(parsed.format)) {
      parsed.format = "other";
    }

    // Validate hypotheses status
    if (parsed.hypotheses) {
      for (const h of parsed.hypotheses) {
        if (!["pending", "confirmed", "refuted", "unclear"].includes(h.status)) {
          h.status = "pending";
        }
      }
    }

    // Validate learnings
    if (parsed.learnings) {
      const validCategories = ["craft", "psychology", "process", "audience"];
      const validConfidence = ["tentative", "supported", "established"];
      for (const l of parsed.learnings) {
        if (!validCategories.includes(l.category)) {
          l.category = "craft";
        }
        if (!validConfidence.includes(l.confidence)) {
          l.confidence = "tentative";
        }
      }
    }

    return parsed as ParsedStrategy;
  } catch (err) {
    console.error("Failed to parse strategy response:", err);
    console.error("Response was:", response);
    return null;
  }
}
