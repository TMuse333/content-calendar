"use client";

import { Layers, RefreshCw, HelpCircle } from "lucide-react";
import { ENTROPY_LEVELS, LEVEL_COLORS, type EntropyLevel } from "@/lib/entropy";
import type { WizardData } from "./index";

interface StepQuestionProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function StepQuestion({ data, updateData }: StepQuestionProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">
          What question are we answering?
        </h3>
        <p className="text-sm text-slate-400">
          This is the core uncertainty we're reducing for your audience.
        </p>
      </div>

      {/* Question */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Question
        </label>
        <textarea
          value={data.question}
          onChange={(e) => updateData({ question: e.target.value })}
          placeholder="What happens if the appraisal comes in lower than my offer?"
          rows={3}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
        />
      </div>

      {/* Entropy Level */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Entropy Level
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(ENTROPY_LEVELS) as EntropyLevel[]).map((level) => {
            const info = ENTROPY_LEVELS[level];
            const colors = LEVEL_COLORS[level];
            const isSelected = data.level === level;

            return (
              <button
                key={level}
                onClick={() => updateData({ level })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? `${colors.bg} ${colors.border} ${colors.text}`
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-mono font-bold ${isSelected ? colors.text : ""}`}>
                    {level}
                  </span>
                </div>
                <span className="text-sm font-medium block">
                  {info.name}
                </span>
              </button>
            );
          })}
        </div>
        {data.level && (
          <div className={`mt-3 p-3 rounded-lg ${LEVEL_COLORS[data.level as EntropyLevel]?.bg}`}>
            <p className={`text-sm ${LEVEL_COLORS[data.level as EntropyLevel]?.text}`}>
              {ENTROPY_LEVELS[data.level as EntropyLevel]?.purpose}
            </p>
          </div>
        )}
      </div>

      {/* Uncertainty Addressed */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          What uncertainty does this resolve?
        </label>
        <input
          type="text"
          value={data.uncertaintyAddressed}
          onChange={(e) => updateData({ uncertaintyAddressed: e.target.value })}
          placeholder="What to do when bank values home lower than offer price"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
        <p className="text-xs text-slate-500 mt-1.5">
          Write the specific doubt or confusion this content eliminates
        </p>
      </div>

      {/* Evergreen */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={`w-10 h-6 rounded-full transition-colors ${
              data.isEvergreen ? "bg-emerald-500" : "bg-slate-700"
            } relative`}
            onClick={() => updateData({ isEvergreen: !data.isEvergreen })}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                data.isEvergreen ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${data.isEvergreen ? "text-emerald-400" : "text-slate-500"}`} />
            <span className="text-sm font-medium text-white">Evergreen content</span>
          </div>
        </label>
        <p className="text-xs text-slate-500 mt-1.5 ml-[52px]">
          Evergreen content stays relevant and can be reposted in the future
        </p>
      </div>
    </div>
  );
}
