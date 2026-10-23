/**
 * Post Types for Strategy App
 *
 * Simplified structure focused on what matters:
 * - Core Instagram data
 * - Metrics that matter
 * - Niche/topic for strategy
 * - Freeform notes
 */

import { ObjectId } from "mongodb";

// Post metrics from Instagram
export interface PostMetrics {
  reach: number;
  likes: number;
  comments: number;
  saves?: number;
  shares?: number;
  impressions?: number;
  videoViews?: number;
}

// Post status in the workflow
export type PostStatus = "idea" | "draft" | "ready" | "scheduled" | "posted";

// Main Post interface
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

  // Strategy (simplified)
  niche?: string;              // "first-time buyers", "luxury sellers"
  topic?: string;              // What it's about
  notes?: string;              // Freeform strategy thoughts
  status?: PostStatus;

  // Transcript (for videos)
  transcript?: string;
  transcribedAt?: Date;

  // Metadata
  syncedAt: Date;
  updatedAt: Date;
}

// Period type for insights
export type InsightsPeriod = "weekly" | "monthly" | "all-time";

// Citation reference to a specific post
export interface PostCitation {
  instagramId: string;
  caption?: string;
  reach?: number;
}

// Generated insights
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
