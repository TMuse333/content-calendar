"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/contexts/AccountContext";
import {
  Loader2,
  TrendingUp,
  Users,
  MousePointer,
  Eye,
  MessageSquare,
  Calendar,
  Target,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle,
  DollarSign,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Video,
  Image,
  LayoutGrid,
  ExternalLink,
  FileText,
  Sparkles,
  BarChart3,
  Heart,
  RefreshCw,
  Download,
  Share2,
  Bookmark,
  Trophy,
  Play,
  CloudDownload,
  GitCompare,
  X,
  Brain,
  Check,
} from "lucide-react";
import type { MonthlyReport, Baseline, Outcome } from "@/lib/types/results";
import type { Post } from "@/lib/types/post";

// Analytics types
interface PostClassification {
  contentType: string;
  subject: string;
  coreMessage: string;
}

interface PostStats {
  id: string;
  caption: string;
  fullCaption?: string;
  mediaType: string;
  thumbnailUrl: string;
  postedAt: string;
  permalink?: string;
  reach: number;
  impressions: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  videoViews: number;
  classification?: PostClassification | null;
  transcript?: string | null;
}

interface StatsResponse {
  account: { id: string; name: string; handle?: string };
  period: { since: string; until: string };
  totals: {
    posts: number;
    reach: number;
    impressions: number;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    videoViews: number;
  };
  averagePerPost: {
    reach: number;
    impressions: number;
    engagement: number;
    engagementRate: string;
  } | null;
  topPerformers: {
    byReach: PostStats[];
    byEngagement: PostStats[];
  };
  posts: PostStats[];
}

interface EnrichedReport extends MonthlyReport {
  posts: Post[];
  outcomes: Outcome[];
  baseline: Baseline | null;
  liveInsights?: {
    profileVisits: number;
    reach: number;
    websiteClicks: number;
  } | null;
  dataSource?: "live" | "baseline";
  stats: {
    postsCount: number;
    totalReach: number;
    totalEngagement: number;
    outcomesCount: number;
  };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type TabType = "report" | "analytics" | "comparisons";

interface SavedComparison {
  id: string;
  accountId: string;
  postA: {
    instagramId: string;
    thumbnailUrl?: string;
    postedAt: string;
    reach: number;
    engagement: number;
  };
  postB: {
    instagramId: string;
    thumbnailUrl?: string;
    postedAt: string;
    reach: number;
    engagement: number;
  };
  hypothesis: string | null;
  winner: string;
  analysis: string;
  createdAt: string;
}

export default function ResultsPage() {
  const { currentAccount } = useAccount();
  const today = new Date();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("report");

  // Report state
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [report, setReport] = useState<EnrichedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analytics state (uses same month as report tab)
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // AI Insights state
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [showAiInsight, setShowAiInsight] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);

  // Video comparison state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<PostStats[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonInsight, setComparisonInsight] = useState<string | null>(null);
  const [comparingAI, setComparingAI] = useState(false);
  const [allPosts, setAllPosts] = useState<PostStats[]>([]);
  const [loadingAllPosts, setLoadingAllPosts] = useState(false);
  const [hypothesis, setHypothesis] = useState("");

  // Comparisons history state
  const [comparisons, setComparisons] = useState<SavedComparison[]>([]);
  const [comparisonsLoading, setComparisonsLoading] = useState(false);
  const [selectedComparison, setSelectedComparison] = useState<SavedComparison | null>(null);

  // Load existing report (fast, from DB)
  const loadReport = async () => {
    if (!currentAccount) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/accounts/${currentAccount.id}/reports?year=${selectedYear}&month=${selectedMonth}`
      );
      const data = await res.json();

      if (data.exists && data.report) {
        setReport(data.report);
        setLoading(false);
      } else {
        // No saved report, generate one
        await generateReport();
      }
    } catch (err) {
      setError("Failed to load report");
      setLoading(false);
    }
  };

  // Generate fresh report (fetches live data from Instagram)
  const generateReport = async () => {
    if (!currentAccount) return;

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: selectedYear,
          month: selectedMonth,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setReport(data.report);
      } else {
        setError(data.error || "Failed to generate report");
      }
    } catch (err) {
      setError("Failed to generate report");
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  // Load report when month changes (tries saved first, then generates)
  useEffect(() => {
    if (currentAccount && activeTab === "report") {
      setReport(null); // Clear while loading
      loadReport();
    }
  }, [currentAccount, selectedMonth, selectedYear, activeTab]);

  // Analytics functions - uses same month as report tab
  const fetchStats = async () => {
    if (!currentAccount) return;

    setAnalyticsLoading(true);
    setAnalyticsError(null);

    try {
      // Get month boundaries
      const monthStart = new Date(selectedYear, selectedMonth, 1);
      const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

      const params = new URLSearchParams();
      params.set("since", monthStart.toISOString());
      params.set("until", monthEnd.toISOString());

      const res = await fetch(`/api/accounts/${currentAccount.id}/posts/stats?${params}`);
      const data = await res.json();

      if (data.error) {
        setAnalyticsError(data.error);
      } else {
        setStats(data);
      }
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : "Failed to fetch stats");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    if (!currentAccount) return;

    setExporting(true);
    try {
      const monthStart = new Date(selectedYear, selectedMonth, 1);
      const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

      const params = new URLSearchParams();
      params.set("format", format);
      params.set("since", monthStart.toISOString());
      params.set("until", monthEnd.toISOString());

      const res = await fetch(`/api/accounts/${currentAccount.id}/posts/stats?${params}`);

      if (format === "csv") {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentAccount.id}-stats-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentAccount.id}-stats-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  // Fetch analytics when tab or month changes
  useEffect(() => {
    if (currentAccount && activeTab === "analytics") {
      setStats(null);
      setAiInsight(null);
      setShowAiInsight(false);
      fetchStats();
    }
  }, [selectedMonth, selectedYear, currentAccount, activeTab]);

  // Fetch comparisons history
  const fetchComparisons = async () => {
    if (!currentAccount) return;

    setComparisonsLoading(true);
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/insights/compare`);
      const data = await res.json();
      if (data.comparisons) {
        setComparisons(data.comparisons);
      }
    } catch (err) {
      console.error("Failed to fetch comparisons:", err);
    } finally {
      setComparisonsLoading(false);
    }
  };

  // Fetch comparisons when tab is selected
  useEffect(() => {
    if (currentAccount && activeTab === "comparisons") {
      fetchComparisons();
    }
  }, [currentAccount, activeTab]);

  // Sync posts from Instagram (refreshes thumbnails)
  const syncPosts = async () => {
    if (!currentAccount) return;

    setSyncing(true);
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/posts/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        // Refetch stats to get updated thumbnails
        await fetchStats();
      }
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  // Generate AI insights for the month
  const generateAiInsight = async () => {
    if (!currentAccount) return;

    setAiInsightLoading(true);
    try {
      const monthStart = new Date(selectedYear, selectedMonth, 1);
      const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

      const res = await fetch(`/api/accounts/${currentAccount.id}/insights/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: "monthly",
          periodStart: monthStart.toISOString(),
          periodEnd: monthEnd.toISOString(),
        }),
      });

      const data = await res.json();
      if (data.success && data.insights) {
        setAiInsight(data.insights);
        setShowAiInsight(true);
      } else {
        setAiInsight(data.error || "Failed to generate insights");
      }
    } catch (err) {
      setAiInsight("Failed to generate insights");
    } finally {
      setAiInsightLoading(false);
    }
  };

  // Fetch all posts for cross-month comparison
  const fetchAllPosts = async () => {
    if (!currentAccount) return;

    setLoadingAllPosts(true);
    try {
      // Fetch last 6 months of posts
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const params = new URLSearchParams();
      params.set("since", sixMonthsAgo.toISOString());
      params.set("until", new Date().toISOString());

      const res = await fetch(`/api/accounts/${currentAccount.id}/posts/stats?${params}`);
      const data = await res.json();

      if (!data.error && data.posts) {
        setAllPosts(data.posts);
      }
    } catch (err) {
      console.error("Failed to fetch all posts:", err);
    } finally {
      setLoadingAllPosts(false);
    }
  };

  // Toggle post selection for comparison
  const toggleCompareSelection = (post: PostStats) => {
    if (selectedForCompare.find(p => p.id === post.id)) {
      setSelectedForCompare(selectedForCompare.filter(p => p.id !== post.id));
    } else if (selectedForCompare.length < 2) {
      const newSelection = [...selectedForCompare, post];
      setSelectedForCompare(newSelection);
      if (newSelection.length === 2) {
        setShowComparison(true);
      }
    }
  };

  // Reset comparison
  const resetComparison = () => {
    setSelectedForCompare([]);
    setShowComparison(false);
    setComparisonInsight(null);
    setCompareMode(false);
    setAllPosts([]);
    setHypothesis("");
  };

  // Generate AI comparison of two videos
  const generateComparison = async () => {
    if (selectedForCompare.length !== 2 || !currentAccount) return;

    setComparingAI(true);
    try {
      const [postA, postB] = selectedForCompare;

      // Build comparison prompt data
      const comparisonData = {
        postA: {
          id: postA.id,
          caption: postA.fullCaption || postA.caption,
          mediaType: postA.mediaType,
          postedAt: postA.postedAt,
          thumbnailUrl: postA.thumbnailUrl,
          reach: postA.reach,
          engagement: postA.engagement,
          likes: postA.likes,
          comments: postA.comments,
          saves: postA.saves,
          shares: postA.shares,
          videoViews: postA.videoViews,
          classification: postA.classification,
          transcript: postA.transcript,
        },
        postB: {
          id: postB.id,
          caption: postB.fullCaption || postB.caption,
          mediaType: postB.mediaType,
          postedAt: postB.postedAt,
          thumbnailUrl: postB.thumbnailUrl,
          reach: postB.reach,
          engagement: postB.engagement,
          likes: postB.likes,
          comments: postB.comments,
          saves: postB.saves,
          shares: postB.shares,
          videoViews: postB.videoViews,
          classification: postB.classification,
          transcript: postB.transcript,
        },
      };

      const res = await fetch(`/api/accounts/${currentAccount.id}/insights/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...comparisonData,
          hypothesis: hypothesis.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success && data.comparison) {
        setComparisonInsight(data.comparison);
      } else {
        setComparisonInsight("Unable to generate comparison. Try again later.");
      }
    } catch (err) {
      setComparisonInsight("Failed to generate comparison.");
    } finally {
      setComparingAI(false);
    }
  };

  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  const isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear();
  const isFutureMonth = new Date(selectedYear, selectedMonth, 1) > today;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString();
  };

  if (!currentAccount) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
      </div>
    );
  }

  // Analytics stats for display
  const totals = stats?.totals || {
    posts: 0,
    reach: 0,
    impressions: 0,
    engagement: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    videoViews: 0,
  };

  return (
    <div className="p-6 max-w-6xl">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("report")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "report"
              ? "text-white border-emerald-500"
              : "text-slate-400 border-transparent hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Monthly Report
          </div>
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "analytics"
              ? "text-white border-emerald-500"
              : "text-slate-400 border-transparent hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Post Analytics
          </div>
        </button>
        <button
          onClick={() => setActiveTab("comparisons")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "comparisons"
              ? "text-white border-purple-500"
              : "text-slate-400 border-transparent hover:text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4" />
            Comparisons
          </div>
        </button>
      </div>

      {activeTab === "report" ? (
        <>
          {/* Header with Month Selector */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {MONTHS[selectedMonth]} {selectedYear}
                </h1>
                <p className="text-slate-400 mt-1">Monthly Results Report</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
                <button
                  onClick={nextMonth}
                  disabled={isFutureMonth}
                  className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              {!isCurrentMonth && (
                <button
                  onClick={goToCurrentMonth}
                  className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  This Month
                </button>
              )}
            </div>

            <button
              onClick={generateReport}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Refresh Report
                </>
              )}
            </button>
          </div>

      {error && (
        <div className="bg-red-500/20 text-red-400 p-4 rounded-xl mb-6">{error}</div>
      )}

      {(loading || generating) && !report ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-slate-500 animate-spin mb-4" />
          <p className="text-sm text-slate-500">
            {generating ? "Fetching from Instagram..." : "Loading report..."}
          </p>
        </div>
      ) : !report ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Report Yet</h2>
          <p className="text-slate-400 mb-6">
            Generate a report for {MONTHS[selectedMonth]} {selectedYear}
          </p>
          <button
            onClick={generateReport}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white mx-auto disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            Generate Report
          </button>
        </div>
      ) : (
        <>
          {/* Headline Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <MetricCard
              icon={<Calendar className="w-4 h-4 text-emerald-400" />}
              iconBg="bg-emerald-500/20"
              label="Meetings"
              value={report.headline.meetings}
              baseline={report.headline.meetingsBaseline}
            />
            <MetricCard
              icon={<MessageSquare className="w-4 h-4 text-blue-400" />}
              iconBg="bg-blue-500/20"
              label="Inquiries"
              value={report.headline.inquiries}
              baseline={report.headline.inquiriesBaseline}
            />
            <MetricCard
              icon={<CheckCircle className="w-4 h-4 text-purple-400" />}
              iconBg="bg-purple-500/20"
              label="Deals"
              value={report.headline.deals || 0}
            />
            <MetricCard
              icon={<DollarSign className="w-4 h-4 text-amber-400" />}
              iconBg="bg-amber-500/20"
              label="Revenue"
              value={report.headline.revenue || 0}
              format="currency"
            />
          </div>

          {/* Content Posted This Month */}
          {report.posts.length > 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">
                    Content Posted ({report.posts.length} posts)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {report.stats.totalReach.toLocaleString()} reach · {report.stats.totalEngagement.toLocaleString()} engagements
                  </p>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {report.posts.map((post) => (
                    <PostCard key={post.instagramId} post={post} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center mb-6">
              <Image className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No posts this month</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-6">
            {/* Funnel */}
            <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">Funnel</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Content → Outcomes</p>
                </div>
                <div className="flex items-center gap-2">
                  {report.dataSource === "live" ? (
                    <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
                      Live from Instagram
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-slate-700 text-slate-400 rounded">
                      From baseline
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    Updated {new Date(report.generatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <FunnelVisualization report={report} />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Top Content */}
              {report.topContent.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800">
                    <h3 className="text-sm font-medium text-white">Top Performers</h3>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {report.topContent.map((item, idx) => (
                      <div key={item.contentId} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-emerald-400">#{idx + 1}</span>
                          <span className="text-xs text-slate-500">{item.value.toLocaleString()} {item.metric}</span>
                        </div>
                        <p className="text-sm text-white line-clamp-2">
                          {item.caption || "No caption"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outcomes */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">
                    Outcomes ({report.outcomes.length})
                  </h3>
                  <a
                    href={`/account/${currentAccount.id}/outcomes`}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Log New
                  </a>
                </div>
                {report.outcomes.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-slate-400">No outcomes logged</p>
                    <a
                      href={`/account/${currentAccount.id}/outcomes`}
                      className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      <Plus className="w-3 h-3" />
                      Log an outcome
                    </a>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 max-h-64 overflow-y-auto">
                    {report.outcomes.map((outcome) => (
                      <div key={outcome.id} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              outcome.type === "meeting"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : outcome.type === "deal"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {outcome.type}
                          </span>
                          {outcome.value && (
                            <span className="text-xs text-slate-500">
                              ${outcome.value.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white truncate">{outcome.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Baseline Reference */}
              {report.baseline && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800">
                    <h3 className="text-sm font-medium text-white">Baseline Reference</h3>
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Captured</span>
                      <span className="text-white">
                        {new Date(report.baseline.capturedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {report.baseline.instagram && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Followers</span>
                          <span className="text-white">{report.baseline.instagram.followers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Avg Engagement</span>
                          <span className="text-white">{report.baseline.instagram.avgEngagementRate}%</span>
                        </div>
                      </>
                    )}
                    {report.baseline.clientEstimate && (
                      <div className="pt-2 border-t border-slate-800 text-xs text-slate-500">
                        Client estimate: {report.baseline.clientEstimate.meetingsPerMonth || 0} meetings/mo,{" "}
                        {report.baseline.clientEstimate.inquiriesPerMonth || 0} inquiries/mo
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  ) : activeTab === "analytics" ? (
    /* Analytics Tab - Narrative Format */
    <>
      {/* Month Header (same controls as Report tab) */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {MONTHS[selectedMonth]} {selectedYear}
            </h1>
            <p className="text-slate-400 mt-1">Post Performance</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <button
              onClick={nextMonth}
              disabled={isFutureMonth}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          {!isCurrentMonth && (
            <button
              onClick={goToCurrentMonth}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              This Month
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Compare Mode Toggle */}
          <button
            onClick={() => {
              if (compareMode) {
                resetComparison();
              } else {
                setCompareMode(true);
                fetchAllPosts(); // Load all posts for cross-month comparison
              }
            }}
            disabled={loadingAllPosts}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
              compareMode
                ? "bg-purple-600 text-white"
                : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white"
            }`}
          >
            {loadingAllPosts ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GitCompare className="w-4 h-4" />
            )}
            {compareMode ? `Comparing (${selectedForCompare.length}/2)` : "Compare Videos"}
          </button>

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              disabled={exporting || analyticsLoading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${exporting ? "animate-pulse" : ""}`} />
              Export
            </button>
            <div className="absolute right-0 mt-1 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport("csv")}
                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-t-lg"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport("json")}
                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-b-lg"
              >
                Export JSON
              </button>
            </div>
          </div>

          <button
            onClick={syncPosts}
            disabled={syncing || analyticsLoading}
            title="Sync from Instagram (refreshes thumbnails)"
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <CloudDownload className={`w-4 h-4 ${syncing ? "animate-pulse" : ""}`} />
            {syncing ? "Syncing..." : "Sync"}
          </button>

          <button
            onClick={fetchStats}
            disabled={analyticsLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${analyticsLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {analyticsLoading || syncing ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
        </div>
      ) : analyticsError ? (
        <div className="bg-red-500/20 text-red-400 p-4 rounded-xl">
          {analyticsError}
          <button
            onClick={fetchStats}
            className="ml-4 underline hover:no-underline"
          >
            Try Again
          </button>
        </div>
      ) : !stats || stats.posts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Posts This Month</h2>
          <p className="text-slate-400">
            No content was posted in {MONTHS[selectedMonth]} {selectedYear}
          </p>
        </div>
      ) : (
        <>
          {/* Narrative Summary */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
            <div className="text-lg text-slate-300 leading-relaxed">
              <span className="text-white font-semibold">{stats.posts.length} posts</span> in {MONTHS[selectedMonth]} reached{" "}
              <span className="text-blue-400 font-semibold">{formatNumber(totals.reach)} accounts</span> and generated{" "}
              <span className="text-pink-400 font-semibold">{formatNumber(totals.engagement)} engagements</span>
              {stats.averagePerPost && (
                <span className="text-slate-400">
                  {" "}({stats.averagePerPost.engagementRate} engagement rate)
                </span>
              )}
            </div>

            {/* Quick Stats Row */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span className="text-white font-medium">{formatNumber(totals.likes)}</span>
                  <span className="text-slate-500 text-sm">likes</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium">{formatNumber(totals.comments)}</span>
                  <span className="text-slate-500 text-sm">comments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-white font-medium">{formatNumber(totals.shares)}</span>
                  <span className="text-slate-500 text-sm">shares</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span className="text-white font-medium">{formatNumber(totals.saves)}</span>
                  <span className="text-slate-500 text-sm">saves</span>
                </div>
              </div>

              {/* Generate AI Analysis Button */}
              <button
                onClick={generateAiInsight}
                disabled={aiInsightLoading || stats.posts.length < 5}
                title={stats.posts.length < 5 ? "Need at least 5 posts for analysis" : "Generate AI insights"}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-sm text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiInsightLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Generate Analysis
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Monthly Analysis */}
          {showAiInsight && aiInsight && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">
                    AI Analysis for {MONTHS[selectedMonth]}
                  </span>
                </div>
                <button
                  onClick={() => setShowAiInsight(false)}
                  className="p-1 hover:bg-purple-500/20 rounded"
                >
                  <X className="w-4 h-4 text-purple-400" />
                </button>
              </div>
              <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {aiInsight}
              </div>
            </div>
          )}

          {/* Best & Worst Performers */}
          {stats.topPerformers && stats.topPerformers.byReach.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Best Performer */}
              <div className="bg-slate-900 border border-emerald-500/30 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Best Performer</span>
                  </div>
                </div>
                {(() => {
                  const best = stats.topPerformers.byReach[0];
                  return (
                    <div className="p-4 flex gap-4">
                      <div className="w-20 h-20 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                        {best.thumbnailUrl ? (
                          <img src={best.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {best.mediaType === "VIDEO" ? (
                              <Play className="w-6 h-6 text-slate-600" />
                            ) : (
                              <Image className="w-6 h-6 text-slate-600" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white line-clamp-2 mb-2">
                          {best.caption?.slice(0, 80) || "No caption"}
                          {best.caption && best.caption.length > 80 ? "..." : ""}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-blue-400 font-semibold">{formatNumber(best.reach)} reach</span>
                          <span className="text-pink-400">{formatNumber(best.engagement)} eng</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Worst Performer */}
              {stats.posts.length > 1 && (
                <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-400">Lowest Reach</span>
                    </div>
                  </div>
                  {(() => {
                    const worst = [...stats.posts].sort((a, b) => a.reach - b.reach)[0];
                    return (
                      <div className="p-4 flex gap-4">
                        <div className="w-20 h-20 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                          {worst.thumbnailUrl ? (
                            <img src={worst.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {worst.mediaType === "VIDEO" ? (
                                <Play className="w-6 h-6 text-slate-600" />
                              ) : (
                                <Image className="w-6 h-6 text-slate-600" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white line-clamp-2 mb-2">
                            {worst.caption?.slice(0, 80) || "No caption"}
                            {worst.caption && worst.caption.length > 80 ? "..." : ""}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-400">{formatNumber(worst.reach)} reach</span>
                            <span className="text-slate-500">{formatNumber(worst.engagement)} eng</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Breakdown by Content Type */}
          {(() => {
            const byType: Record<string, { count: number; reach: number; engagement: number }> = {};
            stats.posts.forEach((post) => {
              const type = post.mediaType === "VIDEO" ? "Reels" : post.mediaType === "CAROUSEL_ALBUM" ? "Carousels" : "Images";
              if (!byType[type]) byType[type] = { count: 0, reach: 0, engagement: 0 };
              byType[type].count++;
              byType[type].reach += post.reach;
              byType[type].engagement += post.engagement;
            });

            const types = Object.entries(byType).sort((a, b) => b[1].reach - a[1].reach);
            if (types.length <= 1) return null;

            return (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Breakdown by Content Type</h3>
                <div className="space-y-3">
                  {types.map(([type, data]) => {
                    const avgReach = Math.round(data.reach / data.count);
                    const maxReach = Math.max(...types.map(([, d]) => d.reach));
                    const barWidth = (data.reach / maxReach) * 100;

                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {type === "Reels" && <Video className="w-4 h-4 text-purple-400" />}
                            {type === "Carousels" && <LayoutGrid className="w-4 h-4 text-blue-400" />}
                            {type === "Images" && <Image className="w-4 h-4 text-emerald-400" />}
                            <span className="text-sm text-white">{type}</span>
                            <span className="text-xs text-slate-500">({data.count})</span>
                          </div>
                          <span className="text-sm text-slate-400">{formatNumber(avgReach)} avg reach</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              type === "Reels" ? "bg-purple-500" : type === "Carousels" ? "bg-blue-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* All Posts Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">
                {compareMode ? `All Videos (${allPosts.length})` : `All Posts (${stats.posts.length})`}
              </h3>
              {compareMode && (
                <span className="text-xs text-purple-400">Click 2 videos to compare (any month)</span>
              )}
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {(compareMode ? allPosts : stats.posts).map((post) => {
                  const isSelected = selectedForCompare.some(p => p.id === post.id);
                  const selectionIndex = selectedForCompare.findIndex(p => p.id === post.id);

                  return (
                    <div
                      key={post.id}
                      onClick={() => compareMode && toggleCompareSelection(post)}
                      className={`group relative bg-slate-800 rounded-lg overflow-hidden transition-all ${
                        compareMode ? "cursor-pointer" : ""
                      } ${isSelected ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900" : ""}`}
                    >
                      <div className="aspect-square relative">
                        {post.thumbnailUrl ? (
                          <img
                            src={post.thumbnailUrl}
                            alt={post.caption || "Post"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                            {post.mediaType === "VIDEO" ? (
                              <Play className="w-6 h-6 text-slate-500" />
                            ) : (
                              <Image className="w-6 h-6 text-slate-500" />
                            )}
                          </div>
                        )}

                        {post.mediaType === "VIDEO" && (
                          <div className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded">
                            <Play className="w-3 h-3 text-white" />
                          </div>
                        )}

                        {/* Selection indicator */}
                        {compareMode && (
                          <div className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                            isSelected ? "bg-purple-500" : "bg-black/40 border border-white/30"
                          }`}>
                            {isSelected ? (
                              <span className="text-xs font-bold text-white">{selectionIndex + 1}</span>
                            ) : (
                              <Check className="w-3 h-3 text-white/50" />
                            )}
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="text-center text-white text-xs space-y-1">
                            <div>{formatNumber(post.reach)} reach</div>
                            <div className="text-slate-300">{formatNumber(post.engagement)} eng</div>
                          </div>
                        </div>
                      </div>

                      {/* Date label in compare mode */}
                      {compareMode && (
                        <div className="px-2 py-1 bg-slate-700/50 text-center">
                          <span className="text-[10px] text-slate-400">
                            {new Date(post.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      )}

                      {/* AI Summary (coreMessage) */}
                      {post.classification?.coreMessage && !compareMode && (
                        <div className="px-2 py-1.5 border-t border-slate-700">
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                            {post.classification.coreMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Comparison Panel */}
          {showComparison && selectedForCompare.length === 2 && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-medium text-white">Video Comparison</h3>
                  </div>
                  <button
                    onClick={resetComparison}
                    className="p-1 hover:bg-slate-800 rounded"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="p-4">
                  {/* Side by side posts */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    {selectedForCompare.map((post, idx) => (
                      <div key={post.id} className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">
                            {idx + 1}
                          </span>
                          <span className="text-sm text-slate-400">
                            {new Date(post.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>

                        <div className="aspect-video relative bg-slate-800 rounded-lg overflow-hidden">
                          {post.thumbnailUrl ? (
                            <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-8 h-8 text-slate-500" />
                            </div>
                          )}
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-slate-800 rounded p-2">
                            <div className="text-lg font-bold text-white">{formatNumber(post.reach)}</div>
                            <div className="text-xs text-slate-500">Reach</div>
                          </div>
                          <div className="bg-slate-800 rounded p-2">
                            <div className="text-lg font-bold text-white">{formatNumber(post.engagement)}</div>
                            <div className="text-xs text-slate-500">Engagement</div>
                          </div>
                          <div className="bg-slate-800 rounded p-2">
                            <div className="text-lg font-bold text-white">{formatNumber(post.videoViews)}</div>
                            <div className="text-xs text-slate-500">Views</div>
                          </div>
                        </div>

                        {/* Additional metrics */}
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span><Heart className="w-3 h-3 inline mr-1" />{post.likes}</span>
                          <span><MessageSquare className="w-3 h-3 inline mr-1" />{post.comments}</span>
                          <span><Share2 className="w-3 h-3 inline mr-1" />{post.shares}</span>
                          <span><Bookmark className="w-3 h-3 inline mr-1" />{post.saves}</span>
                        </div>

                        {/* AI Summary */}
                        {post.classification?.coreMessage && (
                          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 text-xs text-purple-400 mb-1">
                              <Brain className="w-3 h-3" />
                              AI Summary
                            </div>
                            <p className="text-sm text-slate-300">{post.classification.coreMessage}</p>
                            {post.classification.contentType && (
                              <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">
                                {post.classification.contentType}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Caption */}
                        <p className="text-xs text-slate-400 line-clamp-3">
                          {post.fullCaption || post.caption}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Winner indicator */}
                  {(() => {
                    const [a, b] = selectedForCompare;
                    const aScore = a.reach + a.engagement * 2;
                    const bScore = b.reach + b.engagement * 2;
                    const winner = aScore > bScore ? 0 : bScore > aScore ? 1 : -1;

                    return (
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-slate-400">
                            {winner === -1 ? (
                              "Both posts performed similarly"
                            ) : (
                              <>
                                <span className="text-white font-medium">Post {winner + 1}</span> performed{" "}
                                <span className="text-emerald-400 font-medium">
                                  {Math.round(((Math.max(aScore, bScore) / Math.min(aScore, bScore)) - 1) * 100)}% better
                                </span>
                              </>
                            )}
                          </div>
                          {winner !== -1 && (
                            <Trophy className={`w-5 h-5 ${winner === 0 ? "text-amber-400" : "text-amber-400"}`} />
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* AI Comparison */}
                  <div className="border-t border-slate-800 pt-4">
                    {!comparisonInsight && !comparingAI && (
                      <div className="space-y-3">
                        {/* Hypothesis Input */}
                        <div>
                          <label className="block text-sm text-slate-400 mb-1.5">
                            Your Hypothesis <span className="text-slate-600">(optional)</span>
                          </label>
                          <textarea
                            value={hypothesis}
                            onChange={(e) => setHypothesis(e.target.value)}
                            placeholder="e.g., &quot;I think the first video did better because it opened with a question&quot; or &quot;Did posting time make a difference?&quot;"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500 resize-none"
                            rows={2}
                          />
                        </div>
                        <button
                          onClick={generateComparison}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors"
                        >
                          <Sparkles className="w-4 h-4" />
                          Analyze with AI
                        </button>
                      </div>
                    )}

                    {comparingAI && (
                      <div className="flex items-center justify-center gap-2 py-4 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing content differences...
                      </div>
                    )}

                    {comparisonInsight && (
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Brain className="w-5 h-5 text-purple-400" />
                          <span className="text-sm font-medium text-purple-400">AI Analysis</span>
                        </div>
                        <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {comparisonInsight}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  ) : (
    /* Comparisons Tab */
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Comparisons</h1>
          <p className="text-slate-400 mt-1">Video comparison history with AI analysis</p>
        </div>
        <button
          onClick={() => {
            setActiveTab("analytics");
            setCompareMode(true);
            fetchAllPosts();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white"
        >
          <Plus className="w-4 h-4" />
          New Comparison
        </button>
      </div>

      {comparisonsLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
        </div>
      ) : comparisons.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <GitCompare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Comparisons Yet</h2>
          <p className="text-slate-400 mb-6">
            Compare two videos to understand what makes content perform better.
          </p>
          <button
            onClick={() => {
              setActiveTab("analytics");
              setCompareMode(true);
              fetchAllPosts();
            }}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white mx-auto"
          >
            <GitCompare className="w-5 h-5" />
            Start Comparing
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {comparisons.map((comp) => (
            <div
              key={comp.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors"
            >
              <button
                onClick={() => setSelectedComparison(selectedComparison?.id === comp.id ? null : comp)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center gap-4">
                  {/* Thumbnails */}
                  <div className="flex -space-x-3">
                    <div className="w-12 h-12 bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-900 flex-shrink-0">
                      {comp.postA.thumbnailUrl ? (
                        <img src={comp.postA.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-4 h-4 text-slate-600" />
                        </div>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-900 flex-shrink-0">
                      {comp.postB.thumbnailUrl ? (
                        <img src={comp.postB.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-4 h-4 text-slate-600" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-white">
                        {new Date(comp.postA.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" vs "}
                        {new Date(comp.postB.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        comp.winner === "Post A" ? "bg-emerald-500/20 text-emerald-400" :
                        comp.winner === "Post B" ? "bg-blue-500/20 text-blue-400" :
                        "bg-slate-700 text-slate-400"
                      }`}>
                        {comp.winner === "Post A" ? "First won" : comp.winner === "Post B" ? "Second won" : "Tied"}
                      </span>
                    </div>
                    {comp.hypothesis && (
                      <p className="text-xs text-slate-500 truncate">
                        Hypothesis: "{comp.hypothesis}"
                      </p>
                    )}
                    <p className="text-xs text-slate-600 mt-1">
                      {new Date(comp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>

                  {/* Expand icon */}
                  <ChevronRight className={`w-5 h-5 text-slate-600 transition-transform ${
                    selectedComparison?.id === comp.id ? "rotate-90" : ""
                  }`} />
                </div>
              </button>

              {/* Expanded Analysis */}
              {selectedComparison?.id === comp.id && (
                <div className="border-t border-slate-800 p-4">
                  {/* Metrics comparison */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Post A</p>
                      <p className="text-sm text-white">{comp.postA.reach.toLocaleString()} reach</p>
                      <p className="text-xs text-slate-400">{comp.postA.engagement} engagement</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Post B</p>
                      <p className="text-sm text-white">{comp.postB.reach.toLocaleString()} reach</p>
                      <p className="text-xs text-slate-400">{comp.postB.engagement} engagement</p>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-purple-400">AI Analysis</span>
                    </div>
                    <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                      {comp.analysis}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )}
    </div>
  );
}

// Metric Card Component
function MetricCard({
  icon,
  iconBg,
  label,
  value,
  baseline,
  format = "number",
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
  baseline?: number;
  format?: "number" | "currency";
}) {
  const displayValue = format === "currency"
    ? `$${value.toLocaleString()}`
    : value.toString();

  const delta = baseline !== undefined ? value - baseline : null;
  const showDelta = delta !== null && baseline !== undefined;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 ${iconBg} rounded`}>{icon}</div>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <div className="text-2xl font-bold text-white">{displayValue}</div>
        {showDelta && (
          <div className={`flex items-center text-xs mb-1 ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-slate-500"}`}>
            {delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : delta < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
            {delta > 0 ? "+" : ""}{delta} vs baseline
          </div>
        )}
      </div>
      {baseline !== undefined && (
        <div className="text-xs text-slate-500 mt-1">Baseline: {baseline}/mo</div>
      )}
    </div>
  );
}

// Post Card Component
function PostCard({ post }: { post: Post }) {
  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-slate-800/50 rounded-lg overflow-hidden hover:bg-slate-800 transition-colors"
    >
      <div className="aspect-square relative">
        {post.thumbnailUrl ? (
          <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-slate-700 flex items-center justify-center">
            {post.mediaType === "VIDEO" ? (
              <Video className="w-8 h-8 text-slate-500" />
            ) : post.mediaType === "CAROUSEL_ALBUM" ? (
              <LayoutGrid className="w-8 h-8 text-slate-500" />
            ) : (
              <Image className="w-8 h-8 text-slate-500" />
            )}
          </div>
        )}
        <div className="absolute top-2 right-2">
          <div className="p-1 bg-black/50 rounded">
            {post.mediaType === "VIDEO" ? (
              <Video className="w-3 h-3 text-white" />
            ) : post.mediaType === "CAROUSEL_ALBUM" ? (
              <LayoutGrid className="w-3 h-3 text-white" />
            ) : (
              <Image className="w-3 h-3 text-white" />
            )}
          </div>
        </div>
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ExternalLink className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs text-slate-400 mb-1">
          {new Date(post.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
        <p className="text-sm text-white line-clamp-2 mb-2">
          {post.caption?.slice(0, 60) || "No caption"}
          {post.caption && post.caption.length > 60 ? "..." : ""}
        </p>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{(post.metrics?.reach || 0).toLocaleString()} reach</span>
          <span>{post.metrics?.engagement || 0} eng</span>
        </div>
      </div>
    </a>
  );
}

// Funnel Visualization Component
function FunnelVisualization({ report }: { report: EnrichedReport }) {
  const steps = [
    { label: "Content Reach", value: report.stats.totalReach, icon: <Eye className="w-4 h-4" />, color: "bg-blue-500" },
    { label: "Profile Visits", value: report.funnel.profileVisits, icon: <Users className="w-4 h-4" />, color: "bg-indigo-500" },
    { label: "Link Clicks", value: report.funnel.linkClicks, icon: <MousePointer className="w-4 h-4" />, color: "bg-purple-500" },
    { label: "Inquiries/DMs", value: report.funnel.dmsAndForms, icon: <MessageSquare className="w-4 h-4" />, color: "bg-pink-500" },
    { label: "Meetings", value: report.funnel.booked, icon: <Calendar className="w-4 h-4" />, color: "bg-emerald-500" },
  ];

  const maxValue = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="space-y-4">
      {steps.map((step, idx) => {
        const percentage = (step.value / maxValue) * 100;
        const prevValue = idx > 0 ? steps[idx - 1].value : null;
        const conversionRate = prevValue && prevValue > 0 ? ((step.value / prevValue) * 100).toFixed(1) : null;

        return (
          <div key={step.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${step.color}/20`}>{step.icon}</div>
                <span className="text-sm text-slate-300">{step.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{step.value.toLocaleString()}</span>
                {conversionRate && (
                  <span className="text-xs text-slate-500">({conversionRate}%)</span>
                )}
              </div>
            </div>
            <div className="h-6 bg-slate-800 rounded-lg overflow-hidden">
              <div
                className={`h-full ${step.color} transition-all duration-500`}
                style={{ width: `${Math.max(percentage, 2)}%` }}
              />
            </div>
            {idx < steps.length - 1 && (
              <div className="flex justify-center my-1">
                <ArrowRight className="w-4 h-4 text-slate-600 rotate-90" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
