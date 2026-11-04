/**
 * Cron: publish due Notion posts to Instagram.
 *
 * Arming model (chosen with Thomas): a post auto-publishes only when its
 * Notion Status = "Scheduled", its Post date is today or earlier, it has
 * slides, and it has no IG post link yet (idempotent — never double-posts).
 * Approved-but-not-Scheduled posts are left untouched.
 *
 * Wire it in vercel.json:
 *   { "crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "30 23 * * *" }] }
 * Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when
 * CRON_SECRET is set in the project env.
 *
 * Runs the exact publish chain as the manual button (see lib/publish/instagram).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccounts } from "@/lib/mongodb/accounts";
import { getPosts, updatePostStatus } from "@/lib/notion";
import { getNotionClient } from "@/lib/notion/client";
import { publishSlidesToInstagram, type IgTarget } from "@/lib/publish/instagram";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isDue(postDate: string | undefined, todayUtc: string): boolean {
  if (!postDate) return false;
  // Post date is a date-only string (YYYY-MM-DD); publish on/after it.
  return postDate.slice(0, 10) <= todayUtc;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Refuse to run unauthenticated in production — this posts to live accounts.
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  // ?dryRun=1 — list what WOULD publish today without touching Instagram or Notion.
  const dryRun = ["1", "true"].includes(req.nextUrl.searchParams.get("dryRun") ?? "");
  const todayUtc = new Date().toISOString().slice(0, 10);
  const results: Array<{
    accountId: string;
    postId: string;
    title: string;
    published?: boolean;
    permalink?: string;
    error?: string;
  }> = [];

  try {
    const accounts = await getAccounts();

    for (const account of accounts) {
      const ds = account.notion?.postsDataSourceId;
      const instagram = account.platforms?.instagram;
      if (!ds || !instagram?.connected || !instagram.accessToken || !instagram.userId) continue;

      const notionConfig: NotionConfig = {
        postsDataSourceId: ds,
        topicsDataSourceId: account.notion?.topicsDataSourceId || "",
      };

      let scheduled;
      try {
        scheduled = await getPosts(notionConfig, { status: "Scheduled" });
      } catch (e) {
        results.push({
          accountId: account.id,
          postId: "-",
          title: "(listing Scheduled posts)",
          error: e instanceof Error ? e.message : "Notion query failed",
        });
        continue;
      }

      const due = scheduled.filter(
        (p) => isDue(p.postDate, todayUtc) && !p.igPostLink
      );

      const ig: IgTarget = {
        accessToken: instagram.accessToken,
        userId: instagram.userId,
        apiHost: instagram.apiHost,
        username: instagram.username,
      };

      for (const post of due) {
        const slides = post.previewUrls?.length
          ? post.previewUrls
          : post.previewUrl
          ? [post.previewUrl]
          : [];
        if (slides.length === 0) {
          results.push({
            accountId: account.id,
            postId: post.id,
            title: post.title,
            error: "No slides attached in Notion",
          });
          continue;
        }

        if (dryRun) {
          results.push({
            accountId: account.id,
            postId: post.id,
            title: `${post.title} (${slides.length} slides — would publish)`,
            published: false,
          });
          continue;
        }

        try {
          const { permalink } = await publishSlidesToInstagram({
            slides,
            caption: post.caption ?? "",
            ig,
            blobPrefix: `cron/${account.id}/${post.id}`,
          });

          // Notion write-back: Status=Posted + IG link (same as manual button).
          await updatePostStatus(notionConfig, post.id, "Posted");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (getNotionClient().pages as any).update({
            page_id: post.id,
            properties: { "IG post link": { url: permalink } },
          });

          results.push({
            accountId: account.id,
            postId: post.id,
            title: post.title,
            published: true,
            permalink,
          });
          console.log(`[cron:publish] ${account.id} "${post.title}" → ${permalink}`);
        } catch (e) {
          const error = e instanceof Error ? e.message : "Publish failed";
          results.push({ accountId: account.id, postId: post.id, title: post.title, error });
          console.error(`[cron:publish] ${account.id} "${post.title}" failed: ${error}`);
        }
      }
    }

    return NextResponse.json({
      checked: todayUtc,
      published: results.filter((r) => r.published).length,
      failed: results.filter((r) => r.error).length,
      results,
    });
  } catch (error) {
    console.error("[cron:publish] fatal", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 }
    );
  }
}

// Manual trigger (same guard).
export async function POST(req: NextRequest) {
  return GET(req);
}
