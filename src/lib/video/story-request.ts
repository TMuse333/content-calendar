/**
 * StoryRequest — the producer→renderer hand-off contract with the video-system app.
 *
 * Strategy-app (the producer) emits a StoryRequest; video-system's intake
 * translates it into internal render props and renders. We NEVER author the
 * renderer's internal scene props — that boundary is where the renderer's
 * "nothing invented" guarantee lives.
 *
 * Rules baked into the contract (enforced by video-system's validator, which
 * fails closed — build the emitter to satisfy them):
 *  - `confirmedFacts` is the ONLY permitted source of on-screen numbers/dates/
 *    prices; each needs a provenance quote. Empty array ⇒ general advice only.
 *  - `story.permission = "no"` text is refused; `firstNames` surface only when
 *    permission allows.
 *  - `story.media` must be renderer-reachable (Vercel Blob / public URL), NOT a
 *    Google Drive URL (the headless renderer has no auth session).
 *  - Beats are the producer's call: pick kept spans + tag roles. Do not hand the
 *    renderer a 40-min clip and expect it to find the story.
 */

export type Permission = "yes" | "anonymous" | "no";
export type Lens = "Who" | "What" | "When" | "Where" | "Why" | "How" | "How much" | "What if";
export type BeatRole = "hook" | "context" | "proof" | "cta";

/** A kept span of the source clip, tagged with its narrative role. */
export interface StoryBeat {
  role: BeatRole;
  startSec: number;
  endSec: number;
  note?: string;
}

/** The recorded clip. Must be renderer-reachable (Blob/public), 9:16, H.264. */
export interface StoryMedia {
  /** Public/Blob URL. Resolve Drive→Blob on the producer side before sending. */
  url?: string;
  /** Spec the renderer expects: mp4/H.264, 1080×1920 (9:16), ≥30fps. */
  spec?: "mp4/h264/1080x1920";
  /** Word-timestamped transcript URL, OR set transcribe=true to let the renderer
   *  Whisper it and return candidate beats for producer approval. */
  transcriptUrl?: string;
  transcribe?: boolean;
}

/** The only permitted source of on-screen numbers/dates/prices. */
export interface ConfirmedFact {
  claim: string;   // e.g. "non-resident land cap"
  value: string;   // e.g. "5 acres / ~$3,000 application"
  source: string;  // provenance quote — required; no source ⇒ not rendered
}

/** Lineage keys so every render traces back to the strategy data it came from. */
export interface StoryLineage {
  account: string;      // account slug (e.g. "greg-caseley")
  nodeId: string;       // the situation this trains
  questionId?: string;  // the node × lens question it answers
  lens?: Lens;
  postId?: string;
}

/** The belief shift the video is trying to produce. */
export interface StoryBrief {
  beliefBefore?: string;
  beliefAfter?: string;
  surprise?: string;
}

export interface StoryRequest {
  lineage: StoryLineage;
  brief: StoryBrief;
  hooks: string[];                 // alternative openings (A/B variants)
  story: {
    permission: Permission;
    breakthrough?: string;         // the turning point of the case
    firstNames?: string[];         // surfaced only when permission === "yes"
    media: StoryMedia;
    beats: StoryBeat[];
  };
  confirmedFacts: ConfirmedFact[];
  internal?: Record<string, unknown>;  // producer-only; never rendered
}

/**
 * Brand shape the renderer pulls from GET /api/accounts/[id] (by slug) and
 * caches locally. Producer stays source of truth; do not push brand unless
 * overriding. (Confirm-back (b) to video-system.)
 */
export interface PublicBrand {
  slug: string;
  colors: { primary: string; accent: string; bg: string; text: string };
  logo?: string;
  headshot?: string;
  font?: string;
  endCard: { brokerage?: string; website?: string; address?: string; agents?: string[] };
}

// NOTE: buildStoryRequest(node, story, question, media) lives with stories.ts
// once that reader exists — it maps a permission-cleared Story + its Node +
// Question into this shape. Deliberately not implemented here: the emitter needs
// the Stories schema (not yet pulled) and media must already be Drive→Blob
// resolved (plumbing lane). This file is the contract both sides build to.
