"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import type { ContentItem, ContentItemStatus } from "@/lib/types/content-item";
import type { Deal, DealProgress } from "@/lib/types/deal";

type FilterType = "all" | "carousel" | "graphic" | "video";

interface DealWithProgress extends Deal {
  progress: DealProgress | null;
}

interface ContentResponse {
  success: boolean;
  items: ContentItem[];
  deals: DealWithProgress[];
  unassignedItems: ContentItem[];
  counts: {
    total: number;
    byStatus: Record<string, number>;
    unassigned: number;
  };
  error?: string;
}

const STATUS_OPTIONS: { value: ContentItemStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "bg-zinc-600" },
  { value: "preview-sent", label: "Preview Sent", color: "bg-yellow-600" },
  { value: "approved", label: "Approved", color: "bg-green-600" },
  { value: "changes-requested", label: "Changes", color: "bg-orange-600" },
  { value: "paid", label: "Paid", color: "bg-blue-600" },
  { value: "scheduled", label: "Scheduled", color: "bg-purple-600" },
  { value: "posted", label: "Posted", color: "bg-emerald-600" },
  { value: "results", label: "Results", color: "bg-cyan-600" },
];

export default function ContentDashboardPage() {
  const params = useParams();
  const accountId = params.id as string;

  const [data, setData] = useState<ContentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [dealFilter, setDealFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/accounts/${accountId}/content`);
      const result: ContentResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch content");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  const syncFromDrive = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/accounts/${accountId}/content/sync`, {
        method: "POST",
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Sync failed");
      }

      // Refresh content
      await fetchContent();
      alert(result.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const updateItem = async (driveId: string, updates: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/content/${driveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Update failed");
      }

      // Refresh content
      await fetchContent();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    }
  };

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-zinc-400">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchContent}
            className="px-4 py-2 bg-zinc-800 rounded hover:bg-zinc-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Filter items
  let filteredItems = data?.items || [];
  if (typeFilter !== "all") {
    filteredItems = filteredItems.filter((item) => item.type === typeFilter);
  }
  if (dealFilter !== "all") {
    if (dealFilter === "unassigned") {
      filteredItems = filteredItems.filter((item) => !item.dealId);
    } else {
      filteredItems = filteredItems.filter((item) => item.dealId === dealFilter);
    }
  }

  // Group by date
  const itemsByDate = new Map<string, ContentItem[]>();
  for (const item of filteredItems) {
    const key = item.plannedDate
      ? new Date(item.plannedDate).toISOString().slice(0, 10)
      : "date-tbd";
    const existing = itemsByDate.get(key) || [];
    existing.push(item);
    itemsByDate.set(key, existing);
  }

  // Sort dates
  const sortedDates = Array.from(itemsByDate.keys()).sort((a, b) => {
    if (a === "date-tbd") return 1;
    if (b === "date-tbd") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Content Management</h1>
            <p className="text-sm text-zinc-400">
              {data?.counts.total} items • {data?.counts.unassigned} unassigned
            </p>
          </div>
          <button
            onClick={syncFromDrive}
            disabled={isSyncing}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2"
          >
            {isSyncing ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync from Drive
              </>
            )}
          </button>
        </div>
      </header>

      {/* Deal Progress Cards */}
      {data?.deals && data.deals.length > 0 && (
        <div className="border-b border-zinc-800 px-6 py-4">
          <div className="max-w-7xl mx-auto space-y-3">
            {data.deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="border-b border-zinc-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Type:</span>
            <div className="flex bg-zinc-900 rounded-lg p-1">
              {(["all", "carousel", "graphic", "video"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setTypeFilter(opt)}
                  className={`px-3 py-1.5 text-sm rounded-md transition capitalize ${
                    typeFilter === opt
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Deal Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Deal:</span>
            <select
              value={dealFilter}
              onChange={(e) => setDealFilter(e.target.value)}
              className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-sm border border-zinc-700"
            >
              <option value="all">All Deals</option>
              {data?.deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.name}
                </option>
              ))}
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-zinc-500">
            Showing {filteredItems.length} items
          </div>
        </div>
      </div>

      {/* Content List */}
      <main className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              {/* Date Header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-zinc-400">
                  {dateKey === "date-tbd"
                    ? "Date TBD"
                    : new Date(dateKey).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                </span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Items */}
              <div className="space-y-2">
                {itemsByDate.get(dateKey)?.map((item) => (
                  <ContentItemRow
                    key={item.driveId ?? item._id?.toString()}
                    item={item}
                    onStatusChange={(status) => item.driveId && updateItem(item.driveId, { status })}
                    onToggleExtra={() => item.driveId && updateItem(item.driveId, { isExtra: !item.isExtra })}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              No items found. Click "Sync from Drive" to import content.
            </div>
          )}
        </div>
      </main>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={(updates) => selectedItem.driveId && updateItem(selectedItem.driveId, updates)}
        />
      )}
    </div>
  );
}

function DealCard({ deal }: { deal: DealWithProgress }) {
  const progress = deal.progress;
  const isActive = deal.status === "active";

  return (
    <div
      className={`rounded-lg border p-4 ${
        isActive ? "border-blue-600 bg-blue-950/20" : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{deal.name}</h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              isActive ? "bg-blue-600" : "bg-zinc-700"
            }`}
          >
            {deal.status}
          </span>
        </div>
      </div>

      {progress && (
        <div className="grid grid-cols-3 gap-4">
          <ProgressBar
            label="Carousels"
            done={progress.carousels.done}
            total={progress.carousels.total}
          />
          <ProgressBar
            label="Graphics"
            done={progress.graphics.done}
            total={progress.graphics.total}
          />
          <ProgressBar
            label="Videos"
            done={progress.videos.done}
            total={progress.videos.total}
          />
        </div>
      )}
    </div>
  );
}

function ProgressBar({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number | "bonus";
}) {
  const isBonus = total === "bonus";
  const percent = isBonus ? 100 : total > 0 ? Math.min(100, (done / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white">
          {done}
          {!isBonus && `/${total}`}
          {isBonus && " bonus"}
        </span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ContentItemRow({
  item,
  onStatusChange,
  onToggleExtra,
  onClick,
}: {
  item: ContentItem;
  onStatusChange: (status: ContentItemStatus) => void;
  onToggleExtra: () => void;
  onClick: () => void;
}) {
  const statusOption = STATUS_OPTIONS.find((s) => s.value === item.status);

  return (
    <div className="flex items-center gap-4 p-3 bg-zinc-900 rounded-lg hover:bg-zinc-800/50 transition">
      {/* Thumbnail */}
      <button
        onClick={onClick}
        className="w-16 h-16 bg-zinc-800 rounded overflow-hidden flex-shrink-0"
      >
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.topic}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
            No img
          </div>
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onClick}
            className="font-medium truncate hover:underline text-left"
          >
            {item.topic}
          </button>
          {item.isExtra && (
            <span className="text-xs px-1.5 py-0.5 bg-yellow-600/20 text-yellow-400 rounded">
              EXTRA
            </span>
          )}
          {item.needsDate && (
            <span className="text-xs px-1.5 py-0.5 bg-orange-600/20 text-orange-400 rounded">
              NEEDS DATE
            </span>
          )}
        </div>
        <div className="text-sm text-zinc-400 flex items-center gap-2">
          <span className="capitalize">{item.type}</span>
          {item.frameCount && <span>• {item.frameCount} slides</span>}
          {item.subtype && item.subtype !== "other" && (
            <span className="capitalize">• {item.subtype.replace("-", " ")}</span>
          )}
        </div>
      </div>

      {/* Extra Toggle */}
      <button
        onClick={onToggleExtra}
        className={`p-1.5 rounded ${
          item.isExtra
            ? "text-yellow-400 hover:bg-yellow-400/10"
            : "text-zinc-500 hover:bg-zinc-800"
        }`}
        title={item.isExtra ? "Counted as extra" : "Mark as extra"}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
        </svg>
      </button>

      {/* Status Dropdown */}
      <select
        value={item.status}
        onChange={(e) => onStatusChange(e.target.value as ContentItemStatus)}
        className={`px-3 py-1.5 rounded text-sm border-0 cursor-pointer ${statusOption?.color || "bg-zinc-700"}`}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Drive Link */}
      <a
        href={item.finalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
        title="Open in Drive"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
}

function ItemDetailModal({
  item,
  onClose,
  onUpdate,
}: {
  item: ContentItem;
  onClose: () => void;
  onUpdate: (updates: Record<string, unknown>) => void;
}) {
  const [frameIndex, setFrameIndex] = useState(0);

  const currentFrame = item.frames?.[frameIndex];
  const imageUrl = currentFrame?.thumbnailUrl?.replace("w800", "w1200") ||
    item.thumbnailUrl?.replace("w800", "w1200");

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
              {item.type}
              {item.frameCount && ` • ${item.frameCount} slides`}
              {item.subtype && item.subtype !== "other" && ` • ${item.subtype}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg">
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
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="text-zinc-600">No preview available</div>
            )}
          </div>

          {/* Carousel Navigation */}
          {item.frames && item.frames.length > 1 && (
            <>
              <button
                onClick={() => setFrameIndex(Math.max(0, frameIndex - 1))}
                disabled={frameIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 disabled:opacity-30"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setFrameIndex(Math.min(item.frames!.length - 1, frameIndex + 1))}
                disabled={frameIndex === item.frames.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 disabled:opacity-30"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {item.frames.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setFrameIndex(i)}
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
          <div className="flex items-center gap-3">
            {item.isExtra && (
              <span className="text-xs px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded">
                EXTRA (not counted)
              </span>
            )}
            {item.needsDate && (
              <span className="text-xs px-2 py-1 bg-orange-600/20 text-orange-400 rounded">
                NEEDS DATE
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <a
              href={item.finalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm bg-zinc-800 rounded hover:bg-zinc-700"
            >
              Open in Drive
            </a>
            {item.downloadUrl && (
              <a
                href={item.downloadUrl}
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
