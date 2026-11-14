/**
 * Waterline calls — live Notion reader.
 *
 * Story calls with the client: when they happened, what they touched, follow-ups.
 * The Calls database is INTERNAL (per its Notion description).
 *
 * Transcript safety: the verbatim transcript is NOT a database property — it lives
 * in the call page's body / a linked "Transcript —…" page. This reader reads only
 * DB *properties* (via dataSources.query), so the transcript can never leak through
 * it. The one sensitive property is `Recording` (a URL to the raw recording) →
 * admin-only, stripped from the public view.
 *
 * TWO readers, same fail-closed pattern as stories.ts:
 *   - getCalls()       → ADMIN/full. All row fields incl. recording URL + follow-ups.
 *   - getPublicCalls() → summary only: id, name, type, date. No recording, no
 *                        follow-ups, no transcript.
 */
import { getNotionClient } from "./client";
import type { NotionConfig } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export type CallType = "Story call" | "Review" | "Onboarding" | "Other";

/** Full call (admin). DB-row level — transcript is page body, never included here. */
export interface Call {
  id: string;
  url?: string;              // Notion page URL (for admin links)
  name: string;
  type?: CallType;
  date?: string;             // Date (ISO)
  nextCall?: string;         // Next call (ISO)
  recordingUrl?: string;     // sensitive — admin only
  followUps?: string;        // internal
  followUpsDone: boolean;
  nodesTouchedIds: string[];
  postsProposedIds: string[];
  treeChangeIds: string[];
  storyIds: string[];
  questionIds: string[];
  askIds: string[];
}

/** Summary-only call for any non-admin surface. No recording, follow-ups, or transcript. */
export interface PublicCall {
  id: string;
  name: string;
  type?: CallType;
  date?: string;
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
function extractDateStart(prop: unknown): string | undefined {
  const p = prop as { date?: { start?: string } | null } | undefined;
  return p?.date?.start || undefined;
}
function extractUrl(prop: unknown): string | undefined {
  const p = prop as { url?: string | null } | undefined;
  return p?.url || undefined;
}
function extractCheckbox(prop: unknown): boolean {
  const p = prop as { checkbox?: boolean } | undefined;
  return p?.checkbox ?? false;
}
function extractRelationIds(prop: unknown): string[] {
  const p = prop as { relation?: Array<{ id: string }> } | undefined;
  return p?.relation?.map((r) => r.id) ?? [];
}

/** Resolve the client's Calls data source: override first, else discover the child
 *  db titled "…Calls" on the account's Notion page. */
export async function findCallsDataSource(
  config: NotionConfig,
  client: AnyClient = getNotionClient()
): Promise<string | null> {
  if (config.callsDataSourceId) return stripId(config.callsDataSourceId);

  const key = `calls:${config.postsDataSourceId}`;
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
            if (/calls\s*$/i.test(title)) {
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
    console.warn("[notion:calls] discovery failed", err);
  }
  discovered.set(key, { id: found, at: Date.now() });
  return found;
}

function parseCall(page: unknown): Call {
  const p = page as { id: string; url?: string; properties: Record<string, unknown> };
  const props = p.properties ?? {};
  return {
    id: p.id,
    url: p.url,
    name: extractTitle(props["Call"]),
    type: extractSelect(props["Type"]) as CallType | undefined,
    date: extractDateStart(props["Date"]),
    nextCall: extractDateStart(props["Next call"]),
    recordingUrl: extractUrl(props["Recording"]),
    followUps: extractRichText(props["Follow-ups"]),
    followUpsDone: extractCheckbox(props["Follow-ups done"]),
    nodesTouchedIds: extractRelationIds(props["Nodes touched"]),
    postsProposedIds: extractRelationIds(props["Posts proposed"]),
    treeChangeIds: extractRelationIds(props["Tree changes"]),
    storyIds: extractRelationIds(props["Stories"]),
    questionIds: extractRelationIds(props["Questions found"]),
    askIds: extractRelationIds(props["Asks"]),
  };
}

/** Admin/full: all call rows, every property (incl. recording URL + follow-ups). */
export async function getCalls(
  config: NotionConfig,
  client: AnyClient = getNotionClient()
): Promise<Call[]> {
  const dataSourceId = await findCallsDataSource(config, client);
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

  // Most-recent first.
  const calls = results.map(parseCall);
  calls.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return calls;
}

/** Summary-only calls. Strips recording URL, follow-ups, relations; never transcript. */
export async function getPublicCalls(
  config: NotionConfig,
  client: AnyClient = getNotionClient()
): Promise<PublicCall[]> {
  const all = await getCalls(config, client);
  return all.map((c) => ({ id: c.id, name: c.name, type: c.type, date: c.date }));
}
