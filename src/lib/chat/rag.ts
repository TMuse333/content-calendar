/**
 * RAG Module
 *
 * Retrieves relevant posts from the content library for chat context.
 * Uses classification-based filtering, not vector search.
 */

import { getPosts, getClassifiedPosts } from "@/lib/mongodb/posts";
import type { Post, ContentType } from "@/lib/types/post";

export interface PostContext {
  instagramId: string;
  caption: string;
  contentType?: ContentType;
  subject?: string;
  coreMessage?: string;
  postedAt: Date;
  permalink: string;
}

export interface RAGResult {
  posts: PostContext[];
  context: string; // Formatted context for LLM
}

/**
 * Map topics to relevant content types
 */
const TOPIC_TO_CONTENT_TYPES: Record<string, ContentType[]> = {
  leads: ["case-study", "insight", "tutorial"],
  content: ["behind-scenes", "tutorial", "insight"],
  marketing: ["case-study", "insight", "tutorial"],
  social: ["behind-scenes", "tutorial", "insight"],
  strategy: ["insight", "case-study", "tutorial"],
  results: ["case-study", "showcase"],
  process: ["behind-scenes", "tutorial"],
  default: ["case-study", "insight", "tutorial"],
};

/**
 * Get relevant posts for a conversation topic
 */
export async function getRelevantPosts(
  accountId: string,
  topic?: string,
  limit: number = 10
): Promise<PostContext[]> {
  // Get all classified posts
  const allPosts = await getClassifiedPosts(accountId);

  if (allPosts.length === 0) {
    return [];
  }

  // Determine which content types are most relevant
  const relevantTypes = topic
    ? TOPIC_TO_CONTENT_TYPES[topic.toLowerCase()] || TOPIC_TO_CONTENT_TYPES.default
    : TOPIC_TO_CONTENT_TYPES.default;

  // Score and sort posts by relevance
  const scoredPosts = allPosts
    .map((post) => {
      let score = 0;

      // Boost if content type matches topic
      if (post.classification?.contentType) {
        const typeIndex = relevantTypes.indexOf(post.classification.contentType);
        if (typeIndex !== -1) {
          score += (relevantTypes.length - typeIndex) * 10;
        }
      }

      // Boost recent posts
      const ageInDays = (Date.now() - post.postedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays < 30) score += 5;
      else if (ageInDays < 90) score += 3;

      // Boost posts with high engagement
      if (post.metrics?.engagement) {
        if (post.metrics.engagement > 100) score += 3;
        else if (post.metrics.engagement > 50) score += 2;
      }

      // Boost posts with transcripts (more content to reference)
      if (post.transcript) score += 2;

      return { post, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scoredPosts.map(({ post }) => formatPostContext(post));
}

/**
 * Search posts by keyword (simple text matching)
 */
export async function searchPosts(
  accountId: string,
  query: string,
  limit: number = 5
): Promise<PostContext[]> {
  const allPosts = await getClassifiedPosts(accountId);
  const queryLower = query.toLowerCase();

  // Simple keyword matching on caption, transcript, and classification
  const matches = allPosts
    .map((post) => {
      let score = 0;
      const searchText = [
        post.caption || "",
        post.transcript || "",
        post.classification?.subject || "",
        post.classification?.coreMessage || "",
      ]
        .join(" ")
        .toLowerCase();

      // Check for keyword matches
      const words = queryLower.split(/\s+/);
      for (const word of words) {
        if (word.length > 2 && searchText.includes(word)) {
          score += 1;
        }
      }

      return { post, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return matches.map(({ post }) => formatPostContext(post));
}

/**
 * Format post for context
 */
function formatPostContext(post: Post): PostContext {
  return {
    instagramId: post.instagramId,
    caption: truncate(post.caption || post.transcript || "", 300),
    contentType: post.classification?.contentType,
    subject: post.classification?.subject,
    coreMessage: post.classification?.coreMessage,
    postedAt: post.postedAt,
    permalink: post.permalink,
  };
}

/**
 * Build RAG context string for LLM
 */
export function buildRAGContext(posts: PostContext[]): string {
  if (posts.length === 0) {
    return "No relevant content found in the library.";
  }

  const lines = posts.map((post, i) => {
    const parts = [`[Post ${i + 1}]`];
    if (post.subject) parts.push(`Topic: ${post.subject}`);
    if (post.coreMessage) parts.push(`Key point: ${post.coreMessage}`);
    if (post.caption) parts.push(`Content: "${post.caption}"`);
    parts.push(`Link: ${post.permalink}`);
    return parts.join("\n");
  });

  return `Relevant content from the library:\n\n${lines.join("\n\n")}`;
}

/**
 * Get RAG result with context
 */
export async function getRAGContext(
  accountId: string,
  topic?: string,
  userMessage?: string
): Promise<RAGResult> {
  // Get topic-relevant posts
  let posts = await getRelevantPosts(accountId, topic, 8);

  // If user message provided, also search for specific matches
  if (userMessage && userMessage.length > 10) {
    const searchResults = await searchPosts(accountId, userMessage, 3);

    // Merge and dedupe
    const seen = new Set(posts.map((p) => p.instagramId));
    for (const result of searchResults) {
      if (!seen.has(result.instagramId)) {
        posts.push(result);
        seen.add(result.instagramId);
      }
    }
  }

  // Limit to top 10
  posts = posts.slice(0, 10);

  return {
    posts,
    context: buildRAGContext(posts),
  };
}

/**
 * Truncate text
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}
