import { Calendar } from "lucide-react";
import { PostPreview } from "@/components/media/PostPreview";
import type { PostedPost } from "./types";

export function PostedTab({
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
