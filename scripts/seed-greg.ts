/**
 * Seed Greg Caseley's account and announcement package
 *
 * Run with: npx tsx scripts/seed-greg.ts
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import { randomUUID } from "crypto";

dotenv.config({ path: ".env.local" });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
  }

  const client = await MongoClient.connect(uri);
  const db = client.db("strategy");

  console.log("Seeding Greg Caseley...\n");

  // 1. Create or update Greg's account
  const accountData = {
    id: "greg-caseley",
    name: "Greg Caseley",
    type: "client",
    brokerage: "RE/MAX Harbourside",
    location: "PEI",
    createdAt: new Date("2026-08-01"),
    updatedAt: new Date(),
  };

  const existingAccount = await db.collection("accounts").findOne({ id: "greg-caseley" });
  if (existingAccount) {
    await db.collection("accounts").updateOne(
      { id: "greg-caseley" },
      { $set: { ...accountData, updatedAt: new Date() } }
    );
    console.log("✓ Updated account: greg-caseley");
  } else {
    await db.collection("accounts").insertOne(accountData);
    console.log("✓ Created account: greg-caseley");
  }

  // 2. Create announcement package
  const packageData = {
    id: randomUUID(),
    accountId: "greg-caseley",
    name: "Announcement Package #1",
    type: "announcements",
    status: "active",
    allocation: 16,
    used: 14,
    price: 540,
    createdAt: new Date("2026-08-01"),
    updatedAt: new Date(),
  };

  // Check if package already exists
  const existingPackage = await db.collection("graphic_packages").findOne({
    accountId: "greg-caseley",
    name: "Announcement Package #1",
  });

  if (existingPackage) {
    console.log("✓ Package already exists, skipping");
  } else {
    await db.collection("graphic_packages").insertOne(packageData);
    console.log("✓ Created package: Announcement Package #1");
    console.log(`  - Allocation: ${packageData.allocation}`);
    console.log(`  - Used: ${packageData.used}`);
    console.log(`  - Remaining: ${packageData.allocation - packageData.used}`);
    console.log(`  - Price: $${packageData.price}`);
  }

  console.log("\n✓ Done! Greg's account is ready.");
  console.log("\nView at: http://localhost:3000/account/greg-caseley/graphics");

  await client.close();
}

main().catch(console.error);
