/**
 * Question sets clients answer so their content sounds like them.
 * Each answer becomes one or more posts. Per-account sets can be added later.
 */
export interface Question {
  id: string;
  prompt: string;
  hint?: string;
}

export const SELLER_QUESTIONS: Question[] = [
  { id: "top-questions", prompt: "What are the top 3 questions sellers asked you this year?", hint: "Exactly how they asked them is perfect." },
  { id: "pricing-mistakes", prompt: "What do sellers get wrong about pricing right now?" },
  { id: "fix-vs-skip", prompt: "What's worth fixing before listing, and what's a waste of money?" },
  { id: "fall-winter", prompt: "Is fall/winter actually slower for sellers on PEI?", hint: "Your honest take, not the textbook answer." },
  { id: "nervous-seller", prompt: "Tell me about a seller who was nervous at the start. What happened?", hint: "No names needed." },
  { id: "commission-check", prompt: "For the \"what selling costs\" post: is 5% commission a fair example number? If not, what should we use?" },
];

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
