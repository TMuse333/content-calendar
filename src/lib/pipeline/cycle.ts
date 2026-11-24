/**
 * Cycle derivation helpers — which Notion posts belong to one call's cycle.
 * Shared by GET /cycle (state) and POST /cycle/resume (scheduling).
 */
import { getCalls } from "@/lib/notion/calls";
import { getPostById } from "@/lib/notion";
import { listAssetDeliveries } from "@/lib/mongodb/asset-deliveries";
import type { NotionConfig } from "@/lib/notion/types";

export interface CyclePostState {
  postId: string;
  title: string;
  status: string;
  postDate?: string;
  igPostLink?: string;
}

const bare = (id: string) => id.replace(/-/g, "");

/** All Notion posts tied to this call: the Call row's "Posts proposed"
 *  relation ∪ posts bound by asset ingest (lineage.callId). */
export async function postsForCall(
  accountId: string,
  callId: string,
  notion: NotionConfig
): Promise<CyclePostState[]> {
  const calls = await getCalls(notion);
  const call = calls.find((c) => bare(c.id) === bare(callId));
  const deliveries = await listAssetDeliveries(accountId);
  const ids = new Set<string>([
    ...(call?.postsProposedIds ?? []),
    ...deliveries
      .filter((d) => d.lineage.callId && bare(d.lineage.callId) === bare(callId))
      .map((d) => d.boundPostId),
  ]);

  const posts: CyclePostState[] = [];
  for (const postId of ids) {
    const p = await getPostById(notion, postId);
    if (p) posts.push({ postId: p.id, title: p.title, status: p.status, postDate: p.postDate, igPostLink: p.igPostLink });
  }
  return posts;
}
