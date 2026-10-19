/**
 * Notion Module
 *
 * Direct reads from Notion databases for strategy content.
 * MongoDB handles tracking data (IG metrics, insights, reports).
 */

// Client
export { getNotionClient } from "./client";

// Types
export type {
  NotionPost,
  Topic,
  InformationPattern,
  TopicLibraryItem,
  NotionConfig,
  DecisionStage,
  Level,
  PostType,
  PostStatus,
  TopicStatus,
} from "./types";

// Service functions
export {
  // Posts
  getPosts,
  getPostById,
  getPostByIgLink,
  updatePostStatus,
  // Topics
  getTopics,
  getTopicById,
  // Aggregations
  getPostsSummary,
} from "./service";

export type { PostsSummary, UpdatePostStatusResult } from "./service";
