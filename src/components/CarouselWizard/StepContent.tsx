"use client";

import { Plus, Trash2, GripVertical, HelpCircle, BarChart3, MessageSquare } from "lucide-react";
import type { WizardData } from "./index";

interface StepContentProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

// Format-specific content structures
interface QuestionAnswer {
  question: string;
  answer: string;
}

interface StatItem {
  label: string;
  value: string;
  change?: string;
}

export function StepContent({ data, updateData }: StepContentProps) {
  const format = data.format;

  // Get current content or initialize defaults
  const content = data.carouselContent || {};

  const updateContent = (updates: Record<string, unknown>) => {
    updateData({
      carouselContent: { ...content, ...updates },
    });
  };

  // Client Questions Carousel
  if (format === "ClientQuestionsCarousel") {
    const questions: QuestionAnswer[] = (content.questions as QuestionAnswer[]) || [
      { question: "", answer: "" },
    ];

    const addQuestion = () => {
      updateContent({ questions: [...questions, { question: "", answer: "" }] });
    };

    const removeQuestion = (index: number) => {
      const updated = questions.filter((_, i) => i !== index);
      updateContent({ questions: updated.length ? updated : [{ question: "", answer: "" }] });
    };

    const updateQuestion = (index: number, field: "question" | "answer", value: string) => {
      const updated = questions.map((q, i) =>
        i === index ? { ...q, [field]: value } : q
      );
      updateContent({ questions: updated });
    };

    return (
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            Questions & Answers
          </h3>
          <p className="text-sm text-slate-400">
            Enter the questions and answers for each slide. The first slide will be a hook/title,
            then each Q&A becomes a slide.
          </p>
        </div>

        {/* Title/Hook */}
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <label className="block text-sm font-medium text-amber-400 mb-2">
            Title / Hook (Slide 1)
          </label>
          <input
            type="text"
            value={(content.title as string) || ""}
            onChange={(e) => updateContent({ title: e.target.value })}
            placeholder="e.g., 5 Questions Every First-Time Buyer Asks"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        {/* Q&A Pairs */}
        <div className="space-y-4">
          {questions.map((qa, index) => (
            <div
              key={index}
              className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">
                  Slide {index + 2}
                </span>
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(index)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Question</label>
                <input
                  type="text"
                  value={qa.question}
                  onChange={(e) => updateQuestion(index, "question", e.target.value)}
                  placeholder="What question does your audience have?"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Answer</label>
                <textarea
                  value={qa.answer}
                  onChange={(e) => updateQuestion(index, "answer", e.target.value)}
                  placeholder="Your clear, helpful answer..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addQuestion}
          className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>

        {/* CTA Slide */}
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <label className="block text-sm font-medium text-cyan-400 mb-2">
            Call to Action (Final Slide)
          </label>
          <input
            type="text"
            value={(content.cta as string) || ""}
            onChange={(e) => updateContent({ cta: e.target.value })}
            placeholder="e.g., Save this for later! DM me your questions."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
      </div>
    );
  }

  // Market Pulse / Stats Carousel
  if (format === "MarketPulseCarousel" || format === "MarketStatsCarousel") {
    const stats: StatItem[] = (content.stats as StatItem[]) || [
      { label: "", value: "", change: "" },
    ];

    const addStat = () => {
      updateContent({ stats: [...stats, { label: "", value: "", change: "" }] });
    };

    const removeStat = (index: number) => {
      const updated = stats.filter((_, i) => i !== index);
      updateContent({ stats: updated.length ? updated : [{ label: "", value: "", change: "" }] });
    };

    const updateStat = (index: number, field: keyof StatItem, value: string) => {
      const updated = stats.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      );
      updateContent({ stats: updated });
    };

    return (
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Market Statistics
          </h3>
          <p className="text-sm text-slate-400">
            Enter the stats you want to highlight. Each stat will appear on its own slide.
          </p>
        </div>

        {/* Title */}
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <label className="block text-sm font-medium text-blue-400 mb-2">
            Report Title
          </label>
          <input
            type="text"
            value={(content.title as string) || ""}
            onChange={(e) => updateContent({ title: e.target.value })}
            placeholder="e.g., October 2024 Market Update"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* Stats */}
        <div className="space-y-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="p-4 bg-slate-800/50 rounded-xl border border-slate-700"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-300">
                  Stat {index + 1}
                </span>
                {stats.length > 1 && (
                  <button
                    onClick={() => removeStat(index)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Label</label>
                  <input
                    type="text"
                    value={stat.label}
                    onChange={(e) => updateStat(index, "label", e.target.value)}
                    placeholder="Avg. Selling Price"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Change</label>
                  <input
                    type="text"
                    value={stat.change || ""}
                    onChange={(e) => updateStat(index, "change", e.target.value)}
                    placeholder="+5%"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-slate-500 mb-1">Value</label>
                  <input
                    type="text"
                    value={stat.value}
                    onChange={(e) => updateStat(index, "value", e.target.value)}
                    placeholder="$485,000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addStat}
          className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:border-blue-500/50 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Stat
        </button>
      </div>
    );
  }

  // Generic / Other formats - show key points editor
  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          Slide Content
        </h3>
        <p className="text-sm text-slate-400">
          Enter the main content for your carousel. Each point will become a slide.
        </p>
      </div>

      {/* Title */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <label className="block text-sm font-medium text-purple-400 mb-2">
          Title / Hook
        </label>
        <input
          type="text"
          value={(content.title as string) || ""}
          onChange={(e) => updateContent({ title: e.target.value })}
          placeholder="The attention-grabbing opening..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
      </div>

      {/* Key Points */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Key Points (one per slide)
        </label>
        <textarea
          value={((content.points as string[]) || []).join("\n")}
          onChange={(e) =>
            updateContent({ points: e.target.value.split("\n").filter(Boolean) })
          }
          placeholder="Point 1&#10;Point 2&#10;Point 3&#10;..."
          rows={8}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none font-mono text-sm"
        />
        <p className="text-xs text-slate-500 mt-1">
          One point per line. Each becomes a slide.
        </p>
      </div>

      {/* CTA */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <label className="block text-sm font-medium text-cyan-400 mb-2">
          Call to Action
        </label>
        <input
          type="text"
          value={(content.cta as string) || ""}
          onChange={(e) => updateContent({ cta: e.target.value })}
          placeholder="What should viewers do next?"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
      </div>
    </div>
  );
}
