/**
 * Notion Health Check
 *
 * Run with: npx tsx scripts/notion-health-check.ts [account-id]
 *
 * Verifies Notion connection for an account by:
 * 1. Loading the account from MongoDB
 * 2. Fetching Posts and Topics from Notion
 * 3. Printing counts and sample data
 *
 * Example:
 *   npx tsx scripts/notion-health-check.ts greg-caseley
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import type { StrategyAccount } from "../src/lib/types/account";
import { getPosts, getTopics, getPostsSummary } from "../src/lib/notion";
import type { NotionConfig } from "../src/lib/notion/types";

dotenv.config({ path: ".env.local" });

async function main() {
  const accountId = process.argv[2];

  if (!accountId) {
    console.error("Usage: npx tsx scripts/notion-health-check.ts <account-id>");
    console.error("Example: npx tsx scripts/notion-health-check.ts greg-caseley");
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
  }

  if (!process.env.NOTION_API_KEY) {
    console.error("NOTION_API_KEY not found in .env.local");
    process.exit(1);
  }

  console.log(`\n🔍 Notion Health Check for: ${accountId}\n`);
  console.log("─".repeat(50));

  // 1. Load account from MongoDB
  const client = await MongoClient.connect(mongoUri);
  const db = client.db("strategy");

  const account = (await db
    .collection("accounts")
    .findOne({ id: accountId })) as StrategyAccount | null;

  if (!account) {
    console.error(`❌ Account not found: ${accountId}`);
    await client.close();
    process.exit(1);
  }

  console.log(`✓ Account found: ${account.name}`);

  // 2. Check Notion config
  if (!account.notion?.postsDataSourceId || !account.notion?.topicsDataSourceId) {
    console.error("❌ Notion config missing or incomplete");
    console.error("   Expected: notion.postsDataSourceId and notion.topicsDataSourceId");
    console.error("   Got:", account.notion);
    await client.close();
    process.exit(1);
  }

  const notionConfig: NotionConfig = {
    postsDataSourceId: account.notion.postsDataSourceId,
    topicsDataSourceId: account.notion.topicsDataSourceId,
  };

  console.log("\n📋 Notion Config:");
  console.log(`   Posts:  ${notionConfig.postsDataSourceId}`);
  console.log(`   Topics: ${notionConfig.topicsDataSourceId}`);

  // 3. Fetch data from Notion
  console.log("\n🔄 Fetching from Notion...\n");

  try {
    // Fetch posts
    const posts = await getPosts(notionConfig);
    console.log(`✓ Posts: ${posts.length}`);

    // Fetch topics
    const topics = await getTopics(notionConfig);
    console.log(`✓ Topics: ${topics.length}`);

    // Get summary
    const summary = await getPostsSummary(notionConfig);

    // 4. Print summary
    console.log("\n📊 Posts by Status:");
    for (const [status, count] of Object.entries(summary.byStatus)) {
      if (count > 0) {
        console.log(`   ${status}: ${count}`);
      }
    }

    console.log("\n📊 Posts by Level:");
    for (const [level, count] of Object.entries(summary.byLevel)) {
      console.log(`   ${level}: ${count}`);
    }

    // Sample posts
    console.log("\n📝 Sample Posts (first 3):");
    for (const post of posts.slice(0, 3)) {
      console.log(`   - "${post.title}" [${post.status}]`);
    }

    // Sample topics
    console.log("\n🏷️  Sample Topics (first 3):");
    for (const topic of topics.slice(0, 3)) {
      console.log(`   - "${topic.title}" [${topic.status}]`);
    }

    console.log("\n─".repeat(50));
    console.log("✓ Health check passed!");
    console.log(`  Total Posts: ${posts.length}`);
    console.log(`  Total Topics: ${topics.length}`);
    console.log(`  Ready for Review: ${summary.readyForReview}`);
    console.log(`  Published: ${summary.published}`);
  } catch (error) {
    console.error("❌ Failed to fetch from Notion:");
    console.error(error);
    await client.close();
    process.exit(1);
  }

  await client.close();
}

main().catch(console.error);
