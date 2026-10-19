/**
 * Tracked Posts Collection
 *
 * MongoDB functions for Instagram analytics data.
 * This is where we store metrics pulled from the IG API.
 *
 * Join key: igPostUrl matches NotionPost.igPostLink in Notion
 */

import { ObjectId } from "mongodb";
import clientPromise from "./clientPromise";
import type {
  TrackedPost,
  IgMetrics,
  MetricsSnapshot,
} from "../types/tracked-post";

const DB_NAME = "strategy-app";
const COLLECTION = "tracked_posts";

async function getCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<TrackedPost>(COLLECTION);
}

// =============================================================================
// CREATE / UPDATE
// =============================================================================

export async function upsertTrackedPost(
  accountId: string,
  igPostUrl: string,
  data: Partial<Omit<TrackedPost, "_id" | "accountId" | "igPostUrl" | "createdAt">>
): Promise<TrackedPost> {
  const collection = await getCollection();
  const now = new Date();

  const result = await collection.findOneAndUpdate(
    { accountId, igPostUrl },
    {
      $set: {
        ...data,
        updatedAt: now,
      },
      $setOnInsert: {
        accountId,
        igPostUrl,
        createdAt: now,
        history: [],
        fetchCount: 0,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return result!;
}

export async function updateMetrics(
  accountId: string,
  igPostUrl: string,
  metrics: IgMetrics
): Promise<TrackedPost | null> {
  const collection = await getCollection();
  const now = new Date();

  // Create snapshot for history
  const snapshot: MetricsSnapshot = {
    timestamp: now,
    metrics,
  };

  const result = await collection.findOneAndUpdate(
    { accountId, igPostUrl },
    {
      $set: {
        metrics,
        lastFetchedAt: now,
        updatedAt: now,
      },
      $push: {
        history: {
          $each: [snapshot],
          $slice: -30, // Keep last 30 snapshots
        },
      },
      $inc: { fetchCount: 1 },
    },
    { returnDocument: "after" }
  );

  return result;
}

// =============================================================================
// READ
// =============================================================================

export async function getTrackedPost(
  accountId: string,
  igPostUrl: string
): Promise<TrackedPost | null> {
  const collection = await getCollection();
  return collection.findOne({ accountId, igPostUrl });
}

export async function getTrackedPostById(
  postId: string | ObjectId
): Promise<TrackedPost | null> {
  const collection = await getCollection();
  const id = typeof postId === "string" ? new ObjectId(postId) : postId;
  return collection.findOne({ _id: id });
}

export async function getTrackedPostsByAccount(
  accountId: string,
  options?: {
    limit?: number;
    sortBy?: "publishedAt" | "engagementRate" | "lastFetchedAt";
    sortOrder?: "asc" | "desc";
  }
): Promise<TrackedPost[]> {
  const collection = await getCollection();

  const sortField = options?.sortBy ?? "publishedAt";
  const sortOrder = options?.sortOrder === "asc" ? 1 : -1;

  return collection
    .find({ accountId })
    .sort({ [sortField]: sortOrder })
    .limit(options?.limit ?? 100)
    .toArray();
}

export async function getRecentTrackedPosts(
  accountId: string,
  days: number = 30
): Promise<TrackedPost[]> {
  const collection = await getCollection();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return collection
    .find({
      accountId,
      publishedAt: { $gte: cutoff },
    })
    .sort({ publishedAt: -1 })
    .toArray();
}

// =============================================================================
// AGGREGATIONS
// =============================================================================

export interface AccountMetricsSummary {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalSaves: number;
  totalShares: number;
  avgEngagementRate: number;
  avgLikesPerPost: number;
  avgCommentsPerPost: number;
}

export async function getAccountMetricsSummary(
  accountId: string,
  options?: {
    since?: Date;
    until?: Date;
  }
): Promise<AccountMetricsSummary> {
  const collection = await getCollection();

  const match: Record<string, unknown> = { accountId };
  if (options?.since || options?.until) {
    match.publishedAt = {};
    if (options.since) (match.publishedAt as Record<string, Date>).$gte = options.since;
    if (options.until) (match.publishedAt as Record<string, Date>).$lte = options.until;
  }

  const result = await collection
    .aggregate<AccountMetricsSummary>([
      { $match: match },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalLikes: { $sum: "$metrics.likes" },
          totalComments: { $sum: "$metrics.comments" },
          totalSaves: { $sum: "$metrics.saves" },
          totalShares: { $sum: "$metrics.shares" },
          avgEngagementRate: { $avg: "$metrics.engagementRate" },
        },
      },
      {
        $project: {
          _id: 0,
          totalPosts: 1,
          totalLikes: 1,
          totalComments: 1,
          totalSaves: 1,
          totalShares: 1,
          avgEngagementRate: { $round: ["$avgEngagementRate", 2] },
          avgLikesPerPost: {
            $round: [{ $divide: ["$totalLikes", "$totalPosts"] }, 1],
          },
          avgCommentsPerPost: {
            $round: [{ $divide: ["$totalComments", "$totalPosts"] }, 1],
          },
        },
      },
    ])
    .toArray();

  return (
    result[0] ?? {
      totalPosts: 0,
      totalLikes: 0,
      totalComments: 0,
      totalSaves: 0,
      totalShares: 0,
      avgEngagementRate: 0,
      avgLikesPerPost: 0,
      avgCommentsPerPost: 0,
    }
  );
}

export async function getTopPerformingPosts(
  accountId: string,
  limit: number = 5,
  metric: "engagementRate" | "likes" | "saves" = "engagementRate"
): Promise<TrackedPost[]> {
  const collection = await getCollection();

  const sortField = metric === "engagementRate"
    ? "metrics.engagementRate"
    : `metrics.${metric}`;

  return collection
    .find({ accountId })
    .sort({ [sortField]: -1 })
    .limit(limit)
    .toArray();
}

// =============================================================================
// STALENESS CHECK (posts needing metrics refresh)
// =============================================================================

export async function getStaleTrackedPosts(
  accountId: string,
  staleAfterHours: number = 24
): Promise<TrackedPost[]> {
  const collection = await getCollection();
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - staleAfterHours);

  return collection
    .find({
      accountId,
      $or: [
        { lastFetchedAt: { $lt: cutoff } },
        { lastFetchedAt: { $exists: false } },
      ],
    })
    .toArray();
}

// =============================================================================
// DELETE
// =============================================================================

export async function deleteTrackedPost(
  accountId: string,
  igPostUrl: string
): Promise<boolean> {
  const collection = await getCollection();
  const result = await collection.deleteOne({ accountId, igPostUrl });
  return result.deletedCount > 0;
}
