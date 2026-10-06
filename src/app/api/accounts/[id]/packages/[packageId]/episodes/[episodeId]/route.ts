/**
 * Single Episode API
 * GET /api/accounts/[id]/packages/[packageId]/episodes/[episodeId] - Get an episode
 * PUT /api/accounts/[id]/packages/[packageId]/episodes/[episodeId] - Update an episode
 * DELETE /api/accounts/[id]/packages/[packageId]/episodes/[episodeId] - Delete an episode
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import {
  getPackageById,
  getEpisode,
  updateEpisode,
  deleteEpisode,
  refreshPackageStatus,
} from "@/lib/mongodb/packages";
import type { UpdateEpisodeRequest } from "@/lib/types/package";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; packageId: string; episodeId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId, episodeId } = await params;

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

    const episode = await getEpisode(packageId, episodeId);
    if (!episode) {
      return NextResponse.json(
        { error: `Episode "${episodeId}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: episode });
  } catch (error) {
    console.error("[api:episodes/[episodeId] GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch episode" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId, episodeId } = await params;

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

    const episode = pkg.episodes.find((e) => e.id === episodeId);
    if (!episode) {
      return NextResponse.json(
        { error: `Episode "${episodeId}" not found` },
        { status: 404 }
      );
    }

    const body: UpdateEpisodeRequest = await request.json();
    const success = await updateEpisode(packageId, episodeId, body);
    await refreshPackageStatus(packageId);

    return NextResponse.json({ success });
  } catch (error) {
    console.error("[api:episodes/[episodeId] PUT]", error);
    return NextResponse.json(
      { error: "Failed to update episode" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId, episodeId } = await params;

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

    const success = await deleteEpisode(packageId, episodeId);
    await refreshPackageStatus(packageId);

    return NextResponse.json({ success });
  } catch (error) {
    console.error("[api:episodes/[episodeId] DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete episode" },
      { status: 500 }
    );
  }
}
