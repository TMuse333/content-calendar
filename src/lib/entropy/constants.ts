/**
 * Entropy Reduction Framework - Constants
 *
 * Universal definitions for the 7-level content strategy system.
 * See /docs/ENTROPY_LEVELS.md for full documentation.
 */

export type EntropyLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";

export interface LevelDefinition {
  name: string;
  question: string;
  purpose: string;
  reach: string;
  goal: string;
  exampleTopics: string[];
}

// The 7 levels - universal, never changes
export const ENTROPY_LEVELS: Record<EntropyLevel, LevelDefinition> = {
  L1: {
    name: "Identity",
    question: "Who are you, what do you do, where?",
    purpose: "Basic awareness — they know you exist",
    reach: "Broadest — anyone in market",
    goal: "Recognition",
    exampleTopics: [
      "Introduction post",
      "Logo/branding",
      "Location tags",
      "\"Hi I'm X\" content",
    ],
  },
  L2: {
    name: "Offer",
    question: "Is this for me? How do I start?",
    purpose: "Qualify — is this relevant to them?",
    reach: "Broad — people considering buying/selling",
    goal: "Self-selection",
    exampleTopics: [
      "\"I help X do Y\"",
      "Service description",
      "Clear CTA",
      "Who I work with",
    ],
  },
  L3: {
    name: "Process",
    question: "How does it work? Cost? Timing?",
    purpose: "Demystify — remove fear of the unknown",
    reach: "Medium — people actively considering",
    goal: "Reduce anxiety, build confidence",
    exampleTopics: [
      "What happens after your offer is accepted",
      "What closing day looks like",
      "The home inspection process",
      "What selling actually costs",
      "Timeline of buying a home",
    ],
  },
  L4: {
    name: "Proof",
    question: "Has it worked for people like me?",
    purpose: "Validate — has this worked before?",
    reach: "Medium — people evaluating options",
    goal: "Trust through evidence",
    exampleTopics: [
      "Just sold stats",
      "Client testimonials",
      "Before/after stories",
      "Case studies",
      "Reviews",
    ],
  },
  L5: {
    name: "Expertise",
    question: "Do you know this market deeply?",
    purpose: "Demonstrate depth — do you REALLY know this?",
    reach: "Narrower — engaged prospects",
    goal: "Authority, \"this person knows more than me\"",
    exampleTopics: [
      "Market update / stats",
      "Is winter a bad time to list?",
      "North Shore vs Charlottetown",
      "Interest rate insights",
      "Pricing strategies",
    ],
  },
  L6: {
    name: "Situations",
    question: "Do you understand MY exact situation?",
    purpose: "Mirror — do you understand MY specific case?",
    reach: "Narrow — specific segments",
    goal: "\"They get me\" feeling",
    exampleTopics: [
      "First-time buyer guide",
      "Downsizing after kids leave",
      "Inherited property decisions",
      "Relocating to PEI",
      "Selling during divorce",
    ],
  },
  L7: {
    name: "Personality",
    question: "Do I trust and like this person?",
    purpose: "Connect — do I like/trust this person?",
    reach: "Narrowest — relationship building",
    goal: "Emotional connection, loyalty",
    exampleTopics: [
      "My story / why I do this",
      "Behind the scenes",
      "Values and beliefs",
      "Personal moments",
      "Community involvement",
    ],
  },
};

// Default target mix (percentage per level)
export const DEFAULT_TARGET_MIX: Record<EntropyLevel, number> = {
  L1: 10,
  L2: 10,
  L3: 15,
  L4: 15,
  L5: 25,
  L6: 15,
  L7: 10,
};

// Visual styling for each level
export const LEVEL_COLORS: Record<EntropyLevel, { bg: string; text: string; border: string }> = {
  L1: { bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/30" },
  L2: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  L3: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30" },
  L4: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
  L5: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  L6: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  L7: { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/30" },
};

// Hex colors for charts/graphics
export const LEVEL_HEX_COLORS: Record<EntropyLevel, string> = {
  L1: "#64748b", // slate
  L2: "#3b82f6", // blue
  L3: "#06b6d4", // cyan
  L4: "#22c55e", // green
  L5: "#a855f7", // purple
  L6: "#f59e0b", // amber
  L7: "#ec4899", // pink
};

// Content mix guidelines
export const CONTENT_MIX_GUIDELINES = {
  awareness: {
    levels: ["L1", "L2"] as EntropyLevel[],
    targetPercent: 20,
    description: "Listings, branding, recognition",
  },
  education: {
    levels: ["L3", "L4"] as EntropyLevel[],
    targetPercent: 30,
    description: "Process, proof",
  },
  conversion: {
    levels: ["L5", "L6"] as EntropyLevel[],
    targetPercent: 40,
    description: "Expertise, situations — CAROUSEL FOCUS",
  },
  connection: {
    levels: ["L7"] as EntropyLevel[],
    targetPercent: 10,
    description: "Personality, trust",
  },
};

// Carousel sweet spot
export const CAROUSEL_PRIORITY_LEVELS: EntropyLevel[] = ["L3", "L5", "L6"];

// Common gaps for most agents
export const COMMON_GAPS: { level: EntropyLevel; reason: string }[] = [
  { level: "L3", reason: "Assume people know the process" },
  { level: "L5", reason: "Have knowledge but don't share it" },
  { level: "L6", reason: "Rarely address specific situations" },
];
