/**
 * Tracking Event API
 *
 * POST /api/tracking/event - Receive tracking events from client websites
 *
 * This endpoint is public and CORS-enabled for cross-origin requests
 */

import { NextResponse } from "next/server";
import { createTrackingEvent } from "@/lib/mongodb/tracking-events";
import type { TrackingEvent } from "@/lib/types/results";

export const dynamic = "force-dynamic";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/**
 * OPTIONS /api/tracking/event
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * POST /api/tracking/event
 * Receive tracking event from client website
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.accountId?.trim()) {
      return NextResponse.json(
        { success: false, error: "accountId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.eventType?.trim()) {
      return NextResponse.json(
        { success: false, error: "eventType is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.sessionId?.trim()) {
      return NextResponse.json(
        { success: false, error: "sessionId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Map eventType to valid enum values
    let eventType: TrackingEvent["eventType"] = "custom";
    switch (body.eventType) {
      case "page_view":
        eventType = "page_view";
        break;
      case "page_exit":
        // Store as custom event with metadata
        eventType = "custom";
        break;
      case "form_submit":
        eventType = "form_submit";
        break;
      case "booking":
        eventType = "booking";
        break;
      case "click":
        eventType = "click";
        break;
      case "dm":
        eventType = "dm";
        break;
      default:
        eventType = "custom";
    }

    // Build metadata from extra fields
    const metadata: Record<string, unknown> = {
      ...body.metadata,
    };

    // Add page exit specific data
    if (body.eventType === "page_exit") {
      metadata.exitEvent = true;
      metadata.timeOnPage = body.timeOnPage;
      metadata.maxScrollDepth = body.maxScrollDepth;
    }

    // Add screen dimensions
    if (body.screenWidth) metadata.screenWidth = body.screenWidth;
    if (body.screenHeight) metadata.screenHeight = body.screenHeight;

    // Add custom event name
    if (body.eventName) metadata.eventName = body.eventName;

    // Add click element
    if (body.element) metadata.element = body.element;

    const event = await createTrackingEvent({
      accountId: body.accountId,
      sessionId: body.sessionId,
      eventType,
      utm: body.utm || {},
      referrer: body.referrer || "",
      url: body.url || "",
      userAgent: body.userAgent || "",
      metadata,
      timestamp: body.timestamp,
    });

    console.log(`[api:tracking/event] ${eventType} for ${body.accountId}`);

    return NextResponse.json(
      { success: true, eventId: event.id },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[api:tracking/event]", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to record event",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
