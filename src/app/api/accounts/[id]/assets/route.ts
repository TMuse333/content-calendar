/**
 * Assets API
 * GET /api/accounts/:id/assets - List assets
 * POST /api/accounts/:id/assets - Upload and create asset
 */

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getAssets, getAssetLibrary, createAsset } from "@/lib/mongodb/assets";
import type { AssetType, AssetStatus } from "@/lib/types/asset";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/accounts/:id/assets
 * Query params: type, status, grouped
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: accountId } = await params;
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") as AssetType | null;
    const status = searchParams.get("status") as AssetStatus | null;
    const grouped = searchParams.get("grouped") === "true";

    if (grouped) {
      const library = await getAssetLibrary(accountId);
      return NextResponse.json({ data: library });
    }

    const assets = await getAssets(accountId, {
      type: type || undefined,
      status: status || undefined,
    });

    return NextResponse.json({ data: assets, count: assets.length });
  } catch (error) {
    console.error("[api:assets:get]", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounts/:id/assets
 * Supports two modes:
 * 1. File upload (multipart form data)
 * 2. URL reference (JSON body with url field)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: accountId } = await params;
    const contentType = request.headers.get("content-type") || "";

    // Check if it's a JSON request (URL mode)
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { url, name, type, tags, isPrimary } = body;

      if (!url) {
        return NextResponse.json(
          { error: "URL is required" },
          { status: 400 }
        );
      }

      if (!type) {
        return NextResponse.json(
          { error: "Asset type is required" },
          { status: 400 }
        );
      }

      // Create asset with external URL
      const asset = await createAsset(accountId, {
        name: name || new URL(url).pathname.split("/").pop() || "External Image",
        filename: "external",
        url,
        type,
        tags: tags || [],
        isPrimary: isPrimary || false,
        mimeType: "image/external",
      });

      return NextResponse.json({ data: asset }, { status: 201 });
    }

    // File upload mode (multipart form data)
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const type = formData.get("type") as AssetType | null;
    const tagsRaw = formData.get("tags") as string | null;
    const isPrimary = formData.get("isPrimary") === "true";

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: "Asset type is required" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const filename = `${accountId}/${type}/${Date.now()}-${file.name}`;
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    });

    // Parse tags
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

    // Get image dimensions (basic - could use sharp for better handling)
    // For now, we'll skip dimensions and let the client provide them if needed

    // Create asset record
    const asset = await createAsset(accountId, {
      name: name || file.name.replace(/\.[^.]+$/, ""),
      filename: file.name,
      url: blob.url,
      type,
      tags,
      size: file.size,
      mimeType: file.type,
      isPrimary,
    });

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    console.error("[api:assets:post]", error);
    return NextResponse.json(
      { error: "Failed to upload asset" },
      { status: 500 }
    );
  }
}
