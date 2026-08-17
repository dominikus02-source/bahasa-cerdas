/**
 * BC ASSESSMENT ENGINE 2.2 — SYNTHETIC STUDENT ARCHETYPES.
 * Test fixture ONLY — tidak pernah masuk production DB.
 *
 * Setiap archetype menghasilkan evidence canonical (AbilityEvidenceItem)
 * yang mewakili profil murid realistis. Dipakai test simulation,
 * adversarial, monotonicity, dan randomized.
 */
import type { AbilityEvidenceItem, TimestampedAbilityEvidence } from "../../lib/diagnostic/ability";

export const SKILL_SUBSKILLS: Record<string, string[]> = {
  READING: ["READING_IDE_POKOK", "READING_INFERENSI", "READING_STRUKTUR_TEKS", "READING_INFORMASI_TERSURAT", "READING_MAKNA_KATA"],
  GRAMMAR: ["GRAMMAR_EJAAN", "GRAMMAR_KALIMAT_EFEKTIF", "GRAMMAR_IMBUHAN", "GRAMMAR_TANDA_BACA", "GRAMMAR_KATA_BAKU"],
  VOCABULARY: ["VOCABULARY_MAKNA_KATA", "VOCABULARY_SINONIM_ANTONIM", "VOCABULARY_KATA_BAKU", "VOCABULARY_KONTEKS"],
  LITERATURE: ["LITERATURE_UNSUR_CERITA", "LITERATURE_GAYA_BAHASA", "LITERATURE_APRESIASI_KARYA", "LITERATURE_MAKNA_SASTRA"],
  WRITING: ["WRITING_EJAAN", "WRITING_KALIMAT_EFEKTIF", "WRITING_ORGANISASI_GAGASAN", "WRITING_KETEPATAN_KATA"],
  LISTENING: ["LISTENING_INFORMASI_TERSURAT", "LISTENING_INFERENSI", "LISTENING_GAGASAN_UTAMA"],
  SPEAKING: ["SPEAKING_KELANCARAN", "SPEAKING_KETEPATAN_BAHASA", "SPEAKING_ORGANISASI_GAGASAN"],
};

export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "VERY_HARD";

export function mk(
  skill: string,
  isCorrect: boolean,
  difficulty: Difficulty = "MEDIUM",
  subskill: string | null = null
): AbilityEvidenceItem {
  return { skill, subskill, difficulty, isCorrect };
}

/**
 * Generate n item untuk satu skill dengan akurasi target.
 * Kesulitan dirotasi dari pool; subskill dirotasi dari daftar skill.
 */
export function fill(
  skill: string,
  n: number,
  accuracy: number,
  difficultyPool: Difficulty[] = ["EASY", "MEDIUM", "HARD"],
  subskillPool?: string[] | null,
  seed = 0
): AbilityEvidenceItem[] {
  const subs = subskillPool ?? SKILL_SUBSKILLS[skill] ?? [];
  const items: AbilityEvidenceItem[] = [];
  for (let i = 0; i < n; i++) {
    // Deterministik & menyebar: (i*7 + seed*13) mod 100 — coprime dengan 100,
    // jadi akurasi target ≈ proporsi benar untuk n berapapun (tidak semua benar
    // hanya karena n < 100/akurasi).
    const correct = (i * 7 + seed * 13) % 100 < accuracy * 100;
    items.push(
      mk(
        skill,
        correct,
        difficultyPool[i % difficultyPool.length],
        subs.length > 0 ? subs[(i + seed) % subs.length] : null
      )
    );
  }
  return items;
}

/** Generate n item lintas beberapa skill. */
export function fillAcross(
  skills: string[],
  perSkill: number,
  accuracy: number,
  difficultyPool: Difficulty[] = ["EASY", "MEDIUM", "HARD"]
): AbilityEvidenceItem[] {
  const items: AbilityEvidenceItem[] = [];
  for (const skill of skills) items.push(...fill(skill, perSkill, accuracy, difficultyPool));
  return items;
}

/* ────────────────────────── ARCHETYPES S1–S16 ────────────────────────── */

export const ARCHETYPES: Record<string, AbilityEvidenceItem[] | { baseline: TimestampedAbilityEvidence[]; recent: TimestampedAbilityEvidence[] }> = {
  /** S1: Semua skill pemula — bukti sangat tipis, akurasi rendah, EASY. */
  S1: [
    ...fill("READING", 2, 0.25, ["EASY"]),
    ...fill("GRAMMAR", 2, 0.25, ["EASY"]),
    ...fill("VOCABULARY", 2, 0.33, ["EASY"]),
  ],

  /** S2: Semua skill kuat — banyak bukti, akurasi tinggi, mixed difficulty. */
  S2: [
    ...fill("READING", 20, 0.85),
    ...fill("GRAMMAR", 20, 0.85),
    ...fill("VOCABULARY", 18, 0.85),
    ...fill("LITERATURE", 15, 0.85),
    ...fill("WRITING", 15, 0.85),
  ],

  /** S3: Reading kuat, Grammar lemah. */
  S3: [...fill("READING", 20, 0.9), ...fill("GRAMMAR", 20, 0.3)],

  /** S4: Grammar kuat, Vocabulary lemah. */
  S4: [...fill("GRAMMAR", 20, 0.9), ...fill("VOCABULARY", 20, 0.3)],

  /** S5: Akurasi tinggi tetapi evidence sangat sedikit (2/2). */
  S5: [mk("READING", true, "MEDIUM"), mk("READING", true, "MEDIUM")],

  /** S6: Akurasi rendah tetapi evidence banyak (40/100 MEDIUM). */
  S6: fill("READING", 100, 0.4, ["MEDIUM"]),

  /** S7: Easy sangat kuat, Medium lemah. */
  S7: [...fill("GRAMMAR", 10, 1, ["EASY"]), ...fill("GRAMMAR", 10, 0.2, ["MEDIUM"])],

  /** S8: Easy lemah, Hard kuat. */
  S8: [...fill("GRAMMAR", 10, 0.2, ["EASY"]), ...fill("GRAMMAR", 10, 0.9, ["HARD"])],

  /** S9: Meningkat signifikan — baseline lemah, recent kuat. */
  S9: {
    baseline: fill("READING", 15, 0.3, ["EASY", "MEDIUM"]),
    recent: fill("READING", 15, 0.9, ["MEDIUM", "HARD"]),
  },

  /** S10: Menurun — baseline kuat, recent lemah. */
  S10: {
    baseline: fill("READING", 15, 0.9, ["MEDIUM", "HARD"]),
    recent: fill("READING", 15, 0.3, ["EASY", "MEDIUM"]),
  },

  /** S11: Baseline kuat, recent practice lemah. */
  S11: {
    baseline: fill("READING", 20, 0.85, ["MEDIUM", "HARD"]),
    recent: fill("READING", 20, 0.4, ["EASY", "MEDIUM"]),
  },

  /** S12: Baseline lemah, recent practice kuat. */
  S12: {
    baseline: fill("READING", 20, 0.3, ["EASY", "MEDIUM"]),
    recent: fill("READING", 20, 0.85, ["MEDIUM", "HARD"]),
  },

  /** S13: Hanya satu skill yang terukur. */
  S13: fill("READING", 25, 0.8, ["EASY", "MEDIUM", "HARD"]),

  /** S14: Banyak evidence tetapi subskill coverage buruk (1 subskill per skill). */
  S14: fillAcross(["READING", "GRAMMAR", "VOCABULARY", "LITERATURE"], 12, 0.75, ["EASY", "MEDIUM", "HARD"]).map((item, i) =>
    item.subskill === null ? item : { ...item, subskill: SKILL_SUBSKILLS[item.skill]?.[0] ?? null }
  ),

  /** S15: Hampir sempurna tetapi hanya EASY. */
  S15: fill("GRAMMAR", 20, 0.95, ["EASY"]),

  /** S16: 70% tersebar merata di EASY/MEDIUM/HARD. */
  S16: fill("READING", 30, 0.7, ["EASY", "MEDIUM", "HARD"]),
};

/* ────────────────────────── ADVERSARIAL A–H ────────────────────────── */

export const ADVERSARIAL: Record<string, AbilityEvidenceItem[]> = {
  /** A: 1/1 HARD. */
  A: [mk("READING", true, "HARD")],

  /** B: 10/10 EASY. */
  B: fill("READING", 10, 1, ["EASY"]),

  /** C: 10/10 EASY + 10/10 MEDIUM. */
  C: [...fill("READING", 10, 1, ["EASY"]), ...fill("READING", 10, 1, ["MEDIUM"])],

  /** D: 10/10 EASY + 10/10 HARD. */
  D: [...fill("READING", 10, 1, ["EASY"]), ...fill("READING", 10, 1, ["HARD"])],

  /** E: 50/100 MEDIUM. */
  E: fill("READING", 100, 0.5, ["MEDIUM"]),

  /** F: 1/10 EASY + 10/10 HARD. */
  F: [...fill("READING", 10, 0.1, ["EASY"]), ...fill("READING", 10, 1, ["HARD"])],

  /** G: 100% satu subskill (READING_IDE_POKOK). */
  G: fill("READING", 20, 1, ["EASY", "MEDIUM", "HARD"], ["READING_IDE_POKOK"]),

  /** H: 100% skill tetapi hanya satu subskill. */
  H: fill("READING", 20, 1, ["EASY", "MEDIUM", "HARD"], ["READING_IDE_POKOK"]),
};
