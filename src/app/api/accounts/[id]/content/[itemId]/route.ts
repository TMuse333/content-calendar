/**
 * Single Content Item API
 *
 * PATCH /api/accounts/[id]/content/[itemId] - Update a content item
 */

import { NextRequest, NextResponse } from "next/server";
import { updateContentItem } from "@/lib/drive/sync";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();

    // Only allow updating specific fields
    const allowedUpdates: Record<string, unknown> = {};

    if (body.status !== undefined) allowedUpdates.status = body.status;
    if (body.dealId !== undefined) allowedUpdates.dealId = body.dealId;
    if (body.isExtra !== undefined) allowedUpdates.isExtra = body.isExtra;
    if (body.needsDate !== undefined) allowedUpdates.needsDate = body.needsDate;
    if (body.plannedDate !== undefined) {
      allowedUpdates.plannedDate = body.plannedDate ? new Date(body.plannedDate) : null;
    }
    if (body.notes !== undefined) allowedUpdates.notes = body.notes;
    if (body.clientComment !== undefined) allowedUpdates.clientComment = body.clientComment;

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid updates provided" },
        { status: 400 }
      );
    }

    const updated = await updateContentItem(itemId, allowedUpdates as Parameters<typeof updateContentItem>[1]);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Content item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      item: updated,
    });
  } catch (error) {
    console.error("[api:content/[itemId]/PATCH]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}
