/**
 * Daily Action Engine 1.0 — Main Engine
 *
 * Orchestrates: fetch → filter → score → select → persist.
 * This is the core entry point for generating a daily action.
 */
import { db } from "@/lib/db";
import { dayKeyWIB } from "@/lib/learning-loop/journey";
import { fetchAllCandidates } from "./candidate";
import { filterByQuality } from "./quality";
import { applyFilters } from "./filter";
import { selectDailyCandidate } from "./score";
import { WIB_OFFSET } from "./config";

/**
 * Get or create today's Daily Action for a user.
 *
 * If an action already exists for today, return it (idempotent).
 * If not, generate a new one through the full pipeline.
 *
 * Returns null if no candidates are available at all.
 */
export async function getOrCreateDailyAction(
  userId: string
): Promise<{
  id: string;
  source: string;
  questionId: string;
  skill: string | null;
  questionType: string;
  difficulty: string | null;
  questionText: string;
  options: string;
  status: string;
  isCorrect: boolean | null;
  date: string;
} | null> {
  const dayKey = dayKeyWIB();

  // Check if action already exists for today (idempotent)
  const existing = await db.dailyAction.findUnique({
    where: { userId_date: { userId, date: dayKey } },
    select: {
      id: true,
      source: true,
      questionId: true,
      skill: true,
      questionType: true,
      difficulty: true,
      questionText: true,
      options: true,
      status: true,
      isCorrect: true,
      date: true,
    },
  });

  if (existing) {
    return {
      ...existing,
      questionType: existing.questionType ?? "PILIHAN_GANDA",
      questionText: existing.questionText ?? "",
      options: existing.options ?? "[]",
    };
  }

  // Generate new action
  return generateDailyAction(userId, dayKey);
}

/**
 * Generate a new Daily Action through the full pipeline.
 * Uses upsert for race-condition safety.
 */
async function generateDailyAction(userId: string, dayKey: string) {
  // Step 1: Fetch candidates from all sources
  const candidates = await fetchAllCandidates();

  if (candidates.length === 0) {
    return null;
  }

  // Step 1.5: Quality Gate — filter invalid/broken candidates
  const qualityFiltered = filterByQuality(candidates);

  if (qualityFiltered.length === 0) {
    return null;
  }

  // Step 2: Apply hard filters (anti-repeat, cooldown)
  const eligible = await applyFilters(userId, dayKey, qualityFiltered);

  if (eligible.length === 0) {
    return null;
  }

  // Step 3: Score and select the best candidate
  const selected = await selectDailyCandidate(userId, eligible);

  // Step 4: Persist with upsert for idempotency
  try {
    const action = await db.dailyAction.upsert({
      where: { userId_date: { userId, date: dayKey } },
      update: {}, // Already exists — don't overwrite
      create: {
        userId,
        date: dayKey,
        source: selected.source,
        questionId: selected.id,
        skill: selected.skill,
        questionType: selected.questionType,
        difficulty: selected.difficulty,
        questionText: selected.questionText,
        options: selected.options,
        status: "PENDING",
      },
      select: {
        id: true,
        source: true,
        questionId: true,
        skill: true,
        questionType: true,
        difficulty: true,
        questionText: true,
        options: true,
        status: true,
        isCorrect: true,
        date: true,
      },
    });

    if (!action) return null;

    return {
      ...action,
      questionText: action.questionText ?? "",
      options: action.options ?? "[]",
    };
  } catch (err) {
    // P2002 = unique constraint violation (race condition — another request won)
    // Fetch the one that was created
    if ((err as any)?.code === "P2002") {        const fallback = await db.dailyAction.findUnique({
          where: { userId_date: { userId, date: dayKey } },
          select: {
            id: true,
            source: true,
            questionId: true,
            skill: true,
            questionType: true,
            difficulty: true,
            questionText: true,
            options: true,
            status: true,
            isCorrect: true,
            date: true,
          },
        });
        if (!fallback) return null;
        return {
          ...fallback,
          questionType: fallback.questionType ?? "PILIHAN_GANDA",
          questionText: fallback.questionText ?? "",
          options: fallback.options ?? "[]",
        };
    }
    throw err;
  }
}
