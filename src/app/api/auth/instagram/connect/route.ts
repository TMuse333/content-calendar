/**
 * Instagram OAuth Connect
 *
 * Redirects user to Facebook/Instagram OAuth screen.
 * Pass ?accountId=xxx to associate the connection with a specific account.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const targetUsername = searchParams.get("username"); // Optional: specify which IG account
  const source = searchParams.get("source"); // Optional: "onboard" to redirect back to onboarding

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "INSTAGRAM_APP_ID not configured" }, { status: 500 });
  }

  // Build redirect URI
  const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  // Permissions needed for insights, account info, and content publishing
  const scopes = [
    "instagram_basic",
    "instagram_manage_insights",
    "instagram_content_publish",  // Required for posting
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",  // Required for posting via page
    "business_management",
  ].join(",");

  // Store accountId, optional username, and source in state param to retrieve after callback
  const state = Buffer.from(JSON.stringify({ accountId, targetUsername, source })).toString("base64");

  // Facebook OAuth URL
  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}
