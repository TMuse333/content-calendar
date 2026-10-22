import { describe, it, expect, vi } from "vitest";
import { fetchMediaInsights, FEED_METRICS } from "@/lib/platforms/instagram";

const res = (body: unknown) => Promise.resolve({ json: () => Promise.resolve(body) });

describe("fetchMediaInsights", () => {
  it("never asks for the retired 'impressions' metric for images/carousels", () => {
    expect(FEED_METRICS).not.toContain("impressions");
    expect(FEED_METRICS).toContain("reach");
    expect(FEED_METRICS).toContain("saved");
  });

  it("parses both values[] and total_value shapes", async () => {
    const f = vi.fn().mockReturnValue(
      res({ data: [{ name: "reach", values: [{ value: 120 }] }, { name: "saved", total_value: { value: 7 } }] })
    );
    expect(await fetchMediaInsights("https://graph.instagram.com", "1", "t", [FEED_METRICS], f)).toEqual({ reach: 120, saved: 7 });
  });

  it("falls back to a smaller metric set when Instagram rejects the first, instead of returning zeros", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = vi
      .fn()
      .mockReturnValueOnce(res({ error: { message: "(#100) metric[views] must be one of …" } }))
      .mockReturnValueOnce(res({ data: [{ name: "reach", values: [{ value: 50 }] }, { name: "saved", values: [{ value: 2 }] }] }));
    const r = await fetchMediaInsights("https://graph.instagram.com", "9", "t", [FEED_METRICS, "reach,saved"], f);
    expect(r).toEqual({ reach: 50, saved: 2 });
    expect(f).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("returns {} (and logs) when every attempt fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = vi.fn().mockReturnValue(res({ error: { message: "nope" } }));
    expect(await fetchMediaInsights("h", "1", "t", ["a", "b"], f)).toEqual({});
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
