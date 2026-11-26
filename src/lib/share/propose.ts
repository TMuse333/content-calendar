/**
 * Propose a content set to a client: one share link + ONE content.proposed
 * notification (the series email), delivered via notify — not a manual text.
 *
 * This is the permanent "propose" step for content sets (CMD-01, Nov 22).
 * Rules it enforces:
 *   - one notification per SERIES (never one per post)
 *   - idempotencyKey = share code, so a re-run can't double-email
 *   - dryRun routes the email to the operator (accountId "syntellic"),
 *     with the real client link in the body, for eyeballing before GO
 *   - link is ALWAYS the custom domain (vercel.app is SSO-walled)
 */
import { buildShareLink, type ShareLink } from "@/lib/share/links";
import { insertShareLink, getShareLinkByCode } from "@/lib/mongodb/share-links";
import { sendNotification, type NotifyResult } from "@/lib/notify";

export const SHARE_BASE = "https://strategy.syntellic.ai";

export interface ProposeInput {
  accountId: string;
  /** Posts in the series. Ignored when shareCode reuses an existing link. */
  postIds?: string[];
  /** Series name, shown in the email ("From-away series"). */
  title: string;
  /** "carousels" | "reels" | … */
  kind?: string;
  /** Note at the top of the share page. */
  message?: string;
  expiresInDays?: number;
  /** Reuse an existing link (e.g. real send after a dry run) instead of minting. */
  shareCode?: string;
  /** Series traces to a call → lineage. */
  callId?: string;
  /** true → email goes to the operator (accountId "syntellic"), not the client. */
  dryRun?: boolean;
}

export interface ProposeResult {
  url: string;
  code: string;
  expiresAt: Date;
  count: number;
  dryRun: boolean;
  notify: NotifyResult;
}

export async function proposeContentSet(input: ProposeInput): Promise<ProposeResult | { error: string }> {
  let link: ShareLink;
  if (input.shareCode) {
    const existing = await getShareLinkByCode(input.shareCode);
    if (!existing) return { error: `Share link "${input.shareCode}" not found` };
    if (existing.accountId !== input.accountId) return { error: "Share link belongs to a different account" };
    link = existing;
  } else {
    const built = buildShareLink({
      accountId: input.accountId,
      postIds: input.postIds ?? [],
      questionSet: null,
      message: input.message,
      expiresInDays: input.expiresInDays,
    });
    if ("error" in built) return built;
    await insertShareLink(built);
    link = built;
  }

  const url = `${SHARE_BASE}/s/${link.code}`;
  const dryRun = !!input.dryRun;
  const notify = await sendNotification({
    accountId: dryRun ? "syntellic" : input.accountId,
    event: "content.proposed",
    visibility: "client",
    data: {
      count: link.postIds.length,
      kind: input.kind ?? "carousels",
      title: input.title,
      link: url,
    },
    ...(input.callId ? { lineage: { callId: input.callId } } : {}),
    // Real sends dedupe on the share code (one email per series, ever).
    // Dry runs are operator-only previews — always deliverable, unique key.
    idempotencyKey: dryRun ? `${link.code}:dry:${Date.now()}` : link.code,
  });

  return { url, code: link.code, expiresAt: link.expiresAt, count: link.postIds.length, dryRun, notify };
}
