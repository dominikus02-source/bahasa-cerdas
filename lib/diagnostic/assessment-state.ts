/**
 * BC ASSESSMENT ENGINE 2.0 — Canonical Assessment State Detection.
 *
 * One canonical function determines where a student is in their assessment
 * journey. All consumers (preview, UI, personalization) read from this.
 *
 * States:
 *   NO_BASELINE          → never started diagnostic → "Kenali Kemampuanmu"
 *   BASELINE_IN_PROGRESS → diagnostic session active → "Lanjutkan Tes Awal"
 *   BASELINE_COMPLETE_LOW→ completed but low confidence → "BC Sedang Mengenalimu"
 *   PROFILE_READY        → good evidence + reasonable confidence → "Latihan Untukmu"
 *   PROFILE_CONFIDENT    → strong evidence + high confidence → personalized action
 */
import { hasCompletedDiagnostic } from "./completion";
import { getLearnerState } from "@/lib/learner-state/service";
import type { LearnerSkillState } from "@/lib/learner-state/types";
import { db } from "@/lib/db";
import { DIAGNOSTIC_REASON_CODE, DIAGNOSTIC_CONFIDENT_MIN_ATTEMPTS } from "./config";

export type AssessmentState =
  | "NO_BASELINE"
  | "BASELINE_IN_PROGRESS"
  | "BASELINE_COMPLETE_LOW"
  | "PROFILE_READY"
  | "PROFILE_CONFIDENT";

export interface AssessmentStateResult {
  state: AssessmentState;
  /** Whether diagnostic session has been completed at least once. */
  hasCompletedDiagnostic: boolean;
  /** Total evidence attempts across all skills. */
  totalEvidence: number;
  /** Skills with ≥5 attempts (confident per-skill). */
  confidentSkills: number;
  /** Overall accuracy (null if no evidence). */
  overallAccuracy: number | null;
  /** Whether an IN_PROGRESS diagnostic session exists. */
  hasInProgressDiagnostic: boolean;
}

/**
 * Detect the canonical assessment state for a student.
 * Deterministic, server-only, no side effects beyond DB reads.
 */
export async function detectAssessmentState(userId: string): Promise<AssessmentStateResult> {
  const [completed, states, inProgressSession] = await Promise.all([
    hasCompletedDiagnostic(userId),
    getLearnerState(userId),
    db.adaptivePracticeSession.findFirst({
      where: { userId, reasonCode: DIAGNOSTIC_REASON_CODE, status: "IN_PROGRESS" },
      select: { id: true },
    }),
  ]);

  const totalEvidence = states.reduce((sum, s) => sum + s.attemptCount, 0);
  const confidentSkills = states.filter(
    (s) => s.attemptCount >= DIAGNOSTIC_CONFIDENT_MIN_ATTEMPTS
  ).length;
  const evidenced = states.filter((s) => s.accuracy !== null);
  const overallAccuracy =
    evidenced.length === 0
      ? null
      : evidenced.reduce((sum, s) => sum + (s.accuracy ?? 0), 0) / evidenced.length;

  let state: AssessmentState;

  if (!completed && !inProgressSession && totalEvidence === 0) {
    // Never started, no evidence at all.
    state = "NO_BASELINE";
  } else if (inProgressSession) {
    // Diagnostic session is currently in progress.
    state = "BASELINE_IN_PROGRESS";
  } else if (!completed) {
    // Has some evidence from practice but never completed diagnostic.
    // Force diagnostic first — don't claim personalization.
    state = "NO_BASELINE";
  } else {
    // Diagnostic completed. Check confidence level.
    const hasEnoughEvidence = totalEvidence >= DIAGNOSTIC_CONFIDENT_MIN_ATTEMPTS * 3; // ~15 across skills
    const hasConfidentSkills = confidentSkills >= 2;

    if (!hasEnoughEvidence || !hasConfidentSkills) {
      state = "BASELINE_COMPLETE_LOW";
    } else if (overallAccuracy !== null && overallAccuracy >= 0.7 && confidentSkills >= 3) {
      state = "PROFILE_CONFIDENT";
    } else {
      state = "PROFILE_READY";
    }
  }

  return {
    state,
    hasCompletedDiagnostic: completed,
    totalEvidence,
    confidentSkills,
    overallAccuracy,
    hasInProgressDiagnostic: Boolean(inProgressSession),
  };
}

/** Labels for UI display per assessment state. */
export const ASSESSMENT_STATE_LABELS: Record<AssessmentState, {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  icon: "BookOpen" | "RotateCw" | "Target" | "Sparkles" | "Trophy";
}> = {
  NO_BASELINE: {
    eyebrow: "Kenali Kemampuanmu",
    title: "Kenali Kemampuanmu",
    description:
      "Mulai dengan tes singkat agar BC memahami kemampuan awalmu. Hasilnya dipakai untuk menyesuaikan latihan berikutnya.",
    ctaLabel: "Mulai Tes Awal",
    icon: "BookOpen",
  },
  BASELINE_IN_PROGRESS: {
    eyebrow: "Tes Awal",
    title: "Lanjutkan Tes Awal",
    description:
      "Kamu sedang dalam sesi tes awal. Lanjutkan untuk menyelesaikan pemetaan kemampuanmu.",
    ctaLabel: "Lanjutkan Tes",
    icon: "RotateCw",
  },
  BASELINE_COMPLETE_LOW: {
    eyebrow: "BC Sedang Mengenalimu",
    title: "BC Sedang Mengenalimu",
    description:
      "Tes awal sudah selesai. Latihan berikutnya membantu BC memahami kemampuanmu dengan lebih baik.",
    ctaLabel: "Lanjutkan Latihan",
    icon: "Target",
  },
  PROFILE_READY: {
    eyebrow: "Aksi Hari Ini",
    title: "Latihan Untukmu",
    description:
      "BC sudah mulai mengenali kemampuanmu. Latihan berikutnya dipilih berdasarkan hasil belajarmu.",
    ctaLabel: "Mulai Latihan",
    icon: "Sparkles",
  },
  PROFILE_CONFIDENT: {
    eyebrow: "Aksi Hari Ini",
    title: "Latihan Untukmu",
    description:
      "BC sudah cukup mengenali kemampuanmu. Latihan personal siap untukmu.",
    ctaLabel: "Mulai Latihan",
    icon: "Trophy",
  },
};
