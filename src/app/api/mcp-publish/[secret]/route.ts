/**
 * MCP publish endpoint — Streamable HTTP at /api/mcp-publish/<PUBLISH_SECRET>.
 *
 * Separate from the read-only /api/mcp/<MCP_READ_SECRET> connector on purpose:
 * that URL can never post. This one can, so it's keyed on PUBLISH_SECRET (the
 * same secret that guards the manual publish button) — no new env vars.
 * 404 on mismatch so the endpoint's existence isn't advertised.
 *
 * Tools: lib/mcp/publish-tools.ts (list_publishable, preview_post, publish_post).
 */
import { createMcpHandler } from "mcp-handler";
import { timingSafeEqual } from "crypto";
import { registerPublishTools } from "@/lib/mcp/publish-tools";
import { registerStageTools } from "@/lib/mcp/stage-tools";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // slide conversion + IG container processing

const handler = createMcpHandler(
  (server) => {
    registerPublishTools(server);
    registerStageTools(server); // inbox → stage → share link → schedule
  },
  { serverInfo: { name: "strategy-app-publish", version: "0.1.0" } }
);

function secretOk(given: string): boolean {
  const expected = process.env.PUBLISH_SECRET;
  if (!expected || expected.length < 20) return false; // unset/weak → endpoint off
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function guarded(req: Request, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  if (!secretOk(secret)) return new Response("Not found", { status: 404 });
  return handler(req);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
