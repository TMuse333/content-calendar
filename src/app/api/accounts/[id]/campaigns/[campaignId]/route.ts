/**
 * Single Campaign API
 * GET    /api/accounts/[id]/campaigns/[campaignId] - Get campaign details
 * PATCH  /api/accounts/[id]/campaigns/[campaignId] - Update campaign
 * DELETE /api/accounts/[id]/campaigns/[campaignId] - Delete campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById, updateCampaign, deleteCampaign } from "@/lib/mongodb/accounts";
import type { UpdateCampaignRequest } from "@/lib/types/account";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; campaignId: string }>;
}

/**
 * GET /api/accounts/[id]/campaigns/[campaignId]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, campaignId } = await params;
    const account = await getAccountById(id);

    if (!account) {
      return NextResponse.json(
        { success: false, error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const campaign = account.campaigns?.find((c) => c.id === campaignId);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: `Campaign "${campaignId}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error("[api:campaigns/[campaignId]/GET]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounts/[id]/campaigns/[campaignId]
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, campaignId } = await params;
    const body: UpdateCampaignRequest = await request.json();

    const success = await updateCampaign(id, campaignId, body);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Campaign not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api:campaigns/[campaignId]/PATCH]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounts/[id]/campaigns/[campaignId]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, campaignId } = await params;

    const success = await deleteCampaign(id, campaignId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Campaign not found or delete failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api:campaigns/[campaignId]/DELETE]", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
