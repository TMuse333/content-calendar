"use client";

import { useState, useEffect, useCallback } from "react";
import { use } from "react";

interface QueuePost {
  id: string;
  agentId: string;
  scheduledFor: string;
  dayOfWeek: string;
  intent: {
    audience: string;
    topic?: string;
    suggestedFormat?: string;
  };
  content?: {
    headline?: string;
    body?: string;
  };
  status: string;
  clientFeedback?: string;
  graphicId?: string;
  graphicPreviewUrl?: string;
}

interface QueueData {
  needsGraphic: QueuePost[];
  needsRevision: QueuePost[];
  recentlyRendered: QueuePost[];
}

export default function EmbedQueuePage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<QueuePost | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`/api/graphics/queue?agentId=${agentId}`);
      const json = await res.json();
      setData(json.data);
    } catch (error) {
      console.error("Failed to fetch queue:", error);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchQueue();
    // Refresh every 30 seconds
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const openInWizard = (post: QueuePost) => {
    // Post message to parent window (Graphics App)
    window.parent.postMessage(
      {
        type: "OPEN_POST",
        post: {
          postId: post.id,
          agentId: post.agentId,
          format: post.intent.suggestedFormat,
          topic: post.intent.topic,
          audience: post.intent.audience,
          content: post.content,
          clientFeedback: post.clientFeedback,
        },
      },
      "*"
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-slate-400">Loading queue...</div>
      </div>
    );
  }

  const totalWork = (data?.needsGraphic.length || 0) + (data?.needsRevision.length || 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold">Graphics Queue</h1>
          <p className="text-xs text-slate-500">{agentId}</p>
        </div>
        <div className="flex items-center gap-2">
          {totalWork > 0 && (
            <span className="bg-amber-500/20 text-amber-400 text-xs font-medium px-2 py-1 rounded-full">
              {totalWork} to do
            </span>
          )}
          <button
            onClick={fetchQueue}
            className="text-xs text-slate-400 hover:text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Needs Graphic */}
      {data?.needsGraphic && data.needsGraphic.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Ready for Graphics ({data.needsGraphic.length})
          </h2>
          <div className="space-y-2">
            {data.needsGraphic.map((post) => (
              <div
                key={post.id}
                onClick={() => openInWizard(post)}
                className="p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-amber-500/30 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-sm">
                      {post.intent.topic || `${post.intent.audience} content`}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {formatDate(post.scheduledFor)} &bull;{" "}
                      <span className="capitalize">{post.intent.audience}</span>
                    </div>
                  </div>
                  {post.intent.suggestedFormat && (
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                      {post.intent.suggestedFormat}
                    </span>
                  )}
                </div>
                {post.content?.headline && (
                  <div className="mt-2 text-xs text-slate-400 line-clamp-1">
                    {post.content.headline}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Needs Revision */}
      {data?.needsRevision && data.needsRevision.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Needs Revision ({data.needsRevision.length})
          </h2>
          <div className="space-y-2">
            {data.needsRevision.map((post) => (
              <div
                key={post.id}
                onClick={() => openInWizard(post)}
                className="p-3 bg-slate-900 border border-red-500/20 rounded-lg hover:border-red-500/40 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-sm">
                      {post.intent.topic || `${post.intent.audience} content`}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {formatDate(post.scheduledFor)}
                    </div>
                  </div>
                </div>
                {post.clientFeedback && (
                  <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-300">
                    &ldquo;{post.clientFeedback}&rdquo;
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recently Rendered */}
      {data?.recentlyRendered && data.recentlyRendered.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Recently Done ({data.recentlyRendered.length})
          </h2>
          <div className="space-y-2">
            {data.recentlyRendered.slice(0, 5).map((post) => (
              <div
                key={post.id}
                className="p-2 bg-slate-900/50 border border-slate-800/50 rounded-lg flex items-center gap-3"
              >
                {post.graphicPreviewUrl ? (
                  <img
                    src={post.graphicPreviewUrl}
                    alt=""
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-slate-600">
                    ?
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">
                    {post.intent.topic || post.intent.audience}
                  </div>
                  <div className="text-xs text-slate-500">
                    {post.status === "rendered" ? "Rendered" : "In Review"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {totalWork === 0 && (
        <div className="text-center py-8">
          <div className="text-slate-500">No graphics to create</div>
          <p className="text-xs text-slate-600 mt-1">
            Posts will appear here when ready
          </p>
        </div>
      )}
    </div>
  );
}
