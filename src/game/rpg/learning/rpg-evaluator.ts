/**
 * RPG answer evaluation — Pendekar Suryakerta (P1.8A).
 *
 * Deterministic evaluation of a player answer against the SERVER-side
 * canonical answer. Pure: no RPG mutation, no RNG, no storage.
 *
 * Normalization mirrors the canonical game-questions validator
 * (trim/lowercase/collapse-space): MCQ compares against the answer TEXT
 * (repo-canonical answer model, never an index); freeText compares the
 * normalized key string. Empty/missing answers are deterministic
 * rejections (INCORRECT + INVALID), never partial credit.
 *
 * Correctness is computed HERE (server-authoritative later) — clients must
 * never author it. See learning-effect.ts for consequence mapping.
 */

import type { ResolvedChallenge } from "./rpg-challenge";

export type LearningSignal = "CORRECT" | "INCORRECT";

export interface LearningEvaluation {
  challengeId: string;
  signal: LearningSignal;
  /** Normalized score (1 correct, 0 otherwise — canonical scoring floor). */
  score: 0 | 1;
  /** Player answer after normalization (audit, not correctness). */
  normalizedAnswer: string;
  /** True only for malformed submissions (empty answer). */
  invalid: boolean;
}

/** Canonical normalization (same family as game-questions validator). */
export function normalizeAnswer(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Evaluate an answer. The challenge MUST be server-resolved (answer present);
 * evaluation never mutates RPG state — application owns idempotency
 * (see learning-effect.ts applySubmission).
 */
export function evaluateAnswer(
  challenge: ResolvedChallenge,
  answer: string | null | undefined,
): LearningEvaluation {
  const normalizedAnswer = normalizeAnswer(answer);
  if (!normalizedAnswer) {
    return { challengeId: challenge.challengeId, signal: "INCORRECT", score: 0, normalizedAnswer, invalid: true };
  }
  const key = normalizeAnswer(challenge.answer);
  const correct = normalizedAnswer === key;
  return {
    challengeId: challenge.challengeId,
    signal: correct ? "CORRECT" : "INCORRECT",
    score: correct ? 1 : 0,
    normalizedAnswer,
    invalid: false,
  };
}
