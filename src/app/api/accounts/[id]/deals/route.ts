/**
 * Deals API
 *
 * GET  /api/accounts/[id]/deals - List deals for account
 * POST /api/accounts/[id]/deals - Create a new deal
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getDeals,
  createDeal,
  getDealProgress,
  ensureDealIndexes,
} from "@/lib/mongodb/deals";
import type { CreateDealRequest } from "@/lib/types/deal";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as "active" | "completed" | "paused" | null;

    await ensureDealIndexes();
    const deals = await getDeals(accountId, status ? { status } : undefined);

    // Get progress for each deal
    const dealsWithProgress = await Promise.all(
      deals.map(async (deal) => ({
        ...deal,
        progress: await getDealProgress(deal.id),
      }))
    );

    return NextResponse.json({
      success: true,
      deals: dealsWithProgress,
    });
  } catch (error) {
    console.error("[api:deals/GET]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch deals" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
    const body: CreateDealRequest = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 }
      );
    }

    if (!body.limits) {
      return NextResponse.json(
        { success: false, error: "limits is required" },
        { status: 400 }
      );
    }

    const deal = await createDeal(accountId, body);

    return NextResponse.json({
      success: true,
      deal,
    });
  } catch (error) {
    console.error("[api:deals/POST]", error);

    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create deal" },
      { status: 500 }
    );
  }
}
