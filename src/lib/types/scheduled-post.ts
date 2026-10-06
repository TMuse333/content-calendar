/**
 * ScheduledPost Types
 *
 * Core data model for the three-app pipeline:
 * Strategy App (calendar) → Agent App (knowledge) → Graphics App (render)
 *
 * A ScheduledPost represents intent to post on a specific date.
 * It progresses through statuses as content is prepared and rendered.
 */

import { ObjectId } from "mongodb";

// Post status workflow
export type ScheduledPostStatus =
  | "proposed"       // In proposed schedule, awaiting client approval of plan
  | "scheduled"      // Client approved the slot, ready for content
  | "content-ready"  // Knowledge/content collected
  | "rendered"       // Graphic created (from Graphics App)
  | "in-review"      // Sent to client for graphic approval
  | "revision"       // Client requested changes
  | "approved"       // Client approved graphic, ready to post
  | "posted";        // Published to Instagram

// Target audience
export type PostAudience = "buyers" | "sellers" | "both";

// Entropy reduction levels (see docs/ENTROPY_LEVELS.md)
export type EntropyLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";

export const ENTROPY_LEVELS: Record<EntropyLevel, { name: string; question: string }> = {
  L1: { name: "Identity", question: "Who are you, what do you do, where?" },
  L2: { name: "Offer", question: "Is this for me? How do I start?" },
  L3: { name: "Process", question: "How does it work? Cost? Timing?" },
  L4: { name: "Proof", question: "Has it worked for people like me?" },
  L5: { name: "Expertise", question: "Do you know this market deeply?" },
  L6: { name: "Situations", question: "Do you understand MY exact situation?" },
  L7: { name: "Personality", question: "Do I trust and like this person?" },
};

// Day of week for recurring slots
export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

// Content intent - what we WANT to post
export interface PostIntent {
  audience: PostAudience;
  topic?: string;                    // "North Shore market update"
  viewerQuestion?: string;           // "What are homes selling for?"
  suggestedFormat?: string;          // "MarketPulseCarousel" - hint for Graphics App

  // Entropy reduction (see docs/ENTROPY_LEVELS.md)
  level?: EntropyLevel;              // L1-L7 target level
  uncertaintyAddressed?: string;     // "Whether winter is a good time to list"
}

// Main ScheduledPost type
export interface ScheduledPost {
  _id?: ObjectId;
  id: string;
  agentId: string;                   // "greg-caseley" - maps to account

  // Scheduling
  scheduledFor: string;              // ISO date "2026-10-01"
  dayOfWeek: DayOfWeek;
  status: ScheduledPostStatus;

  // Content intent
  intent: PostIntent;

  // Content (manual entry or from Agent App)
  content?: {
    headline?: string;
    body?: string;
    keyPoints?: string[];
    stats?: Record<string, string | number>;
    notes?: string;
  };

  // Links to other apps
  agentKnowledgeId?: string;         // ID from Agent App
  graphicId?: string;                // ID from Graphics App
  graphicPreviewUrl?: string;        // Preview image URL

  // Client review
  sentForReviewAt?: Date;            // When sent to client
  reviewedAt?: Date;                 // When client responded
  clientFeedback?: string;           // Feedback if revision requested
  revisionHistory?: {                // Track revision rounds
    feedback: string;
    requestedAt: Date;
    resolvedAt?: Date;
  }[];

  // Instagram post link (after posting)
  instagramPostId?: string;
  instagramPermalink?: string;
  postedAt?: Date;

  // Meta
  createdAt: Date;
  updatedAt: Date;
}

// ContentSlot - recurring post template
export interface ContentSlot {
  _id?: ObjectId;
  id: string;
  agentId: string;

  // Recurrence
  dayOfWeek: DayOfWeek;
  frequency: "weekly" | "biweekly" | "monthly";

  // Default intent
  defaultAudience: PostAudience;
  defaultTopics: string[];           // Rotate through these
  defaultFormat?: string;            // Suggested carousel format

  // Stats
  lastPosted?: Date;
  postsCount: number;

  // Meta
  createdAt: Date;
  updatedAt: Date;
}

// API Request types
export interface CreateScheduledPostRequest {
  scheduledFor: string;              // ISO date
  intent: PostIntent;
  content?: ScheduledPost["content"];
}

export interface UpdateScheduledPostRequest {
  scheduledFor?: string;
  status?: ScheduledPostStatus;
  intent?: Partial<PostIntent>;
  content?: ScheduledPost["content"];
  graphicId?: string;
  graphicPreviewUrl?: string;
  instagramPostId?: string;
  instagramPermalink?: string;
}

export interface LinkGraphicRequest {
  graphicId: string;
  previewUrl?: string;
}

// Helper to get day of week from date
export function getDayOfWeek(date: Date | string): DayOfWeek {
  const d = typeof date === "string" ? new Date(date) : date;
  const days: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[d.getDay()];
}

// Helper for status display
export function getStatusDisplay(status: ScheduledPostStatus): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case "proposed":
      return { label: "Proposed", color: "text-slate-400", bgColor: "bg-slate-500/20" };
    case "scheduled":
      return { label: "Scheduled", color: "text-blue-400", bgColor: "bg-blue-500/20" };
    case "content-ready":
      return { label: "Content Ready", color: "text-amber-400", bgColor: "bg-amber-500/20" };
    case "rendered":
      return { label: "Rendered", color: "text-purple-400", bgColor: "bg-purple-500/20" };
    case "in-review":
      return { label: "In Review", color: "text-orange-400", bgColor: "bg-orange-500/20" };
    case "revision":
      return { label: "Revision Requested", color: "text-red-400", bgColor: "bg-red-500/20" };
    case "approved":
      return { label: "Approved", color: "text-green-400", bgColor: "bg-green-500/20" };
    case "posted":
      return { label: "Posted", color: "text-emerald-400", bgColor: "bg-emerald-500/20" };
  }
}
