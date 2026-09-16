/**
 * Account Instagram Insights API
 * GET /api/accounts/[id]/instagram/insights
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { fetchPostInsights } from "@/lib/platforms/instagram";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;

    const account = await getAccountById(id);

    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const instagram = account.platforms?.instagram;

    if (!instagram?.connected || !instagram.userId || !instagram.accessToken) {
      return NextResponse.json({
        data: [],
        error: "Instagram not connected for this account",
      });
    }

    // Parse date filters
    const sinceParam = searchParams.get("since");
    const untilParam = searchParams.get("until");

    const since = sinceParam ? new Date(sinceParam) : undefined;
    const until = untilParam ? new Date(untilParam) : undefined;

    // Fetch insights using account credentials
    const result = await fetchPostInsights({
      since,
      until,
      credentials: {
        instagramId: instagram.userId,
        accessToken: instagram.accessToken,
      },
    });

    if (result.error) {
      return NextResponse.json({ data: [], error: result.error });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error("[api:accounts/[id]/instagram/insights]", error);
    return NextResponse.json(
      { error: "Failed to fetch Instagram insights" },
      { status: 500 }
    );
  }
}
