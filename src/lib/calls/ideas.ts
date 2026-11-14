/**
 * Video ideas from a story-call transcript (strategy lane).
 *
 * Extends the call-coverage analysis: given the transcript + the client's tree,
 * propose content a human can react to and hand to video-system. Ideas live in
 * strategy, never in the video app — the video app only renders an APPROVED idea.
 *
 * v1 format (iterate freely): each idea answers one node×lens, carries the belief
 * shift, 3 hook options, a suggested (advisory) format, and facts to confirm.
 *
 * Hook integrity: a `spoken` hook must be Greg's OWN words — it must exist in the
 * transcript. We instruct the model to quote, and then HARD-VALIDATE each spoken
 * hook against the transcript; anything not found is downgraded to `card` (producer
 * framing). This puts the "nothing invented" guarantee upstream of the renderer.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { TreeNode } from "@/lib/notion/tree";

export type HookType = "spoken" | "card";

export interface IdeaHook {
  text: string;
  style: string;          // e.g. "question", "contrarian", "in-media-res"
  type: HookType;         // spoken = verbatim from transcript; card = overlay framing
  preferred: boolean;     // the one we'd render by default
}

export interface VideoIdea {
  node: string;
  lens: string;
  angle: string;
  suggestedFormat: string;      // advisory; the renderer may override
  hooks: IdeaHook[];
  beliefBefore: string;
  beliefAfter: string;
  surprise?: string;
  factsToConfirm: string[];
  isPrimaryNiche: boolean;      // true when the node is the client's edge
}

const IDEAS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ideas"],
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["node", "lens", "angle", "suggestedFormat", "hooks", "beliefBefore", "beliefAfter", "factsToConfirm", "isPrimaryNiche"],
        properties: {
          node: { type: "string", description: "The tree node this trains (exact name from the list)" },
          lens: { type: "string", enum: ["Who", "What", "When", "Where", "Why", "How", "How much", "What if"] },
          angle: { type: "string", description: "One-line premise of the video" },
          suggestedFormat: { type: "string", enum: ["talking-head", "kinetic", "listing", "explainer"] },
          hooks: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["text", "style", "type", "preferred"],
              properties: {
                text: { type: "string" },
                style: { type: "string", description: "question | contrarian | in-media-res | stat | bold-claim" },
                type: { type: "string", enum: ["spoken", "card"], description: "spoken = a line Greg ACTUALLY said in the transcript (quote it verbatim); card = producer-written overlay framing" },
                preferred: { type: "boolean" },
              },
            },
          },
          beliefBefore: { type: "string" },
          beliefAfter: { type: "string" },
          surprise: { type: "string" },
          factsToConfirm: { type: "array", items: { type: "string" } },
          isPrimaryNiche: { type: "boolean" },
        },
      },
    },
  },
} as const;

/** Normalize for verbatim matching (quotes/whitespace/case). */
function norm(s: string): string {
  return s.toLowerCase().replace(/[‘’“”"']/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Enforce the spoken-hook rule: a `spoken` hook must be a substring of the
 * transcript. If not found, downgrade it to `card` (it becomes framing, not a
 * claimed quote). Returns the sanitized ideas.
 */
function validateHooks(ideas: VideoIdea[], transcript: string): VideoIdea[] {
  const hay = norm(transcript);
  return ideas.map((idea) => ({
    ...idea,
    hooks: idea.hooks.map((h) =>
      h.type === "spoken" && !hay.includes(norm(h.text))
        ? { ...h, type: "card" as HookType, style: `${h.style} (not found verbatim → card)` }
        : h
    ),
  }));
}

/**
 * Generate video ideas from a transcript against the tree. Prioritises the
 * primary-niche node (mark it via markPrimaryNiche before calling).
 */
export async function generateVideoIdeas(
  transcript: string,
  nodes: TreeNode[],
  opts?: { max?: number }
): Promise<VideoIdea[]> {
  const targets = nodes.filter((n) => n.status); // skip Structure containers
  const edge = targets.find((n) => n.isPrimaryNiche);
  const nodeList = targets
    .map((n) => `- ${n.name} (status: ${n.status}${n.isPrimaryNiche ? ", PRIMARY NICHE — prioritise" : ""})`)
    .join("\n");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: IDEAS_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `You turn a real-estate agent's story-call transcript into VIDEO IDEAS to show the agent as a recap ("based on our last call, here's what we can make").

Rules:
- Each idea trains ONE tree node (use the exact node name) through ONE lens (the uncertainty it answers).
- ${edge ? `The PRIMARY NICHE is "${edge.name}" — his strongest edge. Lead with it: make it the first ideas and more of them.` : "Prioritise nodes that were substantively discussed."}
- Give exactly 3 hooks per idea, each a DIFFERENT style, and mark one preferred.
- Hook type matters: a "spoken" hook MUST be a line the agent ACTUALLY said — quote it verbatim from the transcript. If you can't find a real line, make it a "card" (producer-written overlay framing) instead. Never put invented words in his mouth as spoken.
- factsToConfirm = specific numbers/claims that need checking before they go on screen (from the "verify" moments in the call).
- Propose ${opts?.max ?? 6} ideas max, strongest first.

TREE NODES:
${nodeList}

TRANSCRIPT:
${transcript}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("Idea generation refused");
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("No ideas output");
  const parsed = JSON.parse(text.text) as { ideas: VideoIdea[] };
  return validateHooks(parsed.ideas ?? [], transcript);
}
