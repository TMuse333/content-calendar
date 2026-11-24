/**
 * Tree verdicts: the DECISION layer on top of tree-evidence.
 *
 * tree-evidence answers "what happened on this node" (posts, reach, stories).
 * This module answers "so what, and what next":
 *
 *   verdict per node — measured against the ACCOUNT'S OWN baseline
 *     untested   no post on the node has IG metrics yet
 *     promising  beating baseline by ≥10%, but fewer than 3 tests
 *     proven     ≥3 tests and beating baseline by ≥10%
 *     weak       ≥2 tests and trailing baseline by ≥10%
 *     mixed      measured, but within ±10% of baseline (no clear signal)
 *
 *   next[] — ranked actions: confirm the promising, double down on the proven,
 *   run first tests where stories exist but nothing was measured, rest the weak.
 *
 * Read-model only: no Notion writes, no Mongo writes, no side effects.
 */
import { getTreeWithEvidence, type NodeEvidence } from "./tree-evidence";
import { getTrackedPostsByAccount } from "@/lib/mongodb/tracked-posts";
import type { NotionConfig } from "./types";

export type Verdict = "proven" | "promising" | "weak" | "mixed" | "untested";

export interface NodeVerdict {
  nodeId: string;
  name: string;
  verdict: Verdict;
  tests: number;            // posts on the node WITH IG metrics
  avgReach: number;         // across measured posts (0 when untested)
  lift: number | null;      // avgReach vs account baseline, e.g. 0.54 = +54%; null when unmeasurable
  bestPost: { title: string; reach: number } | null;
  storyCount: number;
  reason: string;           // the verdict, in words — shown in UI as "why this verdict"
}

export interface NextAction {
  rank: number;
  nodeId: string;
  name: string;
  verdict: Verdict;
  why: string;
  suggest: string;
}

export interface TreeNext {
  baseline: { avgReach: number; measuredPosts: number };
  verdicts: NodeVerdict[];  // every node, tree order
  next: NextAction[];       // ranked actions, best first
}

const LIFT_BAND = 0.1;      // ±10% of baseline counts as "no clear signal"
const PROVEN_TESTS = 3;     // tests needed before "beating baseline" becomes "proven"

function pct(lift: number): string {
  return `${lift >= 0 ? "+" : ""}${Math.round(lift * 100)}%`;
}

export function verdictFor(n: NodeEvidence, baselineReach: number): NodeVerdict {
  const tests = n.metrics.posts;
  const avgReach = n.metrics.avgReach;
  const best = n.posts.find((p) => p.hasMetrics);
  const bestPost = best ? { title: best.title, reach: best.reach ?? 0 } : null;

  let verdict: Verdict;
  let lift: number | null = null;
  let reason: string;

  if (tests === 0) {
    verdict = "untested";
    reason = n.storyCount > 0
      ? `${n.storyCount} ${n.storyCount === 1 ? "story" : "stories"} on the node, no measured post yet`
      : "no stories and no measured posts yet";
  } else if (baselineReach <= 0) {
    verdict = "mixed";
    reason = `${tests} measured ${tests === 1 ? "test" : "tests"}, but no account baseline to judge against yet`;
  } else {
    lift = avgReach / baselineReach - 1;
    if (lift >= LIFT_BAND) {
      verdict = tests >= PROVEN_TESTS ? "proven" : "promising";
      reason =
        verdict === "proven"
          ? `beats baseline (${pct(lift)}) across ${tests} tests`
          : `beats baseline (${pct(lift)}) but only ${tests} ${tests === 1 ? "test" : "tests"} — not yet proven`;
    } else if (lift <= -LIFT_BAND && tests >= 2) {
      verdict = "weak";
      reason = `trails baseline (${pct(lift)}) across ${tests} tests`;
    } else {
      verdict = "mixed";
      reason = `within ±10% of baseline (${pct(lift)}, ${tests} ${tests === 1 ? "test" : "tests"}) — no clear signal`;
    }
  }

  return {
    nodeId: n.id,
    name: n.name,
    verdict,
    tests,
    avgReach,
    lift,
    bestPost,
    storyCount: n.storyCount,
    reason,
  };
}

/** Ranked actions from the verdicts. Pure function — unit-testable without I/O. */
export function rankNext(verdicts: NodeVerdict[], limit = 8): NextAction[] {
  const byLift = (a: NodeVerdict, b: NodeVerdict) => (b.lift ?? 0) - (a.lift ?? 0);

  const promising = verdicts.filter((v) => v.verdict === "promising").sort(byLift);
  const proven = verdicts.filter((v) => v.verdict === "proven").sort(byLift);
  const untestedStoried = verdicts
    .filter((v) => v.verdict === "untested" && v.storyCount > 0)
    .sort((a, b) => b.storyCount - a.storyCount);
  const mixed = verdicts.filter((v) => v.verdict === "mixed" && v.tests > 0).sort(byLift);
  const weak = verdicts.filter((v) => v.verdict === "weak").sort(byLift);

  const actions: Array<Omit<NextAction, "rank">> = [
    ...promising.map((v) => ({
      nodeId: v.nodeId, name: v.name, verdict: v.verdict,
      why: v.reason,
      suggest: `run test #${v.tests + 1} to confirm${v.storyCount > 0 ? " — story angle available" : ""}`,
    })),
    ...proven.map((v) => ({
      nodeId: v.nodeId, name: v.name, verdict: v.verdict,
      why: v.reason,
      suggest: "double down: next post here, strongest format first",
    })),
    ...untestedStoried.map((v) => ({
      nodeId: v.nodeId, name: v.name, verdict: v.verdict,
      why: v.reason,
      suggest: "first test: turn the strongest story into a post",
    })),
    ...mixed.map((v) => ({
      nodeId: v.nodeId, name: v.name, verdict: v.verdict,
      why: v.reason,
      suggest: "try a different angle or format before judging",
    })),
    ...weak.map((v) => ({
      nodeId: v.nodeId, name: v.name, verdict: v.verdict,
      why: v.reason,
      suggest: "rest this node — only revisit with a genuinely new angle",
    })),
  ];

  return actions.slice(0, limit).map((a, i) => ({ rank: i + 1, ...a }));
}

/**
 * The full read-model. Baseline = mean reach across ALL of the account's tracked
 * posts with a known reach (not just tree-linked ones) — the node is judged
 * against "a normal post for this account".
 */
export async function getTreeNext(
  accountId: string,
  config: NotionConfig,
  primaryNiche?: string
): Promise<TreeNext> {
  const [nodes, tracked] = await Promise.all([
    getTreeWithEvidence(accountId, config, primaryNiche),
    getTrackedPostsByAccount(accountId).catch(() => []),
  ]);

  const reaches = tracked
    .map((t) => t.metrics?.reach ?? 0)
    .filter((r) => r > 0);
  const baselineReach = reaches.length
    ? Math.round(reaches.reduce((a, b) => a + b, 0) / reaches.length)
    : 0;

  const verdicts = nodes.map((n) => verdictFor(n, baselineReach));

  return {
    baseline: { avgReach: baselineReach, measuredPosts: reaches.length },
    verdicts,
    next: rankNext(verdicts),
  };
}
