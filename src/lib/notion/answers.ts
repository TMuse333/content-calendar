/**
 * Notion write-backs for client input (best effort: never block the client).
 *
 * - Answers database is auto-discovered: it's a child database named
 *   "...Answers" on the same Notion page as the client's Posts database.
 *   No per-account config needed; if none exists, Notion is simply skipped.
 * - Reactions are added as comments on the post page.
 */
import { getNotionClient } from "./client";
import { alertFailure } from "./alerts";
import type { NotionConfig } from "./types";
import type { Question } from "@/lib/questions/sets";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

const discovered = new Map<string, { id: string | null; at: number }>();
const TTL_MS = 10 * 60 * 1000;

function stripId(id: string) {
  return id.replace("collection://", "");
}

export async function findAnswersDataSource(
  config: NotionConfig,
  client: AnyClient = getNotionClient()
): Promise<string | null> {
  const key = config.postsDataSourceId;
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
            if (b.type === "child_database" && /answers/i.test(b.child_database?.title ?? "")) {
              const answersDb = await client.databases.retrieve({ database_id: b.id });
              found = answersDb?.data_sources?.[0]?.id ?? null;
              break;
            }
          }
          cursor = found ? undefined : res.has_more ? res.next_cursor : undefined;
        } while (cursor);
      }
    }
  } catch (err) {
    console.warn("[notion:answers] discovery failed", err);
  }
  discovered.set(key, { id: found, at: Date.now() });
  return found;
}

const chunk = (s: string) => s.slice(0, 1900);

/**
 * Who to @mention so client input pushes a Notion notification to their phone.
 * Set NOTION_NOTIFY_USER_ID (Thomas's Notion user id) in the environment.
 */
function mention(): unknown[] {
  const id = process.env.NOTION_NOTIFY_USER_ID;
  return id ? [{ type: "mention", mention: { user: { id } } }, { text: { content: " " } }] : [];
}

/**
 * The new home for client answers: the "Asks" child database (one row per
 * open question; answers upsert into it). Discovered by exact title.
 */
export async function findAsksDataSource(
  config: NotionConfig,
  client: AnyClient = getNotionClient()
): Promise<string | null> {
  const key = `asks:${config.postsDataSourceId}`;
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
            const title = b.type === "child_database" ? (b.child_database?.title ?? "").trim() : "";
            if (/^asks$/i.test(title)) {
              const asksDb = await client.databases.retrieve({ database_id: b.id });
              found = asksDb?.data_sources?.[0]?.id ?? null;
              break;
            }
          }
          cursor = found ? undefined : res.has_more ? res.next_cursor : undefined;
        } while (cursor);
      }
    }
  } catch (err) {
    console.warn("[notion:asks] discovery failed", err);
  }
  discovered.set(key, { id: found, at: Date.now() });
  return found;
}

/** Kind for a created Ask row, derived from the question id. */
function askKind(questionId: string): string {
  if (questionId.startsWith("fact-") || questionId.includes("confirm")) return "Fact check";
  if (questionId.startsWith("perm-") || questionId.includes("story-details")) return "Permission";
  return "Material";
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Upsert answered questions into the Asks db: match a row whose title equals
 * the prompt (normalized), else create one. Sets Answer + Status=Answered.
 * Returns the first touched row id, or null when the db isn't found.
 */
async function writeAnswersToAsks(
  config: NotionConfig,
  input: WriteAnswersInput,
  client: AnyClient = getNotionClient()
): Promise<{ pageId: string } | null> {
  const dataSourceId = await findAsksDataSource(config, client);
  if (!dataSourceId) return null;

  // Existing rows, once per submission (the db is small).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing: { id: string; title: string }[] = [];
  let cursor: string | undefined;
  do {
    const res = await client.dataSources.query({ data_source_id: dataSourceId, page_size: 100, start_cursor: cursor });
    for (const p of res.results ?? []) {
      const title =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p.properties?.Ask?.title ?? []).map((t: any) => t.plain_text).join("");
      existing.push({ id: p.id, title });
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  const today = new Date().toISOString().slice(0, 10);
  let firstId: string | null = null;
  let touched = 0;
  const failedRows: string[] = [];

  for (const q of input.questions) {
    const a = input.answers[q.id];
    if (!a) continue;
    const answerProps = {
      Answer: { rich_text: [{ text: { content: chunk(a) } }] },
      Status: { status: { name: "Answered" } },
    };
    const match = existing.find((r) => normalize(r.title) === normalize(q.prompt));
    try {
      if (match) {
        await client.pages.update({ page_id: match.id, properties: answerProps });
        firstId ??= match.id;
      } else {
        const page = await client.pages.create({
          parent: { type: "data_source_id", data_source_id: dataSourceId },
          properties: {
            Ask: { title: [{ text: { content: chunk(q.prompt) } }] },
            Kind: { select: { name: askKind(q.id) } },
            Asked: { date: { start: today } },
            ...answerProps,
          },
        });
        firstId ??= page.id;
      }
      touched++;
    } catch (err) {
      console.warn(`[notion:asks] upsert failed for "${q.id}"`, err);
      failedRows.push(`"${q.prompt.slice(0, 80)}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (failedRows.length) {
    // The client's answer text is lost if we drop it silently — page Thomas.
    await alertFailure(`Asks write-back (${input.clientName}, ${input.setLabel})`, failedRows);
  }

  if (touched > 0) {
    // One notification per submission, not per row.
    await notifyOnClientPage(
      config,
      `${input.clientName} answered ${touched} question${touched === 1 ? "" : "s"} (${input.setLabel}) — see the Asks board.`,
      client
    );
  }
  return firstId ? { pageId: firstId } : null;
}

export interface WriteAnswersInput {
  clientName: string;
  setLabel: string;
  questions: Question[];
  answers: Record<string, string>;
  source: string;
}

export async function writeAnswersToNotion(
  config: NotionConfig,
  input: WriteAnswersInput,
  client: AnyClient = getNotionClient()
): Promise<{ pageId: string } | null> {
  // Preferred path: upsert into the Asks db (post-Nov 5 model).
  try {
    const viaAsks = await writeAnswersToAsks(config, input, client);
    if (viaAsks) return viaAsks;
  } catch (err) {
    console.warn("[notion:asks] write failed, falling back", err);
  }

  // Legacy path: page-per-submission in an "…Answers" db (older clients).
  try {
    const dataSourceId = await findAnswersDataSource(config, client);
    if (!dataSourceId) return null;

    const schema = await client.dataSources.retrieve({ data_source_id: dataSourceId });
    const props: Record<string, { type: string }> = schema?.properties ?? {};
    const titleProp = Object.entries(props).find(([, p]) => p.type === "title")?.[0] ?? "Name";

    const properties: Record<string, unknown> = {
      [titleProp]: {
        title: [{ text: { content: `${input.clientName} · ${input.setLabel} · ${new Date().toLocaleDateString("en-CA")}` } }],
      },
    };
    for (const q of input.questions) {
      const a = input.answers[q.id];
      if (a && q.notionProperty && props[q.notionProperty]?.type === "rich_text") {
        properties[q.notionProperty] = { rich_text: [{ text: { content: chunk(a) } }] };
      }
    }

    const children: unknown[] = [
      {
        type: "paragraph",
        paragraph: { rich_text: [...mention(), { text: { content: `New answers from ${input.clientName} · Source: ${input.source}` } }] },
      },
    ];
    for (const q of input.questions) {
      const a = input.answers[q.id];
      if (!a) continue;
      children.push({ type: "heading_3", heading_3: { rich_text: [{ text: { content: chunk(q.prompt) } }] } });
      children.push({ type: "paragraph", paragraph: { rich_text: [{ text: { content: chunk(a) } }] } });
    }

    const page = await client.pages.create({
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties,
      children,
    });
    return { pageId: page.id };
  } catch (err) {
    console.warn("[notion:answers] write failed", err);
    // Neither Asks nor legacy landed — the submission exists nowhere in Notion.
    await alertFailure(`Answers write-back (${input.clientName}, ${input.setLabel})`, [
      `no path succeeded: ${err instanceof Error ? err.message : String(err)}`,
      `answers: ${Object.entries(input.answers).map(([k, v]) => `${k}=${v.slice(0, 60)}`).join(" | ").slice(0, 1500)}`,
    ]);
    return null;
  }
}

/** The Notion page that holds the client's Posts database (e.g. "Greg Content Calendar"). */
export async function findClientPageId(
  config: NotionConfig,
  client: AnyClient = getNotionClient()
): Promise<string | null> {
  try {
    const ds = await client.dataSources.retrieve({ data_source_id: stripId(config.postsDataSourceId) });
    const databaseId: string | undefined = ds?.parent?.database_id;
    if (!databaseId) return null;
    const db = await client.databases.retrieve({ database_id: databaseId });
    return db?.parent?.page_id ?? null;
  } catch (err) {
    console.warn("[notion:client-page] lookup failed", err);
    return null;
  }
}

/** Comment (with @mention) on the client's calendar page. Best effort. */
export async function notifyOnClientPage(
  config: NotionConfig,
  text: string,
  client: AnyClient = getNotionClient()
): Promise<boolean> {
  const pageId = await findClientPageId(config, client);
  if (!pageId) return false;
  return commentOnPost(pageId, text, client);
}

export async function commentOnPost(
  postId: string,
  text: string,
  client: AnyClient = getNotionClient()
): Promise<boolean> {
  try {
    await client.comments.create({
      parent: { page_id: postId },
      rich_text: [...mention(), { text: { content: chunk(text) } }],
    });
    return true;
  } catch (err) {
    console.warn("[notion:comment] failed", err);
    return false;
  }
}
