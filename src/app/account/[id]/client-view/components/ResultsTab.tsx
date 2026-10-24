import { Calendar, Target, TrendingUp, MessageSquare } from "lucide-react";
import type { ClientHubData } from "./types";

export function ResultsTab({ data }: { data: ClientHubData }) {
  // Calculate coverage stats
  const totalCoverage =
    data.topics.length > 0
      ? Math.round(
          data.topics.reduce((sum, t) => sum + t.coverage.percentage, 0) /
            data.topics.length
        )
      : 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Results</h2>
      <p className="text-slate-400 mb-6">
        How your content strategy is performing.
      </p>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-white">
            {data.summary.postsPublished}
          </p>
          <p className="text-sm text-slate-500">Posts Published</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
            <Target className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-white">{data.topics.length}</p>
          <p className="text-sm text-slate-500">Topics Active</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-white">{totalCoverage}%</p>
          <p className="text-sm text-slate-500">Avg. Topic Coverage</p>
        </div>
      </div>

      {/* Topic Progress */}
      <h3 className="text-lg font-semibold text-white mb-4">Topic Progress</h3>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        {data.topics.map((topic) => (
          <div key={topic.id}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white truncate pr-4">{topic.title}</span>
              <span className="text-xs text-slate-500">
                {topic.coverage.coveredCount}/{topic.coverage.totalStages}
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  topic.coverage.percentage === 100
                    ? "bg-emerald-500"
                    : topic.coverage.percentage >= 50
                    ? "bg-blue-500"
                    : "bg-amber-500"
                }`}
                style={{ width: `${topic.coverage.percentage}%` }}
              />
            </div>
          </div>
        ))}

        {data.topics.length === 0 && (
          <p className="text-slate-500 text-center py-4">No topics to track yet.</p>
        )}
      </div>

      {/* Coming Soon */}
      <div className="mt-8 p-5 bg-slate-900/50 border border-dashed border-slate-700 rounded-xl text-center">
        <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">
          DM tracking and booking analytics coming soon.
        </p>
      </div>
    </div>
  );
}
