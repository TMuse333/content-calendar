/**
 * Instagram Token Refresh
 *
 * Refreshes long-lived tokens before they expire.
 * Can be called:
 * - Manually: POST /api/auth/instagram/refresh?accountId=xxx
 * - Cron job: POST /api/auth/instagram/refresh (refreshes all expiring soon)
 *
 * Long-lived tokens can be refreshed as long as they haven't expired.
 * Best practice: refresh when 7+ days remain.
 */

import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

interface RefreshResult {
  accountId: string;
  success: boolean;
  error?: string;
  newExpiresAt?: Date;
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const specificAccountId = searchParams.get("accountId");

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const mongoUri = process.env.MONGODB_URI;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "App credentials not configured" },
      { status: 500 }
    );
  }

  if (!mongoUri) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  const client = await MongoClient.connect(mongoUri);
  const db = client.db("strategy");

  try {
    // Find accounts to refresh
    const query: Record<string, unknown> = {
      "platforms.instagram.connected": true,
      "platforms.instagram.userAccessToken": { $exists: true },
    };

    if (specificAccountId) {
      query.id = specificAccountId;
    } else {
      // Only refresh tokens expiring in next 7 days
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      query["platforms.instagram.expiresAt"] = { $lt: sevenDaysFromNow };
    }

    const accounts = await db.collection("accounts").find(query).toArray();

    if (accounts.length === 0) {
      await client.close();
      return NextResponse.json({
        message: specificAccountId
          ? "Account not found or no Instagram connection"
          : "No tokens need refreshing",
        refreshed: 0,
      });
    }

    const results: RefreshResult[] = [];

    for (const account of accounts) {
      const instagram = account.platforms?.instagram;
      if (!instagram?.userAccessToken) continue;

      try {
        // Refresh the long-lived user token
        const refreshUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
        refreshUrl.searchParams.set("grant_type", "fb_exchange_token");
        refreshUrl.searchParams.set("client_id", appId);
        refreshUrl.searchParams.set("client_secret", appSecret);
        refreshUrl.searchParams.set("fb_exchange_token", instagram.userAccessToken);

        const refreshRes = await fetch(refreshUrl.toString());
        const refreshData = await refreshRes.json();

        if (refreshData.error) {
          results.push({
            accountId: account.id,
            success: false,
            error: refreshData.error.message,
          });
          continue;
        }

        const newToken = refreshData.access_token;
        const expiresIn = refreshData.expires_in || 5184000;
        const now = new Date();
        const newExpiresAt = new Date(now.getTime() + expiresIn * 1000);

        // Get new page access token
        const pagesRes = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?fields=id,access_token,instagram_business_account&access_token=${newToken}`
        );
        const pagesData = await pagesRes.json();

        const page = pagesData.data?.find(
          (p: { instagram_business_account?: { id: string } }) =>
            p.instagram_business_account?.id === instagram.userId
        );

        const newPageToken = page?.access_token || instagram.accessToken;

        // Update the account
        await db.collection("accounts").updateOne(
          { id: account.id },
          {
            $set: {
              "platforms.instagram.accessToken": newPageToken,
              "platforms.instagram.userAccessToken": newToken,
              "platforms.instagram.expiresAt": newExpiresAt,
              "platforms.instagram.lastRefreshedAt": now,
              updatedAt: now,
            },
          }
        );

        results.push({
          accountId: account.id,
          success: true,
          newExpiresAt,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        results.push({
          accountId: account.id,
          success: false,
          error: message,
        });
      }
    }

    await client.close();

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      message: `Refreshed ${successCount}/${results.length} tokens`,
      refreshed: successCount,
      results,
    });
  } catch (err) {
    await client.close();
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Also support GET for easy manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
