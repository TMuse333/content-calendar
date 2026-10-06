"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/contexts/AccountContext";
import {
  Loader2,
  Plus,
  Package,
  Image,
  LayoutGrid,
  AlertCircle,
} from "lucide-react";
import type { GraphicPackage } from "@/lib/types/graphic-package";

export default function GraphicsPage() {
  const router = useRouter();
  const { currentAccount } = useAccount();
  const [packages, setPackages] = useState<GraphicPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPackage, setShowNewPackage] = useState(false);
  const [creating, setCreating] = useState(false);

  // New package form
  const [newPackage, setNewPackage] = useState({
    name: "",
    type: "announcements" as "announcements" | "carousels",
    allocation: 16,
    price: 540,
    monthlyFrequency: 8,
    monthlyRate: 1000,
  });

  const fetchPackages = useCallback(async () => {
    if (!currentAccount) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/graphic-packages`);
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

  const handleCreatePackage = async () => {
    if (!currentAccount || !newPackage.name.trim()) return;
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: newPackage.name,
        type: newPackage.type,
      };

      if (newPackage.type === "announcements") {
        body.allocation = newPackage.allocation;
        body.price = newPackage.price;
      } else {
        body.monthlyFrequency = newPackage.monthlyFrequency;
        body.monthlyRate = newPackage.monthlyRate;
      }

      const res = await fetch(`/api/accounts/${currentAccount.id}/graphic-packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowNewPackage(false);
        setNewPackage({
          name: "",
          type: "announcements",
          allocation: 16,
          price: 540,
          monthlyFrequency: 8,
          monthlyRate: 1000,
        });
        fetchPackages();
      }
    } finally {
      setCreating(false);
    }
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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Graphic Packages</h1>
          <p className="text-slate-400 mt-1">
            Manage client graphic packages and usage
          </p>
        </div>
        <button
          onClick={() => setShowNewPackage(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Package
        </button>
      </div>

      {/* Packages List */}
      {packages.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-xl">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No graphic packages yet</p>
          <p className="text-sm text-slate-500 mb-6">
            Create a package to start tracking graphics for this client
          </p>
          <button
            onClick={() => setShowNewPackage(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create first package
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {packages.map((pkg) => {
            const isAnnouncements = pkg.type === "announcements";
            const remaining = isAnnouncements
              ? (pkg.allocation || 0) - (pkg.used || 0)
              : null;
            const lowStock = remaining !== null && remaining <= 2;

            return (
              <div
                key={pkg.id}
                onClick={() => router.push(`/account/${currentAccount.id}/graphics/${pkg.id}`)}
                className="p-5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isAnnouncements
                          ? "bg-blue-500/20"
                          : "bg-purple-500/20"
                      }`}
                    >
                      {isAnnouncements ? (
                        <Image className="w-6 h-6 text-blue-400" />
                      ) : (
                        <LayoutGrid className="w-6 h-6 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white group-hover:text-emerald-400 transition-colors">
                        {pkg.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {isAnnouncements ? "Announcement Package" : "Carousel Subscription"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {isAnnouncements ? (
                      <>
                        <div className="flex items-center gap-2">
                          {lowStock && (
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                          )}
                          <span
                            className={`text-2xl font-bold ${
                              lowStock ? "text-amber-400" : "text-white"
                            }`}
                          >
                            {pkg.used || 0}/{pkg.allocation || 0}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {remaining} remaining • ${pkg.price}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-white">
                          {pkg.monthlyFrequency}/mo
                        </span>
                        <p className="text-sm text-slate-500">
                          ${pkg.monthlyRate}/month
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <div className="mt-4 flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      pkg.status === "proposed"
                        ? "bg-blue-500/20 text-blue-400"
                        : pkg.status === "active"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : pkg.status === "paused"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-slate-500/20 text-slate-400"
                    }`}
                  >
                    {pkg.status === "proposed" ? "Pending Approval" : pkg.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Package Modal */}
      {showNewPackage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">New Graphic Package</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Package Name
                </label>
                <input
                  type="text"
                  value={newPackage.name}
                  onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                  placeholder="e.g., Announcement Package #1"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  autoFocus
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Package Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewPackage({ ...newPackage, type: "announcements" })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      newPackage.type === "announcements"
                        ? "bg-blue-500/20 border-blue-500/50 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <Image className="w-5 h-5 mb-1" />
                    <span className="text-sm font-medium block">Announcements</span>
                    <span className="text-xs text-slate-500">Fixed allocation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPackage({ ...newPackage, type: "carousels" })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      newPackage.type === "carousels"
                        ? "bg-purple-500/20 border-purple-500/50 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <LayoutGrid className="w-5 h-5 mb-1" />
                    <span className="text-sm font-medium block">Carousels</span>
                    <span className="text-xs text-slate-500">Monthly subscription</span>
                  </button>
                </div>
              </div>

              {/* Type-specific fields */}
              {newPackage.type === "announcements" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Allocation
                    </label>
                    <input
                      type="number"
                      value={newPackage.allocation}
                      onChange={(e) =>
                        setNewPackage({ ...newPackage, allocation: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      value={newPackage.price}
                      onChange={(e) =>
                        setNewPackage({ ...newPackage, price: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Per Month
                    </label>
                    <input
                      type="number"
                      value={newPackage.monthlyFrequency}
                      onChange={(e) =>
                        setNewPackage({
                          ...newPackage,
                          monthlyFrequency: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Monthly Rate ($)
                    </label>
                    <input
                      type="number"
                      value={newPackage.monthlyRate}
                      onChange={(e) =>
                        setNewPackage({
                          ...newPackage,
                          monthlyRate: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
              <button
                onClick={() => setShowNewPackage(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePackage}
                disabled={!newPackage.name.trim() || creating}
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
