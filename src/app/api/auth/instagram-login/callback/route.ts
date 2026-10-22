/**
 * Business Login for Instagram callback: code → long-lived token → save on the
 * account (apiHost "instagram") → capture baseline after redirect.
 */
import { NextRequest, NextResponse, after } from "next/server";
import { MongoClient } from "mongodb";
import { captureBaseline, type BaselineDb } from "@/lib/baseline/capture";
import { exchangeIgLoginCode, igLoginRedirectUri } from "@/lib/platforms/ig-login";

export const maxDuration = 60;

function decodeState(state: string | null): { accountId?: string; source?: string } {
  if (!state) return {};
  for (const enc of ["base64url", "base64"] as const) {
    try {
      return JSON.parse(Buffer.from(state, enc).toString());
    } catch {
      /* try next */
    }
  }
  return {};
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const { accountId, source } = decodeState(sp.get("state"));
  const origin = request.nextUrl.origin;
  const fail = (msg: string) =>
    NextResponse.redirect(new URL(`/connected?status=error&message=${encodeURIComponent(msg)}`, origin));

  if (sp.get("error")) return fail(sp.get("error_description") || "Instagram connection was cancelled.");
  const code = sp.get("code");
  if (!code || !accountId) return fail("Missing information from Instagram. Please try again.");

  const appId = process.env.IG_LOGIN_APP_ID;
  const appSecret = process.env.IG_LOGIN_APP_SECRET;
  const mongoUri = process.env.MONGODB_URI;
  if (!appId || !appSecret || !mongoUri) return fail("App not configured. Contact Thomas.");

  const baseUrl = process.env.NEXTAUTH_URL || origin;
  let result;
  try {
    result = await exchangeIgLoginCode({ appId, appSecret, redirectUri: igLoginRedirectUri(baseUrl), code });
  } catch (err) {
    console.error("[ig-login] exchange failed", err);
    return fail("Instagram didn't accept the connection. Make sure your account is a Professional account, then try again.");
  }

  const client = await MongoClient.connect(mongoUri);
  let hasNotion = false;
  try {
    const db = client.db("strategy");
    const account = await db.collection("accounts").findOne({ id: accountId });
    if (!account) return fail("Account not found.");
    hasNotion = Boolean(account.notion?.postsDataSourceId);
    const now = new Date();
    await db.collection("accounts").updateOne(
      { id: accountId },
      {
        $set: {
          "platforms.instagram": {
            connected: true,
            apiHost: "instagram",
            accessToken: result.accessToken,
            userId: result.userId,
            username: result.username,
            accountType: result.accountType,
            connectedAt: now,
            expiresAt: new Date(now.getTime() + result.expiresIn * 1000),
          },
          updatedAt: now,
        },
      }
    );
  } finally {
    await client.close();
  }

  after(async () => {
    const c = await MongoClient.connect(mongoUri);
    try {
      const r = await captureBaseline(c.db("strategy") as unknown as BaselineDb, {
        accountId,
        source: "auto-connect",
        notes: "Auto-captured on Instagram connect (Instagram Login)",
      });
      console.log(`[baseline] ig-login auto-capture ${r.status} for ${accountId}${r.status === "failed" ? `: ${r.error}` : ""}`);
    } catch (err) {
      console.error(`[baseline] ig-login auto-capture crashed for ${accountId}`, err);
    } finally {
      await c.close();
    }
  });

  const u = encodeURIComponent(result.username);
  const path =
    source === "onboard"
      ? `/onboard/${accountId}?instagram=connected&username=${u}`
      : hasNotion
        ? `/account/${accountId}/client-view?instagram=connected&username=${u}`
        : `/connected?status=ok&username=${u}`;
  return NextResponse.redirect(new URL(path, origin));
}
