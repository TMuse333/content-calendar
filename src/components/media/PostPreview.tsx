"use client";

import { FileText, Loader2, Play } from "lucide-react";
import { classifyPreview } from "@/lib/media/preview";

interface PostPreviewProps {
  url?: string | null;
  alt?: string;
  className?: string;
  /** Full player with controls (modal / detail view). Thumbnails stay muted + still. */
  controls?: boolean;
  iconClassName?: string;
}

export function PostPreview({ url, alt = "", className = "w-full h-full object-cover", controls = false, iconClassName = "w-8 h-8 text-slate-600" }: PostPreviewProps) {
  const p = classifyPreview(url);

  if (p.kind === "video" && p.src) {
    if (controls) {
      return (
        <video
          src={p.src}
          poster={p.poster}
          className={className}
          controls
          playsInline
          preload="metadata"
        />
      );
    }
    return (
      <div className="relative w-full h-full">
        <video src={p.src} poster={p.poster} className={className} muted playsInline preload="metadata" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    );
  }

  if (p.kind === "image" && p.src) {
    return <img src={p.src} alt={alt} className={className} />;
  }

  if (p.kind === "drive") {
    return (
      <div className="flex flex-col items-center justify-center gap-1 text-slate-500 text-xs p-2 text-center">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Preview being prepared</span>
      </div>
    );
  }

  return <FileText className={iconClassName} />;
}
