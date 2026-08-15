export type LearnerTrend = "IMPROVING" | "STABLE" | "DECLINING" | "INSUFFICIENT_DATA";
export type LearnerConfidence = "NO_DATA" | "LOW" | "MEDIUM" | "HIGH";
export type MasteryState = "NO_DATA" | "NOT_ENOUGH_EVIDENCE" | "DEVELOPING" | "PROFICIENT";

export interface EvidenceAggregateRow {
  skill: string;
  attemptCount: number;
  correctCount: number;
  recentAttemptCount: number;
  recentCorrectCount: number;
  historicalAttemptCount: number;
  historicalCorrectCount: number;
  firstPracticedAt: Date | string | null;
  lastPracticedAt: Date | string | null;
}

export interface LearnerSkillState {
  skill: string;
  label: string;
  attemptCount: number;
  correctCount: number;
  accuracy: number | null;
  recentAttemptCount: number;
  recentCorrectCount: number;
  recentAccuracy: number | null;
  lastPracticedAt: string | null;
  firstPracticedAt: string | null;
  trend: LearnerTrend;
  confidence: LearnerConfidence;
  masteryState: MasteryState;
}
