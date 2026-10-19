"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import type { ContentItem, CarouselItem, GraphicItem, ParsedContent } from "@/lib/drive/types";

type FilterType = "all" | "carousel" | "graphic";
type PreviewFilter = "all" | "preview" | "final";

interface DriveContentResponse {
  success: boolean;
  data?: {
    items: ContentItem[];
    carousels?: CarouselItem[];
    graphics?: GraphicItem[];
    metadata: ParsedContent["metadata"] & {
      accountId: string;
      accountName: string;
      filteredCount: number;
      filters: { type: string | null; preview: string | null };
    };
  };
  error?: string;
}

export default function AccountDriveViewerPage() {
  const params = useParams();
  const accountId = params.id as string;

  const [content, setContent] = useState<DriveContentResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>("all");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [carouselFrame, setCarouselFrame] = useState(0);

  const fetchContent = useCallback(async (bustCache = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (bustCache) params.set("bustCache", "true");

      const queryString = params.toString();
      const url = `/api/accounts/${accountId}/drive${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);
      const data: DriveContentResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch content");
      }

      setContent(data.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setContent(null);
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-zinc-400">Loading Drive content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 mb-4 text-4xl">⚠️</div>
          <p className="text-red-400 mb-2 font-medium">Error loading Drive content</p>
          <p className="text-zinc-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchContent(true)}
            className="px-4 py-2 bg-zinc-800 rounded hover:bg-zinc-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Filter items
  let items = content?.items || [];
  if (typeFilter !== "all") {
    items = items.filter((item) => item.type === typeFilter);
  }
  if (previewFilter === "preview") {
    items = items.filter((item) => item.isPreview);
  } else if (previewFilter === "final") {
    items = items.filter((item) => !item.isPreview);
  }

  const carouselCount = content?.carousels?.length || 0;
  const graphicCount = content?.graphics?.length || 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              {content?.metadata.accountName || accountId} - Drive Content
            </h1>
            <p className="text-sm text-zinc-400">
              {content?.metadata.totalItems} items • Last fetched:{" "}
              {content?.metadata.lastFetched
                ? new Date(content.metadata.lastFetched).toLocaleTimeString()
                : "—"}
            </p>
          </div>
          <button
            onClick={() => fetchContent(true)}
            className="px-4 py-2 bg-zinc-800 rounded hover:bg-zinc-700 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-zinc-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Type:</span>
            <div className="flex bg-zinc-900 rounded-lg p-1">
              {[
                { value: "all", label: `All (${content?.metadata.totalItems || 0})` },
                { value: "carousel", label: `Carousels (${carouselCount})` },
                { value: "graphic", label: `Graphics (${graphicCount})` },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTypeFilter(opt.value as FilterType)}
                  className={`px-3 py-1.5 text-sm rounded-md transition ${
                    typeFilter === opt.value
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Status:</span>
            <div className="flex bg-zinc-900 rounded-lg p-1">
              {[
                { value: "all", label: "All" },
                { value: "final", label: "Final" },
                { value: "preview", label: "Preview" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPreviewFilter(opt.value as PreviewFilter)}
                  className={`px-3 py-1.5 text-sm rounded-md transition ${
                    previewFilter === opt.value
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto text-sm text-zinc-500">
            Showing {items.length} items
          </div>
        </div>
      </div>

      {/* Grid */}
      <main className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onClick={() => {
                  setSelectedItem(item);
                  setCarouselFrame(0);
                }}
              />
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              No items match the current filters
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          frameIndex={carouselFrame}
          onFrameChange={setCarouselFrame}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

function ContentCard({
  item,
  onClick,
}: {
  item: ContentItem;
  onClick: () => void;
}) {
  const isCarousel = item.type === "carousel";
  const carousel = item as CarouselItem;
  const graphic = item as GraphicItem;

  const thumbnailUrl = isCarousel
    ? carousel.frames[0]?.thumbnailUrl
    : graphic.thumbnailUrl;

  const subtype = isCarousel ? null : graphic.subtype;

  return (
    <button
      onClick={onClick}
      className="group text-left bg-zinc-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-white/20 transition"
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-zinc-800 relative overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={item.topic}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            No preview
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {isCarousel && (
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
              {carousel.frameCount} slides
            </span>
          )}
          {item.isPreview && (
            <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs rounded-full">
              Preview
            </span>
          )}
        </div>

        {subtype && subtype !== "other" && (
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-0.5 bg-zinc-900/80 text-white text-xs rounded-full capitalize">
              {subtype.replace("-", " ")}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium truncate">{item.topic}</p>
        <p className="text-xs text-zinc-500 mt-1">
          {item.date
            ? new Date(item.date).toLocaleDateString()
            : item.type === "carousel"
            ? "Carousel"
            : "Graphic"}
        </p>
      </div>
    </button>
  );
}

function ItemModal({
  item,
  frameIndex,
  onFrameChange,
  onClose,
}: {
  item: ContentItem;
  frameIndex: number;
  onFrameChange: (i: number) => void;
  onClose: () => void;
}) {
  const isCarousel = item.type === "carousel";
  const carousel = item as CarouselItem;
  const graphic = item as GraphicItem;

  const currentFrame = isCarousel ? carousel.frames[frameIndex] : null;
  const imageUrl = isCarousel
    ? currentFrame?.thumbnailUrl?.replace("w800", "w1200")
    : graphic.thumbnailUrl?.replace("w800", "w1200");

  const downloadUrl = isCarousel
    ? currentFrame?.downloadUrl
    : graphic.downloadUrl;

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div>
            <h2 className="font-semibold">{item.topic}</h2>
            <p className="text-sm text-zinc-400">
              {item.type === "carousel"
                ? `Carousel • ${carousel.frameCount} slides`
                : `Graphic • ${graphic.subtype}`}
              {item.date && ` • ${new Date(item.date).toLocaleDateString()}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image */}
        <div className="relative bg-zinc-950">
          <div className="aspect-[4/3] flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={item.topic}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-zinc-600">No preview available</div>
            )}
          </div>

          {/* Carousel Navigation */}
          {isCarousel && carousel.frames.length > 1 && (
            <>
              <button
                onClick={() => onFrameChange(Math.max(0, frameIndex - 1))}
                disabled={frameIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 disabled:opacity-30"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() =>
                  onFrameChange(Math.min(carousel.frames.length - 1, frameIndex + 1))
                }
                disabled={frameIndex === carousel.frames.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 disabled:opacity-30"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {carousel.frames.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => onFrameChange(i)}
                    className={`w-2 h-2 rounded-full transition ${
                      i === frameIndex ? "bg-white" : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            {isCarousel ? `Frame ${frameIndex + 1} of ${carousel.frameCount}` : graphic.fileName}
          </div>
          <div className="flex gap-2">
            <a
              href={item.type === "carousel" ? carousel.frames[0]?.url : graphic.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm bg-zinc-800 rounded hover:bg-zinc-700"
            >
              Open in Drive
            </a>
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-zinc-200"
              >
                Download
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
