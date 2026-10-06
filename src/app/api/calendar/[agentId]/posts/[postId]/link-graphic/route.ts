/**
 * Link Graphic Webhook
 * POST /api/calendar/:agentId/posts/:postId/link-graphic
 *
 * Called by Graphics App after a graphic is rendered.
 * Links the graphic to either:
 * - A ScheduledPost (pipeline system)
 * - A ScheduledCarousel (graphic packages system)
 *
 * Body: {
 *   graphicId: string,
 *   previewUrl?: string,
 *   graphicUrls?: string[],      // Multiple slides for carousels
 *   format?: string,             // Template used
 *   renderedAt?: string,         // ISO date
 *   metadata?: { ... }           // Additional render info
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getScheduledPostById,
  linkGraphicToPost,
} from "@/lib/mongodb/scheduled-posts";
import {
  getScheduledCarouselById,
  linkGraphicToCarousel,
} from "@/lib/mongodb/graphic-packages";

export const dynamic = "force-dynamic";

// CORS headers for cross-origin requests from Graphics App
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle preflight
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

interface RouteParams {
  params: Promise<{ agentId: string; postId: string }>;
}

interface LinkGraphicBody {
  graphicId: string;
  previewUrl?: string;
  graphicUrls?: string[];
  format?: string;
  renderedAt?: string;
  metadata?: {
    templateId?: string;
    dimensions?: { width: number; height: number };
    slideCount?: number;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { agentId, postId } = await params;
    const body: LinkGraphicBody = await request.json();

    // Validate
    if (!body.graphicId) {
      return NextResponse.json(
        { error: "graphicId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // First, try to find in ScheduledPosts (pipeline system)
    const scheduledPost = await getScheduledPostById(postId);
    if (scheduledPost && scheduledPost.agentId === agentId) {
      const updated = await linkGraphicToPost(
        postId,
        body.graphicId,
        body.previewUrl
      );

      console.log(
        `[link-graphic] Linked graphic ${body.graphicId} to ScheduledPost ${postId} for agent ${agentId}`
      );

      return NextResponse.json(
        {
          success: true,
          type: "scheduled_post",
          data: updated,
        },
        { headers: corsHeaders }
      );
    }

    // If not found, try ScheduledCarousels (graphic packages system)
    const scheduledCarousel = await getScheduledCarouselById(postId);
    if (scheduledCarousel) {
      const updated = await linkGraphicToCarousel(
        postId,
        body.graphicId,
        body.previewUrl,
        body.graphicUrls,
        {
          format: body.format,
          renderedAt: body.renderedAt ? new Date(body.renderedAt) : undefined,
          templateId: body.metadata?.templateId,
          dimensions: body.metadata?.dimensions,
          slideCount: body.metadata?.slideCount,
        }
      );

      console.log(
        `[link-graphic] Linked graphic ${body.graphicId} to ScheduledCarousel ${postId} for agent ${agentId}`
      );

      return NextResponse.json(
        {
          success: true,
          type: "scheduled_carousel",
          data: updated,
        },
        { headers: corsHeaders }
      );
    }

    // Not found in either collection
    return NextResponse.json(
      { error: "Post or carousel not found" },
      { status: 404, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[api:link-graphic]", error);
    return NextResponse.json(
      { error: "Failed to link graphic" },
      { status: 500, headers: corsHeaders }
    );
  }
}
