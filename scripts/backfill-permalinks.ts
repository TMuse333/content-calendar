/**
 * Backfill REAL Instagram permalinks over the synthetic media-id URLs the
 * sync used to store (instagram.com/p/<media-id>/ — not a working link, and
 * the Notion↔IG shortcode join can never match it).
 *
 *   npx tsx scripts/backfill-permalinks.ts [--account greg-caseley] [--write]
 *
 * Dry run by default: shows what would change. Touches `strategy.posts` and
 * `strategy-app.tracked_posts` where permalink matches the synthetic shape.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const SYNTHETIC = /instagram\.com\/p\/(\d{8,})\/?$/;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const write = process.argv.includes("--write");
  const accountId = arg("account") ?? "greg-caseley";

  const { getAccountById } = await import("../src/lib/mongodb/accounts");
  const clientPromise = (await import("../src/lib/mongodb/clientPromise")).default;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const account = (await getAccountById(accountId)) as any;
  const ig = account?.platforms?.instagram;
  if (!ig?.accessToken || !(ig?.userId || ig?.instagramId)) throw new Error(`No IG credentials on account "${accountId}"`);
  const host = ig.apiHost === "instagram" ? "https://graph.instagram.com" : "https://graph.facebook.com";

  const cache = new Map<string, string | null>();
  async function realPermalink(mediaId: string): Promise<string | null> {
    if (cache.has(mediaId)) return cache.get(mediaId)!;
    try {
      const res = await fetch(`${host}/${mediaId}?fields=permalink&access_token=${ig.accessToken}`);
      const data = (await res.json()) as { permalink?: string; error?: { message: string } };
      const value = typeof data.permalink === "string" && data.permalink ? data.permalink : null;
      if (!value && data.error) console.warn(`  ! ${mediaId}: ${data.error.message}`);
      cache.set(mediaId, value);
      return value;
    } catch (err) {
      console.warn(`  ! ${mediaId}: ${err instanceof Error ? err.message : err}`);
      cache.set(mediaId, null);
      return null;
    }
  }

  const client = await clientPromise;
  const targets = [
    { db: "strategy", coll: "posts" },
    { db: "strategy-app", coll: "tracked_posts" },
  ];

  let fixed = 0, dead = 0;
  for (const t of targets) {
    const coll = client.db(t.db).collection(t.coll);
    const docs = await coll.find({ accountId, permalink: { $regex: "instagram\\.com/p/\\d{8,}/?$" } }).toArray();
    console.log(`\n${t.db}.${t.coll}: ${docs.length} synthetic permalink(s)`);
    for (const doc of docs) {
      const mediaId = SYNTHETIC.exec(doc.permalink as string)?.[1] ?? (doc.instagramId as string);
      const real = await realPermalink(mediaId);
      if (!real) { dead++; console.log(`  – ${mediaId}: unresolvable (deleted post or token scope) — left as is`); continue; }
      console.log(`  ${write ? "✓" : "→"} ${mediaId} → ${real}`);
      if (write) await coll.updateOne({ _id: doc._id }, { $set: { permalink: real } });
      fixed++;
    }
  }
  console.log(`\n${write ? "Fixed" : "Would fix"} ${fixed} · unresolvable ${dead}${write ? "" : "\nRe-run with --write to apply."}`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
