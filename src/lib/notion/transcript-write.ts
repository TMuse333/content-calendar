/**
 * Write a transcript as a child page under a Call row.
 *
 * The title MUST start with "Transcript — " — getCallTranscript() (calls.ts)
 * discovers the page by that prefix. Same write pattern as
 * scripts/push-transcript.ts (which stays for manual pushes).
 *
 * Transcripts live ONLY in page bodies, never in a database property.
 */
import { getNotionClient } from "./client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function writeTranscriptChildPage(
  callPageId: string,
  callName: string,
  transcript: string,
  client: AnyClient = getNotionClient()
): Promise<{ pageId: string; blocks: number }> {
  const lines = transcript
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const blocks = lines.map((l) => ({
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: { rich_text: [{ type: "text" as const, text: { content: l.slice(0, 1990) } }] },
  }));

  const page = await client.pages.create({
    parent: { type: "page_id", page_id: callPageId },
    properties: { title: { title: [{ text: { content: `Transcript — ${callName}`.slice(0, 200) } }] } },
    children: blocks.slice(0, 100),
  });
  for (let i = 100; i < blocks.length; i += 100) {
    await client.blocks.children.append({ block_id: page.id, children: blocks.slice(i, i + 100) });
  }
  return { pageId: page.id as string, blocks: blocks.length };
}
