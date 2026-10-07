/**
 * Single Deliverable API
 * GET /api/accounts/:id/deliverables/:deliverableId - Get deliverable
 * PUT /api/accounts/:id/deliverables/:deliverableId - Update deliverable
 * DELETE /api/accounts/:id/deliverables/:deliverableId - Delete deliverable
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getDeliverableById,
  updateDeliverable,
  deleteDeliverable,
  approveDeliverable,
  publishDeliverable,
} from "@/lib/mongodb/deliverables";
import type { UpdateDeliverableRequest, PublishPlatform } from "@/lib/types/deliverable";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; deliverableId: string }>;
}

/**
 * GET /api/accounts/:id/deliverables/:deliverableId
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { deliverableId } = await params;

    const deliverable = await getDeliverableById(deliverableId);

    if (!deliverable) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: deliverable });
  } catch (error) {
    console.error("[api:deliverable:get]", error);
    return NextResponse.json(
      { error: "Failed to fetch deliverable" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/accounts/:id/deliverables/:deliverableId
 * Body can include: title, description, slides, status, tags, campaign
 * Special actions via body.action: "approve" | "publish"
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { deliverableId } = await params;
    const body = await request.json();

    // Handle special actions
    if (body.action === "approve") {
      const result = await approveDeliverable(deliverableId, body.approvedBy);
      if (!result) {
        return NextResponse.json(
          { error: "Deliverable not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: result });
    }

    if (body.action === "publish") {
      if (!body.platforms || !Array.isArray(body.platforms)) {
        return NextResponse.json(
          { error: "platforms array is required for publish action" },
          { status: 400 }
        );
      }
      const result = await publishDeliverable(
        deliverableId,
        body.platforms as PublishPlatform[]
      );
      if (!result) {
        return NextResponse.json(
          { error: "Deliverable not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: result });
    }

    // Standard update
    const updates: UpdateDeliverableRequest = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.slides !== undefined) updates.slides = body.slides;
    if (body.status !== undefined) updates.status = body.status;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.campaign !== undefined) updates.campaign = body.campaign;

    const result = await updateDeliverable(deliverableId, updates);

    if (!result) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[api:deliverable:put]", error);
    return NextResponse.json(
      { error: "Failed to update deliverable" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounts/:id/deliverables/:deliverableId
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { deliverableId } = await params;

    const deleted = await deleteDeliverable(deliverableId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api:deliverable:delete]", error);
    return NextResponse.json(
      { error: "Failed to delete deliverable" },
      { status: 500 }
    );
  }
}
