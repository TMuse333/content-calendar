/**
 * The strategy-app MCP — ONE endpoint, tiered by key: /api/mcp/<secret>.
 *
 *   secret = MCP_READ_SECRET  → 5 read-only tools (metrics, tree, calls…)
 *   secret = PUBLISH_SECRET   → those PLUS staging & publishing (12 tools):
 *                               stage_carousel, create_share_link,
 *                               schedule_post, publish_post, …
 *
 * So Thomas connects claude.ai once (full key) and new capabilities just
 * appear; the read-only URL stays a safe thing to wire anywhere else.
 * /api/mcp-publish/<secret> remains as an alias for the full tier.
 *
 * Auth: the secret lives in the URL because claude.ai custom connectors
 * support only OAuth-or-nothing. 404 on mismatch so the endpoint's existence
 * isn't advertised. Rotate = change env var + update the connector URL.
 */
import { createMcpHandler } from "mcp-handler";
import { timingSafeEqual } from "crypto";
import { registerReadTools } from "@/lib/mcp/tools";
import { registerPublishTools } from "@/lib/mcp/publish-tools";
import { registerStageTools } from "@/lib/mcp/stage-tools";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // staging/publishing: zip + IG container time

const readHandler = createMcpHandler(registerReadTools, {
  serverInfo: { name: "strategy-app", version: "0.2.0" },
});

const fullHandler = createMcpHandler(
  (server) => {
    registerReadTools(server);
    registerPublishTools(server);
    registerStageTools(server);
  },
  { serverInfo: { name: "strategy-app", version: "0.2.0" } }
);

function matches(given: string, expected: string | undefined): boolean {
  if (!expected || expected.length < 20) return false; // unset/weak → tier off
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function guarded(
  req: Request,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;
  if (matches(secret, process.env.PUBLISH_SECRET)) return fullHandler(req);
  if (matches(secret, process.env.MCP_READ_SECRET)) return readHandler(req);
  return new Response("Not found", { status: 404 });
}

export { guarded as GET, guarded as POST, guarded as DELETE };
