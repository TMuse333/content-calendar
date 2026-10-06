// Instagram/Meta API types and helpers
// Ported from video-system

export interface InstagramPost {
  instagramId: string;
  caption?: string;
  mediaType: "VIDEO" | "IMAGE" | "CAROUSEL_ALBUM";
  mediaUrl: string;
  thumbnailUrl?: string;
  permalink: string;
  timestamp: string;
  likes?: number;
  comments?: number;
}

export interface InstagramInsights {
  postId: string;
  impressions: number;
  reach: number;
  engagement: number;
  videoViews?: number;
}

export interface UploadRequest {
  mediaUrl: string;
  mediaType: "REELS" | "VIDEO" | "IMAGE";
  caption?: string;
  thumbnailUrl?: string; // Cover image URL for Reels
  scheduledTime?: string; // ISO date string
}

export interface UploadResponse {
  success: boolean;
  instagramId?: string;
  permalink?: string;
  scheduled?: boolean;
  scheduledFor?: string;
  containerId?: string;
  error?: string;
}

export interface MetaConnectionStatus {
  connected: boolean;
  instagramId?: string;
  username?: string;
  error?: string;
}

export interface PostWithInsights {
  id: string;
  caption: string;
  mediaType: string;
  thumbnailUrl: string;
  timestamp: string;
  impressions: number;
  reach: number;
  engagement: number;
  videoViews: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
}

// Credentials type for per-account support
export interface InstagramCredentials {
  instagramId: string;
  accessToken: string;
}

// Helper to get credentials (from params or env vars)
export function getInstagramCredentials(creds?: InstagramCredentials) {
  // Use provided credentials if available
  if (creds?.instagramId && creds?.accessToken) {
    return { valid: true as const, instagramId: creds.instagramId, accessToken: creds.accessToken };
  }

  // Fall back to env vars
  const instagramId = process.env.INSTAGRAM_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!instagramId || !accessToken) {
    return { valid: false as const, error: "Missing Instagram credentials" };
  }

  return { valid: true as const, instagramId, accessToken };
}

// Check connection status
export async function checkInstagramConnection(credentials?: InstagramCredentials): Promise<MetaConnectionStatus> {
  const creds = getInstagramCredentials(credentials);
  if (!creds.valid) {
    return { connected: false, error: creds.error };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${creds.instagramId}?fields=id,username&access_token=${creds.accessToken}`
    );
    const data = await res.json();

    if (data.error) {
      return { connected: false, error: data.error.message };
    }

    return {
      connected: true,
      instagramId: data.id,
      username: data.username,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { connected: false, error: message };
  }
}

// Upload and publish media
export async function uploadToInstagram(request: UploadRequest, credentials?: InstagramCredentials): Promise<UploadResponse> {
  const creds = getInstagramCredentials(credentials);
  if (!creds.valid) {
    return { success: false, error: creds.error };
  }

  const { instagramId, accessToken } = creds;
  const { mediaUrl, mediaType, caption, thumbnailUrl, scheduledTime } = request;

  try {
    // Step 1: Create media container
    const containerPayload: Record<string, string | number> = {
      caption: caption || "",
    };

    if (mediaType === "REELS" || mediaType === "VIDEO") {
      containerPayload.media_type = "REELS";
      containerPayload.video_url = mediaUrl;
      if (thumbnailUrl) {
        containerPayload.cover_url = thumbnailUrl;
      }
    } else {
      containerPayload.image_url = mediaUrl;
    }

    // If scheduled, add publish_at timestamp
    if (scheduledTime) {
      containerPayload.publish_at = Math.floor(new Date(scheduledTime).getTime() / 1000);
    }

    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${instagramId}/media?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(containerPayload),
      }
    );

    const containerData = await containerRes.json();

    if (!containerData.id) {
      console.error("Container creation failed:", containerData);
      return { success: false, error: containerData.error?.message || "Failed to create media container" };
    }

    // Step 2: Poll for processing status (for videos/reels)
    if (mediaType === "REELS" || mediaType === "VIDEO") {
      let attempts = 0;
      const maxAttempts = 30;
      let statusCode = "IN_PROGRESS";

      while (statusCode === "IN_PROGRESS" && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const statusRes = await fetch(
          `https://graph.facebook.com/v21.0/${containerData.id}?fields=status_code&access_token=${accessToken}`
        );
        const statusData = await statusRes.json();
        statusCode = statusData.status_code || "IN_PROGRESS";
        attempts++;

        if (statusCode === "ERROR") {
          return { success: false, error: "Video processing failed" };
        }
      }

      if (statusCode !== "FINISHED") {
        return { success: false, error: `Video processing timed out (status: ${statusCode})` };
      }
    }

    // Step 3: Publish (skip if scheduled - Meta handles it)
    if (scheduledTime) {
      return {
        success: true,
        scheduled: true,
        scheduledFor: scheduledTime,
        containerId: containerData.id,
      };
    }

    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${instagramId}/media_publish?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: containerData.id }),
      }
    );

    const publishData = await publishRes.json();

    if (!publishData.id) {
      console.error("Publish failed:", publishData);
      return { success: false, error: publishData.error?.message || "Failed to publish" };
    }

    return {
      success: true,
      instagramId: publishData.id,
      permalink: `https://www.instagram.com/p/${publishData.id}/`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Instagram upload error:", message);
    return { success: false, error: message };
  }
}

// Fetch posts with optional date filtering
export async function fetchInstagramPosts(options?: {
  since?: Date;
  until?: Date;
  limit?: number;
  credentials?: InstagramCredentials;
}): Promise<{ data: InstagramPost[]; error?: string }> {
  const creds = getInstagramCredentials(options?.credentials);
  if (!creds.valid) {
    return { data: [], error: creds.error };
  }

  const { instagramId, accessToken } = creds;
  const limit = options?.limit || 50;
  const since = options?.since;
  const until = options?.until || new Date();

  try {
    const posts: InstagramPost[] = [];
    let nextUrl: string | null = `https://graph.facebook.com/${instagramId}/media?fields=id,caption,media_type,thumbnail_url,media_url,timestamp,like_count,comments_count&access_token=${accessToken}&limit=${limit}`;

    while (nextUrl) {
      const res: Response = await fetch(nextUrl);
      const data: { data?: Record<string, unknown>[]; paging?: { next?: string }; error?: { message: string } } = await res.json();

      if (data.error) {
        return { data: [], error: data.error.message };
      }

      if (!data.data || data.data.length === 0) break;

      const filtered: InstagramPost[] = data.data
        .filter((post: Record<string, unknown>) => {
          if (!post.id) return false;
          const ts = new Date(post.timestamp as string);
          if (since && ts < since) return false;
          if (until && ts > until) return false;
          return true;
        })
        .map((post: Record<string, unknown>) => ({
          instagramId: post.id as string,
          caption: (post.caption as string) || undefined,
          mediaType: post.media_type as "VIDEO" | "IMAGE" | "CAROUSEL_ALBUM",
          mediaUrl: (post.media_url as string) || (post.thumbnail_url as string),
          thumbnailUrl: post.thumbnail_url as string,
          permalink: `https://www.instagram.com/p/${post.id}/`,
          timestamp: post.timestamp as string,
          likes: (post.like_count as number) ?? 0,
          comments: (post.comments_count as number) ?? 0,
        }));

      posts.push(...filtered);

      const lastPost = data.data[data.data.length - 1];
      const oldest = new Date(lastPost?.timestamp as string);
      if (since && oldest < since) break;

      nextUrl = data.paging?.next || null;
    }

    posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { data: posts };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: [], error: message };
  }
}

// Fetch insights for posts
export async function fetchPostInsights(options?: {
  since?: Date;
  until?: Date;
  limit?: number;
  credentials?: InstagramCredentials;
}): Promise<{ data: PostWithInsights[]; error?: string }> {
  const creds = getInstagramCredentials(options?.credentials);
  if (!creds.valid) {
    return { data: [], error: creds.error };
  }

  const { instagramId, accessToken } = creds;

  const now = new Date();
  const since = options?.since; // undefined = no filter (all time)
  const until = options?.until || now;
  const limit = options?.limit || 50;

  try {
    // Fetch posts with media_product_type to determine metrics
    const postsRes = await fetch(
      `https://graph.facebook.com/${instagramId}/media?fields=id,caption,media_type,media_product_type,thumbnail_url,media_url,timestamp,like_count,comments_count&access_token=${accessToken}&limit=${limit}`
    );
    const postsData = await postsRes.json();

    if (postsData.error) {
      return { data: [], error: postsData.error.message };
    }

    const posts = (postsData.data || []).filter((post: { timestamp: string }) => {
      const ts = new Date(post.timestamp);
      if (since && ts < since) return false;
      if (until && ts > until) return false;
      return true;
    });

    // Fetch insights for each post
    const postsWithInsights: PostWithInsights[] = await Promise.all(
      posts.map(async (post: {
        id: string;
        caption?: string;
        media_type: string;
        media_product_type?: string;
        thumbnail_url?: string;
        media_url?: string;
        timestamp: string;
        like_count?: number;
        comments_count?: number;
      }) => {
        try {
          // Different metrics for Reels vs Images/Videos
          const isReel = post.media_product_type === "REELS";
          const metrics = isReel
            ? "reach,views,likes,comments,shares,saved"
            : "impressions,reach,saved";

          const insightsRes = await fetch(
            `https://graph.facebook.com/${post.id}/insights?metric=${metrics}&access_token=${accessToken}`
          );
          const insightsData = await insightsRes.json();

          const metricsMap: Record<string, number> = {};
          if (Array.isArray(insightsData.data)) {
            insightsData.data.forEach((m: { name: string; values?: { value?: number }[] }) => {
              metricsMap[m.name] = m.values?.[0]?.value ?? 0;
            });
          }

          // Get individual metrics
          const likes = isReel ? (metricsMap.likes ?? 0) : (post.like_count ?? 0);
          const comments = isReel ? (metricsMap.comments ?? 0) : (post.comments_count ?? 0);
          const shares = metricsMap.shares ?? 0;
          const saves = metricsMap.saved ?? 0;

          // Calculate engagement (likes + comments + shares)
          const engagement = likes + comments + shares;

          return {
            id: post.id,
            caption: post.caption || "",
            mediaType: post.media_type,
            thumbnailUrl: post.thumbnail_url || post.media_url || "",
            timestamp: post.timestamp,
            impressions: metricsMap.impressions ?? metricsMap.views ?? 0,
            reach: metricsMap.reach ?? 0,
            engagement,
            videoViews: metricsMap.views ?? 0,
            likes,
            comments,
            saves,
            shares,
          };
        } catch {
          const likes = post.like_count ?? 0;
          const comments = post.comments_count ?? 0;
          return {
            id: post.id,
            caption: post.caption || "",
            mediaType: post.media_type,
            thumbnailUrl: post.thumbnail_url || post.media_url || "",
            timestamp: post.timestamp,
            impressions: 0,
            reach: 0,
            engagement: likes + comments,
            videoViews: 0,
            likes,
            comments,
            saves: 0,
            shares: 0,
          };
        }
      })
    );

    return { data: postsWithInsights };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: [], error: message };
  }
}
