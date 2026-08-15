import { hasSkill, SKILLS, type SkillId } from "@/lib/question-metadata/taxonomy";
import type { EvidenceAggregateRow, LearnerConfidence, LearnerSkillState, LearnerTrend, MasteryState } from "./types";

export const RECENT_ATTEMPT_LIMIT = 10;
export const MIN_TREND_SAMPLE = 5;
export const MIN_MASTERY_ATTEMPTS = 10;

function ratio(correct: number, attempts: number): number | null {
  return attempts === 0 ? null : correct / attempts;
}

function confidenceFor(attempts: number): LearnerConfidence {
  if (attempts === 0) return "NO_DATA";
  if (attempts < 5) return "LOW";
  if (attempts < 10) return "MEDIUM";
  return "HIGH";
}

function trendFor(row: EvidenceAggregateRow, recentAccuracy: number | null): LearnerTrend {
  if (
    row.recentAttemptCount < MIN_TREND_SAMPLE ||
    row.historicalAttemptCount < MIN_TREND_SAMPLE ||
    recentAccuracy === null
  ) {
    return "INSUFFICIENT_DATA";
  }

  const historicalAccuracy = ratio(row.historicalCorrectCount, row.historicalAttemptCount);
  if (historicalAccuracy === null) return "INSUFFICIENT_DATA";
  const difference = recentAccuracy - historicalAccuracy;
  if (difference >= 0.1) return "IMPROVING";
  if (difference <= -0.1) return "DECLINING";
  return "STABLE";
}

function masteryFor(
  attempts: number,
  accuracy: number | null,
  recentAttempts: number,
  recentAccuracy: number | null,
  trend: LearnerTrend
): MasteryState {
  if (attempts === 0) return "NO_DATA";
  if (
    attempts < MIN_MASTERY_ATTEMPTS ||
    recentAttempts < MIN_TREND_SAMPLE ||
    recentAccuracy === null ||
    accuracy === null ||
    trend === "INSUFFICIENT_DATA"
  ) {
    return "NOT_ENOUGH_EVIDENCE";
  }
  if (accuracy >= 0.8 && recentAccuracy >= 0.8 && trend !== "DECLINING") return "PROFICIENT";
  return "DEVELOPING";
}

function assertCounts(row: EvidenceAggregateRow): void {
  const counts = [
    row.attemptCount,
    row.correctCount,
    row.recentAttemptCount,
    row.recentCorrectCount,
    row.historicalAttemptCount,
    row.historicalCorrectCount,
  ];
  if (counts.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error("Learner evidence counts must be non-negative integers");
  }
  if (row.correctCount > row.attemptCount) throw new Error("correctCount cannot exceed attemptCount");
  if (row.recentCorrectCount > row.recentAttemptCount) throw new Error("recentCorrectCount cannot exceed recentAttemptCount");
  if (row.historicalCorrectCount > row.historicalAttemptCount) throw new Error("historicalCorrectCount cannot exceed historicalAttemptCount");
  if (row.recentAttemptCount > row.attemptCount) throw new Error("recentAttemptCount cannot exceed attemptCount");
  if (row.historicalAttemptCount + row.recentAttemptCount > row.attemptCount) {
    throw new Error("historical and recent attempts cannot exceed attemptCount");
  }
}

function isoOrNull(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function emptyState(skill: SkillId): LearnerSkillState {
  return {
    skill,
    label: SKILLS[skill],
    attemptCount: 0,
    correctCount: 0,
    accuracy: null,
    recentAttemptCount: 0,
    recentCorrectCount: 0,
    recentAccuracy: null,
    lastPracticedAt: null,
    firstPracticedAt: null,
    trend: "INSUFFICIENT_DATA",
    confidence: "NO_DATA",
    masteryState: "NO_DATA",
  };
}

export function calculateLearnerState(rows: EvidenceAggregateRow[]): LearnerSkillState[] {
  const states = new Map<SkillId, LearnerSkillState>();
  for (const skill of Object.keys(SKILLS) as SkillId[]) states.set(skill, emptyState(skill));

  for (const row of rows) {
    if (!hasSkill(row.skill)) throw new Error(`Unknown learner skill: ${row.skill}`);
    assertCounts(row);

    const accuracy = ratio(row.correctCount, row.attemptCount);
    const recentAccuracy = ratio(row.recentCorrectCount, row.recentAttemptCount);
    const trend = trendFor(row, recentAccuracy);
    const state: LearnerSkillState = {
      skill: row.skill,
      label: SKILLS[row.skill],
      attemptCount: row.attemptCount,
      correctCount: row.correctCount,
      accuracy,
      recentAttemptCount: row.recentAttemptCount,
      recentCorrectCount: row.recentCorrectCount,
      recentAccuracy,
      lastPracticedAt: isoOrNull(row.lastPracticedAt),
      firstPracticedAt: isoOrNull(row.firstPracticedAt),
      trend,
      confidence: confidenceFor(row.attemptCount),
      masteryState: masteryFor(row.attemptCount, accuracy, row.recentAttemptCount, recentAccuracy, trend),
    };
    states.set(row.skill, state);
  }

  return [...states.values()];
}
