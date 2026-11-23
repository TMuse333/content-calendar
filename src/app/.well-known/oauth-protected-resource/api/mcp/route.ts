/** RFC 9728 Protected Resource Metadata — points the MCP client at our AS. */
import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from "mcp-handler";
import { ISSUER } from "@/lib/oauth/provider";

const handler = protectedResourceHandler({
  authServerUrls: [ISSUER],
  resourceUrl: `${ISSUER}/api/mcp`,
});

export { handler as GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
