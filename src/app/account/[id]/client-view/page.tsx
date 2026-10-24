"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Target,
  Clock,
  Calendar,
  CalendarDays,
  TrendingUp,
  Loader2,
  AlertCircle,
  Check,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Eye,
  FileText,
  X,
  Send,
  Video,
  Image,
  LayoutGrid,
  Filter,
  ExternalLink,
  Heart,
  MessageCircle,
  Bookmark,
  Camera,
  Link,
} from "lucide-react";
import { PostPreview } from "@/components/media/PostPreview";

// Instagram icon as custom SVG (lucide doesn't have it)
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

// =============================================================================
// TYPES (client-safe only)
// =============================================================================

interface StageCoverage {
  stage: string;
  label: string;
  covered: boolean;
  postCount: number;
  questions: {
    id: string;
    question: string;
    status: string;
  }[];
  planned?: boolean;
  plannedQuestions?: {
    id: string;
    question: string;
    status: string;
  }[];
}

interface TopicWithCoverage {
  id: string;
  title: string;
  audience: string;
  personalQuestion: string;
  status: string;
  priority?: string;
  coverage: {
    stages: StageCoverage[];
    coveredCount: number;
    plannedCount?: number;
    totalStages: number;
    percentage: number;
  };
  totalPosts: number;
}

interface ReviewPost {
  id: string;
  title: string;
  questionAnswered?: string;
  type?: string;
  topicId?: string;
  previewUrl?: string;
  previewUrls?: string[];
  caption?: string;
  cta?: string;
  postDate?: string;
}

interface UpcomingPost {
  id: string;
  title: string;
  questionAnswered?: string;
  type?: string;
  topicId?: string;
  status: string;
  postDate?: string;
  previewUrls?: string[];
}

interface PostedPost {
  id: string;
  title: string;
  questionAnswered?: string;
  type?: string;
  topicId?: string;
  status: string;
  previewUrl?: string;
  previewUrls?: string[];
  postDate?: string;
}

interface ClientHubData {
  account: {
    id: string;
    name: string;
    handle?: string;
  };
  instagram: {
    connected: boolean;
    username?: string;
  };
  topics: TopicWithCoverage[];
  topicNames: Record<string, string>;
  needsReview: ReviewPost[];
  upcoming?: UpcomingPost[];
  posted: PostedPost[];
  summary: {
    topicsActive: number;
    topicsCovered: number;
    postsPublished: number;
    postsScheduled: number;
    postsNeedingReview: number;
  };
}

type TabId = "topics" | "review" | "posted" | "calendar" | "results";

const TABS: { id: TabId; label: string; icon: typeof Target }[] = [
  { id: "topics", label: "Topics", icon: Target },
  { id: "review", label: "Review", icon: Clock },
  { id: "posted", label: "Posted", icon: Calendar },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "results", label: "Results", icon: TrendingUp },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ClientHubPage() {
  const params = useParams();
  const accountId = params.id as string;

  const [data, setData] = useState<ClientHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("topics");
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [accountId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/client-hub`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to load");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Oops!</h1>
          <p className="text-slate-400">{error || "Something went wrong."}</p>
        </div>
      </div>
    );
  }

  // Show Instagram connection screen if not connected.
  // Dev-only bypass: the demo account (Sam Rivers) has no real Instagram,
  // so skip the wall locally to preview the full dashboard.
  const devBypassConnectWall = process.env.NODE_ENV === "development" && accountId === "demo";
  if (!data.instagram?.connected && !devBypassConnectWall) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md text-center">
          {/* Instagram gradient icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
            <InstagramIcon className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">
            Connect Instagram
          </h1>

          <p className="text-slate-400 mb-6 leading-relaxed">
            Connect your Instagram account to track what content actually works —
            so we can double down on winners instead of guessing.
          </p>

          <div className="space-y-3 text-left mb-8">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-sm text-slate-300">See which posts get the most engagement</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-sm text-slate-300">Track which topics resonate with your audience</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-sm text-slate-300">View your content calendar with real results</p>
            </div>
          </div>

          <a
            href={`/api/auth/instagram/connect?accountId=${accountId}&source=client-view`}
            className="inline-flex items-center justify-center gap-3 w-full py-4 px-6 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:from-purple-500 hover:via-pink-400 hover:to-orange-300 text-white font-semibold rounded-xl transition-all shadow-lg shadow-pink-500/25"
          >
            <InstagramIcon className="w-5 h-5" />
            Connect Instagram
          </a>

          <p className="text-xs text-slate-500 mt-4">
            Takes 30 seconds · We only read public metrics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
      {/* Sidebar - hidden on mobile */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col">
        {/* Account Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-3">
            <span className="text-white font-bold text-lg">
              {data.account.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
          <h1 className="text-lg font-semibold text-white">{data.account.name}</h1>
          {data.account.handle && (
            <p className="text-sm text-slate-500">{data.account.handle}</p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count =
              tab.id === "review"
                ? data.summary.postsNeedingReview
                : tab.id === "topics"
                ? data.summary.topicsActive
                : tab.id === "posted"
                ? data.summary.postsPublished
                : 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-emerald-500/30 text-emerald-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Instagram Connection Status */}
        <div className="p-4 border-t border-slate-800">
          {data.instagram?.connected ? (
            <div className="flex items-center gap-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <InstagramIcon className="w-5 h-5 text-emerald-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-400">Connected</p>
                <p className="text-xs text-slate-400 truncate">
                  @{data.instagram.username}
                </p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            </div>
          ) : (
            <a
              href={`/api/auth/instagram/connect?accountId=${accountId}&source=client-view`}
              className="flex items-center gap-3 px-3 py-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 rounded-lg transition-all group"
            >
              <InstagramIcon className="w-5 h-5 text-white" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Connect Instagram</p>
                <p className="text-xs text-white/70">Enable post sync</p>
              </div>
              <Link className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
            </a>
          )}
        </div>

        {/* Quick Stats */}
        <div className="p-4 border-t border-slate-800">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xl font-bold text-white">
                {data.summary.postsPublished}
              </p>
              <p className="text-xs text-slate-500">Published</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xl font-bold text-white">
                {data.summary.topicsActive}
              </p>
              <p className="text-xs text-slate-500">Active Topics</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {/* Mobile Header */}
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {data.account.name.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
              <div>
                <h1 className="text-white font-semibold">{data.account.name}</h1>
                {data.instagram?.username && (
                  <p className="text-xs text-slate-500">@{data.instagram.username}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs">Connected</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {activeTab === "topics" && (
            <TopicsTab
              topics={data.topics}
              expandedTopic={expandedTopic}
              setExpandedTopic={setExpandedTopic}
            />
          )}
          {activeTab === "review" && (
            <ReviewTab
              posts={data.needsReview}
              upcoming={data.upcoming ?? []}
              topicNames={data.topicNames}
              onRefresh={fetchData}
              accountId={accountId}
            />
          )}
          {activeTab === "posted" && (
            <PostedTab posts={data.posted} topicNames={data.topicNames} />
          )}
          {activeTab === "calendar" && (
            <CalendarTab accountId={accountId} />
          )}
          {activeTab === "results" && <ResultsTab data={data} />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-2 py-2 z-40">
        <div className="flex justify-around">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count =
              tab.id === "review"
                ? data.summary.postsNeedingReview
                : 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors relative ${
                  isActive
                    ? "text-emerald-400"
                    : "text-slate-500"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{tab.label}</span>
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// =============================================================================
// TOPICS TAB
// =============================================================================

function TopicsTab({
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

// =============================================================================
// REVIEW TAB
// =============================================================================

function ReviewTab({
  posts,
  upcoming,
  topicNames,
  onRefresh,
  accountId,
}: {
  posts: ReviewPost[];
  upcoming: UpcomingPost[];
  topicNames: Record<string, string>;
  onRefresh: () => void;
  accountId: string;
}) {
  const [selectedPost, setSelectedPost] = useState<ReviewPost | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const handleAction = async (postId: string, action: "approve" | "request-changes") => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/posts/${postId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: comment || undefined }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Review action failed:", json);
        setNotice({ kind: "error", text: json?.error || "Something went wrong. Please try again." });
        return;
      }

      setNotice({ kind: "ok", text: json?.data?.message || "Saved." });
      setSelectedPost(null);
      setComment("");
      onRefresh();
    } catch (err) {
      console.error(err);
      setNotice({ kind: "error", text: "Couldn't reach the server. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Needs Your OK</h2>
      <p className="text-slate-400 mb-6">
        Review and approve content before it goes live.
      </p>

      {notice && (
        <div
          role="status"
          className={`mb-4 rounded-lg px-4 py-3 text-sm flex items-start justify-between gap-3 ${
            notice.kind === "ok"
              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
              : "bg-red-500/10 text-red-300 border border-red-500/30"
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="text-xs opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <p className="text-white font-medium mb-1">All caught up!</p>
          <p className="text-slate-400 text-sm">No posts waiting for review.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex gap-5"
            >
              {/* Preview */}
              <div className="w-24 h-24 bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                <PostPreview url={post.previewUrl} urls={post.previewUrls} alt={post.title} iconClassName="w-8 h-8 text-slate-600" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {post.topicId && topicNames[post.topicId] && (
                  <p className="text-xs text-emerald-500 font-medium mb-1">
                    {topicNames[post.topicId]}
                  </p>
                )}
                <h3 className="text-white font-medium mb-1">{post.title}</h3>
                {post.questionAnswered && (
                  <p className="text-sm text-slate-400 mb-3">
                    Answers: &ldquo;{post.questionAnswered}&rdquo;
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(post.id, "approve")}
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => setSelectedPost(post)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          topicName={selectedPost.topicId ? topicNames[selectedPost.topicId] : undefined}
          comment={comment}
          setComment={setComment}
          submitting={submitting}
          onApprove={() => handleAction(selectedPost.id, "approve")}
          onRequestChanges={() => handleAction(selectedPost.id, "request-changes")}
          onClose={() => {
            setSelectedPost(null);
            setComment("");
          }}
        />
      )}

      <ComingUp posts={upcoming} topicNames={topicNames} />
    </div>
  );
}

function formatPostDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function ComingUp({
  posts,
  topicNames,
}: {
  posts: UpcomingPost[];
  topicNames: Record<string, string>;
}) {
  const [open, setOpen] = useState<UpcomingPost | null>(null);
  if (posts.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold text-white mb-1">Coming Up</h2>
      <p className="text-slate-400 mb-4 text-sm">
        What we&apos;re working on next. You&apos;ll be asked to approve each one before it goes out.
      </p>
      <div className="space-y-3">
        {posts.map((post) => {
          const date = formatPostDate(post.postDate);
          const hasPreview = (post.previewUrls?.length ?? 0) > 0;
          return (
            <button
              key={post.id}
              onClick={() => hasPreview && setOpen(post)}
              className={`w-full text-left bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4 ${
                hasPreview ? "hover:border-slate-700" : "cursor-default"
              }`}
            >
              <div className="w-16 h-20 bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                <PostPreview urls={post.previewUrls} alt={post.title} iconClassName="w-6 h-6 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {post.type && <span className="text-xs text-slate-500">{post.type}</span>}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      post.status === "Approved"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {post.status === "Approved" ? "Approved" : "In progress"}
                  </span>
                  {date && <span className="text-xs text-slate-400">· {date}</span>}
                </div>
                <p className="text-white font-medium leading-snug">
                  {post.questionAnswered || post.title}
                </p>
                {post.topicId && topicNames[post.topicId] && (
                  <p className="text-xs text-emerald-500 mt-1">{topicNames[post.topicId]}</p>
                )}
                {hasPreview && <p className="text-xs text-slate-500 mt-1">Tap for a first look</p>}
              </div>
            </button>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Close" className="absolute inset-0 bg-black/80" onClick={() => setOpen(null)} />
          <div className="relative w-full max-w-md bg-slate-900 rounded-2xl overflow-hidden">
            <div className="aspect-[4/5] bg-black">
              <PostPreview urls={open.previewUrls} alt={open.title} controls className="w-full h-full object-contain" />
            </div>
            <div className="p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-white font-medium">{open.questionAnswered || open.title}</p>
                <p className="text-xs text-slate-400 mt-1">Draft preview, not final yet.</p>
              </div>
              <button onClick={() => setOpen(null)} className="text-sm text-slate-300 hover:text-white">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostDetailModal({
  post,
  topicName,
  comment,
  setComment,
  submitting,
  onApprove,
  onRequestChanges,
  onClose,
}: {
  post: ReviewPost;
  topicName?: string;
  comment: string;
  setComment: (c: string) => void;
  submitting: boolean;
  onApprove: () => void;
  onRequestChanges: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            {topicName && (
              <span className="text-xs text-emerald-500 font-medium uppercase tracking-wider">
                {topicName}
              </span>
            )}
            <h3 className="text-xl font-semibold text-white mt-1">{post.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col md:flex-row gap-5">
          {/* Preview */}
          <div className="flex-1">
            <div className="aspect-[4/5] bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden">
              <PostPreview url={post.previewUrl} urls={post.previewUrls} alt={post.title} controls className="w-full h-full object-contain bg-black" iconClassName="w-20 h-20 text-slate-600" />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col">
            {post.questionAnswered && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-1">Question this answers:</p>
                <p className="text-white">&ldquo;{post.questionAnswered}&rdquo;</p>
              </div>
            )}

            {post.caption && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-1">Caption:</p>
                <p className="text-slate-300 text-sm">{post.caption}</p>
              </div>
            )}

            {/* Comment */}
            <div className="mt-auto">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a note or request changes..."
                  className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={onRequestChanges}
                  disabled={!comment.trim() || submitting}
                  className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onApprove}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Approve
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// POSTED TAB
// =============================================================================

function PostedTab({
  posts,
  topicNames,
}: {
  posts: PostedPost[];
  topicNames: Record<string, string>;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Posted Content</h2>
      <p className="text-slate-400 mb-6">
        Content that&apos;s live or scheduled to go out.
      </p>

      {posts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400">No published content yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
            >
              {/* Preview */}
              <div className="aspect-video bg-slate-800 flex items-center justify-center overflow-hidden">
                <PostPreview url={post.previewUrl} urls={post.previewUrls} alt={post.title} iconClassName="w-12 h-12 text-slate-600" />
              </div>

              {/* Content */}
              <div className="p-4">
                {post.topicId && topicNames[post.topicId] && (
                  <p className="text-xs text-emerald-500 font-medium mb-1">
                    {topicNames[post.topicId]}
                  </p>
                )}
                <h3 className="text-white font-medium mb-1">{post.title}</h3>
                {post.questionAnswered && (
                  <p className="text-xs text-slate-400 line-clamp-2">
                    &ldquo;{post.questionAnswered}&rdquo;
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      post.status === "Posted"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {post.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// RESULTS TAB
// =============================================================================

function ResultsTab({ data }: { data: ClientHubData }) {
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

// =============================================================================
// CALENDAR TAB
// =============================================================================

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type CalendarFilter = "all" | "posts" | "scheduled";

interface CalendarPost {
  id: string;
  title: string;
  caption?: string;
  status: string;
  type?: string;
  previewUrl?: string;
  postedAt?: string;
  scheduledFor?: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function CalendarTab({ accountId }: { accountId: string }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Fetch posts for calendar (Notion scheduled + Instagram posted)
  useEffect(() => {
    const fetchCalendarPosts = async () => {
      setLoading(true);
      try {
        const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
        const res = await fetch(`/api/accounts/${accountId}/calendar?month=${monthStr}`);
        const data = await res.json();
        if (data?.posts) {
          setPosts(data.posts);
        }
      } catch (error) {
        console.error("Failed to fetch calendar posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarPosts();
  }, [accountId, currentMonth, currentYear]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Get posts for a specific day
  const getPostsForDay = (day: number) => {
    return posts.filter((post) => {
      const dateStr = post.postedAt || post.scheduledFor;
      if (!dateStr) return false;
      const postDate = new Date(dateStr);
      return (
        postDate.getDate() === day &&
        postDate.getMonth() === currentMonth &&
        postDate.getFullYear() === currentYear
      );
    }).filter((post) => {
      if (filter === "all") return true;
      if (filter === "posts") return post.status === "Posted";
      if (filter === "scheduled") return post.status === "Scheduled";
      return true;
    });
  };

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const filterOptions: { value: CalendarFilter; label: string }[] = [
    { value: "all", label: "All Content" },
    { value: "posts", label: "Published" },
    { value: "scheduled", label: "Scheduled" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">
            {MONTHS[currentMonth]} {currentYear}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter !== "all"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Filter className="w-4 h-4" />
            {filterOptions.find(o => o.value === filter)?.label}
          </button>

          {showFilterMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowFilterMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setFilter(option.value);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                      filter === option.value
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {option.label}
                    {filter === option.value && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-800">
          {DAYS.map((day) => (
            <div
              key={day}
              className="px-4 py-3 text-sm font-medium text-slate-500 text-center"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayPosts = day !== null ? getPostsForDay(day) : [];

            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 border-b border-r border-slate-800 ${
                  day === null ? "bg-slate-900/50" : "hover:bg-slate-800/50"
                } ${index % 7 === 6 ? "border-r-0" : ""}`}
              >
                {day !== null && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`text-sm font-medium ${
                          isToday(day)
                            ? "w-7 h-7 flex items-center justify-center bg-emerald-600 text-white rounded-full"
                            : "text-slate-400"
                        }`}
                      >
                        {day}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {dayPosts.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className={`flex items-center gap-1.5 p-1 rounded transition-colors cursor-pointer ${
                            post.status === "Posted"
                              ? "bg-emerald-500/10 hover:bg-emerald-500/20"
                              : "bg-blue-500/10 hover:bg-blue-500/20 border border-dashed border-blue-500/30"
                          }`}
                        >
                          {post.previewUrl ? (
                            <img
                              src={post.previewUrl}
                              alt=""
                              className="w-5 h-5 rounded object-cover"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center">
                              {post.type === "VIDEO" ? (
                                <Video className="w-3 h-3 text-slate-400" />
                              ) : post.type === "CAROUSEL_ALBUM" ? (
                                <LayoutGrid className="w-3 h-3 text-slate-400" />
                              ) : (
                                <Image className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                          )}
                          <span className={`text-xs truncate flex-1 ${
                            post.status === "Posted" ? "text-emerald-400" : "text-blue-400"
                          }`}>
                            {post.title?.slice(0, 15) || "Post"}
                            {post.title && post.title.length > 15 ? "..." : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Post Detail Modal (simplified - no strategy) */}
      {selectedPost && (
        <ClientCalendarPostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}

function ClientCalendarPostModal({
  post,
  onClose,
}: {
  post: CalendarPost;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  post.status === "Posted"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {post.status}
              </span>
              {(post.postedAt || post.scheduledFor) && (
                <span className="text-sm text-slate-500">
                  {new Date(post.postedAt || post.scheduledFor!).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-white mt-2">
              {post.title || "Post"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex gap-5">
          {/* Preview */}
          <div className="flex-shrink-0">
            {post.previewUrl ? (
              <img
                src={post.previewUrl}
                alt={post.title}
                className="w-32 h-32 rounded-lg object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-lg bg-slate-800 flex items-center justify-center">
                {post.type === "VIDEO" ? (
                  <Video className="w-8 h-8 text-slate-600" />
                ) : post.type === "CAROUSEL_ALBUM" ? (
                  <LayoutGrid className="w-8 h-8 text-slate-600" />
                ) : (
                  <Image className="w-8 h-8 text-slate-600" />
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            {post.caption && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Caption</p>
                <p className="text-slate-300 text-sm whitespace-pre-wrap line-clamp-6">
                  {post.caption}
                </p>
              </div>
            )}

            {!post.caption && (
              <p className="text-slate-500 text-sm">No caption available.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
