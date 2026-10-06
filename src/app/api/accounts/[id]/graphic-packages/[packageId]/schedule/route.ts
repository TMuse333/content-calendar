/**
 * Content Schedule API
 * GET /api/accounts/[id]/graphic-packages/[packageId]/schedule - List scheduled carousels
 * POST /api/accounts/[id]/graphic-packages/[packageId]/schedule - Schedule a carousel
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import {
  getGraphicPackageById,
  getScheduledCarousels,
  getUpcomingCarousels,
  scheduleCarousel,
  updateScheduledCarousel,
  deleteScheduledCarousel,
} from "@/lib/mongodb/graphic-packages";
import type { ScheduleCarouselRequest } from "@/lib/types/graphic-package";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; packageId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || undefined;
    const upcoming = searchParams.get("upcoming") === "true";

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const pkg = await getGraphicPackageById(packageId);
    if (!pkg || pkg.accountId !== id) {
      return NextResponse.json(
        { error: `Package "${packageId}" not found` },
        { status: 404 }
      );
    }

    let scheduled;
    if (upcoming) {
      scheduled = await getUpcomingCarousels(packageId);
    } else {
      scheduled = await getScheduledCarousels(packageId, { month });
    }

    return NextResponse.json({
      data: scheduled,
      count: scheduled.length,
    });
  } catch (error) {
    console.error("[api:schedule GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const pkg = await getGraphicPackageById(packageId);
    if (!pkg || pkg.accountId !== id) {
      return NextResponse.json(
        { error: `Package "${packageId}" not found` },
        { status: 404 }
      );
    }

    if (pkg.type !== "carousels") {
      return NextResponse.json(
        { error: "Scheduling is only for carousel packages" },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.questionId || !body.scheduledDate) {
      return NextResponse.json(
        { error: "questionId and scheduledDate are required" },
        { status: 400 }
      );
    }

    const data: ScheduleCarouselRequest = {
      questionId: body.questionId,
      scheduledDate: body.scheduledDate,
      notes: body.notes,
      // Entropy fields
      level: body.level,
      uncertaintyAddressed: body.uncertaintyAddressed,
      suggestedFormat: body.suggestedFormat,
      isEvergreen: body.isEvergreen,
    };

    const scheduled = await scheduleCarousel(packageId, data);

    return NextResponse.json({ data: scheduled }, { status: 201 });
  } catch (error) {
    console.error("[api:schedule POST]", error);
    return NextResponse.json(
      { error: "Failed to schedule carousel" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId } = await params;
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId");

    if (!scheduleId) {
      return NextResponse.json(
        { error: "scheduleId query param is required" },
        { status: 400 }
      );
    }

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const pkg = await getGraphicPackageById(packageId);
    if (!pkg || pkg.accountId !== id) {
      return NextResponse.json(
        { error: `Package "${packageId}" not found` },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.scheduledDate !== undefined) updates.scheduledDate = new Date(body.scheduledDate);
    if (body.status !== undefined) updates.status = body.status;
    if (body.graphicUrl !== undefined) updates.graphicUrl = body.graphicUrl;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.performance !== undefined) updates.performance = body.performance;
    // Entropy fields
    if (body.level !== undefined) updates.level = body.level;
    if (body.uncertaintyAddressed !== undefined) updates.uncertaintyAddressed = body.uncertaintyAddressed;
    if (body.suggestedFormat !== undefined) updates.suggestedFormat = body.suggestedFormat;
    if (body.isEvergreen !== undefined) updates.isEvergreen = body.isEvergreen;

    await updateScheduledCarousel(scheduleId, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api:schedule PUT]", error);
    return NextResponse.json(
      { error: "Failed to update scheduled carousel" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId } = await params;
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId");

    if (!scheduleId) {
      return NextResponse.json(
        { error: "scheduleId query param is required" },
        { status: 400 }
      );
    }

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const pkg = await getGraphicPackageById(packageId);
    if (!pkg || pkg.accountId !== id) {
      return NextResponse.json(
        { error: `Package "${packageId}" not found` },
        { status: 404 }
      );
    }

    await deleteScheduledCarousel(scheduleId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api:schedule DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete scheduled carousel" },
      { status: 500 }
    );
  }
}
