/**
 * Graphics Formats Proxy
 * GET /api/graphics/formats
 *
 * Proxies to Graphics App to fetch available carousel formats.
 * Avoids CORS issues by fetching server-side.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GRAPHICS_APP_URL = process.env.GRAPHICS_APP_URL || "http://localhost:3003";

export async function GET() {
  try {
    const res = await fetch(`${GRAPHICS_APP_URL}/api/formats`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch formats from Graphics App" },
        { status: res.status }
      );
    }

    const formats = await res.json();

    return NextResponse.json({
      data: formats, // Wizard expects 'data' key
      formats,
      source: GRAPHICS_APP_URL,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api:graphics/formats]", error);
    return NextResponse.json(
      { error: "Graphics App not available", details: String(error) },
      { status: 503 }
    );
  }
}
