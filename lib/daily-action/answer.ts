/**
 * Daily Action Engine 1.0 — Answer Handler
 *
 * Validates the student's answer, records learning signals
 * (LearningEvidence, PlayerActivity, LearningJourney),
 * and awards XP/Coin via the existing recordActivity() mechanism.
 *
 * CRITICAL: One submission = one reward. Idempotent on duplicate.
 */
import { db } from "@/lib/db";
import { recordActivity } from "@/lib/learning-loop/activity";
import { awardXp } from "@/lib/award-xp";
import type { LearningSkillType } from "@prisma/client";
import { dayKeyWIB } from "@/lib/learning-loop/journey";
import { XP_REWARD, COIN_REWARD } from "./config";
import type { DailyActionAnswerResult } from "./types";

/**
 * Answer a Daily Action question.
 *
 * Flow:
 * 1. Find the pending Daily Action for today
 * 2. Fetch the source question's correctAnswer (server-only)
 * 3. Validate the student's answer
 * 4. In a transaction:
 *    a. Mark DailyAction as COMPLETED
 *    b. Create LearningEvidence
 *    c. Record PlayerActivity + XP + Coin via recordActivity()
 * 5. Return result
 *
 * Throws if:
 * - No pending action found (404)
 * - Action already completed (409)
 * - Source question not found
 */
export async function answerDailyAction(
  userId: string,
  answer: string
): Promise<DailyActionAnswerResult> {
  const dayKey = dayKeyWIB();

  // 1. Find the pending Daily Action for today
  const action = await db.dailyAction.findUnique({
    where: { userId_date: { userId, date: dayKey } },
  });

  if (!action) {
    throw new DailyActionError("NOT_FOUND", "Tidak ada tantangan hari ini.");
  }

  if (action.status === "COMPLETED") {
    throw new DailyActionError(
      "ALREADY_COMPLETED",
      "Tantangan hari ini sudah diselesaikan."
    );
  }

  // 2. Fetch the source question's correct answer (SERVER ONLY)
  const correctAnswer = await fetchCorrectAnswer(
    action.source,
    action.questionId
  );

  if (correctAnswer === null) {
    throw new DailyActionError(
      "QUESTION_NOT_FOUND",
      "Soal tidak ditemukan."
    );
  }

  // 3. Validate the answer
  const isCorrect = normalizeAnswer(answer) === normalizeAnswer(correctAnswer);

  // 4. Atomic transaction: complete + record learning signals
  await db.$transaction(async (tx) => {
    // 4a. Mark DailyAction as COMPLETED
    await tx.dailyAction.update({
      where: { id: action.id },
      data: {
        status: "COMPLETED",
        isCorrect,
        completedAt: new Date(),
      },
    });

    // 4b. Create LearningEvidence (anti-repeat + learning signal)
    await tx.learningEvidence.create({
      data: {
        userId,
        source: action.source,
        activityId: `daily-action-${action.id}`,
        questionId: action.questionId,
        selectedAnswer: answer,
        isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        skill: (action.skill as LearningSkillType) ?? "READING",
        difficulty: normalizeDifficulty(action.difficulty),
        answeredAt: new Date(),
        metadata: JSON.parse(
          JSON.stringify({
            type: "DAILY_ACTION",
            date: dayKey,
          })
        ),
      },
    });
  });

  // 4c. Award XP via canonical awardXp() — updates User.xp + PlayerProfile
  const xp = isCorrect ? XP_REWARD : Math.floor(XP_REWARD * 0.3);
  const coin = isCorrect ? COIN_REWARD : Math.floor(COIN_REWARD * 0.3);
  const xpRef = `daily-action-${action.id}`;

  let xpResult = { xpDiberikan: 0, koinDidapat: 0 };
  try {
    xpResult = await awardXp(userId, "DAILY_ACTION", xp, xpRef);
  } catch {
    // Best-effort: XP failure should not fail the answer submission
  }

  // 4d. Award coins via direct CoinTransaction + User.coins update
  if (coin > 0) {
    try {
      await db.$transaction([
        db.coinTransaction.create({
          data: {
            userId,
            amount: coin,
            reason: "DAILY_ACTION",
            reference: xpRef,
          },
        }),
        db.user.update({
          where: { id: userId },
          data: { coins: { increment: coin } },
        }),
      ]);
    } catch {
      // Best-effort: coin failure should not fail the answer submission
    }
  }

  // 4e. Record PlayerActivity + LearningSkill + LearningJourney (best-effort)
  try {
    await recordActivity({
      userId,
      type: "QUIZ",
      subtype: "DAILY_ACTION",
      skill: (action.skill as LearningSkillType) ?? "READING",
      skillDelta: isCorrect ? 5 : 1,
      xp: xpResult.xpDiberikan,
      coin,
      meta: {
        dailyActionId: action.id,
        source: action.source,
        isCorrect,
        date: dayKey,
      },
      reference: xpRef,
      journey: {
        title: isCorrect
          ? "Tantangan Bahasa diselesaikan!"
          : "Mencoba tantangan bahasa",
        description: `${action.source} — ${isCorrect ? "Benar!" : "Belum benar, tetap semangat!"}`,
        icon: isCorrect ? "check-circle" : "refresh-cw",
      },
    });
  } catch {
    // Best-effort: logging failure should not fail the answer submission
  }

  // 5. Fetch explanation from source question
  const explanation = await fetchExplanation(action.source, action.questionId);

  return {
    correct: isCorrect,
    explanation,
    correctAnswer: isCorrect ? null : correctAnswer, // Only reveal on incorrect
    xpEarned: xpResult.xpDiberikan,
    coinEarned: coin,
  };
}

// ── Source Question Fetchers ──────────────────────────────────

async function fetchCorrectAnswer(
  source: string,
  questionId: string
): Promise<string | null> {
  switch (source) {
    case "TKA": {
      const q = await db.tKAQuestion.findUnique({
        where: { id: questionId },
        select: { correctAnswer: true },
      });
      return q?.correctAnswer ?? null;
    }
    case "UKBI": {
      const q = await db.uKBIQuestion.findUnique({
        where: { id: questionId },
        select: { correctAnswer: true },
      });
      return q?.correctAnswer ?? null;
    }
    default:
      return null;
  }
}

async function fetchExplanation(
  source: string,
  questionId: string
): Promise<string | null> {
  switch (source) {
    case "TKA": {
      const q = await db.tKAQuestion.findUnique({
        where: { id: questionId },
        select: { explanation: true },
      });
      return q?.explanation ?? null;
    }
    case "UKBI": {
      const q = await db.uKBIQuestion.findUnique({
        where: { id: questionId },
        select: { explanation: true },
      });
      return q?.explanation ?? null;
    }
    default:
      return null;
  }
}

// ── Answer Normalization ──────────────────────────────────────

function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

/** Normalize difficulty to valid Difficulty enum values. */
function normalizeDifficulty(diff: string | null): "EASY" | "MEDIUM" | "HARD" | "VERY_HARD" | undefined {
  if (!diff) return undefined;
  const d = diff.toUpperCase();
  if (d === "EASY" || d === "MUDAH") return "EASY";
  if (d === "MEDIUM" || d === "MENENGAH" || d === "NORMAL") return "MEDIUM";
  if (d === "HARD" || d === "SULIT" || d === "DIFFICULT") return "HARD";
  if (d === "VERY_HARD" || d === "SANGAT_SULIT" || d === "SANGAT SULIT") return "VERY_HARD";
  return "MEDIUM"; // safe default
}

// ── Error Class ──────────────────────────────────────────────

export class DailyActionError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "DailyActionError";
  }
}
