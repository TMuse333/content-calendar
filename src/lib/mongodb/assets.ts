/**
 * Asset MongoDB Operations
 *
 * CRUD operations for account assets.
 */

import clientPromise from "./clientPromise";
import type { Asset, AssetType, AssetStatus, AssetLibrarySummary } from "@/lib/types/asset";
import { v4 as uuid } from "uuid";

const DB_NAME = process.env.MONGODB_DB || "strategy";

async function getDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

const COLLECTION = "assets";

// Ensure indexes
let indexesCreated = false;
async function ensureIndexes() {
  if (indexesCreated) return;
  const db = await getDb();
  const collection = db.collection(COLLECTION);
  await collection.createIndex({ accountId: 1, type: 1 });
  await collection.createIndex({ accountId: 1, status: 1 });
  await collection.createIndex({ accountId: 1, isPrimary: 1, type: 1 });
  indexesCreated = true;
}

/**
 * Get all assets for an account
 */
export async function getAssets(
  accountId: string,
  options?: {
    type?: AssetType;
    status?: AssetStatus;
    limit?: number;
  }
): Promise<Asset[]> {
  await ensureIndexes();
  const db = await getDb();

  const filter: Record<string, unknown> = { accountId };
  if (options?.type) filter.type = options.type;
  if (options?.status) filter.status = options.status;

  const cursor = db
    .collection<Asset>(COLLECTION)
    .find(filter)
    .sort({ isPrimary: -1, createdAt: -1 });

  if (options?.limit) {
    cursor.limit(options.limit);
  }

  return cursor.toArray();
}

/**
 * Get asset by ID
 */
export async function getAssetById(id: string): Promise<Asset | null> {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<Asset>(COLLECTION).findOne({ id });
}

/**
 * Get primary asset of a type for an account
 */
export async function getPrimaryAsset(
  accountId: string,
  type: AssetType
): Promise<Asset | null> {
  await ensureIndexes();
  const db = await getDb();

  // First try to find one marked as primary
  const primary = await db.collection<Asset>(COLLECTION).findOne({
    accountId,
    type,
    isPrimary: true,
    status: "active",
  });

  if (primary) return primary;

  // Fallback to most recent active asset of this type
  return db.collection<Asset>(COLLECTION).findOne(
    { accountId, type, status: "active" },
    { sort: { createdAt: -1 } }
  );
}

/**
 * Get asset library summary (grouped by type)
 */
export async function getAssetLibrary(accountId: string): Promise<AssetLibrarySummary> {
  const assets = await getAssets(accountId, { status: "active" });

  return {
    headshots: assets.filter(a => a.type === "headshot"),
    logos: assets.filter(a => a.type === "logo"),
    properties: assets.filter(a => a.type === "property"),
    landscapes: assets.filter(a => a.type === "landscape"),
    community: assets.filter(a => a.type === "community"),
    other: assets.filter(a => !["headshot", "logo", "property", "landscape", "community"].includes(a.type)),
    total: assets.length,
  };
}

/**
 * Create a new asset
 */
export async function createAsset(
  accountId: string,
  data: {
    name: string;
    filename: string;
    url: string;
    thumbnailUrl?: string;
    type: AssetType;
    tags?: string[];
    width?: number;
    height?: number;
    size?: number;
    mimeType?: string;
    isPrimary?: boolean;
  }
): Promise<Asset> {
  await ensureIndexes();
  const db = await getDb();

  // If this is being set as primary, unset other primaries of same type
  if (data.isPrimary) {
    await db.collection<Asset>(COLLECTION).updateMany(
      { accountId, type: data.type, isPrimary: true },
      { $set: { isPrimary: false, updatedAt: new Date() } }
    );
  }

  const asset: Asset = {
    id: uuid(),
    accountId,
    name: data.name,
    filename: data.filename,
    url: data.url,
    thumbnailUrl: data.thumbnailUrl,
    type: data.type,
    tags: data.tags || [],
    width: data.width,
    height: data.height,
    size: data.size,
    mimeType: data.mimeType,
    usageCount: 0,
    status: "active",
    isPrimary: data.isPrimary || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection<Asset>(COLLECTION).insertOne(asset);
  return asset;
}

/**
 * Update an asset
 */
export async function updateAsset(
  id: string,
  updates: {
    name?: string;
    type?: AssetType;
    tags?: string[];
    status?: AssetStatus;
    isPrimary?: boolean;
  }
): Promise<Asset | null> {
  await ensureIndexes();
  const db = await getDb();

  // Get current asset to check accountId
  const current = await getAssetById(id);
  if (!current) return null;

  // If setting as primary, unset other primaries of same type
  if (updates.isPrimary && updates.type) {
    await db.collection<Asset>(COLLECTION).updateMany(
      { accountId: current.accountId, type: updates.type, isPrimary: true, id: { $ne: id } },
      { $set: { isPrimary: false, updatedAt: new Date() } }
    );
  } else if (updates.isPrimary) {
    await db.collection<Asset>(COLLECTION).updateMany(
      { accountId: current.accountId, type: current.type, isPrimary: true, id: { $ne: id } },
      { $set: { isPrimary: false, updatedAt: new Date() } }
    );
  }

  const result = await db.collection<Asset>(COLLECTION).findOneAndUpdate(
    { id },
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

/**
 * Delete an asset (hard delete)
 */
export async function deleteAsset(id: string): Promise<boolean> {
  await ensureIndexes();
  const db = await getDb();
  const result = await db.collection<Asset>(COLLECTION).deleteOne({ id });
  return result.deletedCount > 0;
}

/**
 * Archive an asset (soft delete)
 */
export async function archiveAsset(id: string): Promise<Asset | null> {
  return updateAsset(id, { status: "archived", isPrimary: false });
}

/**
 * Increment usage count for an asset
 */
export async function incrementAssetUsage(id: string): Promise<void> {
  await ensureIndexes();
  const db = await getDb();
  await db.collection<Asset>(COLLECTION).updateOne(
    { id },
    {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date(), updatedAt: new Date() },
    }
  );
}

/**
 * Bulk increment usage for multiple assets
 */
export async function incrementMultipleAssetUsage(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await ensureIndexes();
  const db = await getDb();
  await db.collection<Asset>(COLLECTION).updateMany(
    { id: { $in: ids } },
    {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date(), updatedAt: new Date() },
    }
  );
}
