/** RFC 7591 Dynamic Client Registration — open, public clients, PKCE-only. */
import { NextRequest, NextResponse } from "next/server";
import { registerClient } from "@/lib/oauth/provider";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, mcp-protocol-version",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const client = await registerClient({ redirect_uris: body.redirect_uris, client_name: body.client_name });
    return NextResponse.json(
      {
        client_id: client.clientId,
        redirect_uris: client.redirectUris,
        client_name: client.name,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      },
      { status: 201, headers: CORS }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: err instanceof Error ? err.message : "bad request" },
      { status: 400, headers: CORS }
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
