/**
 * MCP v0 endpoint (read-only) — Streamable HTTP at /api/mcp/<secret>.
 *
 * Auth: the secret lives in the URL because claude.ai custom connectors
 * support only OAuth-or-nothing (no bearer header field). The path segment
 * acts as the bearer token: compare against MCP_READ_SECRET and 404 on
 * mismatch (404, not 401, so the endpoint's existence isn't advertised).
 * Rotate by changing the env var and updating the connector URL.
 *
 * Tools are registered in lib/mcp/tools.ts — read-only by contract.
 */
import { createMcpHandler } from "mcp-handler";
import { timingSafeEqual } from "crypto";
import { registerReadTools } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const handler = createMcpHandler(registerReadTools, {
  serverInfo: { name: "strategy-app", version: "0.1.0" },
});

function secretOk(given: string): boolean {
  const expected = process.env.MCP_READ_SECRET;
  if (!expected || expected.length < 20) return false; // unset/weak → endpoint off
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function guarded(
  req: Request,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;
  if (!secretOk(secret)) return new Response("Not found", { status: 404 });
  return handler(req);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
