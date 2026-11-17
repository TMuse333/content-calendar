/**
 * Debriefs cache collection.
 *
 * A debrief (coverage analysis + video ideas for a story call) costs two Opus
 * calls / ~50s to compute. We cache the result per call so the UI loads it
 * instantly and only recomputes on a cache miss or an explicit re-run.
 *
 * This is the "Mongo mirror behind the same API" the BRIEF anticipated: the
 * API contract is unchanged (POST computes); persistence is the optimization.
 * Keyed by {accountId, callId}. `transcriptHash` records which transcript the
 * result was computed from, so a changed transcript can be detected/invalidated.
 */
import { Collection } from "mongodb";
import { createHash } from "crypto";
import clientPromise from "./clientPromise";
import type { CallAnalysis } from "@/lib/calls/analyze";
import type { VideoIdea } from "@/lib/calls/ideas";

const DB_NAME = "strategy";
const COLLECTION_NAME = "debriefs";

export interface DebriefDoc {
  accountId: string;
  callId: string;
  transcriptHash: string;
  analysis: CallAnalysis;
  ideas: VideoIdea[];
  model: string;
  createdAt: Date;
}

let indexesEnsured = false;

async function getCollection(): Promise<Collection<DebriefDoc>> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const col = db.collection<DebriefDoc>(COLLECTION_NAME);
  if (!indexesEnsured) {
    await col.createIndex({ accountId: 1, callId: 1 }, { unique: true });
    indexesEnsured = true;
  }
  return col;
}

/** sha256 of the transcript used — lets us tell if a cached debrief is stale. */
export function hashTranscript(transcript: string): string {
  return createHash("sha256").update(transcript).digest("hex");
}

/** Full cached debrief for one call, or null on miss. */
export async function getDebrief(
  accountId: string,
  callId: string
): Promise<DebriefDoc | null> {
  const col = await getCollection();
  return col.findOne({ accountId, callId });
}

/** Lightweight list — which calls already have a debrief (for the nav list). */
export async function listDebriefs(
  accountId: string
): Promise<{ callId: string; createdAt: Date }[]> {
  const col = await getCollection();
  const docs = await col
    .find({ accountId }, { projection: { callId: 1, createdAt: 1, _id: 0 } })
    .toArray();
  return docs.map((d) => ({ callId: d.callId, createdAt: d.createdAt }));
}

/** Upsert the computed debrief for a call. */
export async function saveDebrief(
  doc: Omit<DebriefDoc, "createdAt">
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { accountId: doc.accountId, callId: doc.callId },
    { $set: { ...doc, createdAt: new Date() } },
    { upsert: true }
  );
}
