"use client";

import { useState, useEffect } from "react";
import { Check, Plus, Image, Loader2, X } from "lucide-react";
import type { WizardData } from "./index";
import type { Asset, AssetType } from "@/lib/types/asset";

interface StepAssetsProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  accountId: string;
}

export function StepAssets({ data, updateData, accountId }: StepAssetsProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingFor, setSelectingFor] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAssets() {
      try {
        const res = await fetch(`/api/accounts/${accountId}/assets`);
        if (res.ok) {
          const result = await res.json();
          setAssets(result.data || []);

          // Auto-select primary assets for required fields
          if (data.formatData) {
            const autoSelected: Record<string, Asset | null> = { ...data.assets };
            for (const media of data.formatData.mediaRequired) {
              if (!autoSelected[media.id] && media.source === "account") {
                // Find primary asset of matching type
                const assetType = mapMediaTypeToAssetType(media.type);
                const primary = (result.data || []).find(
                  (a: Asset) => a.type === assetType && a.isPrimary && a.status === "active"
                );
                if (primary) {
                  autoSelected[media.id] = primary;
                }
              }
            }
            updateData({ assets: autoSelected });
          }
        }
      } catch (error) {
        console.error("Failed to fetch assets:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAssets();
  }, [accountId]);

  const handleSelectAsset = (mediaId: string, asset: Asset) => {
    updateData({
      assets: {
        ...data.assets,
        [mediaId]: asset,
      },
    });
    setSelectingFor(null);
  };

  const handleRemoveAsset = (mediaId: string) => {
    const newAssets = { ...data.assets };
    delete newAssets[mediaId];
    updateData({ assets: newAssets });
  };

  if (!data.formatData) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-400">Please select a format first</p>
      </div>
    );
  }

  const mediaRequired = data.formatData.mediaRequired;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">
          Select your assets
        </h3>
        <p className="text-sm text-slate-400">
          Choose images from your library for each slot.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {mediaRequired.map((media) => {
            const selectedAsset = data.assets[media.id];
            const assetType = mapMediaTypeToAssetType(media.type);
            const matchingAssets = assets.filter(
              (a) => a.type === assetType && a.status === "active"
            );

            return (
              <div
                key={media.id}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-white flex items-center gap-2">
                      {media.label}
                      {media.required && (
                        <span className="text-xs text-amber-400">Required</span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {media.description}
                    </p>
                  </div>
                </div>

                {selectedAsset ? (
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-700">
                      <img
                        src={selectedAsset.url}
                        alt={selectedAsset.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {selectedAsset.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {selectedAsset.isPrimary && "Primary • "}
                        {selectedAsset.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectingFor(media.id)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-700 rounded-lg transition-colors"
                      >
                        Change
                      </button>
                      {!media.required && (
                        <button
                          onClick={() => handleRemoveAsset(media.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectingFor(media.id)}
                    className="w-full p-4 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Select {media.label}</span>
                  </button>
                )}

                {/* Asset selector dropdown */}
                {selectingFor === media.id && (
                  <div className="mt-3 p-3 bg-slate-900 rounded-lg border border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-400">
                        {matchingAssets.length} {assetType}(s) available
                      </p>
                      <button
                        onClick={() => setSelectingFor(null)}
                        className="text-slate-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {matchingAssets.length === 0 ? (
                      <div className="text-center py-6">
                        <Image className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">
                          No {assetType}s in library
                        </p>
                        <a
                          href={`/account/${accountId}/assets`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:text-emerald-300 mt-1 inline-block"
                        >
                          Upload in Asset Library →
                        </a>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {matchingAssets.map((asset) => (
                          <button
                            key={asset.id}
                            onClick={() => handleSelectAsset(media.id, asset)}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                              selectedAsset?.id === asset.id
                                ? "border-emerald-500"
                                : "border-transparent hover:border-slate-500"
                            }`}
                          >
                            <img
                              src={asset.url}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                            />
                            {asset.isPrimary && (
                              <div className="absolute top-1 left-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Link to asset library */}
      <div className="text-center pt-4 border-t border-slate-800">
        <a
          href={`/account/${accountId}/assets`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Manage Asset Library →
        </a>
      </div>
    </div>
  );
}

// Map Graphics App media types to our asset types
function mapMediaTypeToAssetType(mediaType: string): AssetType {
  const mapping: Record<string, AssetType> = {
    headshot: "headshot",
    logo: "logo",
    property: "property",
    landscape: "landscape",
    community: "community",
    testimonial: "testimonial",
    icon: "icon",
  };
  return mapping[mediaType] || "other";
}
