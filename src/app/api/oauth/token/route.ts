/** OAuth token endpoint: authorization_code (PKCE) + rotating refresh_token. */
import { NextRequest, NextResponse } from "next/server";
import { redeemCode, redeemRefreshToken, signAccessToken, issueRefreshToken } from "@/lib/oauth/provider";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, mcp-protocol-version",
};

function err(code: string, description: string, status = 400) {
  return NextResponse.json({ error: code, error_description: description }, { status, headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    body = await req.json().catch(() => ({}));
  } else {
    body = Object.fromEntries((await req.formData()).entries()) as Record<string, string>;
  }

  const grant = body.grant_type;
  try {
    if (grant === "authorization_code") {
      if (!body.code || !body.client_id || !body.redirect_uri || !body.code_verifier) {
        return err("invalid_request", "code, client_id, redirect_uri and code_verifier are required");
      }
      const { scope } = await redeemCode(body.code, body.client_id, body.redirect_uri, body.code_verifier);
      const access = signAccessToken(body.client_id, scope);
      const refresh = await issueRefreshToken(body.client_id, scope);
      return NextResponse.json(
        { access_token: access.token, token_type: "Bearer", expires_in: access.expiresIn, refresh_token: refresh, scope },
        { headers: CORS }
      );
    }
    if (grant === "refresh_token") {
      if (!body.refresh_token || !body.client_id) return err("invalid_request", "refresh_token and client_id are required");
      const { scope } = await redeemRefreshToken(body.refresh_token, body.client_id);
      const access = signAccessToken(body.client_id, scope);
      const refresh = await issueRefreshToken(body.client_id, scope);
      return NextResponse.json(
        { access_token: access.token, token_type: "Bearer", expires_in: access.expiresIn, refresh_token: refresh, scope },
        { headers: CORS }
      );
    }
    return err("unsupported_grant_type", `grant_type "${grant}" not supported`);
  } catch (e) {
    return err("invalid_grant", e instanceof Error ? e.message : "grant failed");
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
