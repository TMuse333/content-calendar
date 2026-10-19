/**
 * Google Drive API Types
 *
 * Types for the Apps Script API response and parsed content items.
 */

// =============================================================================
// RAW API RESPONSE TYPES
// =============================================================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  downloadUrl: string;
  dateCreated: string;
  size: number;
}

export interface DriveFolder {
  folderName: string;
  folderId: string;
  files: DriveFile[];
  subfolders: DriveFolder[];
}

// =============================================================================
// PARSED CONTENT TYPES
// =============================================================================

export type GraphicType = "just-listed" | "open-house" | "price-change" | "sold" | "coming-soon" | "other";
export type VideoType = "listing-video" | "reel" | "video";
export type ContentType = "carousel" | "graphic" | "video";

export interface CarouselFrame {
  id: string;
  name: string;
  url: string;
  downloadUrl: string;
  thumbnailUrl: string;
  order: number;
}

export interface CarouselItem {
  id: string;
  type: "carousel";
  topic: string;
  date: Date | null;
  frames: CarouselFrame[];
  frameCount: number;
  isPreview: boolean;
  folderName: string;
  folderId: string;
}

export interface GraphicItem {
  id: string;
  type: "graphic";
  subtype: GraphicType;
  topic: string;
  date: Date | null;
  url: string;
  downloadUrl: string;
  thumbnailUrl: string;
  isPreview: boolean;
  fileName: string;
}

export interface VideoItem {
  id: string;
  type: "video";
  subtype: VideoType;
  topic: string;
  date: Date | null;
  url: string;
  downloadUrl: string;
  thumbnailUrl: string | null;
  isPreview: boolean;
  fileName: string;
}

export type ContentItem = CarouselItem | GraphicItem | VideoItem;

export interface ParsedContent {
  carousels: CarouselItem[];
  graphics: GraphicItem[];
  videos: VideoItem[];
  all: ContentItem[];
  metadata: {
    totalItems: number;
    previewCount: number;
    finalCount: number;
    lastFetched: Date;
    rootFolderId: string;
    rootFolderName: string;
  };
}

// =============================================================================
// FILENAME PARSING TYPES
// =============================================================================

export interface ParsedFilename {
  date: Date | null;
  dateTBD: boolean;      // True if date was "XX" placeholder
  topic: string;
  type: string;
  isPreview: boolean;
  raw: string;
}
