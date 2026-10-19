/**
 * Client Hub API
 *
 * GET /api/accounts/[id]/client-hub - Get all client-facing data
 *
 * Returns:
 * - Topics with questions covered and decision stage progress
 * - Posts needing review
 * - Posted content
 * - Results summary
 *
 * IMPORTANT: Only returns client-safe fields.
 * Hidden: Belief before/after, Surprise, Pattern, Human nature (lever),
 *         Literary device, Made with, Drive link
 */

import { NextRequest, NextResponse } from "next/server";
import { getAccountById } from "@/lib/mongodb/accounts";
import { getTopics, getPosts } from "@/lib/notion";
import type { NotionConfig, NotionPost, Topic } from "@/lib/notion/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Decision stage labels (client-friendly)
const DECISION_STAGES = [
  { stage: "1", label: "Good idea?", key: "1 - Good idea?" },
  { stage: "2", label: "What's involved?", key: "2 - What's involved?" },
  { stage: "3", label: "My situation?", key: "3 - My situation?" },
  { stage: "4", label: "Worked for others?", key: "4 - Worked for others?" },
  { stage: "5", label: "Trust them?", key: "5 - Trust them?" },
  { stage: "6", label: "How to start?", key: "6 - How to start?" },
];

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 1. Get account
    const account = await getAccountById(id);
    if (!account) {
      return NextResponse.json(
        { error: `Account "${id}" not found` },
        { status: 404 }
      );
    }

    // 2. Check Notion config
    if (!account.notion?.postsDataSourceId) {
      return NextResponse.json(
        { error: "Account not configured for content" },
        { status: 400 }
      );
    }

    const notionConfig: NotionConfig = {
      postsDataSourceId: account.notion.postsDataSourceId,
      topicsDataSourceId: account.notion.topicsDataSourceId || "",
    };

    // 3. Fetch topics and posts
    const [topics, allPosts]: [Topic[], NotionPost[]] = await Promise.all([
      notionConfig.topicsDataSourceId ? getTopics(notionConfig) : [],
      getPosts(notionConfig),
    ]);

    // 4. Build topics with coverage data
    const topicsWithCoverage = topics
      .filter((t) => t.status === "Active" || t.status === "Covered")
      .map((topic) => {
        // Get posts for this topic
        const topicPosts = allPosts.filter((p) => p.topicId === topic.id);

        // Calculate decision stage coverage
        const stageCoverage = DECISION_STAGES.map((ds) => {
          const postsAtStage = topicPosts.filter(
            (p) =>
              p.decisionStage === ds.key &&
              (p.status === "Posted" ||
                p.status === "Scheduled" ||
                p.status === "Approved")
          );
          return {
            stage: ds.stage,
            label: ds.label,
            covered: postsAtStage.length > 0,
            postCount: postsAtStage.length,
            // Client-safe post info (question answered only)
            questions: postsAtStage.map((p) => ({
              id: p.id,
              question: p.questionAnswered || p.title,
              status: p.status,
            })),
          };
        });

        const coveredStages = stageCoverage.filter((s) => s.covered).length;

        return {
          id: topic.id,
          title: topic.title,
          audience: topic.audience,
          personalQuestion: topic.personalQuestion,
          status: topic.status,
          priority: topic.priority,
          coverage: {
            stages: stageCoverage,
            coveredCount: coveredStages,
            totalStages: 6,
            percentage: Math.round((coveredStages / 6) * 100),
          },
          totalPosts: topicPosts.length,
        };
      });

    // 5. Posts needing review (client-safe fields only)
    const needsReview = allPosts
      .filter((p) => p.status === "Ready for review")
      .map((p) => ({
        id: p.id,
        title: p.title,
        questionAnswered: p.questionAnswered,
        type: p.type,
        topicId: p.topicId,
        previewUrl: p.previewUrl,
        caption: p.caption,
        cta: p.cta,
      }));

    // 6. Posted content (client-safe fields only)
    const posted = allPosts
      .filter((p) => p.status === "Posted" || p.status === "Scheduled")
      .map((p) => ({
        id: p.id,
        title: p.title,
        questionAnswered: p.questionAnswered,
        type: p.type,
        topicId: p.topicId,
        status: p.status,
        previewUrl: p.previewUrl,
      }));

    // 7. Summary stats
    const summary = {
      topicsActive: topicsWithCoverage.filter((t) => t.status === "Active")
        .length,
      topicsCovered: topicsWithCoverage.filter((t) => t.status === "Covered")
        .length,
      postsPublished: allPosts.filter((p) => p.status === "Posted").length,
      postsScheduled: allPosts.filter((p) => p.status === "Scheduled").length,
      postsNeedingReview: needsReview.length,
    };

    // 8. Build topic name lookup for posts
    const topicNames: Record<string, string> = {};
    for (const topic of topics) {
      topicNames[topic.id] = topic.title;
    }

    return NextResponse.json({
      account: {
        id: account.id,
        name: account.name,
        handle: account.handle,
      },
      instagram: {
        connected: account.platforms?.instagram?.connected ?? false,
        username: account.platforms?.instagram?.username,
      },
      topics: topicsWithCoverage,
      topicNames,
      needsReview,
      posted,
      summary,
    });
  } catch (error) {
    console.error("[api:client-hub:get]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load client hub data", details: message },
      { status: 500 }
    );
  }
}
