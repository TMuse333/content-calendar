/**
 * Graphic Packages API
 * GET /api/accounts/[id]/graphic-packages - List packages for account
 * POST /api/accounts/[id]/graphic-packages - Create new package
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import {
  getGraphicPackages,
  createGraphicPackage,
} from "@/lib/mongodb/graphic-packages";
import type { CreateGraphicPackageRequest } from "@/lib/types/graphic-package";

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

    const packages = await getGraphicPackages(id);

    return NextResponse.json({
      data: packages,
      count: packages.length,
    });
  } catch (error) {
    console.error("[api:graphic-packages GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch graphic packages" },
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

    const body = await request.json();

    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: "name and type are required" },
        { status: 400 }
      );
    }

    if (body.type !== "announcements" && body.type !== "carousels") {
      return NextResponse.json(
        { error: "type must be 'announcements' or 'carousels'" },
        { status: 400 }
      );
    }

    const data: CreateGraphicPackageRequest = {
      accountId: id,
      name: body.name,
      type: body.type,
      allocation: body.allocation,
      price: body.price,
      monthlyFrequency: body.monthlyFrequency,
      monthlyRate: body.monthlyRate,
      startDate: body.startDate,
    };

    const pkg = await createGraphicPackage(data);

    return NextResponse.json({ data: pkg }, { status: 201 });
  } catch (error) {
    console.error("[api:graphic-packages POST]", error);
    return NextResponse.json(
      { error: "Failed to create graphic package" },
      { status: 500 }
    );
  }
}
