"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, Play } from "lucide-react";
import type { ScheduledCarousel } from "@/lib/types/graphic-package";
import type { WizardData } from "./index";
import { createRenderSession, getEmbedUrl } from "@/lib/services/graphics";

interface StepRenderProps {
  carousel: ScheduledCarousel;
  data: WizardData;
  accountId: string;
  onComplete: (results: { graphicUrl?: string; graphicUrls?: string[] }) => void;
}

export function StepRender({
  carousel,
  data,
  accountId,
  onComplete,
}: StepRenderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Build content payload for Graphics App
  // This should match what the carousel template expects
  const buildContent = () => {
    // Start with the structured carousel content from the Content step
    const content: Record<string, unknown> = { ...data.carouselContent };

    // Add metadata that might be useful
    content._meta = {
      question: data.question,
      level: data.level,
      isEvergreen: data.isEvergreen,
      brief: data.brief,
    };

    // Add asset URLs
    content._assets = Object.fromEntries(
      Object.entries(data.assets).map(([key, asset]) => [
        key,
        asset ? { url: asset.url, name: asset.name, type: asset.type } : null,
      ])
    );

    return content;
  };

  // Build agent profile
  const buildAgentProfile = () => {
    // TODO: Get from account data
    return {
      name: "Agent",
      phone: "",
      email: "",
      website: "",
      brokerage: "",
    };
  };

  const startRenderSession = async () => {
    setLoading(true);
    setError(null);

    try {
      const baseUrl = window.location.origin;
      const callbackUrl = `${baseUrl}/api/calendar/${accountId}/posts/${carousel.id}/link-graphic`;

      const response = await createRenderSession({
        postId: carousel.id,
        agentId: accountId,
        format: data.format || "ClientQuestionsCarousel",
        callbackUrl,
        content: buildContent(),
        agent: buildAgentProfile(),
        question: data.question,
        level: data.level as "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7",
        isEvergreen: data.isEvergreen,
        mode: carousel.clientFeedback ? "revision" : "render",
        version: (carousel.revisionHistory?.length || 0) + 1,
        feedback: carousel.clientFeedback,
      });

      setEmbedUrl(getEmbedUrl(response.embedUrl));
      setSessionStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create render session");
    } finally {
      setLoading(false);
    }
  };

  // Listen for postMessage from iframe
  useEffect(() => {
    if (!sessionStarted) return;

    const handler = (event: MessageEvent) => {
      switch (event.data.type) {
        case "render-complete":
          if (event.data.postId === carousel.id) {
            // Pass the rendered graphic URLs back to wizard
            onComplete({
              graphicUrl: event.data.previewUrl,
              graphicUrls: event.data.graphicUrls,
            });
          }
          break;
        case "render-close":
        case "render-cancelled":
          // User cancelled, stay on this step
          setSessionStarted(false);
          setEmbedUrl(null);
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [sessionStarted, carousel.id, onComplete]);

  // Show start button if session not started
  if (!sessionStarted) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <Play className="w-10 h-10 text-emerald-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Ready to Render
          </h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            This will open the Graphics App where you can preview and customize
            your carousel before exporting.
          </p>

          {/* Summary */}
          <div className="max-w-sm mx-auto mb-6 text-left p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Format:</span>
                <span className="text-white">{data.formatData?.name || data.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Slides:</span>
                <span className="text-white">{data.formatData?.frames || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Level:</span>
                <span className="text-white">{data.level}</span>
              </div>
              {Object.keys(data.assets).length > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Assets:</span>
                  <span className="text-white">{Object.keys(data.assets).length} selected</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={startRenderSession}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Rendering
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg max-w-md mx-auto">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show iframe
  return (
    <div className="h-[500px] relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-slate-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading Graphics App...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center max-w-md px-6">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-white font-medium mb-2">Connection Failed</p>
            <p className="text-sm text-slate-400 mb-4">{error}</p>
            <button
              onClick={startRenderSession}
              className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
            >
              Try Again
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
  );
}
