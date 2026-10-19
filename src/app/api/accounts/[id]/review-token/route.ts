/**
 * Review Token API
 * POST /api/accounts/[id]/review-token - Generate a new review token
 * GET  /api/accounts/[id]/review-token - Get current review token info
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById, generateReviewToken } from "@/lib/mongodb/accounts";

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

    const { searchParams } = new URL(request.url);
    const baseUrl = searchParams.get("baseUrl") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!account.reviewPortal?.token) {
      return NextResponse.json({
        hasToken: false,
        reviewUrl: null,
      });
    }

    const isExpired = account.reviewPortal.tokenExpiresAt
      ? new Date(account.reviewPortal.tokenExpiresAt) < new Date()
      : true;

    return NextResponse.json({
      hasToken: true,
      isExpired,
      createdAt: account.reviewPortal.tokenCreatedAt,
      expiresAt: account.reviewPortal.tokenExpiresAt,
      reviewUrl: isExpired ? null : `${baseUrl}/review/${account.reviewPortal.token}`,
    });
  } catch (error) {
    console.error("[api:review-token:get]", error);
    return NextResponse.json(
      { error: "Failed to get review token" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const expiresInDays = body.expiresInDays || 30;
    const baseUrl = body.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const token = await generateReviewToken(id, expiresInDays);
    if (!token) {
      return NextResponse.json(
        { error: "Failed to generate token" },
        { status: 500 }
      );
    }

    const reviewUrl = `${baseUrl}/review/${token}`;

    return NextResponse.json({
      success: true,
      token,
      reviewUrl,
      expiresInDays,
    });
  } catch (error) {
    console.error("[api:review-token:create]", error);
    return NextResponse.json(
      { error: "Failed to generate review token" },
      { status: 500 }
    );
  }
}
