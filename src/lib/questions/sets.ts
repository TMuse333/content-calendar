/**
 * Question sets clients answer.
 *  - "content":  quick questions whose answers become posts
 *  - "strategy": onboarding / niche questions that decide what to make
 * `notionProperty` maps an answer onto a column of the client's Answers
 * database in Notion (when it has one); every answer is also written to the
 * page body, so unmapped questions are never lost.
 */
export interface Question {
  id: string;
  prompt: string;
  hint?: string;
  notionProperty?: string;
}

export interface QuestionSet {
  id: QuestionSetId;
  label: string;
  intro: string;
  questions: Question[];
}

export type QuestionSetId = "content" | "strategy";

export const SELLER_QUESTIONS: Question[] = [
  { id: "top-questions", prompt: "What are the top 3 questions sellers asked you this year?", hint: "Exactly how they asked them is perfect.", notionProperty: "Top 3 seller questions" },
  { id: "pricing-mistakes", prompt: "What do sellers get wrong about pricing right now?", notionProperty: "Pricing mistakes" },
  { id: "fix-vs-skip", prompt: "What's worth fixing before listing, and what's a waste of money?", notionProperty: "Fix vs skip" },
  { id: "fall-winter", prompt: "Is fall/winter actually slower for sellers on PEI?", hint: "Your honest take, not the textbook answer.", notionProperty: "Fall and winter" },
  { id: "nervous-seller", prompt: "Tell me about a seller who was nervous at the start. What happened?", hint: "No names needed.", notionProperty: "Nervous seller story" },
  { id: "commission-check", prompt: "For the \"what selling costs\" post: is 5% commission a fair example number? If not, what should we use?", notionProperty: "Commission check" },
];

export const STRATEGY_QUESTIONS: Question[] = [
  { id: "goal", prompt: "What's your goal for next year, and what would hitting it mean for you?", hint: "A number is great: deals, income, or listings." },
  { id: "ideal-client", prompt: "What type of client do you want more of?", hint: "Be specific: who they are, what they're going through." },
  { id: "avoid-client", prompt: "What type of client do you want fewer of?" },
  { id: "areas", prompt: "Which areas or neighbourhoods do you know better than anyone?" },
  { id: "different", prompt: "What do you do differently from other agents?" },
  { id: "best-story", prompt: "What's your best client story or result?", hint: "No names needed." },
  { id: "never-post", prompt: "Anything we should never post? (topics, tone, competitors)" },
];

export const QUESTION_SETS: Record<QuestionSetId, QuestionSet> = {
  content: {
    id: "content",
    label: "Content questions",
    intro: "Your answers make the posts sound like you, not generic. Short answers are fine, and skip any you want.",
    questions: SELLER_QUESTIONS,
  },
  strategy: {
    id: "strategy",
    label: "Strategy questions",
    intro: "These shape what we post for you and who it attracts. Short answers are fine, and skip any you want.",
    questions: STRATEGY_QUESTIONS,
  },
};

export function isQuestionSetId(v: unknown): v is QuestionSetId {
  return v === "content" || v === "strategy";
}

/** Default set for the standalone /questions page. */
export function questionsFor(_accountId: string): Question[] {
  return SELLER_QUESTIONS;
}

/** Keep only known question ids, trimmed, max 4000 chars each. */
export function cleanAnswers(input: unknown, questions: Question[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input || typeof input !== "object") return out;
  for (const q of questions) {
    const v = (input as Record<string, unknown>)[q.id];
    if (typeof v === "string" && v.trim()) out[q.id] = v.trim().slice(0, 4000);
  }
  return out;
}
