/**
 * Seed 10-Video Package from video-system data
 *
 * Run: npx tsx scripts/seed-10-video-package.ts
 */

const ACCOUNT_ID = "thomas-musial";
const API_BASE = "http://localhost:3000";

// Data from video-system/src/lib/videos/data.ts
const videoSystemData = {
  name: "10-Video Package",
  description: "Breaking down how I built the video production system",
  goal: "Prove I can take complex subjects and visualize them into digestible videos. If someone needs an idea visualized and explained - potentially over a series - I'm their guy.",
  context:
    "3 years of online lead gen. Started with React/websites, realized channel capacity issue. Video = higher bandwidth = stronger influence. This package is the proof of concept - complex ideas made visual so leads trust you enough to do business.",
  informationTransmitted: [
    "Who Thomas is and his background",
    "Why video is more effective than websites for lead gen",
    "The system behind producing consistent video content",
    "Psychology principles used in persuasion",
    "Information theory - channel capacity and bandwidth",
    "Technical system powering the production",
    "How to apply this system to any business",
  ],
  videos: [
    {
      number: 1,
      title: "Intro",
      status: "recorded", // in_progress in video-system → recorded here
      about:
        "Intro video. Personal entry establishing the shift from websites to video. Core idea: transmit more info via video to build trust. Announces 10-video series.",
      informationTransmitted: [
        "Thomas is upgrading from websites to video",
        "Video transmits more information than websites",
        "There's a 10-video series coming",
        "The system touches psychology, information theory, and tech",
      ],
    },
    {
      number: 2,
      title: "What is Structured Information",
      status: "planned",
    },
    {
      number: 3,
      title: "Expanding Bandwidth",
      status: "planned",
    },
    {
      number: 4,
      title: "Tech Progression Deep Dive",
      status: "planned",
    },
    {
      number: 5,
      title: "Hormozi - Value Math",
      status: "planned",
    },
    {
      number: 6,
      title: "Voss - Empathy",
      status: "planned",
    },
    {
      number: 7,
      title: "Greene - Human Nature",
      status: "planned",
    },
    {
      number: 8,
      title: "The System Part 1",
      status: "planned",
    },
    {
      number: 9,
      title: "The System Part 2",
      status: "planned",
    },
    {
      number: 10,
      title: "The Offer",
      status: "planned",
    },
  ],
};

async function seed() {
  console.log(`Seeding 10-Video Package for account: ${ACCOUNT_ID}`);

  // Create the package with episodes
  const payload = {
    name: videoSystemData.name,
    description: videoSystemData.description,
    goal: videoSystemData.goal,
    context: videoSystemData.context,
    informationTransmitted: videoSystemData.informationTransmitted,
    episodes: videoSystemData.videos.map((v) => ({
      number: v.number,
      title: v.title,
      status: v.status,
      about: v.about,
      informationTransmitted: v.informationTransmitted,
    })),
  };

  try {
    const res = await fetch(`${API_BASE}/api/accounts/${ACCOUNT_ID}/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Failed to create package:", data.error);
      process.exit(1);
    }

    console.log("Package created successfully!");
    console.log(`Package ID: ${data.packageId}`);
    console.log(`View at: ${API_BASE}/account/${ACCOUNT_ID}/packages/${data.packageId}`);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

seed();
