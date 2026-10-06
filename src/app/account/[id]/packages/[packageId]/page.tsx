"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "@/contexts/AccountContext";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Video,
  Check,
  Pencil,
  Trash2,
  X,
  Upload,
  ExternalLink,
  Target,
  FileText,
  ChevronDown,
  ChevronRight,
  Download,
  Sparkles,
  Clock,
} from "lucide-react";
import type {
  VideoPackage,
  Episode,
  EpisodeStatus,
  PackageStatus,
} from "@/lib/types/package";
import type { PostMetrics } from "@/lib/types/post";

const packageStatusConfig: Record<
  PackageStatus,
  { label: string; color: string; bgColor: string }
> = {
  planning: {
    label: "Planning",
    color: "text-slate-400",
    bgColor: "bg-slate-800",
  },
  in_production: {
    label: "In Production",
    color: "text-amber-400",
    bgColor: "bg-amber-900/50",
  },
  publishing: {
    label: "Publishing",
    color: "text-blue-400",
    bgColor: "bg-blue-900/50",
  },
  complete: {
    label: "Complete",
    color: "text-emerald-400",
    bgColor: "bg-emerald-900/50",
  },
};

const episodeStatusConfig: Record<
  EpisodeStatus,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  planned: {
    label: "Planned",
    color: "text-slate-400",
    bgColor: "bg-slate-800",
    dotColor: "bg-slate-500",
  },
  scripted: {
    label: "Scripted",
    color: "text-slate-300",
    bgColor: "bg-slate-700",
    dotColor: "bg-slate-400",
  },
  recorded: {
    label: "Recorded",
    color: "text-amber-400",
    bgColor: "bg-amber-900/50",
    dotColor: "bg-amber-400",
  },
  edited: {
    label: "Edited",
    color: "text-orange-400",
    bgColor: "bg-orange-900/50",
    dotColor: "bg-orange-400",
  },
  ready: {
    label: "Ready",
    color: "text-blue-400",
    bgColor: "bg-blue-900/50",
    dotColor: "bg-blue-400",
  },
  published: {
    label: "Published",
    color: "text-emerald-400",
    bgColor: "bg-emerald-900/50",
    dotColor: "bg-emerald-400",
  },
};

interface NewEpisodeForm {
  number: number;
  title: string;
  about: string;
}

interface PublishModalProps {
  episode: Episode;
  packageName: string;
  accountId: string;
  packageId: string;
  onClose: () => void;
  onPublished: () => void;
}

type PublishStep = "container" | "uploading" | "processing" | "publishing" | "done" | "error";

interface PublishState {
  step: PublishStep;
  message: string;
  progress?: number;
  permalink?: string;
  thumbnailUrl?: string;
}

const STEPS: { key: PublishStep; label: string }[] = [
  { key: "container", label: "Creating container" },
  { key: "uploading", label: "Uploading video" },
  { key: "processing", label: "Processing" },
  { key: "publishing", label: "Publishing" },
];

function PublishModal({
  episode,
  packageName,
  accountId,
  packageId,
  onClose,
  onPublished,
}: PublishModalProps) {
  // Form state
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [caption, setCaption] = useState(() => {
    const lines: string[] = [];
    lines.push(episode.title);
    if (episode.about) {
      lines.push("");
      lines.push(episode.about);
    }
    lines.push("");
    lines.push(`Episode ${episode.number} of ${packageName}`);
    lines.push("");
    lines.push("#syntellic #videomarketing #contentcreation");
    return lines.join("\n");
  });

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishState, setPublishState] = useState<PublishState | null>(null);
  const [error, setError] = useState("");

  const handlePublish = async () => {
    if (!videoUrl.trim()) {
      setError("Video URL is required");
      return;
    }

    setIsPublishing(true);
    setError("");
    setPublishState({ step: "container", message: "Starting..." });

    try {
      const response = await fetch(
        `/api/accounts/${accountId}/packages/${packageId}/episodes/${episode.id}/publish-stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoUrl: videoUrl.trim(),
            thumbnailUrl: thumbnailUrl.trim() || undefined,
            caption,
          }),
        }
      );

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              setPublishState({
                step: data.step,
                message: data.message,
                progress: data.progress,
                permalink: data.permalink,
                thumbnailUrl: data.thumbnailUrl,
              });

              if (data.step === "error") {
                setError(data.message);
                setIsPublishing(false);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setIsPublishing(false);
    }
  };

  const getStepStatus = (stepKey: PublishStep): "pending" | "active" | "done" => {
    if (!publishState) return "pending";

    const currentIndex = STEPS.findIndex((s) => s.key === publishState.step);
    const stepIndex = STEPS.findIndex((s) => s.key === stepKey);

    if (publishState.step === "done") return "done";
    if (publishState.step === "error") {
      return stepIndex < currentIndex ? "done" : stepIndex === currentIndex ? "active" : "pending";
    }
    if (stepIndex < currentIndex) return "done";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const isDone = publishState?.step === "done";
  const showForm = !isPublishing && !isDone;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {isDone ? "Published!" : isPublishing ? "Publishing to Instagram" : `Publish Episode ${episode.number}`}
          </h2>
          {!isPublishing && (
            <button
              onClick={isDone ? onPublished : onClose}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex">
          {/* Left: Video Preview */}
          <div className="w-64 bg-black flex-shrink-0 flex flex-col items-center justify-center p-4 border-r border-slate-800">
            {videoUrl ? (
              <div className="relative w-full aspect-[9/16] bg-slate-950 rounded-lg overflow-hidden">
                {isDone && publishState?.thumbnailUrl ? (
                  <img
                    src={publishState.thumbnailUrl}
                    alt="Published thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={videoUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                )}
                {isDone && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full aspect-[9/16] bg-slate-800 rounded-lg flex items-center justify-center">
                <Video className="w-12 h-12 text-slate-600" />
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2 text-center">
              {isDone ? "Cover image" : "Video preview"}
            </p>
          </div>

          {/* Right: Form or Progress */}
          <div className="flex-1 flex flex-col">
            {showForm ? (
              <>
                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                  {/* Video URL */}
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Video URL
                    </label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://cloudinary.com/..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  {/* Thumbnail URL */}
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Cover Image <span className="text-slate-500 font-normal">(optional)</span>
                    </label>
                    <input
                      type="url"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      placeholder="Auto-selected by Instagram"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  {/* Caption */}
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Caption
                    </label>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      rows={5}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                      {error}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={!videoUrl.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-sm font-semibold rounded-lg hover:from-pink-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Share to Instagram
                  </button>
                </div>
              </>
            ) : (
              <div className="p-6 flex-1 flex flex-col">
                {/* Progress Steps */}
                <div className="space-y-3 mb-6">
                  {STEPS.map((step) => {
                    const status = getStepStatus(step.key);
                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                            status === "done"
                              ? "bg-emerald-500"
                              : status === "active"
                              ? "bg-blue-500 animate-pulse"
                              : "bg-slate-700"
                          }`}
                        >
                          {status === "done" ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : status === "active" ? (
                            <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-500" />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            status === "done"
                              ? "text-emerald-400"
                              : status === "active"
                              ? "text-white"
                              : "text-slate-500"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Bar */}
                {publishState && publishState.step === "processing" && (
                  <div className="mb-4">
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                        style={{ width: `${publishState.progress || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {publishState.message}
                    </p>
                  </div>
                )}

                {/* Status Message */}
                {publishState && !isDone && publishState.step !== "processing" && (
                  <p className="text-sm text-slate-400">{publishState.message}</p>
                )}

                {/* Error State */}
                {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                    {error}
                    <button
                      onClick={() => {
                        setError("");
                        setIsPublishing(false);
                        setPublishState(null);
                      }}
                      className="ml-2 underline hover:no-underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {/* Done State */}
                {isDone && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Episode {episode.number} is live!
                    </h3>
                    <p className="text-slate-400 text-sm mb-6">
                      Your Reel has been published to Instagram
                    </p>
                    <div className="flex gap-3">
                      {publishState.permalink && (
                        <a
                          href={publishState.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:from-pink-600 hover:to-orange-600 transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View on Instagram
                        </a>
                      )}
                      <button
                        onClick={onPublished}
                        className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PackageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentAccount } = useAccount();

  const packageId = params.packageId as string;

  const [pkg, setPkg] = useState<VideoPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(false);
  const [editingContext, setEditingContext] = useState(false);
  const [goalText, setGoalText] = useState("");
  const [contextText, setContextText] = useState("");
  const [showNewEpisode, setShowNewEpisode] = useState(false);
  const [newEpisode, setNewEpisode] = useState<NewEpisodeForm>({
    number: 1,
    title: "",
    about: "",
  });
  const [creatingEpisode, setCreatingEpisode] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [episodeMetrics, setEpisodeMetrics] = useState<Record<string, PostMetrics>>({});
  const [expandedProduction, setExpandedProduction] = useState<Record<string, boolean>>({});
  const [importingEpisode, setImportingEpisode] = useState<string | null>(null);

  // Fetch metrics for published episodes
  const fetchEpisodeMetrics = useCallback(async (episodes: Episode[]) => {
    if (!currentAccount) return;

    const publishedEpisodes = episodes.filter(e => e.status === "published" && e.instagramId);
    if (publishedEpisodes.length === 0) return;

    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/posts`);
      const data = await res.json();
      if (data.data) {
        const metricsMap: Record<string, PostMetrics> = {};
        for (const episode of publishedEpisodes) {
          const post = data.data.find((p: { instagramId: string }) => p.instagramId === episode.instagramId);
          if (post?.metrics) {
            metricsMap[episode.id] = post.metrics;
          }
        }
        setEpisodeMetrics(metricsMap);
      }
    } catch (error) {
      console.error("Failed to fetch episode metrics:", error);
    }
  }, [currentAccount]);

  // Import production data from video-system
  const importProductionData = async (episodeId: string, episodeNumber: number) => {
    if (!currentAccount) return;

    // Derive video-system IDs from package name and episode number
    const seriesId = pkg?.name.toLowerCase().replace(/\s+/g, "-") || "10-video-package";
    const videoId = `ep${String(episodeNumber).padStart(2, "0")}`;

    setImportingEpisode(episodeId);
    try {
      const res = await fetch(
        `/api/accounts/${currentAccount.id}/packages/${packageId}/episodes/${episodeId}/import-production`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seriesId, videoId }),
        }
      );

      if (res.ok) {
        fetchPackage();
        setExpandedProduction((prev) => ({ ...prev, [episodeId]: true }));
      } else {
        const data = await res.json();
        alert(`Import failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to import production data:", error);
      alert("Failed to import production data");
    } finally {
      setImportingEpisode(null);
    }
  };

  const fetchPackage = useCallback(async () => {
    if (!currentAccount) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/accounts/${currentAccount.id}/packages/${packageId}`
      );
      const data = await res.json();
      if (data.data) {
        setPkg(data.data);
        setGoalText(data.data.goal || "");
        setContextText(data.data.context || "");
        // Set next episode number
        const maxNum = Math.max(0, ...data.data.episodes.map((e: Episode) => e.number));
        setNewEpisode((prev) => ({ ...prev, number: maxNum + 1 }));
        // Fetch metrics for published episodes
        fetchEpisodeMetrics(data.data.episodes);
      }
    } catch (error) {
      console.error("Failed to fetch package:", error);
    } finally {
      setLoading(false);
    }
  }, [currentAccount, packageId]);

  useEffect(() => {
    fetchPackage();
  }, [fetchPackage]);

  const updatePackage = async (updates: Partial<VideoPackage>) => {
    if (!currentAccount) return;
    await fetch(`/api/accounts/${currentAccount.id}/packages/${packageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    fetchPackage();
  };

  const handleSaveGoal = async () => {
    await updatePackage({ goal: goalText });
    setEditingGoal(false);
  };

  const handleSaveContext = async () => {
    await updatePackage({ context: contextText });
    setEditingContext(false);
  };

  const handleAddEpisode = async () => {
    if (!currentAccount || !newEpisode.title.trim()) return;
    setCreatingEpisode(true);
    try {
      await fetch(
        `/api/accounts/${currentAccount.id}/packages/${packageId}/episodes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEpisode),
        }
      );
      setShowNewEpisode(false);
      setNewEpisode({ number: newEpisode.number + 1, title: "", about: "" });
      fetchPackage();
    } finally {
      setCreatingEpisode(false);
    }
  };

  const updateEpisodeStatus = async (episodeId: string, status: EpisodeStatus) => {
    if (!currentAccount) return;
    await fetch(
      `/api/accounts/${currentAccount.id}/packages/${packageId}/episodes/${episodeId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    fetchPackage();
  };

  const deleteEpisode = async (episodeId: string) => {
    if (!currentAccount) return;
    if (!confirm("Delete this episode?")) return;
    await fetch(
      `/api/accounts/${currentAccount.id}/packages/${packageId}/episodes/${episodeId}`,
      { method: "DELETE" }
    );
    fetchPackage();
  };

  if (!currentAccount) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">Select an account</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">Package not found</p>
      </div>
    );
  }

  const statusConfig = packageStatusConfig[pkg.status];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push(`/account/${currentAccount.id}/packages`)}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All Packages
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{pkg.name}</h1>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
          </div>
          {pkg.description && (
            <p className="text-slate-400">{pkg.description}</p>
          )}
        </div>
      </div>

      {/* Goal & Context */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Goal */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-slate-400">Goal</span>
            </div>
            {!editingGoal && (
              <button
                onClick={() => setEditingGoal(true)}
                className="p-1 text-slate-500 hover:text-white transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {editingGoal ? (
            <div className="space-y-2">
              <textarea
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                placeholder="What does this package prove?"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveGoal}
                  className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-md hover:bg-emerald-500/30 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingGoal(false);
                    setGoalText(pkg.goal || "");
                  }}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white leading-relaxed">
              {pkg.goal || (
                <span className="text-slate-500 italic">No goal set</span>
              )}
            </p>
          )}
        </div>

        {/* Context */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-400">Context</span>
            </div>
            {!editingContext && (
              <button
                onClick={() => setEditingContext(true)}
                className="p-1 text-slate-500 hover:text-white transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {editingContext ? (
            <div className="space-y-2">
              <textarea
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                placeholder="Background context for this package"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveContext}
                  className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingContext(false);
                    setContextText(pkg.context || "");
                  }}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white leading-relaxed">
              {pkg.context || (
                <span className="text-slate-500 italic">No context set</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Episodes */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Episodes ({pkg.episodes.length})
        </h2>
        <button
          onClick={() => setShowNewEpisode(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Episode
        </button>
      </div>

      {pkg.episodes.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
          <Video className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">No episodes yet</p>
          <button
            onClick={() => setShowNewEpisode(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-slate-800 border border-slate-700 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add first episode
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pkg.episodes
            .sort((a, b) => a.number - b.number)
            .map((episode) => {
              const epConfig = episodeStatusConfig[episode.status];

              return (
                <div
                  key={episode.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    {/* Episode number */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <span className="text-sm font-mono text-slate-400">
                        {String(episode.number).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-white">
                          {episode.title}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${epConfig.bgColor} ${epConfig.color}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${epConfig.dotColor}`}
                          />
                          {epConfig.label}
                        </span>
                      </div>
                      {episode.about && (
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {episode.about}
                        </p>
                      )}
                      {episode.postPermalink && (
                        <a
                          href={episode.postPermalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 mt-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View on Instagram
                        </a>
                      )}

                      {/* Metrics for published episodes */}
                      {episode.status === "published" && episodeMetrics[episode.id] && (
                        <div className="mt-3 pt-3 border-t border-slate-800">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            <span className="text-slate-400">
                              <span className="text-white font-medium">{episodeMetrics[episode.id].reach.toLocaleString()}</span> reach
                            </span>
                            <span className="text-slate-400">
                              <span className="text-white font-medium">{(episodeMetrics[episode.id].videoViews || episodeMetrics[episode.id].impressions).toLocaleString()}</span> views
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-1">
                            <span className="text-slate-400">
                              <span className="text-white font-medium">{episodeMetrics[episode.id].likes}</span> likes
                            </span>
                            <span className="text-slate-400">
                              <span className="text-white font-medium">{episodeMetrics[episode.id].comments}</span> comments
                            </span>
                            <span className="text-slate-400">
                              <span className="text-white font-medium">{episodeMetrics[episode.id].saves || 0}</span> saves
                            </span>
                            <span className="text-slate-400">
                              <span className="text-white font-medium">{episodeMetrics[episode.id].shares || 0}</span> shares
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Production Details */}
                      <div className="mt-3 pt-3 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setExpandedProduction((prev) => ({
                              ...prev,
                              [episode.id]: !prev[episode.id],
                            }))}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                          >
                            {expandedProduction[episode.id] ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                            Production Details
                            {episode.productionData && (
                              <span className="text-emerald-400 text-[10px] ml-1">● imported</span>
                            )}
                          </button>

                          {!episode.productionData && (
                            <button
                              onClick={() => importProductionData(episode.id, episode.number)}
                              disabled={importingEpisode === episode.id}
                              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                            >
                              {importingEpisode === episode.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              Import from video-system
                            </button>
                          )}
                        </div>

                        {expandedProduction[episode.id] && episode.productionData && (
                          <div className="mt-3 space-y-3 text-xs">
                            {/* Duration & Techniques */}
                            <div className="flex flex-wrap gap-2">
                              {episode.duration && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 rounded text-slate-300">
                                  <Clock className="w-3 h-3" />
                                  {episode.duration}s
                                </span>
                              )}
                              {episode.productionData.techniques?.map((t) => (
                                <span
                                  key={t}
                                  className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>

                            {/* Hook */}
                            {episode.productionData.hook && (
                              <div>
                                <span className="text-slate-500">Hook:</span>{" "}
                                <span className="text-slate-300">"{episode.productionData.hook}"</span>
                              </div>
                            )}

                            {/* AI Summary */}
                            {episode.productionData.summary?.oneLiner && (
                              <div className="p-2 bg-slate-800/50 rounded-lg">
                                <div className="flex items-center gap-1 text-amber-400 mb-1">
                                  <Sparkles className="w-3 h-3" />
                                  <span className="font-medium">Summary</span>
                                </div>
                                <p className="text-slate-300 leading-relaxed">
                                  {episode.productionData.summary.oneLiner}
                                </p>
                              </div>
                            )}

                            {/* Animations */}
                            {episode.productionData.animations && episode.productionData.animations.length > 0 && (
                              <div>
                                <span className="text-slate-500 block mb-1.5">Animations ({episode.productionData.animations.length}):</span>
                                <div className="space-y-1.5">
                                  {episode.productionData.animations.map((anim, i) => (
                                    <div
                                      key={i}
                                      className="flex items-start gap-2 p-1.5 bg-slate-800/50 rounded"
                                    >
                                      <span className="text-slate-500 font-mono whitespace-nowrap">
                                        {anim.timestamp}
                                      </span>
                                      <span className="text-cyan-400 font-medium">
                                        {anim.pattern}
                                      </span>
                                      {anim.assets && anim.assets.length > 0 && (
                                        <span className="text-slate-500">
                                          ({anim.assets.join(", ")})
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Key Points */}
                            {episode.productionData.keyPoints && episode.productionData.keyPoints.length > 0 && (
                              <div>
                                <span className="text-slate-500 block mb-1">Key Points:</span>
                                <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                                  {episode.productionData.keyPoints.map((point, i) => (
                                    <li key={i}>{point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Transcript (collapsible) */}
                            {episode.productionData.transcript && (
                              <details className="group">
                                <summary className="text-slate-500 cursor-pointer hover:text-slate-300">
                                  Transcript
                                </summary>
                                <pre className="mt-2 p-2 bg-slate-800/50 rounded text-slate-300 whitespace-pre-wrap text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                                  {episode.productionData.transcript}
                                </pre>
                              </details>
                            )}

                            {/* Tags */}
                            {episode.productionData.summary?.tags && episode.productionData.summary.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {episode.productionData.summary.tags.slice(0, 6).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded text-[10px]"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {episode.productionData.summary.tags.length > 6 && (
                                  <span className="text-slate-500 text-[10px]">
                                    +{episode.productionData.summary.tags.length - 6} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Status dropdown */}
                      <select
                        value={episode.status}
                        onChange={(e) =>
                          updateEpisodeStatus(
                            episode.id,
                            e.target.value as EpisodeStatus
                          )
                        }
                        className="text-xs bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="planned">Planned</option>
                        <option value="scripted">Scripted</option>
                        <option value="recorded">Recorded</option>
                        <option value="edited">Edited</option>
                        <option value="ready">Ready</option>
                        <option value="published">Published</option>
                      </select>

                      {/* Publish button (shown when ready) */}
                      {episode.status === "ready" && (
                        <button
                          onClick={() => setSelectedEpisode(episode)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-md hover:bg-emerald-500/30 transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          Publish
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => deleteEpisode(episode.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* New Episode Modal */}
      {showNewEpisode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">New Episode</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    #
                  </label>
                  <input
                    type="number"
                    value={newEpisode.number}
                    onChange={(e) =>
                      setNewEpisode({
                        ...newEpisode,
                        number: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newEpisode.title}
                    onChange={(e) =>
                      setNewEpisode({ ...newEpisode, title: e.target.value })
                    }
                    placeholder="Episode title"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  About (optional)
                </label>
                <textarea
                  value={newEpisode.about}
                  onChange={(e) =>
                    setNewEpisode({ ...newEpisode, about: e.target.value })
                  }
                  placeholder="What this episode covers..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowNewEpisode(false);
                  setNewEpisode({ ...newEpisode, title: "", about: "" });
                }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEpisode}
                disabled={!newEpisode.title.trim() || creatingEpisode}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {creatingEpisode && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Episode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {selectedEpisode && (
        <PublishModal
          episode={selectedEpisode}
          packageName={pkg.name}
          accountId={currentAccount.id}
          packageId={packageId}
          onClose={() => setSelectedEpisode(null)}
          onPublished={() => {
            setSelectedEpisode(null);
            fetchPackage();
          }}
        />
      )}
    </div>
  );
}
