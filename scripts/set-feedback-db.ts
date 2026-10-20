/**
 * Set an account's Notion Feedback data source (used by "Request changes").
 *
 * Only sets notion.feedbackDataSourceId — touches nothing else on the account
 * (safe to run on a live account with Instagram already connected).
 *
 * Usage:
 *   npx tsx scripts/set-feedback-db.ts <accountId> <collection://...>
 *   npx tsx scripts/set-feedback-db.ts greg-caseley   # uses Greg's Feedback DB
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Client-specific IDs live in scripts, never in app code.
const KNOWN: Record<string, string> = {
  "greg-caseley": "collection://b1a1e31b-1425-4f4e-a4bf-8b8541ef76de",
  demo: "collection://80708d8f-d602-8210-8e57-87ed220734d5",
};

async function main() {
  const [accountId, explicit] = process.argv.slice(2);
  const dataSourceId = explicit || KNOWN[accountId];
  if (!accountId || !dataSourceId?.startsWith("collection://")) {
    console.error("Usage: npx tsx scripts/set-feedback-db.ts <accountId> <collection://...>");
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
  }

  const client = await MongoClient.connect(uri);
  try {
    const res = await client
      .db("strategy")
      .collection("accounts")
      .updateOne(
        { id: accountId },
        { $set: { "notion.feedbackDataSourceId": dataSourceId, updatedAt: new Date() } }
      );
    if (res.matchedCount === 0) {
      console.error(`No account with id "${accountId}"`);
      process.exit(1);
    }
    console.log(`✓ ${accountId}: notion.feedbackDataSourceId = ${dataSourceId}`);
  } finally {
    await client.close();
  }
}

main();
