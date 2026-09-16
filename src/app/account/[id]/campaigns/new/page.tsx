"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/contexts/AccountContext";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Target,
  MessageSquare,
  Users,
  Calendar,
  Sparkles,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import type { UnderlyingNeed } from "@/lib/types/account";

const STEPS = [
  { id: "basics", label: "Basics", icon: Target },
  { id: "info-points", label: "Info Points", icon: MessageSquare },
  { id: "audience", label: "Audience", icon: Users },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "review", label: "Review", icon: Sparkles },
];

const UNDERLYING_NEEDS: { value: UnderlyingNeed; label: string; description: string }[] = [
  { value: "security", label: "Security", description: "They want to feel safe and reduce risk" },
  { value: "status", label: "Status", description: "They want to be seen as successful/competent" },
  { value: "belonging", label: "Belonging", description: "They want to be part of something" },
  { value: "autonomy", label: "Autonomy", description: "They want control over their situation" },
  { value: "certainty", label: "Certainty", description: "They want to know the path forward" },
  { value: "growth", label: "Growth", description: "They want to become better" },
  { value: "meaning", label: "Meaning", description: "They want what they do to matter" },
];

const DELIVERY_STYLES = [
  { value: "calm-authority", label: "Calm Authority", description: "Confident, measured, trustworthy" },
  { value: "energetic", label: "Energetic", description: "High energy, exciting, motivating" },
  { value: "educational", label: "Educational", description: "Teaching, explaining, clarifying" },
  { value: "raw-authentic", label: "Raw & Authentic", description: "Unfiltered, personal, real" },
  { value: "professional", label: "Professional", description: "Polished, corporate, formal" },
  { value: "conversational", label: "Conversational", description: "Casual, friendly, approachable" },
];

export default function NewCampaignWizard() {
  const router = useRouter();
  const { currentAccount } = useAccount();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [infoPoints, setInfoPoints] = useState<string[]>([""]);
  const [primaryNeed, setPrimaryNeed] = useState<UnderlyingNeed | "">("");
  const [secondaryNeed, setSecondaryNeed] = useState<UnderlyingNeed | "">("");
  const [deliveryStyle, setDeliveryStyle] = useState("");
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const addInfoPoint = () => {
    setInfoPoints([...infoPoints, ""]);
  };

  const removeInfoPoint = (index: number) => {
    if (infoPoints.length > 1) {
      setInfoPoints(infoPoints.filter((_, i) => i !== index));
    }
  };

  const updateInfoPoint = (index: number, value: string) => {
    const updated = [...infoPoints];
    updated[index] = value;
    setInfoPoints(updated);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Basics
        return name.trim().length > 0;
      case 1: // Info Points
        return infoPoints.some((p) => p.trim().length > 0);
      case 2: // Audience
        return primaryNeed !== "";
      case 3: // Schedule
        return true; // Optional
      case 4: // Review
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = async () => {
    if (!currentAccount) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          informationPoints: infoPoints
            .filter((p) => p.trim())
            .map((text) => ({ id: crypto.randomUUID().slice(0, 8), text: text.trim() })),
          underlyingNeed: primaryNeed || undefined,
          secondaryNeed: secondaryNeed || undefined,
          deliveryStyle: deliveryStyle || undefined,
          postsPerWeek: postsPerWeek,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/account/${currentAccount.id}/campaigns`);
      } else {
        setError(data.error || "Failed to create campaign");
      }
    } catch (err) {
      setError("Failed to create campaign");
    } finally {
      setSaving(false);
    }
  };

  if (!currentAccount) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push(`/account/${currentAccount.id}/campaigns`)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Campaigns
        </button>
        <h1 className="text-2xl font-bold text-white">Create Campaign</h1>
        <p className="text-slate-400 mt-1">Set up a focused content strategy</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => index < currentStep && setCurrentStep(index)}
                disabled={index > currentStep}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg transition-all
                  ${isActive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : ""}
                  ${isCompleted ? "text-emerald-400 hover:bg-slate-800 cursor-pointer" : ""}
                  ${!isActive && !isCompleted ? "text-slate-500 cursor-not-allowed" : ""}
                `}
              >
                <div
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center
                    ${isActive ? "bg-emerald-500" : ""}
                    ${isCompleted ? "bg-emerald-500/20" : ""}
                    ${!isActive && !isCompleted ? "bg-slate-800" : ""}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : ""}`} />
                  )}
                </div>
                <span className="text-sm font-medium hidden md:block">{step.label}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-2 ${
                    isCompleted ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        {/* Step 1: Basics */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Campaign Basics</h2>
              <p className="text-sm text-slate-400">Give your campaign a name and description</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Campaign Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., AI Automation Launch, Q4 Brand Awareness"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description <span className="text-slate-500">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's the goal of this campaign? Who are you trying to reach?"
                rows={3}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 2: Info Points */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Information Points</h2>
              <p className="text-sm text-slate-400">
                What key messages do you want to communicate? These become trackable.
              </p>
            </div>

            <div className="space-y-3">
              {infoPoints.map((point, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => updateInfoPoint(index, e.target.value)}
                      placeholder={`e.g., "AI saves 10+ hours per week", "We handle all technical complexity"`}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  {infoPoints.length > 1 && (
                    <button
                      onClick={() => removeInfoPoint(index)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addInfoPoint}
              className="flex items-center gap-2 px-4 py-2 text-emerald-400 hover:bg-slate-800 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Add another point
            </button>

            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-400">
                <span className="text-emerald-400">Tip:</span> These become trackable metrics.
                You&apos;ll see which points you&apos;ve covered in posts and which need more attention.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Audience */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Audience & Approach</h2>
              <p className="text-sm text-slate-400">
                What underlying need are you addressing? How should content feel?
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Primary Underlying Need *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {UNDERLYING_NEEDS.map((need) => (
                  <button
                    key={need.value}
                    onClick={() => setPrimaryNeed(need.value)}
                    className={`
                      p-4 rounded-lg border text-left transition-all
                      ${
                        primaryNeed === need.value
                          ? "bg-emerald-500/20 border-emerald-500/50 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                      }
                    `}
                  >
                    <div className="font-medium">{need.label}</div>
                    <div className="text-sm text-slate-400 mt-1">{need.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Delivery Style <span className="text-slate-500">(optional)</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DELIVERY_STYLES.map((style) => (
                  <button
                    key={style.value}
                    onClick={() =>
                      setDeliveryStyle(deliveryStyle === style.value ? "" : style.value)
                    }
                    className={`
                      p-4 rounded-lg border text-left transition-all
                      ${
                        deliveryStyle === style.value
                          ? "bg-blue-500/20 border-blue-500/50 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                      }
                    `}
                  >
                    <div className="font-medium">{style.label}</div>
                    <div className="text-sm text-slate-400 mt-1">{style.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Schedule */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Schedule & Goals</h2>
              <p className="text-sm text-slate-400">
                How often do you want to post for this campaign?
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Target Posts Per Week
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={postsPerWeek}
                  onChange={(e) => setPostsPerWeek(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span className="text-2xl font-bold text-white w-12 text-center">
                  {postsPerWeek}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                {postsPerWeek === 1 && "Light presence - 1 post per week"}
                {postsPerWeek === 2 && "Moderate presence - every few days"}
                {postsPerWeek === 3 && "Solid presence - every other day"}
                {postsPerWeek >= 4 && postsPerWeek <= 5 && "Strong presence - most days"}
                {postsPerWeek >= 6 && "Heavy presence - daily or more"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Start Date <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  End Date <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-400">
                <span className="text-emerald-400">Tip:</span> Leave dates empty for an ongoing
                campaign. The calendar will show coverage gaps based on your target frequency.
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Review Campaign</h2>
              <p className="text-sm text-slate-400">
                Make sure everything looks good before creating
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="text-sm text-slate-500 mb-1">Campaign Name</div>
                <div className="text-lg font-medium text-white">{name}</div>
                {description && (
                  <div className="text-sm text-slate-400 mt-2">{description}</div>
                )}
              </div>

              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="text-sm text-slate-500 mb-2">Information Points</div>
                <div className="space-y-2">
                  {infoPoints.filter((p) => p.trim()).map((point, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-slate-300">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800 rounded-lg">
                  <div className="text-sm text-slate-500 mb-1">Primary Need</div>
                  <div className="text-white font-medium">
                    {UNDERLYING_NEEDS.find((n) => n.value === primaryNeed)?.label || "—"}
                  </div>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg">
                  <div className="text-sm text-slate-500 mb-1">Delivery Style</div>
                  <div className="text-white font-medium">
                    {DELIVERY_STYLES.find((s) => s.value === deliveryStyle)?.label || "—"}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="text-sm text-slate-500 mb-1">Schedule</div>
                <div className="text-white">
                  {postsPerWeek} posts per week
                  {startDate && ` · Starting ${new Date(startDate).toLocaleDateString()}`}
                  {endDate && ` · Ending ${new Date(endDate).toLocaleDateString()}`}
                  {!startDate && !endDate && " · Ongoing"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create Campaign
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
