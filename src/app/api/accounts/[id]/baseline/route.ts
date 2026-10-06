/**
 * Baseline Capture API
 *
 * POST - Capture current state as baseline
 * GET - Retrieve baseline(s) for account
 */

import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import type { Baseline } from "@/lib/types/results";

// Fetch Instagram insights for baseline
async function fetchInstagramBaseline(
  accessToken: string,
  userId: string
): Promise<Baseline["instagram"] | null> {
  try {
    // Get account insights for last 30 days
    // Using valid metrics as of 2026: reach, profile_views, website_clicks, accounts_engaged, total_interactions
    const insightsUrl = new URL(
      `https://graph.facebook.com/v21.0/${userId}/insights`
    );
    insightsUrl.searchParams.set(
      "metric",
      "reach,profile_views,website_clicks,accounts_engaged,total_interactions"
    );
    insightsUrl.searchParams.set("period", "day");
    insightsUrl.searchParams.set("metric_type", "total_value");
    insightsUrl.searchParams.set("since", String(Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60));
    insightsUrl.searchParams.set("until", String(Math.floor(Date.now() / 1000)));
    insightsUrl.searchParams.set("access_token", accessToken);

    const insightsRes = await fetch(insightsUrl.toString());
    const insightsData = await insightsRes.json();

    if (insightsData.error) {
      console.error("Instagram insights error:", insightsData.error);
      // Try alternative approach - get follower count at minimum
    }

    // Sum up values from each metric
    let reach = 0;
    let profileVisits = 0;
    let websiteClicks = 0;
    let accountsEngaged = 0;
    let totalInteractions = 0;

    for (const metric of insightsData.data || []) {
      // Handle both daily values and total_value format
      let total = 0;
      if (metric.total_value?.value !== undefined) {
        total = metric.total_value.value;
      } else if (metric.values) {
        total = (metric.values || []).reduce(
          (sum: number, v: { value: number }) => sum + (v.value || 0),
          0
        );
      }

      switch (metric.name) {
        case "reach":
          reach = total;
          break;
        case "profile_views":
          profileVisits = total;
          break;
        case "website_clicks":
          websiteClicks = total;
          break;
        case "accounts_engaged":
          accountsEngaged = total;
          break;
        case "total_interactions":
          totalInteractions = total;
          break;
      }
    }

    // Get follower count
    const userUrl = new URL(`https://graph.facebook.com/v21.0/${userId}`);
    userUrl.searchParams.set("fields", "followers_count,media_count");
    userUrl.searchParams.set("access_token", accessToken);

    const userRes = await fetch(userUrl.toString());
    const userData = await userRes.json();

    const followers = userData.followers_count || 0;
    const postsCount = userData.media_count || 0;

    // Calculate engagement rate
    const avgEngagementRate = reach > 0 ? (accountsEngaged / reach) * 100 : 0;

    return {
      reach,
      profileVisits,
      websiteClicks,
      accountsEngaged,
      totalInteractions,
      followers,
      followersGained: 0, // Would need historical data
      postsCount,
      avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
    };
  } catch (error) {
    console.error("Error fetching Instagram baseline:", error);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: accountId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const { notes, clientEstimate } = body;

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const client = await MongoClient.connect(mongoUri);
    const db = client.db("strategy");

    // Get account with Instagram credentials
    const account = await db.collection("accounts").findOne({ id: accountId });

    if (!account) {
      await client.close();
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Fetch Instagram baseline if connected
    let instagramBaseline: Baseline["instagram"] | undefined;

    if (account.platforms?.instagram?.connected && account.platforms?.instagram?.accessToken) {
      const igData = await fetchInstagramBaseline(
        account.platforms.instagram.accessToken,
        account.platforms.instagram.userId
      );
      if (igData) {
        instagramBaseline = igData;
      }
    }

    // Create baseline record
    const baseline: Baseline = {
      id: `baseline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      accountId,
      capturedAt: new Date(),
      period: "30d",
      instagram: instagramBaseline,
      clientEstimate: clientEstimate || undefined,
      notes: notes || `Baseline captured on ${new Date().toLocaleDateString()}`,
    };

    await db.collection("baselines").insertOne(baseline);
    await client.close();

    return NextResponse.json({
      success: true,
      baseline,
      message: "Baseline captured successfully",
    });

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
