import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/notion/client", () => ({ getNotionClient: () => ({}) }));
import { findAnswersDataSource, writeAnswersToNotion } from "@/lib/notion/answers";
import { SELLER_QUESTIONS } from "@/lib/questions/sets";

function fakeClient(withAnswersDb = true) {
  const created: unknown[] = [];
  const client = {
    dataSources: {
      retrieve: vi.fn(async ({ data_source_id }: { data_source_id: string }) =>
        data_source_id === "posts-ds"
          ? { parent: { database_id: "posts-db" } }
          : { properties: { Name: { type: "title" }, "Fix vs skip": { type: "rich_text" }, "Voice memos": { type: "files" } } }
      ),
    },
    databases: {
      retrieve: vi.fn(async ({ database_id }: { database_id: string }) =>
        database_id === "posts-db" ? { parent: { page_id: "calendar-page" } } : { data_sources: [{ id: "answers-ds" }] }
      ),
    },
    blocks: {
      children: {
        list: vi.fn(async () => ({
          results: [
            { id: "posts-db", type: "child_database", child_database: { title: "Posts" } },
            ...(withAnswersDb ? [{ id: "answers-db", type: "child_database", child_database: { title: "Greg's Answers" } }] : []),
          ],
          has_more: false,
        })),
      },
    },
    pages: { create: vi.fn(async (args: unknown) => (created.push(args), { id: "new-page" })) },
  };
  return { client, created };
}

describe("Notion answers", () => {
  it("finds the Answers database next to the Posts database", async () => {
    const { client } = fakeClient();
    expect(await findAnswersDataSource({ postsDataSourceId: "collection://posts-ds", topicsDataSourceId: "" }, client)).toBe("answers-ds");
  });

  it("writes mapped properties + full Q&A body", async () => {
    const { client, created } = fakeClient();
    const r = await writeAnswersToNotion(
      { postsDataSourceId: "collection://posts-ds-2", topicsDataSourceId: "" },
      { clientName: "Greg Caseley", setLabel: "Content questions", questions: SELLER_QUESTIONS, answers: { "fix-vs-skip": "Paint yes, kitchen no", "fall-winter": "Not slower" }, source: "test" },
      // posts-ds-2 is a different cache key; route both ids to the same fake tree
      { ...client, dataSources: { retrieve: vi.fn(async ({ data_source_id }: { data_source_id: string }) => client.dataSources.retrieve({ data_source_id: data_source_id === "posts-ds-2" ? "posts-ds" : data_source_id })) } }
    );
    expect(r).toEqual({ pageId: "new-page" });
    const args = created[0] as { properties: Record<string, unknown>; children: unknown[] };
    expect(args.properties["Fix vs skip"]).toEqual({ rich_text: [{ text: { content: "Paint yes, kitchen no" } }] });
    expect(args.properties["Fall and winter"]).toBeUndefined(); // not in this DB's schema → body only
    expect(JSON.stringify(args.children)).toContain("Not slower");
  });

  it("skips Notion cleanly when there's no Answers database", async () => {
    const { client, created } = fakeClient(false);
    const r = await writeAnswersToNotion(
      { postsDataSourceId: "collection://posts-ds-3", topicsDataSourceId: "" },
      { clientName: "X", setLabel: "S", questions: SELLER_QUESTIONS, answers: { "fix-vs-skip": "a" }, source: "t" },
      { ...client, dataSources: { retrieve: vi.fn(async ({ data_source_id }: { data_source_id: string }) => client.dataSources.retrieve({ data_source_id: data_source_id === "posts-ds-3" ? "posts-ds" : data_source_id })) } }
    );
    expect(r).toBeNull();
    expect(created).toHaveLength(0);
  });
});
