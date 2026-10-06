"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/contexts/AccountContext";
import {
  Clapperboard,
  Plus,
  Loader2,
  ChevronRight,
  Video,
} from "lucide-react";
import type { VideoPackage, PackageStatus } from "@/lib/types/package";

const statusConfig: Record<
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

export default function PackagesPage() {
  const { currentAccount } = useAccount();
  const router = useRouter();
  const [packages, setPackages] = useState<VideoPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchPackages = useCallback(async () => {
    if (!currentAccount) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/packages`);
      const data = await res.json();
      if (data.data) {
        setPackages(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch packages:", error);
    } finally {
      setLoading(false);
    }
  }, [currentAccount]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleCreate = async () => {
    if (!currentAccount || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (data.packageId) {
        router.push(`/account/${currentAccount.id}/packages/${data.packageId}`);
      }
    } finally {
      setCreating(false);
      setShowNewModal(false);
      setNewName("");
    }
  };

  if (!currentAccount) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">Select an account to view packages</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
            <Clapperboard className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Video Packages</h1>
            <p className="text-sm text-slate-400">
              Plan and track video series
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-5 h-5" />
          New Package
        </button>
      </div>

      {/* Packages List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
            <Clapperboard className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            No packages yet
          </h3>
          <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
            Create a video package to plan and track a series of videos.
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create your first package
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => {
            const config = statusConfig[pkg.status];
            const episodeCount = pkg.episodes.length;
            const publishedCount = pkg.episodes.filter(
              (e) => e.status === "published"
            ).length;

            return (
              <button
                key={pkg._id?.toString()}
                onClick={() =>
                  router.push(
                    `/account/${currentAccount.id}/packages/${pkg._id}`
                  )
                }
                className="w-full p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                    <Video className="w-5 h-5 text-slate-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-white truncate">
                        {pkg.name}
                      </h3>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}
                      >
                        {config.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {episodeCount} episode{episodeCount !== 1 ? "s" : ""}
                      {publishedCount > 0 && (
                        <span className="text-emerald-500">
                          {" "}
                          · {publishedCount} published
                        </span>
                      )}
                    </p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* New Package Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">New Package</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Package Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., 10-Video Package"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    handleCreate();
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setNewName("");
                }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Package
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
