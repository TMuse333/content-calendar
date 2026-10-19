/**
 * Drive → DB Sync Module
 *
 * Synchronizes content from Google Drive to the content_items collection.
 * Handles:
 * - Carousels (folders with frames)
 * - Graphics (single images)
 * - Videos (single video files)
 * - Preview/final pairing
 * - Deal assignment based on folder structure
 */

import { Collection } from "mongodb";
import clientPromise from "@/lib/mongodb/clientPromise";
import { fetchDriveFolder } from "./client";

const DB_NAME = "strategy";
import {
  parseFilename,
  extractFrameOrder,
  getDriveThumbnailUrl,
  toGraphicType,
  toVideoType,
  shouldSkipFile,
  getBaseName,
} from "./parser";
import type { DriveFolder, DriveFile } from "./types";
import type {
  ContentItem,
  ContentItemType,
  CarouselFrame,
} from "@/lib/types/content-item";
import { shouldMarkAsExtra } from "@/lib/types/content-item";

const COLLECTION_NAME = "content_items";

// Folder names to skip entirely
const SKIP_FOLDERS = ["_from-greg"];

// Folder names that indicate items need dates
const NEEDS_DATE_FOLDERS = ["_undated-check"];

// Folder names for archived/completed deals
const ARCHIVE_FOLDERS = ["_archive-originals"];

// Month folder pattern
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

// Previous months (completed deal)
const PREVIOUS_MONTHS = ["2026-07", "2026-08", "2026-09"];

// Current month (active deal)
const CURRENT_MONTH = "2026-10";

interface SyncContext {
  accountId: string;
  activeDealId: string;
  completedDealId: string;
}

interface SyncResult {
  created: number;
  updated: number;
  paired: number;
  skipped: number;
  errors: string[];
  debug?: {
    rootFolder: string;
    rootSubfolders: string[];
    clientFolder: string;
    clientSubfolders: string[];
  };
}

interface ParsedItem {
  driveId: string;
  type: ContentItemType;
  subtype?: string;
  topic: string;
  date: Date | null;
  needsDate: boolean;
  isPreview: boolean;
  isExtra: boolean;
  dealId: string | null;
  thumbnailUrl: string;
  url: string;
  downloadUrl: string;
  sourceName: string;
  frames?: CarouselFrame[];
  frameCount?: number;
  driveFolderId?: string;
}

async function getCollection(): Promise<Collection<ContentItem>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<ContentItem>(COLLECTION_NAME);
}

/**
 * Parse a carousel folder into a content item
 */
function parseCarouselFolder(
  folder: DriveFolder,
  context: { dealId: string | null; needsDate: boolean }
): ParsedItem | null {
  const parsed = parseFilename(folder.folderName);

  // Skip preview folders - they'll be paired later
  if (parsed.isPreview) {
    return null;
  }

  // Get image files only, sorted by frame order
  const imageFiles = folder.files
    .filter(f => f.mimeType.startsWith("image/") && !shouldSkipFile(f.name))
    .sort((a, b) => extractFrameOrder(a.name) - extractFrameOrder(b.name));

  if (imageFiles.length === 0) {
    return null;
  }

  const frames: CarouselFrame[] = imageFiles.map((file, index) => ({
    id: file.id,
    name: file.name,
    url: file.url,
    downloadUrl: file.downloadUrl,
    thumbnailUrl: getDriveThumbnailUrl(file.id, 800),
    order: extractFrameOrder(file.name) || index + 1,
  }));

  const firstFrame = frames[0];

  return {
    driveId: folder.folderId,
    type: "carousel",
    topic: parsed.topic,
    date: parsed.date,
    needsDate: context.needsDate || parsed.dateTBD,
    isPreview: false,
    isExtra: shouldMarkAsExtra(parsed.topic),
    dealId: context.dealId,
    thumbnailUrl: firstFrame.thumbnailUrl,
    url: `https://drive.google.com/drive/folders/${folder.folderId}`,
    downloadUrl: firstFrame.downloadUrl,
    sourceName: folder.folderName,
    frames,
    frameCount: frames.length,
    driveFolderId: folder.folderId,
  };
}

/**
 * Parse a graphic file into a content item
 */
function parseGraphicFile(
  file: DriveFile,
  context: { dealId: string | null; needsDate: boolean }
): ParsedItem | null {
  if (shouldSkipFile(file.name)) {
    return null;
  }

  if (!file.mimeType.startsWith("image/")) {
    return null;
  }

  const parsed = parseFilename(file.name);

  // Skip preview files - they'll be paired later
  if (parsed.isPreview) {
    return null;
  }

  return {
    driveId: file.id,
    type: "graphic",
    subtype: toGraphicType(parsed.type),
    topic: parsed.topic,
    date: parsed.date,
    needsDate: context.needsDate || parsed.dateTBD,
    isPreview: false,
    isExtra: false,
    dealId: context.dealId,
    thumbnailUrl: getDriveThumbnailUrl(file.id, 800),
    url: file.url,
    downloadUrl: file.downloadUrl,
    sourceName: file.name,
  };
}

/**
 * Parse a video file into a content item
 */
function parseVideoFile(
  file: DriveFile,
  context: { dealId: string | null; needsDate: boolean }
): ParsedItem | null {
  if (shouldSkipFile(file.name)) {
    return null;
  }

  if (!file.mimeType.startsWith("video/")) {
    return null;
  }

  const parsed = parseFilename(file.name);

  // Skip preview/watermarked files - they'll be paired later
  if (parsed.isPreview) {
    return null;
  }

  return {
    driveId: file.id,
    type: "video",
    subtype: toVideoType(parsed.type),
    topic: parsed.topic,
    date: parsed.date,
    needsDate: context.needsDate || parsed.dateTBD,
    isPreview: false,
    isExtra: false,
    dealId: context.dealId,
    thumbnailUrl: getDriveThumbnailUrl(file.id, 800),
    url: file.url,
    downloadUrl: file.downloadUrl,
    sourceName: file.name,
  };
}

/**
 * Find preview URL for an item
 */
function findPreviewUrl(
  item: ParsedItem,
  previewsFolder: DriveFolder | null
): string | null {
  if (!previewsFolder) return null;

  const baseName = getBaseName(item.sourceName);

  // For carousels, look for a folder with -preview suffix
  if (item.type === "carousel") {
    for (const subfolder of previewsFolder.subfolders) {
      const previewBaseName = getBaseName(subfolder.folderName);
      if (previewBaseName === baseName) {
        // Return the folder URL
        return `https://drive.google.com/drive/folders/${subfolder.folderId}`;
      }
    }
  }

  // For videos, look for " - Watermarked" version
  if (item.type === "video") {
    for (const file of previewsFolder.files) {
      if (!file.mimeType.startsWith("video/")) continue;
      const previewBaseName = getBaseName(file.name);
      if (previewBaseName === baseName) {
        return file.url;
      }
    }
  }

  // For graphics, look for -preview version
  if (item.type === "graphic") {
    for (const file of previewsFolder.files) {
      if (!file.mimeType.startsWith("image/")) continue;
      const previewBaseName = getBaseName(file.name);
      if (previewBaseName === baseName) {
        return file.url;
      }
    }
  }

  return null;
}

/**
 * Recursively process a month folder (e.g., 2026-10/)
 */
function processMonthFolder(
  folder: DriveFolder,
  context: { dealId: string | null; needsDate: boolean }
): { items: ParsedItem[]; previewsFolder: DriveFolder | null } {
  const items: ParsedItem[] = [];
  let previewsFolder: DriveFolder | null = null;

  for (const subfolder of folder.subfolders) {
    const name = subfolder.folderName.toLowerCase();

    // Find previews folder for pairing later
    if (name.includes("preview") || name.includes("watermark")) {
      previewsFolder = subfolder;
      continue;
    }

    if (name === "carousels") {
      // Each subfolder is a carousel
      for (const carouselFolder of subfolder.subfolders) {
        const item = parseCarouselFolder(carouselFolder, context);
        if (item) items.push(item);
      }
    } else if (name === "graphics") {
      // Each file is a graphic
      for (const file of subfolder.files) {
        const item = parseGraphicFile(file, context);
        if (item) items.push(item);
      }
    } else if (name === "videos") {
      // Each file is a video
      for (const file of subfolder.files) {
        const item = parseVideoFile(file, context);
        if (item) items.push(item);
      }
    }
  }

  return { items, previewsFolder };
}

/**
 * Process archive folder (completed deals)
 */
function processArchiveFolder(
  folder: DriveFolder,
  context: { dealId: string | null }
): ParsedItem[] {
  const items: ParsedItem[] = [];

  // Process each pack subfolder (16-pack-august-4th, 8-pack, etc.)
  for (const packFolder of folder.subfolders) {
    // Check for month subfolders or direct content
    for (const subfolder of packFolder.subfolders) {
      const name = subfolder.folderName.toLowerCase();

      if (name === "carousels") {
        for (const carouselFolder of subfolder.subfolders) {
          const item = parseCarouselFolder(carouselFolder, {
            dealId: context.dealId,
            needsDate: false,
          });
          if (item) items.push(item);
        }
      } else if (name === "graphics") {
        for (const file of subfolder.files) {
          const item = parseGraphicFile(file, {
            dealId: context.dealId,
            needsDate: false,
          });
          if (item) items.push(item);
        }
      }
    }

    // Also check direct files in pack folder
    for (const file of packFolder.files) {
      if (file.mimeType.startsWith("image/")) {
        const item = parseGraphicFile(file, {
          dealId: context.dealId,
          needsDate: false,
        });
        if (item) items.push(item);
      }
    }
  }

  return items;
}

/**
 * Main sync function: Fetch from Drive and upsert to DB
 */
export async function syncDriveToDb(
  accountId: string,
  driveFolderId: string,
  options: {
    activeDealId: string;
    completedDealId: string;
  }
): Promise<SyncResult> {
  const result: SyncResult = {
    created: 0,
    updated: 0,
    paired: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Fetch fresh from Drive
    const driveData = await fetchDriveFolder(driveFolderId, { bustCache: true });
    const collection = await getCollection();

    // Create index on driveId for upserts
    await collection.createIndex({ driveId: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ accountId: 1 });
    await collection.createIndex({ accountId: 1, dealId: 1 });

    const allItems: ParsedItem[] = [];
    const previewsFolders: Map<string, DriveFolder> = new Map();

    // Process the Greg Caseley folder structure
    // Structure: greg-graphics / Real Estate Agent Growth Package / Greg Caseley / (content)
    // OR: greg-graphics / Greg Caseley / (content)

    // Navigate to find the content folder (the one with month folders like 2026-10)
    // Structure can be: root / package / client / content
    // Keep drilling down until we find month pattern folders or hit the bottom
    let contentFolder: DriveFolder = driveData;
    const folderPath: string[] = [driveData.folderName];

    while (contentFolder.subfolders.length > 0) {
      const hasMonthFolder = contentFolder.subfolders.some(sf => MONTH_PATTERN.test(sf.folderName));
      const hasArchiveFolder = contentFolder.subfolders.some(sf =>
        ARCHIVE_FOLDERS.some(af => sf.folderName.toLowerCase().includes(af.toLowerCase()))
      );

      // If we found content indicators, stop drilling
      if (hasMonthFolder || hasArchiveFolder) {
        break;
      }

      // Otherwise, drill into the first non-underscore subfolder
      const nextFolder = contentFolder.subfolders.find(sf => !sf.folderName.startsWith("_"));
      if (!nextFolder) {
        break;
      }

      contentFolder = nextFolder;
      folderPath.push(contentFolder.folderName);
    }

    // Add debug info to result
    result.debug = {
      rootFolder: driveData.folderName,
      rootSubfolders: driveData.subfolders.map(f => f.folderName),
      clientFolder: folderPath.join(" / "),
      clientSubfolders: contentFolder.subfolders.map(f => f.folderName),
    };

    // Process each subfolder
    for (const subfolder of contentFolder.subfolders) {
      const name = subfolder.folderName;
      const lowerName = name.toLowerCase();

      // Skip certain folders
      if (SKIP_FOLDERS.some(skip => lowerName.includes(skip.toLowerCase()))) {
        result.skipped++;
        continue;
      }

      // Needs date folder
      if (NEEDS_DATE_FOLDERS.some(nd => lowerName.includes(nd.toLowerCase()))) {
        // Process files here as needing dates
        for (const file of subfolder.files) {
          if (file.mimeType.startsWith("image/")) {
            const item = parseGraphicFile(file, {
              dealId: null,
              needsDate: true,
            });
            if (item) allItems.push(item);
          } else if (file.mimeType.startsWith("video/")) {
            const item = parseVideoFile(file, {
              dealId: null,
              needsDate: true,
            });
            if (item) allItems.push(item);
          }
        }
        continue;
      }

      // Archive folder (completed deal)
      if (ARCHIVE_FOLDERS.some(af => lowerName.includes(af.toLowerCase()))) {
        const items = processArchiveFolder(subfolder, {
          dealId: options.completedDealId,
        });
        allItems.push(...items);
        continue;
      }

      // Month folders
      if (MONTH_PATTERN.test(name)) {
        const dealId = PREVIOUS_MONTHS.includes(name)
          ? options.completedDealId
          : options.activeDealId;

        const { items, previewsFolder } = processMonthFolder(subfolder, {
          dealId,
          needsDate: false,
        });

        allItems.push(...items);

        if (previewsFolder) {
          previewsFolders.set(name, previewsFolder);
        }
        continue;
      }
    }

    // Pair previews with finals
    for (const item of allItems) {
      // Get the month from the source name or date
      let monthKey: string | null = null;

      if (item.date) {
        const month = item.date.toISOString().slice(0, 7);
        monthKey = month;
      } else {
        // Try to extract from source name
        const match = item.sourceName.match(/^(\d{4}-\d{2})/);
        if (match) {
          monthKey = match[1];
        }
      }

      if (monthKey) {
        const previewsFolder = previewsFolders.get(monthKey);
        const previewUrl = findPreviewUrl(item, previewsFolder ?? null);
        if (previewUrl) {
          item.isPreview = false; // This is the final
          result.paired++;
        }
      }
    }

    // Upsert items to database
    const now = new Date();

    for (const item of allItems) {
      try {
        const existing = await collection.findOne({ driveId: item.driveId });

        if (existing) {
          // Update - preserve status and client data
          await collection.updateOne(
            { driveId: item.driveId },
            {
              $set: {
                // Update from Drive
                topic: item.topic,
                thumbnailUrl: item.thumbnailUrl,
                finalUrl: item.url,
                downloadUrl: item.downloadUrl,
                frames: item.frames,
                frameCount: item.frameCount,
                sourceName: item.sourceName,
                // Only update these if not already set
                ...(existing.dealId === undefined && { dealId: item.dealId ?? undefined }),
                ...(existing.needsDate === undefined && { needsDate: item.needsDate }),
                ...(existing.isExtra === undefined && { isExtra: item.isExtra }),
                ...(existing.plannedDate === undefined && { plannedDate: item.date ?? undefined }),
                updatedAt: now,
              },
            }
          );
          result.updated++;
        } else {
          // Create new
          const newItem: ContentItem = {
            accountId,
            dealId: item.dealId || undefined,
            isExtra: item.isExtra,
            needsDate: item.needsDate,
            type: item.type,
            subtype: item.subtype as ContentItem["subtype"],
            topic: item.topic,
            plannedDate: item.date,
            driveId: item.driveId,
            driveFolderId: item.driveFolderId,
            finalUrl: item.url,
            downloadUrl: item.downloadUrl,
            thumbnailUrl: item.thumbnailUrl,
            frames: item.frames,
            frameCount: item.frameCount,
            status: "draft",
            sourceName: item.sourceName,
            createdAt: now,
            updatedAt: now,
          };

          await collection.insertOne(newItem);
          result.created++;
        }
      } catch (error) {
        result.errors.push(
          `Error processing ${item.sourceName}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return result;
  } catch (error) {
    result.errors.push(
      `Sync failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return result;
  }
}

/**
 * Get all content items for an account
 */
export async function getContentItems(
  accountId: string,
  options?: {
    dealId?: string;
    type?: ContentItemType;
    status?: ContentItem["status"];
    includeExtras?: boolean;
  }
): Promise<ContentItem[]> {
  const collection = await getCollection();

  const query: Record<string, unknown> = { accountId };

  if (options?.dealId) {
    query.dealId = options.dealId;
  }
  if (options?.type) {
    query.type = options.type;
  }
  if (options?.status) {
    query.status = options.status;
  }
  if (options?.includeExtras === false) {
    query.isExtra = { $ne: true };
  }

  return collection.find(query).sort({ plannedDate: 1, createdAt: -1 }).toArray();
}

/**
 * Update a content item
 */
export async function updateContentItem(
  driveId: string,
  updates: Partial<Pick<ContentItem, "status" | "dealId" | "isExtra" | "needsDate" | "plannedDate" | "notes" | "clientComment">>
): Promise<ContentItem | null> {
  const collection = await getCollection();

  const result = await collection.findOneAndUpdate(
    { driveId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}
