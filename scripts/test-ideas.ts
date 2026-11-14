/**
 * Generate + print video ideas from a real Greg transcript.
 *
 *   npx tsx scripts/test-ideas.ts
 *
 * Pulls the Nov 5 story-call transcript from Notion, runs it against Greg's live
 * tree (primary niche flagged), and prints the video ideas — the "based on our
 * last call, here's what we can make" recap. Makes one Claude call.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { getNotionClient } from "../src/lib/notion/client";
import { getTree, markPrimaryNiche } from "../src/lib/notion/tree";
import { generateVideoIdeas } from "../src/lib/calls/ideas";

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

const GREG_TREE = "collection://0c99ea02-46b2-4002-9994-953cce6163bf";
const NOV5_TRANSCRIPT_PAGE = "40f08d8fd602818ba173daa28cd2e0dc";

/** Concatenate a Notion page's paragraph text (the transcript body). */
async function fetchTranscript(pageId: string): Promise<string> {
  const client = getNotionClient();
  let out: string[] = [];
  let cursor: string | undefined;
  do {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await (client as any).blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
    for (const b of res.results ?? []) {
      const rt = b?.paragraph?.rich_text ?? b?.[b.type]?.rich_text;
      if (Array.isArray(rt)) out.push(rt.map((t: { plain_text?: string }) => t.plain_text ?? "").join(""));
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out.filter(Boolean).join("\n");
}

async function main() {
  loadEnv();
  if (!process.env.NOTION_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    console.error("Need NOTION_API_KEY and ANTHROPIC_API_KEY in .env.local");
    process.exit(1);
  }

  const nodes = markPrimaryNiche(
    await getTree({ postsDataSourceId: "", topicsDataSourceId: "", treeDataSourceId: GREG_TREE }),
    "Moving here from away"
  );
  const transcript = await fetchTranscript(NOV5_TRANSCRIPT_PAGE);
  console.log(`transcript: ${transcript.length} chars · tree: ${nodes.filter((n) => n.status).length} nodes\n`);
  console.log("generating ideas (one Claude call)…\n");

  const ideas = await generateVideoIdeas(transcript, nodes);

  console.log(`\n${"═".repeat(60)}\nVIDEO IDEAS — "based on our last call" (${ideas.length})\n${"═".repeat(60)}`);
  ideas.forEach((idea, i) => {
    console.log(`\n${i + 1}. ${idea.node}${idea.isPrimaryNiche ? "  ★EDGE" : ""}  ·  ${idea.lens}  ·  ${idea.suggestedFormat}`);
    console.log(`   ${idea.angle}`);
    console.log(`   belief: ${idea.beliefBefore}  →  ${idea.beliefAfter}`);
    if (idea.surprise) console.log(`   surprise: ${idea.surprise}`);
    console.log(`   hooks:`);
    for (const h of idea.hooks) {
      console.log(`     ${h.preferred ? "▶" : "·"} [${h.type}/${h.style}] "${h.text}"`);
    }
    if (idea.factsToConfirm.length) console.log(`   verify: ${idea.factsToConfirm.join(" · ")}`);
  });
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
