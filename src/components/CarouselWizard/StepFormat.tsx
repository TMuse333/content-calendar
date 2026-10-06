"use client";

import { Check, Layout } from "lucide-react";
import type { WizardData, FormatOption } from "./index";

interface StepFormatProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  formats: FormatOption[];
}

export function StepFormat({ data, updateData, formats }: StepFormatProps) {
  const handleSelectFormat = (format: FormatOption) => {
    updateData({
      format: format.id,
      formatData: format,
      // Reset assets when format changes
      assets: {},
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">
          Choose a format
        </h3>
        <p className="text-sm text-slate-400">
          Select the carousel template that best fits your content.
        </p>
      </div>

      {formats.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
          <Layout className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No formats available</p>
          <p className="text-sm text-slate-500 mt-1">
            Make sure Graphics App is running
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {formats.map((format) => {
            const isSelected = data.format === format.id;

            return (
              <button
                key={format.id}
                onClick={() => handleSelectFormat(format)}
                className={`relative p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/30"
                    : "bg-slate-800 border-slate-700 hover:border-slate-600"
                }`}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Format preview placeholder */}
                <div
                  className="w-full aspect-square rounded-lg mb-3 flex items-center justify-center"
                  style={{ backgroundColor: `${format.color}20` }}
                >
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: format.color }}
                  >
                    <Layout className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Format info */}
                <h4 className="font-medium text-white mb-1">{format.name}</h4>
                <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                  {format.description}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                    {format.frames} slides
                  </span>
                  {format.mediaRequired.filter((m) => m.required).length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                      {format.mediaRequired.filter((m) => m.required).length} assets
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected format details */}
      {data.formatData && (
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <h4 className="font-medium text-white mb-2">
            {data.formatData.name}
          </h4>
          <p className="text-sm text-slate-400 mb-3">
            {data.formatData.description}
          </p>

          {/* What you'll need */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              What you'll need:
            </p>
            <div className="flex flex-wrap gap-2">
              {data.formatData.mediaRequired.map((media) => (
                <span
                  key={media.id}
                  className={`text-xs px-2 py-1 rounded-full ${
                    media.required
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {media.label}
                  {media.required && " *"}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
