/**
 * Content Item Types
 *
 * For tracking deliverables (carousels, listing graphics, videos)
 * across the client delivery pipeline.
 */

import { ObjectId } from "mongodb";

export type ContentItemType = "carousel" | "graphic" | "video";

export type ContentItemSubtype =
  | "just-listed"
  | "open-house"
  | "price-change"
  | "sold"
  | "coming-soon"
  | "market-pulse"
  | "neighbourhood-guide"
  | "process-timeline"
  | "myth-vs-fact"
  | "client-questions"
  | "this-or-that"
  | "buyer-objections"
  | "education"
  | "testimonial"
  | "reel"
  | "listing-video"
  | "other";

export type ContentItemStatus =
  | "draft"              // Idea exists, no deliverable yet
  | "preview-sent"       // Watermarked preview shared with client
  | "approved"           // Client approved
  | "changes-requested"  // Client wants changes
  | "paid"               // Client has paid, clean files available
  | "scheduled"          // Scheduled to post
  | "posted"             // Live on Instagram
  | "results";           // Results recorded

export interface ContentItemResults {
  reach?: number;
  saves?: number;
  comments?: number;
  shares?: number;
  dms?: number;
}

export interface CarouselFrame {
  id: string;           // Drive file ID
  name: string;         // Filename (01.png, 02.png, etc.)
  url: string;          // Drive view URL
  downloadUrl: string;  // Direct download URL
  thumbnailUrl: string; // Thumbnail URL
  order: number;        // Frame order (1, 2, 3...)
}

export interface ContentItem {
  _id?: ObjectId;
  accountId: string;

  // Deal tracking
  dealId?: string;       // Which deal this belongs to (null = unassigned)
  isExtra?: boolean;     // If true, doesn't count toward deal limits
  needsDate?: boolean;   // If true, needs a date assigned

  // What
  type: ContentItemType;
  subtype?: ContentItemSubtype;
  topic: string;

  // When
  plannedDate?: Date | null;  // null = date TBD (XX in filename)
  postedDate?: Date;

  // Drive references
  driveId?: string;           // Drive file/folder ID (primary key for sync, optional for manual items)
  driveFolderId?: string;     // Parent folder ID

  // Files
  previewUrl?: string;        // Watermarked version (Drive URL)
  finalUrl?: string;          // Clean version (Drive URL)
  thumbnailUrl?: string;      // First frame or graphic thumbnail
  downloadUrl?: string;       // Direct download URL

  // Carousel-specific
  frames?: CarouselFrame[];   // Individual slides
  frameCount?: number;        // Number of frames

  // Status
  status: ContentItemStatus;

  // Client feedback
  clientComment?: string;
  clientApprovedAt?: Date;

  // Results (manual entry)
  results?: ContentItemResults;

  // Notes
  notes?: string;

  // Original filename/foldername from Drive
  sourceName?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Extra carousel names that should be marked as extras automatically
export const EXTRA_CAROUSEL_NAMES = [
  "buy now or wait",
  "offer accepted",
  "neighbourhood guide",
];

/**
 * Check if a topic should be marked as an extra (not counted toward limits)
 */
export function shouldMarkAsExtra(topic: string): boolean {
  const normalized = topic.toLowerCase();
  return EXTRA_CAROUSEL_NAMES.some(name => normalized.includes(name));
}

// Helper to extract Google Drive file ID from shareable link
export function extractDriveFileId(driveUrl: string): string | null {
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] || null;
}

// Helper to get embeddable thumbnail URL from Drive link
export function getDriveThumbnailUrl(driveUrl: string, width: number = 800): string | null {
  const fileId = extractDriveFileId(driveUrl);
  if (!fileId) return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}
