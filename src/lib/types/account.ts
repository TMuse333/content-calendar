/**
 * Account Types for Strategy App
 *
 * The StrategyAccount is the central config for content strategy.
 * It owns campaigns, platform connections, and coordinates with
 * video-system and listing-graphics as renderers.
 */

import { ObjectId } from "mongodb";

// Account status
export type AccountStatus = "active" | "inactive" | "suspended";

// Underlying human needs (why people care)
export type UnderlyingNeed =
  | "security"    // They want to feel safe / reduce risk
  | "status"      // They want to be seen as X
  | "belonging"   // They want to be part of something
  | "autonomy"    // They want control over their situation
  | "certainty"   // They want to know the path forward
  | "growth"      // They want to become better
  | "meaning";    // They want what they do to matter

// Information point - a piece of info you're trying to transmit
export interface InformationPoint {
  id: string;
  text: string;
  // Future: could add priority, examples, etc.
}

// Campaign - a focused effort to transmit certain information
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  informationPoints: InformationPoint[];

  // Audience & approach
  underlyingNeed?: UnderlyingNeed | null;
  secondaryNeed?: UnderlyingNeed | null;
  deliveryStyle?: string | null;  // "calm-authority", "energetic", "educational", etc.

  // Schedule goals
  postsPerWeek?: number;
  startDate?: Date;
  endDate?: Date;

  status: "active" | "paused" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

// Platform connection (Instagram, etc.)
export interface InstagramConnection {
  connected: boolean;
  accessToken?: string;
  userId?: string;
  username?: string;
  connectedAt?: Date;
}

export interface PlatformConnections {
  instagram?: InstagramConnection;
  // Future: tiktok, youtube, linkedin, etc.
}

// Brand config
export interface BrandConfig {
  primaryColor?: string;
  secondaryColor?: string;
  headshotUrl?: string;
  logoUrl?: string;
}

// Main StrategyAccount interface
export interface StrategyAccount {
  _id?: ObjectId;
  id: string;                     // Unique slug (e.g., "thomas-musial")
  name: string;                   // Display name
  handle?: string;                // Social handle (e.g., "@thomasmusial")
  email?: string;

  // Content strategy
  campaigns: Campaign[];

  // Platform connections
  platforms: PlatformConnections;

  // Branding
  brand?: BrandConfig;

  // Metadata
  status: AccountStatus;
  isActive: boolean;              // Soft delete flag
  createdAt: Date;
  updatedAt: Date;
}

// Request types
export interface CreateAccountRequest {
  id?: string;                    // Auto-generated from name if not provided
  name: string;
  handle?: string;
  email?: string;
  brand?: BrandConfig;
}

export interface UpdateAccountRequest {
  name?: string;
  handle?: string;
  email?: string;
  status?: AccountStatus;
  brand?: Partial<BrandConfig>;
  platforms?: Partial<PlatformConnections>;
}

// Campaign request types
export interface CreateCampaignRequest {
  name: string;
  description?: string;
  informationPoints?: InformationPoint[];
  underlyingNeed?: UnderlyingNeed;
  secondaryNeed?: UnderlyingNeed;
  deliveryStyle?: string;
  postsPerWeek?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  informationPoints?: InformationPoint[];
  underlyingNeed?: UnderlyingNeed | null;
  secondaryNeed?: UnderlyingNeed | null;
  deliveryStyle?: string | null;
  postsPerWeek?: number;
  startDate?: string;
  endDate?: string;
  status?: "active" | "paused" | "completed";
}
