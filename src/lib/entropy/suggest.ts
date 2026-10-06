/**
 * Entropy Level Suggestion
 *
 * Pattern matching to suggest appropriate entropy level
 * based on question text or content.
 */

import { EntropyLevel, ENTROPY_LEVELS } from "./constants";

export interface SuggestResult {
  level: EntropyLevel;
  confidence: number; // 0-1
  reasoning: string;
  suggestedUncertainty: string;
}

// Pattern definitions for each level
const LEVEL_PATTERNS: Record<EntropyLevel, { patterns: RegExp[]; weight: number }> = {
  L1: {
    patterns: [
      /\bwho (am i|are you|is)\b/i,
      /\bintroduc/i,
      /\bmeet\b/i,
      /\babout me\b/i,
    ],
    weight: 0.7,
  },
  L2: {
    patterns: [
      /\bservices?\b/i,
      /\bhow (do i|can i) (start|begin|get started)/i,
      /\bwork with me\b/i,
      /\bhire\b/i,
      /\bbook a call\b/i,
    ],
    weight: 0.7,
  },
  L3: {
    patterns: [
      /\bhow does\b/i,
      /\bwhat happens (when|after|if)\b/i,
      /\bwhat('s| is) the process\b/i,
      /\bhow much\b/i,
      /\bcost(s)?\b/i,
      /\btimeline\b/i,
      /\bsteps? to\b/i,
      /\bwhat to expect\b/i,
      /\bclosing (day|costs?)\b/i,
      /\binspection\b/i,
      /\bappraisal\b/i,
      /\bpre-approv/i,
      /\bpre-qualif/i,
    ],
    weight: 0.85,
  },
  L4: {
    patterns: [
      /\btestimonial/i,
      /\breview/i,
      /\bjust sold\b/i,
      /\bclient stor/i,
      /\bresults?\b/i,
      /\bsuccess stor/i,
      /\bbefore.{1,20}after\b/i,
      /\bcase stud/i,
    ],
    weight: 0.9,
  },
  L5: {
    patterns: [
      /\bmarket\b/i,
      /\btrend/i,
      /\bstats?\b/i,
      /\bdata\b/i,
      /\binsight/i,
      /\bbest time to\b/i,
      /\bdifference between\b/i,
      /\bvs\.?\b/i,
      /\bwinter|summer|spring|fall\b.*\b(list|sell|buy)\b/i,
      /\b(list|sell|buy)\b.*\bwinter|summer|spring|fall\b/i,
      /\binterest rate/i,
      /\bpricing strateg/i,
      /\bneighbo(u)?rhood/i,
      /\barea guide\b/i,
    ],
    weight: 0.85,
  },
  L6: {
    patterns: [
      /\bshould i\b/i,
      /\bcan i\b/i,
      /\bwhat if (i|my)\b/i,
      /\bmy situation\b/i,
      /\bfirst[- ]time\b/i,
      /\bdownsiz/i,
      /\brelocat/i,
      /\binherit/i,
      /\bdivorce\b/i,
      /\binvest(ment|or)\b/i,
      /\bmultiple offers?\b/i,
      /\bback out\b/i,
      /\bbidding war\b/i,
    ],
    weight: 0.9,
  },
  L7: {
    patterns: [
      /\bmy stor/i,
      /\bwhy i\b/i,
      /\bbehind the scenes\b/i,
      /\bpersonal/i,
      /\bvalues?\b/i,
      /\bbelieve\b/i,
      /\bfamil(y|ies)\b/i,
      /\bcommunit/i,
    ],
    weight: 0.8,
  },
};

/**
 * Suggest an entropy level based on question/topic text
 */
export function suggestLevel(text: string): SuggestResult {
  const scores: Record<EntropyLevel, { matches: number; patterns: string[] }> = {
    L1: { matches: 0, patterns: [] },
    L2: { matches: 0, patterns: [] },
    L3: { matches: 0, patterns: [] },
    L4: { matches: 0, patterns: [] },
    L5: { matches: 0, patterns: [] },
    L6: { matches: 0, patterns: [] },
    L7: { matches: 0, patterns: [] },
  };

  // Check each level's patterns
  for (const [level, { patterns }] of Object.entries(LEVEL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores[level as EntropyLevel].matches++;
        scores[level as EntropyLevel].patterns.push(pattern.source);
      }
    }
  }

  // Find best match
  let bestLevel: EntropyLevel = "L5"; // Default to expertise
  let bestScore = 0;

  for (const [level, { matches }] of Object.entries(scores)) {
    const weight = LEVEL_PATTERNS[level as EntropyLevel].weight;
    const score = matches * weight;
    if (score > bestScore) {
      bestScore = score;
      bestLevel = level as EntropyLevel;
    }
  }

  // Calculate confidence
  const totalMatches = Object.values(scores).reduce((sum, s) => sum + s.matches, 0);
  const confidence = totalMatches > 0
    ? Math.min(0.95, (scores[bestLevel].matches / totalMatches) * LEVEL_PATTERNS[bestLevel].weight)
    : 0.5; // Default confidence if no patterns matched

  // Generate reasoning
  const matchedPatterns = scores[bestLevel].patterns;
  const reasoning = matchedPatterns.length > 0
    ? `Matched patterns: ${matchedPatterns.slice(0, 3).join(", ")}`
    : `Default suggestion based on content type`;

  // Generate suggested uncertainty
  const suggestedUncertainty = generateUncertainty(text, bestLevel);

  return {
    level: bestLevel,
    confidence,
    reasoning,
    suggestedUncertainty,
  };
}

/**
 * Generate a suggested "uncertainty addressed" statement
 */
function generateUncertainty(text: string, level: EntropyLevel): string {
  const levelDef = ENTROPY_LEVELS[level];

  // Try to extract the core question
  const questionMatch = text.match(/^(what|how|when|why|should|can|is|are|do|does)\b.+\??/i);

  if (questionMatch) {
    // Clean up and reframe as uncertainty
    let uncertainty = questionMatch[0]
      .replace(/\?$/, "")
      .replace(/^(what|how)\s+(is|are|does|do)\s+/i, "")
      .replace(/^(should|can)\s+i\s+/i, "Whether to ")
      .trim();

    // Capitalize first letter
    uncertainty = uncertainty.charAt(0).toUpperCase() + uncertainty.slice(1);

    return uncertainty;
  }

  // Fallback based on level
  return levelDef.question;
}

/**
 * Batch suggest levels for multiple items
 */
export function suggestLevels(texts: string[]): SuggestResult[] {
  return texts.map(suggestLevel);
}

/**
 * Get all patterns for a specific level (useful for reference)
 */
export function getPatternsForLevel(level: EntropyLevel): string[] {
  return LEVEL_PATTERNS[level].patterns.map(p => p.source);
}

/**
 * Get all patterns grouped by level (for reference page)
 */
export function getAllPatterns(): Record<EntropyLevel, string[]> {
  const result: Record<EntropyLevel, string[]> = {} as Record<EntropyLevel, string[]>;
  for (const [level, { patterns }] of Object.entries(LEVEL_PATTERNS)) {
    result[level as EntropyLevel] = patterns.map(p => {
      // Convert regex to readable string
      return p.source
        .replace(/\\b/g, "")
        .replace(/\(/g, "")
        .replace(/\)/g, "")
        .replace(/\|/g, " / ")
        .replace(/\?/g, "")
        .replace(/\+/g, "")
        .replace(/\./g, "")
        .replace(/\*/g, "")
        .replace(/\[.*?\]/g, "")
        .replace(/\{.*?\}/g, "")
        .trim();
    });
  }
  return result;
}
