/**
 * Onboarding API
 * GET /api/onboard/[accountId] - Fetch account and onboarding data (public)
 * PATCH /api/onboard/[accountId] - Update onboarding config (authenticated)
 *
 * This endpoint is PUBLIC - no authentication required for GET.
 * Used by the client-facing onboarding page.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById, updateAccount } from "@/lib/mongodb/accounts";
import clientPromise from "@/lib/mongodb/clientPromise";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ accountId: string }>;
}

interface OnboardingConfig {
  welcomeMessage?: string;
  proposedSchedule?: {
    postsPerWeek: number;
    contentMix: { type: string; percentage: number }[];
    startDate?: string;
  };
  questions?: { id: string; question: string; required?: boolean }[];
  expectedResults?: {
    baseline?: { followers?: number; avgReach?: number; avgEngagement?: number };
    targets?: { followers?: number; avgReach?: number; avgEngagement?: number };
    timeline?: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = await params;

    // Fetch account
    const account = await getAccountById(accountId);
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const client = await clientPromise;
    const db = client.db("strategy");

    // Fetch onboarding config if exists (for custom questions, expected results, etc.)
    let onboardingDoc: Record<string, unknown> | null = null;
    try {
      onboardingDoc = await db.collection("onboarding").findOne({ accountId });
    } catch (err) {
      console.error("[api:onboard] Failed to fetch onboarding config:", err);
    }

    // Build proposed schedule from actual account data
    let proposedSchedule: OnboardingConfig["proposedSchedule"] | undefined;

    // 1. Get postsPerWeek from active campaigns
    const activeCampaigns = account.campaigns?.filter(c => c.status === "active") || [];
    const totalPostsPerWeek = activeCampaigns.reduce((sum, c) => sum + (c.postsPerWeek || 0), 0);

    // 2. Get scheduled content (carousels from graphic packages)
    const now = new Date();

    // First get all carousel packages for this account
    const carouselPackages = await db.collection("graphic_packages")
      .find({ accountId, type: "carousels" })
      .toArray();

    let scheduledCarousels: Record<string, unknown>[] = [];

    if (carouselPackages.length > 0) {
      const packageIds = carouselPackages.map(p => p.id);
      const packageMap = new Map(carouselPackages.map(p => [p.id, p.name]));

      // Get scheduled carousels from graphic_scheduled collection
      scheduledCarousels = await db.collection("graphic_scheduled")
        .find({
          packageId: { $in: packageIds },
          scheduledDate: { $gte: now },
        })
        .sort({ scheduledDate: 1 })
        .limit(20)
        .toArray();

      // Add package name to each carousel
      scheduledCarousels = scheduledCarousels.map(c => ({
        ...c,
        packageName: packageMap.get(c.packageId as string),
      }));
    }

    // 3. Get video packages with scheduled episodes
    const videoPackages = await db.collection("packages")
      .find({
        accountId,
        status: { $in: ["planning", "in_production", "publishing"] },
      })
      .toArray();

    // Count scheduled videos from packages
    const scheduledVideos = videoPackages.flatMap(pkg =>
      (pkg.episodes || []).filter((ep: { scheduledAt?: Date; status?: string }) =>
        ep.scheduledAt && new Date(ep.scheduledAt) >= now && ep.status !== "published"
      )
    );

    // Calculate content mix
    const contentMix: { type: string; percentage: number }[] = [];
    const totalScheduled = scheduledCarousels.length + scheduledVideos.length;

    if (totalScheduled > 0) {
      if (scheduledVideos.length > 0) {
        contentMix.push({
          type: "Video",
          percentage: Math.round((scheduledVideos.length / totalScheduled) * 100),
        });
      }
      if (scheduledCarousels.length > 0) {
        contentMix.push({
          type: "Carousel",
          percentage: Math.round((scheduledCarousels.length / totalScheduled) * 100),
        });
      }
    } else if (totalPostsPerWeek > 0) {
      // Default mix if no scheduled content yet
      contentMix.push({ type: "Video", percentage: 70 });
      contentMix.push({ type: "Carousel", percentage: 30 });
    }

    // Find earliest scheduled date
    let startDate: string | undefined;
    const allScheduledDates = [
      ...scheduledCarousels.map(c => c.scheduledDate || c.scheduledAt),
      ...scheduledVideos.map((v: { scheduledAt?: Date }) => v.scheduledAt),
    ].filter(Boolean).map(d => new Date(d as string | number | Date));

    if (allScheduledDates.length > 0) {
      startDate = new Date(Math.min(...allScheduledDates.map(d => d.getTime()))).toISOString();
    } else if (activeCampaigns.length > 0 && activeCampaigns[0].startDate) {
      startDate = new Date(activeCampaigns[0].startDate).toISOString();
    }

    // Build schedule if we have data
    if (totalPostsPerWeek > 0 || totalScheduled > 0) {
      proposedSchedule = {
        postsPerWeek: totalPostsPerWeek || Math.ceil(totalScheduled / 4), // Estimate if no campaign data
        contentMix,
        startDate,
      };
    }

    // Build onboarding response
    const onboarding: OnboardingConfig = {
      welcomeMessage: onboardingDoc?.welcomeMessage as string | undefined,
      proposedSchedule: proposedSchedule || (onboardingDoc?.proposedSchedule as OnboardingConfig["proposedSchedule"]),
      questions: onboardingDoc?.questions as OnboardingConfig["questions"],
      expectedResults: onboardingDoc?.expectedResults as OnboardingConfig["expectedResults"],
    };

    // Add upcoming content preview
    const upcomingContent = [
      ...scheduledCarousels.slice(0, 5).map(c => {
        const brief = c.brief as { hook?: string } | undefined;
        return {
          type: "carousel" as const,
          title: (brief?.hook || c.question || c.title || "Carousel") as string,
          scheduledAt: (c.scheduledDate || c.scheduledAt) as string | Date,
        };
      }),
      ...scheduledVideos.slice(0, 5).map((v: { title?: string; scheduledAt?: Date }) => ({
        type: "video" as const,
        title: v.title || "Video",
        scheduledAt: v.scheduledAt as string | Date | undefined,
      })),
    ].sort((a, b) => new Date(a.scheduledAt as string | Date).getTime() - new Date(b.scheduledAt as string | Date).getTime());

    // Return sanitized account data (no tokens, no sensitive info)
    return NextResponse.json({
      account: {
        id: account.id,
        name: account.name,
        handle: account.handle,
        brand: account.brand,
        platforms: {
          instagram: account.platforms?.instagram
            ? {
                connected: account.platforms.instagram.connected,
                username: account.platforms.instagram.username,
              }
            : undefined,
        },
      },
      onboarding: Object.values(onboarding).some(v => v !== undefined) ? onboarding : null,
      upcomingContent: upcomingContent.length > 0 ? upcomingContent : undefined,
      videoPackages: videoPackages.length > 0 ? videoPackages.map(pkg => ({
        name: pkg.name,
        description: pkg.description,
        goal: pkg.goal,
        episodeCount: pkg.episodes?.length || 0,
        status: pkg.status,
      })) : undefined,
    });
  } catch (error) {
    console.error("[api:onboard] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding data" },
      { status: 500 }
    );
  }
}

// PATCH - Update onboarding config (for admin use)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = await params;
    const body = await request.json();

    // Verify account exists
    const account = await getAccountById(accountId);
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    const client = await clientPromise;
    const db = client.db("strategy");

    // Upsert onboarding config
    await db.collection("onboarding").updateOne(
      { accountId },
      {
        $set: {
          accountId,
          ...body,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api:onboard] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update onboarding config" },
      { status: 500 }
    );
  }
}
