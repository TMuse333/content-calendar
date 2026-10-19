/**
 * Content Items API
 *
 * GET /api/accounts/[id]/content - List content items
 */

import { NextRequest, NextResponse } from "next/server";
import { getContentItems } from "@/lib/drive/sync";
import { getDeals, getDealProgress } from "@/lib/mongodb/deals";
import type { ContentItemType, ContentItemStatus } from "@/lib/types/content-item";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
    const searchParams = request.nextUrl.searchParams;

    const dealId = searchParams.get("dealId") || undefined;
    const type = searchParams.get("type") as ContentItemType | null;
    const status = searchParams.get("status") as ContentItemStatus | null;
    const includeExtras = searchParams.get("includeExtras") !== "false";

    const items = await getContentItems(accountId, {
      dealId,
      type: type || undefined,
      status: status || undefined,
      includeExtras,
    });

    // Get deals for grouping
    const deals = await getDeals(accountId);
    const dealsWithProgress = await Promise.all(
      deals.map(async (deal) => ({
        ...deal,
        progress: await getDealProgress(deal.id),
      }))
    );

    // Group items by deal
    const itemsByDeal = new Map<string, typeof items>();
    const unassignedItems: typeof items = [];

    for (const item of items) {
      if (item.dealId) {
        const existing = itemsByDeal.get(item.dealId) || [];
        existing.push(item);
        itemsByDeal.set(item.dealId, existing);
      } else {
        unassignedItems.push(item);
      }
    }

    // Count items by status
    const statusCounts = items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      items,
      deals: dealsWithProgress,
      unassignedItems,
      counts: {
        total: items.length,
        byStatus: statusCounts,
        unassigned: unassignedItems.length,
      },
    });
  } catch (error) {
    console.error("[api:content/GET]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch content" },
      { status: 500 }
    );
  }
}
