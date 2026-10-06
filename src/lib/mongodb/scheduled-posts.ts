/**
 * Scheduled Posts MongoDB Operations
 *
 * CRUD for the ScheduledPost collection used in the three-app pipeline.
 */

import { Collection } from "mongodb";
import clientPromise from "./clientPromise";
import { randomUUID } from "crypto";
import type {
  ScheduledPost,
  CreateScheduledPostRequest,
  UpdateScheduledPostRequest,
  getDayOfWeek,
} from "../types/scheduled-post";

// Re-export the helper
export { getDayOfWeek } from "../types/scheduled-post";

const DB_NAME = "strategy";
const COLLECTION_NAME = "scheduled_posts";

let indexesEnsured = false;

async function getCollection(): Promise<Collection<ScheduledPost>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<ScheduledPost>(COLLECTION_NAME);
}

async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;

  const collection = await getCollection();
  await collection.createIndex({ agentId: 1, scheduledFor: 1 });
  await collection.createIndex({ agentId: 1, status: 1 });
  await collection.createIndex({ graphicId: 1 }, { sparse: true });

  indexesEnsured = true;
}

// ============ CRUD Operations ============

export async function createScheduledPost(
  agentId: string,
  request: CreateScheduledPostRequest
): Promise<ScheduledPost> {
  await ensureIndexes();
  const collection = await getCollection();

  const now = new Date();
  const scheduledDate = new Date(request.scheduledFor);

  // Import getDayOfWeek dynamically to avoid circular deps
  const { getDayOfWeek } = await import("../types/scheduled-post");

  const post: ScheduledPost = {
    id: randomUUID(),
    agentId,
    scheduledFor: request.scheduledFor,
    dayOfWeek: getDayOfWeek(scheduledDate),
    status: "proposed",
    intent: request.intent,
    content: request.content,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(post);
  return post;
}

export async function getScheduledPostById(
  id: string
): Promise<ScheduledPost | null> {
  await ensureIndexes();
  const collection = await getCollection();
  return collection.findOne({ id });
}

export async function getScheduledPostsByAgent(
  agentId: string,
  options?: {
    month?: string;          // "2026-10"
    status?: ScheduledPost["status"];
    limit?: number;
  }
): Promise<ScheduledPost[]> {
  await ensureIndexes();
  const collection = await getCollection();

  const query: Record<string, unknown> = { agentId };

  if (options?.status) {
    query.status = options.status;
  }

  if (options?.month) {
    // Filter by month (e.g., "2026-10" matches "2026-10-01" through "2026-10-31")
    query.scheduledFor = {
      $regex: `^${options.month}`,
    };
  }

  return collection
    .find(query)
    .sort({ scheduledFor: 1 })
    .limit(options?.limit || 100)
    .toArray();
}

export async function updateScheduledPost(
  id: string,
  updates: UpdateScheduledPostRequest
): Promise<ScheduledPost | null> {
  await ensureIndexes();
  const collection = await getCollection();

  const setFields: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.scheduledFor !== undefined) {
    setFields.scheduledFor = updates.scheduledFor;
    const { getDayOfWeek } = await import("../types/scheduled-post");
    setFields.dayOfWeek = getDayOfWeek(updates.scheduledFor);
  }

  if (updates.status !== undefined) {
    setFields.status = updates.status;
    // Auto-set postedAt when status changes to posted
    if (updates.status === "posted") {
      setFields.postedAt = new Date();
    }
  }

  if (updates.intent !== undefined) {
    // Merge intent fields
    setFields["intent.audience"] = updates.intent.audience;
    if (updates.intent.topic !== undefined) setFields["intent.topic"] = updates.intent.topic;
    if (updates.intent.viewerQuestion !== undefined) setFields["intent.viewerQuestion"] = updates.intent.viewerQuestion;
    if (updates.intent.suggestedFormat !== undefined) setFields["intent.suggestedFormat"] = updates.intent.suggestedFormat;
  }

  if (updates.content !== undefined) {
    setFields.content = updates.content;
  }

  if (updates.graphicId !== undefined) {
    setFields.graphicId = updates.graphicId;
  }

  if (updates.graphicPreviewUrl !== undefined) {
    setFields.graphicPreviewUrl = updates.graphicPreviewUrl;
  }

  if (updates.instagramPostId !== undefined) {
    setFields.instagramPostId = updates.instagramPostId;
  }

  if (updates.instagramPermalink !== undefined) {
    setFields.instagramPermalink = updates.instagramPermalink;
  }

  const result = await collection.findOneAndUpdate(
    { id },
    { $set: setFields },
    { returnDocument: "after" }
  );

  return result;
}

export async function deleteScheduledPost(id: string): Promise<boolean> {
  await ensureIndexes();
  const collection = await getCollection();
  const result = await collection.deleteOne({ id });
  return result.deletedCount === 1;
}

// ============ Special Operations ============

/**
 * Link a graphic from Graphics App to a scheduled post.
 * Called by the webhook from Graphics App.
 */
export async function linkGraphicToPost(
  postId: string,
  graphicId: string,
  previewUrl?: string
): Promise<ScheduledPost | null> {
  await ensureIndexes();
  const collection = await getCollection();

  const result = await collection.findOneAndUpdate(
    { id: postId },
    {
      $set: {
        graphicId,
        graphicPreviewUrl: previewUrl,
        status: "rendered",
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

/**
 * Mark post as content-ready (knowledge received from Agent App or manual entry).
 */
export async function markContentReady(
  postId: string,
  knowledgeId?: string,
  content?: ScheduledPost["content"]
): Promise<ScheduledPost | null> {
  await ensureIndexes();
  const collection = await getCollection();

  const setFields: Record<string, unknown> = {
    status: "content-ready",
    updatedAt: new Date(),
  };

  if (knowledgeId) {
    setFields.agentKnowledgeId = knowledgeId;
  }

  if (content) {
    setFields.content = content;
  }

  const result = await collection.findOneAndUpdate(
    { id: postId },
    { $set: setFields },
    { returnDocument: "after" }
  );

  return result;
}

/**
 * Get posts ready for rendering (status: content-ready, no graphicId).
 */
export async function getPostsReadyForRender(
  agentId: string
): Promise<ScheduledPost[]> {
  await ensureIndexes();
  const collection = await getCollection();

  return collection
    .find({
      agentId,
      status: "content-ready",
      graphicId: { $exists: false },
    })
    .sort({ scheduledFor: 1 })
    .toArray();
}

/**
 * Get posts grouped by status for pipeline view.
 */
export async function getPostsByStatusGroups(
  agentId: string
): Promise<Record<ScheduledPost["status"], ScheduledPost[]>> {
  await ensureIndexes();
  const collection = await getCollection();

  const posts = await collection
    .find({ agentId })
    .sort({ scheduledFor: 1 })
    .toArray();

  const groups: Record<ScheduledPost["status"], ScheduledPost[]> = {
    proposed: [],
    scheduled: [],
    "content-ready": [],
    rendered: [],
    "in-review": [],
    revision: [],
    approved: [],
    posted: [],
  };

  posts.forEach((post) => {
    groups[post.status].push(post);
  });

  return groups;
}

// ============ Review Workflow Operations ============

/**
 * Get all posts pending client review for a given agent.
 */
export async function getPostsForReview(
  agentId: string
): Promise<ScheduledPost[]> {
  await ensureIndexes();
  const collection = await getCollection();

  return collection
    .find({
      agentId,
      status: { $in: ["proposed", "in-review", "revision"] },
    })
    .sort({ scheduledFor: 1 })
    .toArray();
}

/**
 * Send a rendered graphic for client review.
 */
export async function sendForReview(
  postId: string
): Promise<ScheduledPost | null> {
  await ensureIndexes();
  const collection = await getCollection();

  const result = await collection.findOneAndUpdate(
    { id: postId, status: "rendered" },
    {
      $set: {
        status: "in-review",
        sentForReviewAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

/**
 * Client approves the graphic.
 */
export async function approvePost(
  postId: string
): Promise<ScheduledPost | null> {
  await ensureIndexes();
  const collection = await getCollection();

  const result = await collection.findOneAndUpdate(
    { id: postId, status: { $in: ["in-review", "revision"] } },
    {
      $set: {
        status: "approved",
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

/**
 * Client requests a revision with feedback.
 */
export async function requestRevision(
  postId: string,
  feedback: string
): Promise<ScheduledPost | null> {
  await ensureIndexes();
  const collection = await getCollection();

  const now = new Date();

  const result = await collection.findOneAndUpdate(
    { id: postId, status: { $in: ["in-review", "revision"] } },
    {
      $set: {
        status: "revision",
        clientFeedback: feedback,
        reviewedAt: now,
        updatedAt: now,
      },
      $push: {
        revisionHistory: {
          feedback,
          requestedAt: now,
        },
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

/**
 * Client approves the proposed schedule slot.
 */
export async function approveScheduleSlot(
  postId: string
): Promise<ScheduledPost | null> {
  await ensureIndexes();
  const collection = await getCollection();

  const result = await collection.findOneAndUpdate(
    { id: postId, status: "proposed" },
    {
      $set: {
        status: "scheduled",
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}
