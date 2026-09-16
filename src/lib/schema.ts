/**
 * Schema Types
 *
 * Re-exports account types and defines post/analytics types.
 */

import { ObjectId } from "mongodb";

// Re-export account types
export type {
  AccountStatus,
  UnderlyingNeed,
  InformationPoint,
  Campaign,
  InstagramConnection,
  PlatformConnections,
  BrandConfig,
  StrategyAccount,
  CreateAccountRequest,
  UpdateAccountRequest,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from "./types/account";

// ============================================================================
// POSTS
// ============================================================================

export type PostStatus = "draft" | "scheduled" | "posted" | "failed";
export type MediaType = "image" | "video" | "carousel";
export type ContentSourceType = "upload" | "listing-graphics" | "video-system";

export interface PostMedia {
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  source: ContentSourceType;
  sourceId?: string; // ID in external system if pulled
}

export interface Post {
  _id?: ObjectId;
  accountId: string;          // Account slug (e.g., "thomas-musial")

  // Content
  media?: PostMedia;
  caption: string;

  // Strategy link - which campaign and info points
  campaignId?: string;
  informationPointIds: string[];

  // Human nature layer (optional)
  underlyingNeed?: string;
  deliveryNotes?: string;

  // Platform & scheduling
  platform: "instagram" | "youtube" | "tiktok";
  scheduledFor?: Date;
  status: PostStatus;

  // After posting
  postedAt?: Date;
  platformPostId?: string;
  permalink?: string;

  // Error tracking
  lastError?: string;
  retryCount?: number;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface PostAnalytics {
  _id?: ObjectId;
  postId: ObjectId;
  platformPostId: string;
  platform: "instagram" | "youtube" | "tiktok";

  // Metrics
  impressions: number;
  reach: number;
  engagement: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  videoViews?: number;

  // When this snapshot was taken
  fetchedAt: Date;
}

// ============================================================================
// COVERAGE (computed per campaign)
// ============================================================================

export interface InformationPointCoverage {
  id: string;
  text: string;
  postCount: number;
  lastPostedAt?: Date;
  status: "gap" | "light" | "covered";
}

export interface CampaignCoverage {
  campaignId: string;
  campaignName: string;
  coverage: InformationPointCoverage[];
  overallProgress: number; // 0-1
}

// ============================================================================
// API REQUEST TYPES
// ============================================================================

export interface CreatePostRequest {
  media?: PostMedia;
  caption: string;
  campaignId?: string;
  informationPointIds?: string[];
  underlyingNeed?: string;
  deliveryNotes?: string;
  platform: "instagram" | "youtube" | "tiktok";
  scheduledFor?: string; // ISO date string
  status?: PostStatus;
}

export interface UpdatePostRequest {
  media?: PostMedia;
  caption?: string;
  campaignId?: string;
  informationPointIds?: string[];
  underlyingNeed?: string;
  deliveryNotes?: string;
  scheduledFor?: string;
  status?: PostStatus;
}
