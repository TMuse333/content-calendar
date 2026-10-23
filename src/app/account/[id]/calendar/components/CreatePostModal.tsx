"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface CreatePostModalProps {
  day: number;
  month: number;
  year: number;
  creating: boolean;
  onClose: () => void;
  onCreate: (day: number, intent: { audience: string; topic?: string }) => void;
}

export function CreatePostModal({
  day,
  month,
  year,
  creating,
  onClose,
  onCreate,
}: CreatePostModalProps) {
  const [audience, setAudience] = useState<"buyers" | "sellers" | "both">("both");
  const [topic, setTopic] = useState("");

  const dateStr = new Date(year, month, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Schedule Post</h2>
          <p className="text-sm text-slate-500">{dateStr}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Audience */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Audience
            </label>
            <div className="flex gap-2">
              {(["buyers", "sellers", "both"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAudience(opt)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg capitalize transition-colors ${
                    audience === opt
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Topic <span className="text-slate-500">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Market update, Buying tips..."
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate(day, { audience, topic: topic || undefined })}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
