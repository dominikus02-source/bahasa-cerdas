/**
 * STEP 4E.2 — DIAGNOSTIC → PERSONALIZED LEARNING ACTIVATION
 *
 * Lapisan personalisasi ADDITIVE di atas profil diagnostik / learner state.
 * BUKAN selector adaptive kedua — konsumsi profil yang sudah ada dan hasilkan
 * "next action" yang terbaca manusia + penjelasan "Kenapa latihan ini?".
 *
 * Prinsip founder:
 *   - BC jangan hanya tahu nilai murid. BC harus tahu muridnya.
 *   - JANGAN bingung WEAK dengan INSUFFICIENT (tangga confidence).
 *   - Target skill TIDAK PERNAH dari skill tanpa bukti.
 *   - Deterministik, server-derived, tanpa LLM, tanpa DB.
 *
 * Semua fungsi di file ini MURNI (tanpa DB/tulis) — aman untuk unit test.
 */
import { DIAGNOSTIC_CONFIDENCE, DIAGNOSTIC_SKILL_LABELS } from "./config";
import type { DiagnosticConfidence } from "./config";
import type { DiagnosticProfile, DiagnosticSkillResult } from "./types";

export type PersonalizedActionType =
  | "PERSONALIZED_PRACTICE" // target skill terpilih dari bukti
  | "CONTINUE_EVIDENCE"; // belum cukup bukti — lanjut kumpulkan evidence

export type PersonalizedSource = "DIAGNOSTIC_PROFILE" | "LEARNER_STATE" | "NONE";

export interface PersonalizedLearningAction {
  actionType: PersonalizedActionType;
  /** Skill target latihan berikutnya — SELALU dari skill yang punya bukti. */
  targetSkill: string | null;
  targetSkillLabel: string | null;
  /** Kode jujur: WEAK_SKILL / PRACTICE_GAP / NO_DATA / INSUFFICIENT_EVIDENCE. */
  reasonCode: string;
  title: string;
  explanation: string;
  confidence: DiagnosticConfidence;
  source: PersonalizedSource;
  recommendation: "EASY" | "MEDIUM" | "HARD" | null;
}

const labelOf = (skill: string): string => DIAGNOSTIC_SKILL_LABELS[skill] ?? skill;

/** Urutan prioritas target: WEAK → DEVELOPING → STRONG (dari bukti saja). */
function categoryRank(category: DiagnosticSkillResult["category"]): number {
  if (category === "WEAK") return 0;
  if (category === "DEVELOPING") return 1;
  if (category === "STRONG") return 2;
  return 3; // INSUFFICIENT_EVIDENCE tidak pernah menjadi target
}

function recommendationFor(category: DiagnosticSkillResult["category"]): "EASY" | "MEDIUM" | "HARD" | null {
  if (category === "WEAK") return "EASY";
  if (category === "DEVELOPING") return "MEDIUM";
  if (category === "STRONG") return "HARD";
  return null;
}

/**
 * Kalimat penjelasan per kategori × confidence (Bahasa Indonesia).
 * INSUFFICIENT_EVIDENCE TIDAK pernah disebut "lemah".
 */
export function explanationFor(skillResult: DiagnosticSkillResult): string {
  const label = labelOf(skillResult.skill);
  switch (skillResult.category) {
    case "WEAK":
      return skillResult.confidence === DIAGNOSTIC_CONFIDENCE.PROFILE_CONFIDENT
        ? `BC melihat bahwa ${label} masih perlu diperkuat.`
        : `BC melihat ${label} masih perlu diperkuat berdasarkan latihanmu sejauh ini.`;
    case "DEVELOPING":
      return `BC memilih latihan ${label} untuk membantu memperkuat kemampuan yang masih berkembang.`;
    case "STRONG":
      return `BC memilih ${label} untuk menjaga kemampuanmu tetap tajam.`;
    default:
      return "BC masih memetakan kemampuanmu. Latihan ini membantu BC mendapatkan lebih banyak bukti tentang kemampuanmu.";
  }
}

/**
 * Pilih target skill dari profil (DETERMINISTIK):
 *   1. hanya skill dengan bukti (attempts > 0, bukan INSUFFICIENT_EVIDENCE)
 *   2. urutkan: kategori (WEAK < DEVELOPING < STRONG) → akurasi naik → skill asc
 *   3. target = yang pertama; null bila tidak ada skill berbukti
 */
export function pickTargetSkill(profile: DiagnosticProfile): DiagnosticSkillResult | null {
  const evidenced = profile.perSkill
    .filter((item) => item.attempts > 0 && item.category !== "INSUFFICIENT_EVIDENCE")
    .sort((a, b) => {
      const rankDiff = categoryRank(a.category) - categoryRank(b.category);
      if (rankDiff !== 0) return rankDiff;
      const accDiff = (a.accuracy ?? 1) - (b.accuracy ?? 1);
      if (accDiff !== 0) return accDiff;
      return a.skill.localeCompare(b.skill);
    });
  return evidenced[0] ?? null;
}

/**
 * Bangun PersonalizedLearningAction dari profil diagnostik (MURNI).
 *
 * Aturan:
 *   - Tidak ada skill berbukti → CONTINUE_EVIDENCE ("BC Sedang Mengenalimu"),
 *     tanpa target — bukan "lemah".
 *   - Ada skill berbukti → target terlemah (deterministik), reasonCode
 *     WEAK_SKILL/DEVELOPING/STRONG disesuaikan, explanation confidence-aware.
 */
export function buildPersonalizedAction(
  profile: DiagnosticProfile,
  source: PersonalizedSource = "LEARNER_STATE"
): PersonalizedLearningAction {
  const target = pickTargetSkill(profile);
  if (!target) {
    return {
      actionType: "CONTINUE_EVIDENCE",
      targetSkill: null,
      targetSkillLabel: null,
      reasonCode: "INSUFFICIENT_EVIDENCE",
      title: "BC Sedang Mengenalimu",
      explanation:
        "Kemampuanmu belum cukup terukur. Latihan berikutnya membantu BC memahami kemampuanmu dengan lebih baik.",
      confidence: DIAGNOSTIC_CONFIDENCE.INSUFFICIENT_EVIDENCE,
      source,
      recommendation: null,
    };
  }

  const reasonCode =
    target.category === "WEAK" ? "WEAK_SKILL" : target.category === "DEVELOPING" ? "DEVELOPING" : "STRONG";
  return {
    actionType: "PERSONALIZED_PRACTICE",
    targetSkill: target.skill,
    targetSkillLabel: target.label,
    reasonCode,
    title: `Perkuat ${target.label}`,
    explanation: explanationFor(target),
    confidence: target.confidence,
    source,
    recommendation: recommendationFor(target.category),
  };
}
