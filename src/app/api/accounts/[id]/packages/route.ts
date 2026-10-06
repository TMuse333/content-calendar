/**
 * Packages API
 * GET /api/accounts/[id]/packages - Get all packages
 * POST /api/accounts/[id]/packages - Create a new package
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPackages, createPackage } from "@/lib/mongodb/packages";
import type { CreatePackageRequest } from "@/lib/types/package";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const packages = await getPackages(id);

    return NextResponse.json({ data: packages });
  } catch (error) {
    console.error("[api:packages GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const body: CreatePackageRequest = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Package name is required" },
        { status: 400 }
      );
    }

    const packageId = await createPackage(id, body);

    return NextResponse.json({ success: true, packageId });
  } catch (error) {
    console.error("[api:packages POST]", error);
    return NextResponse.json(
      { error: "Failed to create package" },
      { status: 500 }
    );
  }
}
