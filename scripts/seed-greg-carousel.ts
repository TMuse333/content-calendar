/**
 * Seed Greg Caseley's Carousel Package (Proposed)
 *
 * Run with: npx tsx scripts/seed-greg-carousel.ts
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import { randomUUID } from "crypto";

dotenv.config({ path: ".env.local" });

// Question bank - real questions buyers and sellers ask
const QUESTIONS = [
  // Buyer questions
  {
    question: "What happens if the appraisal comes in lower than my offer?",
    category: "buyer",
    notes: "Common concern in competitive markets",
  },
  {
    question: "How much should I budget for closing costs in PEI?",
    category: "buyer",
    notes: "PEI-specific guidance",
  },
  {
    question: "What's the difference between pre-approval and pre-qualification?",
    category: "buyer",
    notes: "First-time buyer essential",
  },
  {
    question: "Can I back out after a home inspection?",
    category: "buyer",
    notes: "Condition explanation",
  },
  {
    question: "Should I waive conditions to win a bidding war?",
    category: "buyer",
    notes: "Risk vs reward discussion",
  },
  {
    question: "What hidden costs do first-time buyers overlook?",
    category: "buyer",
    notes: "Insurance, utilities, maintenance",
  },
  {
    question: "How do I know if a home is priced fairly?",
    category: "buyer",
    notes: "CMA explanation",
  },
  {
    question: "What happens on closing day?",
    category: "buyer",
    notes: "Process walkthrough",
  },

  // Seller questions
  {
    question: "How do I price my home in today's market?",
    category: "seller",
    notes: "Pricing strategy",
  },
  {
    question: "What repairs should I make before listing?",
    category: "seller",
    notes: "ROI on pre-sale improvements",
  },
  {
    question: "Should I stage my home or sell as-is?",
    category: "seller",
    notes: "Staging ROI discussion",
  },
  {
    question: "How long does it take to sell in Charlottetown?",
    category: "seller",
    notes: "Local market stats",
  },
  {
    question: "When's the best time to list in PEI?",
    category: "seller",
    notes: "Seasonal trends",
  },
  {
    question: "What if I get multiple offers?",
    category: "seller",
    notes: "Offer review process",
  },
  {
    question: "Can I sell my home before buying another?",
    category: "seller",
    notes: "Bridge financing, timing",
  },
];

// October 2026 schedule - 8 carousels
const OCTOBER_SCHEDULE = [
  { day: 2, questionIndex: 0 }, // Appraisal question
  { day: 5, questionIndex: 8 }, // Pricing question
  { day: 9, questionIndex: 2 }, // Pre-approval vs pre-qual
  { day: 12, questionIndex: 9 }, // Repairs before listing
  { day: 16, questionIndex: 1 }, // Closing costs PEI
  { day: 19, questionIndex: 12 }, // Best time to list PEI
  { day: 23, questionIndex: 3 }, // Back out after inspection
  { day: 26, questionIndex: 13 }, // Multiple offers
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
  }

  const client = await MongoClient.connect(uri);
  const db = client.db("strategy");

  console.log("Seeding Greg's Carousel Package (Proposed)...\n");

  // 1. Verify Greg's account exists
  const account = await db.collection("accounts").findOne({ id: "greg-caseley" });
  if (!account) {
    console.error("Greg's account not found. Run seed-greg.ts first.");
    await client.close();
    process.exit(1);
  }
  console.log("Found account: greg-caseley");

  // 2. Check if carousel package already exists
  const existingPkg = await db.collection("graphic_packages").findOne({
    accountId: "greg-caseley",
    type: "carousels",
  });

  if (existingPkg) {
    console.log("\nCarousel package already exists. Cleaning up for fresh seed...");
    // Delete existing questions and scheduled items
    await db.collection("graphic_questions").deleteMany({ packageId: existingPkg.id });
    await db.collection("graphic_scheduled").deleteMany({ packageId: existingPkg.id });
    await db.collection("graphic_packages").deleteOne({ id: existingPkg.id });
    console.log("Cleaned up existing package");
  }

  // 3. Create carousel package (status: proposed)
  const packageId = randomUUID();
  const now = new Date();

  const carouselPackage = {
    id: packageId,
    accountId: "greg-caseley",
    name: "Carousel Subscription #1",
    type: "carousels",
    status: "proposed", // Pending approval
    monthlyFrequency: 8,
    monthlyRate: undefined, // TBD
    startDate: new Date("2026-10-01"),
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("graphic_packages").insertOne(carouselPackage);
  console.log("\nCreated package: Carousel Subscription #1");
  console.log("  - Status: proposed (pending approval)");
  console.log("  - Frequency: 8/month");
  console.log("  - Start: October 2026");

  // 4. Add questions to question bank
  console.log("\nAdding questions to bank...");
  const questionDocs = QUESTIONS.map((q, index) => ({
    id: randomUUID(),
    packageId,
    question: q.question,
    category: q.category,
    status: "unused",
    notes: q.notes,
    createdAt: now,
    updatedAt: now,
  }));

  await db.collection("graphic_questions").insertMany(questionDocs);
  console.log(`  - Added ${questionDocs.length} questions`);
  console.log(`  - Buyer questions: ${questionDocs.filter(q => QUESTIONS[questionDocs.indexOf(q)]?.category === "buyer").length}`);
  console.log(`  - Seller questions: ${questionDocs.filter(q => QUESTIONS[questionDocs.indexOf(q)]?.category === "seller").length}`);

  // 5. Schedule October carousels
  console.log("\nScheduling October 2026 carousels...");
  const scheduledDocs = OCTOBER_SCHEDULE.map((s) => {
    const questionDoc = questionDocs[s.questionIndex];
    return {
      id: randomUUID(),
      packageId,
      questionId: questionDoc.id,
      question: QUESTIONS[s.questionIndex].question,
      scheduledDate: new Date(2026, 9, s.day), // October = month 9
      status: "draft",
      notes: undefined,
      createdAt: now,
      updatedAt: now,
    };
  });

  await db.collection("graphic_scheduled").insertMany(scheduledDocs);

  // Update question statuses to scheduled
  for (const s of OCTOBER_SCHEDULE) {
    await db.collection("graphic_questions").updateOne(
      { id: questionDocs[s.questionIndex].id },
      {
        $set: {
          status: "scheduled",
          scheduledCarouselId: scheduledDocs[OCTOBER_SCHEDULE.indexOf(s)].id,
          updatedAt: now,
        },
      }
    );
  }

  console.log(`  - Scheduled ${scheduledDocs.length} carousels for October`);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("SUMMARY");
  console.log("=".repeat(50));
  console.log(`Package: ${carouselPackage.name}`);
  console.log(`Status: PROPOSED (pending approval)`);
  console.log(`Questions in bank: ${questionDocs.length}`);
  console.log(`  - Unused: ${questionDocs.length - OCTOBER_SCHEDULE.length}`);
  console.log(`  - Scheduled: ${OCTOBER_SCHEDULE.length}`);
  console.log(`October schedule:`);
  scheduledDocs.forEach((s) => {
    const date = new Date(s.scheduledDate);
    console.log(`  Oct ${date.getDate()}: ${s.question?.slice(0, 50)}...`);
  });

  console.log("\nView at: http://localhost:3000/account/greg-caseley/graphics");
  console.log("Calendar: http://localhost:3000/account/greg-caseley/calendar");

  await client.close();
}

main().catch(console.error);
