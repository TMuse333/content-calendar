/**
 * Deals MongoDB Module
 *
 * CRUD operations for content deals/packages.
 */

import { Collection, ObjectId } from "mongodb";
import clientPromise from "./clientPromise";
import type { Deal, CreateDealRequest, UpdateDealRequest, DealProgress } from "@/lib/types/deal";

const DB_NAME = "strategy";
const COLLECTION_NAME = "deals";

async function getCollection(): Promise<Collection<Deal>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<Deal>(COLLECTION_NAME);
}

/**
 * Ensure indexes exist
 */
export async function ensureDealIndexes(): Promise<void> {
  const collection = await getCollection();
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ accountId: 1 });
  await collection.createIndex({ accountId: 1, status: 1 });
}

/**
 * Generate a slug from the deal name
 */
function generateSlug(accountId: string, name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${accountId}-${base}`;
}

/**
 * Get all deals for an account
 */
export async function getDeals(
  accountId: string,
  options?: { status?: "active" | "completed" | "paused" }
): Promise<Deal[]> {
  const collection = await getCollection();
  const query: Record<string, unknown> = { accountId };

  if (options?.status) {
    query.status = options.status;
  }

  return collection.find(query).sort({ createdAt: -1 }).toArray();
}

/**
 * Get a single deal by ID
 */
export async function getDealById(id: string): Promise<Deal | null> {
  const collection = await getCollection();
  return collection.findOne({ id });
}

/**
 * Create a new deal
 */
export async function createDeal(
  accountId: string,
  data: CreateDealRequest
): Promise<Deal> {
  await ensureDealIndexes();
  const collection = await getCollection();

  const id = data.id || generateSlug(accountId, data.name);

  // Check for duplicate
  const existing = await collection.findOne({ id });
  if (existing) {
    throw new Error(`Deal with ID "${id}" already exists`);
  }

  const now = new Date();
  const deal: Deal = {
    id,
    accountId,
    name: data.name,
    status: data.status || "active",
    limits: data.limits,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(deal);
  return { ...deal, _id: result.insertedId };
}

/**
 * Update a deal
 */
export async function updateDeal(
  id: string,
  updates: UpdateDealRequest
): Promise<Deal | null> {
  const collection = await getCollection();

  const updateDoc: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) updateDoc.name = updates.name;
  if (updates.status !== undefined) updateDoc.status = updates.status;
  if (updates.notes !== undefined) updateDoc.notes = updates.notes;
  if (updates.startDate !== undefined) updateDoc.startDate = new Date(updates.startDate);
  if (updates.endDate !== undefined) updateDoc.endDate = new Date(updates.endDate);

  if (updates.limits) {
    for (const [key, value] of Object.entries(updates.limits)) {
      updateDoc[`limits.${key}`] = value;
    }
  }

  const result = await collection.findOneAndUpdate(
    { id },
    { $set: updateDoc },
    { returnDocument: "after" }
  );

  return result;
}

/**
 * Delete a deal
 */
export async function deleteDeal(id: string): Promise<boolean> {
  const collection = await getCollection();
  const result = await collection.deleteOne({ id });
  return result.deletedCount === 1;
}

/**
 * Get deal progress (counts from content items)
 * This queries the content_items collection to calculate progress
 */
export async function getDealProgress(dealId: string): Promise<DealProgress | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const deal = await getDealById(dealId);

  if (!deal) return null;

  const contentItems = db.collection("content_items");

  // Count items by type for this deal, excluding extras
  const counts = await contentItems.aggregate([
    { $match: { dealId, isExtra: { $ne: true } } },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
  ]).toArray();

  const countMap = counts.reduce((acc, { _id, count }) => {
    acc[_id] = count;
    return acc;
  }, {} as Record<string, number>);

  return {
    carousels: {
      done: countMap["carousel"] || 0,
      total: deal.limits.carousels ?? 0,
    },
    graphics: {
      done: countMap["graphic"] || 0,
      total: deal.limits.graphics ?? 0,
    },
    videos: {
      done: countMap["video"] || 0,
      total: deal.limits.videos ?? 0,
    },
  };
}
