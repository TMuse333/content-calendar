/**
 * Notion Service
 *
 * Direct reads from Notion databases.
 * No MongoDB sync - we read live from Notion.
 *
 * Data ownership:
 * - Notion OWNS: Posts, Topics, Patterns, Topic Library (strategy data)
 * - MongoDB OWNS: IG metrics, insights, reports (tracking data)
 *
 * Join key: igPostLink in Notion Post → matches trackedPost.igPostUrl in Mongo
 */

import { getNotionClient } from "./client";
import type {
  NotionPost,
  Topic,
  NotionConfig,
  PostStatus,
  PostType,
  DecisionStage,
  Level,
  TopicStatus,
} from "./types";

// =============================================================================
// PROPERTY EXTRACTORS (parse Notion property values)
// =============================================================================

function extractTitle(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as { title?: Array<{ plain_text?: string }> };
  return p.title?.[0]?.plain_text ?? "";
}

function extractRichText(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as { rich_text?: Array<{ plain_text?: string }> };
  return p.rich_text?.[0]?.plain_text ?? "";
}

function extractSelect(prop: unknown): string | undefined {
  if (!prop || typeof prop !== "object") return undefined;
  const p = prop as { select?: { name?: string } };
  return p.select?.name;
}

function extractStatus(prop: unknown): string | undefined {
  if (!prop || typeof prop !== "object") return undefined;
  const p = prop as { status?: { name?: string } };
  return p.status?.name;
}

function extractMultiSelect(prop: unknown): string[] {
  if (!prop || typeof prop !== "object") return [];
  const p = prop as { multi_select?: Array<{ name: string }> };
  return p.multi_select?.map((s) => s.name) ?? [];
}

function extractCheckbox(prop: unknown): boolean {
  if (!prop || typeof prop !== "object") return false;
  const p = prop as { checkbox?: boolean };
  return p.checkbox ?? false;
}

function extractUrl(prop: unknown): string | undefined {
  if (!prop || typeof prop !== "object") return undefined;
  const p = prop as { url?: string };
  return p.url ?? undefined;
}

const MEDIA_EXT = /\.(mp4|mov|m4v|webm|jpe?g|png|gif|webp|avif)$/i;

/**
 * Preview can be a Files property (drag a video/image into Notion) or a URL.
 * Returns the first file's URL. Notion-hosted file URLs are signed and expire
 * after ~1 hour, which is fine because the app reads Notion live on each load.
 * If the URL itself has no media extension but the file name does, the name's
 * extension is added as a URL fragment so the UI knows to play it as video.
 */
export function extractFileOrUrl(prop: unknown): string | undefined {
  if (!prop || typeof prop !== "object") return undefined;
  const p = prop as {
    url?: string;
    files?: Array<{ name?: string; type?: string; file?: { url?: string }; external?: { url?: string } }>;
  };
  if (p.url) return p.url;
  const first = p.files?.[0];
  if (!first) return undefined;
  const url = first.file?.url ?? first.external?.url;
  if (!url) return undefined;
  const pathname = url.split("?")[0].split("#")[0];
  const nameExt = first.name?.match(MEDIA_EXT)?.[0];
  if (!MEDIA_EXT.test(pathname) && nameExt) return `${url}#preview${nameExt.toLowerCase()}`;
  return url;
}

function extractRelation(prop: unknown): string[] {
  if (!prop || typeof prop !== "object") return [];
  const p = prop as { relation?: Array<{ id: string }> };
  return p.relation?.map((r) => r.id) ?? [];
}

// =============================================================================
// POST QUERIES
// =============================================================================

export async function getPosts(
  config: NotionConfig,
  options?: {
    status?: PostStatus;
    topicId?: string;
    limit?: number;
  }
): Promise<NotionPost[]> {
  const notion = getNotionClient();

  // Extract database ID from collection:// URL format if present
  const dataSourceId = config.postsDataSourceId.replace("collection://", "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (notion as any).dataSources.query({
    data_source_id: dataSourceId,
    page_size: options?.limit ?? 100,
  });

  const posts = response.results.map((page: unknown) => parsePost(page));

  // Apply filters in-memory
  let filtered = posts;
  if (options?.status) {
    filtered = filtered.filter((p: NotionPost) => p.status === options.status);
  }
  if (options?.topicId) {
    filtered = filtered.filter((p: NotionPost) => p.topicId === options.topicId);
  }

  return filtered;
}

export async function getPostById(
  config: NotionConfig,
  postId: string
): Promise<NotionPost | null> {
  const notion = getNotionClient();

  try {
    const page = await notion.pages.retrieve({ page_id: postId });
    // A review token only grants access to its own account's posts.
    if (!pageBelongsToDataSource(page, config.postsDataSourceId)) {
      return null;
    }
    return parsePost(page);
  } catch {
    return null;
  }
}

function normalizeId(id: string): string {
  return id.replace("collection://", "").replace(/-/g, "").toLowerCase();
}

/**
 * True when the page's parent is the given data source.
 * If Notion doesn't report a data source parent (older API shape), we can't
 * verify, so we allow it rather than break existing accounts.
 */
export function pageBelongsToDataSource(page: unknown, dataSourceId: string): boolean {
  const parent = (page as { parent?: { data_source_id?: string } }).parent;
  if (!parent?.data_source_id || !dataSourceId) return true;
  return normalizeId(parent.data_source_id) === normalizeId(dataSourceId);
}

export async function getPostByIgLink(
  config: NotionConfig,
  igPostLink: string
): Promise<NotionPost | null> {
  // Fetch all posts and find by IG link
  // In production, use a filter query
  const posts = await getPosts(config);
  return posts.find((p) => p.igPostLink === igPostLink) ?? null;
}

function parsePost(page: unknown): NotionPost {
  const p = page as {
    id: string;
    properties: Record<string, unknown>;
    created_time?: string;
    last_edited_time?: string;
  };

  const props = p.properties;

  return {
    id: p.id,
    title: extractTitle(props["Post"]),
    status: extractStatus(props["Status"]) as PostStatus ?? "Idea",
    type: extractSelect(props["Type"]) as PostType | undefined,
    topicId: extractRelation(props["Topic"])[0],
    questionAnswered: extractRichText(props["Question answered"]),
    decisionStage: extractSelect(props["Decision stage"]) as DecisionStage | undefined,
    level: extractSelect(props["Level"]) as Level | undefined,
    beliefBefore: extractRichText(props["Belief before"]),
    beliefAfter: extractRichText(props["Belief after"]),
    patternId: extractRelation(props["Pattern"])[0],
    humanNatureLever: extractSelect(props["Human nature lever"]),
    literaryDevice: extractSelect(props["Literary device"]),
    videoFormat: extractSelect(props["Video format"]),
    caption: extractRichText(props["Caption"]),
    cta: extractRichText(props["CTA"]),
    previewUrl: extractFileOrUrl(props["Preview"]),
    successMetric: extractSelect(props["Success metric"]),
    answerCheck: extractCheckbox(props["Answer check"]),
    igPostLink: extractUrl(props["IG post link"]),
    createdAt: p.created_time ? new Date(p.created_time) : undefined,
    updatedAt: p.last_edited_time ? new Date(p.last_edited_time) : undefined,
  };
}

// =============================================================================
// TOPIC QUERIES
// =============================================================================

export async function getTopics(
  config: NotionConfig,
  options?: {
    status?: TopicStatus;
    limit?: number;
  }
): Promise<Topic[]> {
  const notion = getNotionClient();

  // Extract database ID from collection:// URL format if present
  const dataSourceId = config.topicsDataSourceId.replace("collection://", "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (notion as any).dataSources.query({
    data_source_id: dataSourceId,
    page_size: options?.limit ?? 100,
  });

  const topics = response.results.map((page: unknown) => parseTopic(page));

  if (options?.status) {
    return topics.filter((t: Topic) => t.status === options.status);
  }

  return topics;
}

export async function getTopicById(
  config: NotionConfig,
  topicId: string
): Promise<Topic | null> {
  const notion = getNotionClient();

  try {
    const page = await notion.pages.retrieve({ page_id: topicId });
    return parseTopic(page);
  } catch {
    return null;
  }
}

function parseTopic(page: unknown): Topic {
  const p = page as {
    id: string;
    properties: Record<string, unknown>;
  };

  const props = p.properties;

  return {
    id: p.id,
    title: extractTitle(props["Topic"]),
    audience: extractSelect(props["Audience"]) ?? "",
    whyItMatters: extractRichText(props["Why it matters"]),
    personalQuestion: extractRichText(props["Personal question (CTA)"]),
    localAngle: extractRichText(props["Local angle"]),
    fromLibraryId: extractRelation(props["From library"])[0],
    source: extractSelect(props["Source"]),
    status: extractStatus(props["Status"]) as TopicStatus ?? "Idea",
    priority: extractSelect(props["Priority"]) as "High" | "Medium" | "Low" | undefined,
    postIds: extractRelation(props["Posts"]),
  };
}


// =============================================================================
// UPDATE OPERATIONS (for client actions)
// =============================================================================

export interface UpdatePostStatusResult {
  success: boolean;
  postId: string;
  newStatus: PostStatus;
}

/**
 * Update a post's status in Notion
 * Used when client approves or requests changes
 */
export async function updatePostStatus(
  config: NotionConfig,
  postId: string,
  newStatus: PostStatus,
  _comment?: string
): Promise<UpdatePostStatusResult> {
  const notion = getNotionClient();

  // Update status using the Notion API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (notion.pages as any).update({
    page_id: postId,
    properties: {
      Status: {
        status: { name: newStatus },
      },
    },
  });

  return {
    success: true,
    postId,
    newStatus,
  };
}

// =============================================================================
// FEEDBACK (client "Request changes" comments)
// =============================================================================

export interface CreateFeedbackInput {
  postId: string;
  postTitle: string;
  comment: string;
}

/**
 * Saves a client's "Request changes" comment to the account's Feedback database.
 * Uses the same fields as the client's Notion feedback form so both land in one place.
 */
export async function createPostFeedback(
  config: NotionConfig,
  input: CreateFeedbackInput
): Promise<{ feedbackId: string }> {
  if (!config.feedbackDataSourceId) {
    throw new Error("Feedback database not configured for this account");
  }
  const notion = getNotionClient();
  const postUrl = `https://www.notion.so/${input.postId.replace(/-/g, "")}`;
  const title = input.postTitle || "Untitled post";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = await (notion.pages as any).create({
    parent: {
      type: "data_source_id",
      data_source_id: config.feedbackDataSourceId.replace("collection://", ""),
    },
    properties: {
      Feedback: { title: [{ text: { content: `Changes requested: ${title}`.slice(0, 200) } }] },
      About: { select: { name: "A specific post" } },
      "Which post?": {
        rich_text: [
          { text: { content: `${title} — ` } },
          { text: { content: "open post", link: { url: postUrl } } },
        ],
      },
      "How do you feel about it?": { select: { name: "Needs changes" } },
      Comments: { rich_text: [{ text: { content: input.comment.slice(0, 2000) } }] },
      Handled: { status: { name: "New" } },
    },
  });

  return { feedbackId: (page as { id: string }).id };
}

// =============================================================================
// AGGREGATIONS (useful for client portal)
// =============================================================================

export interface PostsSummary {
  total: number;
  byStatus: Record<PostStatus, number>;
  byLevel: Partial<Record<Level, number>>;
  byDecisionStage: Partial<Record<DecisionStage, number>>;
  readyForReview: number;
  published: number;
}

export async function getPostsSummary(config: NotionConfig): Promise<PostsSummary> {
  const posts = await getPosts(config);

  const summary: PostsSummary = {
    total: posts.length,
    byStatus: {
      "Idea": 0,
      "Draft": 0,
      "Ready for review": 0,
      "Approved": 0,
      "Scheduled": 0,
      "Posted": 0,
      "Archived": 0,
    },
    byLevel: {},
    byDecisionStage: {},
    readyForReview: 0,
    published: 0,
  };

  for (const post of posts) {
    // Count by status
    summary.byStatus[post.status] = (summary.byStatus[post.status] || 0) + 1;

    // Count by level
    if (post.level) {
      summary.byLevel[post.level] = (summary.byLevel[post.level] || 0) + 1;
    }

    // Count by decision stage
    if (post.decisionStage) {
      summary.byDecisionStage[post.decisionStage] =
        (summary.byDecisionStage[post.decisionStage] || 0) + 1;
    }
  }

  summary.readyForReview = summary.byStatus["Ready for review"] || 0;
  summary.published = summary.byStatus["Posted"] || 0;

  return summary;
}
