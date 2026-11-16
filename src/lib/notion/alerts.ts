/**
 * Failure alerting: cron / write-back failures become ONE @mention comment
 * per incident on the alerts page, which pushes a Notion notification to
 * Thomas's phone. Best effort — alerting itself must never throw or block
 * the caller (an alert about a failure must not cause a second failure).
 *
 * Env:
 *   NOTION_ALERTS_PAGE_ID  — page the comment lands on (default: Waterline)
 *   NOTION_NOTIFY_USER_ID  — who to @mention (no mention → no push, comment only)
 */
import { getNotionClient } from "./client";

const WATERLINE_PAGE_ID = "40f08d8fd60281ddbacdd90132082d29";

const chunk = (s: string) => s.slice(0, 1900);

function mention(): unknown[] {
  const id = process.env.NOTION_NOTIFY_USER_ID;
  return id ? [{ type: "mention", mention: { user: { id } } }, { text: { content: " " } }] : [];
}

/**
 * One comment per incident: "⚠️ <source> — N failure(s)" plus one line each.
 * Returns false (never throws) when Notion is unreachable or misconfigured.
 */
export async function alertFailure(source: string, lines: string[]): Promise<boolean> {
  if (lines.length === 0) return true;
  const pageId = process.env.NOTION_ALERTS_PAGE_ID ?? WATERLINE_PAGE_ID;
  const body = [
    `⚠️ ${source} — ${lines.length} failure${lines.length === 1 ? "" : "s"}:`,
    ...lines.map((l) => `• ${l}`),
  ].join("\n");
  try {
    await getNotionClient().comments.create({
      parent: { page_id: pageId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rich_text: [...mention(), { text: { content: chunk(body) } }] as any,
    });
    return true;
  } catch (err) {
    console.error(`[notion:alert] could not deliver alert for "${source}"`, err);
    return false;
  }
}
