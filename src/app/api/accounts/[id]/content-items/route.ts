/**
 * Content Items API
 * GET  /api/accounts/[id]/content-items - List all content items
 * POST /api/accounts/[id]/content-items - Create a new content item
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import {
  getContentItems,
  createContentItem,
  getContentItemCounts,
} from "@/lib/mongodb/content-items";
import type { ContentItemType, ContentItemStatus } from "@/lib/types/content-item";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const type = searchParams.get("type") as ContentItemType | null;
    const status = searchParams.get("status") as ContentItemStatus | null;
    const includeCounts = searchParams.get("counts") === "true";

    const items = await getContentItems(id, {
      type: type || undefined,
      status: status || undefined,
    });

    const response: {
      data: typeof items;
      counts?: Record<ContentItemType, number>;
    } = { data: items };

    if (includeCounts) {
      response.counts = await getContentItemCounts(id);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api:content-items:list]", error);
    return NextResponse.json(
      { error: "Failed to fetch content items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const { type, subtype, topic, plannedDate, previewUrl, finalUrl, notes, status } = body;

    if (!type || !topic) {
      return NextResponse.json(
        { error: "type and topic are required" },
        { status: 400 }
      );
    }

    const validTypes = ["carousel", "listing-graphic", "video"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const item = await createContentItem({
      accountId: id,
      type,
      subtype: subtype || undefined,
      topic,
      plannedDate: plannedDate ? new Date(plannedDate) : undefined,
      previewUrl: previewUrl || undefined,
      finalUrl: finalUrl || undefined,
      notes: notes || undefined,
      status: status || "draft",
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("[api:content-items:create]", error);
    return NextResponse.json(
      { error: "Failed to create content item" },
      { status: 500 }
    );
  }
}
