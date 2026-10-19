/**
 * Filename Parser
 *
 * Parses filenames following the YYYY-MM-DD-topic-type convention.
 * Examples:
 *   - 2026-10-20-closing-costs-carousel
 *   - 2026-10-14-lot-2-beairsto-lane-just-listed.png
 *   - 2026-10-15-moving-from-ontario-video-preview.mp4
 *   - 2026-10-XX-cottage-roi-carousel (XX = date TBD)
 *   - Moving From Ontario - Watermarked.mp4
 */

import type { ParsedFilename, GraphicType, VideoType } from "./types";

// Known type suffixes
const GRAPHIC_TYPES: GraphicType[] = ["just-listed", "open-house", "price-change", "sold", "coming-soon"];
const VIDEO_TYPES: VideoType[] = ["listing-video", "reel", "video"];
const ALL_TYPES = [...GRAPHIC_TYPES, ...VIDEO_TYPES, "carousel"];

// Files to skip during parsing
const SKIP_FILES = ["readme.txt", "readme.md", ".ds_store"];

/**
 * Check if a file should be skipped
 */
export function shouldSkipFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SKIP_FILES.includes(lower);
}

/**
 * Parse a filename or folder name into structured data
 */
export function parseFilename(name: string): ParsedFilename {
  // Remove file extension
  const withoutExt = name.replace(/\.(png|jpg|jpeg|mp4|mov|webm|json|txt|md)$/i, "");

  // Check for watermarked video pattern (e.g., "Moving From Ontario - Watermarked")
  const isWatermarked = withoutExt.toLowerCase().includes(" - watermarked") ||
                        withoutExt.toLowerCase().endsWith("-watermarked");

  // Check for preview suffix (folder or file)
  const isPreview = isWatermarked ||
                    withoutExt.endsWith("-preview") ||
                    name.toLowerCase().includes("preview");

  // Clean the name for parsing
  let cleanName = withoutExt
    .replace(/ - Watermarked$/i, "")
    .replace(/-watermarked$/i, "")
    .replace(/-preview$/i, "");

  // Try to extract date (YYYY-MM-DD or YYYY-MM-XX for TBD dates)
  const dateMatch = cleanName.match(/^(\d{4}-\d{2}-(?:\d{2}|XX))-(.+)$/i);

  let date: Date | null = null;
  let dateTBD = false;
  let remainder = cleanName;

  if (dateMatch) {
    const [, dateStr, rest] = dateMatch;

    // Check if date has XX (placeholder)
    if (dateStr.toUpperCase().includes("XX")) {
      dateTBD = true;
      date = null;
    } else {
      date = new Date(dateStr);
      // Validate date
      if (isNaN(date.getTime())) {
        date = null;
      }
    }
    remainder = rest;
  }

  // Try to extract type from the end
  let type = "other";
  let topic = remainder;

  for (const knownType of ALL_TYPES) {
    if (remainder.toLowerCase().endsWith(`-${knownType}`)) {
      type = knownType;
      topic = remainder.slice(0, -(knownType.length + 1)); // Remove -type
      break;
    }
  }

  return {
    date,
    dateTBD,
    topic: formatTopic(topic),
    type,
    isPreview,
    raw: name,
  };
}

/**
 * Format a topic slug into a readable title
 * e.g., "closing-costs" -> "Closing Costs"
 */
export function formatTopic(slug: string): string {
  return slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Determine if a file is in a preview folder
 */
export function isInPreviewFolder(folderPath: string[]): boolean {
  return folderPath.some(folder =>
    folder.toLowerCase().includes("preview") ||
    folder.toLowerCase().includes("watermark")
  );
}

/**
 * Extract order number from frame filename (e.g., "01.png" -> 1)
 */
export function extractFrameOrder(filename: string): number {
  const match = filename.match(/^(\d+)\./);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 999; // Put unnumbered files at the end
}

/**
 * Generate thumbnail URL from Drive file ID
 */
export function getDriveThumbnailUrl(fileId: string, width: number = 800): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}

/**
 * Generate thumbnail URL from Drive URL
 */
export function getThumbnailFromUrl(driveUrl: string, width: number = 800): string | null {
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return getDriveThumbnailUrl(match[1], width);
}

/**
 * Map type string to GraphicType
 */
export function toGraphicType(type: string): GraphicType {
  if (GRAPHIC_TYPES.includes(type as GraphicType)) {
    return type as GraphicType;
  }
  return "other";
}

/**
 * Map type string to VideoType
 */
export function toVideoType(type: string): VideoType {
  if (VIDEO_TYPES.includes(type as VideoType)) {
    return type as VideoType;
  }
  return "video";
}

/**
 * Extract the base name for pairing previews with finals
 * Removes -preview suffix and " - Watermarked" from names
 */
export function getBaseName(name: string): string {
  return name
    .replace(/\.(png|jpg|jpeg|mp4|mov|webm)$/i, "")
    .replace(/ - Watermarked$/i, "")
    .replace(/-watermarked$/i, "")
    .replace(/-preview$/i, "")
    .toLowerCase()
    .trim();
}

/**
 * Check if two items are a preview/final pair
 */
export function isPair(previewName: string, finalName: string): boolean {
  return getBaseName(previewName) === getBaseName(finalName);
}
