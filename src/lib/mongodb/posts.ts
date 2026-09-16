/**
 * Posts Collection
 *
 * CRUD operations for Post documents (Instagram posts with analysis).
 */

import { Collection, ObjectId, Filter } from "mongodb";
import clientPromise from "./clientPromise";
import type { Post, PostClassification, PostStrategy, ContentInsights } from "../types/post";

// Constants
const DB_NAME = "strategy";
const COLLECTION_NAME = "posts";
const INSIGHTS_COLLECTION = "insights";

// Index tracking
let indexesEnsured = false;

/**
 * Get the posts collection
 */
async function getCollection(): Promise<Collection<Post>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<Post>(COLLECTION_NAME);
}

/**
 * Get the insights collection
 */
async function getInsightsCollection(): Promise<Collection<ContentInsights>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<ContentInsights>(INSIGHTS_COLLECTION);
}

/**
 * Ensure indexes exist (called once on first use)
 */
export async function ensurePostIndexes(): Promise<void> {
  if (indexesEnsured) return;

  const collection = await getCollection();

  await Promise.all([
    collection.createIndex({ accountId: 1, instagramId: 1 }, { unique: true }),
    collection.createIndex({ accountId: 1, postedAt: -1 }),
    collection.createIndex({ accountId: 1, "classification.contentType": 1 }),
    collection.createIndex({ accountId: 1, syncedAt: -1 }),
  ]);

  indexesEnsured = true;
  console.log("[strategy:posts] Indexes ensured");
}

/**
 * Get all posts for an account
 */
export async function getPosts(
  accountId: string,
  options?: {
    hasTranscript?: boolean;
    hasClassification?: boolean;
    contentType?: string;
    limit?: number;
    offset?: number;
  }
): Promise<Post[]> {
  await ensurePostIndexes();
  const collection = await getCollection();

  const query: Record<string, unknown> = { accountId };

  if (options?.hasTranscript === true) {
    query.transcript = { $exists: true, $ne: null };
  } else if (options?.hasTranscript === false) {
    query.$or = [{ transcript: { $exists: false } }, { transcript: null }];
  }

  if (options?.hasClassification === true) {
    query.classification = { $exists: true, $ne: null };
  } else if (options?.hasClassification === false) {
    query.$or = [{ classification: { $exists: false } }, { classification: null }];
  }

  if (options?.contentType) {
    query["classification.contentType"] = options.contentType;
  }

  let cursor = collection.find(query).sort({ postedAt: -1 });

  if (options?.offset) {
    cursor = cursor.skip(options.offset);
  }
  if (options?.limit) {
    cursor = cursor.limit(options.limit);
  }

  return cursor.toArray();
}

/**
 * Get a single post by ID
 */
export async function getPostById(
  accountId: string,
  postId: string
): Promise<Post | null> {
  await ensurePostIndexes();
  const collection = await getCollection();

  // Try MongoDB ObjectId first, then instagramId
  if (ObjectId.isValid(postId)) {
    const post = await collection.findOne({
      _id: new ObjectId(postId),
      accountId,
    });
    if (post) return post;
  }

  return collection.findOne({ accountId, instagramId: postId });
}

/**
 * Get post by Instagram ID
 */
export async function getPostByInstagramId(
  accountId: string,
  instagramId: string
): Promise<Post | null> {
  await ensurePostIndexes();
  const collection = await getCollection();
  return collection.findOne({ accountId, instagramId });
}

/**
 * Upsert a post (create or update based on instagramId)
 */
export async function upsertPost(post: Omit<Post, "_id">): Promise<Post> {
  await ensurePostIndexes();
  const collection = await getCollection();

  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { syncedAt, ...postWithoutSyncedAt } = post;

  const result = await collection.findOneAndUpdate(
    { accountId: post.accountId, instagramId: post.instagramId },
    {
      $set: {
        ...postWithoutSyncedAt,
        updatedAt: now,
      },
      $setOnInsert: {
        syncedAt: now,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return result!;
}

/**
 * Bulk upsert posts
 */
export async function upsertPosts(posts: Omit<Post, "_id">[]): Promise<{
  synced: number;
  new: number;
}> {
  await ensurePostIndexes();
  const collection = await getCollection();

  const now = new Date();

  const operations = posts.map((post) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { syncedAt, ...postWithoutSyncedAt } = post;
    return {
      updateOne: {
        filter: { accountId: post.accountId, instagramId: post.instagramId },
        update: {
          $set: {
            ...postWithoutSyncedAt,
            updatedAt: now,
          },
          $setOnInsert: {
            syncedAt: now,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await collection.bulkWrite(operations);

  return { synced: posts.length, new: result.upsertedCount };
}

/**
 * Update post transcript
 */
export async function updatePostTranscript(
  accountId: string,
  postId: string,
  transcript: string
): Promise<boolean> {
  const collection = await getCollection();

  const filter = ObjectId.isValid(postId)
    ? { _id: new ObjectId(postId), accountId }
    : { instagramId: postId, accountId };

  const result = await collection.updateOne(filter, {
    $set: {
      transcript,
      transcribedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return result.modifiedCount > 0;
}

/**
 * Update post classification
 */
export async function updatePostClassification(
  accountId: string,
  postId: string,
  classification: PostClassification
): Promise<boolean> {
  const collection = await getCollection();

  const filter = ObjectId.isValid(postId)
    ? { _id: new ObjectId(postId), accountId }
    : { instagramId: postId, accountId };

  const result = await collection.updateOne(filter, {
    $set: {
      classification,
      updatedAt: new Date(),
    },
  });

  return result.modifiedCount > 0;
}

/**
 * Update post strategy tags
 */
export async function updatePostStrategy(
  accountId: string,
  postId: string,
  strategy: PostStrategy
): Promise<boolean> {
  const collection = await getCollection();

  const filter = ObjectId.isValid(postId)
    ? { _id: new ObjectId(postId), accountId }
    : { instagramId: postId, accountId };

  const result = await collection.updateOne(filter, {
    $set: {
      strategy,
      updatedAt: new Date(),
    },
  });

  return result.modifiedCount > 0;
}

/**
 * Get posts that need transcription (videos without transcript)
 */
export async function getPostsNeedingTranscription(
  accountId: string
): Promise<Post[]> {
  await ensurePostIndexes();
  const collection = await getCollection();

  const query: Filter<Post> = {
    accountId,
    mediaType: "VIDEO",
    $or: [
      { transcript: { $exists: false } },
      { transcript: { $eq: undefined } },
    ],
  };

  return collection.find(query).sort({ postedAt: -1 }).toArray();
}

/**
 * Get posts that need classification
 */
export async function getPostsNeedingClassification(
  accountId: string
): Promise<Post[]> {
  await ensurePostIndexes();
  const collection = await getCollection();

  // Posts that have either a transcript (videos) or caption (images)
  // but don't have classification yet
  const query: Filter<Post> = {
    accountId,
    $or: [
      { classification: { $exists: false } },
      { classification: { $eq: undefined } },
    ],
    $and: [
      {
        $or: [
          { transcript: { $exists: true, $ne: "" } },
          { caption: { $exists: true, $ne: "" } },
        ],
      },
    ],
  };

  return collection.find(query).sort({ postedAt: -1 }).toArray();
}

/**
 * Get classified posts with metrics (for insights generation)
 */
export async function getClassifiedPosts(accountId: string): Promise<Post[]> {
  await ensurePostIndexes();
  const collection = await getCollection();

  const query: Filter<Post> = {
    accountId,
    classification: { $exists: true },
  };

  return collection.find(query).sort({ postedAt: -1 }).toArray();
}

/**
 * Get post stats for an account
 */
export async function getPostStats(accountId: string): Promise<{
  total: number;
  videos: number;
  images: number;
  carousels: number;
  transcribed: number;
  classified: number;
}> {
  await ensurePostIndexes();
  const collection = await getCollection();

  const [total, videos, images, carousels, transcribed, classified] =
    await Promise.all([
      collection.countDocuments({ accountId }),
      collection.countDocuments({ accountId, mediaType: "VIDEO" }),
      collection.countDocuments({ accountId, mediaType: "IMAGE" }),
      collection.countDocuments({ accountId, mediaType: "CAROUSEL_ALBUM" }),
      collection.countDocuments({
        accountId,
        transcript: { $exists: true, $ne: "" },
      } as Filter<Post>),
      collection.countDocuments({
        accountId,
        classification: { $exists: true },
      } as Filter<Post>),
    ]);

  return { total, videos, images, carousels, transcribed, classified };
}

/**
 * Save generated insights
 */
export async function saveInsights(insights: ContentInsights): Promise<string> {
  const collection = await getInsightsCollection();
  const result = await collection.insertOne(insights);
  return result.insertedId.toString();
}

/**
 * Get latest insights for an account
 */
export async function getLatestInsights(
  accountId: string
): Promise<ContentInsights | null> {
  const collection = await getInsightsCollection();
  return collection.findOne(
    { accountId },
    { sort: { generatedAt: -1 } }
  );
}

/**
 * Get insights history for an account
 */
export async function getInsightsHistory(
  accountId: string,
  limit: number = 20
): Promise<ContentInsights[]> {
  const collection = await getInsightsCollection();
  return collection
    .find({ accountId })
    .sort({ generatedAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Get a specific insights document by ID
 */
export async function getInsightsById(
  insightsId: string
): Promise<ContentInsights | null> {
  const collection = await getInsightsCollection();
  const { ObjectId } = await import("mongodb");
  return collection.findOne({ _id: new ObjectId(insightsId) });
}
