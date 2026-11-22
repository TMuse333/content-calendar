/**
 * Instagram → Mongo metrics sync for one account.
 *
 * Shared by POST /api/accounts/[id]/posts/sync (UI button, nightly orchestrator)
 * and the MCP sync_metrics tool, so both run the exact same path.
 */
import { getAccountById } from "@/lib/mongodb/accounts";
import { upsertPosts } from "@/lib/mongodb/posts";
import { fetchPostInsights } from "@/lib/platforms/instagram";
import type { Post } from "@/lib/types/post";

export class SyncError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function syncAccountPosts(
  accountId: string,
  opts: { limit?: number; postIds?: string[] } = {}
): Promise<{ synced: number; new: number }> {
  const account = await getAccountById(accountId);
  if (!account) throw new SyncError(`Account "${accountId}" not found`, 404);

  const instagram = account.platforms?.instagram;
  if (!instagram?.connected || !instagram.userId || !instagram.accessToken) {
    throw new SyncError("Instagram not connected for this account", 400);
  }

  const result = await fetchPostInsights({
    credentials: {
      instagramId: instagram.userId,
      accessToken: instagram.accessToken,
      apiHost: instagram.apiHost,
    },
    limit: opts.limit,
  });
  if (result.error) throw new SyncError(result.error, 500);

  let postsToSync = result.data;
  if (opts.postIds && opts.postIds.length > 0) {
    const selected = new Set(opts.postIds);
    postsToSync = result.data.filter((p) => selected.has(p.id));
  }

  const posts: Omit<Post, "_id">[] = postsToSync.map((p) => ({
    accountId,
    instagramId: p.id,
    mediaType: p.mediaType as "VIDEO" | "IMAGE" | "CAROUSEL_ALBUM",
    mediaUrl: p.thumbnailUrl,
    thumbnailUrl: p.thumbnailUrl,
    caption: p.caption || undefined,
    permalink: `https://www.instagram.com/p/${p.id}/`,
    postedAt: new Date(p.timestamp),
    metrics: {
      likes: p.likes,
      comments: p.comments,
      reach: p.reach,
      impressions: p.impressions,
      engagement: p.engagement,
      videoViews: p.videoViews || undefined,
      saves: p.saves,
      shares: p.shares,
    },
    syncedAt: new Date(),
    updatedAt: new Date(),
  }));

  return upsertPosts(posts);
}
