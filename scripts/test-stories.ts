/**
 * Smoke test for the Waterline stories reader + permission filter.
 *
 *   npx tsx scripts/test-stories.ts
 *
 * Reads Greg's live Stories and shows the admin view (all) vs the public view
 * (permission-filtered, fail-closed). Proves the Yes/Anonymous-only gate and the
 * negative test: no "No" or "Not asked" story ever surfaces publicly.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { getStories, getPublicStories } from "../src/lib/notion/stories";

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

const GREG_STORIES = "collection://c0d322e6-d700-4494-9189-5734e7116117";

async function main() {
  loadEnv();
  if (!process.env.NOTION_API_KEY) {
    console.error("NOTION_API_KEY not set (add it to .env.local).");
    process.exit(1);
  }

  const config = { postsDataSourceId: "", topicsDataSourceId: "", storiesDataSourceId: GREG_STORIES };

  const admin = await getStories(config);
  const pub = await getPublicStories(config);

  const byPerm = admin.reduce<Record<string, number>>((acc, s) => {
    acc[s.permission] = (acc[s.permission] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\nADMIN view — ${admin.length} stories (all fields)`);
  console.log("─".repeat(48));
  for (const s of admin) {
    console.log(`  [${s.permission}]  ${s.name}  (breakthrough ${s.breakthrough ?? "-"})`);
  }
  console.log("\npermission breakdown:", byPerm);

  console.log(`\nPUBLIC view — ${pub.length} stories (permission-filtered)`);
  console.log("─".repeat(48));
  if (pub.length === 0) {
    console.log("  (none cleared — every story is 'Not asked' or 'No'. Fail-closed ✔)");
  }
  for (const s of pub) {
    console.log(`  [${s.permission}${s.anonymized ? " · anon" : ""}]  ${s.name ?? "(prose withheld — anonymous)"}`);
  }

  // Negative test — the security assertion.
  const leaked = pub.filter((s) => s.permission !== "Yes" && s.permission !== "Anonymous only");
  console.log("\nnegative test — any 'No'/'Not asked' leaked into public?",
    leaked.length === 0 ? "NO ✔ (safe)" : `YES ✗ LEAK: ${leaked.length}`);
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
