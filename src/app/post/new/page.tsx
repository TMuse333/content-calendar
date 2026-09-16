"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload, X, ChevronDown, Calendar, Clock } from "lucide-react";
import Link from "next/link";

// New Post page - create and schedule content

const UNDERLYING_NEEDS = [
  { value: "security", label: "Security", description: "They want to feel safe / reduce risk" },
  { value: "status", label: "Status", description: "They want to be seen as X" },
  { value: "belonging", label: "Belonging", description: "They want to be part of something" },
  { value: "autonomy", label: "Autonomy", description: "They want control over their situation" },
  { value: "certainty", label: "Certainty", description: "They want to know the path forward" },
  { value: "growth", label: "Growth", description: "They want to become better" },
  { value: "meaning", label: "Meaning", description: "They want what they do to matter" },
];

// Mock info points - will come from account settings
const mockInfoPoints = [
  { id: "who-i-am", text: "Who Thomas is and his background" },
  { id: "video-vs-web", text: "Why video > websites for trust" },
  { id: "deep-work", text: "Deep work enables quality output" },
  { id: "systems", text: "Systems > motivation" },
  { id: "info-theory", text: "Information theory basics" },
  { id: "built-system", text: "How I built the video system" },
  { id: "the-offer", text: "The offer / how to work together" },
];

function NewPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedInfoPoint = searchParams.get("infoPoint");

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedInfoPoints, setSelectedInfoPoints] = useState<string[]>(
    preselectedInfoPoint ? [preselectedInfoPoint] : []
  );
  const [underlyingNeed, setUnderlyingNeed] = useState<string>("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [showDeeperThinking, setShowDeeperThinking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
    }
  };

  const toggleInfoPoint = (id: string) => {
    setSelectedInfoPoints((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (status: "draft" | "scheduled") => {
    setIsSubmitting(true);

    // TODO: Upload media and create post via API
    console.log({
      mediaFile,
      caption,
      selectedInfoPoints,
      underlyingNeed,
      deliveryNotes,
      scheduledDate,
      scheduledTime,
      status,
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    router.push(status === "scheduled" ? "/" : "/queue");
  };

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">New Post</h1>
        <Link
          href="/"
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </Link>
      </div>

      <div className="space-y-6">
        {/* Media Upload */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Media
          </label>
          {mediaPreview ? (
            <div className="relative">
              <div className="aspect-square max-w-xs bg-zinc-800 rounded-xl overflow-hidden">
                {mediaFile?.type.startsWith("video") ? (
                  <video
                    src={mediaPreview}
                    className="w-full h-full object-cover"
                    controls
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <button
                onClick={removeMedia}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-48 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-zinc-600 transition-colors">
              <Upload className="w-8 h-8 text-zinc-500 mb-2" />
              <span className="text-sm text-zinc-400">
                Drop media or click to upload
              </span>
              <span className="text-xs text-zinc-500 mt-1">
                Images or videos
              </span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Caption */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            placeholder="Write your caption..."
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 resize-none"
          />
        </div>

        {/* Information Points */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            What information does this transmit?
          </label>
          <div className="flex flex-wrap gap-2">
            {mockInfoPoints.map((point) => (
              <button
                key={point.id}
                onClick={() => toggleInfoPoint(point.id)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  selectedInfoPoints.includes(point.id)
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {point.text}
              </button>
            ))}
          </div>
        </div>

        {/* Deeper Thinking (collapsible) */}
        <div>
          <button
            onClick={() => setShowDeeperThinking(!showDeeperThinking)}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showDeeperThinking ? "rotate-180" : ""
              }`}
            />
            Deeper thinking (optional)
          </button>

          {showDeeperThinking && (
            <div className="mt-4 space-y-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
              {/* Underlying Need */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Underlying need
                </label>
                <select
                  value={underlyingNeed}
                  onChange={(e) => setUnderlyingNeed(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
                >
                  <option value="">Select a need...</option>
                  {UNDERLYING_NEEDS.map((need) => (
                    <option key={need.value} value={need.value}>
                      {need.label} - {need.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery Notes */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Delivery notes
                </label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={2}
                  placeholder="Imagery, tone, techniques (e.g., 'fog → clarity metaphor, calm tone')"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Schedule
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
              />
            </div>
            <div className="relative w-32">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={() => handleSubmit("draft")}
            disabled={isSubmitting}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSubmit("scheduled")}
            disabled={isSubmitting || !scheduledDate}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Scheduling..." : "Schedule Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewPostPage() {
  return (
    <Suspense fallback={<div className="p-6 text-zinc-400">Loading...</div>}>
      <NewPostContent />
    </Suspense>
  );
}
