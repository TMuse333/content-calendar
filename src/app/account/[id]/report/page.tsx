"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Calendar,
  Users,
  Eye,
  MousePointer,
  Heart,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Baseline {
  id: string;
  capturedAt: string;
  instagram?: {
    reach: number;
    profileVisits: number;
    websiteClicks: number;
    accountsEngaged: number;
    totalInteractions: number;
    followers: number;
    postsCount: number;
    avgEngagementRate: number;
  };
}

interface CurrentMetrics {
  reach: number;
  profileVisits: number;
  websiteClicks: number;
  accountsEngaged: number;
  totalInteractions: number;
  followers: number;
  postsCount: number;
}

export default function ReportPage() {
  const params = useParams();
  const accountId = params.id as string;

  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [current, setCurrent] = useState<CurrentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [accountId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch baseline
      const baselineRes = await fetch(`/api/accounts/${accountId}/baseline`);
      const baselineData = await baselineRes.json();

      if (baselineData.baselines?.length > 0) {
        setBaseline(baselineData.baselines[0]);
      }

      // Fetch current metrics (this triggers a fresh API call)
      const currentRes = await fetch(`/api/accounts/${accountId}/baseline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }), // Just fetch, don't save
      });
      const currentData = await currentRes.json();

      if (currentData.baseline?.instagram) {
        setCurrent(currentData.baseline.instagram);
      }
    } catch (err) {
      setError("Failed to load report data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const captureBaseline = async () => {
    setCapturing(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/baseline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Manual baseline capture" }),
      });
      const data = await res.json();

      if (data.success) {
        setBaseline(data.baseline);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCapturing(false);
    }
  };

  const refreshMetrics = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDelta = (current: number, baseline: number) => {
    if (!baseline) return { value: current, percent: 0, direction: "neutral" as const };
    const diff = current - baseline;
    const percent = baseline > 0 ? Math.round((diff / baseline) * 100) : 0;
    const direction = diff > 0 ? "up" as const : diff < 0 ? "down" as const : "neutral" as const;
    return { value: diff, percent, direction };
  };

  const DeltaIndicator = ({ delta }: { delta: ReturnType<typeof getDelta> }) => {
    if (delta.direction === "neutral") {
      return <Minus className="w-4 h-4 text-slate-400" />;
    }
    if (delta.direction === "up") {
      return (
        <span className="flex items-center gap-1 text-green-400 text-sm">
          <TrendingUp className="w-4 h-4" />
          +{delta.percent}%
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-red-400 text-sm">
        <TrendingDown className="w-4 h-4" />
        {delta.percent}%
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: "Followers",
      icon: Users,
      baseline: baseline?.instagram?.followers,
      current: current?.followers,
    },
    {
      label: "Reach (30d)",
      icon: Eye,
      baseline: baseline?.instagram?.reach,
      current: current?.reach,
    },
    {
      label: "Profile Visits",
      icon: MousePointer,
      baseline: baseline?.instagram?.profileVisits,
      current: current?.profileVisits,
    },
    {
      label: "Website Clicks",
      icon: MousePointer,
      baseline: baseline?.instagram?.websiteClicks,
      current: current?.websiteClicks,
    },
    {
      label: "Accounts Engaged",
      icon: Heart,
      baseline: baseline?.instagram?.accountsEngaged,
      current: current?.accountsEngaged,
    },
    {
      label: "Total Interactions",
      icon: Heart,
      baseline: baseline?.instagram?.totalInteractions,
      current: current?.totalInteractions,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 print:mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Progress Report</h1>
          <p className="text-slate-400 text-sm">
            {baseline
              ? `Baseline: ${formatDate(baseline.capturedAt)}`
              : "No baseline captured yet"
            }
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          {!baseline && (
            <button
              onClick={captureBaseline}
              disabled={capturing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {capturing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              Capture Baseline
            </button>
          )}
          <button
            onClick={refreshMetrics}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* No baseline message */}
      {!baseline && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-400 mb-1">No Baseline Yet</h3>
              <p className="text-slate-400 text-sm">
                Capture a baseline to start tracking progress. This saves the current state
                of the Instagram account so we can measure growth over time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const delta = metric.baseline !== undefined && metric.current !== undefined
            ? getDelta(metric.current, metric.baseline)
            : null;

          return (
            <div
              key={metric.label}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 text-slate-400 mb-3">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{metric.label}</span>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">
                    {metric.current !== undefined ? formatNumber(metric.current) : "—"}
                  </p>
                  {metric.baseline !== undefined && (
                    <p className="text-xs text-slate-500">
                      was {formatNumber(metric.baseline)}
                    </p>
                  )}
                </div>
                {delta && <DeltaIndicator delta={delta} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {baseline && current && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
          <div className="space-y-3 text-sm text-slate-300">
            {(() => {
              const followerDelta = getDelta(current.followers, baseline.instagram?.followers || 0);
              const reachDelta = getDelta(current.reach, baseline.instagram?.reach || 0);
              const profileDelta = getDelta(current.profileVisits, baseline.instagram?.profileVisits || 0);

              const insights = [];

              if (followerDelta.direction === "up") {
                insights.push(`Gained ${followerDelta.value.toLocaleString()} followers (+${followerDelta.percent}%)`);
              } else if (followerDelta.direction === "down") {
                insights.push(`Lost ${Math.abs(followerDelta.value).toLocaleString()} followers (${followerDelta.percent}%)`);
              }

              if (reachDelta.direction === "up") {
                insights.push(`Reach increased by ${reachDelta.percent}%`);
              }

              if (profileDelta.direction === "up") {
                insights.push(`Profile visits up ${profileDelta.percent}%`);
              }

              if (insights.length === 0) {
                insights.push("Metrics are stable since baseline");
              }

              return insights.map((insight, i) => (
                <p key={i}>• {insight}</p>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Print footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-slate-700 text-center text-xs text-slate-500">
        Generated on {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
