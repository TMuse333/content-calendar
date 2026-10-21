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
