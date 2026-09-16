/**
 * Single Post API
 * GET /api/accounts/[id]/posts/[postId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getPostByInstagramId } from "@/lib/mongodb/posts";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; postId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, postId } = await params;

    // Verify account exists
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    // Get the post
    const post = await getPostByInstagramId(id, postId);

    if (!post) {
      return NextResponse.json(
        { error: `Post "${postId}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: post });
  } catch (error) {
    console.error("[api:posts/[postId] GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}
