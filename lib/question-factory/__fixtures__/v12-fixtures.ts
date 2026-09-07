/**
 * Question Factory V2 — V12 Duplicate/Similarity Golden Fixtures (P3.5D-1).
 *
 * 22 fixtures (G01–G22) covering:
 *   - G01–G02: PASS — legitimate distinct items
 *   - G03: EXACT — full content identical
 *   - G04–G05: NORMALIZED — formatting-only differences
 *   - G06–G07: NEAR_TEXT — high text similarity
 *   - G08–G09: STRUCTURAL — same architecture (requires full context)
 *   - G10–G11: CROSS_THEME — same construct, different topic
 *   - G12–G15: OPTION — duplicate options within item
 *   - G16: OPTION — short options (REVIEW)
 *   - G17: SKIP — BENAR_SALAH
 *   - G18: SKIP — ISIAN_SINGKAT
 *   - G19: PASS — entity divergence (dates differ → not duplicate)
 *   - G20: PASS — similar but distinct items
 *   - G21: OPTION — multiple duplicate option pairs
 *   - G22: PASS — same skill, different cognitive target
 *
 * Section references:
 *   P3.5D-1 §6–§12   — V12 layer specifications
 *   P3.5D-1 §22       — False positive audit cases
 *   P3.3 §17          — Duplicate contract
 */

import type { CanonicalItem } from "../types";

// ─── Base Helper ─────────────────────────────────────────────────────────────

function baseItem(overrides: {
  id: string;
  stem: string;
  options: string[];
  correctAnswer: string;
  questionType?: string;
  skill?: string;
  subskill?: string;
  cognitiveTarget?: string;
  topic?: string;
  difficulty?: string;
}): CanonicalItem {
  return {
    identity: {
      id: overrides.id,
      version: 1,
      source: "V2_PILOT",
      createdAt: "2026-01-15T00:00:00.000Z",
      createdById: "test-user-v12",
    },
    content: {
      stem: overrides.stem,
      options: overrides.options,
      explanation: "Pembahasan untuk soal ini.",
    },
    responseModel: {
      questionType: (overrides.questionType ?? "PILIHAN_GANDA") as "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT",
      correctAnswer: overrides.correctAnswer,
      distractorRationale: [],
    },
    purpose: {
      purpose: "PRACTICE",
      d10State: "HYPOTHESIS",
    },
    taxonomy: {
      skill: overrides.skill ?? "GRAMMAR",
      subskill: overrides.subskill ?? "GRAMMAR_KALIMAT_EFEKTIF",
      difficulty: (overrides.difficulty ?? "MEDIUM") as "EASY" | "MEDIUM" | "HARD",
      cognitiveTarget: overrides.cognitiveTarget ?? "MEMAHAMI",
      topic: overrides.topic,
    },
    provenance: {
      provenance: "EXISTING_DATA",
    },
    reviewState: "NOT_REVIEWED",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// G01–G02: PASS — legitimate distinct items (no duplicate issues)
// ═══════════════════════════════════════════════════════════════════════════════

/** G01: PASS — Distinct grammar items with different stems and answers. */
export const G01_PASS_DISTINCT_ITEMS: CanonicalItem = baseItem({
  id: "V12-G01",
  stem: "Manakah kalimat berikut yang menggunakan kata baku?",
  options: [
    "Bapak Guru memberikan tugas kepada siswa.",
    "Bapak Guru ngasih tugas ke murid-muridnya.",
    "Guru itu kasih PR sama anak didiknya.",
    "Pak Guru bagi tugas buat para siswanya.",
  ],
  correctAnswer: "0",
  topic: "Kata Baku",
});

/** G02: PASS — Distinct reading items with different content. */
export const G02_PASS_DISTINCT_CONTENT: CanonicalItem = baseItem({
  id: "V12-G02",
  stem: "Bacaan berikut membahas tentang pelestarian lingkungan. Simpulan yang tepat dari bacaan tersebut adalah...",
  options: [
    "Pelestarian lingkungan memerlukan kerja sama semua pihak.",
    "Lingkungan hanya bisa dilestarikan oleh pemerintah.",
    "Pelestarian lingkungan adalah tanggung jawab individu saja.",
    "Lingkungan akan pulih dengan sendirinya tanpa upaya manusia.",
  ],
  correctAnswer: "0",
  skill: "READING",
  subskill: "READING_IDE_POKOK",
  cognitiveTarget: "MENGANALISIS",
  topic: "Paragraf",
});

// ═══════════════════════════════════════════════════════════════════════════════
// G03: EXACT — full content identical
// ═══════════════════════════════════════════════════════════════════════════════

/** G03: EXACT — Stem is identical to known stem at position 0. */
export const G03_EXACT_DUPLICATE_STEM: CanonicalItem = baseItem({
  id: "V12-G03",
  stem: "Manakah kalimat berikut yang menggunakan kata baku?",
  options: [
    "Bapak Guru memberikan tugas kepada siswa.",
    "Bapak Guru ngasih tugas ke murid-muridnya.",
    "Guru itu kasih PR sama anak didiknya.",
    "Pak Guru bagi tugas buat para siswanya.",
  ],
  correctAnswer: "0",
  topic: "Kata Baku",
});

// ═══════════════════════════════════════════════════════════════════════════════
// G04–G05: NORMALIZED — formatting-only differences
// ═══════════════════════════════════════════════════════════════════════════════

/** G04: NORMALIZED — Capitalization + punctuation difference. */
export const G04_NORMALIZED_CAPS: CanonicalItem = baseItem({
  id: "V12-G04",
  stem: "Manakah kalimat berikut yang menggunakan kata BAKU?",
  options: [
    "Bapak Guru memberikan tugas kepada siswa.",
    "Bapak Guru ngasih tugas ke murid-muridnya.",
    "Guru itu kasih PR sama anak didiknya.",
    "Pak Guru bagi tugas buat para siswanya.",
  ],
  correctAnswer: "0",
  topic: "Kata Baku",
});

/** G05: NORMALIZED — Extra whitespace + trailing punctuation. */
export const G05_NORMALIZED_WHITESPACE: CanonicalItem = baseItem({
  id: "V12-G05",
  stem: "Manakah  kalimat  berikut  yang  menggunakan  kata  baku?",
  options: [
    "Bapak Guru memberikan tugas kepada siswa.",
    "Bapak Guru ngasih tugas ke murid-muridnya.",
    "Guru itu kasih PR sama anak didiknya.",
    "Pak Guru bagi tugas buat para siswanya.",
  ],
  correctAnswer: "0",
  topic: "Kata Baku",
});

// ═══════════════════════════════════════════════════════════════════════════════
// G06–G07: NEAR_TEXT — high text similarity
// ═══════════════════════════════════════════════════════════════════════════════

/** G06: NEAR_TEXT — Very similar stem with minor wording change (FAIL). */
export const G06_NEAR_TEXT_SIMILAR_STEM: CanonicalItem = baseItem({
  id: "V12-G06",
  stem: "Manakah diantara kalimat berikut yang memakai kata baku?",
  options: [
    "Bapak Guru memberikan tugas kepada siswa.",
    "Bapak Guru ngasih tugas ke murid-muridnya.",
    "Guru itu kasih PR sama anak didiknya.",
    "Pak Guru bagi tugas buat para siswanya.",
  ],
  correctAnswer: "0",
  topic: "Kata Baku",
});

/** G07: NEAR_TEXT — Almost identical options, different stem (REVIEW). */
export const G07_NEAR_TEXT_SIMILAR_OPTS: CanonicalItem = baseItem({
  id: "V12-G07",
  stem: "Pilihlah kalimat yang menggunakan ejaan yang benar.",
  options: [
    "Bapak Guru memberikan tugas kepada siswa-siswinya.",
    "Bapak Guru memberi tugas kepada murid-muridnya.",
    "Guru itu kasih PR sama anak didiknya.",
    "Pak Guru bagi tugas buat para siswanya.",
  ],
  correctAnswer: "0",
  topic: "Ejaan",
});

// ═══════════════════════════════════════════════════════════════════════════════
// G08–G09: STRUCTURAL — same architecture (requires full item context)
// ═══════════════════════════════════════════════════════════════════════════════

/** G08: STRUCTURAL — Same skill/type/cognitive but different topic (limited without full context). */
export const G08_STRUCTURAL_SAME_ARCH: CanonicalItem = baseItem({
  id: "V12-G08",
  stem: "Kalimat manakah yang mengandung imbuhan yang tepat?",
  options: [
    "Dia telah menyelesaikan tugasnya dengan baik.",
    "Dia udah nyelesaiin tugasnya dengan baek.",
    "Dia sudah menyelesaikan PR-nya dengan baik sekali.",
    "Dia telah selesai mengerjakan tugasnya dengan baik.",
  ],
  correctAnswer: "0",
  skill: "GRAMMAR",
  subskill: "GRAMMAR_IMBUHAN",
  cognitiveTarget: "MENERAPKAN",
  topic: "Imbuhan",
});

/** G09: STRUCTURAL — Different cognitive target (not duplicate even with same skill). */
export const G09_STRUCTURAL_DIFF_COGNITIVE: CanonicalItem = baseItem({
  id: "V12-G09",
  stem: "Kalimat manakah yang mengandung imbuhan yang tepat?",
  options: [
    "Dia telah menyelesaikan tugasnya dengan baik.",
    "Dia udah nyelesaiin tugasnya dengan baek.",
    "Dia sudah menyelesaikan PR-nya dengan baik sekali.",
    "Dia telah selesai mengerjakan tugasnya dengan baik.",
  ],
  correctAnswer: "0",
  skill: "GRAMMAR",
  subskill: "GRAMMAR_IMBUHAN",
  cognitiveTarget: "MENGINGAT", // Different cognitive → not structural duplicate
  topic: "Imbuhan",
});

// ═══════════════════════════════════════════════════════════════════════════════
// G10–G11: CROSS_THEME — same construct, different topic
// ═══════════════════════════════════════════════════════════════════════════════

/** G10: CROSS_THEME — Same stem pattern, different topic (limited without full context). */
export const G10_CROSS_THEME_DIFF_TOPIC: CanonicalItem = baseItem({
  id: "V12-G10",
  stem: "Kalimat manakah yang mengandung imbuhan yang tepat?",
  options: [
    "Dia telah menyelesaikan tugasnya dengan baik.",
    "Dia udah nyelesaiin tugasnya dengan baek.",
    "Dia sudah menyelesaikan PR-nya dengan baik sekali.",
    "Dia telah selesai mengerjakan tugasnya dengan baik.",
  ],
  correctAnswer: "0",
  skill: "GRAMMAR",
  subskill: "GRAMMAR_IMBUHAN",
  cognitiveTarget: "MENERAPKAN",
  topic: "Tanda Baca", // Different topic
});

/** G11: PASS — Different answer position (not duplicate). */
export const G11_PASS_DIFF_ANSWER: CanonicalItem = baseItem({
  id: "V12-G11",
  stem: "Kalimat manakah yang mengandung imbuhan yang tepat?",
  options: [
    "Dia telah menyelesaikan tugasnya dengan baik.",
    "Dia udah nyelesaiin tugasnya dengan baek.",
    "Dia sudah menyelesaikan PR-nya dengan baik sekali.",
    "Dia telah selesai mengerjakan tugasnya dengan baik.",
  ],
  correctAnswer: "2", // Different answer → not a structural duplicate
  skill: "GRAMMAR",
  subskill: "GRAMMAR_IMBUHAN",
  cognitiveTarget: "MENERAPKAN",
  topic: "Imbuhan",
});

// ═══════════════════════════════════════════════════════════════════════════════
// G12–G15: OPTION — duplicate options within item
// ═══════════════════════════════════════════════════════════════════════════════

/** G12: OPTION — Exact duplicate options (A = D). */
export const G12_OPTION_EXACT_DUP: CanonicalItem = baseItem({
  id: "V12-G12",
  stem: "Manakah kalimat berikut yang merupakan kalimat aktif?",
  options: [
    "Buku itu dibaca oleh anak-anak.",
    "Anak-anak membaca buku itu.",
    "Buku itu akan segera dibaca.",
    "Buku itu dibaca oleh anak-anak.",
  ],
  correctAnswer: "1",
});

/** G13: OPTION — Near-duplicate options (Levenshtein ≥ 0.90). */
export const G13_OPTION_NEAR_DUP: CanonicalItem = baseItem({
  id: "V12-G13",
  stem: "Manakah kalimat berikut yang merupakan kalimat aktif?",
  options: [
    "Buku itu dibaca oleh anak-anak di perpustakaan sekolah dengan sangat baik.",
    "Anak-anak membaca buku itu.",
    "Buku itu akan segera dibaca.",
    "Buku itu dibaca oleh anak-anak di perpustakaan sekolah dengan sangat cermat.",
  ],
  correctAnswer: "1",
});

/** G14: OPTION — Near-duplicate options (Jaccard ≥ 0.85). */
export const G14_OPTION_JACCARD_DUP: CanonicalItem = baseItem({
  id: "V12-G14",
  stem: "Manakah kalimat berikut yang merupakan kalimat aktif?",
  options: [
    "Buku itu dibaca oleh anak-anak di perpustakaan sekolah dengan baik.",
    "Anak-anak membaca buku itu.",
    "Buku itu akan segera dibaca.",
    "Buku itu dibaca oleh anak-anak di perpustakaan sekolah dengan cermat.",
  ],
  correctAnswer: "1",
});

/** G15: OPTION — Formatting variant options (same after normalization). */
export const G15_OPTION_FORMAT_VARIANT: CanonicalItem = baseItem({
  id: "V12-G15",
  stem: "Manakah kalimat berikut yang merupakan kalimat aktif?",
  options: [
    "Buku itu dibaca oleh anak-anak.",
    "Anak-anak membaca buku itu.",
    "Buku itu akan segera dibaca.",
    "buku itu dibaca oleh anak-anak.",
  ],
  correctAnswer: "1",
});

// ═══════════════════════════════════════════════════════════════════════════════
// G16: OPTION — short options (REVIEW, not FAIL)
// ═══════════════════════════════════════════════════════════════════════════════

/** G16: OPTION — Short options that are similar (REVIEW, not FAIL). */
export const G16_OPTION_SHORT_REVIEW: CanonicalItem = baseItem({
  id: "V12-G16",
  stem: "Berapakah hasil dari 2 + 3?",
  options: [
    "4",
    "5",
    "6",
    "7",
  ],
  correctAnswer: "1",
  skill: "GRAMMAR",
  subskill: "GRAMMAR_KALIMAT_EFEKTIF",
  cognitiveTarget: "MENGINGAT",
});

// ═══════════════════════════════════════════════════════════════════════════════
// G17: SKIP — BENAR_SALAH (only Benar/Salah — always legitimate)
// ═══════════════════════════════════════════════════════════════════════════════

/** G17: SKIP — BENAR_SALAH question type. */
export const G17_SKIP_BENAR_SALAH: CanonicalItem = baseItem({
  id: "V12-G17",
  stem: "Kalimat 'Buku itu dibaca oleh anak-anak' merupakan kalimat pasif.",
  options: ["Benar", "Salah"],
  correctAnswer: "0",
  questionType: "BENAR_SALAH",
});

// ═══════════════════════════════════════════════════════════════════════════════
// G18: SKIP — ISIAN_SINGKAT (no options)
// ═══════════════════════════════════════════════════════════════════════════════

/** G18: SKIP — ISIAN_SINGKAT question type. */
export const G18_SKIP_ISIAN_SINGKAT: CanonicalItem = baseItem({
  id: "V12-G18",
  stem: "Tuliskan sinonim dari kata 'indah'!",
  options: [],
  correctAnswer: "cantik",
  questionType: "ISIAN_SINGKAT",
});

// ═══════════════════════════════════════════════════════════════════════════════
// G19: PASS — entity divergence (dates differ → not duplicate)
// ═══════════════════════════════════════════════════════════════════════════════

/** G19: PASS — Same stem pattern but different dates/numbers. */
export const G19_PASS_ENTITY_DIVERGENCE: CanonicalItem = baseItem({
  id: "V12-G19",
  stem: "Kapan proklamasi kemerdekaan Indonesia? Tanggal 17 Agustus 1945.",
  options: [
    "17 Agustus 1945",
    "17 Agustus 1946",
    "17 Agustus 1947",
    "17 Agustus 1948",
  ],
  correctAnswer: "0",
  skill: "READING",
  subskill: "READING_INFORMASI_TERSURAT",
  cognitiveTarget: "MENGINGAT",
  topic: "Teks Berita",
});

// ═══════════════════════════════════════════════════════════════════════════════
// G20: PASS — similar but distinct items
// ═══════════════════════════════════════════════════════════════════════════════

/** G20: PASS — Items that share topic but have genuinely different content. */
export const G20_PASS_SIMILAR_BUT_DISTINCT: CanonicalItem = baseItem({
  id: "V12-G20",
  stem: "Apa yang dimaksud dengan kalimat aktif?",
  options: [
    "Kalimat yang subjeknya melakukan pekerjaan.",
    "Kalimat yang subjeknya menerima pekerjaan.",
    "Kalimat yang tidak memiliki subjek.",
    "Kalimat yang memiliki dua objek.",
  ],
  correctAnswer: "0",
  topic: "Kalimat Efektif",
});

// ═══════════════════════════════════════════════════════════════════════════════
// G21: OPTION — multiple duplicate option pairs
// ═══════════════════════════════════════════════════════════════════════════════

/** G21: OPTION — Two pairs of duplicate options. */
export const G21_OPTION_MULTIPLE_PAIRS: CanonicalItem = baseItem({
  id: "V12-G21",
  stem: "Manakah kalimat berikut yang merupakan kalimat aktif?",
  options: [
    "Buku itu dibaca oleh anak-anak.",
    "Buku itu dibaca oleh anak-anak.",
    "Anak-anak membaca buku itu.",
    "Anak-anak membaca buku itu.",
  ],
  correctAnswer: "2",
});

// ═══════════════════════════════════════════════════════════════════════════════
// G22: PASS — same skill, different cognitive target (not duplicate)
// ═══════════════════════════════════════════════════════════════════════════════

/** G22: PASS — Same skill but genuinely different questions. */
export const G22_PASS_DIFF_COGNITIVE_TARGET: CanonicalItem = baseItem({
  id: "V12-G22",
  stem: "Fungsi paragraf pengantar dalam teks editorial adalah...",
  options: [
    "Menarik perhatian pembaca terhadap topik yang dibahas.",
    "Menyimpulkan seluruh argumen penulis.",
    "Menyajikan data statistik pendukung.",
    "Menjawab pertanyaan pembaca.",
  ],
  correctAnswer: "0",
  skill: "READING",
  subskill: "READING_INFERENSI",
  cognitiveTarget: "MEMAHAMI",
  topic: "Teks Editorial",
});
