/**
 * Google Drive Content Service
 *
 * Main export for fetching and parsing Greg Caseley's content from Drive.
 *
 * Usage:
 *   const content = await getGregCaseleyContent();
 *   content.carousels.map(c => console.log(c.topic, c.frameCount));
 */

import { fetchGregCaseleyDrive, fetchDriveFolder, clearDriveCache } from "./client";
import {
  parseFilename,
  extractFrameOrder,
  getDriveThumbnailUrl,
  toGraphicType,
  toVideoType,
  isInPreviewFolder,
} from "./parser";
import type {
  DriveFolder,
  DriveFile,
  CarouselItem,
  CarouselFrame,
  GraphicItem,
  VideoItem,
  ParsedContent,
  ContentItem,
} from "./types";

// Re-export types
export * from "./types";
export { clearDriveCache } from "./client";

/**
 * Context for tracking folder path during recursive parsing
 */
interface ParseContext {
  folderPath: string[];
  isPreviewBranch: boolean;
  monthFolder?: string;
  contentType?: "carousels" | "graphics" | "videos" | "previews";
}

/**
 * Recursively find all month folders (YYYY-MM format)
 */
function findMonthFolders(folder: DriveFolder): DriveFolder[] {
  const monthFolders: DriveFolder[] = [];

  for (const subfolder of folder.subfolders) {
    // Match YYYY-MM pattern
    if (/^\d{4}-\d{2}$/.test(subfolder.folderName)) {
      monthFolders.push(subfolder);
    }
    // Recursively check nested folders
    monthFolders.push(...findMonthFolders(subfolder));
  }

  return monthFolders;
}

/**
 * Parse a carousel folder into a CarouselItem
 */
function parseCarouselFolder(
  folder: DriveFolder,
  context: ParseContext
): CarouselItem {
  const parsed = parseFilename(folder.folderName);

  // Sort frames by number
  const sortedFiles = [...folder.files].sort(
    (a, b) => extractFrameOrder(a.name) - extractFrameOrder(b.name)
  );

  const frames: CarouselFrame[] = sortedFiles
    .filter(f => f.mimeType.startsWith("image/"))
    .map((file, index) => ({
      id: file.id,
      name: file.name,
      url: file.url,
      downloadUrl: file.downloadUrl,
      thumbnailUrl: getDriveThumbnailUrl(file.id, 800),
      order: extractFrameOrder(file.name) || index + 1,
    }));

  return {
    id: folder.folderId,
    type: "carousel",
    topic: parsed.topic,
    date: parsed.date,
    frames,
    frameCount: frames.length,
    isPreview: context.isPreviewBranch || parsed.isPreview,
    folderName: folder.folderName,
    folderId: folder.folderId,
  };
}

/**
 * Parse a graphic file into a GraphicItem
 */
function parseGraphicFile(file: DriveFile, context: ParseContext): GraphicItem {
  const parsed = parseFilename(file.name);

  return {
    id: file.id,
    type: "graphic",
    subtype: toGraphicType(parsed.type),
    topic: parsed.topic,
    date: parsed.date,
    url: file.url,
    downloadUrl: file.downloadUrl,
    thumbnailUrl: getDriveThumbnailUrl(file.id, 800),
    isPreview: context.isPreviewBranch || parsed.isPreview,
    fileName: file.name,
  };
}

/**
 * Parse a video file into a VideoItem
 */
function parseVideoFile(file: DriveFile, context: ParseContext): VideoItem {
  const parsed = parseFilename(file.name);

  return {
    id: file.id,
    type: "video",
    subtype: toVideoType(parsed.type),
    topic: parsed.topic,
    date: parsed.date,
    url: file.url,
    downloadUrl: file.downloadUrl,
    thumbnailUrl: getDriveThumbnailUrl(file.id, 800), // May not work for videos
    isPreview: context.isPreviewBranch || parsed.isPreview,
    fileName: file.name,
  };
}

/**
 * Parse a month folder's contents
 */
function parseMonthFolder(monthFolder: DriveFolder): {
  carousels: CarouselItem[];
  graphics: GraphicItem[];
  videos: VideoItem[];
} {
  const carousels: CarouselItem[] = [];
  const graphics: GraphicItem[] = [];
  const videos: VideoItem[] = [];

  for (const subfolder of monthFolder.subfolders) {
    const folderName = subfolder.folderName.toLowerCase();
    const isPreviewBranch = folderName.includes("preview") || folderName.includes("watermark");

    const context: ParseContext = {
      folderPath: [monthFolder.folderName, subfolder.folderName],
      isPreviewBranch,
      monthFolder: monthFolder.folderName,
    };

    if (folderName === "carousels") {
      // Each subfolder in carousels/ is a carousel
      for (const carouselFolder of subfolder.subfolders) {
        const carousel = parseCarouselFolder(carouselFolder, {
          ...context,
          folderPath: [...context.folderPath, carouselFolder.folderName],
        });
        carousels.push(carousel);
      }
    } else if (folderName === "graphics") {
      // Each file in graphics/ is a graphic
      for (const file of subfolder.files) {
        if (file.mimeType.startsWith("image/")) {
          graphics.push(parseGraphicFile(file, context));
        }
      }
    } else if (folderName === "videos") {
      // Each file in videos/ is a video
      for (const file of subfolder.files) {
        if (file.mimeType.startsWith("video/")) {
          videos.push(parseVideoFile(file, context));
        }
      }
    } else if (isPreviewBranch) {
      // Preview folder - parse contents and mark as preview
      const previewContext: ParseContext = { ...context, isPreviewBranch: true };

      // Check for nested structure (carousels, graphics, videos subfolders)
      for (const nestedFolder of subfolder.subfolders) {
        const nestedName = nestedFolder.folderName.toLowerCase();

        if (nestedName === "carousels") {
          for (const carouselFolder of nestedFolder.subfolders) {
            carousels.push(parseCarouselFolder(carouselFolder, previewContext));
          }
        } else if (nestedName === "graphics") {
          for (const file of nestedFolder.files) {
            if (file.mimeType.startsWith("image/")) {
              graphics.push(parseGraphicFile(file, previewContext));
            }
          }
        } else if (nestedName === "videos") {
          for (const file of nestedFolder.files) {
            if (file.mimeType.startsWith("video/")) {
              videos.push(parseVideoFile(file, previewContext));
            }
          }
        }
      }

      // Also check for flat files in preview folder
      for (const file of subfolder.files) {
        if (file.mimeType.startsWith("image/")) {
          graphics.push(parseGraphicFile(file, previewContext));
        } else if (file.mimeType.startsWith("video/")) {
          videos.push(parseVideoFile(file, previewContext));
        }
      }
    }
  }

  return { carousels, graphics, videos };
}

/**
 * Parse raw Drive data into structured content
 */
function parseDriveData(driveData: DriveFolder): ParsedContent {
  const carousels: CarouselItem[] = [];
  const graphics: GraphicItem[] = [];
  const videos: VideoItem[] = [];

  // Find all month folders
  const monthFolders = findMonthFolders(driveData);

  // Parse each month folder
  for (const monthFolder of monthFolders) {
    const parsed = parseMonthFolder(monthFolder);
    carousels.push(...parsed.carousels);
    graphics.push(...parsed.graphics);
    videos.push(...parsed.videos);
  }

  // Sort by date (newest first)
  const sortByDate = (a: ContentItem, b: ContentItem) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.getTime() - a.date.getTime();
  };

  carousels.sort(sortByDate);
  graphics.sort(sortByDate);
  videos.sort(sortByDate);

  const all: ContentItem[] = [...carousels, ...graphics, ...videos].sort(sortByDate);

  const previewCount = all.filter(item => item.isPreview).length;
  const finalCount = all.filter(item => !item.isPreview).length;

  return {
    carousels,
    graphics,
    videos,
    all,
    metadata: {
      totalItems: all.length,
      previewCount,
      finalCount,
      lastFetched: new Date(),
      rootFolderId: driveData.folderId,
      rootFolderName: driveData.folderName,
    },
  };
}

/**
 * Generic function: Fetch and parse Drive content by folder ID
 */
export async function getDriveContent(
  folderId: string,
  options?: { bustCache?: boolean }
): Promise<ParsedContent> {
  const driveData = await fetchDriveFolder(folderId, options);
  return parseDriveData(driveData);
}

/**
 * Legacy function: Fetch and parse Greg Caseley's content
 */
export async function getGregCaseleyContent(options?: {
  bustCache?: boolean;
}): Promise<ParsedContent> {
  const driveData = await fetchGregCaseleyDrive(options);
  return parseDriveData(driveData);
}

/**
 * Get content items matching a topic (for pairing previews with finals)
 */
export function findMatchingContent(
  content: ParsedContent,
  topic: string
): { preview?: ContentItem; final?: ContentItem } {
  const normalizedTopic = topic.toLowerCase();

  const matching = content.all.filter(
    item => item.topic.toLowerCase() === normalizedTopic
  );

  return {
    preview: matching.find(item => item.isPreview),
    final: matching.find(item => !item.isPreview),
  };
}

/**
 * Get content items by type
 */
export function getContentByType(
  content: ParsedContent,
  type: "carousel" | "graphic" | "video"
): ContentItem[] {
  switch (type) {
    case "carousel":
      return content.carousels;
    case "graphic":
      return content.graphics;
    case "video":
      return content.videos;
  }
}

/**
 * Get preview/final pairs for all content
 */
export function getContentPairs(content: ParsedContent): {
  topic: string;
  type: ContentItem["type"];
  preview?: ContentItem;
  final?: ContentItem;
}[] {
  const topicMap = new Map<string, { preview?: ContentItem; final?: ContentItem; type: ContentItem["type"] }>();

  for (const item of content.all) {
    const key = `${item.type}:${item.topic.toLowerCase()}`;
    const existing = topicMap.get(key) || { type: item.type };

    if (item.isPreview) {
      existing.preview = item;
    } else {
      existing.final = item;
    }

    topicMap.set(key, existing);
  }

  return Array.from(topicMap.entries()).map(([key, value]) => ({
    topic: key.split(":")[1],
    ...value,
  }));
}
