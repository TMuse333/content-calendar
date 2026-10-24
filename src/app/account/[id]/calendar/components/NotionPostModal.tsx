"use client";

import { useState } from "react";
import { X, Check, ExternalLink, Loader2, Send, AlertCircle } from "lucide-react";
import { PostPreview } from "@/components/media/PostPreview";

/**
 * Admin modal for a planned Notion post on the calendar, including the
 * manual "Publish to Instagram" button (Approved posts with slides only).
 * The publish route requires PUBLISH_SECRET; we ask once and keep it in
 * localStorage until admin login exists.
 */

export interface NotionCalendarPost {
  id: string; // Notion page ID
  title: string;
  caption?: string;
  status: string;
  type?: string;
  previewUrl?: string;
  previewUrls?: string[];
  postedAt?: string;
  scheduledFor?: string;
  topic?: string;
  questionAnswered?: string;
  cta?: string;
}

const SECRET_KEY = "publish-secret";

export function NotionPostModal({
  post,
  accountId,
  igUsername,
  onClose,
  onPublished,
}: {
  post: NotionCalendarPost;
  accountId: string;
  igUsername?: string;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "confirm" | "publishing" | "done">("idle");
  const [permalink, setPermalink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slides = post.previewUrls?.length ? post.previewUrls : post.previewUrl ? [post.previewUrl] : [];
  const canPublish = post.status === "Approved" && slides.length > 0;
  const dateLabel = (post.postedAt || post.scheduledFor)
    ? new Date(post.postedAt || post.scheduledFor!).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;

  const publish = async () => {
    let secret = "";
    try {
      secret = localStorage.getItem(SECRET_KEY) ?? "";
    } catch {
      /* fall through to prompt */
    }
    if (!secret) {
      secret = window.prompt("Publish code (PUBLISH_SECRET):")?.trim() ?? "";
      if (!secret) return;
      try {
        localStorage.setItem(SECRET_KEY, secret);
      } catch {
        /* session-only is fine */
      }
    }

    setPhase("publishing");
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}/posts/${post.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-publish-secret": secret },
        body: JSON.stringify({}),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 401) {
        try {
          localStorage.removeItem(SECRET_KEY);
        } catch {
          /* ignore */
        }
        throw new Error("Wrong publish code — try again.");
      }
      if (!res.ok) throw new Error(j.error || "Publish failed");
      setPermalink(j.permalink ?? null);
      setPhase("done");
      onPublished();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
      setPhase("idle");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {post.topic && (
                <span className="text-xs text-emerald-500 font-medium uppercase tracking-wider">{post.topic}</span>
              )}
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  post.status === "Approved"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : post.status === "Ready for review"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {post.status}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-white mt-2">{post.title}</h2>
            {dateLabel && <p className="text-sm text-slate-500 mt-0.5">{dateLabel}{post.type ? ` · ${post.type}` : ""}{slides.length ? ` · ${slides.length} slides` : ""}</p>}
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex gap-4">
            <div className="w-36 h-44 bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
              <PostPreview url={post.previewUrl} urls={post.previewUrls} alt={post.title} iconClassName="w-8 h-8 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              {post.questionAnswered && (
                <p className="text-xs text-slate-500 mb-2">
                  Answers: <span className="text-slate-300">&ldquo;{post.questionAnswered}&rdquo;</span>
                </p>
              )}
              {post.caption ? (
                <p className="text-slate-300 text-sm whitespace-pre-wrap line-clamp-[10]">{post.caption}</p>
              ) : (
                <p className="text-slate-500 text-sm">No caption in Notion yet.</p>
              )}
            </div>
          </div>

          {/* Publish section */}
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Publish</p>

            {phase === "done" ? (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-emerald-400 text-sm">
                  <Check className="w-4 h-4" /> Live on Instagram — Notion flipped to Posted.
                </p>
                {permalink && (
                  <a
                    href={permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> View on Instagram
                  </a>
                )}
              </div>
            ) : post.status === "Posted" ? (
              <p className="text-sm text-slate-400">Already posted.</p>
            ) : !canPublish ? (
              <p className="flex items-center gap-2 text-sm text-slate-400">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                {slides.length === 0 ? "No slides attached in Notion." : `Post is "${post.status}" — it publishes once Approved.`}
              </p>
            ) : phase === "confirm" ? (
              <div className="space-y-3">
                <p className="text-sm text-white">
                  Publish {slides.length} slides{igUsername ? ` to @${igUsername}` : " to Instagram"} now?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={publish}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" /> Yes, publish
                  </button>
                  <button onClick={() => setPhase("idle")} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
                    Cancel
                  </button>
                </div>
              </div>
            ) : phase === "publishing" ? (
              <p className="flex items-center gap-2 text-sm text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                Converting slides, uploading, publishing to Instagram… (~30s)
              </p>
            ) : (
              <button
                onClick={() => setPhase("confirm")}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                Publish to Instagram{igUsername ? ` @${igUsername}` : ""}
              </button>
            )}

            {error && (
              <p className="mt-3 flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" /> {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
