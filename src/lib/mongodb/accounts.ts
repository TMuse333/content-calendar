/**
 * Accounts Collection
 *
 * CRUD operations for StrategyAccount documents.
 */

import { Collection, ObjectId } from "mongodb";
import clientPromise from "./clientPromise";
import type {
  StrategyAccount,
  CreateAccountRequest,
  UpdateAccountRequest,
  Campaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  InformationPoint,
} from "../types/account";

// Constants
const DB_NAME = "strategy";
const COLLECTION_NAME = "accounts";

// Index tracking
let indexesEnsured = false;

/**
 * Get the accounts collection
 */
async function getCollection(): Promise<Collection<StrategyAccount>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<StrategyAccount>(COLLECTION_NAME);
}

/**
 * Ensure indexes exist (called once on first use)
 */
export async function ensureAccountIndexes(): Promise<void> {
  if (indexesEnsured) return;

  const collection = await getCollection();

  await Promise.all([
    collection.createIndex({ id: 1 }, { unique: true }),
    collection.createIndex({ email: 1 }, { sparse: true }),
    collection.createIndex({ status: 1 }),
    collection.createIndex({ isActive: 1 }),
    collection.createIndex({ createdAt: -1 }),
  ]);

  indexesEnsured = true;
  console.log("[strategy:accounts] Indexes ensured");
}

/**
 * Generate account ID from name
 */
function generateAccountId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Generate a simple ID for campaigns/info points
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Get all accounts
 */
export async function getAccounts(options?: {
  activeOnly?: boolean;
  status?: string;
}): Promise<StrategyAccount[]> {
  await ensureAccountIndexes();
  const collection = await getCollection();

  const query: Record<string, unknown> = {};

  if (options?.activeOnly !== false) {
    query.isActive = { $ne: false };
  }
  if (options?.status) {
    query.status = options.status;
  }

  return collection.find(query).sort({ createdAt: -1 }).toArray();
}

/**
 * Get account by ID (slug)
 */
export async function getAccountById(id: string): Promise<StrategyAccount | null> {
  await ensureAccountIndexes();
  const collection = await getCollection();
  return collection.findOne({ id, isActive: { $ne: false } });
}

/**
 * Get account by MongoDB ObjectId
 */
export async function getAccountByObjectId(
  objectId: string
): Promise<StrategyAccount | null> {
  await ensureAccountIndexes();
  const collection = await getCollection();
  return collection.findOne({ _id: new ObjectId(objectId), isActive: { $ne: false } });
}

/**
 * Check if account ID exists
 */
export async function accountExists(id: string): Promise<boolean> {
  const collection = await getCollection();
  const count = await collection.countDocuments({ id });
  return count > 0;
}

/**
 * Create a new account
 */
export async function createAccount(
  data: CreateAccountRequest
): Promise<StrategyAccount> {
  await ensureAccountIndexes();
  const collection = await getCollection();

  // Generate ID if not provided
  const id = data.id || generateAccountId(data.name);

  // Check for duplicate
  if (await accountExists(id)) {
    throw new Error(`Account with ID "${id}" already exists`);
  }

  const now = new Date();

  const account: StrategyAccount = {
    id,
    name: data.name,
    handle: data.handle,
    email: data.email,

    // Start with empty campaigns
    campaigns: [],

    // No platform connections yet
    platforms: {},

    // Brand colors
    brand: data.brand || {
      primaryColor: "#06b6d4",
      secondaryColor: "#8b5cf6",
    },

    // Metadata
    status: "active",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(account);
  return { ...account, _id: result.insertedId };
}

/**
 * Update an account
 */
export async function updateAccount(
  id: string,
  updates: UpdateAccountRequest
): Promise<StrategyAccount | null> {
  await ensureAccountIndexes();
  const collection = await getCollection();

  const updateDoc: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  // Top-level fields
  if (updates.name !== undefined) updateDoc.name = updates.name;
  if (updates.handle !== undefined) updateDoc.handle = updates.handle;
  if (updates.email !== undefined) updateDoc.email = updates.email;
  if (updates.status !== undefined) updateDoc.status = updates.status;

  // Nested configs - merge with existing
  if (updates.brand) {
    for (const [key, value] of Object.entries(updates.brand)) {
      updateDoc[`brand.${key}`] = value;
    }
  }
  if (updates.platforms) {
    for (const [key, value] of Object.entries(updates.platforms)) {
      updateDoc[`platforms.${key}`] = value;
    }
  }

  const result = await collection.findOneAndUpdate(
    { id, isActive: { $ne: false } },
    { $set: updateDoc },
    { returnDocument: "after" }
  );

  return result;
}

/**
 * Soft delete an account
 */
export async function deleteAccount(id: string): Promise<boolean> {
  await ensureAccountIndexes();
  const collection = await getCollection();

  const result = await collection.updateOne(
    { id, isActive: { $ne: false } },
    {
      $set: {
        isActive: false,
        status: "inactive",
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

// ============================================================================
// CAMPAIGN OPERATIONS
// ============================================================================

/**
 * Add a campaign to an account
 */
export async function addCampaign(
  accountId: string,
  data: CreateCampaignRequest
): Promise<Campaign | null> {
  const collection = await getCollection();
  const now = new Date();

  const campaign: Campaign = {
    id: generateId(),
    name: data.name,
    description: data.description,
    informationPoints: data.informationPoints || [],
    underlyingNeed: data.underlyingNeed || null,
    secondaryNeed: data.secondaryNeed || null,
    deliveryStyle: data.deliveryStyle || null,
    postsPerWeek: data.postsPerWeek,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.updateOne(
    { id: accountId, isActive: { $ne: false } },
    {
      $push: { campaigns: campaign },
      $set: { updatedAt: now },
    }
  );

  if (result.modifiedCount === 0) return null;
  return campaign;
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  accountId: string,
  campaignId: string,
  updates: UpdateCampaignRequest
): Promise<boolean> {
  const collection = await getCollection();

  const updateDoc: Record<string, unknown> = {
    "campaigns.$.updatedAt": new Date(),
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) updateDoc["campaigns.$.name"] = updates.name;
  if (updates.informationPoints !== undefined) updateDoc["campaigns.$.informationPoints"] = updates.informationPoints;
  if (updates.underlyingNeed !== undefined) updateDoc["campaigns.$.underlyingNeed"] = updates.underlyingNeed;
  if (updates.deliveryStyle !== undefined) updateDoc["campaigns.$.deliveryStyle"] = updates.deliveryStyle;
  if (updates.status !== undefined) updateDoc["campaigns.$.status"] = updates.status;
  if (updates.startDate !== undefined) updateDoc["campaigns.$.startDate"] = new Date(updates.startDate);
  if (updates.endDate !== undefined) updateDoc["campaigns.$.endDate"] = new Date(updates.endDate);

  const result = await collection.updateOne(
    { id: accountId, "campaigns.id": campaignId, isActive: { $ne: false } },
    { $set: updateDoc }
  );

  return result.modifiedCount > 0;
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(
  accountId: string,
  campaignId: string
): Promise<boolean> {
  const collection = await getCollection();

  const result = await collection.updateOne(
    { id: accountId, isActive: { $ne: false } },
    {
      $pull: { campaigns: { id: campaignId } },
      $set: { updatedAt: new Date() },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Add an information point to a campaign
 */
export async function addInfoPoint(
  accountId: string,
  campaignId: string,
  text: string
): Promise<InformationPoint | null> {
  const collection = await getCollection();

  const infoPoint: InformationPoint = {
    id: generateId(),
    text,
  };

  const result = await collection.updateOne(
    { id: accountId, "campaigns.id": campaignId, isActive: { $ne: false } },
    {
      $push: { "campaigns.$.informationPoints": infoPoint },
      $set: { "campaigns.$.updatedAt": new Date(), updatedAt: new Date() },
    }
  );

  if (result.modifiedCount === 0) return null;
  return infoPoint;
}

/**
 * Remove an information point from a campaign
 */
export async function removeInfoPoint(
  accountId: string,
  campaignId: string,
  infoPointId: string
): Promise<boolean> {
  const collection = await getCollection();

  const result = await collection.updateOne(
    { id: accountId, "campaigns.id": campaignId, isActive: { $ne: false } },
    {
      $pull: { "campaigns.$.informationPoints": { id: infoPointId } },
      $set: { "campaigns.$.updatedAt": new Date(), updatedAt: new Date() },
    }
  );

  return result.modifiedCount > 0;
}
