/**
 * Tracked Post Types
 *
 * MongoDB owns Instagram analytics data.
 * These are metrics pulled from the IG API after a post is published.
 *
 * Join key: igPostUrl matches NotionPost.igPostLink
 * This connects strategy (Notion) to performance (MongoDB).
 */

import { ObjectId } from "mongodb";

// =============================================================================
// IG METRICS (from Instagram API)
// =============================================================================

export interface IgMetrics {
  // Engagement
  likes: number;
  comments: number;
  shares: number;
  saves: number;

  // Reach
  impressions: number;
  reach: number;

  // Interactions
  profileVisits?: number;
  websiteClicks?: number;
  follows?: number;

  // Video-specific
  plays?: number;
  videoViews?: number;

  // Engagement rate (calculated)
  engagementRate?: number;

  // When these metrics were fetched
  fetchedAt: Date;
}

// =============================================================================
// METRICS HISTORY (track changes over time)
// =============================================================================

export interface MetricsSnapshot {
  timestamp: Date;
  metrics: IgMetrics;
}

// =============================================================================
// TRACKED POST (the main document)
// =============================================================================

export interface TrackedPost {
  _id?: ObjectId;

  // References
  accountId: string;              // Which account this belongs to
  igPostUrl: string;              // Instagram post URL (JOIN KEY to Notion!)
  igPostId?: string;              // Instagram media ID (for API calls)

  // Post metadata (cached from IG)
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  caption?: string;
  permalink?: string;
  thumbnailUrl?: string;
  publishedAt?: Date;

  // Current metrics (latest)
  metrics: IgMetrics;

  // Historical metrics (track performance over time)
  history: MetricsSnapshot[];

  // Processing status
  lastFetchedAt: Date;
  fetchCount: number;
  fetchErrors?: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// INSIGHTS (derived analysis)
// =============================================================================

export interface PostInsight {
  _id?: ObjectId;
  trackedPostId: ObjectId;        // Reference to TrackedPost
  accountId: string;

  // Generated insights
  performanceTier: "top" | "above_average" | "average" | "below_average" | "underperforming";
  engagementScore: number;        // 0-100 normalized score

  // Analysis (LLM-generated or rule-based)
  whatWorked?: string[];
  whatToImprove?: string[];
  hypothesis?: string;

  // Comparisons
  vsAccountAverage: {
    likesVsAvg: number;           // e.g., +25% or -10%
    commentsVsAvg: number;
    savesVsAvg: number;
    engagementVsAvg: number;
  };

  // Strategy attribution (from Notion)
  notionPostId?: string;          // Notion post ID if linked
  level?: string;                 // L1-L7
  decisionStage?: string;         // 1-6

  // Metadata
  generatedAt: Date;
}

// =============================================================================
// REPORT (periodic summaries written back to Notion)
// =============================================================================

export interface Report {
  _id?: ObjectId;
  accountId: string;

  // Report period
  type: "weekly" | "monthly" | "quarterly";
  periodStart: Date;
  periodEnd: Date;

  // Summary stats
  summary: {
    totalPosts: number;
    totalEngagement: number;
    avgEngagementRate: number;
    topPerformingLevel?: string;
    topPerformingStage?: string;
    reachGrowth?: number;         // vs previous period
    engagementGrowth?: number;
  };

  // Top posts
  topPosts: {
    trackedPostId: ObjectId;
    igPostUrl: string;
    engagementRate: number;
    reason: string;               // Why it performed well
  }[];

  // Recommendations
  recommendations: string[];

  // Notion sync
  notionPageId?: string;          // If written to Notion
  notionSyncedAt?: Date;

  // Metadata
  generatedAt: Date;
  status: "draft" | "final" | "synced_to_notion";
}
