"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Target,
  Clock,
  Calendar,
  TrendingUp,
  Loader2,
  AlertCircle,
  Check,
  CheckCircle2,
  Circle,
  ChevronRight,
  MessageSquare,
  Eye,
  FileText,
  X,
  Send,
} from "lucide-react";

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
  caption?: string;
  cta?: string;
}

interface PostedPost {
  id: string;
  title: string;
  questionAnswered?: string;
  type?: string;
  topicId?: string;
  status: string;
  previewUrl?: string;
}

interface ClientHubData {
  account: {
    id: string;
    name: string;
    handle?: string;
  };
  topics: TopicWithCoverage[];
  topicNames: Record<string, string>;
  needsReview: ReviewPost[];
  posted: PostedPost[];
  summary: {
    topicsActive: number;
    topicsCovered: number;
    postsPublished: number;
    postsScheduled: number;
    postsNeedingReview: number;
  };
}

type TabId = "topics" | "review" | "posted" | "results";

const TABS: { id: TabId; label: string; icon: typeof Target }[] = [
  { id: "topics", label: "Topics", icon: Target },
  { id: "review", label: "Review", icon: Clock },
  { id: "posted", label: "Posted", icon: Calendar },
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

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
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
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
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
              topicNames={data.topicNames}
              onRefresh={fetchData}
              accountId={accountId}
            />
          )}
          {activeTab === "posted" && (
            <PostedTab posts={data.posted} topicNames={data.topicNames} />
          )}
          {activeTab === "results" && <ResultsTab data={data} />}
        </div>
      </main>
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
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
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
            <span className="text-sm text-slate-400">
              {topic.coverage.coveredCount}/{topic.coverage.totalStages} stages
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
                  {!stage.covered && (
                    <p className="text-xs text-amber-500/70 mt-1">
                      Need content here
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
  topicNames,
  onRefresh,
  accountId,
}: {
  posts: ReviewPost[];
  topicNames: Record<string, string>;
  onRefresh: () => void;
  accountId: string;
}) {
  const [selectedPost, setSelectedPost] = useState<ReviewPost | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAction = async (postId: string, action: "approve" | "request-changes") => {
    setSubmitting(true);
    try {
      // We need a review token for this - for now just show success
      // In production, this would call the review API
      await new Promise((r) => setTimeout(r, 800));
      setSelectedPost(null);
      setComment("");
      onRefresh();
    } catch (err) {
      console.error(err);
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
                {post.previewUrl ? (
                  <img
                    src={post.previewUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileText className="w-8 h-8 text-slate-600" />
                )}
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
              {post.previewUrl ? (
                <img src={post.previewUrl} alt={post.title} className="w-full h-full object-cover" />
              ) : (
                <FileText className="w-20 h-20 text-slate-600" />
              )}
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
                {post.previewUrl ? (
                  <img
                    src={post.previewUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileText className="w-12 h-12 text-slate-600" />
                )}
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
                      post.status === "Published"
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
