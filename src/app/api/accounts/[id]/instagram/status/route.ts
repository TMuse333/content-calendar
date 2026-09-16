/**
 * Account Instagram Status API
 * GET /api/accounts/[id]/instagram/status
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { checkInstagramConnection } from "@/lib/platforms/instagram";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const account = await getAccountById(id);

    if (!account) {
      return NextResponse.json(
        { connected: false, error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const instagram = account.platforms?.instagram;

    if (!instagram?.connected || !instagram.userId || !instagram.accessToken) {
      return NextResponse.json({
        connected: false,
        error: "Instagram not connected for this account",
      });
    }

    // Check connection using account credentials
    const status = await checkInstagramConnection({
      instagramId: instagram.userId,
      accessToken: instagram.accessToken,
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error("[api:accounts/[id]/instagram/status]", error);
    return NextResponse.json(
      { connected: false, error: "Failed to check Instagram status" },
      { status: 500 }
    );
  }
}
