/**
 * Seed Greg Caseley's account with Notion integration
 *
 * Run with: npx tsx scripts/seed-greg.ts
 *
 * This creates/updates Greg's account with:
 * - Basic account info
 * - Notion config pointing to his Content Hub databases
 *
 * Greg's Notion data source IDs (from his Content Hub):
 * - Posts: collection://09d0f481-0d99-4e07-a65d-685ac13c4304
 * - Topics: collection://7204330d-841d-45ea-bda0-2d7b1cc491f8
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import type { StrategyAccount } from "../src/lib/types/account";

dotenv.config({ path: ".env.local" });

// Greg's Notion data source IDs from his Waterline page
const GREG_NOTION_CONFIG = {
  postsDataSourceId: "collection://09d0f481-0d99-4e07-a65d-685ac13c4304",
  topicsDataSourceId: "collection://7204330d-841d-45ea-bda0-2d7b1cc491f8",
  // Waterline situation-tree model (explicit overrides; readers also discover by title)
  treeDataSourceId: "collection://0c99ea02-46b2-4002-9994-953cce6163bf",
  storiesDataSourceId: "collection://c0d322e6-d700-4494-9189-5734e7116117",
  callsDataSourceId: "collection://5b5284d1-bcab-49a3-804a-462fdefc3207",
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
  }

  const client = await MongoClient.connect(uri);
  const db = client.db("strategy");

  console.log("Seeding Greg Caseley's account...\n");

  // Build the account document
  const accountData: Omit<StrategyAccount, "_id"> = {
    id: "greg-caseley",
    name: "Greg Caseley",
    handle: "@gregcaseley",
    email: "greg@example.com",

    // Notion integration - where strategy lives
    notion: GREG_NOTION_CONFIG,

    // Primary niche (strongest edge) — the tree node consumers prioritise
    primaryNiche: "Moving here from away",

    // Platform connections (to be set up via Instagram OAuth)
    platforms: {},

    // Branding
    brand: {
      primaryColor: "#1a365d",
      secondaryColor: "#2d3748",
    },

    // Status
    status: "active",
    isActive: true,
    createdAt: new Date("2026-08-01"),
    updatedAt: new Date(),
  };

  // Upsert the account
  const result = await db.collection("accounts").updateOne(
    { id: "greg-caseley" },
    { $set: accountData },
    { upsert: true }
  );

  if (result.upsertedCount > 0) {
    console.log("✓ Created account: greg-caseley");
  } else {
    console.log("✓ Updated account: greg-caseley");
  }

  // Display config
  console.log("\nNotion Config:");
  console.log(`  Posts:  ${GREG_NOTION_CONFIG.postsDataSourceId}`);
  console.log(`  Topics: ${GREG_NOTION_CONFIG.topicsDataSourceId}`);

  console.log("\n✓ Done! Greg's account is ready.");
  console.log("\n📱 Onboard link (send to Greg):");
  console.log("   http://localhost:3000/onboard/greg-caseley");
  console.log("\n👤 Admin view:");
  console.log("   http://localhost:3000/account/greg-caseley");

  await client.close();
}

main().catch(console.error);
