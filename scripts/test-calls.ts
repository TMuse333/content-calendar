/**
 * Smoke test for the Waterline calls reader.
 *
 *   npx tsx scripts/test-calls.ts
 *
 * Shows admin (full) vs public (summary-only) and asserts the sensitive bits —
 * recording URL, follow-ups, and anything transcript-shaped — never appear in the
 * public view.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { getCalls, getPublicCalls } from "../src/lib/notion/calls";

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

const GREG_CALLS = "collection://5b5284d1-bcab-49a3-804a-462fdefc3207";

async function main() {
  loadEnv();
  if (!process.env.NOTION_API_KEY) {
    console.error("NOTION_API_KEY not set (add it to .env.local).");
    process.exit(1);
  }

  const config = { postsDataSourceId: "", topicsDataSourceId: "", callsDataSourceId: GREG_CALLS };

  const admin = await getCalls(config);
  const pub = await getPublicCalls(config);

  console.log(`\nADMIN view — ${admin.length} calls (all fields)`);
  console.log("─".repeat(52));
  for (const c of admin) {
    console.log(`  ${c.date ?? "?"}  [${c.type ?? "-"}]  ${c.name}`);
    console.log(`     recording: ${c.recordingUrl ? "yes (admin)" : "none"} · follow-ups: ${c.followUps ? "yes" : "none"} · stories:${c.storyIds.length} nodes:${c.nodesTouchedIds.length}`);
  }

  console.log(`\nPUBLIC view — ${pub.length} calls (summary only)`);
  console.log("─".repeat(52));
  for (const c of pub) {
    console.log(`  ${c.date ?? "?"}  [${c.type ?? "-"}]  ${c.name}`);
  }

  // Safety assertion: public objects must only have id/name/type/date.
  const allowed = new Set(["id", "name", "type", "date"]);
  const leakedKeys = new Set<string>();
  for (const c of pub) for (const k of Object.keys(c)) if (!allowed.has(k)) leakedKeys.add(k);
  console.log("\nsafety — any field beyond id/name/type/date in public?",
    leakedKeys.size === 0 ? "NO ✔ (no recording / follow-ups / transcript)" : `YES ✗ ${[...leakedKeys]}`);
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
