/**
 * Client recaps — the generate → approve/edit → send lifecycle for a call's
 * client-facing takeaways page.
 *
 *   draft    — auto-generated when a debrief finishes; operator hasn't acted
 *   approved — operator reviewed/edited and okayed it; a public link is live
 *   sent     — emailed to the client
 *
 * `data` is the generated content; `edits` are operator overrides layered on top
 * (so a re-generate never clobbers hand edits). `effectiveRecap()` merges them.
 * `token` backs the public /r/<token> link that gets emailed.
 */
import { Collection } from "mongodb";
import { randomBytes } from "crypto";
import clientPromise from "./clientPromise";
import type { RecapData } from "@/lib/calls/recap";

const DB_NAME = "strategy";
const COLLECTION_NAME = "recaps";

export type RecapStatus = "draft" | "approved" | "sent";

export interface RecapDoc {
  accountId: string;
  callId: string;
  token: string;
  status: RecapStatus;
  data: RecapData;
  edits?: Partial<RecapData>;
  sentTo?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  sentAt?: Date;
}

let indexesEnsured = false;
async function getCollection(): Promise<Collection<RecapDoc>> {
  const client = await clientPromise;
  const col = client.db(DB_NAME).collection<RecapDoc>(COLLECTION_NAME);
  if (!indexesEnsured) {
    await col.createIndex({ accountId: 1, callId: 1 }, { unique: true });
    await col.createIndex({ token: 1 }, { unique: true });
    indexesEnsured = true;
  }
  return col;
}

/** The content the client sees: generated data with operator edits layered on. */
export function effectiveRecap(doc: RecapDoc): RecapData {
  return { ...doc.data, ...(doc.edits ?? {}) };
}

export async function getRecap(accountId: string, callId: string): Promise<RecapDoc | null> {
  return (await getCollection()).findOne({ accountId, callId });
}

export async function getRecapByToken(token: string): Promise<RecapDoc | null> {
  return (await getCollection()).findOne({ token });
}

export async function listRecaps(accountId: string): Promise<RecapDoc[]> {
  return (await getCollection()).find({ accountId }).sort({ updatedAt: -1 }).toArray();
}

/**
 * Generate step: store/refresh the draft content for a call. Never touches an
 * already approved/sent recap (operator work is sacred) — it only (re)writes the
 * `data` of a draft, or creates a new draft with a fresh public token.
 */
export async function upsertDraft(accountId: string, callId: string, data: RecapData): Promise<void> {
  const col = await getCollection();
  const existing = await col.findOne({ accountId, callId });
  if (existing && existing.status !== "draft") return; // don't clobber approved/sent
  const now = new Date();
  if (existing) {
    await col.updateOne({ accountId, callId }, { $set: { data, updatedAt: now } });
  } else {
    await col.insertOne({
      accountId,
      callId,
      token: randomBytes(9).toString("base64url"),
      status: "draft",
      data,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function saveEdits(accountId: string, callId: string, edits: Partial<RecapData>): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ accountId, callId }, { $set: { edits, updatedAt: new Date() } });
}

export async function approveRecap(accountId: string, callId: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { accountId, callId },
    { $set: { status: "approved", approvedAt: new Date(), updatedAt: new Date() } }
  );
}

export async function markSent(accountId: string, callId: string, sentTo: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { accountId, callId },
    { $set: { status: "sent", sentTo, sentAt: new Date(), updatedAt: new Date() } }
  );
}
