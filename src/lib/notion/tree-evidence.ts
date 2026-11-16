/**
 * Tree + evidence: the situation tree with the DATA behind each node's status.
 *
 * Joins (per node):
 *   node ──postIds──►  Notion Posts ──igPostLink═══igPostUrl──► tracked_posts (IG metrics)
 *        ──storyIds─►  Stories (count + top breakthrough)
 *
 * Powers the Debrief view's coverage panel and the React Flow interactive tree —
 * "why is this node Working / the edge" answered with numbers, not prose.
 */
import { getTree, markPrimaryNiche, type TreeNode } from "./tree";
import { getStories } from "./stories";
import { getPosts } from "./service";
import { getTrackedPostsByAccount } from "@/lib/mongodb/tracked-posts";
import type { NotionConfig } from "./types";

export interface NodeMetrics {
  posts: number;         // posts on this node that have IG metrics
  totalReach: number;
  avgReach: number;
  bestReach: number;
  totalSaves: number;
}

export interface NodeEvidence extends TreeNode {
  storyCount: number;
  topBreakthrough?: number;   // strongest story on the node (1–5)
  postCount: number;          // posts linked (any)
  metrics: NodeMetrics;       // aggregate IG performance of its posts
}

const EMPTY: NodeMetrics = { posts: 0, totalReach: 0, avgReach: 0, bestReach: 0, totalSaves: 0 };

function normLink(url?: string): string {
  return (url ?? "").split("?")[0].replace(/\/+$/, "").toLowerCase();
}

/**
 * The tree with evidence per node. Primary-niche flagged. Metrics are best-effort:
 * nodes with no tracked posts come back with zeroed metrics (normal for new ones).
 */
export async function getTreeWithEvidence(
  accountId: string,
  config: NotionConfig,
  primaryNiche?: string
): Promise<NodeEvidence[]> {
  const [nodesRaw, posts, stories, tracked] = await Promise.all([
    getTree(config),
    getPosts(config).catch(() => []),
    getStories(config).catch(() => []),
    getTrackedPostsByAccount(accountId).catch(() => []),
  ]);
  const nodes = markPrimaryNiche(nodesRaw, primaryNiche);

  // postId → igPostLink, and igPostUrl → metrics
  const linkByPostId = new Map<string, string>();
  for (const p of posts) if (p.igPostLink) linkByPostId.set(p.id, normLink(p.igPostLink));
  const metricsByLink = new Map<string, { reach: number; saves: number }>();
  for (const t of tracked) {
    const m = t.metrics;
    metricsByLink.set(normLink(t.igPostUrl), { reach: m?.reach ?? 0, saves: m?.saves ?? 0 });
  }
  const breakthroughByStoryId = new Map<string, number>();
  for (const s of stories) if (typeof s.breakthrough === "number") breakthroughByStoryId.set(s.id, s.breakthrough);

  return nodes.map((n) => {
    // aggregate IG metrics across this node's posts
    const reaches: number[] = [];
    let totalSaves = 0;
    for (const postId of n.postIds) {
      const link = linkByPostId.get(postId);
      const m = link ? metricsByLink.get(link) : undefined;
      if (m) {
        reaches.push(m.reach);
        totalSaves += m.saves;
      }
    }
    const totalReach = reaches.reduce((a, b) => a + b, 0);
    const metrics: NodeMetrics = reaches.length
      ? {
          posts: reaches.length,
          totalReach,
          avgReach: Math.round(totalReach / reaches.length),
          bestReach: Math.max(...reaches),
          totalSaves,
        }
      : EMPTY;

    const breakthroughs = n.storyIds.map((id) => breakthroughByStoryId.get(id)).filter((b): b is number => typeof b === "number");

    return {
      ...n,
      storyCount: n.storyIds.length,
      topBreakthrough: breakthroughs.length ? Math.max(...breakthroughs) : undefined,
      postCount: n.postIds.length,
      metrics,
    };
  });
}
