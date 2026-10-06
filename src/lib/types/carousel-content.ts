/**
 * Carousel Content Types
 *
 * These define the content structure each carousel format expects.
 * Strategy generates this content, Graphics App renders it.
 *
 * Flow: Brief → Content → Render Session → Graphics App → Rendered Slides
 */

// ============ SHARED TYPES ============

export interface CarouselImage {
  type: "property" | "headshot" | "landscape" | "icon";
  src?: string; // URL or undefined for placeholder
}

// ============ CLIENT QUESTIONS (5 frames) ============

export interface ClientQuestionsContent {
  title: string; // "Questions I Got This Month"
  questions: [
    { q: string; a: string },
    { q: string; a: string },
    { q: string; a: string }
  ];
  testimonial: {
    quote: string;
    client: string;
    town: string;
    image: CarouselImage;
  };
  cta: string;
}

// ============ THIS OR THAT (7 frames) ============

export interface ThisOrThatContent {
  a: { label: string; image: CarouselImage };
  b: { label: string; image: CarouselImage };
  rows: [
    { criterion: string; a: string; b: string; winner?: "a" | "b" | "tie" },
    { criterion: string; a: string; b: string; winner?: "a" | "b" | "tie" },
    { criterion: string; a: string; b: string; winner?: "a" | "b" | "tie" },
    { criterion: string; a: string; b: string; winner?: "a" | "b" | "tie" },
    { criterion: string; a: string; b: string; winner?: "a" | "b" | "tie" }
  ];
  cta: string;
}

// ============ MYTH VS FACT (6 frames) ============

export interface MythVsFactContent {
  title: string; // "5 Seller Myths"
  items: [
    { myth: string; fact: string },
    { myth: string; fact: string },
    { myth: string; fact: string },
    { myth: string; fact: string }
  ];
  cta: string;
}

// ============ MARKET PULSE (5 frames) ============

export interface MarketPulseContent {
  kicker: string; // "PEI Market Update"
  hero: CarouselImage;
  headline: {
    value: string;
    label: string;
  };
  stats: [
    {
      value: string;
      label: string;
      delta?: number; // percent change
      meaning: string;
      source: string;
    },
    {
      value: string;
      label: string;
      delta?: number;
      meaning: string;
      source: string;
    },
    {
      value: string;
      label: string;
      delta?: number;
      meaning: string;
      source: string;
    }
  ];
  close: {
    buyers: string;
    sellers: string;
    cta: string;
  };
}

// ============ PROCESS TIMELINE (10 frames) ============

export interface ProcessTimelineStep {
  title: string;
  q: string;
  a: string;
  duration: string;
  icon?: string;
}

export interface ProcessTimelineContent {
  title: string; // "Buying in PEI: Offer to Keys"
  totalTimeline: string; // "45-60 days"
  panorama: CarouselImage;
  steps: ProcessTimelineStep[];
  cta: string;
}

// ============ UNION TYPE ============

export type CarouselContent =
  | { format: "ClientQuestionsCarousel"; content: ClientQuestionsContent }
  | { format: "ThisOrThatCarousel"; content: ThisOrThatContent }
  | { format: "MythVsFactCarousel"; content: MythVsFactContent }
  | { format: "MarketPulseCarousel"; content: MarketPulseContent }
  | { format: "ProcessTimelineCarousel"; content: ProcessTimelineContent };

// ============ RENDER SESSION TYPES ============

export interface AgentProfile {
  name: string;
  phone: string;
  email: string;
  website: string;
  brokerage: string;
  headshotUrl?: string;
}

export interface CreateRenderSessionRequest {
  postId: string;
  agentId: string;
  format: string;
  callbackUrl: string;
  content: Record<string, unknown>;
  agent: AgentProfile;
  question?: string;
  level?: "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";
  isEvergreen?: boolean;
  mode?: "render" | "revision";
  version?: number;
  feedback?: string;
}

export interface CreateRenderSessionResponse {
  sessionId: string;
  embedUrl: string;
  expiresIn: number;
  expiresAt: string;
}

export interface GraphicsCallbackPayload {
  graphicId: string;
  previewUrl: string;
  graphicUrls: string[];
  format: string;
  renderedAt: string;
  metadata: {
    templateId: string;
    dimensions: { width: number; height: number };
    slideCount: number;
    level: string | null;
    isEvergreen: boolean;
    question: string;
    version: number;
    sessionId: string | null;
    processedBy: string;
  };
}

// ============ FORMAT METADATA ============

export const CAROUSEL_FORMATS = {
  ClientQuestionsCarousel: {
    name: "Client Questions",
    slideCount: 5,
    description: "Answer 3 common questions with a testimonial",
    bestFor: ["L5", "L6"],
  },
  ThisOrThatCarousel: {
    name: "This or That",
    slideCount: 7,
    description: "Compare two options across 5 criteria",
    bestFor: ["L3", "L5"],
  },
  MythVsFactCarousel: {
    name: "Myth vs Fact",
    slideCount: 6,
    description: "Bust 4 common myths",
    bestFor: ["L5", "L6"],
  },
  MarketPulseCarousel: {
    name: "Market Pulse",
    slideCount: 5,
    description: "Share 3 market stats with context",
    bestFor: ["L5"],
  },
  ProcessTimelineCarousel: {
    name: "Process Timeline",
    slideCount: 10,
    description: "Walk through a process step by step",
    bestFor: ["L3"],
  },
} as const;

export type CarouselFormatId = keyof typeof CAROUSEL_FORMATS;
