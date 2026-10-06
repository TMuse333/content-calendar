/**
 * Publish Episode with SSE Streaming
 * POST /api/accounts/[id]/packages/[packageId]/episodes/[episodeId]/publish-stream
 *
 * Streams status updates during the publish process.
 */

import { NextRequest } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import {
  getPackageById,
  updateEpisode,
  refreshPackageStatus,
} from "@/lib/mongodb/packages";
import { upsertPost } from "@/lib/mongodb/posts";
import type { InstagramCredentials } from "@/lib/platforms/instagram";
import type { Post } from "@/lib/types/post";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; packageId: string; episodeId: string }>;
}

interface PublishRequest {
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
}

type PublishStep = "container" | "uploading" | "processing" | "publishing" | "done" | "error";

function createSSEMessage(step: PublishStep, message: string, data?: Record<string, unknown>) {
  return `data: ${JSON.stringify({ step, message, ...data })}\n\n`;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id, packageId, episodeId } = await params;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (step: PublishStep, message: string, data?: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(createSSEMessage(step, message, data)));
      };

      try {
        // Get account and verify Instagram connection
        const account = await getAccountById(id);
        if (!account) {
          send("error", `Account "${id}" not found`);
          controller.close();
          return;
        }

        const instagram = account.platforms?.instagram;
        if (!instagram?.connected || !instagram.userId || !instagram.accessToken) {
          send("error", "Instagram not connected for this account");
          controller.close();
          return;
        }

        // Get package and episode
        const pkg = await getPackageById(packageId);
        if (!pkg) {
          send("error", `Package "${packageId}" not found`);
          controller.close();
          return;
        }

        if (pkg.accountId !== id) {
          send("error", "Package does not belong to this account");
          controller.close();
          return;
        }

        const episode = pkg.episodes.find((e) => e.id === episodeId);
        if (!episode) {
          send("error", `Episode "${episodeId}" not found`);
          controller.close();
          return;
        }

        // Parse request body
        const body: PublishRequest = await request.json();

        if (!body.videoUrl) {
          send("error", "videoUrl is required");
          controller.close();
          return;
        }

        // Build caption
        const caption = body.caption || buildCaption(episode, pkg);

        const credentials: InstagramCredentials = {
          instagramId: instagram.userId,
          accessToken: instagram.accessToken,
        };

        // Step 1: Create media container
        send("container", "Creating media container...");

        const containerPayload: Record<string, string | number> = {
          media_type: "REELS",
          video_url: body.videoUrl,
          caption: caption || "",
        };

        if (body.thumbnailUrl) {
          containerPayload.cover_url = body.thumbnailUrl;
        }

        const containerRes = await fetch(
          `https://graph.facebook.com/v21.0/${credentials.instagramId}/media?access_token=${credentials.accessToken}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(containerPayload),
          }
        );

        const containerData = await containerRes.json();

        if (!containerData.id) {
          send("error", containerData.error?.message || "Failed to create media container");
          controller.close();
          return;
        }

        send("uploading", "Uploading video to Instagram...", { containerId: containerData.id });

        // Step 2: Poll for processing status
        send("processing", "Processing video...", { progress: 0 });

        let attempts = 0;
        const maxAttempts = 60; // Up to 2 minutes
        let statusCode = "IN_PROGRESS";

        while (statusCode === "IN_PROGRESS" && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const statusRes = await fetch(
            `https://graph.facebook.com/v21.0/${containerData.id}?fields=status_code&access_token=${credentials.accessToken}`
          );
          const statusData = await statusRes.json();
          statusCode = statusData.status_code || "IN_PROGRESS";
          attempts++;

          const progress = Math.min(95, Math.round((attempts / maxAttempts) * 100));
          send("processing", `Processing video... (${attempts * 2}s)`, { progress, statusCode });

          if (statusCode === "ERROR") {
            send("error", "Video processing failed on Instagram's side");
            controller.close();
            return;
          }
        }

        if (statusCode !== "FINISHED") {
          send("error", `Video processing timed out (status: ${statusCode})`);
          controller.close();
          return;
        }

        // Step 3: Publish
        send("publishing", "Publishing to Instagram...");

        const publishRes = await fetch(
          `https://graph.facebook.com/v21.0/${credentials.instagramId}/media_publish?access_token=${credentials.accessToken}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ creation_id: containerData.id }),
          }
        );

        const publishData = await publishRes.json();

        if (!publishData.id) {
          send("error", publishData.error?.message || "Failed to publish");
          controller.close();
          return;
        }

        // Fetch the published post to get thumbnail
        const postRes = await fetch(
          `https://graph.facebook.com/v21.0/${publishData.id}?fields=id,permalink,thumbnail_url,media_url&access_token=${credentials.accessToken}`
        );
        const postData = await postRes.json();

        // Update episode
        const publishedAt = new Date();
        await updateEpisode(packageId, episodeId, {
          status: "published",
          instagramId: publishData.id,
          postPermalink: postData.permalink || `https://www.instagram.com/p/${publishData.id}/`,
          publishedAt,
        });

        await refreshPackageStatus(packageId);

        // Create post entry for calendar/library
        const newPost: Omit<Post, "_id"> = {
          accountId: id,
          instagramId: publishData.id,
          mediaType: "VIDEO",
          mediaUrl: body.videoUrl,
          thumbnailUrl: postData.thumbnail_url || postData.media_url || body.thumbnailUrl,
          caption,
          permalink: postData.permalink || `https://www.instagram.com/p/${publishData.id}/`,
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

        send("done", "Published successfully!", {
          instagramId: publishData.id,
          permalink: postData.permalink || `https://www.instagram.com/p/${publishData.id}/`,
          thumbnailUrl: postData.thumbnail_url || postData.media_url,
        });

        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(encoder.encode(createSSEMessage("error", message)));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function buildCaption(
  episode: { title: string; about?: string; number: number },
  pkg: { name: string }
): string {
  const lines: string[] = [];
  lines.push(episode.title);
  if (episode.about) {
    lines.push("");
    lines.push(episode.about);
  }
  lines.push("");
  lines.push(`Episode ${episode.number} of ${pkg.name}`);
  lines.push("");
  lines.push("#syntellic #videomarketing #contentcreation");
  return lines.join("\n");
}
