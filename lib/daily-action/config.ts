/**
 * Daily Action Engine 1.0 — Configuration
 *
 * All magic numbers live here. No hardcoding in engine files.
 */

/** How many days back to check for cooldown (anti-repeat) */
export const COOLDOWN_DAYS = 7;

/** How many days back to check for source diversification */
export const SOURCE_LOOKBACK_DAYS = 7;

/** Maximum percentage of recent days a single source can dominate */
export const MAX_SOURCE_RATIO = 0.6;

/** Default source weights for candidate selection */
export const SOURCE_WEIGHTS: Record<string, number> = {
  TKA: 0.4,
  UKBI: 0.4,
  SOAL: 0.2,
};

/** Score multiplier when candidate matches weakest skill */
export const SKILL_BOOST = 1.5;

/** Score penalty when candidate matches strongest skill */
export const STRONG_SKILL_PENALTY = 0.8;

/** Score boost for verified questions */
export const VERIFIED_BOOST = 1.2;

/** Score penalty for grade mismatch (not hard-rejection) */
export const GRADE_MISMATCH_PENALTY = 0.7;

/** XP reward for completing a Daily Action */
export const XP_REWARD = 15;

/** Coin reward for completing a Daily Action */
export const COIN_REWARD = 5;

/** Number of top candidates to consider for weighted random */
export const TOP_CANDIDATES_COUNT = 5;

/** Maximum candidates to fetch per source (before filtering) */
export const CANDIDATE_POOL_SIZE = 200;

/** Fallback difficulty when question has none */
export const DEFAULT_DIFFICULTY = "MEDIUM";

/** WIB timezone offset in hours */
export const WIB_OFFSET = 7;
