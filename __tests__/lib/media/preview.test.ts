import { describe, it, expect } from "vitest";
import { classifyPreview } from "@/lib/media/preview";

describe("classifyPreview", () => {
  it("Cloudinary video → video with a jpg poster", () => {
    const r = classifyPreview("https://res.cloudinary.com/syntellic/video/upload/l_wm/greg/p-14.mp4");
    expect(r.kind).toBe("video");
    expect(r.poster).toBe("https://res.cloudinary.com/syntellic/video/upload/l_wm/greg/p-14.jpg");
  });
  it("Cloudinary image → image", () => {
    expect(classifyPreview("https://res.cloudinary.com/x/image/upload/a.png").kind).toBe("image");
  });
  it("direct mp4/mov/webm → video", () => {
    expect(classifyPreview("https://cdn.example.com/a.MOV").kind).toBe("video");
    expect(classifyPreview("https://cdn.example.com/a.webm?x=1").kind).toBe("video");
  });
  it("Google Drive links are never rendered to clients", () => {
    const r = classifyPreview("https://drive.google.com/file/d/abc/view?usp=sharing");
    expect(r).toEqual({ kind: "drive" });
  });
  it("images and unknowns render as images", () => {
    expect(classifyPreview("https://x.com/a.jpg").kind).toBe("image");
    expect(classifyPreview("https://x.com/render?id=1").kind).toBe("image");
  });
  it("empty or invalid → none", () => {
    expect(classifyPreview("").kind).toBe("none");
    expect(classifyPreview(undefined).kind).toBe("none");
    expect(classifyPreview("not a url").kind).toBe("none");
  });
});
