/**
 * Admin pipeline: what's pending for a client, grouped by who it's waiting on.
 */
import type { NotionPost, PostStatus } from "@/lib/notion/types";

export type PipelineColumn = "waiting-client" | "building" | "to-schedule" | "scheduled" | "ideas";

export interface PipelineItem {
  id: string;
  title: string;
  status: PostStatus;
  type?: string;
  questionAnswered?: string;
  postDate?: string;
  slides: number;
  thumbnail?: string;
  previewUrls: string[];
  notionUrl: string;
  issues: string[];
}

export const COLUMN_FOR_STATUS: Partial<Record<PostStatus, PipelineColumn>> = {
  "Ready for review": "waiting-client",
  Draft: "building",
  Approved: "to-schedule",
  Scheduled: "scheduled",
  Idea: "ideas",
};

/** Things that make a post look broken or incomplete to the client. */
export function issuesFor(p: NotionPost): string[] {
  const issues: string[] = [];
  const slides = p.previewUrls?.length ?? (p.previewUrl ? 1 : 0);
  if ((p.status === "Ready for review" || p.status === "Approved") && slides === 0) {
    issues.push("No preview: client sees an empty box");
  }
  if (p.status !== "Idea" && !p.questionAnswered) issues.push("No 'Question answered'");
  if ((p.status === "Approved" || p.status === "Scheduled") && !p.postDate) issues.push("No post date");
  if (p.status === "Draft" && slides === 0) issues.push("No slides attached yet");
  return issues;
}

export function buildPipeline(posts: NotionPost[]) {
  const columns: Record<PipelineColumn, PipelineItem[]> = {
    "waiting-client": [],
    building: [],
    "to-schedule": [],
    scheduled: [],
    ideas: [],
  };
  for (const p of posts) {
    const col = COLUMN_FOR_STATUS[p.status];
    if (!col) continue; // Posted / Archived are not pending
    const slides = p.previewUrls?.length ?? (p.previewUrl ? 1 : 0);
    columns[col].push({
      id: p.id,
      title: p.title,
      status: p.status,
      type: p.type,
      questionAnswered: p.questionAnswered,
      postDate: p.postDate,
      slides,
      thumbnail: p.previewUrls?.[0] ?? p.previewUrl,
      previewUrls: p.previewUrls?.length ? p.previewUrls : p.previewUrl ? [p.previewUrl] : [],
      notionUrl: `https://www.notion.so/${p.id.replace(/-/g, "")}`,
      issues: issuesFor(p),
    });
  }
  for (const list of Object.values(columns)) {
    list.sort((a, b) => (a.postDate ?? "9999").localeCompare(b.postDate ?? "9999"));
  }
  const counts = Object.fromEntries(Object.entries(columns).map(([k, v]) => [k, v.length])) as Record<PipelineColumn, number>;
  const issueCount = Object.values(columns).flat().filter((i) => i.issues.length > 0).length;
  return { columns, counts, issueCount };
}
