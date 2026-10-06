/**
 * Graphic Package Detail API
 * GET /api/accounts/[id]/graphic-packages/[packageId] - Get package details
 * PUT /api/accounts/[id]/graphic-packages/[packageId] - Update package
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import {
  getGraphicPackageById,
  updateGraphicPackage,
  topUpPackage,
  getPackageStats,
} from "@/lib/mongodb/graphic-packages";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; packageId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const pkg = await getGraphicPackageById(packageId);
    if (!pkg) {
      return NextResponse.json(
        { error: `Package "${packageId}" not found` },
        { status: 404 }
      );
    }

    if (pkg.accountId !== id) {
      return NextResponse.json(
        { error: "Package does not belong to this account" },
        { status: 403 }
      );
    }

    // Get stats for carousel packages
    let stats = null;
    if (pkg.type === "carousels") {
      stats = await getPackageStats(packageId);
    }

    return NextResponse.json({
      data: pkg,
      stats,
    });
  } catch (error) {
    console.error("[api:graphic-packages/[packageId] GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch package" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const pkg = await getGraphicPackageById(packageId);
    if (!pkg) {
      return NextResponse.json(
        { error: `Package "${packageId}" not found` },
        { status: 404 }
      );
    }

    if (pkg.accountId !== id) {
      return NextResponse.json(
        { error: "Package does not belong to this account" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Handle top-up action
    if (body.action === "topup" && body.additional) {
      await topUpPackage(packageId, body.additional);
      const updated = await getGraphicPackageById(packageId);
      return NextResponse.json({ data: updated });
    }

    // Regular update
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.status !== undefined) updates.status = body.status;
    if (body.price !== undefined) updates.price = body.price;
    if (body.monthlyRate !== undefined) updates.monthlyRate = body.monthlyRate;

    if (Object.keys(updates).length > 0) {
      await updateGraphicPackage(packageId, updates);
    }

    const updated = await getGraphicPackageById(packageId);
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[api:graphic-packages/[packageId] PUT]", error);
    return NextResponse.json(
      { error: "Failed to update package" },
      { status: 500 }
    );
  }
}
