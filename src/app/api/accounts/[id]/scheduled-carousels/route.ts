/**
 * Scheduled Carousels API (Account Level)
 * GET /api/accounts/[id]/scheduled-carousels - List all scheduled carousels for account
 *
 * Query params:
 * - month: 1-12 (optional)
 * - year: 2024, 2025, etc. (optional)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getScheduledCarouselsByAccount } from "@/lib/mongodb/graphic-packages";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get("month");
    const yearStr = searchParams.get("year");

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const options: { month?: number; year?: number } = {};
    if (monthStr) options.month = parseInt(monthStr, 10);
    if (yearStr) options.year = parseInt(yearStr, 10);

    const scheduled = await getScheduledCarouselsByAccount(id, options);

    return NextResponse.json({
      data: scheduled,
      count: scheduled.length,
    });
  } catch (error) {
    console.error("[api:scheduled-carousels GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled carousels" },
      { status: 500 }
    );
  }
}
