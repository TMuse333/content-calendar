export interface SharePost {
  id: string;
  title: string;
  questionAnswered?: string;
  type?: string;
  status: string;
  postDate?: string;
  caption?: string;
  previewUrls: string[];
}

export interface ShareData {
  clientName: string;
  message: string | null;
  posts: SharePost[];
  comingUp?: { date: string; title: string; type?: string }[];
  questionSet: {
    id: string;
    label: string;
    intro: string;
    questions: { id: string; prompt: string; hint?: string }[];
  } | null;
}

export type Reaction = "looks-good" | "change";

export function fmtDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
