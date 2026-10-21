/**
 * "Coming up" on a share link: the rest of the planned schedule, titles and
 * dates only (no slides, no strategy fields), so the client sees the plan but
 * only reviews the posts in this link.
 */
export interface ComingUpInput {
  id: string;
  title: string;
  questionAnswered?: string;
  type?: string;
  status: string;
  postDate?: string;
}

export interface ComingUpItem {
  date: string;
  title: string;
  type?: string;
}

const PLANNED = new Set(["Idea", "Draft", "Ready for review", "Approved", "Scheduled"]);
// Listing graphics/videos are the client's own listings (and often placeholders
// like "listing TBD"); Coming up only shows the content plan.
const HIDDEN_TYPES = new Set(["Listing graphic", "Listing video"]);

export function buildComingUp(
  posts: ComingUpInput[],
  excludeIds: string[],
  today: string, // YYYY-MM-DD
  limit = 12
): ComingUpItem[] {
  const norm = (id: string) => id.replace(/-/g, "");
  const exclude = new Set(excludeIds.map(norm));
  return posts
    .filter((p) => p.postDate && p.postDate.slice(0, 10) >= today)
    .filter((p) => PLANNED.has(p.status))
    .filter((p) => !p.type || !HIDDEN_TYPES.has(p.type))
    .filter((p) => !exclude.has(norm(p.id)))
    .sort((a, b) => a.postDate!.localeCompare(b.postDate!))
    .slice(0, limit)
    .map((p) => ({ date: p.postDate!.slice(0, 10), title: p.questionAnswered || p.title, type: p.type }));
}
