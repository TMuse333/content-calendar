/**
 * Post Types for Strategy App
 *
 * Combines:
 * - Core Instagram data
 * - Metrics (with optional engagement for backward compat)
 * - AI classification (optional)
 * - Strategy metadata (optional)
 * - Simplified flat fields (niche, topic, notes)
 */

import { ObjectId } from "mongodb";
import type { UnderlyingNeed } from "./account";

// =============================================================================
// CONTENT TYPES
// =============================================================================
export type ContentType =
  | "case-study"
  | "tutorial"
  | "insight"
  | "behind-scenes"
  | "showcase"
  | "announcement";

// =============================================================================
// POST METRICS
// =============================================================================
export interface PostMetrics {
  reach: number;
  likes: number;
  comments: number;
  impressions?: number;
  engagement?: number;      // likes + comments + shares (optional for backward compat)
  videoViews?: number;
  saves?: number;
  shares?: number;
}

// =============================================================================
// AI CLASSIFICATION
// =============================================================================
export interface PostClassification {
  contentType: ContentType;
  subject: string;
  underlyingNeed: UnderlyingNeed;
  coreMessage: string;
  classifiedAt: Date;
}

// =============================================================================
// CONTENT FORMAT
// =============================================================================
export type ContentFormat =
  | "poem"
  | "reflective-caption"
  | "essay"
  | "short-video"
  | "carousel"
  | "story"
  | "reel"
  | "static-image"
  | "other";

// =============================================================================
// STRATEGY TYPES
// =============================================================================
export interface CreativeIntent {
  targetAudience: string;
  desiredEffect: string;
  emotionalTargets?: string[];
  psychologicalLevers?: string[];
}

export interface CraftNotes {
  techniques?: string[];
  keyDecisions?: string;
  structure?: string;
  mediaStrategy?: string;
}

export interface StrategyHypothesis {
  id: string;
  prediction: string;
  rationale?: string;
  metric?: string;
  status: "pending" | "confirmed" | "refuted" | "unclear";
  resultNotes?: string;
}

export type LearningCategory = "craft" | "psychology" | "process" | "audience";
export type LearningConfidence = "tentative" | "supported" | "established";

export interface StrategyLearning {
  id: string;
  category: LearningCategory;
  insight: string;
  reusable: boolean;
  confidence: LearningConfidence;
}

export interface PostStrategy {
  campaignId?: string;
  infoPoints?: string[];
  deliveryNotes?: string;
  rawNotes?: string;
  parsedAt?: Date;
  intent?: CreativeIntent;
  craft?: CraftNotes;
  hypotheses?: StrategyHypothesis[];
  learnings?: StrategyLearning[];
}

// =============================================================================
// POST STATUS
// =============================================================================
export type PostStatus = "idea" | "draft" | "ready" | "scheduled" | "posted";

// =============================================================================
// MAIN POST INTERFACE
// =============================================================================
export interface Post {
  _id?: ObjectId;
  accountId: string;
  instagramId: string;

  // From Instagram API
  mediaType: "VIDEO" | "IMAGE" | "CAROUSEL_ALBUM";
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  permalink: string;
  postedAt: Date;

  // Metrics
  metrics: PostMetrics;

  // Transcript (for videos)
  transcript?: string;
  transcribedAt?: Date;

  // AI Classification (optional)
  classification?: PostClassification;

  // Content format (optional)
  format?: ContentFormat;

  // Strategy (optional - structured)
  strategy?: PostStrategy;

  // Strategy (simplified flat fields)
  niche?: string;
  topic?: string;
  notes?: string;
  status?: PostStatus;

  // Metadata
  syncedAt: Date;
  updatedAt: Date;
}

// =============================================================================
// INSIGHTS
// =============================================================================
export type InsightsPeriod = "weekly" | "monthly" | "all-time";

export interface PostCitation {
  instagramId: string;
  caption?: string;
  contentType?: ContentType;
  reach?: number;
}

export interface ContentInsights {
  _id?: ObjectId;
  accountId: string;
  generatedAt: Date;
  period: InsightsPeriod;
  periodStart?: Date;
  periodEnd?: Date;
  postCount: number;
  postsAnalyzed: string[];
  insights: string;
  citations?: PostCitation[];
}

// =============================================================================
// STRATEGY NOTES
// =============================================================================
export type NoteType = "idea" | "observation" | "action" | "note";

export interface StrategyNote {
  _id?: ObjectId;
  accountId: string;
  content: string;
  type: NoteType;
  linkedInsightId?: string;
  linkedPostId?: string;
  createdAt: Date;
  updatedAt: Date;
}
