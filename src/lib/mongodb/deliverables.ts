/**
 * Deliverables MongoDB Operations
 *
 * CRUD operations for account deliverables (finished outputs).
 */

import clientPromise from "./clientPromise";
import type {
  Deliverable,
  DeliveryType,
  DeliveryStatus,
  DeliverableFilters,
  DeliverableSummary,
  CreateDeliverableRequest,
  UpdateDeliverableRequest,
  PublishPlatform,
} from "@/lib/types/deliverable";
import { v4 as uuid } from "uuid";

const DB_NAME = process.env.MONGODB_DB || "strategy";

async function getDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

const COLLECTION = "deliverables";

// Ensure indexes
let indexesCreated = false;
async function ensureIndexes() {
  if (indexesCreated) return;
  const db = await getDb();
  const collection = db.collection(COLLECTION);
  await collection.createIndex({ accountId: 1, createdAt: -1 });
  await collection.createIndex({ accountId: 1, deliveryType: 1 });
  await collection.createIndex({ accountId: 1, status: 1 });
  await collection.createIndex({ accountId: 1, entropyLevel: 1 });
  await collection.createIndex({ accountId: 1, campaign: 1 });
  await collection.createIndex({ accountId: 1, "tags": 1 });
  indexesCreated = true;
}

/**
 * Get all deliverables for an account with optional filters
 */
export async function getDeliverables(
  accountId: string,
  filters?: DeliverableFilters,
  options?: { limit?: number; offset?: number }
): Promise<Deliverable[]> {
  await ensureIndexes();
  const db = await getDb();

  const query: Record<string, unknown> = { accountId };

  if (filters?.deliveryType) query.deliveryType = filters.deliveryType;
  if (filters?.status) query.status = filters.status;
  if (filters?.entropyLevel) query.entropyLevel = filters.entropyLevel;
  if (filters?.campaign) query.campaign = filters.campaign;
  if (filters?.tag) query.tags = filters.tag;
  if (filters?.publishedTo) query.publishedTo = filters.publishedTo;

  if (filters?.fromDate || filters?.toDate) {
    query.createdAt = {};
    if (filters.fromDate) (query.createdAt as Record<string, Date>).$gte = filters.fromDate;
    if (filters.toDate) (query.createdAt as Record<string, Date>).$lte = filters.toDate;
  }

  const cursor = db
    .collection<Deliverable>(COLLECTION)
    .find(query)
    .sort({ createdAt: -1 });

  if (options?.offset) cursor.skip(options.offset);
  if (options?.limit) cursor.limit(options.limit);

  return cursor.toArray();
}

/**
 * Get deliverable by ID
 */
export async function getDeliverableById(id: string): Promise<Deliverable | null> {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<Deliverable>(COLLECTION).findOne({ id });
}

/**
 * Get deliverables by question ID
 */
export async function getDeliverablesByQuestion(
  accountId: string,
  questionId: string
): Promise<Deliverable[]> {
  await ensureIndexes();
  const db = await getDb();
  return db
    .collection<Deliverable>(COLLECTION)
    .find({ accountId, questionId })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Create a new deliverable
 */
export async function createDeliverable(
  accountId: string,
  data: CreateDeliverableRequest
): Promise<Deliverable> {
  await ensureIndexes();
  const db = await getDb();

  const deliverable: Deliverable = {
    id: uuid(),
    accountId,
    deliveryType: data.deliveryType,
    title: data.title,
    description: data.description,
    slides: data.slides,
    thumbnail: data.slides[0], // First slide as thumbnail
    questionId: data.questionId,
    briefId: data.briefId,
    formatId: data.formatId,
    formatName: data.formatName,
    entropyLevel: data.entropyLevel,
    status: "draft",
    tags: data.tags || [],
    campaign: data.campaign,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection<Deliverable>(COLLECTION).insertOne(deliverable);
  return deliverable;
}

/**
 * Update a deliverable
 */
export async function updateDeliverable(
  id: string,
  updates: UpdateDeliverableRequest
): Promise<Deliverable | null> {
  await ensureIndexes();
  const db = await getDb();

  const setFields: Record<string, unknown> = {
    ...updates,
    updatedAt: new Date(),
  };

  // Handle status transitions
  if (updates.status === "approved" && !updates.approvedBy) {
    setFields.approvedAt = new Date();
  }
  if (updates.status === "published" && updates.publishedTo?.length) {
    setFields.publishedAt = new Date();
  }

  const result = await db.collection<Deliverable>(COLLECTION).findOneAndUpdate(
    { id },
    { $set: setFields },
    { returnDocument: "after" }
  );

  return result;
}

/**
 * Approve a deliverable
 */
export async function approveDeliverable(
  id: string,
  approvedBy?: string
): Promise<Deliverable | null> {
  await ensureIndexes();
  const db = await getDb();

  const result = await db.collection<Deliverable>(COLLECTION).findOneAndUpdate(
    { id },
    {
      $set: {
        status: "approved",
        approvedAt: new Date(),
        approvedBy,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

/**
 * Mark a deliverable as published
 */
export async function publishDeliverable(
  id: string,
  platforms: PublishPlatform[]
): Promise<Deliverable | null> {
  await ensureIndexes();
  const db = await getDb();

  const result = await db.collection<Deliverable>(COLLECTION).findOneAndUpdate(
    { id },
    {
      $set: {
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
      $addToSet: {
        publishedTo: { $each: platforms },
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

/**
 * Archive a deliverable
 */
export async function archiveDeliverable(id: string): Promise<Deliverable | null> {
  return updateDeliverable(id, { status: "archived" });
}

/**
 * Delete a deliverable (hard delete)
 */
export async function deleteDeliverable(id: string): Promise<boolean> {
  await ensureIndexes();
  const db = await getDb();
  const result = await db.collection<Deliverable>(COLLECTION).deleteOne({ id });
  return result.deletedCount > 0;
}

/**
 * Get summary stats for an account
 */
export async function getDeliverableSummary(accountId: string): Promise<DeliverableSummary> {
  await ensureIndexes();
  const db = await getDb();
  const collection = db.collection<Deliverable>(COLLECTION);

  // Get all deliverables for counting
  const all = await collection.find({ accountId }).toArray();

  // Count by type
  const byType: Record<DeliveryType, number> = {
    carousel: 0,
    single: 0,
    story: 0,
    "reel-cover": 0,
    flyer: 0,
    banner: 0,
  };

  // Count by status
  const byStatus: Record<DeliveryStatus, number> = {
    draft: 0,
    approved: 0,
    published: 0,
    archived: 0,
  };

  // Group by month
  const monthCounts: Record<string, number> = {};

  for (const d of all) {
    byType[d.deliveryType] = (byType[d.deliveryType] || 0) + 1;
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;

    const month = d.createdAt.toISOString().slice(0, 7); // YYYY-MM
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  }

  // Convert month counts to array
  const byMonth = Object.entries(monthCounts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12);

  // Get recently published
  const recentlyPublished = await collection
    .find({ accountId, status: "published" })
    .sort({ publishedAt: -1 })
    .limit(5)
    .toArray();

  return {
    total: all.length,
    byType,
    byStatus,
    byMonth,
    recentlyPublished,
  };
}

/**
 * Get all unique tags used by an account
 */
export async function getDeliverableTags(accountId: string): Promise<string[]> {
  await ensureIndexes();
  const db = await getDb();

  const result = await db
    .collection<Deliverable>(COLLECTION)
    .distinct("tags", { accountId });

  return (result.filter((t): t is string => typeof t === "string") as string[]).sort();
}

/**
 * Get all campaigns used by an account
 */
export async function getDeliverableCampaigns(accountId: string): Promise<string[]> {
  await ensureIndexes();
  const db = await getDb();

  const result = await db
    .collection<Deliverable>(COLLECTION)
    .distinct("campaign", { accountId });

  return (result.filter((c): c is string => typeof c === "string") as string[]).sort();
}
