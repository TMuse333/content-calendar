/**
 * MCP publish tools — the ONLY MCP surface that can post to Instagram.
 *
 * Served from a separate endpoint (/api/mcp-publish/<PUBLISH_SECRET>) so the
 * read-only connector's URL can never post. Lets Thomas say "post the $550k
 * one" from his phone and have it live in ~a minute.
 *
 * Hard rules for this file:
 *   - Publishes exactly ONE post per call, and only with confirm: true.
 *   - Only Approved/Scheduled posts with slides and no IG link (never double-posts).
 *   - No scheduling, editing, or deleting of anything.
 *   - No credentials in any output.
 *   - Same publish chain as the manual button and the cron (lib/publish/instagram).
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPosts, getPostById, updatePostStatus } from "@/lib/notion";
import { getNotionClient } from "@/lib/notion/client";
import { publishSlidesToInstagram, type IgTarget } from "@/lib/publish/instagram";
import { sendNotification } from "@/lib/notify";
import type { NotionConfig } from "@/lib/notion/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAccount = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPost = any;

const PUBLISHABLE_STATUSES = ["Approved", "Scheduled"];

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function slidesOf(post: AnyPost): string[] {
  return post?.previewUrls?.length ? post.previewUrls : post?.previewUrl ? [post.previewUrl] : [];
}

/** Every reason this post can't be published right now (empty = good to go). */
export function publishBlockers(post: AnyPost): string[] {
  const problems: string[] = [];
  if (post.igPostLink) problems.push(`Already posted: ${post.igPostLink}`);
  if (!PUBLISHABLE_STATUSES.includes(post.status)) {
    problems.push(`Status is "${post.status}" — must be Approved or Scheduled`);
  }
  const n = slidesOf(post).length;
  if (n === 0) problems.push("No slides attached in Notion");
  if (n > 10) problems.push(`${n} slides — Instagram carousels max out at 10`);
  if (!post.caption?.trim()) problems.push("No caption");
  return problems;
}

async function loadTarget(accountId: string): Promise<{ notion: NotionConfig; ig: IgTarget }> {
  const account = (await getAccountById(accountId)) as AnyAccount;
  if (!account) throw new Error(`Account "${accountId}" not found — use list_accounts for valid ids`);
  if (!account.notion?.postsDataSourceId) throw new Error(`Account "${accountId}" has no Notion config`);
  const instagram = account.platforms?.instagram;
  if (!instagram?.connected || !instagram.accessToken || !instagram.userId) {
    throw new Error(`Instagram is not connected on "${accountId}"`);
  }
  return {
    notion: {
      postsDataSourceId: account.notion.postsDataSourceId,
      topicsDataSourceId: account.notion.topicsDataSourceId || "",
    },
    ig: {
      accessToken: instagram.accessToken,
      userId: instagram.userId,
      apiHost: instagram.apiHost,
      username: instagram.username,
    },
  };
}

const accountIdArg = z
  .string()
  .describe('Account slug id, e.g. "greg-caseley" (NOT a Mongo _id).');
const postIdArg = z.string().describe("Notion post page id (from list_publishable or get_upcoming).");

export function registerPublishTools(server: McpServer) {
  server.registerTool(
    "list_publishable",
    {
      title: "List publishable posts",
      description:
        "Approved or Scheduled posts for an account that have slides and haven't been posted yet — the ones publish_post can put live now. Read-only.",
      inputSchema: z.object({ accountId: accountIdArg }),
    },
    async ({ accountId }) => {
      try {
        const { notion, ig } = await loadTarget(accountId);
        const posts = (await getPosts(notion)) as AnyPost[];
        return json({
          instagram: ig.username,
          posts: posts
            .filter((p) => PUBLISHABLE_STATUSES.includes(p.status) && !p.igPostLink)
            .map((p) => ({
              id: p.id,
              title: p.title,
              status: p.status,
              postDate: p.postDate,
              slides: slidesOf(p).length,
              blockers: publishBlockers(p),
            })),
        });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Failed to list posts");
      }
    }
  );

  server.registerTool(
    "preview_post",
    {
      title: "Preview a post before publishing",
      description:
        "Shows exactly what publish_post would put live: target Instagram account, full caption, slide count and slide image links, plus any blockers. Read-only. ALWAYS call this and show the result to the user before publish_post.",
      inputSchema: z.object({ accountId: accountIdArg, postId: postIdArg }),
    },
    async ({ accountId, postId }) => {
      try {
        const { notion, ig } = await loadTarget(accountId);
        const post = await getPostById(notion, postId);
        if (!post) return fail("Post not found in Notion");
        const blockers = publishBlockers(post);
        return json({
          title: post.title,
          status: post.status,
          instagram: ig.username,
          caption: post.caption ?? "",
          slides: slidesOf(post), // Notion signed URLs — expire after a few minutes
          ready: blockers.length === 0,
          blockers,
        });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Failed to preview post");
      }
    }
  );

  server.registerTool(
    "publish_post",
    {
      title: "Publish a post to Instagram NOW",
      description:
        "Publishes ONE Approved/Scheduled carousel to the account's live Instagram immediately, then marks it Posted in Notion with the IG link. Irreversible from here. Only call after preview_post was shown AND the user explicitly said to post this specific post in this conversation. Never retry automatically on error — check list_publishable first, it may already be live.",
      inputSchema: z.object({
        accountId: accountIdArg,
        postId: postIdArg,
        confirm: z.literal(true).describe("Must be true — the user explicitly approved posting this post now."),
      }),
    },
    async ({ accountId, postId, confirm }) => {
      if (confirm !== true) return fail("Refused: confirm must be true");
      let target: { notion: NotionConfig; ig: IgTarget };
      let post: AnyPost;
      try {
        target = await loadTarget(accountId);
        // Fresh read right before posting: current status + fresh signed slide URLs.
        post = await getPostById(target.notion, postId);
        if (!post) return fail("Post not found in Notion");
        const blockers = publishBlockers(post);
        if (blockers.length) return fail(`Not published: ${blockers.join("; ")}`);
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Publish check failed");
      }

      let permalink: string;
      let mediaId: string;
      try {
        ({ permalink, mediaId } = await publishSlidesToInstagram({
          slides: slidesOf(post),
          caption: post.caption ?? "",
          ig: target.ig,
          blobPrefix: `mcp/${accountId}/${postId}`,
        }));
      } catch (err) {
        const error = err instanceof Error ? err.message : "unknown error";
        await sendNotification({
          accountId,
          event: "post.publish_failed",
          data: { title: post.title, postId, error, via: "mcp" },
        });
        return fail(
          `Instagram publish failed: ${error}. Do not retry blindly — check the account first.`
        );
      }

      // It's live. A Notion write-back failure must NOT read as a failed publish
      // (that would invite a retry = double post).
      let notionUpdated = true;
      let warning: string | undefined;
      try {
        await updatePostStatus(target.notion, postId, "Posted");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (getNotionClient().pages as any).update({
          page_id: postId,
          properties: { "IG post link": { url: permalink } },
        });
      } catch (err) {
        notionUpdated = false;
        warning = `Posted, but Notion write-back failed (${err instanceof Error ? err.message : "error"}). Set Status=Posted and the IG link by hand so the cron never re-posts it.`;
      }

      await sendNotification({
        accountId,
        event: "post.published",
        data: { title: post.title, permalink, kind: "carousel", postId, via: "mcp" },
      });

      return json({ published: true, title: post.title, permalink, mediaId, notionUpdated, ...(warning ? { warning } : {}) });
    }
  );
}
