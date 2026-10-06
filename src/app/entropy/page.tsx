"use client";

import { useState } from "react";
import {
  Layers,
  Target,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Zap,
  Users,
  TrendingUp,
  MessageCircle,
  Heart,
  HelpCircle,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import {
  ENTROPY_LEVELS,
  DEFAULT_TARGET_MIX,
  LEVEL_COLORS,
  LEVEL_HEX_COLORS,
  CONTENT_MIX_GUIDELINES,
  CAROUSEL_PRIORITY_LEVELS,
  COMMON_GAPS,
  getAllPatterns,
  getAllFormatMappings,
  type EntropyLevel,
} from "@/lib/entropy";

const LEVEL_ICONS: Record<EntropyLevel, React.ComponentType<{ className?: string }>> = {
  L1: Users,
  L2: Target,
  L3: HelpCircle,
  L4: TrendingUp,
  L5: Lightbulb,
  L6: MessageCircle,
  L7: Heart,
};

export default function EntropyReferencePage() {
  const [expandedLevel, setExpandedLevel] = useState<EntropyLevel | null>(null);
  const patterns = getAllPatterns();
  const formatMappings = getAllFormatMappings();

  const levels = Object.entries(ENTROPY_LEVELS) as [EntropyLevel, typeof ENTROPY_LEVELS.L1][];

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Entropy Reduction Framework</h1>
          </div>
          <p className="text-slate-400">
            Universal content strategy system. Every piece of content reduces prospect uncertainty.
          </p>
        </div>

        {/* The 7 Levels */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            The 7 Levels
          </h2>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-800 text-sm text-slate-500">
              <div className="col-span-1"></div>
              <div className="col-span-2">Level</div>
              <div className="col-span-5">Question It Answers</div>
              <div className="col-span-4">Target Mix</div>
            </div>

            {/* Level rows */}
            {levels.map(([level, def]) => {
              const Icon = LEVEL_ICONS[level];
              const colors = LEVEL_COLORS[level];
              const target = DEFAULT_TARGET_MIX[level];
              const isExpanded = expandedLevel === level;
              const isPriority = CAROUSEL_PRIORITY_LEVELS.includes(level);

              return (
                <div key={level}>
                  <button
                    onClick={() => setExpandedLevel(isExpanded ? null : level)}
                    className="w-full grid grid-cols-12 gap-4 px-4 py-3 hover:bg-slate-800/50 transition-colors text-left items-center"
                  >
                    <div className="col-span-1">
                      <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${colors.text}`} />
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <span className={`font-mono text-sm ${colors.text}`}>{level}</span>
                      <span className="text-white font-medium">{def.name}</span>
                      {isPriority && (
                        <span title="Carousel priority">
                          <Zap className="w-3 h-3 text-amber-400" />
                        </span>
                      )}
                    </div>
                    <div className="col-span-5 text-slate-400 text-sm">
                      {def.question}
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${target * 4}%`,
                            backgroundColor: LEVEL_HEX_COLORS[level],
                          }}
                        />
                      </div>
                      <span className="text-sm text-slate-500 w-10">{target}%</span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-b border-slate-800">
                      <div className="ml-12 grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Purpose</p>
                          <p className="text-sm text-slate-300">{def.purpose}</p>

                          <p className="text-xs text-slate-500 mt-3 mb-1">Reach</p>
                          <p className="text-sm text-slate-300">{def.reach}</p>

                          <p className="text-xs text-slate-500 mt-3 mb-1">Goal</p>
                          <p className="text-sm text-slate-300">{def.goal}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-2">Example Topics</p>
                          <div className="space-y-1">
                            {def.exampleTopics.map((topic, i) => (
                              <div
                                key={i}
                                className="text-sm text-slate-400 flex items-start gap-2"
                              >
                                <span className="text-slate-600">•</span>
                                {topic}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-sm text-slate-500">
            <Zap className="w-3 h-3 text-amber-400 inline mr-1" />
            Carousel sweet spot: L3, L5, L6 (highest value for educational content)
          </p>
        </section>

        {/* Content Mix Guidelines */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Content Mix Guidelines
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(CONTENT_MIX_GUIDELINES).map(([key, guideline]) => (
              <div
                key={key}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  {guideline.levels.map((level) => (
                    <span
                      key={level}
                      className={`text-xs font-mono px-1.5 py-0.5 rounded ${LEVEL_COLORS[level].bg} ${LEVEL_COLORS[level].text}`}
                    >
                      {level}
                    </span>
                  ))}
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  {guideline.targetPercent}%
                </p>
                <p className="text-sm text-slate-400">{guideline.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pattern Matching */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            Pattern → Level Mapping
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(["L3", "L4", "L5", "L6", "L7"] as EntropyLevel[]).map((level) => {
              const def = ENTROPY_LEVELS[level];
              const colors = LEVEL_COLORS[level];
              const levelPatterns = patterns[level];

              return (
                <div
                  key={level}
                  className={`bg-slate-900 border rounded-xl p-4 ${colors.border}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`font-mono text-sm font-bold ${colors.text}`}>
                      {level}
                    </span>
                    <span className="text-white font-medium">{def.name}</span>
                  </div>
                  <div className="space-y-1.5">
                    {levelPatterns.slice(0, 6).map((pattern, i) => (
                      <div
                        key={i}
                        className="text-sm text-slate-400 flex items-start gap-2"
                      >
                        <span className={colors.text}>•</span>
                        <span className="font-mono text-xs">{pattern}</span>
                      </div>
                    ))}
                    {levelPatterns.length > 6 && (
                      <p className="text-xs text-slate-500 mt-2">
                        +{levelPatterns.length - 6} more patterns
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Format Mappings */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Format → Level Mapping
          </h2>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-800 text-sm text-slate-500">
              <div className="col-span-3">Format</div>
              <div className="col-span-2">Primary</div>
              <div className="col-span-2">Secondary</div>
              <div className="col-span-5">Playbook Hints</div>
            </div>

            {formatMappings.map(({ id, mapping }) => {
              const primaryColors = LEVEL_COLORS[mapping.primary];

              return (
                <div
                  key={id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/30"
                >
                  <div className="col-span-3">
                    <span className="text-white text-sm font-medium">
                      {id.replace("Carousel", "")}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`text-xs font-mono px-2 py-1 rounded ${primaryColors.bg} ${primaryColors.text}`}
                    >
                      {mapping.primary}
                    </span>
                  </div>
                  <div className="col-span-2 flex gap-1">
                    {mapping.secondary.map((level) => (
                      <span
                        key={level}
                        className={`text-xs font-mono px-1.5 py-0.5 rounded ${LEVEL_COLORS[level].bg} ${LEVEL_COLORS[level].text}`}
                      >
                        {level}
                      </span>
                    ))}
                    {mapping.secondary.length === 0 && (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </div>
                  <div className="col-span-5">
                    <p className="text-xs text-slate-400">{mapping.playbook.device}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Common Gaps */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rose-400" />
            Common Gaps (Most Agents)
          </h2>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="space-y-3">
              {COMMON_GAPS.map(({ level, reason }) => {
                const colors = LEVEL_COLORS[level];
                const def = ENTROPY_LEVELS[level];

                return (
                  <div key={level} className="flex items-start gap-3">
                    <span
                      className={`text-xs font-mono px-2 py-1 rounded ${colors.bg} ${colors.text}`}
                    >
                      {level}
                    </span>
                    <div>
                      <span className="text-white font-medium">{def.name}</span>
                      <span className="text-slate-400 mx-2">—</span>
                      <span className="text-slate-400">{reason}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-sm text-slate-400">
                <ArrowRight className="w-4 h-4 inline mr-1 text-emerald-400" />
                Fill L3, L5, L6 first — highest inquiry drivers
              </p>
            </div>
          </div>
        </section>

        {/* Quick Reference */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Quick Reference
          </h2>

          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-white font-medium mb-2">Core Idea</h3>
                <p className="text-slate-300 text-sm">
                  Every piece of content reduces prospect uncertainty. When enough
                  uncertainty is resolved, booking feels like the obvious next step.
                </p>
              </div>
              <div>
                <h3 className="text-white font-medium mb-2">The Flow</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Broad</span>
                  <span className="text-slate-600">(L1-L2)</span>
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                  <span className="text-slate-400">Education</span>
                  <span className="text-slate-600">(L3-L4)</span>
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                  <span className="text-emerald-400">Conversion</span>
                  <span className="text-slate-600">(L5-L6)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-sm text-slate-600 pb-8">
          See{" "}
          <code className="text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
            /docs/ENTROPY_LEVELS.md
          </code>{" "}
          for full documentation
        </div>
      </div>
    </div>
  );
}
