"use client";

import { useEffect, useState, useMemo } from "react";
import { useAccount } from "@/contexts/AccountContext";
import {
  Loader2,
  Sparkles,
  RefreshCw,
  BarChart3,
  FileText,
  Clock,
  Calendar,
  ChevronRight,
  Play,
  Image,
  TrendingUp,
  Eye,
  EyeOff,
  ArrowLeft,
  X,
  ExternalLink,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import type { Post } from "@/lib/types/post";

type InsightsPeriod = "all-time" | "weekly" | "monthly";
type TabType = "latest" | "history" | "patterns";

interface PostCitation {
  instagramId: string;
  caption?: string;
  contentType?: string;
  reach?: number;
}

interface ContentInsights {
  _id?: string;
  accountId: string;
  generatedAt: string;
  period: InsightsPeriod;
  periodStart?: string;
  periodEnd?: string;
  postCount: number;
  postsAnalyzed?: string[];
  insights: string;
  citations?: PostCitation[];
}

interface PostStats {
  total: number;
  videos: number;
  images: number;
  carousels: number;
  transcribed: number;
  classified: number;
}

interface CitationCount {
  instagramId: string;
  caption?: string;
  contentType?: string;
  reach?: number;
  thumbnailUrl?: string;
  mediaType?: string;
  count: number;
  insightDates: string[];
}

export default function InsightsPage() {
  const { currentAccount } = useAccount();
  const [insights, setInsights] = useState<ContentInsights | null>(null);
  const [history, setHistory] = useState<ContentInsights[]>([]);
  const [stats, setStats] = useState<PostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<InsightsPeriod>("all-time");
  const [activeTab, setActiveTab] = useState<TabType>("latest");
  const [viewingHistoryItem, setViewingHistoryItem] = useState<ContentInsights | null>(null);
  const [showUncited, setShowUncited] = useState(false);
  const [postModal, setPostModal] = useState<{ isOpen: boolean; post: Post | null; loading: boolean }>({
    isOpen: false,
    post: null,
    loading: false,
  });

  const fetchInsights = async () => {
    if (!currentAccount) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/insights`);
      const data = await res.json();

      setInsights(data.data || null);
      setStats(data.stats || null);
      setHistory(data.history || []);
    } catch (err) {
      console.error("Failed to fetch insights:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [currentAccount]);

  const handleGenerate = async (isBaseline: boolean = false) => {
    if (!currentAccount) return;

    setGenerating(true);
    setError(null);

    const period = isBaseline ? "all-time" : selectedPeriod;
    let periodStart: string | undefined;
    let periodEnd: string | undefined;
    const now = new Date();

    if (period === "weekly") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      periodStart = weekAgo.toISOString();
      periodEnd = now.toISOString();
    } else if (period === "monthly") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      periodStart = monthAgo.toISOString();
      periodEnd = now.toISOString();
    }

    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/insights/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, periodStart, periodEnd }),
      });
      const data = await res.json();

      if (data.success) {
        await fetchInsights();
        setActiveTab("latest");
      } else {
        setError(data.error || "Failed to generate insights");
      }
    } catch (err) {
      setError("Failed to generate insights");
    } finally {
      setGenerating(false);
    }
  };

  // Open post modal and fetch details
  const openPostModal = async (instagramId: string) => {
    if (!currentAccount) return;

    setPostModal({ isOpen: true, post: null, loading: true });

    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/posts/${instagramId}`);
      const data = await res.json();

      if (data.data) {
        setPostModal({ isOpen: true, post: data.data, loading: false });
      } else {
        setPostModal({ isOpen: false, post: null, loading: false });
      }
    } catch (err) {
      console.error("Failed to fetch post:", err);
      setPostModal({ isOpen: false, post: null, loading: false });
    }
  };

  const closePostModal = () => {
    setPostModal({ isOpen: false, post: null, loading: false });
  };

  // Calculate citation patterns across all history
  const citationPatterns = useMemo(() => {
    const counts: Record<string, CitationCount> = {};

    history.forEach((insight) => {
      insight.citations?.forEach((citation) => {
        if (!counts[citation.instagramId]) {
          counts[citation.instagramId] = {
            instagramId: citation.instagramId,
            caption: citation.caption,
            contentType: citation.contentType,
            reach: citation.reach,
            count: 0,
            insightDates: [],
          };
        }
        counts[citation.instagramId].count++;
        counts[citation.instagramId].insightDates.push(insight.generatedAt);
      });
    });

    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [history]);

  // Get all posts analyzed but never cited
  const neverCited = useMemo(() => {
    const citedIds = new Set(citationPatterns.map((c) => c.instagramId));
    const allAnalyzed = new Set<string>();

    history.forEach((insight) => {
      insight.postsAnalyzed?.forEach((id) => allAnalyzed.add(id));
    });

    return Array.from(allAnalyzed).filter((id) => !citedIds.has(id));
  }, [history, citationPatterns]);

  // Transform [POST-X] citations into clickable links with better labels
  const transformInsights = (insightData: ContentInsights) => {
    if (!insightData?.insights || !currentAccount) return insightData?.insights || "";

    return insightData.insights.replace(/\[POST-(\d+)\]/g, (match, num) => {
      const idx = parseInt(num, 10) - 1;
      const postId = insightData.postsAnalyzed?.[idx];
      const citation = insightData.citations?.find((c) => c.instagramId === postId);

      if (postId) {
        // Try to get a better label from the citation caption
        let label = match; // fallback to [POST-X]
        if (citation?.caption) {
          // Truncate caption to ~35 chars
          const truncated = citation.caption.slice(0, 35).replace(/\n/g, " ").trim();
          label = truncated.length < citation.caption.length ? `${truncated}...` : truncated;
        }
        return `[${label}](/account/${currentAccount.id}/library/${postId})`;
      }
      return match;
    });
  };

  const currentInsight = viewingHistoryItem || insights;
  const transformedInsights = useMemo(
    () => (currentInsight ? transformInsights(currentInsight) : ""),
    [currentInsight, currentAccount]
  );

  if (!currentAccount) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    );
  }

  const canGenerate = stats && stats.classified >= 5;
  const isFirstRun = history.length === 0 && !insights;

  // First-run baseline state
  if (!loading && isFirstRun && canGenerate) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-emerald-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Generate Your Baseline</h1>
          <p className="text-slate-400 mb-8">
            Start tracking content performance over time with your first insight.
          </p>

          <div className="bg-slate-800/50 rounded-lg p-4 mb-8 text-left">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="text-xs text-white">✓</span>
                </div>
                <span className="text-slate-300">{stats?.total} posts synced</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="text-xs text-white">✓</span>
                </div>
                <span className="text-slate-300">{stats?.classified} posts classified</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                  <span className="text-xs text-slate-400">○</span>
                </div>
                <span className="text-slate-400">Generate baseline insight</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleGenerate(true)}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white mx-auto disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Baseline...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Baseline
              </>
            )}
          </button>

          <p className="text-sm text-slate-500 mt-6">
            After your baseline, set up recurring weekly or monthly insights to track changes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Insights</h1>
          <p className="text-slate-400 mt-1">AI-powered analysis of your content performance</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selection */}
          <div className="flex items-center bg-slate-800 rounded-lg p-1">
            {(["all-time", "monthly", "weekly"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  selectedPeriod === period
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {period === "all-time" ? "All Time" : period === "monthly" ? "Monthly" : "Weekly"}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleGenerate(false)}
            disabled={generating || !canGenerate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-800">
        {(["latest", "history", "patterns"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setViewingHistoryItem(null);
            }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-emerald-500 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {tab === "latest" && "Latest"}
            {tab === "history" && `History (${history.length})`}
            {tab === "patterns" && "Citation Patterns"}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 text-red-400 p-4 rounded-xl mb-6">{error}</div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* LATEST TAB */}
          {activeTab === "latest" && (
            <>
              {!currentInsight ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                  <Sparkles className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-white mb-2">Ready to Analyze</h2>
                  <p className="text-slate-400 mb-6">
                    You have {stats?.classified} classified posts ready for analysis.
                  </p>
                  <button
                    onClick={() => handleGenerate(false)}
                    disabled={generating}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white mx-auto"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate Insights
                  </button>
                </div>
              ) : (
                <div className="flex gap-6">
                  {/* Main Insights */}
                  <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl">
                    {/* Back button if viewing history item */}
                    {viewingHistoryItem && (
                      <div className="px-4 py-2 border-b border-slate-800">
                        <button
                          onClick={() => setViewingHistoryItem(null)}
                          className="flex items-center gap-1 text-sm text-slate-400 hover:text-white"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back to latest
                        </button>
                      </div>
                    )}

                    {/* Insights Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                          <Sparkles className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            Analysis of {currentInsight.postCount} posts
                            <span className="text-slate-500 ml-2">({currentInsight.period})</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            Generated {new Date(currentInsight.generatedAt).toLocaleString()}
                            {currentInsight.citations?.length
                              ? ` · ${currentInsight.citations.length} posts cited`
                              : ""}
                          </div>
                        </div>
                      </div>
                      {!viewingHistoryItem && (
                        <button
                          onClick={() => handleGenerate(false)}
                          disabled={generating}
                          className="flex items-center gap-1 text-sm text-slate-400 hover:text-white"
                        >
                          <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                          Refresh
                        </button>
                      )}
                    </div>

                    {/* Insights Content */}
                    <div className="p-6 prose prose-invert prose-slate max-w-none">
                      <ReactMarkdown
                        components={{
                          h2: ({ children }) => (
                            <h2 className="text-xl font-semibold text-white mt-8 mb-4 first:mt-0">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-lg font-medium text-white mt-6 mb-3">{children}</h3>
                          ),
                          p: ({ children }) => (
                            <p className="text-slate-300 mb-4 leading-relaxed">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside space-y-2 mb-4 text-slate-300">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside space-y-2 mb-4 text-slate-300">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => <li className="text-slate-300">{children}</li>,
                          strong: ({ children }) => (
                            <strong className="font-semibold text-white">{children}</strong>
                          ),
                          em: ({ children }) => <em className="text-slate-400">{children}</em>,
                          a: ({ href, children }) => {
                            // Check if this is a citation link (contains /library/)
                            const isCitationLink = href?.includes("/library/");
                            if (isCitationLink && href) {
                              // Extract the post ID from the URL
                              const match = href.match(/\/library\/([^/]+)$/);
                              const postId = match?.[1];
                              if (postId) {
                                return (
                                  <button
                                    onClick={() => openPostModal(postId)}
                                    className="text-emerald-400 hover:text-emerald-300 underline"
                                  >
                                    {children}
                                  </button>
                                );
                              }
                            }
                            return (
                              <Link
                                href={href || "#"}
                                className="text-emerald-400 hover:text-emerald-300 underline"
                              >
                                {children}
                              </Link>
                            );
                          },
                        }}
                      >
                        {transformedInsights}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Citations Sidebar */}
                  {currentInsight.citations && currentInsight.citations.length > 0 && (
                    <div className="w-72 flex-shrink-0">
                      <div className="bg-slate-900 border border-slate-800 rounded-xl sticky top-6">
                        <div className="px-4 py-3 border-b border-slate-800">
                          <h3 className="text-sm font-medium text-white">
                            Cited Posts ({currentInsight.citations.length})
                          </h3>
                        </div>
                        <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
                          {currentInsight.citations.map((citation, idx) => (
                            <button
                              key={citation.instagramId}
                              onClick={() => openPostModal(citation.instagramId)}
                              className="block px-4 py-3 hover:bg-slate-800/50 w-full text-left"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-emerald-400">
                                  [POST-{idx + 1}]
                                </span>
                                {citation.contentType && (
                                  <span className="text-xs px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">
                                    {citation.contentType}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-2">
                                {citation.caption || "No caption"}
                              </p>
                              {citation.reach && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {citation.reach.toLocaleString()} reach
                                </p>
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Not Cited Section */}
                        {currentInsight.postsAnalyzed &&
                          currentInsight.postsAnalyzed.length > (currentInsight.citations?.length || 0) && (
                            <div className="border-t border-slate-800 px-4 py-3">
                              <button
                                onClick={() => setShowUncited(!showUncited)}
                                className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 w-full"
                              >
                                {showUncited ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                {currentInsight.postsAnalyzed.length - (currentInsight.citations?.length || 0)} analyzed but not cited
                              </button>
                              {showUncited && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {currentInsight.postsAnalyzed
                                    .filter(
                                      (id) => !currentInsight.citations?.some((c) => c.instagramId === id)
                                    )
                                    .slice(0, 8)
                                    .map((id) => (
                                      <button
                                        key={id}
                                        onClick={() => openPostModal(id)}
                                        className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center hover:bg-slate-700"
                                      >
                                        <Image className="w-4 h-4 text-slate-500" />
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                  <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-white mb-2">No History Yet</h2>
                  <p className="text-slate-400">
                    Generate your first insight to start building history.
                  </p>
                </div>
              ) : (
                <>
                  {/* Group by year */}
                  {(() => {
                    const byYear: Record<string, ContentInsights[]> = {};
                    history.forEach((item) => {
                      const year = new Date(item.generatedAt).getFullYear().toString();
                      if (!byYear[year]) byYear[year] = [];
                      byYear[year].push(item);
                    });

                    return Object.entries(byYear)
                      .sort(([a], [b]) => parseInt(b) - parseInt(a))
                      .map(([year, items]) => (
                        <div key={year}>
                          <h3 className="text-sm font-medium text-slate-500 mb-3">{year}</h3>
                          <div className="space-y-3">
                            {items.map((item) => {
                              const date = new Date(item.generatedAt);
                              const periodLabel =
                                item.period === "all-time"
                                  ? "All-Time"
                                  : item.period === "monthly"
                                  ? "Monthly"
                                  : "Weekly";

                              return (
                                <div
                                  key={item._id}
                                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                      <div className="text-center min-w-[60px]">
                                        <div className="text-2xl font-bold text-white">
                                          {date.getDate()}
                                        </div>
                                        <div className="text-xs text-slate-500 uppercase">
                                          {date.toLocaleDateString("en-US", { month: "short" })}
                                        </div>
                                      </div>

                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span
                                            className={`text-xs px-2 py-0.5 rounded ${
                                              item.period === "all-time"
                                                ? "bg-purple-500/20 text-purple-400"
                                                : item.period === "monthly"
                                                ? "bg-blue-500/20 text-blue-400"
                                                : "bg-emerald-500/20 text-emerald-400"
                                            }`}
                                          >
                                            {periodLabel}
                                          </span>
                                          <span className="text-sm text-slate-400">
                                            {item.postCount} posts analyzed
                                          </span>
                                          {item.citations && item.citations.length > 0 && (
                                            <span className="text-sm text-slate-500">
                                              · {item.citations.length} cited
                                            </span>
                                          )}
                                        </div>

                                        {/* Date range visualization */}
                                        {item.periodStart && item.periodEnd && (
                                          <div className="flex items-center gap-2 mt-2">
                                            <div className="flex items-center">
                                              <div className="w-2 h-2 rounded-full bg-slate-600" />
                                              <div className="h-0.5 w-24 bg-gradient-to-r from-slate-600 to-emerald-500" />
                                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            </div>
                                            <span className="text-xs text-slate-500">
                                              {new Date(item.periodStart).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                              })}{" "}
                                              →{" "}
                                              {new Date(item.periodEnd).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                              })}
                                            </span>
                                          </div>
                                        )}

                                        {item.period === "all-time" && (
                                          <div className="flex items-center gap-2 mt-2">
                                            <div className="flex items-center">
                                              <div className="w-2 h-2 rounded-full bg-slate-600" />
                                              <div className="h-0.5 w-32 bg-gradient-to-r from-slate-600 via-purple-500 to-purple-500" />
                                              <div className="w-2 h-2 rounded-full bg-purple-500" />
                                            </div>
                                            <span className="text-xs text-slate-500">Full history</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => {
                                        setViewingHistoryItem(item);
                                        setActiveTab("latest");
                                      }}
                                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white"
                                    >
                                      View
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                  })()}
                </>
              )}
            </div>
          )}

          {/* PATTERNS TAB */}
          {activeTab === "patterns" && (
            <div className="space-y-6">
              {citationPatterns.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                  <TrendingUp className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-white mb-2">No Patterns Yet</h2>
                  <p className="text-slate-400">
                    Generate a few insights to see which posts get cited most often.
                  </p>
                </div>
              ) : (
                <>
                  {/* Most Cited */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800">
                      <h3 className="text-sm font-medium text-white">Most Cited Posts</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Posts that keep appearing in your insights — your best-performing content
                      </p>
                    </div>
                    <div className="divide-y divide-slate-800">
                      {citationPatterns.slice(0, 10).map((post) => {
                        const maxCount = citationPatterns[0]?.count || 1;
                        const barWidth = (post.count / maxCount) * 100;

                        return (
                          <button
                            key={post.instagramId}
                            onClick={() => openPostModal(post.instagramId)}
                            className="flex items-center gap-4 p-4 hover:bg-slate-800/50 w-full text-left"
                          >
                            <div className="w-12 h-12 bg-slate-800 rounded flex items-center justify-center flex-shrink-0">
                              {post.mediaType === "VIDEO" ? (
                                <Play className="w-5 h-5 text-slate-500" />
                              ) : (
                                <Image className="w-5 h-5 text-slate-500" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">
                                {post.caption || "No caption"}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {post.contentType && (
                                  <span className="text-xs px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">
                                    {post.contentType}
                                  </span>
                                )}
                                {post.reach && (
                                  <span className="text-xs text-slate-500">
                                    {post.reach.toLocaleString()} reach
                                  </span>
                                )}
                              </div>

                              {/* Citation bar */}
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${barWidth}%` }}
                                  />
                                </div>
                                <span className="text-xs text-emerald-400 font-medium">
                                  {post.count}x
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Never Cited */}
                  {neverCited.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-800">
                        <h3 className="text-sm font-medium text-white">Never Cited</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Posts analyzed but never referenced in insights — may indicate weaker content
                        </p>
                      </div>
                      <div className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {neverCited.slice(0, 12).map((id) => (
                            <button
                              key={id}
                              onClick={() => openPostModal(id)}
                              className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700"
                            >
                              <Image className="w-6 h-6 text-slate-500" />
                            </button>
                          ))}
                          {neverCited.length > 12 && (
                            <div className="w-16 h-16 bg-slate-800/50 rounded-lg flex items-center justify-center">
                              <span className="text-xs text-slate-500">+{neverCited.length - 12}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Post Detail Modal */}
      {postModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Post Details</h2>
              <div className="flex items-center gap-2">
                {postModal.post && (
                  <Link
                    href={`/account/${currentAccount.id}/library/${postModal.post.instagramId}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-400 hover:text-white"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Full Page
                  </Link>
                )}
                <button
                  onClick={closePostModal}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {postModal.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                </div>
              ) : postModal.post ? (
                <div className="space-y-6">
                  {/* Thumbnail & Basic Info */}
                  <div className="flex gap-4">
                    <div className="w-32 h-32 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                      {postModal.post.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={postModal.post.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {postModal.post.mediaType === "VIDEO" ? (
                            <Play className="w-8 h-8 text-slate-600" />
                          ) : (
                            <Image className="w-8 h-8 text-slate-600" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-400">
                          {postModal.post.mediaType}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(postModal.post.postedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Classification */}
                      {postModal.post.classification && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
                            {postModal.post.classification.contentType}
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                            {postModal.post.classification.underlyingNeed}
                          </span>
                        </div>
                      )}

                      {/* Metrics */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-800 rounded p-2 text-center">
                          <div className="text-lg font-semibold text-white">
                            {postModal.post.metrics.reach.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-500">Reach</div>
                        </div>
                        <div className="bg-slate-800 rounded p-2 text-center">
                          <div className="text-lg font-semibold text-white">
                            {postModal.post.metrics.impressions.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-500">Impressions</div>
                        </div>
                        <div className="bg-slate-800 rounded p-2 text-center">
                          <div className="text-lg font-semibold text-white">
                            {postModal.post.metrics.engagement.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-500">Engagement</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Caption */}
                  <div>
                    <h4 className="text-xs font-medium text-slate-400 mb-2">Caption</h4>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">
                      {postModal.post.caption || <span className="italic text-slate-500">No caption</span>}
                    </p>
                  </div>

                  {/* Transcript */}
                  {postModal.post.transcript && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 mb-2">Transcript</h4>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto bg-slate-800/50 rounded-lg p-3">
                        {postModal.post.transcript}
                      </p>
                    </div>
                  )}

                  {/* Classification Details */}
                  {postModal.post.classification && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 mb-2">Classification</h4>
                      <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-20">Subject:</span>
                          <span className="text-sm text-white">{postModal.post.classification.subject}</span>
                        </div>
                        {postModal.post.classification.coreMessage && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-slate-500 w-20">Message:</span>
                            <span className="text-sm text-white">{postModal.post.classification.coreMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  Post not found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
