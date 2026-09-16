/**
 * Seed script to create your account with Instagram credentials
 *
 * Usage: node scripts/seed-account.mjs
 */

import { MongoClient } from "mongodb";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const { MONGODB_URI, INSTAGRAM_ID, INSTAGRAM_ACCESS_TOKEN } = process.env;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}

if (!INSTAGRAM_ID || !INSTAGRAM_ACCESS_TOKEN) {
  console.error("Missing INSTAGRAM_ID or INSTAGRAM_ACCESS_TOKEN in .env.local");
  process.exit(1);
}

const account = {
  id: "thomas-musial",
  name: "Thomas Musial",
  handle: "@thomasmusial",
  campaigns: [],
  platforms: {
    instagram: {
      connected: true,
      userId: INSTAGRAM_ID,
      accessToken: INSTAGRAM_ACCESS_TOKEN,
      connectedAt: new Date(),
    },
  },
  brand: {
    primaryColor: "#06b6d4",
    secondaryColor: "#8b5cf6",
  },
  status: "active",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function seed() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db("strategy");
    const collection = db.collection("accounts");

    // Check if already exists
    const existing = await collection.findOne({ id: account.id });
    if (existing) {
      console.log("Account already exists:", account.id);
      console.log("Updating Instagram credentials...");
      await collection.updateOne(
        { id: account.id },
        {
          $set: {
            "platforms.instagram": account.platforms.instagram,
            updatedAt: new Date(),
          }
        }
      );
      console.log("Updated!");
    } else {
      await collection.insertOne(account);
      console.log("Created account:", account.id);
    }
  } finally {
    await client.close();
  }
}

seed().catch(console.error);
