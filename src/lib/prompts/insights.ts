/**
 * Insights Prompt Template
 *
 * Used to generate content insights from classified posts via Claude API.
 */

import type { Post, PostCitation } from "../types/post";

/**
 * Build the insights prompt from classified posts
 */
export function buildInsightsPrompt(posts: Post[]): string {
  // Build post summaries with IDs for citation
  const postSummaries = posts.map((p, idx) => {
    const engRate =
      p.metrics.reach > 0
        ? ((p.metrics.engagement / p.metrics.reach) * 100).toFixed(1)
        : "0.0";

    const captionPreview = p.caption
      ? p.caption.slice(0, 80).replace(/\n/g, " ") + (p.caption.length > 80 ? "..." : "")
      : "No caption";

    return `[POST-${idx + 1}] ID: ${p.instagramId}
  Caption: "${captionPreview}"
  Type: ${p.classification?.contentType || "unclassified"}
  Subject: ${p.classification?.subject || "unknown"}
  Need: ${p.classification?.underlyingNeed || "unknown"}
  Message: ${p.classification?.coreMessage || "N/A"}
  Media: ${p.mediaType}
  Reach: ${p.metrics.reach.toLocaleString()}
  Engagement: ${p.metrics.engagement}
  Eng Rate: ${engRate}%
  Posted: ${p.postedAt.toISOString().split("T")[0]}`;
  });

  // Calculate some aggregate stats for context
  const totalPosts = posts.length;
  const totalReach = posts.reduce((sum, p) => sum + p.metrics.reach, 0);
  const totalEngagement = posts.reduce((sum, p) => sum + p.metrics.engagement, 0);
  const avgReach = Math.round(totalReach / totalPosts);
  const avgEngagement = Math.round(totalEngagement / totalPosts);

  // Count by content type
  const byContentType: Record<string, { count: number; totalReach: number }> = {};
  const byNeed: Record<string, { count: number; totalReach: number }> = {};

  posts.forEach((p) => {
    const ct = p.classification?.contentType || "unclassified";
    const need = p.classification?.underlyingNeed || "unknown";

    if (!byContentType[ct]) byContentType[ct] = { count: 0, totalReach: 0 };
    byContentType[ct].count++;
    byContentType[ct].totalReach += p.metrics.reach;

    if (!byNeed[need]) byNeed[need] = { count: 0, totalReach: 0 };
    byNeed[need].count++;
    byNeed[need].totalReach += p.metrics.reach;
  });

  const contentTypeStats = Object.entries(byContentType)
    .map(([type, data]) => `${type}: ${data.count} posts, ${Math.round(data.totalReach / data.count).toLocaleString()} avg reach`)
    .join("\n  ");

  const needStats = Object.entries(byNeed)
    .map(([need, data]) => `${need}: ${data.count} posts, ${Math.round(data.totalReach / data.count).toLocaleString()} avg reach`)
    .join("\n  ");

  return `You are analyzing a content library to find performance patterns and provide actionable recommendations.

=== SUMMARY STATS ===
Total Posts: ${totalPosts}
Total Reach: ${totalReach.toLocaleString()}
Total Engagement: ${totalEngagement.toLocaleString()}
Average Reach: ${avgReach.toLocaleString()}
Average Engagement: ${avgEngagement}

By Content Type:
  ${contentTypeStats}

By Underlying Need:
  ${needStats}

=== ALL POSTS DATA ===
${postSummaries.join("\n\n")}

=== TASK ===
Analyze this content performance data and provide insights in the following format:

## What's Working
- Identify which content types, subjects, or underlying needs correlate with higher reach/engagement
- Be specific with numbers (e.g., "case studies average 2.8K reach vs 1.4K for tutorials")
- Cite specific posts as examples using [POST-X] format

## Patterns
- What notable patterns do you see?
- Any correlations between content type and performance?
- Any subjects that consistently perform well or poorly?
- Cite specific posts as examples

## Gaps
- What's underrepresented in the content mix?
- Any underlying needs that aren't being addressed?
- Any obvious content opportunities?

## Top Performers
- List the 3-5 best performing posts with their [POST-X] reference
- Explain why each performed well

## Recommendations
- 3-5 specific, actionable content recommendations
- Based on what's actually working in the data
- Include specific content ideas when possible
- Reference similar successful posts using [POST-X]

=== GUIDELINES ===
- IMPORTANT: Always cite specific posts using [POST-X] format when making claims
- Be specific and reference actual numbers from the data
- No generic advice - everything should be backed by the data
- Focus on actionable insights
- Keep it concise but substantive`;
}

/**
 * Parse insights response (just returns the markdown as-is)
 */
export function parseInsightsResponse(response: string): string {
  // Claude's response should already be well-formatted markdown
  return response.trim();
}

/**
 * Extract post citations from insights text
 * Returns the indices referenced (e.g., [POST-1] -> 0, [POST-2] -> 1)
 */
export function extractCitationIndices(insightsText: string): number[] {
  const matches = insightsText.matchAll(/\[POST-(\d+)\]/g);
  const indices = new Set<number>();

  for (const match of matches) {
    const idx = parseInt(match[1], 10) - 1; // Convert to 0-based index
    if (idx >= 0) {
      indices.add(idx);
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Build citations array from posts and indices
 */
export function buildCitations(posts: Post[], indices: number[]): PostCitation[] {
  return indices
    .filter((idx) => idx < posts.length)
    .map((idx) => {
      const post = posts[idx];
      return {
        instagramId: post.instagramId,
        caption: post.caption?.slice(0, 100),
        contentType: post.classification?.contentType,
        reach: post.metrics.reach,
      };
    });
}
