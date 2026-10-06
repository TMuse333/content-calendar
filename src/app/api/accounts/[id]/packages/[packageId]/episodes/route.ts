/**
 * Episodes API
 * POST /api/accounts/[id]/packages/[packageId]/episodes - Add an episode
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import {
  getPackageById,
  addEpisode,
  refreshPackageStatus,
} from "@/lib/mongodb/packages";
import type { CreateEpisodeRequest } from "@/lib/types/package";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; packageId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId } = await params;

    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

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

    const body: CreateEpisodeRequest = await request.json();

    if (!body.title || body.number === undefined) {
      return NextResponse.json(
        { error: "Episode number and title are required" },
        { status: 400 }
      );
    }

    const episodeId = await addEpisode(packageId, body);
    await refreshPackageStatus(packageId);

    return NextResponse.json({ success: true, episodeId });
  } catch (error) {
    console.error("[api:episodes POST]", error);
    return NextResponse.json(
      { error: "Failed to add episode" },
      { status: 500 }
    );
  }
}
