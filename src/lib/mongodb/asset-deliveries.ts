/**
 * Render deliveries from video-system → strategy. One doc per renderId.
 *
 * This ledger is what makes the delivered-but-not-ingested gap visible:
 * video-system emits asset.delivered when it POSTs, we emit asset.ingested
 * only after the doc + Notion binding exist. Re-POSTs of the same renderId
 * are idempotent (the first binding wins).
 */
import clientPromise from "./clientPromise";

export interface AssetDelivery {
  renderId: string;
  accountId: string;
  blobUrl: string;
  format?: string;
  durationSec?: number;
  quality?: string;
  reviewStatus?: string;
  approvedAt?: string;
  lineage: { projectId?: string; callId?: string; postId?: string };
  /** The Notion Posts row this render was bound to (attached or staged). */
  boundPostId: string;
  stagedNewPost: boolean;
  ingestedAt: Date;
}

async function col() {
  const client = await clientPromise;
  return client.db("strategy").collection<AssetDelivery>("asset_deliveries");
}

export async function getAssetDelivery(renderId: string): Promise<AssetDelivery | null> {
  return (await col()).findOne({ renderId }, { projection: { _id: 0 } });
}

export async function insertAssetDelivery(doc: AssetDelivery): Promise<void> {
  await (await col()).insertOne(doc);
}

export async function listAssetDeliveries(accountId: string): Promise<AssetDelivery[]> {
  return (await col())
    .find({ accountId }, { projection: { _id: 0 } })
    .sort({ ingestedAt: -1 })
    .limit(100)
    .toArray();
}
