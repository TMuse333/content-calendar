/**
 * Greg Caseley Drive Content API
 *
 * GET /api/drive/greg-caseley
 *   Returns all content from Greg's Google Drive folder, parsed and organized.
 *
 * Query params:
 *   - bustCache: "true" to force a fresh fetch
 *   - type: "carousel" | "graphic" | "video" to filter by content type
 *   - preview: "true" | "false" to filter by preview status
 */

import { NextRequest, NextResponse } from "next/server";
import { getGregCaseleyContent, getContentByType } from "@/lib/drive";
import type { ContentItem } from "@/lib/drive/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bustCache = searchParams.get("bustCache") === "true";
    const typeFilter = searchParams.get("type") as "carousel" | "graphic" | "video" | null;
    const previewFilter = searchParams.get("preview");

    // Fetch content from Drive
    const content = await getGregCaseleyContent({ bustCache });

    // Apply type filter if specified
    let items: ContentItem[] = content.all;
    if (typeFilter && ["carousel", "graphic", "video"].includes(typeFilter)) {
      items = getContentByType(content, typeFilter);
    }

    // Apply preview filter if specified
    if (previewFilter === "true") {
      items = items.filter(item => item.isPreview);
    } else if (previewFilter === "false") {
      items = items.filter(item => !item.isPreview);
    }

    return NextResponse.json({
      success: true,
      data: {
        items,
        carousels: typeFilter ? undefined : content.carousels,
        graphics: typeFilter ? undefined : content.graphics,
        videos: typeFilter ? undefined : content.videos,
        metadata: {
          ...content.metadata,
          filteredCount: items.length,
          filters: {
            type: typeFilter,
            preview: previewFilter,
          },
        },
      },
    });
  } catch (error) {
    console.error("[api:drive:greg-caseley] Error fetching content:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Drive content",
      },
      { status: 500 }
    );
  }
}
