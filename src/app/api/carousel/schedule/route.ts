/**
 * Schedule Carousel for Later Publishing
 *
 * POST /api/carousel/schedule
 * Body: { accountId, imagePaths, caption, scheduledFor: ISO date string }
 */

import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

interface ScheduledCarousel {
  id: string;
  accountId: string;
  imagePaths: string[];
  imageUrls?: string[];
  caption: string;
  scheduledFor: Date;
  status: "pending" | "publishing" | "published" | "failed";
  createdAt: Date;
  publishedAt?: Date;
  mediaId?: string;
  error?: string;
}

// Upload to catbox.moe for public URLs (reliable free hosting)
async function uploadToCatbox(imagePath: string): Promise<string> {
  const imageBuffer = fs.readFileSync(imagePath);
  const blob = new Blob([imageBuffer], { type: "image/png" });

  const formData = new FormData();
  formData.append("reqtype", "fileupload");
  formData.append("fileToUpload", blob, path.basename(imagePath));

  const response = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`catbox.moe upload failed: ${response.statusText}`);
  }

  const url = (await response.text()).trim();
  if (!url.startsWith("http")) {
    throw new Error(`catbox.moe error: ${url}`);
  }

  return url;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, imagePaths, caption, scheduledFor } = body;

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    if (!imagePaths || imagePaths.length < 2) {
      return NextResponse.json({ error: "At least 2 imagePaths required" }, { status: 400 });
    }

    if (!scheduledFor) {
      return NextResponse.json({ error: "scheduledFor date is required" }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: "Invalid scheduledFor date" }, { status: 400 });
    }

    if (scheduledDate <= new Date()) {
      return NextResponse.json({ error: "scheduledFor must be in the future" }, { status: 400 });
    }

    // Verify images exist
    for (const imagePath of imagePaths) {
      if (!fs.existsSync(imagePath)) {
        return NextResponse.json({ error: `Image not found: ${imagePath}` }, { status: 400 });
      }
    }

    // Upload images NOW to get stable public URLs
    // (0x0.st URLs expire after a while, so for production use Cloudinary)
    console.log("Pre-uploading images for scheduled post...");
    const imageUrls: string[] = [];

    for (const imagePath of imagePaths) {
      const url = await uploadToCatbox(imagePath);
      imageUrls.push(url);
      console.log(`Uploaded ${imagePath} -> ${url}`);
    }

    // Save to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const client = await MongoClient.connect(mongoUri);
    const db = client.db("strategy");

    const scheduledCarousel: ScheduledCarousel = {
      id: `carousel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      accountId,
      imagePaths,
      imageUrls,
      caption: caption || "",
      scheduledFor: scheduledDate,
      status: "pending",
      createdAt: new Date(),
    };

    await db.collection("scheduled_carousels").insertOne(scheduledCarousel);
    await client.close();

    // Format for display
    const displayDate = scheduledDate.toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });

    return NextResponse.json({
      success: true,
      scheduled: scheduledCarousel,
      message: `Carousel scheduled for ${displayDate}`,
      note: "Make sure the cron job is running to publish scheduled posts",
    });

  } catch (error) {
    console.error("Schedule error:", error);
    return NextResponse.json({
      error: "Failed to schedule carousel",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// GET - List scheduled carousels
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const client = await MongoClient.connect(mongoUri);
  const db = client.db("strategy");

  const query = accountId ? { accountId } : {};
  const scheduled = await db
    .collection("scheduled_carousels")
    .find(query)
    .sort({ scheduledFor: 1 })
    .toArray();

  await client.close();

  return NextResponse.json({ scheduled });
}
