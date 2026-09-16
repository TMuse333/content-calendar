/**
 * Accounts API
 *
 * GET  /api/accounts - List all accounts
 * POST /api/accounts - Create a new account
 */

import { NextResponse } from "next/server";
import {
  getAccounts,
  createAccount,
  ensureAccountIndexes,
} from "@/lib/mongodb/accounts";
import type { CreateAccountRequest } from "@/lib/types/account";

export const dynamic = "force-dynamic";

/**
 * GET /api/accounts
 * List all accounts
 */
export async function GET() {
  try {
    await ensureAccountIndexes();
    const accounts = await getAccounts({ activeOnly: true });

    return NextResponse.json({
      success: true,
      accounts,
      count: accounts.length,
    });
  } catch (error) {
    console.error("[api:accounts/GET]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounts
 * Create a new account
 */
export async function POST(req: Request) {
  try {
    const body: CreateAccountRequest = await req.json();

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 }
      );
    }

    const account = await createAccount(body);

    console.log(`[api:accounts/POST] Created account: ${account.id}`);

    return NextResponse.json({
      success: true,
      account,
    });
  } catch (error) {
    console.error("[api:accounts/POST]", error);

    // Handle duplicate ID error
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create account" },
      { status: 500 }
    );
  }
}
