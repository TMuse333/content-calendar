/**
 * Insights API
 * GET /api/accounts/[id]/insights - Get latest insights
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getLatestInsights, getPostStats, getInsightsHistory } from "@/lib/mongodb/posts";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify account exists
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const [insights, stats, history] = await Promise.all([
      getLatestInsights(id),
      getPostStats(id),
      getInsightsHistory(id, 10), // Last 10 insights
    ]);

    return NextResponse.json({
      data: insights,
      stats,
      history,
    });
  } catch (error) {
    console.error("[api:insights GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}
