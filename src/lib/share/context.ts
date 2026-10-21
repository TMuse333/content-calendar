/**
 * Resolve a share code into everything a request needs (account, Notion
 * config, the link). Returns null for unknown / expired / revoked links.
 */
import { getAccountById } from "@/lib/mongodb/accounts";
import { getShareLinkByCode } from "@/lib/mongodb/share-links";
import { isShareLinkActive, type ShareLink } from "./links";
import type { NotionConfig } from "@/lib/notion/types";

export async function resolveShare(code: string) {
  const link = await getShareLinkByCode(code);
  if (!isShareLinkActive(link)) return null;
  const account = await getAccountById((link as ShareLink).accountId);
  if (!account) return null;
  const config: NotionConfig | null = account.notion?.postsDataSourceId
    ? {
        postsDataSourceId: account.notion.postsDataSourceId,
        topicsDataSourceId: account.notion.topicsDataSourceId || "",
        feedbackDataSourceId: account.notion.feedbackDataSourceId,
      }
    : null;
  return { link: link as ShareLink, account, config };
}
