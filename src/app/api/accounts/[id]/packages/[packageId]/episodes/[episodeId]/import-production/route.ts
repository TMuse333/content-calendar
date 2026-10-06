/**
 * Import Production Data from video-system
 * POST /api/accounts/[id]/packages/[packageId]/episodes/[episodeId]/import-production
 *
 * Body: { seriesId: string, videoId: string }
 *
 * Fetches production metadata from video-system and stores it on the episode.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPackageById, updateEpisode } from "@/lib/mongodb/packages";
import type { ProductionData } from "@/lib/types/package";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; packageId: string; episodeId: string }>;
}

interface ImportRequest {
  seriesId: string;
  videoId: string;
}

const VIDEO_SYSTEM_URL = process.env.VIDEO_SYSTEM_URL || "http://localhost:3002";

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId, episodeId } = await params;

    // Verify account exists
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    // Get package and verify episode exists
    const pkg = await getPackageById(packageId);
    if (!pkg) {
      return NextResponse.json(
        { error: `Package "${packageId}" not found` },
        { status: 404 }
      );
    }

    if (pkg.accountId !== id) {
      return NextResponse.json(
        { error: "Package does not belong to this account" },
        { status: 403 }
      );
    }

    const episode = pkg.episodes.find((e) => e.id === episodeId);
    if (!episode) {
      return NextResponse.json(
        { error: `Episode "${episodeId}" not found` },
        { status: 404 }
      );
    }

    // Parse request body
    const body: ImportRequest = await request.json();

    if (!body.seriesId || !body.videoId) {
      return NextResponse.json(
        { error: "seriesId and videoId are required" },
        { status: 400 }
      );
    }

    // Fetch from video-system
    const exportUrl = `${VIDEO_SYSTEM_URL}/api/export/video/${body.seriesId}/${body.videoId}`;

    const res = await fetch(exportUrl);
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Failed to fetch from video-system: ${text}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    if (!data.json) {
      return NextResponse.json(
        { error: "Invalid response from video-system" },
        { status: 502 }
      );
    }

    // Transform to ProductionData
    const productionData: ProductionData = {
      importedAt: new Date(),
      videoSystemId: `${body.seriesId}/${body.videoId}`,
      topic: data.json.topic,
      transcript: data.json.transcript,
      hook: data.json.hook,
      keyPoints: data.json.keyPoints,
      techniques: data.json.techniques,
      preProductionNotes: data.json.preProductionNotes,
      animations: data.json.animations,
      animationPatterns: data.json.animationPatterns,
      summary: data.summary || undefined,
    };

    // Update episode with production data and duration
    await updateEpisode(packageId, episodeId, {
      productionData,
      duration: data.json.duration || undefined,
    });

    return NextResponse.json({
      success: true,
      productionData,
    });
  } catch (error) {
    console.error("[api:import-production]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to import production data: ${message}` },
      { status: 500 }
    );
  }
}
