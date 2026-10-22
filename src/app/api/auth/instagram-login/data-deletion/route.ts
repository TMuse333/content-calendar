/**
 * Data deletion request callback (required for App Review). Removes the stored
 * Instagram connection for that user and returns a confirmation code + status URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const signed = (form?.get("signed_request") as string) ?? "";
  let userId: string | null = null;
  try {
    const payload = JSON.parse(Buffer.from(signed.split(".")[1] ?? "", "base64url").toString());
    userId = payload.user_id ? String(payload.user_id) : null;
  } catch {
    /* ignore */
  }
  if (userId && process.env.MONGODB_URI) {
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    try {
      await client
        .db("strategy")
        .collection("accounts")
        .updateMany({ "platforms.instagram.userId": userId }, { $unset: { "platforms.instagram": "" } });
    } finally {
      await client.close();
    }
  }
  const code = randomBytes(8).toString("hex");
  const base = process.env.NEXTAUTH_URL || request.nextUrl.origin;
  return NextResponse.json({ url: `${base}/connected?status=deleted&code=${code}`, confirmation_code: code });
}
