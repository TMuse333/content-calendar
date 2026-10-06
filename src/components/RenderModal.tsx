"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Layers,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import type { ScheduledCarousel } from "@/lib/types/graphic-package";
import type { AgentProfile } from "@/lib/types/carousel-content";
import {
  createRenderSession,
  getEmbedUrl,
} from "@/lib/services/graphics";
import { ENTROPY_LEVELS, LEVEL_COLORS, type EntropyLevel } from "@/lib/entropy";

interface RenderModalProps {
  carousel: ScheduledCarousel;
  agent: AgentProfile;
  agentId: string;
  content: Record<string, unknown>;
  onClose: () => void;
  onComplete: (carouselId: string) => void;
}

export function RenderModal({
  carousel,
  agent,
  agentId,
  content,
  onClose,
  onComplete,
}: RenderModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [configCollapsed, setConfigCollapsed] = useState(false);

  // Create render session on mount
  useEffect(() => {
    async function initSession() {
      try {
        setLoading(true);
        setError(null);

        const baseUrl = window.location.origin;
        const callbackUrl = `${baseUrl}/api/calendar/${agentId}/posts/${carousel.id}/link-graphic`;

        const response = await createRenderSession({
          postId: carousel.id,
          agentId,
          format: carousel.suggestedFormat || "ClientQuestionsCarousel",
          callbackUrl,
          content,
          agent,
          question: carousel.question,
          level: carousel.level,
          isEvergreen: carousel.isEvergreen,
          mode: carousel.clientFeedback ? "revision" : "render",
          version: (carousel.revisionHistory?.length || 0) + 1,
          feedback: carousel.clientFeedback,
        });

        setSessionId(response.sessionId);
        setEmbedUrl(getEmbedUrl(response.embedUrl));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create render session");
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [carousel, agent, agentId, content]);

  // Listen for postMessage from iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // In production, verify event.origin matches Graphics App URL

      switch (event.data.type) {
        case "render-complete":
          if (event.data.postId === carousel.id) {
            onComplete(carousel.id);
          }
          break;

        case "render-close":
          if (event.data.postId === carousel.id) {
            onClose();
          }
          break;

        case "render-cancelled":
          if (event.data.postId === carousel.id) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [carousel.id, onClose, onComplete]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {carousel.clientFeedback ? "Revision Mode" : "Render Carousel"}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5 truncate max-w-md">
              {carousel.question}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Config Panel (collapsible) */}
        <div className="border-b border-slate-800 bg-slate-800/30">
          <button
            onClick={() => setConfigCollapsed(!configCollapsed)}
            className="w-full px-6 py-3 flex items-center justify-between text-sm text-slate-400 hover:text-white transition-colors"
          >
            <span>Configuration</span>
            {configCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>

          {!configCollapsed && (
            <div className="px-6 pb-4 space-y-3">
              {/* Format & Level */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-lg">
                  <span className="text-xs text-slate-400">Format:</span>
                  <span className="text-sm text-white">
                    {carousel.suggestedFormat || "Not set"}
                  </span>
                </div>

                {carousel.level && (
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                      LEVEL_COLORS[carousel.level as EntropyLevel]?.bg || "bg-slate-700"
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span
                      className={`text-xs font-mono font-bold ${
                        LEVEL_COLORS[carousel.level as EntropyLevel]?.text || "text-slate-300"
                      }`}
                    >
                      {carousel.level}
                    </span>
                    <span className="text-sm text-slate-300">
                      {ENTROPY_LEVELS[carousel.level as EntropyLevel]?.name}
                    </span>
                  </div>
                )}

                {carousel.isEvergreen && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded-lg">
                    <RefreshCw className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs text-emerald-400">Evergreen</span>
                  </div>
                )}
              </div>

              {/* Revision Feedback */}
              {carousel.clientFeedback && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                    <div>
                      <span className="text-xs font-medium text-amber-400 block">
                        Client Feedback
                      </span>
                      <p className="text-sm text-amber-200 mt-1">
                        {carousel.clientFeedback}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Iframe Container */}
        <div className="flex-1 relative min-h-[500px]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-slate-500 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">Creating render session...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="text-center max-w-md px-6">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-white font-medium mb-2">Failed to connect to Graphics App</p>
                <p className="text-sm text-slate-400 mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {embedUrl && !loading && !error && (
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allow="clipboard-write"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============ BATCH RENDER MODAL ============

interface BatchRenderModalProps {
  carousels: ScheduledCarousel[];
  agent: AgentProfile;
  agentId: string;
  getContent: (carousel: ScheduledCarousel) => Record<string, unknown>;
  onClose: () => void;
  onComplete: () => void;
}

export function BatchRenderModal({
  carousels,
  agent,
  agentId,
  getContent,
  onClose,
  onComplete,
}: BatchRenderModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);

  const currentCarousel = carousels[currentIndex];
  const isLast = currentIndex === carousels.length - 1;
  const progress = ((completed.length + skipped.length) / carousels.length) * 100;

  const handleComplete = useCallback(
    (carouselId: string) => {
      setCompleted((prev) => [...prev, carouselId]);
      if (isLast) {
        onComplete();
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    },
    [isLast, onComplete]
  );

  const handleSkip = useCallback(() => {
    setSkipped((prev) => [...prev, currentCarousel.id]);
    if (isLast) {
      onComplete();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentCarousel.id, isLast, onComplete]);

  if (!currentCarousel) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Batch Progress Header */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">
              Rendering {currentIndex + 1} of {carousels.length}
            </span>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-emerald-400">{completed.length} done</span>
              <span className="text-slate-500">{skipped.length} skipped</span>
            </div>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Render the current carousel */}
        <div className="flex-1 flex flex-col">
          <RenderModal
            key={currentCarousel.id}
            carousel={currentCarousel}
            agent={agent}
            agentId={agentId}
            content={getContent(currentCarousel)}
            onClose={onClose}
            onComplete={handleComplete}
          />
        </div>

        {/* Batch Controls */}
        <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Skip this one
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Cancel batch
          </button>
        </div>
      </div>
    </div>
  );
}
