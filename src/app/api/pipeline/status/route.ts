/**
 * Pipeline Status API
 * GET /api/pipeline/status
 *
 * Checks health of connected apps and returns pipeline statistics.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface AppStatus {
  name: string;
  url: string;
  status: "connected" | "disconnected" | "error";
  latency?: number;
  details?: Record<string, unknown>;
  error?: string;
}

async function checkGraphicsApp(): Promise<AppStatus> {
  const url = process.env.NEXT_PUBLIC_GRAPHICS_APP_URL || "http://localhost:3003";
  const start = Date.now();

  try {
    // Try to fetch formats endpoint
    const res = await fetch(`${url}/api/formats`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return {
        name: "Graphics App",
        url,
        status: "error",
        error: `HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const latency = Date.now() - start;

    // Handle both array response and { formats: [] } response
    const formats = Array.isArray(data) ? data : data.formats || [];

    return {
      name: "Graphics App",
      url,
      status: "connected",
      latency,
      details: {
        formatsCount: formats.length,
        formats: formats.map((f: { id: string; name: string }) => ({
          id: f.id,
          name: f.name,
        })),
      },
    };
  } catch (error) {
    return {
      name: "Graphics App",
      url,
      status: "disconnected",
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

async function checkAgentApp(): Promise<AppStatus> {
  const url = process.env.NEXT_PUBLIC_AGENT_APP_URL || "http://localhost:3002";
  const start = Date.now();

  try {
    // Try to fetch health endpoint
    const res = await fetch(`${url}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return {
        name: "Agent App",
        url,
        status: "error",
        error: `HTTP ${res.status}`,
      };
    }

    const latency = Date.now() - start;

    return {
      name: "Agent App",
      url,
      status: "connected",
      latency,
      details: {
        note: "Knowledge collection system",
      },
    };
  } catch {
    // Agent App may not exist yet - that's expected
    return {
      name: "Agent App",
      url,
      status: "disconnected",
      error: "Not configured (future)",
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const agentId = searchParams.get("agentId");

    // Check all connected apps in parallel
    const [graphicsApp, agentApp] = await Promise.all([
      checkGraphicsApp(),
      checkAgentApp(),
    ]);

    // Get pipeline stats if agentId provided
    let pipelineStats = null;
    if (agentId) {
      try {
        const { getPostsByStatusGroups } = await import(
          "@/lib/mongodb/scheduled-posts"
        );
        const groups = await getPostsByStatusGroups(agentId);

        pipelineStats = {
          proposed: groups.proposed?.length || 0,
          scheduled: groups.scheduled?.length || 0,
          contentReady: groups["content-ready"]?.length || 0,
          rendered: groups.rendered?.length || 0,
          inReview: groups["in-review"]?.length || 0,
          revision: groups.revision?.length || 0,
          approved: groups.approved?.length || 0,
          posted: groups.posted?.length || 0,
        };
      } catch (error) {
        console.error("Failed to get pipeline stats:", error);
      }
    }

    return NextResponse.json({
      apps: [graphicsApp, agentApp],
      pipeline: pipelineStats,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api:pipeline/status]", error);
    return NextResponse.json(
      { error: "Failed to check pipeline status" },
      { status: 500 }
    );
  }
}
