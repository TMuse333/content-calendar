/**
 * Backfill Greg's Carousels with Entropy Levels
 *
 * Run with: npx tsx scripts/backfill-greg-entropy.ts
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Mapping of questions to entropy data
const ENTROPY_MAPPING: Record<string, {
  level: "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";
  uncertaintyAddressed: string;
  suggestedFormat: string;
  isEvergreen: boolean;
}> = {
  "What happens if the appraisal comes in lower than my offer?": {
    level: "L6",
    uncertaintyAddressed: "What happens if my offer exceeds the appraisal value",
    suggestedFormat: "ClientQuestionsCarousel",
    isEvergreen: true,
  },
  "How do I price my home in today's market?": {
    level: "L5",
    uncertaintyAddressed: "How to determine the right listing price",
    suggestedFormat: "ClientQuestionsCarousel",
    isEvergreen: true,
  },
  "What's the difference between pre-approval and pre-qualification?": {
    level: "L3",
    uncertaintyAddressed: "The difference between these two mortgage steps",
    suggestedFormat: "ThisOrThatCarousel",
    isEvergreen: true,
  },
  "What repairs should I make before listing?": {
    level: "L5",
    uncertaintyAddressed: "Which repairs are worth the investment before selling",
    suggestedFormat: "ClientQuestionsCarousel",
    isEvergreen: true,
  },
  "How much should I budget for closing costs in PEI?": {
    level: "L3",
    uncertaintyAddressed: "What buying actually costs beyond the down payment",
    suggestedFormat: "ProcessTimelineCarousel",
    isEvergreen: true,
  },
  "When's the best time to list in PEI?": {
    level: "L5",
    uncertaintyAddressed: "Whether timing affects sale price in PEI",
    suggestedFormat: "MarketPulseCarousel",
    isEvergreen: false, // Seasonal, may need updating
  },
  "Can I back out after a home inspection?": {
    level: "L6",
    uncertaintyAddressed: "Whether I can exit if inspection finds issues",
    suggestedFormat: "ClientQuestionsCarousel",
    isEvergreen: true,
  },
  "What if I get multiple offers?": {
    level: "L6",
    uncertaintyAddressed: "How to handle competing offers as a seller",
    suggestedFormat: "ProcessTimelineCarousel",
    isEvergreen: true,
  },
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
  }

  const client = await MongoClient.connect(uri);
  const db = client.db("strategy");

  console.log("Backfilling Greg's carousels with entropy levels...\n");

  // Get Greg's carousel package
  const pkg = await db.collection("graphic_packages").findOne({
    accountId: "greg-caseley",
    type: "carousels",
  });

  if (!pkg) {
    console.error("No carousel package found for greg-caseley");
    await client.close();
    process.exit(1);
  }

  console.log(`Found package: ${pkg.name}`);

  // Get all scheduled carousels
  const carousels = await db.collection("graphic_scheduled")
    .find({ packageId: pkg.id })
    .toArray();

  console.log(`Found ${carousels.length} scheduled carousels\n`);

  let updated = 0;
  let skipped = 0;

  for (const carousel of carousels) {
    const question = carousel.question;
    const mapping = ENTROPY_MAPPING[question];

    if (mapping) {
      await db.collection("graphic_scheduled").updateOne(
        { id: carousel.id },
        {
          $set: {
            level: mapping.level,
            uncertaintyAddressed: mapping.uncertaintyAddressed,
            suggestedFormat: mapping.suggestedFormat,
            isEvergreen: mapping.isEvergreen,
            updatedAt: new Date(),
          },
        }
      );
      console.log(`✓ ${mapping.level} | ${question.slice(0, 50)}...`);
      updated++;
    } else {
      console.log(`⚠ No mapping for: ${question?.slice(0, 50)}...`);
      skipped++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("SUMMARY");
  console.log("=".repeat(50));
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);

  // Show distribution
  const distribution: Record<string, number> = {};
  for (const [, mapping] of Object.entries(ENTROPY_MAPPING)) {
    distribution[mapping.level] = (distribution[mapping.level] || 0) + 1;
  }
  console.log("\nLevel distribution:");
  for (const [level, count] of Object.entries(distribution).sort()) {
    console.log(`  ${level}: ${count}`);
  }

  await client.close();
}

main().catch(console.error);
