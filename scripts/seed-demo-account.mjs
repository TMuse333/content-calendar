/**
 * Seed script to create the Sam Rivers demo account
 *
 * Usage: node scripts/seed-demo-account.mjs
 */

import { MongoClient } from "mongodb";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const { MONGODB_URI } = process.env;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}

const account = {
  id: "demo",
  name: "Sam Rivers",
  handle: "@samrivers",
  campaigns: [],
  platforms: {
    instagram: {
      connected: false,
    },
  },
  notion: {
    postsDataSourceId: "collection://1c008d8f-d602-8240-b6c2-873a1e071c55",
    topicsDataSourceId: "collection://26008d8f-d602-8331-a9f3-077cee11e60b",
  },
  brand: {
    primaryColor: "#10b981",
    secondaryColor: "#6366f1",
  },
  driveFolderId: "demo-drive-folder",
  isDemo: true,
  agent: {
    displayName: "Sam",
    fullName: "Sam Rivers",
    title: "REALTOR®",
    brokerage: "Demo Realty",
    region: "the Greater Toronto Area",
    serviceAreas: [
      "toronto",
      "etobicoke",
      "north york",
      "scarborough",
      "markham",
      "mississauga",
      "vaughan",
      "richmond hill",
      "oakville",
      "brampton",
      "pickering",
      "ajax",
      "unionville",
      "downtown",
    ],
    timezone: "America/Toronto",
    notifyEmail: "sam@demo-realty.example",
    meeting: { minutes: 15, mode: "phone" },
    voiceNotes: "Friendly, plain-spoken, never salesy.",
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
      console.log("Updating Notion config, agent persona, and isDemo flag...");
      await collection.updateOne(
        { id: account.id },
        {
          $set: {
            notion: account.notion,
            driveFolderId: account.driveFolderId,
            isDemo: account.isDemo,
            agent: account.agent,
            updatedAt: new Date(),
          },
        }
      );
      console.log("Updated!");
    } else {
      await collection.insertOne(account);
      console.log("Created account:", account.id);
    }

    console.log("\nDemo account ready!");
    console.log("Client view URL: /account/demo/client-view");
  } finally {
    await client.close();
  }
}

seed().catch(console.error);
