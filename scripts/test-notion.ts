import { Client } from "@notionhq/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  console.log("NOTION_API_KEY exists:", !!process.env.NOTION_API_KEY);
  console.log("API Key prefix:", process.env.NOTION_API_KEY?.substring(0, 10) + "...");

  console.log("\nClient type:", typeof Client);
  const notion = new Client({ auth: process.env.NOTION_API_KEY });

  console.log("notion object keys:", Object.keys(notion));
  console.log("notion.dataSources:", (notion as any).dataSources);
  if ((notion as any).dataSources) {
    console.log("dataSources keys:", Object.keys((notion as any).dataSources));
  }

  // Demo account Posts database ID (without collection:// prefix)
  const databaseId = "1c008d8fd6028240b6c2873a1e071c55";

  console.log("\nQuerying dataSource:", databaseId);

  try {
    const response = await (notion as any).dataSources.query({
      data_source_id: databaseId,
    });

    console.log("\nFound", response.results.length, "posts");

    // Show first post's properties to understand schema
    if (response.results.length > 0) {
      const first = response.results[0] as any;
      console.log("\nFirst post property keys:", Object.keys(first.properties || {}));

      // Show property types
      for (const [key, val] of Object.entries(first.properties || {})) {
        const v = val as any;
        console.log(`  ${key}: ${v.type}`);
      }
    }

    // Check actual Status structure
    if (response.results.length > 0) {
      const first = response.results[0] as any;
      console.log("\nStatus property structure:", JSON.stringify(first.properties.Status, null, 2));
    }

    console.log("\nAll posts:");
    const statusCounts: Record<string, number> = {};
    for (const page of response.results) {
      const p = page as any;
      const title = p.properties?.Post?.title?.[0]?.plain_text || p.properties?.Name?.title?.[0]?.plain_text || "No title";
      // Status is type 'status', not 'select'
      const status = p.properties?.Status?.status?.name || "No status";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      console.log("  -", title, "[" + status + "]");
    }
    console.log("\nStatus counts:", statusCounts);
  } catch (err: any) {
    console.error("Error:", err.message);
    if (err.code) console.error("Code:", err.code);
    if (err.body) console.error("Body:", JSON.stringify(err.body, null, 2));
  }
}

main();
