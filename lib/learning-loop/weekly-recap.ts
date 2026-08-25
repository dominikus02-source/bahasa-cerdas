/**
 * Weekly Learning Recap — Aggregation Engine.
 *
 * Calculates weekly learning statistics from existing data sources.
 * No new database tables required.
 */

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getLearnerState } from "@/lib/learner-state/service";
import { SKILL_LABELS } from "./skills";
import type { LearningSkillType } from "./types";

// WIB offset (UTC+7)
const WIB_OFFSET_MS = 7 * 3600 * 1000;

export interface WeekPeriod {
  start: Date;
  end: Date;
  label: string;
}

export interface SkillStats {
  skill: string;
  label: string;
  attempts: number;
  correct: number;
  accuracy: number | null;
}

export interface WeeklyRecapData {
  period: WeekPeriod;
  summary: {
    activities: number;
    questions: number;
    accuracy: number | null;
    activeDays: number;
  };
  strength: SkillStats | null;
  focus: SkillStats | null;
  improvements: string[];
  recommendations: string[];
}

/**
 * Get WIB week boundaries (Monday 00:00 to Sunday 23:59).
 */
export function getWIBWeekBoundaries(date: Date = new Date()): WeekPeriod {
  const wibNow = new Date(date.getTime() + WIB_OFFSET_MS);
  const dayOfWeek = wibNow.getUTCDay(); // 0=Sunday, 1=Monday, ...
  
  // Calculate Monday of current week
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(wibNow);
  monday.setUTCDate(wibNow.getUTCDate() + mondayOffset);
  monday.setUTCHours(0, 0, 0, 0);
  
  // Calculate Sunday end of week
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  
  // Convert back to real time (subtract WIB offset)
  const start = new Date(monday.getTime() - WIB_OFFSET_MS);
  const end = new Date(sunday.getTime() - WIB_OFFSET_MS);
  
  const label = `${start.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
  
  return { start, end, label };
}

/**
 * Get previous week boundaries.
 */
export function getPreviousWeekBoundaries(currentWeek: WeekPeriod): WeekPeriod {
  const prevEnd = new Date(currentWeek.start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - 6 * 24 * 3600 * 1000);
  prevStart.setUTCHours(0, 0, 0, 0);
  prevEnd.setUTCHours(23, 59, 59, 999);
  
  return {
    start: prevStart,
    end: prevEnd,
    label: `${prevStart.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - ${prevEnd.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`,
  };
}

/**
 * Get activity statistics for a date range.
 */
async function getActivityStats(
  userId: string,
  start: Date,
  end: Date
): Promise<{ activities: number; activeDays: number }> {
  const result = await db.$queryRaw<{ activities: number; activeDays: number }[]>(
    Prisma.sql`
      SELECT 
        COUNT(*)::int AS "activities",
        COUNT(DISTINCT DATE("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta'))::int AS "activeDays"
      FROM "PlayerActivity"
      WHERE "userId" = ${userId}
        AND "createdAt" >= ${start}
        AND "createdAt" <= ${end}
    `
  );
  
  return result[0] ?? { activities: 0, activeDays: 0 };
}

/**
 * Get question stats by skill for a date range.
 */
async function getQuestionStatsBySkill(
  userId: string,
  start: Date,
  end: Date
): Promise<SkillStats[]> {
  const rows = await db.$queryRaw<
    { skill: string; attempts: number; correct: number }[]
  >(
    Prisma.sql`
      SELECT 
        m."skill",
        COUNT(*)::int AS "attempts",
        COUNT(*) FILTER (WHERE e."isCorrect" = TRUE)::int AS "correct"
      FROM "LearningEvidence" e
      INNER JOIN "QuestionMetadata" m
        ON m."source" = e."source"
       AND m."questionId" = e."questionId"
      WHERE e."userId" = ${userId}
        AND e."isCorrect" IS NOT NULL
        AND m."status" = 'APPROVED'
        AND m."skill" IS NOT NULL
        AND e."answeredAt" >= ${start}
        AND e."answeredAt" <= ${end}
      GROUP BY m."skill"
    `
  );
  
  return rows.map((row) => ({
    skill: row.skill,
    label: SKILL_LABELS[row.skill as LearningSkillType] || row.skill,
    attempts: row.attempts,
    correct: row.correct,
    accuracy: row.attempts > 0 ? row.correct / row.attempts : null,
  }));
}

/**
 * Build weekly recap for a user.
 */
export async function buildWeeklyRecap(userId: string): Promise<WeeklyRecapData> {
  const period = getWIBWeekBoundaries();
  const prevPeriod = getPreviousWeekBoundaries(period);
  
  // Fetch data in parallel
  const [currentActivities, prevActivities, currentSkills, prevSkills, learnerState] =
    await Promise.all([
      getActivityStats(userId, period.start, period.end),
      getActivityStats(userId, prevPeriod.start, prevPeriod.end),
      getQuestionStatsBySkill(userId, period.start, period.end),
      getQuestionStatsBySkill(userId, prevPeriod.start, prevPeriod.end),
      getLearnerState(userId).catch(() => []),
    ]);
  
  // Calculate overall accuracy
  const totalAttempts = currentSkills.reduce((sum, s) => sum + s.attempts, 0);
  const totalCorrect = currentSkills.reduce((sum, s) => sum + s.correct, 0);
  const overallAccuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : null;
  
  // Find strength (highest accuracy with sufficient attempts)
  const strength = currentSkills
    .filter((s) => s.attempts >= 3 && s.accuracy !== null)
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))[0] ?? null;
  
  // Find focus (lowest accuracy with sufficient attempts)
  const focus = currentSkills
    .filter((s) => s.attempts >= 3 && s.accuracy !== null)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))[0] ?? null;
  
  // Detect improvements (accuracy increased from previous week)
  const improvements: string[] = [];
  for (const current of currentSkills) {
    const prev = prevSkills.find((p) => p.skill === current.skill);
    if (prev && prev.accuracy !== null && current.accuracy !== null) {
      const diff = current.accuracy - prev.accuracy;
      if (diff >= 0.1) {
        improvements.push(current.label);
      }
    }
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  if (focus) {
    recommendations.push(`Latih ${focus.label} melalui latihan yang direkomendasikan.`);
  }
  if (currentActivities.activeDays < 3) {
    recommendations.push("Coba belajar lebih konsisten minggu depan.");
  }
  if (improvements.length > 0) {
    recommendations.push(`Pertahankan perkembangan di ${improvements.join(", ")}.`);
  }
  
  return {
    period,
    summary: {
      activities: currentActivities.activities,
      questions: totalAttempts,
      accuracy: overallAccuracy,
      activeDays: currentActivities.activeDays,
    },
    strength,
    focus,
    improvements,
    recommendations,
  };
}
