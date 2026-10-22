/**
 * Instagram calls this when a user removes the app. We mark the connection
 * as disconnected. (Signed request is not verified yet; this only ever
 * disconnects, never grants access.)
 */
import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

function userIdFromSignedRequest(signed: string | null): string | null {
  if (!signed) return null;
  try {
    const payload = JSON.parse(Buffer.from(signed.split(".")[1] ?? "", "base64url").toString());
    return payload.user_id ? String(payload.user_id) : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const userId = userIdFromSignedRequest((form?.get("signed_request") as string) ?? null);
  if (userId && process.env.MONGODB_URI) {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    try {
      await client
        .db("strategy")
        .collection("accounts")
        .updateMany(
          { "platforms.instagram.userId": userId, "platforms.instagram.apiHost": "instagram" },
          { $set: { "platforms.instagram.connected": false, "platforms.instagram.accessToken": null } }
        );
    } finally {
      await client.close();
    }
  }
  return NextResponse.json({ success: true });
}
