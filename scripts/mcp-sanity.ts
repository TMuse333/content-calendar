/**
 * Live sanity check for the MCP read tools (no server, no HTTP):
 * registers the tools on a fake McpServer and calls each with greg-caseley.
 *
 *   npx tsx scripts/mcp-sanity.ts         (needs MONGODB_URI + NOTION_API_KEY)
 */
import { registerReadTools } from "../src/lib/mcp/tools";

type Handler = (args: Record<string, unknown>) => Promise<{ content: Array<{ text: string }>; isError?: boolean }>;
const handlers = new Map<string, Handler>();
const fakeServer = {
  registerTool: (name: string, _meta: unknown, handler: Handler) => handlers.set(name, handler),
} as never;

async function call(name: string, args: Record<string, unknown> = {}) {
  const res = await handlers.get(name)!(args);
  if (res.isError) throw new Error(`${name} errored: ${res.content[0].text}`);
  return JSON.parse(res.content[0].text);
}

async function main() {
  registerReadTools(fakeServer);
  console.log("tools:", [...handlers.keys()].join(", "));

  const metrics = await call("get_post_metrics", { accountId: "greg-caseley", limit: 100 });
  console.log("\n== byKind ==\n", JSON.stringify(metrics.byKind, null, 1));
  console.log("storyVsListing:", metrics.storyVsListing, metrics.warning ? `WARNING: ${metrics.warning}` : "");
  const srcCount: Record<string, number> = {};
  for (const p of metrics.posts) srcCount[p.kindSource] = (srcCount[p.kindSource] ?? 0) + 1;
  console.log("kindSource counts:", srcCount);
  console.log("story posts:", metrics.posts.filter((p: { kind: string }) => p.kind === "story")
    .map((p: { caption?: string; metrics: { reach: number } }) => `"${(p.caption ?? "").slice(0, 40)}" reach=${p.metrics.reach}`));

  const tree = await call("get_tree", { accountId: "greg-caseley" });
  console.log("\n== silentNodes ==", tree.silentNodes.length);
  for (const n of tree.silentNodes) console.log(` ${n.underPrimaryNiche ? "★" : " "} ${n.name} (${n.status})`);

  const calls = await call("get_calls", { accountId: "greg-caseley" });
  const upcoming = await call("get_upcoming", { accountId: "greg-caseley" });
  console.log("\ncalls:", calls.length, "| upcoming:", upcoming.length);
  process.exit(0);
}
main();
