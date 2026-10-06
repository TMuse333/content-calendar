/**
 * Video Package Types for Strategy App
 *
 * Packages are series of videos planned and tracked as a unit.
 * Mirrors video-system's Series/Video schema but focused on strategy & publishing.
 */

import { ObjectId } from "mongodb";

// Episode status
export type EpisodeStatus = "planned" | "scripted" | "recorded" | "edited" | "ready" | "published";

// Animation used in a video
export interface VideoAnimation {
  pattern: string;
  timestamp: string;
  text: string;
  assets?: string[];
  params?: Record<string, unknown>;
}

// Production data imported from video-system
export interface ProductionData {
  importedAt: Date;
  videoSystemId: string; // e.g., "10-video-package/ep01"

  // Core data
  topic?: string;
  transcript?: string;
  hook?: string;
  keyPoints?: string[];

  // Production techniques
  techniques?: string[];
  preProductionNotes?: string[];

  // Animations
  animations?: VideoAnimation[];
  animationPatterns?: string[];

  // AI Summary
  summary?: {
    oneLiner?: string;
    hookAnalysis?: string;
    animationStyle?: string;
    pacing?: string;
    tags?: string[];
  };
}

// Package status (derived from episode statuses)
export type PackageStatus = "planning" | "in_production" | "publishing" | "complete";

// Episode within a package
export interface Episode {
  id: string;
  number: number;
  title: string;
  status: EpisodeStatus;

  // Content
  about?: string;
  informationTransmitted?: string[];

  // Pre-production (synced from video-system or entered here)
  notes?: string[];
  script?: string;

  // Post-production
  videoPath?: string;
  thumbnailPath?: string;
  duration?: number;

  // Production data (imported from video-system)
  productionData?: ProductionData;

  // Publishing
  scheduledAt?: Date;
  publishedAt?: Date;
  instagramId?: string; // Links to Post after publishing
  postPermalink?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Main Video Package interface
export interface VideoPackage {
  _id?: ObjectId;
  accountId: string;

  // Identity
  name: string;
  description?: string;

  // Strategy
  goal?: string;
  context?: string;
  informationTransmitted?: string[]; // What uncertainty does this package reduce?

  // Episodes
  episodes: Episode[];

  // Status (computed or set)
  status: PackageStatus;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Request types
export interface CreatePackageRequest {
  name: string;
  description?: string;
  goal?: string;
  context?: string;
  informationTransmitted?: string[];
  episodes?: Omit<Episode, "id" | "createdAt" | "updatedAt">[];
}

export interface UpdatePackageRequest {
  name?: string;
  description?: string;
  goal?: string;
  context?: string;
  informationTransmitted?: string[];
  status?: PackageStatus;
}

export interface CreateEpisodeRequest {
  number: number;
  title: string;
  about?: string;
  informationTransmitted?: string[];
  notes?: string[];
  script?: string;
}

export interface UpdateEpisodeRequest {
  title?: string;
  status?: EpisodeStatus;
  about?: string;
  informationTransmitted?: string[];
  notes?: string[];
  script?: string;
  videoPath?: string;
  thumbnailPath?: string;
  duration?: number;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  instagramId?: string | null;
  postPermalink?: string | null;
  productionData?: ProductionData | null;
}

// Helper to compute package status from episodes
export function computePackageStatus(episodes: Episode[]): PackageStatus {
  if (episodes.length === 0) return "planning";

  const statuses = episodes.map((e) => e.status);

  if (statuses.every((s) => s === "published")) return "complete";
  if (statuses.some((s) => s === "published" || s === "ready")) return "publishing";
  if (statuses.some((s) => s !== "planned")) return "in_production";

  return "planning";
}
