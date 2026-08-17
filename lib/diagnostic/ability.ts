/**
 * BC ASSESSMENT ENGINE 2.1 — CANONICAL ABILITY PROFILE ENGINE.
 *
 * Satu sumber kebenaran untuk mengukur kemampuan murid dari evidence
 * assessment. MURNI (tanpa DB/LLM) — deterministik dan explainable.
 *
 * Prinsip psikometrik sederhana (bukan IRT/Rasch):
 *   1. ABILITY ≠ raw accuracy. Butir HARD memberi sinyal kemampuan lebih kuat
 *      daripada butir EASY pada akurasi yang sama.
 *   2. CONFIDENCE ≠ accuracy. Confidence dibangun dari jumlah bukti, coverage
 *      difficulty, coverage subskill, dan konsistensi — bukan dari persentase.
 *   3. MASTERY butuh minimum bukti + coverage + konsistensi — bukan
 *      accuracy ≥ 80% saja.
 *   4. COVERAGE rendah ≠ lemah. Labelnya "belum cukup terukur".
 *
 * Difficulty weight (explainable):
 *   EASY=1.0 · MEDIUM=1.5 · HARD=2.0 · VERY_HARD=2.5 · unknown=1.0
 */
import { DIFFICULTIES, SKILLS, SUBSKILLS, hasSkill, hasSubskill, type DifficultyId } from "@/lib/question-metadata/taxonomy";
import type { MasteryState } from "@/lib/learner-state/types";

export const ABILITY_PROFILE_VERSION = "2.1.0" as const;

/** Jenis confidence kemampuan (konsisten dengan LearnerConfidence). */
export type AbilityConfidence = "NO_DATA" | "LOW" | "MEDIUM" | "HIGH";

export type AbilityBand = "DASAR" | "MENENGAH" | "TINGGI";

export type ConsistencyState = "STABLE" | "VARIED" | "INSUFFICIENT_DATA";

/** Evidence canonical setelah normalisasi. */
export interface AbilityEvidenceItem {
  skill: string;
  subskill: string | null;
  difficulty: DifficultyId | null;
  isCorrect: boolean;
  /** Source reliability: DIAGNOSTIC tinggi, practice sedang, game rendah. */
  source?: string | null;
}

export interface AbilitySkillProfile {
  skill: string;
  label: string;
  attempts: number;
  correct: number;
  /** Raw accuracy (jujur, tanpa difficulty). */
  accuracy: number | null;
  /** Difficulty-weighted accuracy (sinyal kemampuan). */
  weightedAccuracy: number | null;
  /** Band kemampuan — mempertimbangkan kesulitan yang dicapai. */
  abilityBand: AbilityBand | null;
  /** Kesulitan tertinggi yang pernah dihadapi (bukan hanya benar). */
  maxDifficultySeen: DifficultyId | null;
  /** Kesulitan tertinggi yang dijawab benar. */
  maxDifficultyCorrect: DifficultyId | null;
  /** Fraksi subskill teruji (0..1). */
  subskillCoverage: number;
  /** Jumlah tingkat kesulitan berbeda yang teruji (0..4). */
  difficultyCoverage: number;
  confidence: AbilityConfidence;
  masteryState: MasteryState;
  consistency: ConsistencyState;
  /** Catatan explainable untuk UI ("hanya butir mudah teruji", dst). */
  note: string | null;
}

export interface AbilityProfile {
  /** Sinyal baseline vs recent (bila timeline disediakan via options). */
  reassessmentSignal: ReassessmentSignal;
  skills: AbilitySkillProfile[];
  /** Skills dengan sinyal kemampuan TINGGI + bukti cukup (belum tentu mastery). */
  strongest: string[];
  /** Skills dengan sinyal DASAR + bukti ada — kandidat fokus latihan. */
  focus: string[];
  /** Skills yang belum cukup terukur (coverage/evidence rendah). */
  insufficient: string[];
  overallConfidence: AbilityConfidence;
  coverage: {
    /** Fraksi skill dengan evidence > 0. */
    skills: number;
    /** Fraksi subskill teruji dari seluruh taksonomi yang relevan. */
    subskills: number;
    /** Fraksi tingkat kesulitan (dari 4) yang teruji di seluruh evidence. */
    difficulties: number;
  };
  placement: {
    band: AbilityBand;
    label: string;
    minLevel: number;
    maxLevel: number;
    provisional: boolean;
    note: string;
  } | null;
  profileVersion: string;
}

/* ────────────────────────── reassessment signal ────────────────────────── */

export type ReassessmentSignal = "CURRENT" | "AGING" | "CONTRADICTED" | "INSUFFICIENT";

/** Item evidence ber-timestamp untuk analisis baseline vs recent. */
export interface TimestampedAbilityEvidence extends AbilityEvidenceItem {
  answeredAt?: Date | string | null;
}

/**
 * Deteksi sinyal segar/tua/kontradiktif dari timeline evidence.
 * MURNI — hanya membandingkan baseline vs recent, tanpa menulis apa pun.
 *
 *   INSUFFICIENT : tidak ada evidence sama sekali.
 *   AGING        : ada baseline tapi tidak ada evidence recent (profil mulai basi).
 *   CURRENT      : evidence recent sehat / membaik (gap ≥ -0.1).
 *   CONTRADICTED : recent jauh lebih buruk dari baseline (gap ≤ -0.1) —
 *                  sinyal perlu perhatian, bukan overwrite naïf.
 */
export function detectReassessmentSignal(
  baseline: TimestampedAbilityEvidence[],
  recent: TimestampedAbilityEvidence[]
): ReassessmentSignal {
  const baseN = baseline.length;
  const recentN = recent.length;
  if (baseN === 0 && recentN === 0) return "INSUFFICIENT";
  if (recentN === 0) return baseN > 0 ? "AGING" : "INSUFFICIENT";
  if (baseN === 0) return "CURRENT";

  const accuracy = (items: TimestampedAbilityEvidence[]): number =>
    items.filter((i) => i.isCorrect).length / items.length;
  const gap = accuracy(recent) - accuracy(baseline);
  if (gap <= -0.1) return "CONTRADICTED";
  return "CURRENT";
}

/* ────────────────────────── normalizeEvidence ────────────────────────── */

export type NormalizableEvidence = {
  skill: string;
  subskill?: string | null;
  difficulty?: DifficultyId | string | null;
  isCorrect?: boolean | null;
  correct?: boolean | null;
  source?: string | null;
};

/**
 * Normalisasi semua bentuk evidence ke format canonical.
 * Menangani: DiagnosticEvidenceDetail, LearningEvidence rows, jawaban benar/salah.
 * Baris tanpa skill valid atau tanpa isCorrect → dibuang.
 */
export function normalizeEvidence(items: NormalizableEvidence[]): AbilityEvidenceItem[] {
  const result: AbilityEvidenceItem[] = [];
  for (const item of items) {
    if (!item || typeof item.skill !== "string" || !hasSkill(item.skill)) continue;
    const correct = item.isCorrect === undefined ? (item as { correct?: boolean }).correct : item.isCorrect;
    if (correct === undefined || correct === null) continue;
    let difficulty: DifficultyId | null = null;
    if (typeof item.difficulty === "string" && (DIFFICULTIES as readonly string[]).includes(item.difficulty)) {
      difficulty = item.difficulty as DifficultyId;
    }
    const subskill = typeof item.subskill === "string" && item.subskill ? item.subskill : null;
    result.push({
      skill: item.skill,
      subskill,
      difficulty,
      isCorrect: Boolean(correct),
      source: typeof item.source === "string" ? item.source : null,
    });
  }
  return result;
}

/* ────────────────────────── difficulty model ────────────────────────── */

const DIFFICULTY_WEIGHT: Record<DifficultyId, number> = {
  EASY: 1.0,
  MEDIUM: 1.5,
  HARD: 2.0,
  VERY_HARD: 2.5,
};

export function difficultyWeight(difficulty: DifficultyId | null): number {
  if (!difficulty) return 1.0;
  return DIFFICULTY_WEIGHT[difficulty] ?? 1.0;
}

function difficultyRank(difficulty: DifficultyId | null): number {
  if (!difficulty) return -1;
  return DIFFICULTIES.indexOf(difficulty);
}

/** Kesulitan tertinggi dalam daftar (null bila kosong). */
function highestDifficulty(items: AbilityEvidenceItem[]): DifficultyId | null {
  let best: DifficultyId | null = null;
  for (const item of items) {
    if (item.difficulty && difficultyRank(item.difficulty) > difficultyRank(best)) best = item.difficulty;
  }
  return best;
}

/* ────────────────────────── thresholds ────────────────────────── */

/** Minimum bukti per skill untuk confidence MEDIUM (assessment sesi tunggal). */
export const ABILITY_CONFIDENCE_MIN_MEDIUM = 5;
export const ABILITY_CONFIDENCE_MIN_HIGH = 10;
/** Minimum bukti per skill untuk mastery. */
export const ABILITY_MASTERY_MIN_ATTEMPTS = 10;
/** Fraksi subskill minimal yang harus teruji sebelum mastery dimungkinkan. */
export const ABILITY_MASTERY_MIN_SUBSKILL_COVERAGE = 0.4;
/** Minimum bukti keseluruhan sesi untuk confidence overall MEDIUM. */
export const ABILITY_OVERALL_MIN_EVIDENCE_MEDIUM = 8;
export const ABILITY_OVERALL_MIN_EVIDENCE_HIGH = 15;

/* ────────────────────────── per-skill computation ────────────────────────── */

function skillAccuracy(items: AbilityEvidenceItem[]): number | null {
  return items.length === 0 ? null : items.filter((i) => i.isCorrect).length / items.length;
}

function skillWeightedAccuracy(items: AbilityEvidenceItem[]): number | null {
  const totalWeight = items.reduce((sum, i) => sum + difficultyWeight(i.difficulty), 0);
  if (totalWeight === 0) return null;
  const earned = items.reduce((sum, i) => sum + (i.isCorrect ? difficultyWeight(i.difficulty) : 0), 0);
  return earned / totalWeight;
}

/**
 * Band kemampuan (explainable): butir yang lebih sulit menaikkan sinyal.
 *   - hanya EASY (atau tanpa difficulty) → kapabilitas dibatasi DASAR
 *   - MEDIUM tercapai → ≥0.8 TINGGI, ≥0.6 MENENGAH, else DASAR
 *   - HARD/VERY_HARD tercapai → ≥0.7 TINGGI, ≥0.5 MENENGAH, else DASAR
 */
export function abilityBandFor(
  weightedAccuracy: number | null,
  maxDifficultySeen: DifficultyId | null
): AbilityBand | null {
  if (weightedAccuracy === null) return null;
  const rank = difficultyRank(maxDifficultySeen);
  if (rank <= 0) {
    // EASY saja atau unknown → sinyal kemampuan terbatas.
    return "DASAR";
  }
  if (rank === 1) {
    // MEDIUM tercapai.
    if (weightedAccuracy >= 0.8) return "TINGGI";
    if (weightedAccuracy >= 0.6) return "MENENGAH";
    return "DASAR";
  }
  // HARD / VERY_HARD tercapai.
  if (weightedAccuracy >= 0.7) return "TINGGI";
  if (weightedAccuracy >= 0.5) return "MENENGAH";
  return "DASAR";
}

/**
 * Confidence per skill: bukti + difficulty coverage + subskill coverage.
 *   - MEDIUM: bukti ≥ 5 DAN minimal 2 tingkat kesulitan teruji.
 *   - HIGH:   bukti ≥ 10, ≥ 3 tingkat kesulitan, akurasi ≥ 0.7, DAN subskill teruji.
 * Subskill berperan di gate HIGH — coverage luas menaikkan keyakinan.
 */
export function skillConfidenceFor(
  attempts: number,
  difficultyCoverage: number,
  subskillCoverage: number,
  accuracy: number | null
): AbilityConfidence {
  if (attempts === 0 || accuracy === null) return "NO_DATA";
  if (attempts < ABILITY_CONFIDENCE_MIN_MEDIUM) return "LOW";
  if (attempts >= ABILITY_CONFIDENCE_MIN_HIGH && difficultyCoverage >= 3 && accuracy >= 0.7 && subskillCoverage > 0) {
    return "HIGH";
  }
  if (difficultyCoverage >= 2) return "MEDIUM";
  return "LOW";
}

function consistencyFor(items: AbilityEvidenceItem[]): ConsistencyState {
  if (items.length < 4) return "INSUFFICIENT_DATA";
  const byDifficulty = new Map<string, { correct: number; total: number }>();
  for (const item of items) {
    const key = item.difficulty ?? "UNKNOWN";
    const entry = byDifficulty.get(key) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (item.isCorrect) entry.correct += 1;
    byDifficulty.set(key, entry);
  }
  if (byDifficulty.size < 2) return "INSUFFICIENT_DATA";
  const accuracies = [...byDifficulty.values()].map((e) => e.correct / e.total);
  const spread = Math.max(...accuracies) - Math.min(...accuracies);
  return spread > 0.3 ? "VARIED" : "STABLE";
}

/**
 * Mastery per skill — membutuhkan minimum bukti + coverage + konsistensi,
 * BUKAN sekadar accuracy ≥ 80%.
 */
export function masteryFor(
  attempts: number,
  accuracy: number | null,
  difficultyCoverage: number,
  subskillCoverage: number,
  consistency: ConsistencyState
): MasteryState {
  if (attempts === 0 || accuracy === null) return "NO_DATA";
  // Mastery butuh bukti cukup + coverage difficulty + coverage subskill luas.
  if (
    attempts < ABILITY_MASTERY_MIN_ATTEMPTS ||
    difficultyCoverage < 2 ||
    subskillCoverage < ABILITY_MASTERY_MIN_SUBSKILL_COVERAGE
  ) {
    return "NOT_ENOUGH_EVIDENCE";
  }
  if (consistency === "VARIED") return "DEVELOPING";
  if (accuracy >= 0.8 && consistency === "STABLE") return "PROFICIENT";
  return "DEVELOPING";
}

/** Catatan explainable per skill. */
function noteFor(
  accuracy: number | null,
  attempts: number,
  maxDifficultySeen: DifficultyId | null,
  abilityBand: AbilityBand | null,
  subskillCoverage: number,
  consistency: ConsistencyState
): string | null {
  if (attempts === 0 || accuracy === null || abilityBand === null) return null;
  const parts: string[] = [];
  if (difficultyRank(maxDifficultySeen) <= 0) {
    parts.push("Butir yang teruji masih mudah — sinyal kemampuan terbatas.");
  } else if (difficultyRank(maxDifficultySeen) >= 2) {
    parts.push("Kemampuan diuji pada butir sulit.");
  }
  if (subskillCoverage < 0.25) parts.push("Subskill yang teruji masih sedikit.");
  if (consistency === "VARIED") parts.push("Hasil bervariasi antar tingkat kesulitan.");
  return parts.length > 0 ? parts.join(" ") : null;
}

/* ────────────────────────── overall profile ────────────────────────── */

const PLACEMENT_BANDS: { band: AbilityBand; label: string; minLevel: number; maxLevel: number }[] = [
  { band: "DASAR", label: "Dasar", minLevel: 1, maxLevel: 4 },
  { band: "MENENGAH", label: "Menengah", minLevel: 5, maxLevel: 8 },
  { band: "TINGGI", label: "Tinggi", minLevel: 9, maxLevel: 12 },
];

function overallConfidenceFor(
  totalEvidence: number,
  skillsCovered: number,
  difficultyCoverage: number,
  weightedAccuracy: number | null,
  subskillCoverageFraction: number
): AbilityConfidence {
  if (totalEvidence === 0 || weightedAccuracy === null) return "NO_DATA";
  // HIGH butuh subskill coverage luas — banyak bukti satu subskill ≠ profil yakin.
  if (
    totalEvidence >= ABILITY_OVERALL_MIN_EVIDENCE_HIGH &&
    skillsCovered >= 4 &&
    difficultyCoverage >= 3 &&
    weightedAccuracy >= 0.7 &&
    subskillCoverageFraction >= 0.3
  ) {
    return "HIGH";
  }
  if (totalEvidence >= ABILITY_OVERALL_MIN_EVIDENCE_MEDIUM && skillsCovered >= 3 && difficultyCoverage >= 2) {
    return "MEDIUM";
  }
  return "LOW";
}

/** Opsi tambahan untuk computeAbilityProfile. */
export interface AbilityProfileOptions {
  /** Evidence baseline (lama) untuk sinyal reassessment. */
  baseline?: TimestampedAbilityEvidence[];
  /** Evidence recent (baru) untuk sinyal reassessment. */
  recent?: TimestampedAbilityEvidence[];
}

/**
 * computeAbilityProfile — fungsi kanonik (MURNI, deterministik).
 *
 * Input: evidence canonical (hasil normalizeEvidence) — biasanya evidence
 * sesi assessment (source DIAGNOSTIC). Output: AbilityProfile dengan band
 * ability, confidence, coverage, mastery, dan rekomendasi jujur.
 *
 * Opsional: kirim baseline/recent untuk menghitung reassessmentSignal.
 */
export function computeAbilityProfile(items: AbilityEvidenceItem[], options?: AbilityProfileOptions): AbilityProfile {
  const signal =
    options?.baseline || options?.recent
      ? detectReassessmentSignal(options?.baseline ?? [], options?.recent ?? [])
      : items.length === 0
        ? "INSUFFICIENT"
        : "CURRENT";
  const bySkill = new Map<string, AbilityEvidenceItem[]>();
  for (const item of items) {
    const list = bySkill.get(item.skill) ?? [];
    list.push(item);
    bySkill.set(item.skill, list);
  }

  const skills: AbilitySkillProfile[] = Object.keys(SKILLS)
    .sort()
    .map((skill) => {
      const evidence = bySkill.get(skill) ?? [];
      const correct = evidence.filter((i) => i.isCorrect).length;
      const accuracy = skillAccuracy(evidence);
      const weightedAccuracy = skillWeightedAccuracy(evidence);
      const maxDifficultySeen = highestDifficulty(evidence);
      const maxDifficultyCorrect = highestDifficulty(evidence.filter((i) => i.isCorrect));
      const subskillsTotal = Object.keys(SUBSKILLS[skill as keyof typeof SUBSKILLS] ?? {}).length;
      const subskillsSeen = new Set(evidence.map((i) => i.subskill).filter((s): s is string => Boolean(s)));
      const subskillCoverage = subskillsTotal === 0 ? 0 : subskillsSeen.size / subskillsTotal;
      const difficultyCoverage = new Set(evidence.map((i) => i.difficulty).filter((d): d is DifficultyId => Boolean(d))).size;
      const band = abilityBandFor(weightedAccuracy, maxDifficultySeen);
      const consistency = consistencyFor(evidence);

      return {
        skill,
        label: SKILLS[skill as keyof typeof SKILLS],
        attempts: evidence.length,
        correct,
        accuracy,
        weightedAccuracy,
        abilityBand: band,
        maxDifficultySeen,
        maxDifficultyCorrect,
        subskillCoverage,
        difficultyCoverage,
        confidence: skillConfidenceFor(evidence.length, difficultyCoverage, subskillCoverage, accuracy),
        masteryState: masteryFor(evidence.length, accuracy, difficultyCoverage, subskillCoverage, consistency),
        consistency,
        note: noteFor(accuracy, evidence.length, maxDifficultySeen, band, subskillCoverage, consistency),
      };
    });

  const evidenced = skills.filter((s) => s.attempts > 0);
  const totalEvidence = items.length;
  const weightedAccuracyOverall =
    items.length === 0
      ? null
      : items.reduce((sum, i) => sum + (i.isCorrect ? difficultyWeight(i.difficulty) : 0), 0) /
        items.reduce((sum, i) => sum + difficultyWeight(i.difficulty), 0);
  const skillsCovered = evidenced.length;
  const difficultyCoverageOverall = new Set(items.map((i) => i.difficulty).filter((d): d is DifficultyId => Boolean(d))).size;
  const subskillsCovered = new Set(items.map((i) => i.subskill).filter((s): s is string => Boolean(s))).size;
  const subskillsTotal = Object.values(SUBSKILLS).reduce((sum, map) => sum + Object.keys(map).length, 0);

  // strongest/focus hanya dari skill dengan bukti; insufficient = coverage rendah.
  const strongest = evidenced
    .filter((s) => s.abilityBand === "TINGGI")
    .sort((a, b) => (b.weightedAccuracy ?? 0) - (a.weightedAccuracy ?? 0))
    .map((s) => s.skill);
  const focus = evidenced
    .filter((s) => s.abilityBand === "DASAR")
    .sort((a, b) => (a.weightedAccuracy ?? 1) - (b.weightedAccuracy ?? 1))
    .map((s) => s.skill);
  // Insufficient = "belum cukup terukur": tanpa bukti ATAU bukti terlalu tipis
  // (< 3 butir) untuk menilai kemampuan — bukan berarti lemah.
  const insufficient = skills
    .filter((s) => s.attempts === 0 || s.attempts < 3)
    .map((s) => s.skill);

  const subskillCoverageFraction = subskillsTotal === 0 ? 0 : subskillsCovered / subskillsTotal;
  const overallConfidence = overallConfidenceFor(
    totalEvidence,
    skillsCovered,
    difficultyCoverageOverall,
    weightedAccuracyOverall,
    subskillCoverageFraction
  );

  // Placement — difficulty-aware, selalu provisional untuk sesi tunggal.
  let placement: AbilityProfile["placement"] = null;
  if (weightedAccuracyOverall !== null && totalEvidence > 0) {
    const band =
      weightedAccuracyOverall >= 0.85 && difficultyRank(highestDifficulty(items)) >= 2
        ? "TINGGI"
        : weightedAccuracyOverall >= 0.7
          ? "MENENGAH"
          : "DASAR";
    const meta = PLACEMENT_BANDS.find((b) => b.band === band) ?? PLACEMENT_BANDS[0];
    placement = {
      band,
      label: meta.label,
      minLevel: meta.minLevel,
      maxLevel: meta.maxLevel,
      provisional: true,
      note:
        band === "TINGGI"
          ? "Sinyal kemampuan tinggi dari butir yang diuji — tetap diukur ulang setelah latihan."
          : band === "MENENGAH"
            ? "Sinyal kemampuan sedang — lanjutkan di tingkat menengah."
            : "Sinyal masih terbatas — mulai dari tingkat dasar agar fondasi kuat.",
    };
  }

  return {
    reassessmentSignal: signal,
    skills,
    strongest,
    focus,
    insufficient,
    overallConfidence,
    coverage: {
      skills: totalEvidence === 0 ? 0 : skillsCovered / Object.keys(SKILLS).length,
      subskills: subskillsTotal === 0 ? 0 : subskillsCovered / subskillsTotal,
      difficulties: difficultyCoverageOverall / DIFFICULTIES.length,
    },
    placement,
    profileVersion: ABILITY_PROFILE_VERSION,
  };
}
