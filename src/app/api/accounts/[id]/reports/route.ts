/**
 * Monthly Reports API
 *
 * GET - List all monthly reports for account
 * POST - Generate a report for a specific month
 */

import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import type { MonthlyReport, Baseline, Outcome } from "@/lib/types/results";
import type { Post } from "@/lib/types/post";

// Helper to get month boundaries
function getMonthBoundaries(year: number, month: number) {
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999); // Last day of month
  const label = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { start, end, label };
}

// Fetch fresh Instagram insights
async function fetchInstagramInsights(
  accessToken: string,
  userId: string,
  since: Date,
  until: Date
): Promise<{ profileVisits: number; reach: number; websiteClicks: number } | null> {
  try {
    const insightsUrl = new URL(`https://graph.facebook.com/v21.0/${userId}/insights`);
    insightsUrl.searchParams.set("metric", "reach,profile_views,website_clicks");
    insightsUrl.searchParams.set("period", "day");
    insightsUrl.searchParams.set("metric_type", "total_value");
    insightsUrl.searchParams.set("since", String(Math.floor(since.getTime() / 1000)));
    insightsUrl.searchParams.set("until", String(Math.floor(until.getTime() / 1000)));
    insightsUrl.searchParams.set("access_token", accessToken);

    const res = await fetch(insightsUrl.toString());
    const data = await res.json();

    if (data.error) {
      console.error("Instagram insights error:", data.error);
      return null;
    }

    let reach = 0;
    let profileVisits = 0;
    let websiteClicks = 0;

    for (const metric of data.data || []) {
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
      }
    }

    return { profileVisits, reach, websiteClicks };
  } catch (error) {
    console.error("Failed to fetch Instagram insights:", error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: accountId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const client = await MongoClient.connect(mongoUri);
    const db = client.db("strategy");

    // If year and month provided, get specific report with posts/outcomes
    if (year && month) {
      const reportId = `report_${year}_${month}_${accountId}`;
      const report = await db.collection("monthly_reports").findOne({ id: reportId });

      if (!report) {
        await client.close();
        return NextResponse.json({ report: null, exists: false });
      }

      // Get the period boundaries
      const { start, end } = getMonthBoundaries(parseInt(year), parseInt(month));

      // Get posts and outcomes for this period
      const [posts, outcomes, baseline] = await Promise.all([
        db.collection("posts")
          .find({ accountId, postedAt: { $gte: start, $lte: end } })
          .sort({ postedAt: -1 })
          .toArray(),
        db.collection("outcomes")
          .find({ accountId, occurredAt: { $gte: start, $lte: end } })
          .toArray(),
        db.collection("baselines")
          .findOne({ accountId, capturedAt: { $lte: end } }, { sort: { capturedAt: -1 } }),
      ]);

      const totalReach = posts.reduce((sum, p) => sum + (p.metrics?.reach || 0), 0);
      const totalEngagement = posts.reduce((sum, p) => sum + (p.metrics?.engagement || 0), 0);

      await client.close();

      return NextResponse.json({
        report: {
          ...report,
          posts,
          outcomes,
          baseline,
          dataSource: report.dataSource || "baseline",
          stats: {
            postsCount: posts.length,
            totalReach,
            totalEngagement,
            outcomesCount: outcomes.length,
          },
        },
        exists: true,
      });
    }

    // Otherwise list all reports
    const reports = await db
      .collection("monthly_reports")
      .find({ accountId })
      .sort({ "period.start": -1 })
      .toArray();

    await client.close();

    return NextResponse.json({
      reports,
      count: reports.length,
    });
  } catch (error) {
    console.error("Reports fetch error:", error);
    return NextResponse.json({
      error: "Failed to fetch reports",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: accountId } = await params;

  try {
    const body = await request.json();
    const { year, month } = body; // month is 0-indexed (0 = January)

    if (year === undefined || month === undefined) {
      return NextResponse.json(
        { error: "Year and month are required" },
        { status: 400 }
      );
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const client = await MongoClient.connect(mongoUri);
    const db = client.db("strategy");

    const { start, end, label } = getMonthBoundaries(year, month);

    // Get account with Instagram credentials
    const account = await db.collection("accounts").findOne({ id: accountId });

    // Fetch fresh Instagram insights for this period
    let liveInsights: { profileVisits: number; reach: number; websiteClicks: number } | null = null;
    if (account?.platforms?.instagram?.connected && account?.platforms?.instagram?.accessToken) {
      liveInsights = await fetchInstagramInsights(
        account.platforms.instagram.accessToken,
        account.platforms.instagram.userId,
        start,
        end
      );
    }

    // Get posts from this month
    const posts = await db
      .collection("posts")
      .find({
        accountId,
        postedAt: { $gte: start, $lte: end },
      })
      .sort({ postedAt: -1 })
      .toArray() as unknown as Post[];

    // Get outcomes from this month
    const outcomes = await db
      .collection("outcomes")
      .find({
        accountId,
        occurredAt: { $gte: start, $lte: end },
      })
      .toArray() as unknown as Outcome[];

    // Get baseline closest to start of month (or most recent before)
    const baseline = await db
      .collection("baselines")
      .findOne({
        accountId,
        capturedAt: { $lte: end },
      }, { sort: { capturedAt: -1 } }) as unknown as Baseline | null;

    // Calculate headline metrics
    const meetings = outcomes.filter((o) => o.type === "meeting").length;
    const inquiries = outcomes.filter((o) => ["inquiry", "dm", "call"].includes(o.type)).length;
    const deals = outcomes.filter((o) => o.type === "deal").length;
    const revenue = outcomes
      .filter((o) => o.type === "deal" && o.value)
      .reduce((sum, o) => sum + (o.value || 0), 0);

    // Calculate funnel from posts
    const totalReach = posts.reduce((sum, p) => sum + (p.metrics?.reach || 0), 0);
    const totalEngagement = posts.reduce((sum, p) => sum + (p.metrics?.engagement || 0), 0);

    // Get top performing posts
    const topContent = posts
      .sort((a, b) => (b.metrics?.reach || 0) - (a.metrics?.reach || 0))
      .slice(0, 3)
      .map((p) => ({
        contentId: p.instagramId,
        caption: p.caption?.slice(0, 100),
        metric: "reach",
        value: p.metrics?.reach || 0,
      }));

    // Use live insights if available, otherwise fall back to baseline
    const funnelProfileVisits = liveInsights?.profileVisits ?? baseline?.instagram?.profileVisits ?? 0;
    const funnelLinkClicks = liveInsights?.websiteClicks ?? baseline?.instagram?.websiteClicks ?? 0;
    const funnelReach = liveInsights?.reach ?? totalReach;

    // Build the report
    const report: MonthlyReport = {
      id: `report_${year}_${month}_${accountId}`,
      accountId,
      period: {
        start,
        end,
        month: label,
      },
      headline: {
        meetings,
        meetingsBaseline: baseline?.clientEstimate?.meetingsPerMonth || 0,
        inquiries,
        inquiriesBaseline: baseline?.clientEstimate?.inquiriesPerMonth || 0,
        deals,
        revenue,
      },
      funnel: {
        views: funnelReach,
        profileVisits: funnelProfileVisits,
        linkClicks: funnelLinkClicks,
        siteVisits: 0, // Would come from website tracking
        dmsAndForms: inquiries,
        booked: meetings,
      },
      attributions: [], // TODO: Build from outcome attributions
      topContent,
      generatedAt: new Date(),
    };

    // Upsert the report (replace if exists for this month)
    // Include dataSource in saved report
    const reportToSave = {
      ...report,
      dataSource: liveInsights ? "live" : "baseline",
    };
    await db.collection("monthly_reports").updateOne(
      { id: report.id },
      { $set: reportToSave },
      { upsert: true }
    );

    // Also return the posts and outcomes for display
    const enrichedReport = {
      ...report,
      posts,
      outcomes,
      baseline,
      liveInsights, // Fresh data from Instagram API
      dataSource: liveInsights ? "live" : "baseline", // Indicates data freshness
      stats: {
        postsCount: posts.length,
        totalReach,
        totalEngagement,
        outcomesCount: outcomes.length,
      },
    };

    await client.close();

    return NextResponse.json({
      success: true,
      report: enrichedReport,
      message: `${label} report generated`,
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json({
      error: "Failed to generate report",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
