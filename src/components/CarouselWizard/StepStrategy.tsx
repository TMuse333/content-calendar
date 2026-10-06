"use client";

import { Target, Sparkles, ListOrdered, MousePointer, Megaphone } from "lucide-react";
import type { WizardData } from "./index";

interface StepStrategyProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function StepStrategy({ data, updateData }: StepStrategyProps) {
  const formatQuestions = data.formatData?.questions || [];

  const updateBrief = (key: string, value: string | string[]) => {
    updateData({
      brief: {
        ...data.brief,
        [key]: value,
      },
    });
  };

  const updateStrategyAnswer = (questionId: string, value: string | string[]) => {
    updateData({
      strategyAnswers: {
        ...data.strategyAnswers,
        [questionId]: value,
      },
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">
          Strategy & Content
        </h3>
        <p className="text-sm text-slate-400">
          Define the messaging and key points for your carousel.
        </p>
      </div>

      {/* Format-specific questions */}
      {formatQuestions.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            {data.formatData?.name} Questions
          </h4>

          {formatQuestions.map((question) => (
            <div key={question.id}>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                {question.label}
                {question.required && <span className="text-amber-400 ml-1">*</span>}
              </label>

              {question.type === "textarea" ? (
                <textarea
                  value={(data.strategyAnswers[question.id] as string) || ""}
                  onChange={(e) => updateStrategyAnswer(question.id, e.target.value)}
                  placeholder={question.placeholder}
                  rows={4}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                />
              ) : question.type === "select" ? (
                <select
                  value={(data.strategyAnswers[question.id] as string) || ""}
                  onChange={(e) => updateStrategyAnswer(question.id, e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Select...</option>
                  {question.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : question.type === "multi-select" ? (
                <div className="flex flex-wrap gap-2">
                  {question.options?.map((opt) => {
                    const selected = (data.strategyAnswers[question.id] as string[] || []).includes(opt);
                    return (
                      <button
                        key={opt}
                        onClick={() => {
                          const current = (data.strategyAnswers[question.id] as string[]) || [];
                          const updated = selected
                            ? current.filter((o) => o !== opt)
                            : [...current, opt];
                          updateStrategyAnswer(question.id, updated);
                        }}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          selected
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  value={(data.strategyAnswers[question.id] as string) || ""}
                  onChange={(e) => updateStrategyAnswer(question.id, e.target.value)}
                  placeholder={question.placeholder}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      {formatQuestions.length > 0 && (
        <div className="border-t border-slate-700" />
      )}

      {/* Standard brief fields */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          Strategy Brief
        </h4>

        {/* Goal */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Goal
          </label>
          <input
            type="text"
            value={data.brief.goal || ""}
            onChange={(e) => updateBrief("goal", e.target.value)}
            placeholder="What should the viewer feel, know, or do after seeing this?"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Hook */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Hook (opening line)
          </label>
          <input
            type="text"
            value={data.brief.hook || ""}
            onChange={(e) => updateBrief("hook", e.target.value)}
            placeholder="The attention-grabbing first line or visual"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Key Points */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
            <ListOrdered className="w-3.5 h-3.5" />
            Key Points (one per slide)
          </label>
          <textarea
            value={(data.brief.keyPoints || []).join("\n")}
            onChange={(e) => updateBrief("keyPoints", e.target.value.split("\n").filter(Boolean))}
            placeholder="Point 1&#10;Point 2&#10;Point 3"
            rows={5}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none font-mono text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            One point per line. These become your slide content.
          </p>
        </div>

        {/* CTA */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
            <MousePointer className="w-3.5 h-3.5" />
            Call to Action
          </label>
          <input
            type="text"
            value={data.brief.cta || ""}
            onChange={(e) => updateBrief("cta", e.target.value)}
            placeholder="Save this for later, DM me your questions, etc."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
            <Megaphone className="w-3.5 h-3.5" />
            Tone
          </label>
          <input
            type="text"
            value={data.brief.tone || ""}
            onChange={(e) => updateBrief("tone", e.target.value)}
            placeholder="Calm, educational, reassuring..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>
    </div>
  );
}
