"use client";

import { useAccount } from "@/contexts/AccountContext";
import { Clock, FileText, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function QueuePage() {
  const { currentAccount } = useAccount();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Queue</h1>
          <p className="text-slate-400 mt-1">Drafts and scheduled posts</p>
        </div>
        <Link
          href={`/account/${currentAccount?.id}/post/new`}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
        >
          New Post
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { label: "Drafts", icon: FileText, count: 0 },
          { label: "Scheduled", icon: Clock, count: 0 },
          { label: "Posted", icon: CheckCircle, count: 0 },
          { label: "Failed", icon: AlertCircle, count: 0 },
        ].map((tab, i) => (
          <button
            key={tab.label}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              i === 0
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="text-xs text-slate-500">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Empty State */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">No drafts yet</p>
        <p className="text-slate-500 text-sm mt-1">
          Create a post to get started
        </p>
        <Link
          href={`/account/${currentAccount?.id}/post/new`}
          className="inline-block mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
        >
          Create Post
        </Link>
      </div>
    </div>
  );
}
