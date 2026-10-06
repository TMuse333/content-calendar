// Cron Job: Publish Scheduled Carousels
//
// This endpoint should be called periodically (e.g., every 5 minutes)
// to check for and publish due scheduled posts.
//
// For Vercel: Add to vercel.json:
// { "crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "*/5 * * * *" }] }
//
// For local dev: Run manually or use a cron job

import { NextRequest, NextResponse } from "next/server";
import { MongoClient, Db } from "mongodb";

interface InstagramPlatform {
  connected: boolean;
  accessToken: string;
  userId: string;
}

interface Account {
  id: string;
  platforms?: {
    instagram?: InstagramPlatform;
  };
}

interface ScheduledCarousel {
  id: string;
  accountId: string;
  imageUrls: string[];
  caption: string;
  scheduledFor: Date;
  status: "pending" | "publishing" | "published" | "failed";
}

async function createCarouselContainer(
  accessToken: string,
  userId: string,
  imageUrls: string[],
  caption: string
): Promise<string> {
  const childContainerIds: string[] = [];

  for (const imageUrl of imageUrls) {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${userId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          is_carousel_item: true,
          access_token: accessToken,
        }),
      }
    );

    const data = await response.json();
    if (data.error) {
      throw new Error(`Media container failed: ${data.error.message}`);
    }
    childContainerIds.push(data.id);
  }

  const carouselResponse = await fetch(
    `https://graph.facebook.com/v21.0/${userId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "CAROUSEL",
        children: childContainerIds.join(","),
        caption: caption,
        access_token: accessToken,
      }),
    }
  );

  const carouselData = await carouselResponse.json();
  if (carouselData.error) {
    throw new Error(`Carousel container failed: ${carouselData.error.message}`);
  }

  return carouselData.id;
}

async function publishCarousel(
  accessToken: string,
  userId: string,
  containerId: string
): Promise<string> {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${userId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    }
  );

  const data = await response.json();
  if (data.error) {
    throw new Error(`Publish failed: ${data.error.message}`);
  }

  return data.id;
}

async function processCarousel(
  db: Db,
  carousel: ScheduledCarousel,
  account: Account
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  const instagram = account.platforms?.instagram;

  if (!instagram?.connected || !instagram.accessToken || !instagram.userId) {
    return { success: false, error: "Instagram not connected" };
  }

  try {
    // Mark as publishing
    await db.collection("scheduled_carousels").updateOne(
      { id: carousel.id },
      { $set: { status: "publishing" } }
    );

    // Create and publish
    const containerId = await createCarouselContainer(
      instagram.accessToken,
      instagram.userId,
      carousel.imageUrls,
      carousel.caption
    );

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    const mediaId = await publishCarousel(
      instagram.accessToken,
      instagram.userId,
      containerId
    );

    // Mark as published
    await db.collection("scheduled_carousels").updateOne(
      { id: carousel.id },
      {
        $set: {
          status: "published",
          publishedAt: new Date(),
          mediaId: mediaId,
        },
      }
    );

    return { success: true, mediaId };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db.collection("scheduled_carousels").updateOne(
      { id: carousel.id },
      {
        $set: {
          status: "failed",
          error: errorMessage,
        },
      }
    );

    return { success: false, error: errorMessage };
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret if configured (for security)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow without auth in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const client = await MongoClient.connect(mongoUri);
  const db = client.db("strategy");

  try {
    // Find carousels due for publishing
    const now = new Date();
    const dueCarousels = await db
      .collection<ScheduledCarousel>("scheduled_carousels")
      .find({
        status: "pending",
        scheduledFor: { $lte: now },
      })
      .toArray();

    if (dueCarousels.length === 0) {
      await client.close();
      return NextResponse.json({
        message: "No carousels due for publishing",
        checked: now.toISOString(),
      });
    }

    const results: Array<{
      id: string;
      accountId: string;
      success: boolean;
      mediaId?: string;
      error?: string;
    }> = [];

    for (const carousel of dueCarousels) {
      // Get account
      const account = await db
        .collection<Account>("accounts")
        .findOne({ id: carousel.accountId });

      if (!account) {
        results.push({
          id: carousel.id,
          accountId: carousel.accountId,
          success: false,
          error: "Account not found",
        });
        continue;
      }

      const result = await processCarousel(db, carousel, account);
      results.push({
        id: carousel.id,
        accountId: carousel.accountId,
        ...result,
      });

      console.log(
        `Carousel ${carousel.id}: ${result.success ? "Published" : "Failed"} - ${result.mediaId || result.error}`
      );
    }

    await client.close();

    return NextResponse.json({
      processed: results.length,
      results,
      checked: now.toISOString(),
    });

  } catch (error) {
    await client.close();
    console.error("Cron error:", error);
    return NextResponse.json({
      error: "Cron job failed",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
