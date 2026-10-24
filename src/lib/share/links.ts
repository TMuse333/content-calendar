/**
 * Share links: one private link that bundles selected posts (to preview and
 * react to) and an optional question set, for a single client.
 *
 * Link = /s/<code>. The code is random (128 bits) so links can't be guessed,
 * unlike the account-slug client view. Links expire (default 30 days) and can
 * be revoked.
 */
import { randomBytes } from "crypto";
import { isQuestionSetId, type QuestionSetId } from "@/lib/questions/sets";

export interface ShareLink {
  code: string;
  accountId: string;
  postIds: string[];
  questionSet: QuestionSetId | null;
  message?: string;
  createdAt: Date;
  expiresAt: Date;
  revoked?: boolean;
  /** Open tracking (client page loads; admin previews excluded). */
  openCount?: number;
  firstOpenedAt?: Date;
  lastOpenedAt?: Date;
}

export function newShareCode(): string {
  return randomBytes(16).toString("base64url");
}

export interface CreateInput {
  accountId: string;
  postIds: unknown;
  questionSet: unknown;
  message?: unknown;
  expiresInDays?: unknown;
}

export function buildShareLink(input: CreateInput, now = new Date()): ShareLink | { error: string } {
  const postIds = Array.isArray(input.postIds)
    ? [...new Set(input.postIds.filter((p): p is string => typeof p === "string" && p.length > 0))].slice(0, 20)
    : [];
  const questionSet = isQuestionSetId(input.questionSet) ? input.questionSet : null;
  if (postIds.length === 0 && !questionSet) {
    return { error: "Pick at least one post or a question set." };
  }
  const days = typeof input.expiresInDays === "number" && input.expiresInDays > 0 ? Math.min(input.expiresInDays, 90) : 30;
  const message = typeof input.message === "string" && input.message.trim() ? input.message.trim().slice(0, 500) : undefined;
  return {
    code: newShareCode(),
    accountId: input.accountId,
    postIds,
    questionSet,
    message,
    createdAt: now,
    expiresAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
  };
}

export function isShareLinkActive(link: Pick<ShareLink, "expiresAt" | "revoked"> | null, now = new Date()): boolean {
  if (!link || link.revoked) return false;
  return new Date(link.expiresAt).getTime() > now.getTime();
}

export type Reaction = "looks-good" | "change";

export function reactionComment(clientName: string, reaction: Reaction, comment?: string): string {
  const who = clientName.split(" ")[0] || "Client";
  if (reaction === "looks-good") {
    return `${who} (share link): 👍 Looks good${comment ? ` — ${comment}` : ""}`;
  }
  return `${who} (share link): ✏️ Change requested — ${comment || "(no details)"}`;
}
