import clientPromise from "./clientPromise";
import type { ShareLink } from "@/lib/share/links";
import type { QuestionSetId } from "@/lib/questions/sets";

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

/**
 * Change which question set a live link asks, without issuing a new code.
 * The URL the client already has keeps working, and their reactions
 * (share_reactions, keyed by code + postId) and in-browser resume position
 * (localStorage, keyed by code) are both untouched.
 */
export async function setShareLinkQuestionSet(
  accountId: string,
  code: string,
  questionSet: QuestionSetId | null
): Promise<boolean> {
  const r = await (await db())
    .collection<ShareLink>("share_links")
    .updateOne({ accountId, code }, { $set: { questionSet } });
  return r.matchedCount > 0;
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

export interface ShareReaction {
  code: string;
  accountId: string;
  postId: string;
  reaction: string;
  comment?: string;
  createdAt: Date;
}

/** All reactions for an account, newest first (admin view of client feedback). */
export async function listShareReactions(accountId: string, limit = 200): Promise<ShareReaction[]> {
  return (await db())
    .collection<ShareReaction>("share_reactions")
    .find({ accountId }, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
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
