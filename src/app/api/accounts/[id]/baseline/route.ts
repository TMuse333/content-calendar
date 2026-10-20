/**
 * Baseline Capture API
 *
 * POST - Capture current state as baseline
 * GET - Retrieve baseline(s) for account
 */

import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { captureBaseline, type BaselineDb } from "@/lib/baseline/capture";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: accountId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const { notes, clientEstimate, dryRun } = body;

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const client = await MongoClient.connect(mongoUri);
    try {
      const db = client.db("strategy");
      const result = await captureBaseline(db as unknown as BaselineDb, {
        accountId,
        source: "manual",
        notes,
        clientEstimate,
        dryRun: Boolean(dryRun),
      });

      if (result.status === "failed") {
        const status = result.error === "Account not found" ? 404 : 502;
        return NextResponse.json(
          { error: "Failed to capture baseline", details: result.error },
          { status }
        );
      }
      if (result.status === "dry-run") {
        return NextResponse.json({
          success: true,
          baseline: result.baseline,
          message: "Dry run - metrics fetched but not saved",
        });
      }
      if (result.status === "skipped") {
        return NextResponse.json({ success: true, skipped: true, reason: result.reason });
      }
      return NextResponse.json({
        success: true,
        baseline: result.baseline,
        message: "Baseline captured successfully",
      });
    } finally {
      await client.close();
    }
  } catch (error) {
    console.error("Baseline capture error:", error);
    return NextResponse.json({
      error: "Failed to capture baseline",
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

    const client = await MongoClient.connect(mongoUri);
    const db = client.db("strategy");

    const baselines = await db
      .collection("baselines")
      .find({ accountId })
      .sort({ capturedAt: -1 })
      .toArray();

    await client.close();

    return NextResponse.json({
      baselines,
      count: baselines.length,
    });

  } catch (error) {
    console.error("Baseline fetch error:", error);
    return NextResponse.json({
      error: "Failed to fetch baselines",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
