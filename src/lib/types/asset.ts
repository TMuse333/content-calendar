/**
 * Asset Types
 *
 * Assets are media files (images) owned by an account.
 * Used in carousel generation - headshots, logos, property photos, etc.
 *
 * Asset types align with Graphics App's mediaRequired definitions.
 */

import { ObjectId } from "mongodb";

// Asset types that Graphics App expects
export type AssetType =
  | "headshot"    // Agent professional photo
  | "logo"        // Brokerage/personal logo
  | "property"    // Property/listing photo
  | "landscape"   // Scenic/wide shots
  | "community"   // Neighbourhood/lifestyle
  | "regional"    // Local/regional imagery (PEI landmarks, etc.)
  | "testimonial" // Client photos
  | "icon"        // Custom icons
  | "other";

export type AssetStatus = "active" | "archived";

export interface Asset {
  _id?: ObjectId;
  id: string;
  accountId: string;

  // File info
  name: string;              // Display name
  filename: string;          // Original filename
  url: string;               // Storage URL (Vercel Blob, Cloudinary, etc.)
  thumbnailUrl?: string;     // Smaller preview URL

  // Classification
  type: AssetType;
  tags?: string[];           // e.g., ["stratford", "waterfront", "summer"]

  // Metadata
  width?: number;
  height?: number;
  size?: number;             // File size in bytes
  mimeType?: string;

  // Usage tracking
  usageCount?: number;       // How many times used in carousels
  lastUsedAt?: Date;

  // Status
  status: AssetStatus;
  isPrimary?: boolean;       // Primary headshot/logo for the account

  createdAt: Date;
  updatedAt: Date;
}

// For API requests
export interface CreateAssetRequest {
  name: string;
  type: AssetType;
  tags?: string[];
  isPrimary?: boolean;
}

export interface UpdateAssetRequest {
  name?: string;
  type?: AssetType;
  tags?: string[];
  status?: AssetStatus;
  isPrimary?: boolean;
}

// Upload response from storage
export interface UploadResult {
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
  width?: number;
  height?: number;
  mimeType: string;
}

// Asset library summary for quick access
export interface AssetLibrarySummary {
  headshots: Asset[];
  logos: Asset[];
  properties: Asset[];
  landscapes: Asset[];
  community: Asset[];
  regional: Asset[];
  other: Asset[];
  total: number;
}

// Helper to get primary asset of a type
export function getPrimaryAsset(assets: Asset[], type: AssetType): Asset | undefined {
  return assets.find(a => a.type === type && a.isPrimary && a.status === "active")
    || assets.find(a => a.type === type && a.status === "active");
}

// Helper to group assets by type
export function groupAssetsByType(assets: Asset[]): AssetLibrarySummary {
  const active = assets.filter(a => a.status === "active");
  return {
    headshots: active.filter(a => a.type === "headshot"),
    logos: active.filter(a => a.type === "logo"),
    properties: active.filter(a => a.type === "property"),
    landscapes: active.filter(a => a.type === "landscape"),
    community: active.filter(a => a.type === "community"),
    regional: active.filter(a => a.type === "regional"),
    other: active.filter(a => !["headshot", "logo", "property", "landscape", "community", "regional"].includes(a.type)),
    total: active.length,
  };
}
