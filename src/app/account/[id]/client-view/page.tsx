"use client";

/**
 * Client view — the client's main dashboard (/account/[id]/client-view).
 *
 * Fetches everything from /api/accounts/[id]/client-hub (client-safe fields
 * only) and renders one tab at a time. Calendar is the source of truth and
 * the default view; each tab lives in ./components.
 */

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Target,
  Clock,
  Calendar,
  CalendarDays,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Link,
  MessageCircleQuestion,
} from "lucide-react";
import { InstagramIcon } from "./components/InstagramIcon";
import { ConnectInstagramCard } from "./components/ConnectInstagramCard";
import { TopicsTab } from "./components/TopicsTab";
import { ReviewTab } from "./components/ReviewTab";
import { PostedTab } from "./components/PostedTab";
import { ResultsTab } from "./components/ResultsTab";
import { CalendarTab } from "./components/CalendarTab";
import { QuestionsTab } from "./components/QuestionsTab";
import type { ClientHubData } from "./components/types";

type TabId = "topics" | "review" | "questions" | "posted" | "calendar" | "results";

const TABS: { id: TabId; label: string; icon: typeof Target }[] = [
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "topics", label: "Topics", icon: Target },
  { id: "review", label: "Review", icon: Clock },
  { id: "questions", label: "Questions", icon: MessageCircleQuestion },
  { id: "posted", label: "Posted", icon: Calendar },
  { id: "results", label: "Results", icon: TrendingUp },
];

export default function ClientHubPage() {
  const params = useParams();
  const accountId = params.id as string;

  const [data, setData] = useState<ClientHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("calendar");
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
  }, [accountId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    return <ConnectInstagramCard accountId={accountId} />;
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
          {activeTab === "questions" && <QuestionsTab accountId={accountId} />}
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
