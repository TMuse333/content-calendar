/**
 * Single Account API
 *
 * GET    /api/accounts/[id] - Get account by ID
 * PUT    /api/accounts/[id] - Update account
 * DELETE /api/accounts/[id] - Soft delete account
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAccountById,
  updateAccount,
  deleteAccount,
} from "@/lib/mongodb/accounts";
import type { UpdateAccountRequest } from "@/lib/types/account";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/accounts/[id]
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
      account,
    });
  } catch (error) {
    console.error("[api:accounts/[id]/GET]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch account" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounts/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: UpdateAccountRequest = await request.json();

    const account = await updateAccount(id, body);

    if (!account) {
      return NextResponse.json(
        { success: false, error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    console.log(`[api:accounts/[id]/PUT] Updated account: ${id}`);

    return NextResponse.json({
      success: true,
      account,
    });
  } catch (error) {
    console.error("[api:accounts/[id]/PUT]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update account" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounts/[id] - Partial update
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: UpdateAccountRequest = await request.json();

    const account = await updateAccount(id, body);

    if (!account) {
      return NextResponse.json(
        { success: false, error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    console.log(`[api:accounts/[id]/PATCH] Updated account: ${id}`);

    return NextResponse.json({
      success: true,
      account,
    });
  } catch (error) {
    console.error("[api:accounts/[id]/PATCH]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update account" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounts/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const deleted = await deleteAccount(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    console.log(`[api:accounts/[id]/DELETE] Soft deleted account: ${id}`);

    return NextResponse.json({
      success: true,
      message: `Account "${id}" has been deactivated`,
    });
  } catch (error) {
    console.error("[api:accounts/[id]/DELETE]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete account" },
      { status: 500 }
    );
  }
}
