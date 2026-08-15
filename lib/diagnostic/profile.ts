import { DIFFICULTIES } from "@/lib/question-metadata/taxonomy";
import {
  DIAGNOSTIC_CONFIDENT_MIN_ATTEMPTS,
  DIAGNOSTIC_CONFIDENT_MIN_RECENT_ACCURACY,
  DIAGNOSTIC_CONFIDENCE,
  DIAGNOSTIC_PLACEMENT_BANDS,
  DIAGNOSTIC_PROFILE_THRESHOLDS,
  DIAGNOSTIC_SKILL_LABELS,
} from "./config";
import type { DiagnosticConfidence } from "./config";
import type { DiagnosticEvidenceDetail, DiagnosticProfile, DiagnosticSkillResult } from "./types";
import type { LearnerSkillState } from "@/lib/learner-state/types";

function categoryFor(attempts: number, accuracy: number | null): DiagnosticSkillResult["category"] {
  if (attempts === 0 || accuracy === null) return "INSUFFICIENT_EVIDENCE";
  if (accuracy >= DIAGNOSTIC_PROFILE_THRESHOLDS.STRONG_MIN) return "STRONG";
  if (accuracy >= DIAGNOSTIC_PROFILE_THRESHOLDS.DEVELOPING_MIN) return "DEVELOPING";
  return "WEAK";
}

function labelOf(skill: string): string {
  return DIAGNOSTIC_SKILL_LABELS[skill] ?? skill;
}

/** Tangga kepercayaan diagnostik (Part A): 0 bukti → INSUFFICIENT_EVIDENCE. */
function confidenceFor(attempts: number, recentAccuracy: number | null): DiagnosticConfidence {
  if (attempts === 0 || recentAccuracy === null) return DIAGNOSTIC_CONFIDENCE.INSUFFICIENT_EVIDENCE;
  if (attempts >= DIAGNOSTIC_CONFIDENT_MIN_ATTEMPTS && recentAccuracy >= DIAGNOSTIC_CONFIDENT_MIN_RECENT_ACCURACY) {
    return DIAGNOSTIC_CONFIDENCE.PROFILE_CONFIDENT;
  }
  return DIAGNOSTIC_CONFIDENCE.PROVISIONAL;
}

/** Rekomendasi awal jalur belajar per skill (rule-based, tanpa LLM). */
function recommendationFor(category: DiagnosticSkillResult["category"]): "EASY" | "MEDIUM" | "HARD" | null {
  if (category === "WEAK") return "EASY";
  if (category === "DEVELOPING") return "MEDIUM";
  if (category === "STRONG") return "HARD";
  return null;
}

/** Band level dari akurasi (satu sesi → selalu PROVISIONAL di placement overall). */
function bandForAccuracy(accuracy: number | null): { minLevel: number; maxLevel: number } | null {
  if (accuracy === null) return null;
  const band = DIAGNOSTIC_PLACEMENT_BANDS.find(
    (candidate) => accuracy >= candidate.minAccuracy && accuracy <= candidate.maxAccuracy
  );
  return band ? { minLevel: band.minLevel, maxLevel: band.maxLevel } : null;
}

/**
 * Kalimat insight rule-based dari hasil per skill (Bahasa Indonesia,
 * tanpa menyebut "lemah" bagi skill tanpa bukti). MURNI.
 */
export function buildInsightText(profile: Pick<DiagnosticProfile, "overallAccuracy" | "perSkill" | "strongest" | "weakest" | "developing" | "insufficient">): string | null {
  if (profile.overallAccuracy === null) {
    return "Belum ada cukup bukti dari sesi diagnostik untuk menyimpulkan profil. Terus berlatih agar asesmen berikutnya lebih akurat.";
  }
  const parts: string[] = [];
  if (profile.strongest) {
    parts.push(`Kemampuan terkuatmu: ${labelOf(profile.strongest)}.`);
  }
  if (profile.weakest) {
    const weakResult = profile.perSkill.find((item) => item.skill === profile.weakest);
    if (weakResult && weakResult.category === "WEAK") {
      parts.push(`Fokus kembangkan: ${labelOf(profile.weakest)}.`);
    }
  }
  if (profile.developing.length > 0) {
    parts.push(`Lanjutkan secara konsisten: ${profile.developing.map(labelOf).join(", ")}.`);
  }
  if (profile.insufficient.length > 0) {
    parts.push(`Belum terukur: ${profile.insufficient.map(labelOf).join(", ")} — akan tervalidasi setelah latihan lanjutan.`);
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

function buildPlacement(overall: number | null): DiagnosticProfile["placement"] {
  if (overall === null) return null;
  const band = DIAGNOSTIC_PLACEMENT_BANDS.find(
    (candidate) => overall >= candidate.minAccuracy && overall <= candidate.maxAccuracy
  );
  if (!band) return null;
  return {
    band: band.band,
    label: band.label,
    minLevel: band.minLevel,
    maxLevel: band.maxLevel,
    provisional: true,
    note:
      band.band === "TINGGI"
        ? "Akurasi keseluruhan tinggi. Mulai dari tingkat menengah ke atas jalur belajar, tetap diukur ulang setelah latihan."
        : band.band === "MENENGAH"
          ? "Akurasi keseluruhan sedang. Mulai dari tingkat menengah jalur belajar."
          : "Akurasi keseluruhan masih rendah. Mulai dari tingkat dasar jalur belajar agar fondasi kuat.",
  };
}

function finalizeProfile(perSkill: DiagnosticSkillResult[]): DiagnosticProfile {
  const evidenced = perSkill.filter((item) => item.accuracy !== null && item.attempts > 0);
  const overall =
    evidenced.length === 0
      ? null
      : evidenced.reduce((sum, item) => sum + (item.accuracy ?? 0), 0) / evidenced.length;

  const strongest = evidenced.length > 0
    ? evidenced.reduce((best, item) => (item.accuracy! > (best.accuracy ?? -1) ? item : best)).skill
    : null;
  const weakest = evidenced.length > 0
    ? evidenced.reduce((worst, item) => (item.accuracy! < (worst.accuracy ?? Infinity) ? item : worst)).skill
    : null;
  const developing = perSkill.filter((item) => item.category === "DEVELOPING").map((item) => item.skill);
  const insufficient = perSkill.filter((item) => item.category === "INSUFFICIENT_EVIDENCE").map((item) => item.skill);

  const confidence: DiagnosticConfidence =
    perSkill.length === 0 || evidenced.length === 0
      ? DIAGNOSTIC_CONFIDENCE.INSUFFICIENT_EVIDENCE
      : perSkill.some((item) => item.confidence === DIAGNOSTIC_CONFIDENCE.PROFILE_CONFIDENT)
        ? DIAGNOSTIC_CONFIDENCE.PROFILE_CONFIDENT
        : DIAGNOSTIC_CONFIDENCE.PROVISIONAL;

  const profile: DiagnosticProfile = {
    overallAccuracy: overall,
    perSkill,
    strongest,
    weakest,
    developing,
    insufficient,
    confidence,
    insightText: null,
    placement: buildPlacement(overall),
  };
  profile.insightText = buildInsightText(profile);
  return profile;
}

function resultForSkill(
  skill: string,
  attempts: number,
  correct: number,
  recentAccuracy: number | null,
  strongestEvidence: DifficultyIdLike | null
): DiagnosticSkillResult {
  const accuracy = attempts === 0 ? null : correct / attempts;
  const category = categoryFor(attempts, accuracy);
  return {
    skill,
    label: labelOf(skill),
    attempts,
    correct,
    accuracy,
    category,
    confidence: confidenceFor(attempts, recentAccuracy ?? accuracy),
    band: bandForAccuracy(accuracy),
    evidenceCount: attempts,
    strongestEvidence,
    recommendation: recommendationFor(category),
  };
}

type DifficultyIdLike = "EASY" | "MEDIUM" | "HARD" | "VERY_HARD" | null;

function strongestEvidenceDifficulty(correctItems: DiagnosticEvidenceDetail[]): DifficultyIdLike {
  let best: DifficultyIdLike = null;
  let bestIndex = -1;
  for (const item of correctItems) {
    if (!item.difficulty) continue;
    const index = DIFFICULTIES.indexOf(item.difficulty);
    if (index > bestIndex) {
      bestIndex = index;
      best = item.difficulty;
    }
  }
  return best;
}

/**
 * Jalur kanonik 4E.1: profil dari DETAIL EVIDENCE per butir (skill,
 * difficulty, isCorrect) yang dibaca server-side dari LearningEvidence
 * milik sesi diagnostik. MURNI — tanpa DB/LLM.
 *
 * Semantik (Part I): WEAK ≠ INSUFFICIENT_EVIDENCE — WEAK hanya bila ada
 * bukti dengan akurasi < 60%. Placement selalu PROVISIONAL.
 */
export function computeProfileFromEvidence(details: DiagnosticEvidenceDetail[]): DiagnosticProfile {
  if (details.length === 0) {
    return finalizeProfile([]);
  }
  const bySkill = new Map<string, DiagnosticEvidenceDetail[]>();
  for (const detail of details) {
    const list = bySkill.get(detail.skill) ?? [];
    list.push(detail);
    bySkill.set(detail.skill, list);
  }
  const perSkill: DiagnosticSkillResult[] = [...bySkill.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([skill, items]) => {
      const correct = items.filter((item) => item.isCorrect);
      return resultForSkill(skill, items.length, correct.length, correct.length / items.length, strongestEvidenceDifficulty(correct));
    });
  return finalizeProfile(perSkill);
}

/**
 * Jalur back-compat STEP 4E: profil dari LearnerSkillState (learner-state
 * service). Field 4E.1 baru diisi best-effort dari state yang tersedia.
 */
export function computeDiagnosticProfile(states: LearnerSkillState[]): DiagnosticProfile {
  if (states.length === 0) return finalizeProfile([]);
  const perSkill: DiagnosticSkillResult[] = states.map((state) =>
    resultForSkill(
      state.skill,
      state.attemptCount,
      state.correctCount,
      state.recentAccuracy ?? state.accuracy,
      null
    )
  );
  return finalizeProfile(perSkill);
}

/**
 * Proyeksi per skill yang TIDAK ikut diuji sesi ini (0 evidence) — agar
 * panel hasil jujur: "Belum terukur", bukan "lemah" (Part I).
 */
export function withUntestedSkills(profile: DiagnosticProfile, allSkills: string[]): DiagnosticProfile {
  const tested = new Set(profile.perSkill.map((item) => item.skill));
  const missing = allSkills
    .filter((skill) => !tested.has(skill))
    .sort((a, b) => a.localeCompare(b))
    .map((skill) =>
      resultForSkill(skill, 0, 0, null, null)
    );
  if (missing.length === 0) return profile;
  const perSkill = [...profile.perSkill, ...missing];
  return finalizeProfile(perSkill);
}