/**
 * Public Graphics Context API
 * GET /api/public/graphics/[accountId]
 *
 * Returns account context, scheduled carousels, and question bank
 * for the graphics app to use when creating content.
 *
 * No auth required - CORS enabled for cross-domain requests.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb/clientPromise";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ accountId: string }>;
}

// CORS headers for cross-domain access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = await params;

    const client = await clientPromise;
    const db = client.db("strategy");

    // Get account info
    const account = await db.collection("accounts").findOne({ id: accountId });
    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get carousel packages for this account
    const carouselPackages = await db.collection("graphic_packages")
      .find({ accountId, type: "carousels" })
      .toArray();

    const packageIds = carouselPackages.map(p => p.id);
    const packageMap = new Map(carouselPackages.map(p => [p.id, p]));

    // Get all scheduled carousels
    const scheduledCarousels = packageIds.length > 0
      ? await db.collection("graphic_scheduled")
          .find({ packageId: { $in: packageIds } })
          .sort({ scheduledDate: 1 })
          .toArray()
      : [];

    // Get question bank
    const questions = packageIds.length > 0
      ? await db.collection("graphic_questions")
          .find({ packageId: { $in: packageIds } })
          .sort({ createdAt: -1 })
          .toArray()
      : [];

    // Build response
    const response = {
      account: {
        id: account.id,
        name: account.name,
        handle: account.handle,
        brand: {
          primaryColor: account.brand?.primaryColor || "#06b6d4",
          secondaryColor: account.brand?.secondaryColor || "#8b5cf6",
          headshotUrl: account.brand?.headshotUrl || null,
          logoUrl: account.brand?.logoUrl || null,
        },
      },

      packages: carouselPackages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        type: pkg.type,
        status: pkg.status,
        allocation: pkg.allocation,
        createdAt: pkg.createdAt,
      })),

      scheduledCarousels: scheduledCarousels.map(carousel => {
        const pkg = packageMap.get(carousel.packageId);
        return {
          id: carousel.id,
          packageId: carousel.packageId,
          packageName: pkg?.name || null,
          questionId: carousel.questionId,
          question: carousel.question,
          scheduledDate: carousel.scheduledDate,
          status: carousel.status,
          notes: carousel.notes,

          // Strategy fields (entropy reduction)
          level: carousel.level || null,                           // L1-L7
          uncertaintyAddressed: carousel.uncertaintyAddressed || null,
          suggestedFormat: carousel.suggestedFormat || null,       // e.g., "ProcessTimelineCarousel"
          isEvergreen: carousel.isEvergreen || false,

          // Rendered graphics (from Graphics App callback)
          graphicId: carousel.listingGraphicsProjectId || null,    // Graphics App's internal ID
          previewUrl: carousel.graphicUrl || null,                 // Thumbnail/preview
          graphicUrls: carousel.graphicUrls || null,               // All carousel frames

          brief: carousel.brief ? {
            goal: carousel.brief.goal,
            targetAudience: carousel.brief.targetAudience,
            hook: carousel.brief.hook,
            keyPoints: carousel.brief.keyPoints,
            cta: carousel.brief.cta,
            tone: carousel.brief.tone,
            designNotes: carousel.brief.designNotes,
          } : null,
          createdAt: carousel.createdAt,
          updatedAt: carousel.updatedAt,
        };
      }),

      questionBank: questions.map(q => ({
        id: q.id,
        packageId: q.packageId,
        question: q.question,
        category: q.category || null,
        status: q.status,
        notes: q.notes || null,
        scheduledCarouselId: q.scheduledCarouselId || null,
        createdAt: q.createdAt,
      })),

      // Summary stats
      summary: {
        totalPackages: carouselPackages.length,
        totalScheduled: scheduledCarousels.length,
        totalQuestions: questions.length,
        byStatus: {
          draft: scheduledCarousels.filter(c => c.status === "draft").length,
          ready: scheduledCarousels.filter(c => c.status === "ready").length,
          published: scheduledCarousels.filter(c => c.status === "published").length,
        },
        questionsByStatus: {
          unanswered: questions.filter(q => q.status === "unanswered").length,
          scheduled: questions.filter(q => q.status === "scheduled").length,
          answered: questions.filter(q => q.status === "answered").length,
        },
      },

      // Content strategy context (entropy reduction framework)
      // See: /docs/ENTROPY_LEVELS.md and /docs/CONTENT_PLAYBOOKS.md
      strategy: {
        // Current gaps in client's content (levels they're missing)
        gaps: account.contentStrategy?.gaps || [],

        // Current content mix (% per level from last audit)
        currentMix: account.contentStrategy?.currentMix || null,

        // Target mix (ideal distribution)
        targetMix: account.contentStrategy?.targetMix || {
          L1: 10, L2: 10, L3: 15, L4: 15, L5: 25, L6: 15, L7: 10
        },

        // Monthly goals
        monthlyGoals: account.contentStrategy?.monthlyGoals || null,

        // Domain-specific examples per level
        levelExamples: account.contentStrategy?.levelExamples || null,

        // Audit info
        lastAuditedAt: account.contentStrategy?.auditedAt || null,
        postsAudited: account.contentStrategy?.postsAudited || 0,

        // Reference docs (Graphics App can read these files)
        docs: {
          entropyLevels: "/docs/ENTROPY_LEVELS.md",
          playbooks: "/docs/CONTENT_PLAYBOOKS.md",
        },

        // Level definitions (inline for convenience)
        levelDefinitions: {
          L1: { name: "Identity", question: "Who are you, what do you do, where?" },
          L2: { name: "Offer", question: "Is this for me? How do I start?" },
          L3: { name: "Process", question: "How does it work? Cost? Timing?" },
          L4: { name: "Proof", question: "Has it worked for people like me?" },
          L5: { name: "Expertise", question: "Do you know this market deeply?" },
          L6: { name: "Situations", question: "Do you understand MY exact situation?" },
          L7: { name: "Personality", question: "Do I trust and like this person?" },
        },
      },

      meta: {
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    console.error("[api:public/graphics]", error);
    return NextResponse.json(
      { error: "Failed to fetch graphics context" },
      { status: 500, headers: corsHeaders }
    );
  }
}
