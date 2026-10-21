"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Layers, Loader2, Play } from "lucide-react";
import { classifyPreview } from "@/lib/media/preview";

interface PostPreviewProps {
  url?: string | null;
  /** All preview files in order (carousel slides). Takes priority over `url`. */
  urls?: string[] | null;
  alt?: string;
  className?: string;
  /** Full player / swipeable gallery (modal / detail view). Thumbnails stay still. */
  controls?: boolean;
  iconClassName?: string;
}

function Single({ url, alt, className, controls, iconClassName }: Omit<PostPreviewProps, "urls">) {
  const p = classifyPreview(url);

  if (p.kind === "video" && p.src) {
    if (controls) {
      return <video src={p.src} poster={p.poster} className={className} controls playsInline preload="metadata" />;
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

function Gallery({ urls, alt, className }: { urls: string[]; alt: string; className: string }) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(urls.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={track}
        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {urls.map((u, i) => (
          <div key={i} className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
            <Single url={u} alt={`${alt} — slide ${i + 1}`} className={className} controls />
          </div>
        ))}
      </div>

      {index > 0 && (
        <button
          aria-label="Previous slide"
          onClick={() => go(index - 1)}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {index < urls.length - 1 && (
        <button
          aria-label="Next slide"
          onClick={() => go(index + 1)}
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white items-center justify-center"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      <div className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-black/60 text-white">
        {index + 1}/{urls.length}
      </div>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
        {urls.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"}`} />
        ))}
      </div>
    </div>
  );
}

export function PostPreview({
  url,
  urls,
  alt = "",
  className = "w-full h-full object-cover",
  controls = false,
  iconClassName = "w-8 h-8 text-slate-600",
}: PostPreviewProps) {
  const list = (urls ?? []).filter(Boolean);

  if (list.length > 1) {
    if (controls) return <Gallery urls={list} alt={alt} className={className} />;
    return (
      <div className="relative w-full h-full">
        <Single url={list[0]} alt={alt} className={className} iconClassName={iconClassName} />
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/60 text-white">
          <Layers className="w-3 h-3" />
          {list.length}
        </div>
      </div>
    );
  }

  return (
    <Single url={list[0] ?? url} alt={alt} className={className} controls={controls} iconClassName={iconClassName} />
  );
}
