"use client";

import { useState } from "react";
import {
  CheckCircle,
  Edit3,
  Download,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    await new Promise((r) => setTimeout(r, 500));
    onApprove();
  };

  // Use graphics from wizard state (populated by render step)
  const graphicUrls = data.graphicUrls || (data.graphicUrl ? [data.graphicUrl] : []);
  const hasGraphics = graphicUrls.length > 0;

  // Download single slide
  const downloadSlide = (url: string, index: number) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.question?.slice(0, 30) || "carousel"}-slide-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download all slides
  const downloadAll = async () => {
    for (let i = 0; i < graphicUrls.length; i++) {
      downloadSlide(graphicUrls[i], i);
      // Small delay between downloads
      await new Promise((r) => setTimeout(r, 200));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-1">
          {hasGraphics ? "Your Carousel is Ready!" : "Waiting for Render"}
        </h3>
        <p className="text-slate-400">
          {hasGraphics
            ? "Preview your slides below. Download or request changes."
            : "Complete the render step to see your graphics here."}
        </p>
      </div>

      {hasGraphics ? (
        <>
          {/* Main Preview */}
          <div className="relative bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
            {/* Large preview */}
            <div className="aspect-[4/5] max-h-[400px] flex items-center justify-center p-4">
              <img
                src={graphicUrls[currentSlide]}
                alt={`Slide ${currentSlide + 1}`}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>

            {/* Navigation arrows */}
            {graphicUrls.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                  disabled={currentSlide === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentSlide(Math.min(graphicUrls.length - 1, currentSlide + 1))}
                  disabled={currentSlide === graphicUrls.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Slide counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded-full text-sm text-white font-medium">
              {currentSlide + 1} / {graphicUrls.length}
            </div>
          </div>

          {/* Thumbnail strip */}
          {graphicUrls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
              {graphicUrls.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    currentSlide === index
                      ? "border-emerald-500 ring-2 ring-emerald-500/30"
                      : "border-slate-700 hover:border-slate-500"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Info card */}
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wide">Topic</span>
                <p className="text-white mt-0.5 line-clamp-1">{data.question}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wide">Format</span>
                <p className="text-white mt-0.5">{data.formatData?.name || data.format}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wide">Slides</span>
                <p className="text-white mt-0.5">{graphicUrls.length}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wide">Scheduled</span>
                <p className="text-white mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(carousel.scheduledDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {/* Download buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => downloadSlide(graphicUrls[currentSlide], currentSlide)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Slide {currentSlide + 1}
              </button>
              {graphicUrls.length > 1 && (
                <button
                  onClick={downloadAll}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download All ({graphicUrls.length})
                </button>
              )}
            </div>

            {/* Feedback toggle */}
            {!showFeedback ? (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setShowFeedback(true)}
                  className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Request Changes
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/25"
                >
                  {approving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Approve & Save
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                  <Edit3 className="w-4 h-4" />
                  What changes would you like?
                </div>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe the changes you'd like to see..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowFeedback(false);
                      setFeedback("");
                    }}
                    className="flex-1 px-4 py-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Save feedback and go back to render
                      onRequestChanges();
                    }}
                    className="flex-1 px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    Submit & Re-render
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700">
          <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
          </div>
          <p className="text-slate-400 mb-4">No graphics rendered yet</p>
          <button
            onClick={onRequestChanges}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Go to Render Step
          </button>
        </div>
      )}
    </div>
  );
}
