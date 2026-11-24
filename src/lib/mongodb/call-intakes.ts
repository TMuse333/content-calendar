/**
 * Call-intake ledger — one doc per ingested transcript (keyed by sha256).
 * Makes POST /calls/intake idempotent: the same transcript can land twice
 * (retry, double drop, future Zoom webhook refire) and still produce exactly
 * one Call row + one debrief chain.
 */
import type { Collection } from "mongodb";
import clientPromise from "./clientPromise";

export interface CallIntake {
  accountId: string;
  transcriptHash: string;
  callId: string;
  callUrl?: string;
  name: string;
  createdAt: Date;
}

let indexesEnsured = false;

async function col(): Promise<Collection<CallIntake>> {
  const client = await clientPromise;
  const c = client.db("strategy").collection<CallIntake>("call_intakes");
  if (!indexesEnsured) {
    await c.createIndex({ accountId: 1, transcriptHash: 1 }, { unique: true });
    indexesEnsured = true;
  }
  return c;
}

export async function getCallIntake(accountId: string, transcriptHash: string): Promise<CallIntake | null> {
  return (await col()).findOne({ accountId, transcriptHash }, { projection: { _id: 0 } });
}

export async function insertCallIntake(doc: CallIntake): Promise<void> {
  await (await col()).insertOne(doc);
}
