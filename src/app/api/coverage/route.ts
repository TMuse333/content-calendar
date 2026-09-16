/**
 * Coverage API
 *
 * GET /api/coverage?accountId=xxx - Compute information point coverage for an account
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAccountById } from "@/lib/mongodb/accounts";
import type { Post, InformationPointCoverage, CampaignCoverage } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: "accountId is required" },
        { status: 400 }
      );
    }

    const account = await getAccountById(accountId);

    if (!account) {
      return NextResponse.json(
        { success: false, error: `Account "${accountId}" not found` },
        { status: 404 }
      );
    }

    if (!account.campaigns?.length) {
      return NextResponse.json({
        success: true,
        campaigns: [],
        overallProgress: 0,
      });
    }

    const db = await getDb();

    // Get all posted posts for this account
    const posts = await db
      .collection<Post>("posts")
      .find({ accountId, status: "posted" })
      .toArray();

    // Count posts per info point
    const postCounts: Record<string, { count: number; lastPosted?: Date }> = {};

    for (const post of posts) {
      for (const pointId of post.informationPointIds || []) {
        if (!postCounts[pointId]) {
          postCounts[pointId] = { count: 0 };
        }
        postCounts[pointId].count++;

        const postDate = post.postedAt || post.createdAt;
        if (!postCounts[pointId].lastPosted || postDate > postCounts[pointId].lastPosted!) {
          postCounts[pointId].lastPosted = postDate;
        }
      }
    }

    // Build coverage per campaign
    const campaignCoverages: CampaignCoverage[] = account.campaigns.map((campaign) => {
      const coverage: InformationPointCoverage[] = campaign.informationPoints.map((point) => {
        const data = postCounts[point.id] || { count: 0 };

        let status: "gap" | "light" | "covered";
        if (data.count === 0) {
          status = "gap";
        } else if (data.count < 3) {
          status = "light";
        } else {
          status = "covered";
        }

        return {
          id: point.id,
          text: point.text,
          postCount: data.count,
          lastPostedAt: data.lastPosted,
          status,
        };
      });

      const coveredCount = coverage.filter((c) => c.status === "covered").length;
      const overallProgress =
        campaign.informationPoints.length > 0
          ? coveredCount / campaign.informationPoints.length
          : 0;

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        coverage,
        overallProgress,
      };
    });

    // Overall progress across all campaigns
    const totalPoints = account.campaigns.reduce(
      (sum, c) => sum + c.informationPoints.length,
      0
    );
    const totalCovered = campaignCoverages.reduce(
      (sum, c) => sum + c.coverage.filter((p) => p.status === "covered").length,
      0
    );
    const overallProgress = totalPoints > 0 ? totalCovered / totalPoints : 0;

    return NextResponse.json({
      success: true,
      campaigns: campaignCoverages,
      overallProgress,
    });
  } catch (error) {
    console.error("Error computing coverage:", error);
    return NextResponse.json(
      { success: false, error: "Failed to compute coverage" },
      { status: 500 }
    );
  }
}
