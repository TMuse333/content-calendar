/**
 * Content Sync API
 *
 * POST /api/accounts/[id]/content/sync - Sync from Google Drive
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getDeals } from "@/lib/mongodb/deals";
import { syncDriveToDb } from "@/lib/drive/sync";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;

    // Get account to find Drive folder ID
    const account = await getAccountById(accountId);
    if (!account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    if (!account.driveFolderId) {
      return NextResponse.json(
        { success: false, error: "No Drive folder configured for this account" },
        { status: 400 }
      );
    }

    // Get deals to assign items
    const deals = await getDeals(accountId);
    const activeDeal = deals.find(d => d.status === "active");
    const completedDeal = deals.find(d => d.status === "completed");

    if (!activeDeal) {
      return NextResponse.json(
        { success: false, error: "No active deal found. Create a deal first." },
        { status: 400 }
      );
    }

    // Run sync
    const result = await syncDriveToDb(accountId, account.driveFolderId, {
      activeDealId: activeDeal.id,
      completedDealId: completedDeal?.id || activeDeal.id,
    });

    return NextResponse.json({
      success: true,
      result,
      message: `Synced: ${result.created} created, ${result.updated} updated, ${result.paired} paired`,
    });
  } catch (error) {
    console.error("[api:content/sync/POST]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
