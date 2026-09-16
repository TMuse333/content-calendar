import { NextResponse } from "next/server";
import { checkInstagramConnection } from "@/lib/platforms/instagram";

// GET /api/instagram/status - Check Instagram connection
export async function GET() {
  const status = await checkInstagramConnection();
  return NextResponse.json(status);
}
