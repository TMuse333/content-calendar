/**
 * Carousel API
 * PATCH /api/accounts/[id]/carousels/[carouselId]
 *
 * Update a scheduled carousel's fields (including entropy levels).
 */

import { NextRequest, NextResponse } from "next/server";
import { updateScheduledCarousel } from "@/lib/mongodb/graphic-packages";

interface RouteParams {
  params: Promise<{ id: string; carouselId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: accountId, carouselId } = await params;
    const body = await request.json();

    // Extract allowed fields
    const updates: Record<string, unknown> = {};

    // Entropy fields
    if (body.level !== undefined) updates.level = body.level;
    if (body.uncertaintyAddressed !== undefined) updates.uncertaintyAddressed = body.uncertaintyAddressed;
    if (body.suggestedFormat !== undefined) updates.suggestedFormat = body.suggestedFormat;
    if (body.isEvergreen !== undefined) updates.isEvergreen = body.isEvergreen;

    // Other updatable fields
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.brief !== undefined) updates.brief = body.brief;
    if (body.scheduledDate !== undefined) updates.scheduledDate = new Date(body.scheduledDate);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const success = await updateScheduledCarousel(carouselId, updates);

    if (!success) {
      return NextResponse.json(
        { error: "Carousel not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      carouselId,
      updated: Object.keys(updates),
    });
  } catch (error) {
    console.error("[api:carousels:patch]", error);
    return NextResponse.json(
      { error: "Failed to update carousel" },
      { status: 500 }
    );
  }
}
