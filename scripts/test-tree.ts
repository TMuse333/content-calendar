/**
 * Smoke test for the Waterline tree reader.
 *
 *   npx tsx scripts/test-tree.ts
 *
 * Reads Greg's live Notion tree straight through getTree() (via the explicit
 * treeDataSourceId, so it works regardless of his Mongo account config) and
 * prints it as an indented tree with statuses + counts. Proves lib/notion/tree.ts
 * end-to-end against real Notion.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { getTree, markPrimaryNiche, type TreeNode } from "../src/lib/notion/tree";

// Minimal zero-dep .env.local loader (tsx doesn't auto-load it).
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(join(process.cwd(), file), "utf8");
      for (const line of text.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      /* file may not exist — fine */
    }
  }
}

// Greg's Tree data source (from his Waterline page). Swap per account to test others.
const GREG_TREE = "collection://0c99ea02-46b2-4002-9994-953cce6163bf";

const DOT: Record<string, string> = {
  Untested: "·", Testing: "◐", Working: "●", Dropped: "✗",
};

function printTree(nodes: TreeNode[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = (id: string | undefined) =>
    nodes.filter((n) => n.parentId === id);
  const roots = nodes.filter((n) => !n.parentId || !byId.has(n.parentId));

  const line = (n: TreeNode, depth: number) => {
    const pad = "  ".repeat(depth);
    const mark = n.status ? `${DOT[n.status] ?? "?"} ${n.status}` : n.level;
    const counts = [
      n.storyIds.length && `stories:${n.storyIds.length}`,
      n.postIds.length && `posts:${n.postIds.length}`,
    ].filter(Boolean).join(" ");
    const edge = n.isPrimaryNiche ? "  ★EDGE" : "";
    console.log(`${pad}${n.name}  [${mark}]${counts ? "  " + counts : ""}${edge}`);
    for (const c of childrenOf(n.id)) line(c, depth + 1);
  };

  for (const r of roots) line(r, 0);
}

async function main() {
  loadEnv();
  if (!process.env.NOTION_API_KEY) {
    console.error("NOTION_API_KEY not set (add it to .env.local).");
    process.exit(1);
  }

  const raw = await getTree({
    postsDataSourceId: "",
    topicsDataSourceId: "",
    treeDataSourceId: GREG_TREE,
  });
  // Greg's strongest edge (account.primaryNiche) — flagged structurally, not prose.
  const nodes = markPrimaryNiche(raw, "Moving here from away");

  console.log(`\nGreg's Tree — ${nodes.length} nodes\n${"─".repeat(40)}`);
  printTree(nodes);
  const edge = nodes.find((n) => n.isPrimaryNiche);
  console.log(`\n★ primary niche: ${edge ? edge.name : "(not found)"}`);

  const byStatus = nodes.reduce<Record<string, number>>((acc, n) => {
    const k = n.status ?? n.level ?? "—";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`${"─".repeat(40)}\nby status/level:`, byStatus, "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
