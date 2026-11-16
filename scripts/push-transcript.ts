/**
 * Push a transcript file into Notion as a "Transcript —" child page under a Call
 * row, so the Debrief view can pull it. (This is what the future Zoom webhook
 * will do automatically.)
 *
 *   npx tsx scripts/push-transcript.ts <callPageId> <file> "<title>"
 */
import { readFileSync } from "fs";
import { join } from "path";
import { getNotionClient } from "../src/lib/notion/client";

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

async function main() {
  loadEnv();
  const [callPageId, file, title] = process.argv.slice(2);
  if (!callPageId || !file) {
    console.error('Usage: npx tsx scripts/push-transcript.ts <callPageId> <file> "<title>"');
    process.exit(1);
  }
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const blocks = lines.map((l) => ({
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: { rich_text: [{ type: "text" as const, text: { content: l.slice(0, 1990) } }] },
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = getNotionClient() as any;
  const page = await client.pages.create({
    parent: { type: "page_id", page_id: callPageId },
    properties: { title: { title: [{ text: { content: title || "Transcript" } }] } },
    children: blocks.slice(0, 100),
  });
  for (let i = 100; i < blocks.length; i += 100) {
    await client.blocks.children.append({ block_id: page.id, children: blocks.slice(i, i + 100) });
  }
  console.log(`✓ created "${title}" (${blocks.length} blocks) → ${page.url}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e?.body ?? e);
  process.exit(1);
});
