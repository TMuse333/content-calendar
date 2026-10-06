"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Wifi,
  WifiOff,
  Clock,
  ArrowRight,
  Palette,
  Brain,
  Calendar,
  Eye,
  Send,
  CheckSquare,
  Share2,
} from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";

interface AppStatus {
  name: string;
  url: string;
  status: "connected" | "disconnected" | "error";
  latency?: number;
  details?: {
    formatsCount?: number;
    formats?: { id: string; name: string }[];
    note?: string;
  };
  error?: string;
}

interface PipelineStats {
  proposed: number;
  scheduled: number;
  contentReady: number;
  rendered: number;
  inReview: number;
  revision: number;
  approved: number;
  posted: number;
}

interface PipelineStatus {
  apps: AppStatus[];
  pipeline: PipelineStats | null;
  checkedAt: string;
}

const PIPELINE_STAGES = [
  { key: "proposed", label: "Proposed", icon: Calendar, color: "slate" },
  { key: "scheduled", label: "Scheduled", icon: CheckSquare, color: "blue" },
  { key: "contentReady", label: "Content Ready", icon: Brain, color: "amber" },
  { key: "rendered", label: "Rendered", icon: Palette, color: "purple" },
  { key: "inReview", label: "In Review", icon: Eye, color: "orange" },
  { key: "revision", label: "Revision", icon: AlertCircle, color: "red" },
  { key: "approved", label: "Approved", icon: CheckCircle, color: "green" },
  { key: "posted", label: "Posted", icon: Share2, color: "emerald" },
];

export default function PipelinePage() {
  const { currentAccount } = useAccount();
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!currentAccount) return;

    try {
      const res = await fetch(`/api/pipeline/status?agentId=${currentAccount.id}`);
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to fetch pipeline status:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentAccount]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const getStatusIcon = (appStatus: AppStatus["status"]) => {
    switch (appStatus) {
      case "connected":
        return <Wifi className="w-5 h-5 text-emerald-400" />;
      case "disconnected":
        return <WifiOff className="w-5 h-5 text-slate-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getStatusColor = (appStatus: AppStatus["status"]) => {
    switch (appStatus) {
      case "connected":
        return "border-emerald-500/30 bg-emerald-500/5";
      case "disconnected":
        return "border-slate-700 bg-slate-800/50";
      case "error":
        return "border-red-500/30 bg-red-500/5";
    }
  };

  const getStageColor = (color: string) => {
    const colors: Record<string, { bg: string; text: string; ring: string }> = {
      slate: { bg: "bg-slate-500/20", text: "text-slate-400", ring: "ring-slate-500/30" },
      blue: { bg: "bg-blue-500/20", text: "text-blue-400", ring: "ring-blue-500/30" },
      amber: { bg: "bg-amber-500/20", text: "text-amber-400", ring: "ring-amber-500/30" },
      purple: { bg: "bg-purple-500/20", text: "text-purple-400", ring: "ring-purple-500/30" },
      orange: { bg: "bg-orange-500/20", text: "text-orange-400", ring: "ring-orange-500/30" },
      red: { bg: "bg-red-500/20", text: "text-red-400", ring: "ring-red-500/30" },
      green: { bg: "bg-green-500/20", text: "text-green-400", ring: "ring-green-500/30" },
      emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400", ring: "ring-emerald-500/30" },
    };
    return colors[color] || colors.slate;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading pipeline status...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">
            Connected apps and content workflow
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Connected Apps */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Connected Apps</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* This App (Strategy) */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Strategy App</h3>
                  <p className="text-xs text-slate-500">This app</p>
                </div>
              </div>
              <Wifi className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-sm text-slate-400">
              Calendar scheduling, client review, content orchestration
            </div>
          </div>

          {/* Other Apps */}
          {status?.apps.map((app) => (
            <div
              key={app.name}
              className={`p-4 rounded-xl border ${getStatusColor(app.status)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      app.status === "connected"
                        ? "bg-gradient-to-br from-purple-500 to-pink-500"
                        : "bg-slate-700"
                    }`}
                  >
                    {app.name === "Graphics App" ? (
                      <Palette className="w-5 h-5 text-white" />
                    ) : (
                      <Brain className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{app.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{app.url}</p>
                  </div>
                </div>
                {getStatusIcon(app.status)}
              </div>

              {app.status === "connected" && (
                <div className="space-y-2">
                  {app.latency && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {app.latency}ms latency
                    </div>
                  )}
                  {app.details?.formatsCount !== undefined && (
                    <div className="text-sm text-slate-400">
                      {app.details.formatsCount} formats available
                    </div>
                  )}
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Open app <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {app.status === "disconnected" && (
                <div className="text-sm text-slate-500">
                  {app.error || "Not available"}
                </div>
              )}

              {app.status === "error" && (
                <div className="text-sm text-red-400">{app.error}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline Flow */}
      {status?.pipeline && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Content Pipeline</h2>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            {/* Visual Pipeline */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
              {PIPELINE_STAGES.map((stage, index) => {
                const count = status.pipeline?.[stage.key as keyof PipelineStats] || 0;
                const colors = getStageColor(stage.color);
                const Icon = stage.icon;

                return (
                  <div key={stage.key} className="flex items-center">
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div
                        className={`w-12 h-12 rounded-xl ${colors.bg} ring-1 ${colors.ring} flex items-center justify-center mb-2`}
                      >
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${colors.text}`}>
                          {count}
                        </div>
                        <div className="text-xs text-slate-500 whitespace-nowrap">
                          {stage.label}
                        </div>
                      </div>
                    </div>
                    {index < PIPELINE_STAGES.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-slate-600 mx-1 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {(status.pipeline.proposed || 0) + (status.pipeline.scheduled || 0)}
                </div>
                <div className="text-xs text-slate-500">Awaiting Content</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {status.pipeline.contentReady || 0}
                </div>
                <div className="text-xs text-slate-500">Ready to Render</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {(status.pipeline.inReview || 0) + (status.pipeline.revision || 0)}
                </div>
                <div className="text-xs text-slate-500">In Client Review</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  {(status.pipeline.approved || 0) + (status.pipeline.posted || 0)}
                </div>
                <div className="text-xs text-slate-500">Completed</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Available Formats */}
      {status?.apps.find((a) => a.name === "Graphics App")?.status === "connected" && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">
            Available Graphic Formats
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {status.apps
              .find((a) => a.name === "Graphics App")
              ?.details?.formats?.map((format) => (
                <div
                  key={format.id}
                  className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-purple-500/30 transition-colors"
                >
                  <div className="font-medium text-white text-sm">{format.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{format.id}</div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href={currentAccount ? `/account/${currentAccount.id}/calendar` : "#"}
            className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span className="font-medium text-white">Schedule Content</span>
            </div>
            <p className="text-sm text-slate-400">
              Create and manage scheduled posts in the calendar
            </p>
          </a>

          <a
            href={currentAccount ? `/review/${currentAccount.id}` : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Eye className="w-5 h-5 text-orange-400" />
              <span className="font-medium text-white">Client Review Page</span>
            </div>
            <p className="text-sm text-slate-400">
              Open the review page clients use to approve content
            </p>
          </a>

          {status?.apps.find((a) => a.name === "Graphics App")?.status === "connected" && (
            <a
              href={status.apps.find((a) => a.name === "Graphics App")?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-purple-500/30 hover:bg-purple-500/5 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Palette className="w-5 h-5 text-purple-400" />
                <span className="font-medium text-white">Open Graphics App</span>
              </div>
              <p className="text-sm text-slate-400">
                Create and render graphics for scheduled posts
              </p>
            </a>
          )}
        </div>
      </section>

      {/* Last checked */}
      {status?.checkedAt && (
        <div className="text-xs text-slate-600 text-center">
          Last checked: {new Date(status.checkedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
