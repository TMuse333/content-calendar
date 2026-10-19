/**
 * Post Types for Content Analyzer
 */

import { ObjectId } from "mongodb";
import type { UnderlyingNeed } from "./account";

// Content types (what value does the post provide)
export type ContentType =
  | "case-study"      // Showing client results or completed work
  | "tutorial"        // Teaching how to do something
  | "insight"         // Sharing a perspective, opinion, or realization
  | "behind-scenes"   // Showing your process
  | "showcase"        // Demonstrating capabilities
  | "announcement";   // News or updates

// Post metrics from Instagram
export interface PostMetrics {
  likes: number;
  comments: number;
  reach: number;
  impressions: number;
  engagement: number;     // likes + comments + shares
  videoViews?: number;
  saves?: number;
  shares?: number;
}

// AI classification result
export interface PostClassification {
  contentType: ContentType;
  subject: string;                    // 2-5 word topic
  underlyingNeed: UnderlyingNeed;
  coreMessage: string;                // 1 sentence summary
  classifiedAt: Date;
}

// Content format (how it's presented)
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

// Creative intent
export interface CreativeIntent {
  targetAudience: string;             // Who this is for
  desiredEffect: string;              // What you want them to think/do
  emotionalTargets?: string[];        // Emotions to evoke: hope, wonder, etc.
  psychologicalLevers?: string[];     // Mechanisms: reframing, social proof, etc.
}

// Craft notes
export interface CraftNotes {
  techniques?: string[];              // Literary/communication techniques used
  keyDecisions?: string;              // Important creative choices and why
  structure?: string;                 // Sequence of ideas/emotional shifts
  mediaStrategy?: string;             // How visuals/music/editing contribute
}

// Hypothesis about effect
export interface StrategyHypothesis {
  id: string;
  prediction: string;                 // What you expect to happen
  rationale?: string;                 // Why you expect it
  metric?: string;                    // How to measure it
  status: "pending" | "confirmed" | "refuted" | "unclear";
  resultNotes?: string;               // What actually happened
}

// Learning extracted from a post
export type LearningCategory = "craft" | "psychology" | "process" | "audience";
export type LearningConfidence = "tentative" | "supported" | "established";

export interface StrategyLearning {
  id: string;
  category: LearningCategory;
  insight: string;                    // The observation or principle
  reusable: boolean;                  // Can apply to future content
  confidence: LearningConfidence;
}

// Manual strategy tags (user can edit/override)
export interface PostStrategy {
  // Existing fields
  campaignId?: string;
  infoPoints?: string[];              // IDs of info points this covers
  deliveryNotes?: string;

  // Raw input from user
  rawNotes?: string;                  // Original unstructured notes
  parsedAt?: Date;                    // When LLM parsed the notes

  // Structured fields (from LLM parsing)
  intent?: CreativeIntent;
  craft?: CraftNotes;
  hypotheses?: StrategyHypothesis[];
  learnings?: StrategyLearning[];
}

// Main Post interface
export interface Post {
  _id?: ObjectId;
  accountId: string;                  // "syntellic", "thomas-musial"
  instagramId: string;                // Instagram's post ID

  // From Instagram API
  mediaType: "VIDEO" | "IMAGE" | "CAROUSEL_ALBUM";
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  permalink: string;
  postedAt: Date;

  // Metrics (saved for analysis)
  metrics: PostMetrics;

  // Transcript (from Whisper, for videos)
  transcript?: string;
  transcribedAt?: Date;

  // AI Classification (from Claude)
  classification?: PostClassification;

  // Content format (how it's presented, separate from mediaType)
  format?: ContentFormat;

  // Manual Strategy Tags
  strategy?: PostStrategy;

  // Metadata
  syncedAt: Date;
  updatedAt: Date;
}

// Period type for insights
export type InsightsPeriod = "weekly" | "monthly" | "all-time";

// Citation reference to a specific post
export interface PostCitation {
  instagramId: string;
  caption?: string;                   // First 100 chars for context
  contentType?: ContentType;
  reach?: number;
}

// Generated insights
export interface ContentInsights {
  _id?: ObjectId;
  accountId: string;
  generatedAt: Date;

  // Period covered
  period: InsightsPeriod;
  periodStart?: Date;                 // For weekly/monthly
  periodEnd?: Date;

  // Analysis
  postCount: number;
  postsAnalyzed: string[];            // Instagram IDs of posts included
  insights: string;                   // Markdown content from Claude
  citations?: PostCitation[];         // Posts referenced in the insights
}

// Note types
export type NoteType = "idea" | "observation" | "action" | "note";

// Strategy note
export interface StrategyNote {
  _id?: ObjectId;
  accountId: string;
  content: string;
  type: NoteType;

  // Optional links
  linkedInsightId?: string;           // Link to a specific insight
  linkedPostId?: string;              // Link to a specific post

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
