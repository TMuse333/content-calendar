/**
 * Health Check API
 * GET /api/health
 *
 * Simple health check for other apps to verify Strategy App is online.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// CORS headers for cross-origin access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      app: "strategy",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      endpoints: {
        queue: "/api/graphics/queue?agentId={agentId}",
        embed: "/embed/queue/{agentId}",
        linkGraphic: "/api/calendar/{agentId}/posts/{postId}/link-graphic",
        review: "/api/review/{agentId}",
        pipeline: "/api/pipeline/status",
      },
    },
    { headers: corsHeaders }
  );
}
