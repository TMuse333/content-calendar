"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Clock, Send, Trash2, Loader2, ExternalLink, CheckCircle, XCircle, X, Pencil, Check, ChevronLeft, ChevronRight } from "lucide-react";

interface ScheduledCarousel {
  id: string;
  accountId: string;
  imageUrls: string[];
  caption: string;
  scheduledFor: string;
  status: "pending" | "publishing" | "published" | "failed";
  createdAt: string;
  publishedAt?: string;
  mediaId?: string;
  error?: string;
}

interface EditModalProps {
  carousel: ScheduledCarousel;
  onClose: () => void;
  onSave: (caption: string) => void;
  onPublish: () => void;
  publishing: boolean;
}

function EditModal({ carousel, onClose, onSave, onPublish, publishing }: EditModalProps) {
  const [caption, setCaption] = useState(carousel.caption);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [saving, setSaving] = useState(false);
  const hasChanges = caption !== carousel.caption;

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    await onSave(caption);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Edit Carousel
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex">
          {/* Left: Carousel Preview */}
          <div className="w-80 bg-black flex-shrink-0 flex flex-col items-center justify-center p-6 border-r border-slate-800">
            <div className="relative w-full aspect-square bg-slate-950 rounded-lg overflow-hidden">
              <img
                src={carousel.imageUrls[currentSlide]}
                alt={`Slide ${currentSlide + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Slide Navigation */}
              {carousel.imageUrls.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + carousel.imageUrls.length) % carousel.imageUrls.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % carousel.imageUrls.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Slide Indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {carousel.imageUrls.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentSlide ? "bg-white" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="flex gap-2 mt-4 overflow-x-auto py-1">
              {carousel.imageUrls.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden transition-all ${
                    i === currentSlide ? "ring-2 ring-emerald-500" : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 right-0.5 px-1 py-0.5 bg-black/60 text-white text-[10px] rounded">
                    {i + 1}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-500 mt-3">
              {carousel.imageUrls.length} slides
            </p>
          </div>

          {/* Right: Caption Editor */}
          <div className="flex-1 flex flex-col">
            <div className="p-6 flex-1 overflow-y-auto">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={12}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none leading-relaxed"
              />
              <p className="text-xs text-slate-500 mt-2">
                {caption.length} characters
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
              <div>
                {hasChanges && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Changes
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onPublish}
                  disabled={publishing || hasChanges}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-sm font-semibold rounded-lg hover:from-pink-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {publishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {hasChanges ? "Save first" : "Publish Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScheduledPage() {
  const params = useParams();
  const accountId = params.id as string;
  const [scheduled, setScheduled] = useState<ScheduledCarousel[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [selectedCarousel, setSelectedCarousel] = useState<ScheduledCarousel | null>(null);

  useEffect(() => {
    fetchScheduled();
  }, [accountId]);

  const fetchScheduled = async () => {
    try {
      const res = await fetch(`/api/carousel/schedule?accountId=${accountId}`);
      const data = await res.json();
      setScheduled(data.scheduled || []);
    } catch (error) {
      console.error("Failed to fetch scheduled:", error);
    } finally {
      setLoading(false);
    }
  };

  const publishNow = async () => {
    setPublishing("all");
    try {
      const res = await fetch("/api/cron/publish-scheduled", { method: "POST" });
      const data = await res.json();
      console.log("Publish result:", data);
      await fetchScheduled();
      setSelectedCarousel(null);
    } catch (error) {
      console.error("Publish failed:", error);
    } finally {
      setPublishing(null);
    }
  };

  const updateCaption = async (carouselId: string, newCaption: string) => {
    try {
      const res = await fetch(`/api/carousel/schedule/${carouselId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: newCaption }),
      });
      if (res.ok) {
        await fetchScheduled();
        // Update selected carousel with new caption
        setSelectedCarousel((prev) => prev ? { ...prev, caption: newCaption } : null);
      }
    } catch (error) {
      console.error("Failed to update caption:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isPastDue = (dateStr: string) => {
    return new Date(dateStr) <= new Date();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Scheduled Posts</h1>
          <p className="text-slate-500 mt-1">Carousels waiting to be published</p>
        </div>
        {scheduled.some((s) => s.status === "pending" && isPastDue(s.scheduledFor)) && (
          <button
            onClick={publishNow}
            disabled={!!publishing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {publishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Publish Due Posts
          </button>
        )}
      </div>

      {scheduled.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No scheduled posts</p>
          <p className="text-slate-500 text-sm mt-1">
            Schedule carousels via the API to see them here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {scheduled.map((carousel) => (
            <div
              key={carousel.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      carousel.status === "published"
                        ? "bg-emerald-500/20"
                        : carousel.status === "failed"
                        ? "bg-red-500/20"
                        : isPastDue(carousel.scheduledFor)
                        ? "bg-amber-500/20"
                        : "bg-blue-500/20"
                    }`}
                  >
                    {carousel.status === "published" ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : carousel.status === "failed" ? (
                      <XCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <Clock
                        className={`w-5 h-5 ${
                          isPastDue(carousel.scheduledFor)
                            ? "text-amber-400"
                            : "text-blue-400"
                        }`}
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {carousel.imageUrls.length}-Slide Carousel
                    </p>
                    <p className="text-sm text-slate-500">
                      {carousel.status === "published"
                        ? `Published ${formatDate(carousel.publishedAt!)}`
                        : carousel.status === "failed"
                        ? "Failed to publish"
                        : isPastDue(carousel.scheduledFor)
                        ? `Due ${formatDate(carousel.scheduledFor)}`
                        : `Scheduled for ${formatDate(carousel.scheduledFor)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {carousel.status === "pending" && isPastDue(carousel.scheduledFor) && (
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                      Ready to publish
                    </span>
                  )}
                  {carousel.status === "pending" && (
                    <button
                      onClick={() => setSelectedCarousel(carousel)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                  {carousel.status === "published" && carousel.mediaId && (
                    <a
                      href={`https://www.instagram.com/p/${carousel.mediaId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-slate-400 hover:text-white"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View
                    </a>
                  )}
                </div>
              </div>

              {/* Image Preview */}
              <div className="p-4 flex gap-2 overflow-x-auto">
                {carousel.imageUrls.map((url, i) => (
                  <div
                    key={i}
                    className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-800"
                  >
                    <img
                      src={url}
                      alt={`Slide ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>

              {/* Caption Preview */}
              <div className="px-4 pb-4">
                <p className="text-sm text-slate-400 whitespace-pre-wrap line-clamp-3">
                  {carousel.caption}
                </p>
              </div>

              {/* Error message if failed */}
              {carousel.status === "failed" && carousel.error && (
                <div className="px-4 pb-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">{carousel.error}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {selectedCarousel && (
        <EditModal
          carousel={selectedCarousel}
          onClose={() => setSelectedCarousel(null)}
          onSave={(caption) => updateCaption(selectedCarousel.id, caption)}
          onPublish={publishNow}
          publishing={!!publishing}
        />
      )}
    </div>
  );
}
