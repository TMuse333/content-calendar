/**
 * Format → Level Mappings
 *
 * Maps carousel formats to their typical entropy levels.
 * Helps suggest appropriate formats based on level, or vice versa.
 */

import { EntropyLevel } from "./constants";

export interface FormatLevelMapping {
  primary: EntropyLevel;
  secondary: EntropyLevel[];
  description: string;
  playbook: {
    device: string;
    humanNature: string;
    infoTheory: string;
  };
}

// Which carousel formats serve which levels
export const FORMAT_LEVEL_MAP: Record<string, FormatLevelMapping> = {
  ProcessTimelineCarousel: {
    primary: "L3",
    secondary: ["L6"],
    description: "Step-by-step process walkthrough",
    playbook: {
      device: "Journey structure, Process timeline",
      humanNature: "Desire for control/mastery, fear of unknown",
      infoTheory: "Primary visual (timeline carries meaning)",
    },
  },
  MythVsFactCarousel: {
    primary: "L3",
    secondary: ["L5"],
    description: "Bust common misconceptions",
    playbook: {
      device: "Contrast + Authority",
      humanNature: "Fear of looking foolish, desire for mastery",
      infoTheory: "Redundant mode (text reinforces visual)",
    },
  },
  MarketPulseCarousel: {
    primary: "L5",
    secondary: [],
    description: "Local market data and trends",
    playbook: {
      device: "Authority, Social Proof (data as evidence)",
      humanNature: "Fear of falling behind, desire for informed decisions",
      infoTheory: "Primary visual (charts/numbers carry meaning)",
    },
  },
  ClientQuestionsCarousel: {
    primary: "L5",
    secondary: ["L3", "L6"],
    description: "Answer real client questions",
    playbook: {
      device: "Open Loop (question hooks), Authority",
      humanNature: "Curiosity, desire for insider knowledge",
      infoTheory: "Complementary (answer expands beyond question)",
    },
  },
  ThisOrThatCarousel: {
    primary: "L3",
    secondary: ["L6"],
    description: "Compare two options side by side",
    playbook: {
      device: "Contrast",
      humanNature: "Decision simplification, reducing cognitive load",
      infoTheory: "Complementary mode (visual adds what text can't)",
    },
  },
  NeighbourhoodGuideCarousel: {
    primary: "L5",
    secondary: ["L6"],
    description: "Spotlight a specific area",
    playbook: {
      device: "Future Pacing, Social Proof",
      humanNature: "Belonging, identity (\"people who live here are...\")",
      infoTheory: "Complementary (visuals show lifestyle text describes)",
    },
  },
  BuyerObjectionsCarousel: {
    primary: "L6",
    secondary: ["L3"],
    description: "Address specific buyer concerns",
    playbook: {
      device: "Objection handling, Authority",
      humanNature: "Fear reduction, building confidence",
      infoTheory: "Redundant (multiple angles on same concern)",
    },
  },
};

/**
 * Get formats that work for a specific level
 */
export function getFormatsForLevel(level: EntropyLevel): string[] {
  const formats: string[] = [];

  for (const [formatId, mapping] of Object.entries(FORMAT_LEVEL_MAP)) {
    if (mapping.primary === level || mapping.secondary.includes(level)) {
      formats.push(formatId);
    }
  }

  return formats;
}

/**
 * Get the primary level for a format
 */
export function getLevelForFormat(formatId: string): EntropyLevel | null {
  const mapping = FORMAT_LEVEL_MAP[formatId];
  return mapping?.primary || null;
}

/**
 * Get full mapping for a format
 */
export function getFormatMapping(formatId: string): FormatLevelMapping | null {
  return FORMAT_LEVEL_MAP[formatId] || null;
}

/**
 * Suggest a format based on level and optional keywords
 */
export function suggestFormat(level: EntropyLevel, keywords?: string[]): string | null {
  const formats = getFormatsForLevel(level);

  if (formats.length === 0) return null;
  if (formats.length === 1) return formats[0];

  // If keywords provided, try to match
  if (keywords && keywords.length > 0) {
    const keywordStr = keywords.join(" ").toLowerCase();

    if (/timeline|process|step|how/.test(keywordStr)) {
      return "ProcessTimelineCarousel";
    }
    if (/myth|fact|misconception|truth/.test(keywordStr)) {
      return "MythVsFactCarousel";
    }
    if (/market|stats|data|trend/.test(keywordStr)) {
      return "MarketPulseCarousel";
    }
    if (/question|q&a|ask/.test(keywordStr)) {
      return "ClientQuestionsCarousel";
    }
    if (/vs|compare|or|difference/.test(keywordStr)) {
      return "ThisOrThatCarousel";
    }
    if (/area|neighbo|location|where/.test(keywordStr)) {
      return "NeighbourhoodGuideCarousel";
    }
    if (/objection|concern|worry|fear/.test(keywordStr)) {
      return "BuyerObjectionsCarousel";
    }
  }

  // Return first match (primary match gets priority)
  const primaryMatch = formats.find(f => FORMAT_LEVEL_MAP[f].primary === level);
  return primaryMatch || formats[0];
}

/**
 * Get all formats with their level info (for reference page)
 */
export function getAllFormatMappings(): { id: string; mapping: FormatLevelMapping }[] {
  return Object.entries(FORMAT_LEVEL_MAP).map(([id, mapping]) => ({
    id,
    mapping,
  }));
}
