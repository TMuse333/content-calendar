/**
 * Smoke test for getTreeWithEvidence — the tree with the data behind each node.
 *   npx tsx scripts/test-evidence.ts
 * Joins Notion (tree/posts/stories) + Mongo (IG metrics). Needs MONGODB_URI.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { getTreeWithEvidence } from "../src/lib/notion/tree-evidence";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(join(process.cwd(), file), "utf8");
      for (const line of text.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    } catch {
      /* no-op */
    }
  }
}

const GREG = {
  postsDataSourceId: "collection://09d0f481-0d99-4e07-a65d-685ac13c4304",
  topicsDataSourceId: "",
  treeDataSourceId: "collection://0c99ea02-46b2-4002-9994-953cce6163bf",
  storiesDataSourceId: "collection://c0d322e6-d700-4494-9189-5734e7116117",
};

async function main() {
  loadEnv();
  const nodes = await getTreeWithEvidence("greg-caseley", GREG, "Moving here from away");
  console.log(`\nTree + evidence — ${nodes.length} nodes\n${"─".repeat(60)}`);
  for (const n of nodes.filter((x) => x.status)) {
    const m = n.metrics;
    const perf = m.posts ? `  📊 ${m.posts}p reach⌀${m.avgReach} best${m.bestReach} saves${m.totalSaves}` : "";
    const bt = n.topBreakthrough ? ` bt${n.topBreakthrough}` : "";
    console.log(`${n.isPrimaryNiche ? "★ " : "  "}${n.name}  [${n.status}]  stories:${n.storyCount}${bt} posts:${n.postCount}${perf}`);
  }
  console.log("");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
