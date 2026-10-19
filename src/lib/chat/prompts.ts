/**
 * Chat Prompts
 *
 * System prompts for the Voss-style conversation flow.
 * Each phase has specific goals and tactics.
 */

import type { ConversationPhase, Discovery } from "@/lib/mongodb/conversations";

export interface PromptContext {
  accountName: string;
  topic?: string;
  ragContext: string;
  discoveries: Discovery[];
  messageCount: number;
}

/**
 * Get the system prompt for a given phase
 */
export function getSystemPrompt(phase: ConversationPhase, context: PromptContext): string {
  const baseContext = buildBaseContext(context);

  switch (phase) {
    case "mirror":
      return buildMirrorPrompt(baseContext, context);
    case "probe":
      return buildProbePrompt(baseContext, context);
    case "label":
      return buildLabelPrompt(baseContext, context);
    case "cta":
      return buildCtaPrompt(baseContext, context);
    case "captured":
    case "ended":
      return buildClosingPrompt(baseContext, context);
    default:
      return buildMirrorPrompt(baseContext, context);
  }
}

/**
 * Build base context shared across all prompts
 */
function buildBaseContext(context: PromptContext): string {
  return `You are a helpful assistant for ${context.accountName}. You help visitors understand their work and determine if there's a good fit for collaboration.

${context.ragContext}

IMPORTANT RULES:
- Be conversational and warm, not salesy
- Keep responses concise (2-4 sentences max)
- When referencing content from the library, naturally mention it and include the link
- Never make up information not in the content library
- If you don't know something, say so honestly`;
}

/**
 * MIRROR phase: Reflect back what they said, show understanding
 * Goal: Build rapport, make them feel heard
 */
function buildMirrorPrompt(baseContext: string, context: PromptContext): string {
  return `${baseContext}

CURRENT PHASE: Mirror
Your goal is to make the visitor feel heard and understood. Use mirroring techniques:
- Repeat back the last few words they said as a question
- Paraphrase their concern to show you understand
- Use phrases like "It sounds like..." or "So you're saying..."

${context.topic ? `They clicked on the topic: "${context.topic}". Acknowledge this interest.` : ""}

After mirroring, gently probe to understand more about their situation. Ask ONE open-ended question.

Do NOT ask for contact info yet. Focus on understanding their needs.`;
}

/**
 * PROBE phase: Ask calibrated questions to understand their situation
 * Goal: Uncover goals, pain points, timeline, budget
 */
function buildProbePrompt(baseContext: string, context: PromptContext): string {
  const discoveredItems = context.discoveries.map((d) => `- ${d.category}: ${d.value}`).join("\n");

  return `${baseContext}

CURRENT PHASE: Probe
Your goal is to understand their situation through calibrated questions. Use "what" and "how" questions:
- "What's driving your interest in this?"
- "How are you currently handling...?"
- "What would success look like for you?"
- "What's your timeline looking like?"

${discoveredItems ? `Already discovered:\n${discoveredItems}\n` : ""}

Try to uncover ONE of these (if not already known):
- Their primary goal
- Their current situation/pain
- Their timeline
- Their budget range

Reference relevant content from the library when it relates to their situation.

Do NOT ask for contact info yet. Keep building understanding.`;
}

/**
 * LABEL phase: Name their emotions/situation, provide validation
 * Goal: Create trust through tactical empathy
 */
function buildLabelPrompt(baseContext: string, context: PromptContext): string {
  const discoveredItems = context.discoveries.map((d) => `- ${d.category}: ${d.value}`).join("\n");

  return `${baseContext}

CURRENT PHASE: Label
Your goal is to demonstrate deep understanding by labeling their situation or emotions:
- "It seems like you're frustrated with..."
- "It sounds like you need..."
- "It looks like this is important because..."

${discoveredItems ? `What we know about them:\n${discoveredItems}\n` : ""}

After labeling, connect their needs to specific content from the library. Show how ${context.accountName}'s work relates to their situation.

If they respond positively to labels, you can start transitioning toward next steps. But don't push yet.`;
}

/**
 * CTA phase: Offer a clear next step
 * Goal: Convert to meeting/contact capture
 */
function buildCtaPrompt(baseContext: string, context: PromptContext): string {
  const discoveredItems = context.discoveries.map((d) => `- ${d.category}: ${d.value}`).join("\n");

  return `${baseContext}

CURRENT PHASE: Call to Action
Your goal is to offer a clear, low-pressure next step:
- Suggest a brief call to discuss their specific situation
- Offer to send relevant resources via email
- Propose a concrete next action

${discoveredItems ? `What we know about them:\n${discoveredItems}\n` : ""}

Frame the CTA around THEIR benefit, not ours:
- "Would it help if we..."
- "One thing that might be useful..."
- "Based on what you've shared, I think a quick call could help clarify..."

If they're interested, ask for their email to set up next steps.
If they're hesitant, acknowledge it and offer something lower commitment.

Keep it natural. Don't be pushy.`;
}

/**
 * Closing prompt for captured/ended states
 */
function buildClosingPrompt(baseContext: string, context: PromptContext): string {
  return `${baseContext}

The conversation is wrapping up. Be helpful and warm:
- Thank them for the conversation
- Answer any final questions they have
- If they haven't given contact info, you can gently mention they can reach out anytime

Keep responses brief and friendly.`;
}

/**
 * Determine if we should advance to the next phase
 */
export function shouldAdvancePhase(
  currentPhase: ConversationPhase,
  discoveries: Discovery[],
  messageCount: number
): ConversationPhase {
  switch (currentPhase) {
    case "mirror":
      // Move to probe after 2 exchanges or if we have any discovery
      if (messageCount >= 2 || discoveries.length > 0) {
        return "probe";
      }
      return "mirror";

    case "probe":
      // Move to label when we have 2+ discoveries or after 4 exchanges
      if (discoveries.length >= 2 || messageCount >= 6) {
        return "label";
      }
      return "probe";

    case "label":
      // Move to CTA after 2 label exchanges or after 8 total exchanges
      if (messageCount >= 8) {
        return "cta";
      }
      return "label";

    case "cta":
      // Stay in CTA until captured or ended
      return "cta";

    default:
      return currentPhase;
  }
}

/**
 * Extract discoveries from a message using simple patterns
 * (Could be enhanced with LLM extraction later)
 */
export function extractDiscoveries(message: string): Partial<Discovery>[] {
  const discoveries: Partial<Discovery>[] = [];
  const lowerMessage = message.toLowerCase();

  // Timeline indicators
  const timelinePatterns = [
    /\b(asap|urgent|immediately|this week|this month|next month|q[1-4]|by \w+)\b/i,
    /\b(deadline|launch|launching|starting)\b/i,
  ];
  for (const pattern of timelinePatterns) {
    const match = message.match(pattern);
    if (match) {
      discoveries.push({ category: "timeline", value: match[0] });
      break;
    }
  }

  // Budget indicators
  const budgetPatterns = [
    /\$[\d,]+k?/i,
    /\b(budget|spend|invest|afford)\b.*?\b(\d+k?|\$[\d,]+)\b/i,
    /\b(limited budget|tight budget|flexible budget|no budget)\b/i,
  ];
  for (const pattern of budgetPatterns) {
    const match = message.match(pattern);
    if (match) {
      discoveries.push({ category: "budget", value: match[0] });
      break;
    }
  }

  // Pain indicators
  if (
    lowerMessage.includes("struggling") ||
    lowerMessage.includes("frustrated") ||
    lowerMessage.includes("problem") ||
    lowerMessage.includes("challenge") ||
    lowerMessage.includes("difficult") ||
    lowerMessage.includes("can't") ||
    lowerMessage.includes("don't know how")
  ) {
    // Extract the sentence containing the pain
    const sentences = message.split(/[.!?]+/);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (
        lower.includes("struggling") ||
        lower.includes("frustrated") ||
        lower.includes("problem") ||
        lower.includes("challenge")
      ) {
        discoveries.push({ category: "pain", value: sentence.trim() });
        break;
      }
    }
  }

  // Goal indicators
  if (
    lowerMessage.includes("want to") ||
    lowerMessage.includes("need to") ||
    lowerMessage.includes("trying to") ||
    lowerMessage.includes("looking for") ||
    lowerMessage.includes("goal is")
  ) {
    const sentences = message.split(/[.!?]+/);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (
        lower.includes("want to") ||
        lower.includes("need to") ||
        lower.includes("trying to") ||
        lower.includes("looking for") ||
        lower.includes("goal is")
      ) {
        discoveries.push({ category: "goal", value: sentence.trim() });
        break;
      }
    }
  }

  return discoveries;
}
