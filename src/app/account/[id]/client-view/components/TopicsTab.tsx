import { Target, Clock, CheckCircle2, Circle, ChevronRight } from "lucide-react";
import type { TopicWithCoverage } from "./types";

export function TopicsTab({
  topics,
  expandedTopic,
  setExpandedTopic,
}: {
  topics: TopicWithCoverage[];
  expandedTopic: string | null;
  setExpandedTopic: (id: string | null) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Your Topics</h2>
      <p className="text-slate-400 mb-6">
        Questions your audience is asking — and how well we&apos;re answering them.
      </p>

      {topics.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <Target className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400">No active topics yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              expanded={expandedTopic === topic.id}
              onToggle={() =>
                setExpandedTopic(expandedTopic === topic.id ? null : topic.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicCard({
  topic,
  expanded,
  onToggle,
}: {
  topic: TopicWithCoverage;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-5 text-left flex items-start gap-4 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {topic.priority === "High" && (
              <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                High Priority
              </span>
            )}
            <span className="text-xs text-slate-500">For: {topic.audience}</span>
          </div>
          <h3 className="text-lg font-semibold text-white">{topic.title}</h3>

          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all ${
                  topic.coverage.percentage === 100
                    ? "bg-emerald-500"
                    : topic.coverage.percentage >= 50
                    ? "bg-blue-500"
                    : "bg-amber-500"
                }`}
                style={{ width: `${topic.coverage.percentage}%` }}
              />
              <div
                className="h-full bg-slate-500/60"
                style={{
                  width: `${Math.round(((topic.coverage.plannedCount ?? 0) / topic.coverage.totalStages) * 100)}%`,
                }}
              />
            </div>
            <span className="text-sm text-slate-400 whitespace-nowrap">
              {topic.coverage.coveredCount}/{topic.coverage.totalStages} stages
              {(topic.coverage.plannedCount ?? 0) > 0 && (
                <span className="text-slate-500"> · {topic.coverage.plannedCount} in progress</span>
              )}
            </span>
          </div>
        </div>

        <ChevronRight
          className={`w-5 h-5 text-slate-500 transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-800">
          {/* Decision Stages */}
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-slate-400 mb-3">
              Questions Covered:
            </p>
            {topic.coverage.stages.map((stage) => (
              <div key={stage.stage} className="flex items-start gap-3">
                {stage.covered ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : stage.planned ? (
                  <Clock className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm ${
                      stage.covered ? "text-white" : "text-slate-500"
                    }`}
                  >
                    {stage.stage}. {stage.label}
                  </p>
                  {stage.questions.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {stage.questions.map((q) => (
                        <p key={q.id} className="text-xs text-slate-400 pl-2 border-l border-slate-700">
                          &ldquo;{q.question}&rdquo;
                        </p>
                      ))}
                    </div>
                  )}
                  {!stage.covered && (stage.plannedQuestions?.length ?? 0) > 0 && (
                    <div className="mt-1 space-y-1">
                      {stage.plannedQuestions!.map((q) => (
                        <p key={q.id} className="text-xs text-slate-500 pl-2 border-l border-slate-700 italic">
                          In progress: &ldquo;{q.question}&rdquo;
                        </p>
                      ))}
                    </div>
                  )}
                  {!stage.covered && !stage.planned && (
                    <p className="text-xs text-amber-500/70 mt-1">
                      Up next
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Personal Question */}
          {topic.personalQuestion && (
            <div className="mt-5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-xs text-emerald-400 font-medium mb-1">
                When they&apos;re ready to act:
              </p>
              <p className="text-white">&ldquo;{topic.personalQuestion}&rdquo;</p>
              <p className="text-xs text-slate-400 mt-2">
                This is when they DM or book — that&apos;s the goal.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
