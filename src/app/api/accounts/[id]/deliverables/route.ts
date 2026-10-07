/**
 * Deliverables API
 * GET /api/accounts/:id/deliverables - List deliverables with filters
 * POST /api/accounts/:id/deliverables - Create a new deliverable
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getDeliverables,
  getDeliverableSummary,
  createDeliverable,
} from "@/lib/mongodb/deliverables";
import type {
  DeliveryType,
  DeliveryStatus,
  PublishPlatform,
  CreateDeliverableRequest,
} from "@/lib/types/deliverable";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/accounts/:id/deliverables
 * Query params: type, status, entropyLevel, campaign, tag, publishedTo, summary, limit, offset
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: accountId } = await params;
    const { searchParams } = new URL(request.url);

    // Check if summary is requested
    if (searchParams.get("summary") === "true") {
      const summary = await getDeliverableSummary(accountId);
      return NextResponse.json({ data: summary });
    }

    // Build filters
    const filters: {
      deliveryType?: DeliveryType;
      status?: DeliveryStatus;
      entropyLevel?: string;
      campaign?: string;
      tag?: string;
      publishedTo?: PublishPlatform;
    } = {};

    const type = searchParams.get("type");
    if (type) filters.deliveryType = type as DeliveryType;

    const status = searchParams.get("status");
    if (status) filters.status = status as DeliveryStatus;

    const entropyLevel = searchParams.get("entropyLevel");
    if (entropyLevel) filters.entropyLevel = entropyLevel;

    const campaign = searchParams.get("campaign");
    if (campaign) filters.campaign = campaign;

    const tag = searchParams.get("tag");
    if (tag) filters.tag = tag;

    const publishedTo = searchParams.get("publishedTo");
    if (publishedTo) filters.publishedTo = publishedTo as PublishPlatform;

    // Pagination
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const deliverables = await getDeliverables(accountId, filters, { limit, offset });

    return NextResponse.json({
      data: deliverables,
      count: deliverables.length,
      filters,
    });
  } catch (error) {
    console.error("[api:deliverables:get]", error);
    return NextResponse.json(
      { error: "Failed to fetch deliverables" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounts/:id/deliverables
 * Create a new deliverable
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: accountId } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.deliveryType) {
      return NextResponse.json(
        { error: "deliveryType is required" },
        { status: 400 }
      );
    }

    if (!body.title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    if (!body.slides || !Array.isArray(body.slides) || body.slides.length === 0) {
      return NextResponse.json(
        { error: "slides array is required and must not be empty" },
        { status: 400 }
      );
    }

    const createData: CreateDeliverableRequest = {
      deliveryType: body.deliveryType,
      title: body.title,
      description: body.description,
      slides: body.slides,
      questionId: body.questionId,
      briefId: body.briefId,
      formatId: body.formatId,
      formatName: body.formatName,
      entropyLevel: body.entropyLevel,
      tags: body.tags,
      campaign: body.campaign,
    };

    const deliverable = await createDeliverable(accountId, createData);

    return NextResponse.json({ data: deliverable }, { status: 201 });
  } catch (error) {
    console.error("[api:deliverables:post]", error);
    return NextResponse.json(
      { error: "Failed to create deliverable" },
      { status: 500 }
    );
  }
}
