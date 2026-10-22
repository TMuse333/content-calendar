/**
 * Connect Instagram via Business Login for Instagram (no Facebook Page needed).
 * GET /api/auth/instagram-login/connect?accountId=xxx[&source=client-view|onboard]
 */
import { NextRequest, NextResponse } from "next/server";
import { buildIgAuthorizeUrl, igLoginRedirectUri } from "@/lib/platforms/ig-login";

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("accountId");
  const source = request.nextUrl.searchParams.get("source");
  if (!accountId) return NextResponse.json({ error: "accountId is required" }, { status: 400 });

  const appId = process.env.IG_LOGIN_APP_ID;
  if (!appId || !process.env.IG_LOGIN_APP_SECRET) {
    return NextResponse.json({ error: "Instagram Login is not configured yet" }, { status: 500 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
  const state = Buffer.from(JSON.stringify({ accountId, source })).toString("base64url");
  return NextResponse.redirect(buildIgAuthorizeUrl({ appId, redirectUri: igLoginRedirectUri(baseUrl), state }));
}
