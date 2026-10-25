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

export type QuestionSetId = "content" | "strategy" | "clients" | "carousels";

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

/**
 * "clients": past-client wins. Client-win posts are the best-performing format
 * on the accounts measured so far; these answers become "client win + lesson" posts.
 */
export const CLIENT_WIN_QUESTIONS: Question[] = [
  { id: "win-who", prompt: "Think of a recent client you were proud to help. Who were they, roughly, and what were they trying to do?", hint: "First names or 'a couple downsizing from Kensington' is plenty.", notionProperty: "Client win: who" },
  { id: "win-stuck", prompt: "What were they stuck on or worried about before they called you?", hint: "Price? Timing? Where to go next? A past bad experience?", notionProperty: "Client win: stuck on" },
  { id: "win-difference", prompt: "What did you do that made the difference?", hint: "The one thing you did that another agent might not have.", notionProperty: "Client win: what made the difference" },
  { id: "win-others", prompt: "Who else from this year has a story like that?", hint: "Even just a name and one line each — we'd space them out over the next month or two.", notionProperty: "Client win: others" },
  { id: "win-tag-ok", prompt: "Are any of these clients OK being tagged or named in a post?", hint: "If unsure, we keep them anonymous.", notionProperty: "Client win: tag OK" },
  { id: "win-cost-ranges", prompt: "For the \"what selling costs\" post — any dollar ranges you're comfortable with for HST, lawyer, mortgage discharge and movers?", hint: "Optional. Right now those slides only show the 5% commission example.", notionProperty: "Carousel: cost ranges" },
];

/**
 * "carousels": per-carousel confirmations before the current batch goes live
 * (from "Questions for Greg", Oct 24). Dates follow the Notion post dates.
 */
export const CAROUSEL_QUESTIONS: Question[] = [
  { id: "timing-competition", prompt: "Is it true on PEI that there's less competition from other listings in winter?", hint: "Fall/winter carousel (posts Nov 6).", notionProperty: "Carousel: winter competition" },
  { id: "timing-before-spring", prompt: "Do you advise sellers to list before the spring listings arrive?", hint: "Fall/winter carousel.", notionProperty: "Carousel: list before spring" },
  { id: "downsize-sell-first", prompt: "For most downsizers, do you recommend \"sell first, with a later closing\"?", hint: "Sell first or buy first carousel (posts Oct 30).", notionProperty: "Carousel: sell first" },
  { id: "downsize-walk-away", prompt: "Is \"know what you'll walk away with, then shop\" how you'd put it?", hint: "Sell first or buy first carousel.", notionProperty: "Carousel: walk away" },
  { id: "list-steps", prompt: "Is this your order of steps after \"let's list\": prep, photos and video, go live, showings, offers?", hint: "After \"let's list\" carousel (posts Nov 1).", notionProperty: "Carousel: listing steps" },
  { id: "list-offers", prompt: "Do you handle offers as accept, counter or decline — or would you add anything?", hint: "After \"let's list\" carousel.", notionProperty: "Carousel: offers" },
  { id: "price-three-things", prompt: "Your price comes from three things: recent sold prices nearby, condition, and a first-two-weeks plan. Is that right?", hint: "Pricing carousel (posts Nov 8).", notionProperty: "Carousel: price inputs" },
  { id: "price-two-weeks", prompt: "Are you comfortable saying a new listing gets the most attention in its first two weeks?", hint: "Pricing carousel.", notionProperty: "Carousel: first two weeks" },
  { id: "costs-ranges", prompt: "Optional: if you want dollar ranges for HST, lawyer, mortgage discharge and movers, send the numbers you're comfortable with.", hint: "Selling costs carousel (posts Oct 28). Right now the slides only show the 5% commission example.", notionProperty: "Carousel: cost ranges" },
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
  clients: {
    id: "clients",
    label: "Your recent client wins",
    intro: "Your best post this year was a client congratulations — it reached 709 people, about 3× your normal post. A few questions so we can turn wins like that into posts. No names needed unless you want them. Short answers or a voice note back are fine.",
    questions: CLIENT_WIN_QUESTIONS,
  },
  carousels: {
    id: "carousels",
    label: "Carousel confirmations",
    intro: "Quick confirmations before these carousels go live — a yes/no plus a line is perfect, and skip any you want.",
    questions: CAROUSEL_QUESTIONS,
  },
};

export function isQuestionSetId(v: unknown): v is QuestionSetId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(QUESTION_SETS, v);
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
