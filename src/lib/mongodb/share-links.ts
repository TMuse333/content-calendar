import clientPromise from "./clientPromise";
import type { ShareLink } from "@/lib/share/links";

async function db() {
  const client = await clientPromise;
  return client.db("strategy");
}

export async function insertShareLink(link: ShareLink) {
  await (await db()).collection<ShareLink>("share_links").insertOne(link);
}

export async function getShareLinkByCode(code: string): Promise<ShareLink | null> {
  if (!code || code.length > 64) return null;
  return (await db()).collection<ShareLink>("share_links").findOne({ code }, { projection: { _id: 0 } });
}

export async function listShareLinks(accountId: string): Promise<ShareLink[]> {
  return (await db())
    .collection<ShareLink>("share_links")
    .find({ accountId }, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
}

export async function revokeShareLink(accountId: string, code: string) {
  await (await db()).collection<ShareLink>("share_links").updateOne({ accountId, code }, { $set: { revoked: true } });
}

/**
 * Count one open of a share link. Returns true if this was the first open
 * (so the caller can notify Thomas once, not on every reload).
 */
export async function recordShareOpen(code: string, now = new Date()): Promise<boolean> {
  const before = await (await db())
    .collection<ShareLink>("share_links")
    .findOneAndUpdate(
      { code },
      { $inc: { openCount: 1 }, $set: { lastOpenedAt: now }, $min: { firstOpenedAt: now } },
      { returnDocument: "before", projection: { openCount: 1 } }
    );
  return !!before && !before.openCount;
}

export async function saveShareReaction(doc: {
  code: string;
  accountId: string;
  postId: string;
  reaction: string;
  comment?: string;
}) {
  await (await db()).collection("share_reactions").insertOne({ ...doc, createdAt: new Date() });
}

export async function saveClientAnswers(doc: {
  accountId: string;
  setId: string;
  answers: Record<string, string>;
  shareCode?: string;
  notionPageId?: string | null;
}) {
  await (await db()).collection("client_answers").insertOne({ ...doc, createdAt: new Date(), usedInPosts: false });
}
