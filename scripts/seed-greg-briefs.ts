/**
 * Seed strategy briefs for Greg's scheduled carousels
 *
 * Run with: npx tsx scripts/seed-greg-briefs.ts
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Strategy briefs for 3 carousels
const BRIEFS = [
  {
    questionMatch: "What happens if the appraisal comes in lower than my offer?",
    brief: {
      goal: "Educate buyers about appraisal gaps, reduce anxiety, position Greg as a calm guide through stressful situations",
      targetAudience: "First-time buyers in competitive markets worried about overbidding or losing their dream home",
      hook: "Your offer was accepted... but now what if the bank says it's worth less?",
      keyPoints: [
        "What an appraisal actually is (lender protection, not a judgment on your choice)",
        "What 'coming in low' means — the gap between your offer and appraised value",
        "Your three options: negotiate price down, cover the gap, or walk away",
        "How financing conditions protect you in this exact scenario",
        "Why this happens more in hot markets — and it's not the end of the world",
      ],
      cta: "Save this for when you're ready to make an offer — or DM me your questions",
      tone: "Calm, knowledgeable, reassuring — like a friend who's been through this",
      designNotes: "Use calming blues/greens. Simple icons for each option. Maybe a visual of the 'gap' between offer and appraisal.",
    },
  },
  {
    questionMatch: "How do I price my home in today's market?",
    brief: {
      goal: "Position Greg as a pricing strategist, not just a listing agent. Build trust with potential sellers.",
      targetAudience: "Homeowners considering selling, unsure if now is the right time or what their home is worth",
      hook: "The price you list at isn't the price you want — it's a strategy",
      keyPoints: [
        "Why pricing isn't about what you paid or what you need — it's about the market",
        "The danger of overpricing: longer days on market, price reductions signal desperation",
        "How a CMA (Comparative Market Analysis) works — real data, not Zillow guesses",
        "The psychology of buyer perception: why $499K gets more views than $510K",
        "Pricing for multiple offers vs. pricing for negotiation — know your market",
      ],
      cta: "Curious what your home would list for? DM me your address — I'll send you a CMA",
      tone: "Confident, strategic, educational — show expertise without being salesy",
      designNotes: "Use charts/graphs visual. Show the 'sweet spot' pricing concept. RE/MAX red accents.",
    },
  },
  {
    questionMatch: "How much should I budget for closing costs in PEI?",
    brief: {
      goal: "Help PEI buyers understand the true cost of buying, prevent surprises, position Greg as locally knowledgeable",
      targetAudience: "First-time buyers in PEI who've budgeted for down payment but may not know about closing costs",
      hook: "Your down payment isn't the only money you need on closing day",
      keyPoints: [
        "The rule of thumb: budget 1.5-4% of purchase price for closing costs",
        "Land Transfer Tax in PEI: what it is and how to calculate it",
        "Lawyer fees, title insurance, and home inspection — the non-negotiables",
        "Property tax and utility adjustments — the ones people forget",
        "First-time buyer rebates and programs available in PEI",
      ],
      cta: "Want a personalized closing cost estimate? Send me the listing link",
      tone: "Helpful, practical, local expertise — 'here's what it really costs in PEI'",
      designNotes: "Break down costs visually like a receipt. Use PEI/Maritime imagery subtly. Clean, easy to read.",
    },
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found in .env.local");
    process.exit(1);
  }

  const client = await MongoClient.connect(uri);
  const db = client.db("strategy");

  console.log("Adding strategy briefs to Greg's carousels...\n");

  // Find Greg's carousel package
  const pkg = await db.collection("graphic_packages").findOne({
    accountId: "greg-caseley",
    type: "carousels",
  });

  if (!pkg) {
    console.error("Greg's carousel package not found. Run seed-greg-carousel.ts first.");
    await client.close();
    process.exit(1);
  }

  console.log(`Found package: ${pkg.name}\n`);

  // Update each carousel with its brief
  for (const { questionMatch, brief } of BRIEFS) {
    const result = await db.collection("graphic_scheduled").updateOne(
      {
        packageId: pkg.id,
        question: questionMatch,
      },
      {
        $set: {
          brief,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount > 0) {
      console.log(`✓ Added brief: "${questionMatch.slice(0, 50)}..."`);
    } else {
      console.log(`✗ Not found: "${questionMatch.slice(0, 50)}..."`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("Done! 3 carousels now have strategy briefs.");
  console.log("View at: http://localhost:3000/account/greg-caseley/graphics");
  console.log("\nClick on a carousel to see its strategy brief.");

  await client.close();
}

main().catch(console.error);
