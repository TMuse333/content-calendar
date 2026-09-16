/**
 * Notes Collection
 *
 * CRUD operations for Strategy Notes.
 */

import { Collection, ObjectId } from "mongodb";
import clientPromise from "./clientPromise";
import type { StrategyNote } from "../types/post";

const DB_NAME = "strategy";
const COLLECTION_NAME = "notes";

/**
 * Get the notes collection
 */
async function getCollection(): Promise<Collection<StrategyNote>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection<StrategyNote>(COLLECTION_NAME);
}

/**
 * Create a new note
 */
export async function createNote(
  note: Omit<StrategyNote, "_id" | "createdAt" | "updatedAt">
): Promise<string> {
  const collection = await getCollection();
  const now = new Date();

  const result = await collection.insertOne({
    ...note,
    createdAt: now,
    updatedAt: now,
  } as StrategyNote);

  return result.insertedId.toString();
}

/**
 * Get all notes for an account
 */
export async function getNotes(
  accountId: string,
  limit: number = 50
): Promise<StrategyNote[]> {
  const collection = await getCollection();

  return collection
    .find({ accountId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Get a note by ID
 */
export async function getNoteById(noteId: string): Promise<StrategyNote | null> {
  const collection = await getCollection();
  return collection.findOne({ _id: new ObjectId(noteId) });
}

/**
 * Update a note
 */
export async function updateNote(
  noteId: string,
  updates: Partial<Pick<StrategyNote, "content" | "type" | "linkedInsightId" | "linkedPostId">>
): Promise<boolean> {
  const collection = await getCollection();

  const result = await collection.updateOne(
    { _id: new ObjectId(noteId) },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: string): Promise<boolean> {
  const collection = await getCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(noteId) });
  return result.deletedCount > 0;
}

/**
 * Get notes linked to a specific insight
 */
export async function getNotesByInsight(
  accountId: string,
  insightId: string
): Promise<StrategyNote[]> {
  const collection = await getCollection();

  return collection
    .find({ accountId, linkedInsightId: insightId })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Get notes linked to a specific post
 */
export async function getNotesByPost(
  accountId: string,
  postId: string
): Promise<StrategyNote[]> {
  const collection = await getCollection();

  return collection
    .find({ accountId, linkedPostId: postId })
    .sort({ createdAt: -1 })
    .toArray();
}
