/**
 * Content Items Collection
 *
 * CRUD operations for ContentItem documents (carousels, graphics, videos).
 */

import { Collection, ObjectId } from "mongodb";
import clientPromise from "./clientPromise";
import type { ContentItem, ContentItemStatus, ContentItemType } from "../types/content-item";

const DB_NAME = "strategy";
const COLLECTION_NAME = "content_items";

let indexesEnsured = false;

/**
 * Get the content items collection
 */
async function getCollection(): Promise<Collection<ContentItem>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<ContentItem>(COLLECTION_NAME);
}

/**
 * Ensure indexes exist
 */
export async function ensureContentItemIndexes(): Promise<void> {
  if (indexesEnsured) return;

  const collection = await getCollection();

  await Promise.all([
    collection.createIndex({ accountId: 1, plannedDate: -1 }),
    collection.createIndex({ accountId: 1, type: 1 }),
    collection.createIndex({ accountId: 1, status: 1 }),
    collection.createIndex({ accountId: 1, createdAt: -1 }),
  ]);

  indexesEnsured = true;
  console.log("[strategy:content-items] Indexes ensured");
}

/**
 * Get all content items for an account
 */
export async function getContentItems(
  accountId: string,
  options?: {
    type?: ContentItemType;
    status?: ContentItemStatus;
    limit?: number;
    offset?: number;
  }
): Promise<ContentItem[]> {
  await ensureContentItemIndexes();
  const collection = await getCollection();

  const query: Record<string, unknown> = { accountId };

  if (options?.type) {
    query.type = options.type;
  }

  if (options?.status) {
    query.status = options.status;
  }

  let cursor = collection.find(query).sort({ plannedDate: -1, createdAt: -1 });

  if (options?.offset) {
    cursor = cursor.skip(options.offset);
  }
  if (options?.limit) {
    cursor = cursor.limit(options.limit);
  }

  return cursor.toArray();
}

/**
 * Get a single content item by ID (ObjectId or driveId)
 */
export async function getContentItemById(
  accountId: string,
  itemId: string
): Promise<ContentItem | null> {
  await ensureContentItemIndexes();
  const collection = await getCollection();

  // Try finding by driveId first (from sync)
  const byDriveId = await collection.findOne({
    driveId: itemId,
    accountId,
  });

  if (byDriveId) {
    return byDriveId;
  }

  // Fall back to ObjectId
  if (!ObjectId.isValid(itemId)) {
    return null;
  }

  return collection.findOne({
    _id: new ObjectId(itemId),
    accountId,
  });
}

/**
 * Create a new content item
 */
export async function createContentItem(
  item: Omit<ContentItem, "_id" | "createdAt" | "updatedAt">
): Promise<ContentItem> {
  await ensureContentItemIndexes();
  const collection = await getCollection();

  const now = new Date();
  const doc: ContentItem = {
    ...item,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

/**
 * Update a content item (by ObjectId or driveId)
 */
export async function updateContentItem(
  accountId: string,
  itemId: string,
  updates: Partial<Omit<ContentItem, "_id" | "accountId" | "createdAt">>
): Promise<ContentItem | null> {
  await ensureContentItemIndexes();
  const collection = await getCollection();

  // Try updating by driveId first (from sync)
  const byDriveId = await collection.findOneAndUpdate(
    { driveId: itemId, accountId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  if (byDriveId) {
    return byDriveId;
  }

  // Fall back to ObjectId
  if (!ObjectId.isValid(itemId)) {
    return null;
  }

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(itemId), accountId },
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
 * Delete a content item
 */
export async function deleteContentItem(
  accountId: string,
  itemId: string
): Promise<boolean> {
  const collection = await getCollection();

  if (!ObjectId.isValid(itemId)) {
    return false;
  }

  const result = await collection.deleteOne({
    _id: new ObjectId(itemId),
    accountId,
  });

  return result.deletedCount > 0;
}

/**
 * Get content item counts by type for package progress
 */
export async function getContentItemCounts(
  accountId: string,
  countStatuses?: ContentItemStatus[]
): Promise<Record<ContentItemType, number>> {
  await ensureContentItemIndexes();
  const collection = await getCollection();

  const matchStage: Record<string, unknown> = { accountId };

  if (countStatuses && countStatuses.length > 0) {
    matchStage.status = { $in: countStatuses };
  }

  const pipeline = [
    { $match: matchStage },
    { $group: { _id: "$type", count: { $sum: 1 } } },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  const counts: Record<ContentItemType, number> = {
    carousel: 0,
    graphic: 0,
    video: 0,
  };

  for (const result of results) {
    if (result._id in counts) {
      counts[result._id as ContentItemType] = result.count;
    }
  }

  return counts;
}

/**
 * Get content items for a specific month
 */
export async function getContentItemsForMonth(
  accountId: string,
  year: number,
  month: number
): Promise<ContentItem[]> {
  await ensureContentItemIndexes();
  const collection = await getCollection();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  return collection
    .find({
      accountId,
      plannedDate: { $gte: startDate, $lte: endDate },
    })
    .sort({ plannedDate: 1 })
    .toArray();
}
