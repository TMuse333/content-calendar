import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/notion/client", () => ({ getNotionClient: () => ({}) }));
import { extractFileOrUrl } from "@/lib/notion/service";
import { classifyPreview } from "@/lib/media/preview";

describe("extractFileOrUrl (Notion Preview column)", () => {
  it("reads a Notion-hosted uploaded video", () => {
    const url = extractFileOrUrl({
      type: "files",
      files: [{ name: "P-14 fall.mp4", type: "file", file: { url: "https://prod-files-secure.s3.us-west-2.amazonaws.com/a/b/P-14_fall.mp4?X-Amz-Signature=abc" } }],
    });
    expect(url).toContain("P-14_fall.mp4?X-Amz");
    expect(classifyPreview(url).kind).toBe("video");
  });

  it("uses the file name when the URL has no extension", () => {
    const url = extractFileOrUrl({
      files: [{ name: "Reel.MOV", type: "file", file: { url: "https://files.notion.so/signed/abc123?exp=1" } }],
    });
    expect(url).toBe("https://files.notion.so/signed/abc123?exp=1#preview.mov");
    expect(classifyPreview(url).kind).toBe("video");
  });

  it("reads external file links and plain URL properties", () => {
    expect(extractFileOrUrl({ files: [{ type: "external", external: { url: "https://res.cloudinary.com/x/image/upload/a.png" } }] }))
      .toBe("https://res.cloudinary.com/x/image/upload/a.png");
    expect(extractFileOrUrl({ url: "https://x.com/a.jpg" })).toBe("https://x.com/a.jpg");
  });

  it("returns the first file for carousels and undefined when empty", () => {
    expect(extractFileOrUrl({ files: [
      { name: "1.png", type: "file", file: { url: "https://s3/1.png?s" } },
      { name: "2.png", type: "file", file: { url: "https://s3/2.png?s" } },
    ] })).toBe("https://s3/1.png?s");
    expect(extractFileOrUrl({ files: [] })).toBeUndefined();
    expect(extractFileOrUrl(null)).toBeUndefined();
  });
});

import { extractAllFilesOrUrl } from "@/lib/notion/service";

describe("extractAllFilesOrUrl (carousel slides)", () => {
  it("returns every slide in order", () => {
    expect(
      extractAllFilesOrUrl({
        files: [
          { name: "1.png", type: "file", file: { url: "https://s3/1.png?s" } },
          { name: "2.png", type: "file", file: { url: "https://s3/2.png?s" } },
          { name: "3.png", type: "external", external: { url: "https://cdn/3.png" } },
        ],
      })
    ).toEqual(["https://s3/1.png?s", "https://s3/2.png?s", "https://cdn/3.png"]);
  });
  it("handles URL properties and empty values", () => {
    expect(extractAllFilesOrUrl({ url: "https://x/a.jpg" })).toEqual(["https://x/a.jpg"]);
    expect(extractAllFilesOrUrl({ files: [] })).toEqual([]);
    expect(extractAllFilesOrUrl(undefined)).toEqual([]);
  });
});
