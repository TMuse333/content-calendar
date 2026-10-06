/**
 * Outcomes API
 *
 * POST - Create new outcome (meeting, inquiry, deal)
 * GET - List outcomes for account
 */

import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import type { Outcome } from "@/lib/types/results";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: accountId } = await params;

  try {
    const body = await request.json();
    const {
      type,
      title,
      description,
      value,
      occurredAt,
      attributions,
      source,
      medium,
      campaign,
      leadName,
      leadEmail,
      notes,
    } = body;

    if (!type || !title) {
      return NextResponse.json(
        { error: "Type and title are required" },
        { status: 400 }
      );
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const client = await MongoClient.connect(mongoUri);
    const db = client.db("strategy");

    const now = new Date();
    const outcome: Outcome = {
      id: `outcome_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      accountId,
      type,
      title,
      description,
      value: value || undefined,
      occurredAt: occurredAt ? new Date(occurredAt) : now,
      attributions: attributions || [],
      source,
      medium,
      campaign,
      leadName,
      leadEmail,
      status: "new",
      notes,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("outcomes").insertOne(outcome);
    await client.close();

    return NextResponse.json({
      success: true,
      outcome,
      message: "Outcome logged successfully",
    });

  } catch (error) {
    console.error("Outcome creation error:", error);
    return NextResponse.json({
      error: "Failed to create outcome",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: accountId } = await params;

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const client = await MongoClient.connect(mongoUri);
    const db = client.db("strategy");

    // Build query
    const query: Record<string, unknown> = { accountId };
    if (type) query.type = type;
    if (status) query.status = status;

    const outcomes = await db
      .collection("outcomes")
      .find(query)
      .sort({ occurredAt: -1 })
      .limit(limit)
      .toArray();

    // Get aggregated stats
    const stats = await db.collection("outcomes").aggregate([
      { $match: { accountId } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalValue: { $sum: { $ifNull: ["$value", 0] } },
        },
      },
    ]).toArray();

    await client.close();

    return NextResponse.json({
      outcomes,
      stats: stats.reduce((acc, s) => {
        acc[s._id] = { count: s.count, totalValue: s.totalValue };
        return acc;
      }, {} as Record<string, { count: number; totalValue: number }>),
      count: outcomes.length,
    });

  } catch (error) {
    console.error("Outcomes fetch error:", error);
    return NextResponse.json({
      error: "Failed to fetch outcomes",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
