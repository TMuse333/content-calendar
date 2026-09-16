/**
 * Posts API
 *
 * GET  /api/posts - List posts with optional filters
 * POST /api/posts - Create a new post
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Post, CreatePostRequest } from "@/lib/schema";

export const dynamic = "force-dynamic";

// GET /api/posts - List posts with optional filters
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = req.nextUrl;

    const accountId = searchParams.get("accountId");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query
    const query: Record<string, unknown> = {};

    if (accountId) {
      query.accountId = accountId;
    }

    if (status) {
      query.status = status;
    }

    if (from || to) {
      query.scheduledFor = {};
      if (from) {
        (query.scheduledFor as Record<string, Date>).$gte = new Date(from);
      }
      if (to) {
        (query.scheduledFor as Record<string, Date>).$lte = new Date(to);
      }
    }

    const posts = await db
      .collection<Post>("posts")
      .find(query)
      .sort({ scheduledFor: -1, createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      posts,
      count: posts.length,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

// POST /api/posts - Create a new post
export async function POST(req: Request) {
  try {
    const body: CreatePostRequest & { accountId: string } = await req.json();
    const db = await getDb();

    if (!body.accountId) {
      return NextResponse.json(
        { success: false, error: "accountId is required" },
        { status: 400 }
      );
    }

    const post: Post = {
      accountId: body.accountId,
      caption: body.caption,
      media: body.media,
      campaignId: body.campaignId,
      informationPointIds: body.informationPointIds || [],
      underlyingNeed: body.underlyingNeed,
      deliveryNotes: body.deliveryNotes,
      platform: body.platform,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      status: body.status || "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<Post>("posts").insertOne(post);

    return NextResponse.json({
      success: true,
      postId: result.insertedId.toString(),
      post: { ...post, _id: result.insertedId },
    });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create post" },
      { status: 500 }
    );
  }
}
