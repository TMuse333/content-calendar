/**
 * Single Package API
 * GET /api/accounts/[id]/packages/[packageId] - Get a package
 * PUT /api/accounts/[id]/packages/[packageId] - Update a package
 * DELETE /api/accounts/[id]/packages/[packageId] - Delete a package
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import {
  getPackageById,
  updatePackage,
  deletePackage,
} from "@/lib/mongodb/packages";
import type { UpdatePackageRequest } from "@/lib/types/package";

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

    const pkg = await getPackageById(packageId);

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

    return NextResponse.json({ data: pkg });
  } catch (error) {
    console.error("[api:packages/[packageId] GET]", error);
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

    const pkg = await getPackageById(packageId);
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

    const body: UpdatePackageRequest = await request.json();
    const success = await updatePackage(packageId, body);

    return NextResponse.json({ success });
  } catch (error) {
    console.error("[api:packages/[packageId] PUT]", error);
    return NextResponse.json(
      { error: "Failed to update package" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const pkg = await getPackageById(packageId);
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

    const success = await deletePackage(packageId);

    return NextResponse.json({ success });
  } catch (error) {
    console.error("[api:packages/[packageId] DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete package" },
      { status: 500 }
    );
  }
}
