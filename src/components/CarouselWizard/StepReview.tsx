"use client";

import { useState } from "react";
import { CheckCircle, Edit3, ExternalLink, Calendar, Loader2 } from "lucide-react";
import type { ScheduledCarousel } from "@/lib/types/graphic-package";
import type { WizardData } from "./index";

interface StepReviewProps {
  carousel: ScheduledCarousel;
  data: WizardData;
  onApprove: () => void;
  onRequestChanges: () => void;
}

export function StepReview({
  carousel,
  data,
  onApprove,
  onRequestChanges,
}: StepReviewProps) {
  const [approving, setApproving] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    // In a real implementation, this would call the approve API
    await new Promise((r) => setTimeout(r, 500));
    onApprove();
  };

  const graphicUrls = carousel.graphicUrls || (carousel.graphicUrl ? [carousel.graphicUrl] : []);
  const hasGraphics = graphicUrls.length > 0 && !graphicUrls[0]?.includes("example.com") && !graphicUrls[0]?.includes("placeholder");

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-1">
          {hasGraphics ? "Ready for Review" : "Waiting for Graphics"}
        </h3>
        <p className="text-slate-400">
          {hasGraphics
            ? "Review your carousel and approve when ready."
            : "Complete the render step to see your graphics here."}
        </p>
      </div>

      {/* Preview */}
      {hasGraphics ? (
        <div className="space-y-4">
          {/* Slide thumbnails */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {graphicUrls.map((url, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-32 aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700"
              >
                <img
                  src={url}
                  alt={`Slide ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%231e293b' width='100' height='100'/%3E%3Ctext fill='%2364748b' x='50' y='50' text-anchor='middle' dy='.3em' font-size='12'%3ESlide ${index + 1}%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
            ))}
          </div>

          {/* Info card */}
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Question:</span>
                <p className="text-white mt-0.5 line-clamp-2">{data.question}</p>
              </div>
              <div>
                <span className="text-slate-400">Format:</span>
                <p className="text-white mt-0.5">{data.formatData?.name || data.format}</p>
              </div>
              <div>
                <span className="text-slate-400">Slides:</span>
                <p className="text-white mt-0.5">{graphicUrls.length}</p>
              </div>
              <div>
                <span className="text-slate-400">Scheduled:</span>
                <p className="text-white mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(carousel.scheduledDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-slate-700">
          <p className="text-slate-400 mb-4">No graphics rendered yet</p>
          <button
            onClick={onRequestChanges}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-600 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Go to Render Step
          </button>
        </div>
      )}

      {/* Actions */}
      {hasGraphics && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={onRequestChanges}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Make Changes
          </button>
          <button
            onClick={handleApprove}
            disabled={approving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 transition-all"
          >
            {approving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Approve & Done
              </>
            )}
          </button>
        </div>
      )}

      {/* Open in new tab */}
      {hasGraphics && carousel.graphicUrl && (
        <div className="text-center">
          <a
            href={carousel.graphicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Open full preview
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
