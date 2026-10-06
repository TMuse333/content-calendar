/**
 * Update/Delete a Scheduled Carousel
 *
 * PATCH /api/carousel/schedule/[id] - Update caption or scheduledFor
 * DELETE /api/carousel/schedule/[id] - Delete a scheduled carousel
 */

import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { caption, scheduledFor } = body;

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const client = await MongoClient.connect(mongoUri);
    const db = client.db("strategy");

    const updates: Record<string, unknown> = {};
    if (caption !== undefined) updates.caption = caption;
    if (scheduledFor !== undefined) updates.scheduledFor = new Date(scheduledFor);

    const result = await db.collection("scheduled_carousels").updateOne(
      { id },
      { $set: updates }
    );

    await client.close();

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Carousel not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, updated: updates });

  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({
      error: "Failed to update carousel",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const client = await MongoClient.connect(mongoUri);
    const db = client.db("strategy");

    const result = await db.collection("scheduled_carousels").deleteOne({ id });

    await client.close();

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Carousel not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({
      error: "Failed to delete carousel",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
