/**
 * Single Account API
 *
 * GET   /api/accounts/[id] - Get account by ID
 * PATCH /api/accounts/[id] - Update account
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById, updateAccount } from "@/lib/mongodb/accounts";

export const dynamic = "force-dynamic";

/**
 * GET /api/accounts/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await getAccountById(id);

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error("[api:accounts/[id]/GET]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch account" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounts/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const account = await updateAccount(id, body);

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error("[api:accounts/[id]/PATCH]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update account" },
      { status: 500 }
    );
  }
}
