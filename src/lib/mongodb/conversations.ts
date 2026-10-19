/**
 * Conversations Collection
 *
 * CRUD operations for chat conversations with visitors.
 */

import { Collection, ObjectId } from "mongodb";
import clientPromise from "./clientPromise";

// Constants
const DB_NAME = "strategy";
const COLLECTION_NAME = "conversations";

// Index tracking
let indexesEnsured = false;

// Types
export type ConversationPhase = "mirror" | "probe" | "label" | "cta" | "captured" | "ended";

export interface Discovery {
  category: "goal" | "current_state" | "pain" | "timeline" | "budget";
  value: string;
  extractedAt: Date;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  citations?: {
    instagramId: string;
    caption?: string;
  }[];
}

export interface Conversation {
  _id?: ObjectId;
  id: string;
  accountId: string;
  sessionId: string;

  // Conversation state
  phase: ConversationPhase;
  topic?: string; // What they clicked/asked about (e.g., "leads", "content")
  messages: ChatMessage[];
  discoveries: Discovery[];

  // Lead capture
  email?: string;
  name?: string;
  phone?: string;
  outcomeId?: string; // Link to Outcome when converted

  // Metadata
  startedAt: Date;
  updatedAt: Date;
  endedAt?: Date;
}

/**
 * Get the conversations collection
 */
async function getCollection(): Promise<Collection<Conversation>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<Conversation>(COLLECTION_NAME);
}

/**
 * Ensure indexes exist
 */
export async function ensureConversationIndexes(): Promise<void> {
  if (indexesEnsured) return;

  const collection = await getCollection();

  await Promise.all([
    collection.createIndex({ id: 1 }, { unique: true }),
    collection.createIndex({ accountId: 1, startedAt: -1 }),
    collection.createIndex({ sessionId: 1 }),
    collection.createIndex({ accountId: 1, phase: 1 }),
    collection.createIndex({ updatedAt: -1 }),
  ]);

  indexesEnsured = true;
  console.log("[strategy:conversations] Indexes ensured");
}

/**
 * Generate conversation ID
 */
function generateConversationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `conv-${timestamp}-${random}`;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  data: Pick<Conversation, "accountId" | "sessionId" | "topic">
): Promise<Conversation> {
  await ensureConversationIndexes();
  const collection = await getCollection();

  const now = new Date();
  const conversation: Conversation = {
    id: generateConversationId(),
    accountId: data.accountId,
    sessionId: data.sessionId,
    phase: "mirror",
    topic: data.topic,
    messages: [],
    discoveries: [],
    startedAt: now,
    updatedAt: now,
  };

  await collection.insertOne(conversation);
  return conversation;
}

/**
 * Get conversation by ID
 */
export async function getConversationById(
  conversationId: string
): Promise<Conversation | null> {
  await ensureConversationIndexes();
  const collection = await getCollection();
  return collection.findOne({ id: conversationId });
}

/**
 * Get conversations for an account
 */
export async function getConversationsByAccount(
  accountId: string,
  options?: {
    phase?: ConversationPhase;
    limit?: number;
  }
): Promise<Conversation[]> {
  await ensureConversationIndexes();
  const collection = await getCollection();

  const query: Record<string, unknown> = { accountId };
  if (options?.phase) {
    query.phase = options.phase;
  }

  return collection
    .find(query)
    .sort({ updatedAt: -1 })
    .limit(options?.limit || 50)
    .toArray();
}

/**
 * Add a message to conversation
 */
export async function addMessage(
  conversationId: string,
  message: Omit<ChatMessage, "timestamp">
): Promise<Conversation | null> {
  const collection = await getCollection();

  const fullMessage: ChatMessage = {
    ...message,
    timestamp: new Date(),
  };

  const result = await collection.findOneAndUpdate(
    { id: conversationId },
    {
      $push: { messages: fullMessage },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );

  return result;
}

/**
 * Update conversation phase
 */
export async function updatePhase(
  conversationId: string,
  phase: ConversationPhase
): Promise<boolean> {
  const collection = await getCollection();

  const updates: Record<string, unknown> = {
    phase,
    updatedAt: new Date(),
  };

  if (phase === "ended" || phase === "captured") {
    updates.endedAt = new Date();
  }

  const result = await collection.updateOne(
    { id: conversationId },
    { $set: updates }
  );

  return result.modifiedCount > 0;
}

/**
 * Add discovery
 */
export async function addDiscovery(
  conversationId: string,
  discovery: Omit<Discovery, "extractedAt">
): Promise<boolean> {
  const collection = await getCollection();

  const fullDiscovery: Discovery = {
    ...discovery,
    extractedAt: new Date(),
  };

  const result = await collection.updateOne(
    { id: conversationId },
    {
      $push: { discoveries: fullDiscovery },
      $set: { updatedAt: new Date() },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Capture lead info
 */
export async function captureLead(
  conversationId: string,
  data: {
    email: string;
    name?: string;
    phone?: string;
    outcomeId?: string;
  }
): Promise<Conversation | null> {
  const collection = await getCollection();

  const result = await collection.findOneAndUpdate(
    { id: conversationId },
    {
      $set: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        outcomeId: data.outcomeId,
        phase: "captured" as ConversationPhase,
        updatedAt: new Date(),
        endedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result;
}

/**
 * Get conversation stats for account
 */
export async function getConversationStats(accountId: string): Promise<{
  total: number;
  captured: number;
  active: number;
}> {
  await ensureConversationIndexes();
  const collection = await getCollection();

  const [total, captured, active] = await Promise.all([
    collection.countDocuments({ accountId }),
    collection.countDocuments({ accountId, phase: "captured" }),
    collection.countDocuments({
      accountId,
      phase: { $nin: ["captured", "ended"] },
      updatedAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }, // Last 30 min
    }),
  ]);

  return { total, captured, active };
}
