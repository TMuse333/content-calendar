/**
 * Seed Greg's content items for the review portal
 *
 * Run with: npx tsx scripts/seed-greg-content-items.ts
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ACCOUNT_ID = "greg-caseley";

// Greg's content items based on the inventory
const CONTENT_ITEMS = [
  // Carousels (8 in package)
  {
    type: "carousel",
    subtype: "education",
    topic: "Under $400K in PEI",
    status: "draft",
    plannedDate: new Date("2026-10-18"),
    notes: "Affordable properties in PEI - waiting on current listings data",
  },
  {
    type: "carousel",
    subtype: "education",
    topic: "Moving from Ontario to PEI",
    status: "draft",
    plannedDate: new Date("2026-10-21"),
    notes: "Guide for Ontario buyers relocating",
  },
  {
    type: "carousel",
    subtype: "education",
    topic: "Land from $39K",
    status: "draft",
    plannedDate: new Date("2026-10-24"),
    notes: "Affordable land/lot opportunities",
  },
  {
    type: "carousel",
    subtype: "market-pulse",
    topic: "Stratford Home Value",
    status: "draft",
    plannedDate: new Date("2026-10-28"),
    notes: "Waiting on Greg to confirm avg home value numbers",
  },
  {
    type: "carousel",
    subtype: "other",
    topic: "Sold Story",
    status: "draft",
    plannedDate: new Date("2026-11-01"),
    notes: "Need: real sold story (client name, situation, outcome)",
  },
  {
    type: "carousel",
    subtype: "education",
    topic: "Cottage ROI",
    status: "draft",
    plannedDate: new Date("2026-11-04"),
    notes: "Rental income potential for cottages",
  },
  {
    type: "carousel",
    subtype: "education",
    topic: "PEI Winter",
    status: "draft",
    plannedDate: new Date("2026-11-07"),
    notes: "What to expect buying/selling in winter",
  },
  {
    type: "carousel",
    subtype: "other",
    topic: "A Day with Greg",
    status: "draft",
    plannedDate: new Date("2026-11-11"),
    notes: "Behind-the-scenes / personal content",
  },

  // Listing Graphics (16 in package, 1 done)
  {
    type: "listing-graphic",
    subtype: "just-listed",
    topic: "Lot 2 Beairsto Lane",
    status: "posted",
    postedDate: new Date("2026-10-10"),
    notes: "First graphic delivered",
  },

  // Videos (2 bonus)
  {
    type: "video",
    subtype: "reel",
    topic: "Lot 2 Beairsto Lane Reel",
    status: "draft",
    plannedDate: new Date("2026-10-15"),
    notes: "Listing video reel",
  },
  {
    type: "video",
    subtype: "reel",
    topic: "Moving from Ontario Reel",
    status: "draft",
    plannedDate: new Date("2026-10-22"),
    notes: "Educational reel for Ontario buyers",
  },
];

// Greg's checklist items
const CHECKLIST = [
  { id: "sold-story", text: "A real sold story (client name, situation, outcome)", completed: false },
  { id: "listing-photos", text: "5-10 listing photos for upcoming graphics", completed: false },
  { id: "stratford-value", text: "Confirm: Stratford avg home value for carousel", completed: false },
  { id: "headshot", text: "High-res headshot for final slides", completed: false },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
  }

  const client = await MongoClient.connect(uri);
  const db = client.db("strategy");

  console.log("Seeding Greg's content items...\n");

  // Check if account exists
  const account = await db.collection("accounts").findOne({ id: ACCOUNT_ID });
  if (!account) {
    console.error(`Account "${ACCOUNT_ID}" not found. Create it first.`);
    await client.close();
    process.exit(1);
  }

  console.log(`Found account: ${account.name}\n`);

  // Update account with package limits and checklist
  await db.collection("accounts").updateOne(
    { id: ACCOUNT_ID },
    {
      $set: {
        package: {
          carousels: 8,
          graphics: 16,
          videos: 0, // bonus, not counted
        },
        billing: {
          status: "unpaid",
        },
        "reviewPortal.checklist": CHECKLIST,
        updatedAt: new Date(),
      },
    }
  );
  console.log("✓ Updated account with package limits and checklist\n");

  // Clear existing content items for this account
  const deleteResult = await db.collection("content_items").deleteMany({ accountId: ACCOUNT_ID });
  console.log(`✓ Cleared ${deleteResult.deletedCount} existing content items\n`);

  // Insert new content items
  const now = new Date();
  const itemsToInsert = CONTENT_ITEMS.map((item) => ({
    ...item,
    accountId: ACCOUNT_ID,
    createdAt: now,
    updatedAt: now,
  }));

  const insertResult = await db.collection("content_items").insertMany(itemsToInsert);
  console.log(`✓ Inserted ${insertResult.insertedCount} content items\n`);

  // Summary
  console.log("=".repeat(50));
  console.log("SUMMARY");
  console.log("=".repeat(50));
  console.log(`Account: ${account.name}`);
  console.log(`Package: 8 carousels, 16 graphics, bonus videos`);
  console.log(`Content items created: ${insertResult.insertedCount}`);
  console.log(`  - Carousels: 8 (all draft)`);
  console.log(`  - Listing Graphics: 1 (posted)`);
  console.log(`  - Videos: 2 (draft)`);
  console.log(`\nChecklist items: ${CHECKLIST.length}`);
  console.log(`\nNext steps:`);
  console.log(`1. Generate review token: POST /api/accounts/${ACCOUNT_ID}/review-token`);
  console.log(`2. Send Greg the review link`);
  console.log(`3. Upload previews to Drive, paste URLs into content items`);
  console.log(`4. Update item status to "preview-sent"`);

  await client.close();
}

main().catch(console.error);
