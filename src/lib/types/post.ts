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

// Manual strategy tags (user can edit/override)
export interface PostStrategy {
  campaignId?: string;
  infoPoints?: string[];              // IDs of info points this covers
  deliveryNotes?: string;
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
