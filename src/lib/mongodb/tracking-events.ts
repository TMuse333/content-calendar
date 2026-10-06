/**
 * Tracking Events Collection
 *
 * Stores page views, clicks, and custom events from client websites
 */

import { Collection, ObjectId } from "mongodb";
import clientPromise from "./clientPromise";
import type { TrackingEvent } from "../types/results";

// Constants
const DB_NAME = "strategy";
const COLLECTION_NAME = "tracking_events";

// Index tracking
let indexesEnsured = false;

/**
 * MongoDB document type (adds _id to TrackingEvent)
 */
interface TrackingEventDocument extends Omit<TrackingEvent, "id"> {
  _id?: ObjectId;
}

/**
 * Get the tracking events collection
 */
async function getCollection(): Promise<Collection<TrackingEventDocument>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<TrackingEventDocument>(COLLECTION_NAME);
}

/**
 * Ensure indexes exist (called once on first use)
 */
export async function ensureTrackingEventIndexes(): Promise<void> {
  if (indexesEnsured) return;

  const collection = await getCollection();

  await Promise.all([
    collection.createIndex({ accountId: 1 }),
    collection.createIndex({ sessionId: 1 }),
    collection.createIndex({ eventType: 1 }),
    collection.createIndex({ timestamp: -1 }),
    collection.createIndex({ accountId: 1, timestamp: -1 }),
    collection.createIndex({ "utm.campaign": 1 }, { sparse: true }),
  ]);

  indexesEnsured = true;
  console.log("[strategy:tracking-events] Indexes ensured");
}

/**
 * Create a tracking event
 */
export async function createTrackingEvent(
  data: Omit<TrackingEvent, "id" | "timestamp" | "processedAt"> & {
    sessionId: string;
    timestamp?: string | Date;
    metadata?: Record<string, unknown>;
  }
): Promise<TrackingEvent> {
  await ensureTrackingEventIndexes();
  const collection = await getCollection();

  const now = new Date();

  const event: TrackingEventDocument = {
    accountId: data.accountId,
    eventType: data.eventType,
    utm: data.utm,
    referrer: data.referrer,
    url: data.url,
    userAgent: data.userAgent,
    metadata: {
      ...data.metadata,
      sessionId: data.sessionId,
    },
    timestamp: data.timestamp ? new Date(data.timestamp) : now,
    processedAt: now,
  };

  const result = await collection.insertOne(event);

  return {
    ...event,
    id: result.insertedId.toString(),
    timestamp: event.timestamp,
    processedAt: event.processedAt,
  };
}

/**
 * Get tracking events by account
 */
export async function getTrackingEventsByAccount(
  accountId: string,
  options?: {
    eventType?: TrackingEvent["eventType"];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    sessionId?: string;
  }
): Promise<TrackingEvent[]> {
  await ensureTrackingEventIndexes();
  const collection = await getCollection();

  const query: Record<string, unknown> = { accountId };

  if (options?.eventType) {
    query.eventType = options.eventType;
  }

  if (options?.sessionId) {
    query["metadata.sessionId"] = options.sessionId;
  }

  if (options?.startDate || options?.endDate) {
    query.timestamp = {};
    if (options.startDate) {
      (query.timestamp as Record<string, Date>).$gte = options.startDate;
    }
    if (options.endDate) {
      (query.timestamp as Record<string, Date>).$lte = options.endDate;
    }
  }

  const cursor = collection
    .find(query)
    .sort({ timestamp: -1 })
    .limit(options?.limit || 100);

  const docs = await cursor.toArray();

  return docs.map((doc) => ({
    id: doc._id!.toString(),
    accountId: doc.accountId,
    eventType: doc.eventType,
    utm: doc.utm,
    referrer: doc.referrer,
    url: doc.url,
    userAgent: doc.userAgent,
    metadata: doc.metadata,
    timestamp: doc.timestamp,
    processedAt: doc.processedAt,
  }));
}

/**
 * Get session events (all events from a session)
 */
export async function getSessionEvents(
  accountId: string,
  sessionId: string
): Promise<TrackingEvent[]> {
  return getTrackingEventsByAccount(accountId, {
    sessionId,
    limit: 1000,
  });
}

/**
 * Count events by type for an account
 */
export async function countEventsByType(
  accountId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Record<string, number>> {
  await ensureTrackingEventIndexes();
  const collection = await getCollection();

  const match: Record<string, unknown> = { accountId };

  if (startDate || endDate) {
    match.timestamp = {};
    if (startDate) (match.timestamp as Record<string, Date>).$gte = startDate;
    if (endDate) (match.timestamp as Record<string, Date>).$lte = endDate;
  }

  const pipeline = [
    { $match: match },
    { $group: { _id: "$eventType", count: { $sum: 1 } } },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  const counts: Record<string, number> = {};
  for (const r of results) {
    counts[r._id as string] = r.count;
  }

  return counts;
}
