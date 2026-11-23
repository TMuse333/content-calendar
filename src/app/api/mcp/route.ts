/**
 * The strategy-app MCP — OAuth edition. Connector URL is simply:
 *
 *     https://strategy.syntellic.ai/api/mcp
 *
 * No secrets in the URL: claude.ai discovers our OAuth server via the
 * 401 + WWW-Authenticate → /.well-known metadata, registers itself (DCR),
 * sends Thomas to /oauth/authorize (passphrase + access level), and then
 * calls here with short-lived Bearer JWTs. Token scope picks the tier:
 *
 *     scope "read"    → 5 read-only tools
 *     scope "publish" → all 12 (read + stage + share + schedule + publish)
 *
 * The legacy secret-in-URL routes (/api/mcp/<secret>, /api/mcp-publish/…)
 * still work during the transition; retire them by rotating their secrets.
 */
import { createMcpHandler } from "mcp-handler";
import { registerReadTools } from "@/lib/mcp/tools";
import { registerPublishTools } from "@/lib/mcp/publish-tools";
import { registerStageTools } from "@/lib/mcp/stage-tools";
import { verifyAccessToken, ISSUER } from "@/lib/oauth/provider";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const readHandler = createMcpHandler(registerReadTools, {
  serverInfo: { name: "strategy-app", version: "1.0.0" },
});
const fullHandler = createMcpHandler(
  (server) => {
    registerReadTools(server);
    registerPublishTools(server);
    registerStageTools(server);
  },
  { serverInfo: { name: "strategy-app", version: "1.0.0" } }
);

function unauthorized(detail: string) {
  return new Response(JSON.stringify({ error: "unauthorized", error_description: detail }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      // RFC 9728: tells the MCP client where to find our auth metadata.
      "WWW-Authenticate": `Bearer resource_metadata="${ISSUER}/.well-known/oauth-protected-resource"`,
    },
  });
}

async function guarded(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return unauthorized("Missing bearer token");
  const info = verifyAccessToken(token);
  if (!info) return unauthorized("Invalid or expired token");
  return info.scope === "publish" ? fullHandler(req) : readHandler(req);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
