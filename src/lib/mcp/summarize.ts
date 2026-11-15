/**
 * Pure helpers behind the MCP read tools — no I/O, so they're unit-testable
 * without Mongo/Notion credentials.
 *
 *   classifyPostKind  — story vs listing vs other, with the reason
 *   summarizeByKind   — per-kind averages (the "story posts do 3–4x" check)
 *   findSilentNodes   — tree nodes with no posts and no stories
 */
import type { TreeNode } from "@/lib/notion/tree";

export type PostKind = "story" | "listing" | "other";

/**
 * Where the kind came from, most to least trustworthy:
 *   notion-story — the Notion post has a Story relation (a real client story)
 *   classifier   — no Story link; fell back to the AI contentType
 *   none         — no signal at all (unclassified, not in Notion)
 */
export type KindSource = "notion-story" | "classifier" | "none";

/** Minimal shapes so the helpers don't depend on the full Mongo/Notion types. */
export interface KindInput {
  permalink?: string;
  contentType?: string;
}
export interface NotionPostLink {
  igPostLink?: string;
  storyIds?: string[];
}

/**
 * Join key for an IG URL. Uses the post shortcode when the URL has one, so
 * www/no-www, /p/ vs /reel/, query strings and trailing slashes all match
 * (the API returns www.instagram.com/p/…; Notion links are pasted by hand).
 */
export function normLink(url?: string): string {
  const u = (url ?? "").trim();
  const m = u.match(/instagram\.com\/(?:[^/?#]+\/)?(?:p|reel|reels|tv)\/([^/?#]+)/i);
  if (m) return `ig:${m[1].toLowerCase()}`;
  return u.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
}

/** igPostLink → Notion post, for joining IG posts to their Notion row. */
export function indexNotionByLink<T extends NotionPostLink>(posts: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const p of posts) {
    const key = normLink(p.igPostLink);
    if (key) map.set(key, p);
  }
  return map;
}

// AI classifier contentType → kind. "case-study" is a client story; "showcase"
// is a listing/property showcase. Everything else is neither.
const CLASSIFIER_KIND: Record<string, PostKind> = {
  "case-study": "story",
  showcase: "listing",
};

export function classifyPostKind(
  post: KindInput,
  notionByLink: Map<string, NotionPostLink>
): { kind: PostKind; kindSource: KindSource } {
  const notion = notionByLink.get(normLink(post.permalink));
  if (notion?.storyIds?.length) return { kind: "story", kindSource: "notion-story" };

  const fromClassifier = post.contentType ? CLASSIFIER_KIND[post.contentType] : undefined;
  if (fromClassifier) return { kind: fromClassifier, kindSource: "classifier" };
  if (post.contentType) return { kind: "other", kindSource: "classifier" };
  return { kind: "other", kindSource: "none" };
}

export interface MetricsInput {
  kind: PostKind;
  metrics?: { reach?: number; likes?: number; saves?: number; comments?: number };
}

export interface KindSummary {
  posts: number;
  avgReach: number;
  avgLikes: number;
  avgSaves: number;
  bestReach: number;
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

/** Averages per kind. Every kind is always present (zeros when empty). */
export function summarizeByKind(posts: MetricsInput[]): Record<PostKind, KindSummary> {
  const out = {} as Record<PostKind, KindSummary>;
  for (const kind of ["story", "listing", "other"] as const) {
    const ms = posts.filter((p) => p.kind === kind).map((p) => p.metrics ?? {});
    const reach = ms.map((m) => m.reach ?? 0);
    out[kind] = {
      posts: ms.length,
      avgReach: avg(reach),
      avgLikes: avg(ms.map((m) => m.likes ?? 0)),
      avgSaves: avg(ms.map((m) => m.saves ?? 0)),
      bestReach: reach.length ? Math.max(...reach) : 0,
    };
  }
  return out;
}

/** story avgReach ÷ listing avgReach, 1 decimal; null when either side is empty. */
export function storyVsListingRatio(s: Record<PostKind, KindSummary>): number | null {
  if (!s.story.posts || !s.listing.posts || !s.listing.avgReach) return null;
  return Math.round((s.story.avgReach / s.listing.avgReach) * 10) / 10;
}

export interface SilentNode {
  id: string;
  name: string;
  level: string;
  status?: string;
  isPrimaryNiche: boolean;
  /** true when this node sits under the primary-niche node */
  underPrimaryNiche: boolean;
}

/**
 * Nodes with no posts AND no stories. Skips Structure nodes (no status — they
 * group, they aren't tested) and Dropped nodes. Primary niche (and anything under
 * it) first, then tree order.
 */
export function findSilentNodes(nodes: TreeNode[]): SilentNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const underPrimary = (n: TreeNode): boolean => {
    const seen = new Set<string>();
    let cur: TreeNode | undefined = n;
    while (cur && !seen.has(cur.id)) {
      if (cur.isPrimaryNiche) return true;
      seen.add(cur.id);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return false;
  };

  const silent = nodes
    .filter((n) => n.status && n.status !== "Dropped")
    .filter((n) => n.postIds.length === 0 && n.storyIds.length === 0)
    .map((n) => ({
      id: n.id,
      name: n.name,
      level: n.level,
      status: n.status,
      isPrimaryNiche: Boolean(n.isPrimaryNiche),
      underPrimaryNiche: underPrimary(n),
    }));

  // stable sort: primary-niche branch first
  return silent
    .map((n, i) => ({ n, i }))
    .sort((a, b) => Number(b.n.underPrimaryNiche) - Number(a.n.underPrimaryNiche) || a.i - b.i)
    .map(({ n }) => n);
}
