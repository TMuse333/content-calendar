/**
 * Waterline situation tree — live Notion reader.
 *
 * A client's tree is a faceted taxonomy: situations (nodes) a prospect could be
 * uncertain about, seeded from the general Seed Tree, then carved by story calls
 * and nudged by post performance. This reads the per-client "Tree" database.
 *
 * No Notion→Mongo sync: live reads + a short-TTL discovery cache, the same shape
 * as getPosts / findAnswersDataSource.
 *
 * Resolving the Tree data source:
 *   1. explicit `config.treeDataSourceId` override, else
 *   2. discover the child database whose title ends in "Tree" (e.g. "Greg's Tree")
 *      on the account's Notion page — the same walk as findAnswersDataSource,
 *      excluding the sibling "Tree changes" log.
 */
import { getNotionClient } from "./client";
import type { NotionConfig } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export type NodeStatus = "Untested" | "Testing" | "Working" | "Dropped";

/** One node on the client's tree. Mirrors the Notion "Tree" schema 1:1. */
export interface TreeNode {
  id: string;
  name: string;
  level: string;              // "Structure" | "Situation" | "Sub-branch" (string; may be renamed)
  status?: NodeStatus;        // Structure nodes have none
  parentId?: string;
  childIds: string[];
  fromSeedId?: string;        // provenance → the Seed Tree node this was cloned from
  storyIds: string[];
  postIds: string[];
  callIds: string[];
  askIds: string[];
  changeIds: string[];        // → Tree-changes rows
  why?: string;
  notes?: string;
}

const TTL_MS = 10 * 60 * 1000;
const discovered = new Map<string, { id: string | null; at: number }>();

function stripId(id: string): string {
  return id.replace("collection://", "");
}

// ---- property extractors (parse Notion property values) ----
function extractTitle(prop: unknown): string {
  const p = prop as { title?: Array<{ plain_text?: string }> } | undefined;
  return p?.title?.[0]?.plain_text ?? "";
}
function extractRichText(prop: unknown): string | undefined {
  const p = prop as { rich_text?: Array<{ plain_text?: string }> } | undefined;
  return p?.rich_text?.map((t) => t.plain_text ?? "").join("") || undefined;
}
function extractSelect(prop: unknown): string {
  const p = prop as { select?: { name?: string } } | undefined;
  return p?.select?.name ?? "";
}
function extractStatus(prop: unknown): NodeStatus | undefined {
  const p = prop as { status?: { name?: string }; select?: { name?: string } } | undefined;
  const name = p?.status?.name ?? p?.select?.name;
  return (name as NodeStatus) || undefined;
}
function extractRelationIds(prop: unknown): string[] {
  const p = prop as { relation?: Array<{ id: string }> } | undefined;
  return p?.relation?.map((r) => r.id) ?? [];
}

/**
 * Resolve the client's Tree data source id. Override first, then discover by
 * title ("…Tree", not "Tree changes"). Cached for 10 min per account.
 */
export async function findTreeDataSource(
  config: NotionConfig,
  client: AnyClient = getNotionClient()
): Promise<string | null> {
  if (config.treeDataSourceId) return stripId(config.treeDataSourceId);

  const key = `tree:${config.postsDataSourceId}`;
  const hit = discovered.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.id;

  let found: string | null = null;
  try {
    const ds = await client.dataSources.retrieve({ data_source_id: stripId(config.postsDataSourceId) });
    const databaseId: string | undefined = ds?.parent?.database_id;
    if (databaseId) {
      const db = await client.databases.retrieve({ database_id: databaseId });
      const pageId: string | undefined = db?.parent?.page_id;
      if (pageId) {
        let cursor: string | undefined;
        do {
          const res = await client.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
          for (const b of res.results ?? []) {
            const title = b.type === "child_database" ? (b.child_database?.title ?? "") : "";
            if (/tree\s*$/i.test(title) && !/change/i.test(title)) {
              const treeDb = await client.databases.retrieve({ database_id: b.id });
              found = treeDb?.data_sources?.[0]?.id ?? null;
              break;
            }
          }
          cursor = found ? undefined : res.has_more ? res.next_cursor : undefined;
        } while (cursor);
      }
    }
  } catch (err) {
    console.warn("[notion:tree] discovery failed", err);
  }
  discovered.set(key, { id: found, at: Date.now() });
  return found;
}

function parseNode(page: unknown): TreeNode {
  const p = page as { id: string; properties: Record<string, unknown> };
  const props = p.properties ?? {};
  return {
    id: p.id,
    name: extractTitle(props["Name"]),
    level: extractSelect(props["Level"]),
    status: extractStatus(props["Status"]),
    parentId: extractRelationIds(props["Parent"])[0],
    childIds: extractRelationIds(props["Children"]),
    fromSeedId: extractRelationIds(props["From seed"])[0],
    storyIds: extractRelationIds(props["Stories"]),
    postIds: extractRelationIds(props["Posts"]),
    callIds: extractRelationIds(props["Calls"]),
    askIds: extractRelationIds(props["Asks"]),
    changeIds: extractRelationIds(props["Changes"]),
    why: extractRichText(props["Why"]),
    notes: extractRichText(props["Notes"]),
  };
}

/**
 * All nodes on the client's tree (live Notion read). Empty array when no tree is
 * configured or discoverable — that is the normal state for a brand-new client,
 * not an error.
 */
export async function getTree(
  config: NotionConfig,
  client: AnyClient = getNotionClient()
): Promise<TreeNode[]> {
  const dataSourceId = await findTreeDataSource(config, client);
  if (!dataSourceId) return [];

  let results: unknown[] = [];
  let cursor: string | undefined;
  do {
    const res = await (client as AnyClient).dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: cursor,
    });
    results = results.concat(res.results ?? []);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return results.map(parseNode);
}
