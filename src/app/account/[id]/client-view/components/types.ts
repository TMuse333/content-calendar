/**
 * Client-view types (client-safe fields only).
 * Internal strategy fields (Belief before/after, Pattern, Human nature lever,
 * Literary device) never appear here — same rule as the client-hub API.
 */

export interface StageCoverage {
  stage: string;
  label: string;
  covered: boolean;
  postCount: number;
  questions: {
    id: string;
    question: string;
    status: string;
  }[];
  planned?: boolean;
  plannedQuestions?: {
    id: string;
    question: string;
    status: string;
  }[];
}

export interface TopicWithCoverage {
  id: string;
  title: string;
  audience: string;
  personalQuestion: string;
  status: string;
  priority?: string;
  coverage: {
    stages: StageCoverage[];
    coveredCount: number;
    plannedCount?: number;
    totalStages: number;
    percentage: number;
  };
  totalPosts: number;
}

export interface ReviewPost {
  id: string;
  title: string;
  questionAnswered?: string;
  type?: string;
  topicId?: string;
  previewUrl?: string;
  previewUrls?: string[];
  caption?: string;
  cta?: string;
  postDate?: string;
}

export interface UpcomingPost {
  id: string;
  title: string;
  questionAnswered?: string;
  type?: string;
  topicId?: string;
  status: string;
  postDate?: string;
  previewUrls?: string[];
}

export interface PostedPost {
  id: string;
  title: string;
  questionAnswered?: string;
  type?: string;
  topicId?: string;
  status: string;
  previewUrl?: string;
  previewUrls?: string[];
  postDate?: string;
}

export interface ClientHubData {
  account: {
    id: string;
    name: string;
    handle?: string;
  };
  instagram: {
    connected: boolean;
    username?: string;
  };
  topics: TopicWithCoverage[];
  topicNames: Record<string, string>;
  needsReview: ReviewPost[];
  upcoming?: UpcomingPost[];
  posted: PostedPost[];
  summary: {
    topicsActive: number;
    topicsCovered: number;
    postsPublished: number;
    postsScheduled: number;
    postsNeedingReview: number;
  };
}

export interface CalendarPost {
  id: string;
  title: string;
  caption?: string;
  status: string;
  type?: string;
  previewUrl?: string;
  previewUrls?: string[];
  postedAt?: string;
  scheduledFor?: string;
  topic?: string;
  questionAnswered?: string;
  decisionStage?: string;
  cta?: string;
  source?: "instagram" | "notion";
}

export type CalendarFilter = "all" | "posts" | "scheduled";
