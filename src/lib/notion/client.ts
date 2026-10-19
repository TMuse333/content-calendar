/**
 * Notion Client
 *
 * Singleton client for Notion API access.
 * Used for reading strategy content (Posts, Topics, Patterns)
 * and writing reports back to Notion.
 */

import { Client } from "@notionhq/client";

let notionClient: InstanceType<typeof Client> | null = null;

export function getNotionClient(): InstanceType<typeof Client> {
  if (!notionClient) {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error("NOTION_API_KEY is not set in environment");
    }
    notionClient = new Client({ auth: apiKey });
  }
  return notionClient;
}

// Re-export for convenience
export { Client };
