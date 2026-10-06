/**
 * Single Asset API
 * GET /api/accounts/:id/assets/:assetId - Get asset
 * PUT /api/accounts/:id/assets/:assetId - Update asset
 * DELETE /api/accounts/:id/assets/:assetId - Delete asset
 */

import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getAssetById, updateAsset, deleteAsset } from "@/lib/mongodb/assets";
import type { AssetType, AssetStatus } from "@/lib/types/asset";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; assetId: string }>;
}

/**
 * GET /api/accounts/:id/assets/:assetId
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: accountId, assetId } = await params;

    const asset = await getAssetById(assetId);

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (asset.accountId !== accountId) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: asset });
  } catch (error) {
    console.error("[api:asset:get]", error);
    return NextResponse.json(
      { error: "Failed to fetch asset" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounts/:id/assets/:assetId
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: accountId, assetId } = await params;
    const body = await request.json();

    // Get existing asset to verify ownership
    const existing = await getAssetById(assetId);
    if (!existing || existing.accountId !== accountId) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    const updates: {
      name?: string;
      type?: AssetType;
      tags?: string[];
      status?: AssetStatus;
      isPrimary?: boolean;
    } = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.type !== undefined) updates.type = body.type;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.status !== undefined) updates.status = body.status;
    if (body.isPrimary !== undefined) updates.isPrimary = body.isPrimary;

    const asset = await updateAsset(assetId, updates);

    if (!asset) {
      return NextResponse.json(
        { error: "Failed to update asset" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: asset });
  } catch (error) {
    console.error("[api:asset:put]", error);
    return NextResponse.json(
      { error: "Failed to update asset" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounts/:id/assets/:assetId
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: accountId, assetId } = await params;

    // Get existing asset to verify ownership and get URL for blob deletion
    const existing = await getAssetById(assetId);
    if (!existing || existing.accountId !== accountId) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    // Delete from Vercel Blob
    try {
      await del(existing.url);
    } catch (blobError) {
      console.warn("[api:asset:delete] Failed to delete blob:", blobError);
      // Continue with DB deletion even if blob deletion fails
    }

    // Delete from database
    const deleted = await deleteAsset(assetId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete asset" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api:asset:delete]", error);
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}
