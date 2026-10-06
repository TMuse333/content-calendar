/**
 * Instagram OAuth Callback
 *
 * Handles the redirect from Facebook OAuth:
 * 1. Exchanges code for short-lived token
 * 2. Exchanges for long-lived token (60 days)
 * 3. Gets Instagram Business Account ID
 * 4. Stores credentials in the account document
 */

import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

interface InstagramAccount {
  id: string;
  username?: string;
}

interface FacebookPage {
  id: string;
  name: string;
  instagram_business_account?: InstagramAccount;
  access_token: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(errorDescription || error)}`, request.nextUrl.origin)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings?error=Missing+code+or+state", request.nextUrl.origin)
    );
  }

  // Decode state to get accountId, optional targetUsername, and source
  let accountId: string;
  let targetUsername: string | undefined;
  let source: string | undefined;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64").toString());
    accountId = decoded.accountId;
    targetUsername = decoded.targetUsername;
    source = decoded.source;
  } catch {
    return NextResponse.redirect(
      new URL("/settings?error=Invalid+state", request.nextUrl.origin)
    );
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const mongoUri = process.env.MONGODB_URI;

  if (!appId || !appSecret) {
    return NextResponse.redirect(
      new URL("/settings?error=App+credentials+not+configured", request.nextUrl.origin)
    );
  }

  if (!mongoUri) {
    return NextResponse.redirect(
      new URL("/settings?error=Database+not+configured", request.nextUrl.origin)
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  try {
    // Step 1: Exchange code for short-lived token
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData: FacebookTokenResponse = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token exchange error:", tokenData.error);
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(tokenData.error.message)}`, request.nextUrl.origin)
      );
    }

    const shortLivedToken = tokenData.access_token;

    // Step 2: Exchange for long-lived token (60 days)
    const longLivedUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", appId);
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString());
    const longLivedData: FacebookTokenResponse = await longLivedRes.json();

    if (longLivedData.error) {
      console.error("Long-lived token error:", longLivedData.error);
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(longLivedData.error.message)}`, request.nextUrl.origin)
      );
    }

    const longLivedToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in || 5184000; // Default 60 days

    // Step 3: Get user's Facebook Pages with Instagram Business Accounts
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,username},access_token&access_token=${longLivedToken}`
    );
    const pagesData: { data?: FacebookPage[]; error?: { message: string } } = await pagesRes.json();

    if (pagesData.error) {
      console.error("Pages fetch error:", pagesData.error);
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(pagesData.error.message)}`, request.nextUrl.origin)
      );
    }

    // Get all pages with Instagram Business Accounts
    const pagesWithInstagram = pagesData.data?.filter(
      (page) => page.instagram_business_account?.id
    ) || [];

    if (pagesWithInstagram.length === 0) {
      return NextResponse.redirect(
        new URL(
          "/settings?error=No+Instagram+Business+Account+found.+Make+sure+your+Instagram+is+connected+to+a+Facebook+Page.",
          request.nextUrl.origin
        )
      );
    }

    // Check if account already has an Instagram userId - try to match it
    const client = await MongoClient.connect(mongoUri);
    const db = client.db("strategy");
    const existingAccount = await db.collection("accounts").findOne({ id: accountId });
    const existingUserId = existingAccount?.platforms?.instagram?.userId;

    let pageWithInstagram: FacebookPage | undefined;

    // Priority 1: Match by targetUsername if provided
    if (targetUsername) {
      pageWithInstagram = pagesWithInstagram.find(
        (page) => page.instagram_business_account?.username === targetUsername
      );
    }

    // Priority 2: Match by existing userId
    if (!pageWithInstagram && existingUserId) {
      pageWithInstagram = pagesWithInstagram.find(
        (page) => page.instagram_business_account?.id === existingUserId
      );
    }

    // If no match found and multiple accounts, redirect to selector
    if (!pageWithInstagram && pagesWithInstagram.length > 1) {
      // Build links for each account
      const accountLinks = pagesWithInstagram
        .map((p) => p.instagram_business_account?.username)
        .filter(Boolean);

      await client.close();
      return NextResponse.redirect(
        new URL(
          `/account/${accountId}/settings?select_instagram=${encodeURIComponent(accountLinks.join(","))}`,
          request.nextUrl.origin
        )
      );
    }

    // Use first/only account if no existing match
    if (!pageWithInstagram) {
      pageWithInstagram = pagesWithInstagram[0];
    }

    const instagramAccount = pageWithInstagram.instagram_business_account!;
    const pageAccessToken = pageWithInstagram.access_token;

    // Step 4: Get a long-lived page access token (these don't expire for pages you manage)
    // The page access token from /me/accounts when using a long-lived user token is already long-lived

    // Step 5: Store in MongoDB (client already connected above)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresIn * 1000);

    await db.collection("accounts").updateOne(
      { id: accountId },
      {
        $set: {
          "platforms.instagram": {
            connected: true,
            accessToken: pageAccessToken, // Use page token - longer lived
            userId: instagramAccount.id,
            username: instagramAccount.username,
            facebookPageId: pageWithInstagram.id,
            facebookPageName: pageWithInstagram.name,
            userAccessToken: longLivedToken, // Keep user token for refresh
            connectedAt: now,
            expiresAt: expiresAt,
          },
          updatedAt: now,
        },
      }
    );

    await client.close();

    // Redirect to success - back to onboarding page if source is "onboard"
    const redirectPath = source === "onboard"
      ? `/onboard/${accountId}?instagram=connected&username=${instagramAccount.username}`
      : `/account/${accountId}/settings?instagram=connected&username=${instagramAccount.username}`;

    const successUrl = new URL(redirectPath, request.nextUrl.origin);

    return NextResponse.redirect(successUrl.toString());
  } catch (err) {
    console.error("OAuth callback error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(message)}`, request.nextUrl.origin)
    );
  }
}
