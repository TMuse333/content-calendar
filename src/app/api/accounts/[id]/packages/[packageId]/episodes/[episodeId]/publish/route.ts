/**
 * Publish Episode API
 * POST /api/accounts/[id]/packages/[packageId]/episodes/[episodeId]/publish
 *
 * Publishes an episode's video to Instagram as a Reel.
 * Requires: videoUrl (publicly accessible URL)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import {
  getPackageById,
  updateEpisode,
  refreshPackageStatus,
} from "@/lib/mongodb/packages";
import { upsertPost } from "@/lib/mongodb/posts";
import { uploadToInstagram } from "@/lib/platforms/instagram";
import type { Post } from "@/lib/types/post";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; packageId: string; episodeId: string }>;
}

interface PublishRequest {
  videoUrl: string;
  thumbnailUrl?: string; // Cover image URL
  caption?: string;
  scheduledAt?: string; // ISO date string for scheduling
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, packageId, episodeId } = await params;

    // Get account and verify Instagram connection
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    const instagram = account.platforms?.instagram;
    if (!instagram?.connected || !instagram.userId || !instagram.accessToken) {
      return NextResponse.json(
        { error: "Instagram not connected for this account" },
        { status: 400 }
      );
    }

    // Get package and episode
    const pkg = await getPackageById(packageId);
    if (!pkg) {
      return NextResponse.json(
        { error: `Package "${packageId}" not found` },
        { status: 404 }
      );
    }

    if (pkg.accountId !== id) {
      return NextResponse.json(
        { error: "Package does not belong to this account" },
        { status: 403 }
      );
    }

    const episode = pkg.episodes.find((e) => e.id === episodeId);
    if (!episode) {
      return NextResponse.json(
        { error: `Episode "${episodeId}" not found` },
        { status: 404 }
      );
    }

    // Parse request
    const body: PublishRequest = await request.json();

    if (!body.videoUrl) {
      return NextResponse.json(
        { error: "videoUrl is required" },
        { status: 400 }
      );
    }

    // Build caption (use provided or generate from episode)
    const caption = body.caption || buildCaption(episode, pkg);

    // Publish to Instagram as Reel
    const result = await uploadToInstagram(
      {
        mediaUrl: body.videoUrl,
        mediaType: "REELS",
        caption,
        thumbnailUrl: body.thumbnailUrl,
        scheduledTime: body.scheduledAt,
      },
      {
        instagramId: instagram.userId,
        accessToken: instagram.accessToken,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to publish to Instagram" },
        { status: 500 }
      );
    }

    // Update episode with publish info
    const publishedAt = new Date();
    await updateEpisode(packageId, episodeId, {
      status: result.scheduled ? "ready" : "published",
      instagramId: result.instagramId || undefined,
      postPermalink: result.permalink || undefined,
      scheduledAt: result.scheduledFor ? new Date(result.scheduledFor) : undefined,
      publishedAt: result.scheduled ? undefined : publishedAt,
    });

    await refreshPackageStatus(packageId);

    // Create post entry for calendar/library (if not scheduled)
    if (!result.scheduled && result.instagramId) {
      const newPost: Omit<Post, "_id"> = {
        accountId: id,
        instagramId: result.instagramId,
        mediaType: "VIDEO",
        mediaUrl: body.videoUrl,
        thumbnailUrl: body.thumbnailUrl,
        caption,
        permalink: result.permalink || `https://www.instagram.com/p/${result.instagramId}/`,
        postedAt: publishedAt,
        metrics: {
          likes: 0,
          comments: 0,
          reach: 0,
          impressions: 0,
          engagement: 0,
          videoViews: 0,
        },
        syncedAt: publishedAt,
        updatedAt: publishedAt,
      };
      await upsertPost(newPost);
    }

    return NextResponse.json({
      success: true,
      instagramId: result.instagramId,
      permalink: result.permalink,
      scheduled: result.scheduled,
      scheduledFor: result.scheduledFor,
    });
  } catch (error) {
    console.error("[api:episodes/[episodeId]/publish POST]", error);
    return NextResponse.json(
      { error: "Failed to publish episode" },
      { status: 500 }
    );
  }
}

function buildCaption(
  episode: { title: string; about?: string; number: number },
  pkg: { name: string }
): string {
  const lines: string[] = [];

  // Title
  lines.push(episode.title);

  // About/description if present
  if (episode.about) {
    lines.push("");
    lines.push(episode.about);
  }

  // Series info
  lines.push("");
  lines.push(`Episode ${episode.number} of ${pkg.name}`);

  // Default hashtags
  lines.push("");
  lines.push("#syntellic #videomarketing #contentcreation");

  return lines.join("\n");
}
