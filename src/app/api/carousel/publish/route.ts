/**
 * Carousel Publishing API
 *
 * Uploads images to imgbb for public URLs, then publishes carousel to Instagram.
 *
 * POST /api/carousel/publish
 * Body: { accountId, imagePaths: string[], caption }
 */

import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

interface InstagramPlatform {
  connected: boolean;
  accessToken: string;
  userId: string;
  username?: string;
}

interface Account {
  id: string;
  platforms?: {
    instagram?: InstagramPlatform;
  };
}

// Upload image to imgbb (free image hosting)
async function uploadToImgbb(imagePath: string): Promise<string> {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");

  // imgbb free API - no key needed for basic uploads
  const formData = new FormData();
  formData.append("image", base64Image);

  const response = await fetch("https://api.imgbb.com/1/upload?key=7a4a20e2e15d8b9c0d1f2e3a4b5c6d7e", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(`imgbb upload failed: ${JSON.stringify(data)}`);
  }

  return data.data.url;
}

// Upload to catbox.moe (reliable free hosting)
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

// Create carousel container on Instagram
async function createCarouselContainer(
  accessToken: string,
  userId: string,
  imageUrls: string[],
  caption: string
): Promise<string> {
  // Step 1: Create individual media containers for each image
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
      throw new Error(`Failed to create media container: ${data.error.message}`);
    }

    childContainerIds.push(data.id);
    console.log(`Created child container ${data.id} for ${imageUrl}`);
  }

  // Step 2: Create carousel container
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
    throw new Error(`Failed to create carousel container: ${carouselData.error.message}`);
  }

  return carouselData.id;
}

// Publish the carousel
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
    throw new Error(`Failed to publish carousel: ${data.error.message}`);
  }

  return data.id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, imagePaths, caption, imageUrls: providedUrls } = body;

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    if (!imagePaths && !providedUrls) {
      return NextResponse.json({ error: "imagePaths or imageUrls required" }, { status: 400 });
    }

    // Get account from MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const client = await MongoClient.connect(mongoUri);
    const db = client.db("strategy");
    const account = await db.collection<Account>("accounts").findOne({ id: accountId });

    if (!account) {
      await client.close();
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const instagram = account.platforms?.instagram;
    if (!instagram?.connected || !instagram.accessToken || !instagram.userId) {
      await client.close();
      return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
    }

    await client.close();

    // Get public URLs for images
    let imageUrls: string[] = providedUrls || [];

    if (imagePaths && imagePaths.length > 0) {
      console.log("Uploading images to get public URLs...");

      for (const imagePath of imagePaths) {
        if (!fs.existsSync(imagePath)) {
          return NextResponse.json({ error: `Image not found: ${imagePath}` }, { status: 400 });
        }

        try {
          // Use catbox.moe for reliable uploads (no API key needed)
          const url = await uploadToCatbox(imagePath);
          imageUrls.push(url);
          console.log(`Uploaded ${imagePath} -> ${url}`);
        } catch (uploadError) {
          console.error(`Upload failed for ${imagePath}:`, uploadError);
          return NextResponse.json({
            error: `Failed to upload ${imagePath}`,
            details: uploadError instanceof Error ? uploadError.message : "Unknown error"
          }, { status: 500 });
        }
      }
    }

    if (imageUrls.length < 2) {
      return NextResponse.json({ error: "Carousel requires at least 2 images" }, { status: 400 });
    }

    if (imageUrls.length > 10) {
      return NextResponse.json({ error: "Carousel supports max 10 images" }, { status: 400 });
    }

    console.log("Creating carousel with URLs:", imageUrls);

    // Create carousel container
    const containerId = await createCarouselContainer(
      instagram.accessToken,
      instagram.userId,
      imageUrls,
      caption || ""
    );

    console.log("Carousel container created:", containerId);

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Publish
    const mediaId = await publishCarousel(
      instagram.accessToken,
      instagram.userId,
      containerId
    );

    console.log("Carousel published! Media ID:", mediaId);

    return NextResponse.json({
      success: true,
      mediaId,
      containerId,
      imageUrls,
      message: "Carousel published successfully!",
    });

  } catch (error) {
    console.error("Carousel publish error:", error);
    return NextResponse.json({
      error: "Failed to publish carousel",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
