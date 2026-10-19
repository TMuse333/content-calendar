/**
 * Conversation History API
 * GET /api/chat/[conversationId]
 *
 * Retrieve a conversation by ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { getConversationById } from "@/lib/mongodb/conversations";

export const dynamic = "force-dynamic";

// CORS headers for embeddable chat
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const conversation = await getConversationById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Return conversation without internal MongoDB fields
    const { _id, ...rest } = conversation;
    return NextResponse.json(rest, { headers: corsHeaders });
  } catch (error) {
    console.error("[api:chat:get]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch conversation", details: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}
