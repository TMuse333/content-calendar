/**
 * Notion Types
 *
 * These types match the real Notion database schemas.
 * Source of truth: System Spec & Greg's Notion workspace
 *
 * Key databases:
 * - Posts: Individual content pieces with strategy metadata
 * - Topics: Themes that group posts (Topic → Posts)
 * - Information Patterns: Reusable belief-shift templates
 * - Topic Library: Master list of topic ideas
 */

// =============================================================================
// DECISION STAGES (1-6 from the Playbook)
// =============================================================================
export type DecisionStage =
  | "1 - Good idea?"           // Is this worth pursuing?
  | "2 - What's involved?"     // What does this look like in practice?
  | "3 - My situation?"        // Does this apply to me?
  | "4 - Worked for others?"   // Has this helped people like me?
  | "5 - Trust them?"          // Can I trust this person/company?
  | "6 - How to start?";       // What's my first step?

// =============================================================================
// L-LEVELS (Content hierarchy from Identity to Personality)
// =============================================================================
export type Level =
  | "L1 - Identity"           // Who you are, what you stand for
  | "L2 - Offer"              // What you provide, services/products
  | "L3 - Process"            // How you work, methodology
  | "L4 - Proof"              // Results, testimonials, case studies
  | "L5 - Expertise"          // Knowledge, insights, education
  | "L6 - Situations"         // Specific scenarios, use cases
  | "L7 - Personality";       // Personal stories, humor, humanity

// =============================================================================
// POST TYPES
// =============================================================================
export type PostType =
  | "New Realization"
  | "Myth Bust"
  | "People Watch"
  | "Story Time"
  | "How They Think"
  | "Prediction"
  | "Teaching Moment"
  | "Behind The Scenes";

// =============================================================================
// POST STATUS (workflow states)
// =============================================================================
export type PostStatus =
  | "Idea"
  | "Drafting"
  | "Ready for review"
  | "Approved"
  | "Scheduled"
  | "Posted"
  | "Archived";

// =============================================================================
// TOPIC STATUS (matches Greg's Notion schema)
// =============================================================================
export type TopicStatus =
  | "Idea"
  | "Active"
  | "Covered";

// =============================================================================
// BRANCH STATUS (niche-down loop from Playbook section 11)
// =============================================================================
export type BranchStatus =
  | "Testing"    // New branch being explored
  | "Winner"     // Performing well, gets more posts
  | "Paused"     // Not active but not dropped
  | "Dropped";   // Not worth pursuing

// =============================================================================
// ROUND (month of the niche-down cycle)
// =============================================================================
export type Round =
  | "Month 1"    // Explore: 2-3 branches, 2-3 posts each
  | "Month 2"    // Exploit: winners get more, drop flops
  | "Month 3"    // Refine: split winners into narrower sub-questions
  | "Month 4+";  // Ongoing refinement

// =============================================================================
// REPORT STATUS (workflow states for monthly reports)
// =============================================================================
export type ReportStatus =
  | "Due"
  | "Drafting"
  | "Sent";

// =============================================================================
// INFORMATION PATTERN (reusable belief-shift templates)
// =============================================================================
export interface InformationPattern {
  id: string;                           // Notion page ID
  pattern: string;                      // Pattern name
  category: string;                     // Category grouping
  decisionStage: DecisionStage;         // Which stage this addresses
  typicalLevel: Level;                  // What L-level this usually serves
  beliefShift: string;                  // The belief transformation
  example: string;                      // Example content
}

// =============================================================================
// TOPIC (themes that group posts)
// =============================================================================
export interface Topic {
  id: string;                           // Notion page ID
  title: string;                        // Topic title
  audience: string;                     // Who this is for
  whyItMatters: string;                 // Value proposition
  personalQuestion: string;             // CTA question
  localAngle?: string;                  // Local market angle
  fromLibraryId?: string;               // Relation to Topic Library
  source?: string;                      // Where idea came from
  status: TopicStatus;
  priority?: "High" | "Medium" | "Low";
  postIds: string[];                    // Related Post IDs
}

// =============================================================================
// POST (individual content pieces)
// =============================================================================
export interface NotionPost {
  id: string;                           // Notion page ID
  title: string;                        // Post title ("Post" property)
  status: PostStatus;
  type?: PostType;

  // Strategy fields
  topicId?: string;                     // Relation to Topic
  questionAnswered?: string;            // What question this addresses
  decisionStage?: DecisionStage;
  level?: Level;

  // Belief transformation
  beliefBefore?: string;                // What they believe now
  beliefAfter?: string;                 // What they should believe after

  // Pattern & technique
  patternId?: string;                   // Relation to Information Pattern
  humanNatureLever?: string;            // Psychological lever used
  literaryDevice?: string;              // Writing technique

  // Content
  videoFormat?: string;                 // Hook, story, etc.
  caption?: string;                     // Post caption
  cta?: string;                         // Call to action
  previewUrl?: string;                  // Preview image/video

  // Tracking
  successMetric?: string;               // How we measure success
  answerCheck?: boolean;                // Does it answer the question?
  igPostLink?: string;                  // Instagram post URL (JOIN KEY!)

  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

// =============================================================================
// TOPIC LIBRARY (master list of topic ideas)
// =============================================================================
export interface TopicLibraryItem {
  id: string;
  topic: string;
  audience: string;
  whyItMatters: string;
  personalQuestion: string;
  bestSeason?: string[];                // Array of seasons
  defaultQuestions?: string[];          // Default questions to answer
}

// =============================================================================
// NOTION CONFIG (per-account data source IDs)
// =============================================================================
export interface NotionConfig {
  postsDataSourceId: string;            // Posts collection:// URL
  topicsDataSourceId: string;           // Topics collection:// URL
  feedbackDataSourceId?: string;        // Feedback collection:// URL (client "Request changes" comments)
}

// =============================================================================
// API RESPONSE TYPES (for parsing Notion responses)
// =============================================================================
export interface NotionPageResult {
  id: string;
  properties: Record<string, unknown>;
  created_time: string;
  last_edited_time: string;
}

export interface NotionQueryResponse {
  results: NotionPageResult[];
  has_more: boolean;
  next_cursor?: string;
}
