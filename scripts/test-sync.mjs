import { config } from "dotenv";
import { MongoClient } from "mongodb";

config({ path: ".env.local" });

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db("strategy");
const account = await db.collection("accounts").findOne({ id: "syntellic" });

console.log("Instagram config:", {
  connected: account?.platforms?.instagram?.connected,
  userId: account?.platforms?.instagram?.userId,
  hasToken: !!account?.platforms?.instagram?.accessToken,
});

const ig = account.platforms.instagram;
const res = await fetch(
  `https://graph.facebook.com/${ig.userId}/media?fields=id,caption,media_type,media_product_type,thumbnail_url,media_url,timestamp,like_count,comments_count&access_token=${ig.accessToken}&limit=5`
);
const data = await res.json();
console.log("Instagram API response:", JSON.stringify(data, null, 2));

await client.close();

// Test insights for first post
const firstPost = data.data[0];
console.log("\nTesting insights for post:", firstPost.id);
const isReel = firstPost.media_product_type === "REELS";
const metrics = isReel ? "reach,views,likes,comments,shares,saved" : "impressions,reach,saved";
const insightsRes = await fetch(
  `https://graph.facebook.com/${firstPost.id}/insights?metric=${metrics}&access_token=${ig.accessToken}`
);
const insightsData = await insightsRes.json();
console.log("Insights response:", JSON.stringify(insightsData, null, 2));
