/**
 * STEP 4E.1 — Diagnostic Assessment Quality Upgrade — Konfigurasi.
 *
 * Di atas 4E: diagnostik bukan sekadar kuis — komposisi target mengikuti
 * founder (Part B): READING 2 · GRAMMAR 2 · VOCABULARY 2 · LITERATURE 1 ·
 * WRITING 2 · LISTENING 1 (10 butir). LISTENING hanya direquest bila korpus
 * mendukung (Part E/Q); SPEAKING = slot masa depan, TIDAK pernah direquest.
 *
 * Prinsip:
 *   - RCTable reuse: AdaptivePracticeSession (reasonCode=DIAGNOSTIC) +
 *     LearningEvidence (source BANK_SOAL) — TANPA migrasi schema (Part M).
 *   - Tidak ada XP/koin dari diagnostik (Part O).
 *   - Pool = metadata APPROVED saja (honest, tanpa fabrikasi).
 *   - Kesulitan per slot (Part G): Q1–Q3 EASY, Q4–Q7 MEDIUM, Q8–Q10 HARD.
 */

export const DIAGNOSTIC_REASON_CODE = "DIAGNOSTIC" as const;
export const DIAGNOSTIC_SELECTION_VERSION = "1.1" as const;
export const DIAGNOSTIC_SUPPORTED_SOURCES = ["BANK_SOAL"] as const;

/** Ukuran sesi diagnostik: spec Part D — 8–12 butir; default 10 (server-only). */
export const DIAGNOSTIC_ALLOWED_SIZES = [8, 10, 12] as const;
export const DIAGNOSTIC_DEFAULT_SIZE = 10 as const;
export const DIAGNOSTIC_MIN_ITEMS = 8 as const;

/** Durasi sesi (menit) — konsisten dengan adaptive practice. */
export const DIAGNOSTIC_SESSION_MINUTES = 30 as const;

/** Estimasi lama pengerjaan tampilan kartu (Part J: ±5–8 menit). */
export const DIAGNOSTIC_ESTIMATED_MINUTES = 8 as const;

/**
 * Urutan prioritas skill yang diuji untuk pemilihan round-robin lama.
 * LISTENING/SPEAKING sengaja TIDAK ada di prioritas ini (produksi belum punya
 * aset audio — laporan Part R mencatatnya jujur); LISTENING direquest hanya
 * via komposisi target dengan fallback eksplisit (lih. DIAGNOSTIC_COMPOSITION).
 */
export const DIAGNOSTIC_SKILL_PRIORITY = [
  "READING",
  "GRAMMAR",
  "VOCABULARY",
  "LITERATURE",
  "WRITING",
] as const;

/**
 * Import murni agar label tidak perlu mengimpor DB — sumber label sama dengan
 * taksonomi (SKILLS di lib/question-metadata/taxonomy).
 */
export const DIAGNOSTIC_SKILL_LABELS: Record<string, string> = {
  READING: "Membaca",
  WRITING: "Menulis",
  LISTENING: "Mendengarkan",
  SPEAKING: "Berbicara",
  GRAMMAR: "Tata Bahasa",
  VOCABULARY: "Kosakata",
  LITERATURE: "Sastra",
};

/**
 * Prioritas tipe soal (Part C): PILIHAN_GANDA → BENAR_SALAH → ISIAN_SINGKAT.
 * CONSTRUCTED (menulis) masa depan — korpus belum punya yang APPROVED
 * (Part D: selama scoring constructed belum aman, WRITING dinilai lewat
 * butir ber-skill WRITING dengan tipe otomatis, status PROVISIONAL).
 */
export const DIAGNOSTIC_QUESTION_TYPES = [
  "PILIHAN_GANDA",
  "BENAR_SALAH",
  "ISIAN_SINGKAT",
] as const;
export type DiagnosticQuestionTypeId = (typeof DIAGNOSTIC_QUESTION_TYPES)[number];

/**
 * Komposisi target per ukuran (Part B). Order antrean menentukan urutan slot:
 * 8  → READING 2 · GRAMMAR 2 · VOCAB 1 · LITERATURE 1 · WRITING 1 · LISTENING 1
 * 10 → READING 2 · GRAMMAR 2 · VOCAB 2 · LITERATURE 1 · WRITING 2 · LISTENING 1
 * 12 → READING 2 · GRAMMAR 2 · VOCAB 2 · LITERATURE 2 · WRITING 2 · LISTENING 2
 */
export const DIAGNOSTIC_COMPOSITION: Record<number, { skill: string; count: number }[]> = {
  8: [
    { skill: "READING", count: 2 },
    { skill: "GRAMMAR", count: 2 },
    { skill: "VOCABULARY", count: 1 },
    { skill: "LITERATURE", count: 1 },
    { skill: "WRITING", count: 1 },
    { skill: "LISTENING", count: 1 },
  ],
  10: [
    { skill: "READING", count: 2 },
    { skill: "GRAMMAR", count: 2 },
    { skill: "VOCABULARY", count: 2 },
    { skill: "LITERATURE", count: 1 },
    { skill: "WRITING", count: 2 },
    { skill: "LISTENING", count: 1 },
  ],
  12: [
    { skill: "READING", count: 2 },
    { skill: "GRAMMAR", count: 2 },
    { skill: "VOCABULARY", count: 2 },
    { skill: "LITERATURE", count: 2 },
    { skill: "WRITING", count: 2 },
    { skill: "LISTENING", count: 2 },
  ],
};

/** Antrean skill (flat, terurut) untuk ukuran tertentu — deterministik. */
export function diagnosticCompositionQueue(size: number): string[] {
  const entries = DIAGNOSTIC_COMPOSITION[size] ?? DIAGNOSTIC_COMPOSITION[DIAGNOSTIC_DEFAULT_SIZE];
  const queue: string[] = [];
  for (const entry of entries) {
    for (let i = 0; i < entry.count; i++) queue.push(entry.skill);
  }
  return Number.isInteger(size) && size < queue.length ? queue.slice(0, size) : queue;
}

/**
 * Siklus kesulitan kanonik 10 butir (Part G: Q1–Q3 EASY, Q4–Q7 MEDIUM,
 * Q8–Q10 HARD = 3/4/3) — dipertahankan sebagai kanonik/back-compat;
 * `difficultyPlanForSize` menurunkannya untuk ukuran lain.
 */
export const DIAGNOSTIC_DIFFICULTY_CYCLE = ["EASY", "EASY", "EASY", "MEDIUM", "MEDIUM", "MEDIUM", "MEDIUM", "HARD", "HARD", "HARD"] as const;
export const DIAGNOSTIC_TARGET_DIFFICULTIES: { EASY: number; MEDIUM: number; HARD: number } = {
  EASY: 3,
  MEDIUM: 4,
  HARD: 3,
};

/** Rencana kesulitan per slot untuk sembarang ukuran (EASY≈30%, HARD≈30%). */
export function difficultyPlanForSize(size: number): ("EASY" | "MEDIUM" | "HARD")[] {
  const easy = Math.round(size * 0.3);
  const hard = Math.round(size * 0.3);
  const medium = size - easy - hard;
  const plan: ("EASY" | "MEDIUM" | "HARD")[] = [];
  for (let i = 0; i < easy; i++) plan.push("EASY");
  for (let i = 0; i < medium; i++) plan.push("MEDIUM");
  for (let i = 0; i < hard; i++) plan.push("HARD");
  return plan;
}

/**
 * Band level (PROVISIONAL — konsisten dengan jalur L1–L12:
 * L1–L4 dasar, L5–L8 menengah, L9–L12 tinggi).
 */
export const DIAGNOSTIC_PLACEMENT_BANDS = [
  { band: "DASAR", label: "Dasar", minLevel: 1, maxLevel: 4, minAccuracy: 0, maxAccuracy: 0.69 },
  { band: "MENENGAH", label: "Menengah", minLevel: 5, maxLevel: 8, minAccuracy: 0.7, maxAccuracy: 0.84 },
  { band: "TINGGI", label: "Tinggi", minLevel: 9, maxLevel: 12, minAccuracy: 0.85, maxAccuracy: 1 },
] as const;

export type DiagnosticPlacementBand = (typeof DIAGNOSTIC_PLACEMENT_BANDS)[number]["band"];

/** Threshold profil per skill (dari akurasi evidence diagnostik). */
export const DIAGNOSTIC_PROFILE_THRESHOLDS = {
  STRONG_MIN: 0.8,
  DEVELOPING_MIN: 0.6,
} as const;

/**
 * Tangga kepercayaan evidence (Part A principle):
 *   NO EVIDENCE        → INSUFFICIENT_EVIDENCE
 *   SEDIKIT EVIDENCE   → PROVISIONAL
 *   BUKTI CUKUP        → PROFILE_CONFIDENT (attempts ≥ 5 dan recent ≥ 0.7)
 */
export const DIAGNOSTIC_CONFIDENCE = {
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
  PROVISIONAL: "PROVISIONAL",
  PROFILE_CONFIDENT: "PROFILE_CONFIDENT",
} as const;
export type DiagnosticConfidence = (typeof DIAGNOSTIC_CONFIDENCE)[keyof typeof DIAGNOSTIC_CONFIDENCE];

export const DIAGNOSTIC_CONFIDENT_MIN_ATTEMPTS = 5 as const;
export const DIAGNOSTIC_CONFIDENT_MIN_RECENT_ACCURACY = 0.7 as const;