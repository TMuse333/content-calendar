/**
 * Announcement Usage API
 * GET /api/accounts/[id]/graphic-packages/[packageId]/usage - List usage
 * POST /api/accounts/[id]/graphic-packages/[packageId]/usage - Log new usage
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import {
  getGraphicPackageById,
  getUsage,
  logUsage,
} from "@/lib/mongodb/graphic-packages";
import type { LogAnnouncementRequest } from "@/lib/types/graphic-package";

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
    if (!pkg || pkg.accountId !== id) {
      return NextResponse.json(
        { error: `Package "${packageId}" not found` },
        { status: 404 }
      );
    }

    const usage = await getUsage(packageId);

    return NextResponse.json({
      data: usage,
      count: usage.length,
    });
  } catch (error) {
    console.error("[api:usage GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    if (!pkg || pkg.accountId !== id) {
      return NextResponse.json(
        { error: `Package "${packageId}" not found` },
        { status: 404 }
      );
    }

    if (pkg.type !== "announcements") {
      return NextResponse.json(
        { error: "Usage logging is only for announcement packages" },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.listingAddress || !body.graphicType) {
      return NextResponse.json(
        { error: "listingAddress and graphicType are required" },
        { status: 400 }
      );
    }

    const data: LogAnnouncementRequest = {
      listingAddress: body.listingAddress,
      graphicType: body.graphicType,
      graphicUrl: body.graphicUrl,
      notes: body.notes,
    };

    const usage = await logUsage(packageId, data);

    // Get updated package to return new used count
    const updatedPkg = await getGraphicPackageById(packageId);

    return NextResponse.json({
      data: usage,
      package: updatedPkg,
    }, { status: 201 });
  } catch (error) {
    console.error("[api:usage POST]", error);
    return NextResponse.json(
      { error: "Failed to log usage" },
      { status: 500 }
    );
  }
}
