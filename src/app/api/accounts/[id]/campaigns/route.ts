/**
 * Campaigns API
 *
 * GET  /api/accounts/[id]/campaigns - List campaigns for account
 * POST /api/accounts/[id]/campaigns - Create a new campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById, addCampaign } from "@/lib/mongodb/accounts";
import type { CreateCampaignRequest } from "@/lib/types/account";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/accounts/[id]/campaigns
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const account = await getAccountById(id);

    if (!account) {
      return NextResponse.json(
        { success: false, error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      campaigns: account.campaigns || [],
      count: account.campaigns?.length || 0,
    });
  } catch (error) {
    console.error("[api:campaigns/GET]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounts/[id]/campaigns
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: CreateCampaignRequest = await request.json();

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 }
      );
    }

    const campaign = await addCampaign(id, body);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    console.log(`[api:campaigns/POST] Created campaign: ${campaign.id} for account: ${id}`);

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error("[api:campaigns/POST]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create campaign" },
      { status: 500 }
    );
  }
}
