import { config } from "dotenv";
import { MongoClient } from "mongodb";

config({ path: ".env.local" });

const token = process.env.TEMP_TOKEN;

if (!token) {
  console.log("TEMP_TOKEN not found in .env.local");
  process.exit(1);
}

const res = await fetch(
  `https://graph.facebook.com/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${token}`
);
const data = await res.json();

console.log("Pages found:", data.data?.length || 0);

if (!data.data || data.data.length === 0) {
  console.log("No pages found or error:", JSON.stringify(data, null, 2));
  process.exit(1);
}

// Map page names to account IDs
const pageToAccount = {
  "Thomas musiał": "thomas-musial",
  "Thomas Musial": "thomas-musial",
  "Syntellic": "syntellic",
};

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db("strategy");

for (const page of data.data) {
  console.log("---");
  console.log("Page:", page.name);
  console.log("Instagram:", page.instagram_business_account?.username || "Not linked");
  console.log("IG ID:", page.instagram_business_account?.id || "N/A");

  const accountId = pageToAccount[page.name];
  if (accountId && page.instagram_business_account) {
    const result = await db.collection("accounts").updateOne(
      { id: accountId },
      {
        $set: {
          "platforms.instagram": {
            connected: true,
            userId: page.instagram_business_account.id,
            accessToken: page.access_token,
            username: page.instagram_business_account.username,
            connectedAt: new Date(),
          },
          updatedAt: new Date(),
        },
      }
    );
    console.log(`  -> Updated ${accountId}:`, result.modifiedCount > 0 ? "success" : "no changes");
  }
}

await client.close();
console.log("\nDone!");
