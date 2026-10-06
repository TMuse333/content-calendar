"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount } from "@/contexts/AccountContext";
import {
  Upload,
  Loader2,
  User,
  Image as ImageIcon,
  Briefcase,
  Mountain,
  Home,
  MoreHorizontal,
  Star,
  Trash2,
  Tag,
  Check,
  X,
  Plus,
} from "lucide-react";
import type { Asset, AssetType, AssetLibrarySummary } from "@/lib/types/asset";

const assetTypeConfig: Record<
  AssetType,
  { label: string; icon: typeof User; color: string; bgColor: string }
> = {
  headshot: {
    label: "Headshots",
    icon: User,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  logo: {
    label: "Logos",
    icon: Briefcase,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  property: {
    label: "Properties",
    icon: Home,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
  },
  landscape: {
    label: "Landscapes",
    icon: Mountain,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  community: {
    label: "Community",
    icon: ImageIcon,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  testimonial: {
    label: "Testimonials",
    icon: User,
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
  },
  icon: {
    label: "Icons",
    icon: ImageIcon,
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
  },
  other: {
    label: "Other",
    icon: ImageIcon,
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
  },
};

export default function AssetsPage() {
  const { currentAccount } = useAccount();
  const [library, setLibrary] = useState<AssetLibrarySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<AssetType>("headshot");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = useCallback(async () => {
    if (!currentAccount) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/accounts/${currentAccount.id}/assets?grouped=true`
      );
      const data = await res.json();
      if (data.data) setLibrary(data.data);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
    }
  }, [currentAccount]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !currentAccount) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", selectedType);
        formData.append("name", file.name.replace(/\.[^.]+$/, ""));

        await fetch(`/api/accounts/${currentAccount.id}/assets`, {
          method: "POST",
          body: formData,
        });
      }
      fetchAssets();
      setShowUploadModal(false);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (asset: Asset) => {
    if (!currentAccount) return;
    try {
      await fetch(`/api/accounts/${currentAccount.id}/assets/${asset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });
      fetchAssets();
    } catch (error) {
      console.error("Failed to set primary:", error);
    }
  };

  const handleDelete = async (asset: Asset) => {
    if (!currentAccount) return;
    if (!confirm("Delete this asset? This cannot be undone.")) return;

    try {
      await fetch(`/api/accounts/${currentAccount.id}/assets/${asset.id}`, {
        method: "DELETE",
      });
      fetchAssets();
    } catch (error) {
      console.error("Failed to delete:", error);
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

  const currentAssets = library
    ? selectedType === "headshot"
      ? library.headshots
      : selectedType === "logo"
      ? library.logos
      : selectedType === "property"
      ? library.properties
      : selectedType === "landscape"
      ? library.landscapes
      : selectedType === "community"
      ? library.community
      : library.other
    : [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Asset Library</h1>
          <p className="text-slate-400 mt-1">
            Manage images for your carousels and graphics
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-all"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {(Object.entries(assetTypeConfig) as [AssetType, typeof assetTypeConfig.headshot][])
          .filter(([type]) => !["icon", "other", "testimonial"].includes(type))
          .map(([type, config]) => {
            const Icon = config.icon;
            const count =
              type === "headshot"
                ? library?.headshots.length
                : type === "logo"
                ? library?.logos.length
                : type === "property"
                ? library?.properties.length
                : type === "landscape"
                ? library?.landscapes.length
                : type === "community"
                ? library?.community.length
                : library?.other.length;

            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedType === type
                    ? `${config.bgColor} ${config.color}`
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {config.label}
                {count !== undefined && count > 0 && (
                  <span className="text-xs opacity-70">({count})</span>
                )}
              </button>
            );
          })}
      </div>

      {/* Asset Grid */}
      {currentAssets.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-xl">
          <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">
            No {assetTypeConfig[selectedType].label.toLowerCase()} yet
          </p>
          <p className="text-sm text-slate-500 mb-4">
            Upload images to use in your carousels
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Upload {assetTypeConfig[selectedType].label}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentAssets.map((asset) => (
            <div
              key={asset.id}
              className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors"
            >
              {/* Image */}
              <div className="aspect-square relative">
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
                {/* Primary badge */}
                {asset.isPrimary && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-amber-500/90 rounded-full">
                    <Star className="w-3 h-3 text-white fill-white" />
                    <span className="text-xs font-medium text-white">Primary</span>
                  </div>
                )}
                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!asset.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(asset)}
                      className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                      title="Set as primary"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(asset)}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-white truncate">
                  {asset.name}
                </p>
                {asset.tags && asset.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Tag className="w-3 h-3 text-slate-500" />
                    <p className="text-xs text-slate-500 truncate">
                      {asset.tags.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Upload Card */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="aspect-square border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-400 hover:border-slate-600 transition-colors"
          >
            <Plus className="w-8 h-8" />
            <span className="text-sm">Add More</span>
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Upload Assets</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Asset Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(assetTypeConfig) as [AssetType, typeof assetTypeConfig.headshot][])
                    .filter(([type]) => !["icon", "other", "testimonial"].includes(type))
                    .map(([type, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={type}
                          onClick={() => setSelectedType(type)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-colors ${
                            selectedType === type
                              ? `${config.bgColor} border-current ${config.color}`
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs">{config.label}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleUpload(e.dataTransfer.files);
                }}
                className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-slate-600 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
                {uploading ? (
                  <Loader2 className="w-10 h-10 text-slate-500 animate-spin mx-auto mb-3" />
                ) : (
                  <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                )}
                <p className="text-slate-400 mb-1">
                  {uploading ? "Uploading..." : "Drop images here or click to browse"}
                </p>
                <p className="text-xs text-slate-500">JPEG, PNG, WebP up to 10MB</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
