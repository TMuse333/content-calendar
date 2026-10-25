"use client";

import { Send, Clock, Hammer } from "lucide-react";
import type { NotionCalendarPost } from "./NotionPostModal";

/**
 * One-glance answer to "what's ready to be posted?" — summarizes the
 * planned Notion posts above the admin calendar grid.
 */
export function PipelineStrip({
  posts,
  onSelect,
}: {
  posts: NotionCalendarPost[];
  onSelect: (post: NotionCalendarPost) => void;
}) {
  if (posts.length === 0) return null;

  const byDate = [...posts].sort((a, b) =>
    (a.scheduledFor || a.postedAt || "").localeCompare(b.scheduledFor || b.postedAt || "")
  );
  const approved = byDate.filter((p) => p.status === "Approved");
  const waiting = byDate.filter((p) => p.status === "Ready for review");
  const making = byDate.filter((p) => p.status !== "Approved" && p.status !== "Ready for review");

  const now = new Date().toISOString();
  const next = byDate.find((p) => (p.scheduledFor || p.postedAt || "") >= now) ?? byDate[0];
  const nextDate = next
    ? new Date(next.scheduledFor || next.postedAt!).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;
  const nextLabel =
    next?.status === "Approved"
      ? "ready — publish it"
      : next?.status === "Ready for review"
      ? "waiting on client 👍"
      : "still being made";

  return (
    <div className="mb-4 bg-slate-900 border border-slate-800 rounded-xl px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-xs uppercase tracking-wider text-slate-500">Pipeline</span>

        <button
          onClick={() => approved[0] && onSelect(approved[0])}
          disabled={approved.length === 0}
          className={`flex items-center gap-2 text-sm ${
            approved.length > 0 ? "text-emerald-400 hover:text-emerald-300" : "text-slate-600"
          }`}
          title={approved.length > 0 ? "Open the first approved post" : undefined}
        >
          <Send className="w-4 h-4" />
          <span className="font-semibold">{approved.length}</span> ready to publish
        </button>

        <button
          onClick={() => waiting[0] && onSelect(waiting[0])}
          disabled={waiting.length === 0}
          className={`flex items-center gap-2 text-sm ${
            waiting.length > 0 ? "text-amber-400 hover:text-amber-300" : "text-slate-600"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="font-semibold">{waiting.length}</span> waiting on client
        </button>

        <span className={`flex items-center gap-2 text-sm ${making.length ? "text-blue-400" : "text-slate-600"}`}>
          <Hammer className="w-4 h-4" />
          <span className="font-semibold">{making.length}</span> being made
        </span>

        {next && nextDate && (
          <button
            onClick={() => onSelect(next)}
            className="ml-auto text-sm text-slate-400 hover:text-white text-left"
          >
            Next up: <span className="text-white">{nextDate}</span> · {next.title?.slice(0, 32)}
            {next.title && next.title.length > 32 ? "…" : ""} <span className="text-slate-500">({nextLabel})</span>
          </button>
        )}
      </div>
    </div>
  );
}
