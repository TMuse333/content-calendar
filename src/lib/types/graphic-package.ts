/**
 * Graphic Package Types
 *
 * Manages the business side of selling social media graphics to real estate agents.
 * Two package types:
 * - Announcements: on-demand, allocation-based (16 graphics for $540)
 * - Carousels: planned, subscription-based (8/month for $1,000/month)
 *
 * Packages belong to Accounts (same as video packages, posts, etc.)
 */

import { ObjectId } from "mongodb";

// Package types
export type GraphicPackageType = "announcements" | "carousels";
export type GraphicPackageStatus = "proposed" | "active" | "paused" | "completed";

// Main package definition
export interface GraphicPackage {
  _id?: ObjectId;
  id: string;
  accountId: string;             // Links to Account (e.g., "greg-caseley")
  name: string;                  // e.g., "Announcement Package #1"
  type: GraphicPackageType;
  status: GraphicPackageStatus;

  // For announcements (allocation-based)
  allocation?: number;           // e.g., 16
  used?: number;                 // e.g., 14
  price?: number;                // e.g., 540

  // For carousels (subscription-based)
  monthlyFrequency?: number;     // e.g., 8
  monthlyRate?: number;          // e.g., 1000
  startDate?: Date;              // When subscription started

  createdAt: Date;
  updatedAt: Date;
}

// Question bank for carousels
// Questions come from client calls, not invented
export type QuestionStatus = "unused" | "scheduled" | "published";

export interface QuestionBankItem {
  _id?: ObjectId;
  id: string;
  packageId: string;
  question: string;              // "What happens if the appraisal comes in low?"
  category?: string;             // "buyer", "seller", "general"
  status: QuestionStatus;
  notes?: string;                // Context from client call
  scheduledCarouselId?: string;  // Link to scheduled carousel if scheduled
  createdAt: Date;
  updatedAt: Date;
}

// Content calendar for carousels
export type CarouselStatus = "draft" | "ready" | "published";

// Entropy levels for content strategy (see /lib/entropy)
export type EntropyLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";

// Strategy brief for carousel planning
export interface CarouselBrief {
  goal?: string;              // "Build trust with first-time buyers"
  targetAudience?: string;    // "First-time buyers nervous about financing"
  hook?: string;              // Opening line/visual for first slide
  keyPoints?: string[];       // Slide-by-slide main points
  cta?: string;               // Call-to-action for final slide
  tone?: string;              // "Reassuring, educational"
  designNotes?: string;       // Visual direction, colors, style
}

export interface ScheduledCarousel {
  _id?: ObjectId;
  id: string;
  packageId: string;
  questionId: string;
  question?: string;             // Denormalized for display
  scheduledDate: Date;
  status: CarouselStatus;
  brief?: CarouselBrief;         // Strategy/planning metadata

  // Entropy reduction strategy (see /lib/entropy and /docs/ENTROPY_LEVELS.md)
  level?: EntropyLevel;          // L1-L7 target level
  uncertaintyAddressed?: string; // "What happens if appraisal < offer"
  suggestedFormat?: string;      // "ClientQuestionsCarousel"
  isEvergreen?: boolean;         // Can be reposted later

  graphicUrl?: string;           // Link to exported graphic
  graphicUrls?: string[];        // Multiple slides for carousel
  listingGraphicsProjectId?: string; // Link to design in listing-graphics
  publishedAt?: Date;
  instagramPostId?: string;      // For linking to Post collection
  performance?: {
    impressions: number;
    reach: number;
    engagement: number;
  };
  notes?: string;

  // Client review
  clientFeedback?: string;       // Latest revision feedback
  revisionHistory?: {
    feedback: string;
    requestedAt: Date;
    resolvedAt?: Date;
  }[];

  createdAt: Date;
  updatedAt: Date;
}

// Monthly review notes
export interface MonthlyReview {
  _id?: ObjectId;
  id: string;
  packageId: string;
  month: string;                 // "2026-10"
  whatLanded: string;            // Notes on best performers
  whatsNext: string;             // Plan for next month
  totalCarousels?: number;       // How many published this month
  topPerformer?: {
    questionId: string;
    question: string;
    reach: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Usage log for announcements
export type AnnouncementType = "new-listing" | "sold" | "open-house" | "price-change" | "other";

export interface AnnouncementUsage {
  _id?: ObjectId;
  id: string;
  packageId: string;
  listingAddress: string;        // "123 Main St, Charlottetown"
  graphicType: AnnouncementType;
  graphicUrl?: string;           // Link to exported graphic
  instagramPostId?: string;      // For linking to Post collection
  performance?: {
    impressions: number;
    reach: number;
    engagement: number;
  };
  notes?: string;
  createdAt: Date;
}

// Request types for API
export interface CreateGraphicPackageRequest {
  accountId: string;
  name: string;
  type: GraphicPackageType;
  allocation?: number;
  price?: number;
  monthlyFrequency?: number;
  monthlyRate?: number;
  startDate?: string;
}

export interface CreateQuestionRequest {
  question: string;
  category?: string;
  notes?: string;
}

export interface ScheduleCarouselRequest {
  questionId: string;
  scheduledDate: string;
  notes?: string;
  // Entropy fields
  level?: EntropyLevel;
  uncertaintyAddressed?: string;
  suggestedFormat?: string;
  isEvergreen?: boolean;
}

export interface LogAnnouncementRequest {
  listingAddress: string;
  graphicType: AnnouncementType;
  graphicUrl?: string;
  notes?: string;
}

export interface CreateReviewRequest {
  month: string;
  whatLanded: string;
  whatsNext: string;
}

// Helper to compute remaining for announcement packages
export function getRemainingAllocation(pkg: GraphicPackage): number | null {
  if (pkg.type !== "announcements" || pkg.allocation === undefined) {
    return null;
  }
  return pkg.allocation - (pkg.used || 0);
}

// Helper to check if package needs top-up
export function needsTopUp(pkg: GraphicPackage, threshold: number = 2): boolean {
  const remaining = getRemainingAllocation(pkg);
  return remaining !== null && remaining <= threshold;
}
