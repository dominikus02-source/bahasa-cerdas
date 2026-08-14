/**
 * GAME QUESTION QUALITY — agregat laporan + gate gameplay.
 */

import type { GameQuestion, ValidationResult } from "./types";
import { validateQuestion } from "./validator";
import { findDuplicates, type DuplicateGroup } from "./dedupe";
import { isQuarantined } from "./quarantine";

export interface QualityReport {
  total: number;
  byStatus: Record<string, number>;
  byTopic: Record<string, number>;
  byDifficulty: Record<string, number>;
  bySource: Record<string, number>;
  duplicateGroups: DuplicateGroup[];
  quarantined: { id: string; reason: string }[];
  averageScore: number;
}

export function qualityReport(questions: GameQuestion[]): QualityReport {
  const results: ValidationResult[] = questions.map(validateQuestion);
  const byStatus: Record<string, number> = {};
  const byTopic: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let scoreSum = 0;

  for (const r of results) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    scoreSum += r.qualityScore;
  }
  for (const q of questions) {
    if (q.topic) byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
    if (q.difficulty) byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
    if (q.source) bySource[q.source] = (bySource[q.source] || 0) + 1;
  }

  const duplicateGroups = findDuplicates(questions);
  const quarantined = results
    .filter((r) => r.status === "QUARANTINED")
    .map((r) => ({ id: r.id, reason: r.quarantineReason || "UNKNOWN" }));

  return {
    total: questions.length,
    byStatus,
    byTopic,
    byDifficulty,
    bySource,
    duplicateGroups,
    quarantined,
    averageScore: questions.length ? Math.round(scoreSum / questions.length) : 0,
  };
}

/** Soal layak main: status ACTIVE/REVIEW + tidak ada di daftar karantina manual. */
export function isEligibleForGameplay(q: GameQuestion, status?: ValidationResult["status"]): boolean {
  const s = status ?? validateQuestion(q).status;
  return s !== "QUARANTINED" && !isQuarantined(q);
}

export function filterEligible(questions: GameQuestion[]): GameQuestion[] {
  return questions.filter((q) => isEligibleForGameplay(q));
}
