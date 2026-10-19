/**
 * Review Portal API
 *
 * GET /api/review/[token] - Get posts awaiting client review
 *
 * Data flow:
 * - Account info from MongoDB (has reviewPortal.token)
 * - Posts from Notion (reads Posts db via account.notion config)
 * - Shows posts with status "Ready for review"
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountByReviewToken } from "@/lib/mongodb/accounts";
import { getPosts, getTopicById, getPostsSummary } from "@/lib/notion";
import type { NotionConfig } from "@/lib/notion/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    // 1. Look up account by token
    const account = await getAccountByReviewToken(token);
    if (!account) {
      return NextResponse.json(
        { error: "Invalid or expired review link" },
        { status: 404 }
      );
    }

    // 2. Check Notion config
    if (!account.notion?.postsDataSourceId) {
      return NextResponse.json(
        { error: "Account not configured for content review" },
        { status: 400 }
      );
    }

    const notionConfig: NotionConfig = {
      postsDataSourceId: account.notion.postsDataSourceId,
      topicsDataSourceId: account.notion.topicsDataSourceId || "",
    };

    // 3. Fetch posts from Notion
    const allPosts = await getPosts(notionConfig);

    // 4. Get summary for progress display
    const summary = await getPostsSummary(notionConfig);

    // 5. Build topic cache for display names
    const topicIds = [...new Set(allPosts.filter(p => p.topicId).map(p => p.topicId!))];
    const topicNames: Record<string, string> = {};

    if (notionConfig.topicsDataSourceId) {
      for (const topicId of topicIds.slice(0, 20)) { // Limit to avoid too many API calls
        const topic = await getTopicById(notionConfig, topicId);
        if (topic) {
          topicNames[topicId] = topic.title;
        }
      }
    }

    // 6. Transform posts for client view
    // ONLY include client-safe fields - hide strategy fields:
    // - beliefBefore, beliefAfter, level, decisionStage
    // - patternId, humanNatureLever, literaryDevice
    // - igPostLink (internal tracking)
    const clientPosts = allPosts.map((post) => ({
      id: post.id,
      title: post.title,
      status: post.status,
      type: post.type,
      topicName: post.topicId ? topicNames[post.topicId] || null : null,
      caption: post.caption,
      cta: post.cta,
      previewUrl: post.previewUrl,
      questionAnswered: post.questionAnswered,
    }));

    // 7. Categorize posts by status
    const needsReview = clientPosts.filter(p => p.status === "Ready for review");
    const approved = clientPosts.filter(p => p.status === "Approved");
    const published = clientPosts.filter(p => p.status === "Posted" || p.status === "Scheduled");

    // 8. Build response
    const isPaid = account.billing?.status === "paid";

    return NextResponse.json({
      account: {
        name: account.name,
        isPaid,
        checklist: account.reviewPortal?.checklist || [],
      },
      // Summary stats
      summary: {
        total: summary.total,
        readyForReview: summary.readyForReview,
        published: summary.published,
        byLevel: summary.byLevel,
        byDecisionStage: summary.byDecisionStage,
      },
      // Posts by category
      posts: {
        needsReview,
        approved,
        published,
      },
    });
  } catch (error) {
    console.error("[api:review:get]", error);
    return NextResponse.json(
      { error: "Failed to load review portal" },
      { status: 500 }
    );
  }
}
