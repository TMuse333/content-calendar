/**
 * Classify a post's Preview URL so the UI can render it correctly.
 *
 * - Cloudinary / direct video files → <video>
 * - Images → <img>
 * - Google Drive links → never shown to clients (Spec: clients never get
 *   Drive links). The upload pipeline turns them into Cloudinary URLs; until
 *   then the UI shows "preview being prepared".
 */

export type PreviewKind = "image" | "video" | "drive" | "none";

export interface ClassifiedPreview {
  kind: PreviewKind;
  src?: string;
  /** Still frame to show before a video plays (Cloudinary can generate one). */
  poster?: string;
}

const VIDEO_EXT = /\.(mp4|mov|m4v|webm)(\?|#|$)/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|heic)(\?|#|$)/i;

export function classifyPreview(url?: string | null): ClassifiedPreview {
  if (!url || !url.trim()) return { kind: "none" };
  const src = url.trim();

  let host = "";
  try {
    host = new URL(src).hostname;
  } catch {
    return { kind: "none" };
  }

  if (host.endsWith("drive.google.com") || host.endsWith("docs.google.com")) {
    return { kind: "drive" };
  }

  if (host.endsWith("res.cloudinary.com")) {
    if (src.includes("/video/upload/")) {
      // Same asset as a jpg = first-frame poster.
      const poster = src.replace(VIDEO_EXT, ".jpg");
      return { kind: "video", src, poster: poster !== src ? poster : undefined };
    }
    return { kind: "image", src };
  }

  if (VIDEO_EXT.test(src)) return { kind: "video", src };
  if (IMAGE_EXT.test(src)) return { kind: "image", src };

  // Unknown extension: treat as image (most existing previews are image links).
  return { kind: "image", src };
}
