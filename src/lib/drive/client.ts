/**
 * Google Drive Apps Script Client
 *
 * Fetches folder contents from the Apps Script API.
 */

import type { DriveFolder } from "./types";

// Cache for API responses (in-memory, server-side) - keyed by folderId
const cacheMap = new Map<
  string,
  {
    data: DriveFolder;
    fetchedAt: Date;
  }
>();

let cacheTtlMs = 5 * 60 * 1000; // 5 minutes default

/**
 * Get the Drive API URL from environment
 */
function getDriveApiUrl(): string {
  const apiUrl = process.env.GREG_CASELEY_DRIVE_API_URL;
  if (!apiUrl) {
    throw new Error("Missing GREG_CASELEY_DRIVE_API_URL environment variable");
  }
  return apiUrl;
}

/**
 * Fetch Drive folder contents by folder ID
 */
export async function fetchDriveFolder(
  folderId: string,
  options?: { bustCache?: boolean }
): Promise<DriveFolder> {
  if (!folderId) {
    throw new Error("folderId is required");
  }

  // Check cache
  const cached = cacheMap.get(folderId);
  if (
    !options?.bustCache &&
    cached &&
    Date.now() - cached.fetchedAt.getTime() < cacheTtlMs
  ) {
    return cached.data;
  }

  // Fetch from API
  const apiUrl = getDriveApiUrl();
  const url = `${apiUrl}?folderId=${folderId}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Drive API error: ${response.status} ${response.statusText}`);
    }

    const data: DriveFolder = await response.json();

    // Update cache
    cacheMap.set(folderId, {
      data,
      fetchedAt: new Date(),
    });

    return data;
  } catch (error) {
    // If we have stale cached data, return it as fallback
    if (cached) {
      console.warn("[drive:client] API fetch failed, returning stale cache:", error);
      return cached.data;
    }
    throw error;
  }
}

/**
 * Legacy function for Greg Caseley - uses env var for folder ID
 */
export async function fetchGregCaseleyDrive(options?: {
  bustCache?: boolean;
}): Promise<DriveFolder> {
  const folderId = process.env.GREG_CASELEY_FOLDER_ID;
  if (!folderId) {
    throw new Error("Missing GREG_CASELEY_FOLDER_ID environment variable");
  }
  return fetchDriveFolder(folderId, options);
}

/**
 * Clear cache for a specific folder or all folders
 */
export function clearDriveCache(folderId?: string): void {
  if (folderId) {
    cacheMap.delete(folderId);
  } else {
    cacheMap.clear();
  }
}

/**
 * Set cache TTL (in milliseconds)
 */
export function setDriveCacheTTL(ttlMs: number): void {
  cacheTtlMs = ttlMs;
}

/**
 * Get cache status for a folder
 */
export function getDriveCacheStatus(folderId: string): {
  isCached: boolean;
  fetchedAt: Date | null;
  ageMs: number | null;
  ttlMs: number;
} {
  const cached = cacheMap.get(folderId);
  return {
    isCached: !!cached,
    fetchedAt: cached?.fetchedAt || null,
    ageMs: cached ? Date.now() - cached.fetchedAt.getTime() : null,
    ttlMs: cacheTtlMs,
  };
}
