/**
 * Daily Action Engine 1.0 — Hard Filters
 *
 * Filters out candidates that should not be presented to the student.
 * All filters are applied BEFORE weighting/scoring.
 */
import { db } from "@/lib/db";
import { COOLDOWN_DAYS } from "./config";
import type { DailyCandidate } from "./types";

/**
 * Filter candidates against LearningEvidence (anti-repeat).
 * Removes questions the user has already answered.
 */
async function filterByEvidence(
  userId: string,
  candidates: DailyCandidate[]
): Promise<DailyCandidate[]> {
  if (candidates.length === 0) return [];

  const since = new Date(Date.now() - COOLDOWN_DAYS * 24 * 3600 * 1000);

  // Collect all question IDs grouped by source
  const bySource: Record<string, string[]> = {};
  for (const c of candidates) {
    if (!bySource[c.source]) bySource[c.source] = [];
    bySource[c.source].push(c.id);
  }

  // Query answered question IDs from LearningEvidence
  const answeredIds = new Set<string>();
  for (const [source, ids] of Object.entries(bySource)) {
    const rows = await db.learningEvidence.findMany({
      where: {
        userId,
        source,
        questionId: { in: ids },
        answeredAt: { gte: since },
      },
      select: { questionId: true },
    });
    for (const r of rows) answeredIds.add(r.questionId);
  }

  return candidates.filter((c) => !answeredIds.has(c.id));
}

/**
 * Filter candidates that are already assigned as today's Daily Action.
 * Prevents picking a question already shown today (even if unanswered).
 */
async function filterByTodayAssignment(
  userId: string,
  dayKey: string,
  candidates: DailyCandidate[]
): Promise<DailyCandidate[]> {
  if (candidates.length === 0) return [];

  const todayAction = await db.dailyAction.findUnique({
    where: { userId_date: { userId, date: dayKey } },
    select: { questionId: true },
  });

  if (!todayAction) return candidates;

  return candidates.filter((c) => c.id !== todayAction.questionId);
}

/**
 * Apply all hard filters in sequence.
 * Returns only eligible candidates.
 */
export async function applyFilters(
  userId: string,
  dayKey: string,
  candidates: DailyCandidate[]
): Promise<DailyCandidate[]> {
  let filtered = candidates;

  // Filter 1: Remove already-answered questions (cooldown)
  filtered = await filterByEvidence(userId, filtered);

  // Filter 2: Remove today's already-assigned question
  filtered = await filterByTodayAssignment(userId, dayKey, filtered);

  return filtered;
}
