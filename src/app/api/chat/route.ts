/**
 * Chat API
 * POST /api/chat
 *
 * Process chat messages with RAG context and Voss-style responses.
 * Supports both streaming and non-streaming modes.
 */

import { NextRequest, NextResponse } from "next/server";
import { processChat, streamChat } from "@/lib/chat";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// CORS headers for embeddable chat
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, sessionId, conversationId, message, topic, stream } = body;

    // Validate required fields
    if (!accountId || typeof accountId !== "string") {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Non-streaming mode
    if (!stream) {
      const response = await processChat({
        accountId,
        sessionId,
        conversationId,
        message: message.trim(),
        topic,
      });

      return NextResponse.json(response, { headers: corsHeaders });
    }

    // Streaming mode
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          await streamChat(
            {
              accountId,
              sessionId,
              conversationId,
              message: message.trim(),
              topic,
            },
            // On chunk
            (chunk) => {
              const data = JSON.stringify({ type: "chunk", content: chunk });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            // On complete
            (response) => {
              const data = JSON.stringify({ type: "done", ...response });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              controller.close();
            }
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          const data = JSON.stringify({ type: "error", error: errorMessage });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[api:chat]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to process chat", details: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}
