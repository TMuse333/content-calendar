/**
 * Entropy Reduction Framework
 *
 * Universal content strategy system based on reducing prospect uncertainty.
 * See /docs/ENTROPY_LEVELS.md for full documentation.
 *
 * Usage:
 *   import { ENTROPY_LEVELS, suggestLevel, getFormatsForLevel } from "@/lib/entropy";
 */

// Constants
export {
  type EntropyLevel,
  type LevelDefinition,
  ENTROPY_LEVELS,
  DEFAULT_TARGET_MIX,
  LEVEL_COLORS,
  LEVEL_HEX_COLORS,
  CONTENT_MIX_GUIDELINES,
  CAROUSEL_PRIORITY_LEVELS,
  COMMON_GAPS,
} from "./constants";

// Suggestion
export {
  type SuggestResult,
  suggestLevel,
  suggestLevels,
  getPatternsForLevel,
  getAllPatterns,
} from "./suggest";

// Format mappings
export {
  type FormatLevelMapping,
  FORMAT_LEVEL_MAP,
  getFormatsForLevel,
  getLevelForFormat,
  getFormatMapping,
  suggestFormat,
  getAllFormatMappings,
} from "./formats";
