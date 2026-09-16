"use client";

import { Plus, ArrowRight } from "lucide-react";
import Link from "next/link";

// Dashboard - Information coverage and gaps view

// Mock data - will come from API
const mockInfoPoints = [
  { id: "who-i-am", text: "Who Thomas is and his background", postCount: 0 },
  { id: "video-vs-web", text: "Why video > websites for trust", postCount: 0 },
  { id: "deep-work", text: "Deep work enables quality output", postCount: 3 },
  { id: "systems", text: "Systems > motivation", postCount: 2 },
  { id: "info-theory", text: "Information theory basics", postCount: 0 },
  { id: "built-system", text: "How I built the video system", postCount: 1 },
  { id: "the-offer", text: "The offer / how to work together", postCount: 0 },
];

function getStatus(postCount: number): "gap" | "light" | "covered" {
  if (postCount === 0) return "gap";
  if (postCount < 3) return "light";
  return "covered";
}

export default function DashboardPage() {
  const gaps = mockInfoPoints.filter((p) => getStatus(p.postCount) === "gap");
  const light = mockInfoPoints.filter((p) => getStatus(p.postCount) === "light");
  const covered = mockInfoPoints.filter((p) => getStatus(p.postCount) === "covered");

  const totalCovered = mockInfoPoints.filter((p) => p.postCount >= 3).length;
  const progress = Math.round((totalCovered / mockInfoPoints.length) * 100);

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-zinc-400">
          What does your audience still not know?
        </p>
      </div>

      {/* Goal & Context */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
        <div className="mb-4">
          <h2 className="text-sm font-medium text-zinc-500 mb-1">Goal</h2>
          <p className="text-white">
            Prove I can take complex ideas and make them visual + actionable
          </p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-zinc-500 mb-1">Context</h2>
          <p className="text-zinc-300">
            3 years lead gen, websites → video. Information theory approach.
          </p>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Information Coverage</h2>
          <span className="text-sm text-zinc-400">
            {totalCovered}/{mockInfoPoints.length} points covered
          </span>
        </div>
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-zinc-500 mt-2">{progress}% complete</p>
      </div>

      {/* Gaps */}
      {gaps.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Gaps
            <span className="text-sm font-normal text-zinc-500">
              ({gaps.length} points with no coverage)
            </span>
          </h2>
          <ul className="space-y-3">
            {gaps.map((point) => (
              <li
                key={point.id}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
              >
                <span className="text-zinc-300">{point.text}</span>
                <Link
                  href={`/post/new?infoPoint=${point.id}`}
                  className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Create
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Light Coverage */}
      {light.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Light Coverage
            <span className="text-sm font-normal text-zinc-500">
              (needs reinforcement)
            </span>
          </h2>
          <ul className="space-y-3">
            {light.map((point) => (
              <li
                key={point.id}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
              >
                <div>
                  <span className="text-zinc-300">{point.text}</span>
                  <span className="ml-2 text-sm text-zinc-500">
                    {point.postCount} post{point.postCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <Link
                  href={`/post/new?infoPoint=${point.id}`}
                  className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  Boost
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Covered */}
      {covered.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Covered
          </h2>
          <ul className="space-y-3">
            {covered.map((point) => (
              <li
                key={point.id}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
              >
                <div>
                  <span className="text-zinc-300">{point.text}</span>
                  <span className="ml-2 text-sm text-zinc-500">
                    {point.postCount} posts
                  </span>
                </div>
                <span className="text-emerald-400 text-sm">✓</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add Info Point */}
      <button className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors">
        <Plus className="w-4 h-4" />
        Add information point
      </button>
    </div>
  );
}
