/**
 * Learning challenge type contracts.
 *
 * Defines the content shapes for Bahasa Indonesia challenges. Concrete item
 * schemas can evolve; the contract below is what the engine and renderer
 * agree on. Answer keys are NOT part of client-bound challenge payloads.
 */

import type { RPGId } from "../core/constants";

export type RPGLearningChallengeType = "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "ORDERING" | "TRUE_FALSE";

/** Client-safe challenge payload (no answer key). */
export interface RPGLearningChallengePayload {
  id: RPGId;
  type: RPGLearningChallengeType;
  prompt: string;
  choices?: string[];
  /** Optional teaching note shown after answering. */
  explanation?: string;
}

/** Server-held answer data for a challenge. */
export interface RPGLearningChallengeAnswer {
  id: RPGId;
  correctAnswer: string;
  acceptableAnswers?: string[];
}

/** Validate that a payload is renderable. */
export function validateChallengePayload(payload: RPGLearningChallengePayload): string[] {
  const errors: string[] = [];
  if (!payload.prompt.trim()) errors.push(`challenge ${payload.id}: empty prompt`);
  if (payload.type === "MULTIPLE_CHOICE" && (!payload.choices || payload.choices.length < 2)) {
    errors.push(`challenge ${payload.id}: MULTIPLE_CHOICE needs >= 2 choices`);
  }
  return errors;
}
