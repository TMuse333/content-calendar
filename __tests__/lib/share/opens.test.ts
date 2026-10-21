import { describe, it, expect, vi } from "vitest";
import { describeOpens } from "@/lib/share/opens";
import { notifyOnClientPage } from "@/lib/notion/answers";

describe("describeOpens", () => {
  const now = new Date("2026-10-21T18:00:00Z");

  it("says not opened when there are no opens", () => {
    expect(describeOpens({}, now)).toEqual({ opened: false, text: "Not opened yet" });
    expect(describeOpens({ openCount: 0 }, now).opened).toBe(false);
  });

  it("describes a single open", () => {
    const r = describeOpens({ openCount: 1, firstOpenedAt: now, lastOpenedAt: now }, now);
    expect(r.opened).toBe(true);
    expect(r.text).toMatch(/^Opened once · today/);
  });

  it("describes repeat opens with first and last", () => {
    const first = new Date("2026-10-20T15:00:00Z");
    const r = describeOpens({ openCount: 3, firstOpenedAt: first.toISOString(), lastOpenedAt: now.toISOString() }, now);
    expect(r.text).toMatch(/^Opened 3× · first yesterday .* · last today/);
  });
});

describe("notifyOnClientPage", () => {
  it("comments with an @mention on the page that holds the Posts database", async () => {
    process.env.NOTION_NOTIFY_USER_ID = "user-123";
    const create = vi.fn().mockResolvedValue({});
    const client = {
      dataSources: { retrieve: vi.fn().mockResolvedValue({ parent: { database_id: "db-1" } }) },
      databases: { retrieve: vi.fn().mockResolvedValue({ parent: { page_id: "calendar-page" } }) },
      comments: { create },
    };
    const ok = await notifyOnClientPage({ postsDataSourceId: "collection://ds-1", topicsDataSourceId: "" }, "Greg opened your share link", client);
    expect(ok).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    const arg = create.mock.calls[0][0];
    expect(arg.parent).toEqual({ page_id: "calendar-page" });
    expect(arg.rich_text[0]).toEqual({ type: "mention", mention: { user: { id: "user-123" } } });
    expect(arg.rich_text.at(-1).text.content).toBe("Greg opened your share link");
    delete process.env.NOTION_NOTIFY_USER_ID;
  });

  it("returns false (no throw) when the page can't be found", async () => {
    const client = {
      dataSources: { retrieve: vi.fn().mockRejectedValue(new Error("nope")) },
      databases: { retrieve: vi.fn() },
      comments: { create: vi.fn() },
    };
    const ok = await notifyOnClientPage({ postsDataSourceId: "x", topicsDataSourceId: "" }, "hi", client);
    expect(ok).toBe(false);
    expect(client.comments.create).not.toHaveBeenCalled();
  });
});
