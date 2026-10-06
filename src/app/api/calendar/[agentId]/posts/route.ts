/**
 * Calendar Posts API
 * GET  /api/calendar/:agentId/posts - List scheduled posts
 * POST /api/calendar/:agentId/posts - Create a new scheduled post
 *
 * Query params for GET:
 * - month: "2026-10" (optional)
 * - status: ScheduledPostStatus (optional)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createScheduledPost,
  getScheduledPostsByAgent,
} from "@/lib/mongodb/scheduled-posts";
import type { CreateScheduledPostRequest, ScheduledPostStatus } from "@/lib/types/scheduled-post";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ agentId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await params;
    const { searchParams } = request.nextUrl;

    const month = searchParams.get("month") || undefined;
    const status = searchParams.get("status") as ScheduledPostStatus | undefined;

    const posts = await getScheduledPostsByAgent(agentId, { month, status });

    return NextResponse.json({
      data: posts,
      count: posts.length,
    });
  } catch (error) {
    console.error("[api:calendar/posts GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId } = await params;
    const body: CreateScheduledPostRequest = await request.json();

    // Validate required fields
    if (!body.scheduledFor) {
      return NextResponse.json(
        { error: "scheduledFor is required" },
        { status: 400 }
      );
    }

    if (!body.intent || !body.intent.audience) {
      return NextResponse.json(
        { error: "intent.audience is required" },
        { status: 400 }
      );
    }

    const post = await createScheduledPost(agentId, body);

    return NextResponse.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("[api:calendar/posts POST]", error);
    return NextResponse.json(
      { error: "Failed to create scheduled post" },
      { status: 500 }
    );
  }
}
