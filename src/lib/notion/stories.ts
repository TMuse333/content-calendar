/**
 * Waterline stories — live Notion reader with server-side permission filtering.
 *
 * Stories are the evidence bank: one row per real client case, sitting on a tree
 * node. Nothing is public without Permission = Yes or Anonymous only.
 *
 * TWO readers, by design, so the public path can't accidentally leak:
 *   - getStories()       → ADMIN/full. Every field, every story. Internal use only.
 *   - getPublicStories() → PUBLIC-safe. Only Yes / Anonymous-only; name-bearing
 *                          prose withheld for anonymous. Fail-closed.
 *
 * ⚠ Name-stripping caveat: the Notion schema has NO structured client-name field
 * — names live in free text (even the title). So for "Anonymous only" stories we
 * cannot safely strip names from prose; we withhold the prose instead and flag
 * `anonymized`. To make anonymous stories publicly usable, add an "Anonymized
 * summary" text field to the Stories db; getPublicStories() serves it when present.
 */
import { getNotionClient } from "./client";
import type { NotionConfig } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export type Permission = "Not asked" | "Yes" | "Anonymous only" | "No";

/** The only permission values that may surface publicly. "Not asked"/"No" never do. */
const PUBLIC_PERMISSIONS: ReadonlySet<Permission> = new Set(["Yes", "Anonymous only"]);

/** Optional future field: a manually-written, client-safe summary for anonymous stories. */
const ANON_SUMMARY_FIELD = "Anonymized summary";

/** Full story (admin only). Mirrors the Notion "Stories" schema. */
export interface Story {
  id: string;
  name: string;              // Story (title) — may contain client names
  situation?: string;        // may contain names/places
  whatGregDid?: string;
  result?: string;
  questionsAsked?: string;
  verify?: string;
  permission: Permission;
  clientSource?: string;
  breakthrough?: number;     // 1–5
  nodeIds: string[];
  callIds: string[];
  usedInPostIds: string[];
  anonSummary?: string;      // present only if the db has an "Anonymized summary" field
}

/** Public-safe story. Name-bearing prose present only when permission === "Yes". */
export interface PublicStory {
  id: string;
  nodeIds: string[];
  permission: "Yes" | "Anonymous only";
  anonymized: boolean;
  breakthrough?: number;
  name?: string;
  situation?: string;
  whatGregDid?: string;
  result?: string;
  questionsAsked?: string;
}

const TTL_MS = 10 * 60 * 1000;
const discovered = new Map<string, { id: string | null; at: number }>();

function stripId(id: string): string {
  return id.replace("collection://", "");
}

function extractTitle(prop: unknown): string {
  const p = prop as { title?: Array<{ plain_text?: string }> } | undefined;
  return p?.title?.[0]?.plain_text ?? "";
}
function extractRichText(prop: unknown): string | undefined {
  const p = prop as { rich_text?: Array<{ plain_text?: string }> } | undefined;
  return p?.rich_text?.map((t) => t.plain_text ?? "").join("") || undefined;
}
function extractSelect(prop: unknown): string | undefined {
  const p = prop as { select?: { name?: string } } | undefined;
  return p?.select?.name || undefined;
}
function extractNumber(prop: unknown): number | undefined {
  const p = prop as { number?: number | null } | undefined;
  return typeof p?.number === "number" ? p.number : undefined;
}
function extractRelationIds(prop: unknown): string[] {
  const p = prop as { relation?: Array<{ id: string }> } | undefined;
  return p?.relation?.map((r) => r.id) ?? [];
}

/** Resolve the client's Stories data source: override first, else discover the
 *  child db titled "…Stories" on the account's Notion page. */
export async function findStoriesDataSource(
  config: NotionConfig,
  client: AnyClient = getNotionClient()
): Promise<string | null> {
  if (config.storiesDataSourceId) return stripId(config.storiesDataSourceId);

  const key = `stories:${config.postsDataSourceId}`;
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
            if (/stories\s*$/i.test(title)) {
              const db2 = await client.databases.retrieve({ database_id: b.id });
              found = db2?.data_sources?.[0]?.id ?? null;
              break;
            }
          }
          cursor = found ? undefined : res.has_more ? res.next_cursor : undefined;
        } while (cursor);
      }
    }
  } catch (err) {
    console.warn("[notion:stories] discovery failed", err);
  }
  discovered.set(key, { id: found, at: Date.now() });
  return found;
}

function parseStory(page: unknown): Story {
  const p = page as { id: string; properties: Record<string, unknown> };
  const props = p.properties ?? {};
  return {
    id: p.id,
    name: extractTitle(props["Story"]),
    situation: extractRichText(props["Situation"]),
    whatGregDid: extractRichText(props["What Greg did"]),
    result: extractRichText(props["Result"]),
    questionsAsked: extractRichText(props["Questions they asked"]),
    verify: extractRichText(props["Verify"]),
    permission: (extractSelect(props["Permission"]) as Permission) ?? "Not asked",
    clientSource: extractSelect(props["Client source"]),
    breakthrough: extractNumber(props["Breakthrough"]),
    nodeIds: extractRelationIds(props["Node"]),
    callIds: extractRelationIds(props["Call"]),
    usedInPostIds: extractRelationIds(props["Used in"]),
    anonSummary: extractRichText(props[ANON_SUMMARY_FIELD]),
  };
}

/** Admin/full: every story, every field. Internal use only — never return raw to clients. */
export async function getStories(
  config: NotionConfig,
  client: AnyClient = getNotionClient()
): Promise<Story[]> {
  const dataSourceId = await findStoriesDataSource(config, client);
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

  return results.map(parseStory);
}

/** Map one full story to its public-safe form, or null if it must not surface. */
function toPublicStory(s: Story): PublicStory | null {
  if (!PUBLIC_PERMISSIONS.has(s.permission)) return null; // excludes "Not asked" and "No"
  const permission = s.permission as "Yes" | "Anonymous only";
  const anonymized = permission === "Anonymous only";

  const base: PublicStory = {
    id: s.id,
    nodeIds: s.nodeIds,
    permission,
    anonymized,
    breakthrough: s.breakthrough,
  };

  if (!anonymized) {
    // "Yes": names allowed — include the prose.
    return {
      ...base,
      name: s.name,
      situation: s.situation,
      whatGregDid: s.whatGregDid,
      result: s.result,
      questionsAsked: s.questionsAsked,
    };
  }

  // "Anonymous only": withhold name-bearing prose. Serve a manual anonymized
  // summary if the schema has one; otherwise structured fields only (fail-closed).
  if (s.anonSummary) return { ...base, situation: s.anonSummary };
  return base;
}

/**
 * Public-safe stories: only Yes / Anonymous-only, name-bearing prose withheld for
 * anonymous. This is what the website chatbot, share pages, and video emitter read.
 */
export async function getPublicStories(
  config: NotionConfig,
  client: AnyClient = getNotionClient()
): Promise<PublicStory[]> {
  const all = await getStories(config, client);
  return all
    .map(toPublicStory)
    .filter((s): s is PublicStory => s !== null);
}
