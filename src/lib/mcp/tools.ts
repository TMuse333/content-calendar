/**
 * MCP v0 — read-only tools for the strategy app.
 *
 * Surface for Claude on web/phone: "how are Greg's posts doing?",
 * "what's uncovered on the tree?", "what's coming up?".
 *
 * Hard rules for this file:
 *   - READ ONLY. No tool here writes to Notion, Mongo, Drive, or Instagram.
 *   - No publishing surface: nothing can arm, schedule, or publish a post.
 *   - No credentials in any output: access tokens, recording URLs, and other
 *     secret-shaped fields are stripped before returning.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { getAccounts, getAccountById } from "@/lib/mongodb/accounts";
import { getPosts as getIgPosts, getPostStats } from "@/lib/mongodb/posts";
import { getPosts as getNotionPosts } from "@/lib/notion";
import { getTree, markPrimaryNiche } from "@/lib/notion/tree";
import { getCalls } from "@/lib/notion/calls";
import type { NotionConfig } from "@/lib/notion/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAccount = any;

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

/** Account + its Notion config, or a thrown error naming what's missing. */
async function requireAccount(accountId: string): Promise<{ account: AnyAccount; notion: NotionConfig }> {
  const account = (await getAccountById(accountId)) as AnyAccount;
  if (!account) throw new Error(`Account "${accountId}" not found — use list_accounts for valid ids`);
  const notion = account.notion as NotionConfig | undefined;
  if (!notion?.postsDataSourceId && !notion?.treeDataSourceId) {
    throw new Error(`Account "${accountId}" has no Notion config`);
  }
  return { account, notion: notion as NotionConfig };
}

const accountIdArg = z
  .string()
  .describe('Account slug id, e.g. "greg-caseley" (NOT a Mongo _id). See list_accounts.');

export function registerReadTools(server: McpServer) {
  server.registerTool(
    "list_accounts",
    {
      title: "List accounts",
      description:
        "All client accounts: id (slug), name, primary niche, and which platforms are connected. Tokens are never included.",
      inputSchema: z.object({}),
    },
    async () => {
      const accounts = (await getAccounts()) as AnyAccount[];
      return json(
        accounts.map((a) => ({
          id: a.id,
          name: a.name,
          primaryNiche: a.primaryNiche,
          instagram: a.platforms?.instagram?.connected
            ? { connected: true, username: a.platforms.instagram.username }
            : { connected: false },
        }))
      );
    }
  );

  server.registerTool(
    "get_post_metrics",
    {
      title: "Get post metrics",
      description:
        "Published Instagram posts with metrics (reach, likes, comments, saves…) from the nightly sync, most recent first, plus account-level counts. Use this for \"how are the posts doing?\".",
      inputSchema: z.object({
        accountId: accountIdArg,
        limit: z.number().int().min(1).max(100).default(25).describe("Max posts to return"),
      }),
    },
    async ({ accountId, limit }) => {
      try {
        const [posts, stats] = await Promise.all([
          getIgPosts(accountId, { limit }),
          getPostStats(accountId),
        ]);
        return json({
          stats,
          posts: posts.map((p) => ({
            instagramId: p.instagramId,
            postedAt: p.postedAt,
            mediaType: p.mediaType,
            caption: p.caption?.slice(0, 160),
            permalink: p.permalink,
            metrics: p.metrics,
            niche: p.niche,
            contentType: p.classification?.contentType,
          })),
        });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Failed to read post metrics");
      }
    }
  );

  server.registerTool(
    "get_tree",
    {
      title: "Get situation tree",
      description:
        "The client's situation tree from Notion: every node with level, status (Untested/Testing/Working/Dropped), parent/child links, evidence counts, and the primary-niche flag. The tree is a forest — multiple roots. Use this for \"what's covered / what's still silent?\".",
      inputSchema: z.object({ accountId: accountIdArg }),
    },
    async ({ accountId }) => {
      try {
        const { account, notion } = await requireAccount(accountId);
        const nodes = markPrimaryNiche(await getTree(notion), account.primaryNiche);
        return json({
          count: nodes.length,
          primaryNiche: account.primaryNiche,
          nodes: nodes.map((n) => ({
            ...n,
            // counts read better in chat than bare relation-id arrays
            storyIds: undefined,
            postIds: undefined,
            callIds: undefined,
            askIds: undefined,
            changeIds: undefined,
            evidence: {
              stories: n.storyIds.length,
              posts: n.postIds.length,
              calls: n.callIds.length,
              asks: n.askIds.length,
            },
          })),
        });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Failed to read tree");
      }
    }
  );

  server.registerTool(
    "get_calls",
    {
      title: "Get call log",
      description:
        "Story/review calls from Notion: date, type, follow-ups and whether they're done, and how many tree nodes each call touched. Recording URLs and transcripts are never included.",
      inputSchema: z.object({ accountId: accountIdArg }),
    },
    async ({ accountId }) => {
      try {
        const { notion } = await requireAccount(accountId);
        const calls = await getCalls(notion);
        return json(
          calls.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            date: c.date,
            nextCall: c.nextCall,
            followUps: c.followUps,
            followUpsDone: c.followUpsDone,
            nodesTouched: c.nodesTouchedIds.length,
            stories: c.storyIds.length,
          }))
        );
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Failed to read calls");
      }
    }
  );

  server.registerTool(
    "get_upcoming",
    {
      title: "Get upcoming posts",
      description:
        "Content pipeline from Notion: posts that are Approved, Scheduled, or in review, with post dates and slide counts. Visibility only — nothing here can schedule or publish.",
      inputSchema: z.object({ accountId: accountIdArg }),
    },
    async ({ accountId }) => {
      try {
        const { notion } = await requireAccount(accountId);
        const posts = await getNotionPosts(notion);
        const active = posts.filter((p) => p.status !== "Archived" && p.status !== "Posted");
        return json(
          active.map((p) => ({
            id: p.id,
            title: p.title,
            status: p.status,
            postDate: p.postDate,
            slides: p.previewUrls?.length ?? (p.previewUrl ? 1 : 0),
            hasCaption: Boolean(p.caption),
          }))
        );
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Failed to read upcoming posts");
      }
    }
  );
}
