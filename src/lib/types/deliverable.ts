/**
 * Deliverable Types
 *
 * Deliverables are finished outputs - rendered carousels, graphics, etc.
 * This tracks everything produced for an account with full history.
 */

import { ObjectId } from "mongodb";

// Types of deliverables we produce
export type DeliveryType =
  | "carousel"    // Multi-slide Instagram/LinkedIn carousel
  | "single"      // Single image graphic
  | "story"       // Vertical 9:16 for IG/FB stories
  | "reel-cover"  // Reel thumbnail
  | "flyer"       // Print-ready PDF/image
  | "banner";     // Profile/cover banners

// Status workflow
export type DeliveryStatus = "draft" | "approved" | "published" | "archived";

// Where it was published
export type PublishPlatform = "instagram" | "facebook" | "linkedin" | "twitter" | "email" | "print";

export interface Deliverable {
  _id?: ObjectId;
  id: string;
  accountId: string;

  // What was made
  deliveryType: DeliveryType;
  title: string;                    // "Closing Costs in PEI"
  description?: string;             // Optional notes
  slides: string[];                 // URLs to rendered images
  thumbnail?: string;               // First slide or generated thumbnail

  // Links back to strategy
  questionId?: string;              // Which question this answers
  briefId?: string;                 // Which brief was used
  formatId?: string;                // Which template format
  formatName?: string;              // Human-readable format name

  // Entropy tracking
  entropyLevel?: string;            // L1-L7

  // Status tracking
  status: DeliveryStatus;
  approvedAt?: Date;
  approvedBy?: string;              // Who approved it
  publishedAt?: Date;
  publishedTo?: PublishPlatform[];  // Where it was posted

  // Organization
  tags?: string[];                  // ["pei", "buyer-education", "fall-2024"]
  campaign?: string;                // Optional campaign grouping

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// For creating new deliverables
export interface CreateDeliverableRequest {
  deliveryType: DeliveryType;
  title: string;
  description?: string;
  slides: string[];
  questionId?: string;
  briefId?: string;
  formatId?: string;
  formatName?: string;
  entropyLevel?: string;
  tags?: string[];
  campaign?: string;
}

// For updating deliverables
export interface UpdateDeliverableRequest {
  title?: string;
  description?: string;
  slides?: string[];
  status?: DeliveryStatus;
  approvedBy?: string;
  publishedTo?: PublishPlatform[];
  tags?: string[];
  campaign?: string;
}

// Filter options for querying
export interface DeliverableFilters {
  deliveryType?: DeliveryType;
  status?: DeliveryStatus;
  entropyLevel?: string;
  campaign?: string;
  tag?: string;
  publishedTo?: PublishPlatform;
  fromDate?: Date;
  toDate?: Date;
}

// Summary stats for dashboard
export interface DeliverableSummary {
  total: number;
  byType: Record<DeliveryType, number>;
  byStatus: Record<DeliveryStatus, number>;
  byMonth: { month: string; count: number }[];
  recentlyPublished: Deliverable[];
}

// Display config for UI
export const DELIVERY_TYPE_CONFIG: Record<
  DeliveryType,
  { label: string; plural: string; color: string; bgColor: string }
> = {
  carousel: {
    label: "Carousel",
    plural: "Carousels",
    color: "text-violet-400",
    bgColor: "bg-violet-500/20",
  },
  single: {
    label: "Single",
    plural: "Singles",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  story: {
    label: "Story",
    plural: "Stories",
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
  },
  "reel-cover": {
    label: "Reel Cover",
    plural: "Reel Covers",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
  flyer: {
    label: "Flyer",
    plural: "Flyers",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  banner: {
    label: "Banner",
    plural: "Banners",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
};

export const DELIVERY_STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: {
    label: "Draft",
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
  },
  approved: {
    label: "Approved",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
  },
  published: {
    label: "Published",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  archived: {
    label: "Archived",
    color: "text-slate-500",
    bgColor: "bg-slate-600/20",
  },
};
