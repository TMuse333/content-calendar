/**
 * Notion write-backs for client input (best effort: never block the client).
 *
 * - Answers database is auto-discovered: it's a child database named
 *   "...Answers" on the same Notion page as the client's Posts database.
 *   No per-account config needed; if none exists, Notion is simply skipped.
 * - Reactions are added as comments on the post page.
 */
import { getNotionClient } from "./client";
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
      { type: "paragraph", paragraph: { rich_text: [{ text: { content: `Source: ${input.source}` } }] } },
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
    return null;
  }
}

export async function commentOnPost(
  postId: string,
  text: string,
  client: AnyClient = getNotionClient()
): Promise<boolean> {
  try {
    await client.comments.create({
      parent: { page_id: postId },
      rich_text: [{ text: { content: chunk(text) } }],
    });
    return true;
  } catch (err) {
    console.warn("[notion:comment] failed", err);
    return false;
  }
}
