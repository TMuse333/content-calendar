/**
 * Content Item API
 * GET    /api/accounts/[id]/content-items/[itemId] - Get a content item
 * PATCH  /api/accounts/[id]/content-items/[itemId] - Update a content item
 * DELETE /api/accounts/[id]/content-items/[itemId] - Delete a content item
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import {
  getContentItemById,
  updateContentItem,
  deleteContentItem,
} from "@/lib/mongodb/content-items";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, itemId } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const item = await getContentItemById(id, itemId);
    if (!item) {
      return NextResponse.json(
        { error: `Content item "${itemId}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("[api:content-item:get]", error);
    return NextResponse.json(
      { error: "Failed to fetch content item" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, itemId } = await params;
    const body = await request.json();

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const existing = await getContentItemById(id, itemId);
    if (!existing) {
      return NextResponse.json(
        { error: `Content item "${itemId}" not found` },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {};

    // Allowed update fields
    const allowedFields = [
      "type",
      "subtype",
      "topic",
      "plannedDate",
      "postedDate",
      "previewUrl",
      "finalUrl",
      "thumbnailUrl",
      "status",
      "clientComment",
      "clientApprovedAt",
      "results",
      "notes",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        if (field === "plannedDate" || field === "postedDate" || field === "clientApprovedAt") {
          updates[field] = body[field] ? new Date(body[field]) : undefined;
        } else {
          updates[field] = body[field];
        }
      }
    }

    const item = await updateContentItem(id, itemId, updates);

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error("[api:content-item:update]", error);
    return NextResponse.json(
      { error: "Failed to update content item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, itemId } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const deleted = await deleteContentItem(id, itemId);
    if (!deleted) {
      return NextResponse.json(
        { error: `Content item "${itemId}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api:content-item:delete]", error);
    return NextResponse.json(
      { error: "Failed to delete content item" },
      { status: 500 }
    );
  }
}
