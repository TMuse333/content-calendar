"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  MessageSquare,
  Layout,
  Image,
  FileText,
  Play,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
} from "lucide-react";
import type { ScheduledCarousel } from "@/lib/types/graphic-package";
import type { Asset } from "@/lib/types/asset";
import { StepQuestion } from "./StepQuestion";
import { StepFormat } from "./StepFormat";
import { StepAssets } from "./StepAssets";
import { StepStrategy } from "./StepStrategy";
import { StepContent } from "./StepContent";
import { StepRender } from "./StepRender";
import { StepReview } from "./StepReview";

export interface FormatOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  frames: number;
  previewUrl?: string;
  mediaRequired: {
    id: string;
    type: string;
    label: string;
    description: string;
    required: boolean;
    source: string;
  }[];
  questions: {
    id: string;
    type: string;
    label: string;
    placeholder?: string;
    options?: string[];
    required?: boolean;
  }[];
}

export interface WizardData {
  // Step 1: Question
  question: string;
  level: string;
  uncertaintyAddressed: string;
  isEvergreen: boolean;

  // Step 2: Format
  format: string;
  formatData: FormatOption | null;

  // Step 3: Assets
  assets: Record<string, Asset | null>;

  // Step 4: Strategy
  strategyAnswers: Record<string, string | string[]>;
  brief: {
    goal?: string;
    hook?: string;
    keyPoints?: string[];
    cta?: string;
    tone?: string;
  };

  // Step 5: Content (actual carousel data)
  carouselContent: Record<string, unknown>;

  // Step 6-7: Render results
  graphicUrl?: string;
  graphicUrls?: string[];
}

interface CarouselWizardProps {
  carousel: ScheduledCarousel;
  accountId: string;
  onClose: () => void;
  onComplete: (carouselId: string) => void;
  onSave: (carouselId: string, data: Partial<ScheduledCarousel>) => Promise<void>;
}

import { Edit3 } from "lucide-react";

const STEPS = [
  { id: "question", label: "Question", icon: MessageSquare },
  { id: "format", label: "Format", icon: Layout },
  { id: "assets", label: "Assets", icon: Image },
  { id: "strategy", label: "Strategy", icon: FileText },
  { id: "content", label: "Content", icon: Edit3 },
  { id: "render", label: "Render", icon: Play },
  { id: "review", label: "Done", icon: CheckCircle },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function CarouselWizard({
  carousel,
  accountId,
  onClose,
  onComplete,
  onSave,
}: CarouselWizardProps) {
  const [currentStep, setCurrentStep] = useState<StepId>("question");
  const [saving, setSaving] = useState(false);
  const [formats, setFormats] = useState<FormatOption[]>([]);
  const [loadingFormats, setLoadingFormats] = useState(true);

  // Wizard data state
  const [data, setData] = useState<WizardData>(() => ({
    // Initialize from carousel
    question: carousel.question || "",
    level: carousel.level || "L5",
    uncertaintyAddressed: carousel.uncertaintyAddressed || "",
    isEvergreen: carousel.isEvergreen || false,
    format: carousel.suggestedFormat || "",
    formatData: null,
    assets: {},
    strategyAnswers: {},
    brief: carousel.brief || {},
    carouselContent: {},
    graphicUrl: carousel.graphicUrl,
    graphicUrls: carousel.graphicUrls,
  }));

  // Fetch formats from Graphics App
  useEffect(() => {
    async function fetchFormats() {
      try {
        const res = await fetch("/api/graphics/formats");
        if (res.ok) {
          const result = await res.json();
          setFormats(result.data || []);

          // Set formatData if format already selected
          if (data.format) {
            const found = (result.data || []).find((f: FormatOption) => f.id === data.format);
            if (found) {
              setData(prev => ({ ...prev, formatData: found }));
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch formats:", error);
      } finally {
        setLoadingFormats(false);
      }
    }
    fetchFormats();
  }, []);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveProgress = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(carousel.id, {
        question: data.question,
        level: data.level as ScheduledCarousel["level"],
        uncertaintyAddressed: data.uncertaintyAddressed,
        isEvergreen: data.isEvergreen,
        suggestedFormat: data.format,
        brief: data.brief,
      });
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  }, [carousel.id, data, onSave]);

  const goNext = useCallback(async () => {
    // Save before moving forward
    await saveProgress();

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  }, [currentStepIndex, saveProgress]);

  const goPrev = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback((stepId: StepId) => {
    setCurrentStep(stepId);
  }, []);

  const handleRenderComplete = useCallback((results: { graphicUrl?: string; graphicUrls?: string[] }) => {
    // Store the rendered graphics in wizard state
    setData(prev => ({
      ...prev,
      graphicUrl: results.graphicUrl,
      graphicUrls: results.graphicUrls,
    }));
    setCurrentStep("review");
  }, []);

  const handleApprove = useCallback(async () => {
    // Save as deliverable before completing
    const graphicUrls = data.graphicUrls || (data.graphicUrl ? [data.graphicUrl] : []);

    if (graphicUrls.length > 0) {
      try {
        // Save to deliverables
        await fetch(`/api/accounts/${accountId}/deliverables`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliveryType: "carousel",
            title: data.question || "Untitled Carousel",
            slides: graphicUrls,
            questionId: carousel.id,
            formatId: data.format,
            formatName: data.formatData?.name,
            entropyLevel: data.level,
            tags: data.isEvergreen ? ["evergreen"] : [],
          }),
        });

        // Also update the carousel record with graphics
        await onSave(carousel.id, {
          graphicUrl: data.graphicUrl,
          graphicUrls: data.graphicUrls,
          status: "ready",
        });
      } catch (error) {
        console.error("Failed to save deliverable:", error);
      }
    }

    onComplete(carousel.id);
  }, [accountId, carousel.id, data, onComplete, onSave]);

  // Check if step is complete
  const isStepComplete = (stepId: StepId): boolean => {
    switch (stepId) {
      case "question":
        return !!data.question && !!data.level;
      case "format":
        return !!data.format;
      case "assets":
        // Check required assets
        if (!data.formatData?.mediaRequired) return true;
        const required = data.formatData.mediaRequired.filter((m) => m.required);
        return required.every((m) => data.assets[m.id]);
      case "strategy":
        return true; // Optional
      case "content":
        // Check if content has some data
        return Object.keys(data.carouselContent).length > 0;
      case "render":
        return !!data.graphicUrl || !!(data.graphicUrls && data.graphicUrls.length > 0);
      case "review":
        return carousel.status === "published";
      default:
        return false;
    }
  };

  const canProceed = isStepComplete(currentStep);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Carousel Wizard
              </h2>
              <div className="flex items-center gap-2 text-sm text-slate-400 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {new Date(carousel.scheduledDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-800/30">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isComplete = isStepComplete(step.id);
              const isPast = index < currentStepIndex;

              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isPast || isComplete
                      ? "text-slate-300 hover:bg-slate-700"
                      : "text-slate-500"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive
                        ? "bg-emerald-500 text-white"
                        : isComplete
                        ? "bg-emerald-500/30 text-emerald-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {isComplete && !isActive ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto">
          {loadingFormats && currentStep === "format" ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
            </div>
          ) : (
            <>
              {currentStep === "question" && (
                <StepQuestion data={data} updateData={updateData} />
              )}
              {currentStep === "format" && (
                <StepFormat
                  data={data}
                  updateData={updateData}
                  formats={formats}
                />
              )}
              {currentStep === "assets" && (
                <StepAssets
                  data={data}
                  updateData={updateData}
                  accountId={accountId}
                />
              )}
              {currentStep === "strategy" && (
                <StepStrategy data={data} updateData={updateData} />
              )}
              {currentStep === "content" && (
                <StepContent data={data} updateData={updateData} />
              )}
              {currentStep === "render" && (
                <StepRender
                  carousel={carousel}
                  data={data}
                  accountId={accountId}
                  onComplete={handleRenderComplete}
                />
              )}
              {currentStep === "review" && (
                <StepReview
                  carousel={carousel}
                  data={data}
                  onApprove={handleApprove}
                  onRequestChanges={() => setCurrentStep("content")}
                />
              )}
            </>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            {saving && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            )}

            {currentStep === "review" ? (
              <button
                onClick={handleApprove}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                Approve & Close
              </button>
            ) : currentStep === "render" ? (
              <span className="text-sm text-slate-400">
                Complete render in Graphics App
              </span>
            ) : (
              <button
                onClick={goNext}
                disabled={!canProceed}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
