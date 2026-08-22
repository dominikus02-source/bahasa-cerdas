/**
 * Daily Action Engine 1.0 — Scoring & Weighted Selection
 *
 * After hard filters, candidates are scored based on:
 * 1. Skill personalization (weakest skill gets boost)
 * 2. Source diversification (penalize over-represented sources)
 * 3. Difficulty match (prefer appropriate difficulty)
 * 4. Verified question preference (isVerified boost)
 * 5. Grade/tingkat relevance (matching grade boost)
 *
 * Then top candidates are selected via weighted random.
 */
import { db } from "@/lib/db";
import {
  SKILL_BOOST,
  STRONG_SKILL_PENALTY,
  MAX_SOURCE_RATIO,
  SOURCE_WEIGHTS,
  TOP_CANDIDATES_COUNT,
  SOURCE_LOOKBACK_DAYS,
  DEFAULT_DIFFICULTY,
  VERIFIED_BOOST,
  GRADE_MISMATCH_PENALTY,
} from "./config";
import type { DailyCandidate, ScoredCandidate } from "./types";

/** Get user's skill profile sorted weakest-first */
async function getSkillProfile(
  userId: string
): Promise<{ skill: string; level: number }[]> {
  const rows = await db.learningSkill.findMany({
    where: { userId },
    select: { skill: true, level: true },
    orderBy: [{ level: "asc" }, { xp: "asc" }],
  });
  return rows;
}

/** Get recent DailyAction sources for diversification */
async function getRecentSources(
  userId: string
): Promise<Record<string, number>> {
  const since = new Date(Date.now() - SOURCE_LOOKBACK_DAYS * 24 * 3600 * 1000);
  const rows = await db.dailyAction.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { source: true },
  });

  const counts: Record<string, number> = {};
  for (const r of rows) {
    counts[r.source] = (counts[r.source] ?? 0) + 1;
  }
  return counts;
}

/** Get student's grade from Profile (nullable if not set) */
async function getStudentGrade(userId: string): Promise<string | null> {
  try {
    const profile = await db.profile.findUnique({
      where: { userId },
      select: { grade: true },
    });
    return profile?.grade ?? null;
  } catch {
    return null;
  }
}

/**
 * Normalize grade/tingkat for comparison.
 * TKA/UKBI use: SMP, SMA, UMUM
 * Profile uses: e.g. "VII", "VIII", "SMP", "SMA" etc.
 * Returns a canonical tier: "SMP", "SMA", or null.
 */
function normalizeGrade(grade: string | null): string | null {
  if (!grade) return null;
  const g = grade.toUpperCase().trim();
  // Direct match
  if (g === "SMP" || g === "SMA" || g === "UMUM") return g;
  // Roman numeral → tier mapping
  const romanToTier: Record<string, string> = {
    VII: "SMP", VIII: "SMP", IX: "SMP",
    X: "SMA", XI: "SMA", XII: "SMA",
  };
  if (romanToTier[g]) return romanToTier[g];
  // Numeric class → tier
  const num = parseInt(g, 10);
  if (num >= 7 && num <= 9) return "SMP";
  if (num >= 10 && num <= 12) return "SMA";
  // "SD" → UMUM (not specifically SMP/SMA)
  if (g === "SD" || g.startsWith("SD")) return "UMUM";
  return null;
}

/** Score a single candidate */
function scoreCandidate(
  candidate: DailyCandidate,
  weakestSkill: string | null,
  strongestSkill: string | null,
  recentSourceCounts: Record<string, number>,
  totalRecentActions: number,
  studentGrade: string | null
): ScoredCandidate {
  let score = 1.0;

  // 1. Skill personalization
  if (candidate.skill) {
    if (candidate.skill === weakestSkill) {
      score *= SKILL_BOOST;
    } else if (candidate.skill === strongestSkill) {
      score *= STRONG_SKILL_PENALTY;
    }
  }

  // 2. Source weight (base weight)
  const baseWeight = SOURCE_WEIGHTS[candidate.source] ?? 0.2;
  score *= baseWeight;

  // 3. Source diversification penalty
  if (totalRecentActions > 0) {
    const sourceCount = recentSourceCounts[candidate.source] ?? 0;
    const ratio = sourceCount / totalRecentActions;
    if (ratio > MAX_SOURCE_RATIO) {
      score *= 0.5; // Heavy penalty for over-represented source
    } else if (ratio > MAX_SOURCE_RATIO * 0.8) {
      score *= 0.8; // Mild penalty
    }
  }

  // 4. Difficulty bonus (prefer MEDIUM for general use)
  const diff = candidate.difficulty ?? DEFAULT_DIFFICULTY;
  if (diff === "MEDIUM") score *= 1.1;
  else if (diff === "EASY") score *= 1.0;
  else if (diff === "HARD") score *= 0.9;

  // 5. Verified question preference (boost, never hard-reject)
  if (candidate.isVerified) {
    score *= VERIFIED_BOOST;
  }

  // 6. Grade/tingkat relevance (personalization, not exclusion)
  if (studentGrade && candidate.tingkat) {
    const studentTier = normalizeGrade(studentGrade);
    const questionTier = normalizeGrade(candidate.tingkat);
    if (studentTier && questionTier) {
      if (studentTier === questionTier) {
        score *= 1.15; // Matching grade gets mild boost
      } else if (questionTier !== "UMUM") {
        // UMUM is universal — no penalty for UMUM questions
        score *= GRADE_MISMATCH_PENALTY;
      }
    }
    // If either is null/unparseable → neutral (no adjustment)
  }

  return { ...candidate, score };
}

/**
 * Select the best candidate using weighted random from top-N scored candidates.
 * Uses deterministic-ish selection: Math.random() is acceptable here since
 * the selection is server-side and the result is persisted immediately.
 */
function weightedRandomSelect(scored: ScoredCandidate[]): ScoredCandidate {
  if (scored.length === 0) {
    throw new Error("No candidates available for selection");
  }

  const totalScore = scored.reduce((sum, c) => sum + c.score, 0);
  let random = Math.random() * totalScore;

  for (const candidate of scored) {
    random -= candidate.score;
    if (random <= 0) return candidate;
  }

  // Fallback (should never reach here)
  return scored[0];
}

/**
 * Full scoring + selection pipeline.
 * Returns the best candidate for the Daily Action.
 */
export async function selectDailyCandidate(
  userId: string,
  candidates: DailyCandidate[]
): Promise<DailyCandidate> {
  if (candidates.length === 0) {
    throw new Error("No eligible candidates after filtering");
  }

  // Get personalization data
  const skillProfile = await getSkillProfile(userId);
  const weakestSkill = skillProfile[0]?.skill ?? null;
  const strongestSkill =
    skillProfile.length > 1 ? skillProfile[skillProfile.length - 1].skill : null;

  // Get source diversification data
  const recentSourceCounts = await getRecentSources(userId);
  const totalRecentActions = Object.values(recentSourceCounts).reduce(
    (sum, n) => sum + n,
    0
  );

  // Get student grade for personalization
  const studentGrade = await getStudentGrade(userId);

  // Score all candidates
  const scored = candidates.map((c) =>
    scoreCandidate(
      c,
      weakestSkill,
      strongestSkill,
      recentSourceCounts,
      totalRecentActions,
      studentGrade
    )
  );

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);
  const topCandidates = scored.slice(0, TOP_CANDIDATES_COUNT);

  // Weighted random selection from top candidates
  return weightedRandomSelect(topCandidates);
}
