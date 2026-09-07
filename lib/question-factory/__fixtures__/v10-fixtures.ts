/**
 * Question Factory V2 — V10 Cognitive Label Golden Fixtures (P3.5C).
 *
 * 12 fixtures (G01–G12) covering:
 *   - G01–G04: PASS cases (declared level matches inferred)
 *   - G05–G07: SOFT_FAIL cases (mismatch ≥2 levels)
 *   - G08–G09: ADVISORY cases (insufficient evidence)
 *   - G10: Missing cognitiveTarget → COGNITIVE_LABEL_MISSING
 *   - G11: ISIAN_SINGKAT with short answer (R1–R3 range, ADVISORY)
 *   - G12: ISIAN_SINGKAT with long answer (R6, PASS)
 *
 * Section references:
 *   P3.5C §V10    — Cognitive label validator
 *   DNA §5         — R-mapping (R1–R6)
 *   P3.3 §5        — Cognitive scale mapping
 */

import type { CanonicalItem, D10State, ItemPurpose } from "../types";

function baseItem(overrides: {
  id: string;
  stem: string;
  options?: string[];
  correctAnswer: string;
  questionType?: string;
  cognitiveTarget?: string;
  purpose?: ItemPurpose;
  d10State?: D10State;
}): CanonicalItem {
  return {
    identity: {
      id: overrides.id,
      version: 1,
      source: "V2_PILOT",
      createdAt: new Date().toISOString(),
      createdById: "test-user-v10",
    },
    content: {
      stem: overrides.stem,
      options: overrides.options ?? [
        "Anak-anak membaca buku di perpustakaan.",
        "Buku itu dibaca oleh anak-anak.",
        "Anak-anak sedang membaca.",
        "Buku akan dibaca oleh anak-anak.",
      ],
      explanation: "Pembahasan untuk soal ini.",
    },
    responseModel: {
      questionType: (overrides.questionType ?? "PILIHAN_GANDA") as "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT",
      correctAnswer: overrides.correctAnswer,
      distractorRationale: [],
    },
    purpose: {
      purpose: overrides.purpose ?? "PRACTICE",
      d10State: overrides.d10State ?? "HYPOTHESIS",
    },
    taxonomy: {
      skill: "GRAMMAR",
      subskill: "GRAMMAR_KALIMAT_EFEKTIF",
      difficulty: "MEDIUM",
      ...(overrides.cognitiveTarget ? { cognitiveTarget: overrides.cognitiveTarget } : {}),
    },
    provenance: {
      provenance: "EXISTING_DATA",
    },
    reviewState: "NOT_REVIEWED",
  };
}

// ── G01: PASS — R1 Sebutkan (recall) ─────────────────────────────────────────

export const G01_R1_SEBUTKAN: CanonicalItem = baseItem({
  id: "V10-G01",
  stem: "Sebutkan tiga jenis kalimat berdasarkan strukturnya!",
  options: ["Kalimat simpleks, komposit, kompleks", "Kalimat aktif, pasif, transif", "Kalimat deklaratif, interrogatif, imperatif", "Kalimat efektif, tidak efektif"],
  correctAnswer: "0",
  cognitiveTarget: "MENGINGAT",
});

// ── G02: PASS — R2 Menurut teks (comprehension) ──────────────────────────────

export const G02_R2_MENURUT_TEKS: CanonicalItem = baseItem({
  id: "V10-G02",
  stem: "Menurut teks di atas, apa gagasan utama paragraf kedua?",
  options: ["Pentingnya membaca buku", "Jenis-jenis buku fiksi", "Sejarah perpustakaan Indonesia", "Cara meminjam buku"],
  correctAnswer: "0",
  cognitiveTarget: "MEMAHAMI",
});

// ── G03: PASS — R3 Jika...maka (apply) ───────────────────────────────────────

export const G03_R3_JIKA_MAKA: CanonicalItem = baseItem({
  id: "V10-G03",
  stem: "Jika subjek kalimat adalah 'mereka' dan predikat adalah 'membaca', maka bentuk kalimat pasifnya adalah?",
  options: ["Mereka membaca buku", "Buku dibaca oleh mereka", "Buku sedang dibaca", "Mereka sedang membaca buku"],
  correctAnswer: "1",
  cognitiveTarget: "MENERAPKAN",
});

// ── G04: PASS — R4 Mengapa (analysis) ────────────────────────────────────────

export const G04_R4_MENGAPA: CanonicalItem = baseItem({
  id: "V10-G04",
  stem: "Mengapa kalimat 'Buku itu dibaca oleh anak-anak' termasuk kalimat pasif?",
  options: [
    "Karena subjek melakukan aksi",
    "Karena subjek menerima aksi dan ada kata 'oleh'",
    "Karena kalimatnya efektif",
    "Karena menggunakan kata kerja aktif",
  ],
  correctAnswer: "1",
  cognitiveTarget: "MENGANALISIS",
});

// ── G05: SOFT_FAIL — R1 declared but task is R4 ──────────────────────────────

export const G05_MISMATCH_R1_VS_R4: CanonicalItem = baseItem({
  id: "V10-G05",
  stem: "Mengapa kalimat 'Buku itu dibaca oleh anak-anak' termasuk kalimat pasif?",
  options: [
    "Karena subjek melakukan aksi",
    "Karena subjek menerima aksi dan ada kata 'oleh'",
    "Karena kalimatnya efektif",
    "Karena menggunakan kata kerja aktif",
  ],
  correctAnswer: "1",
  cognitiveTarget: "MENGINGAT",  // R1 but actual task is R4
});

// ── G06: SOFT_FAIL — R2 declared but task is R5 ──────────────────────────────

export const G06_MISMATCH_R2_VS_R5: CanonicalItem = baseItem({
  id: "V10-G06",
  stem: "Setujukah Anda bahwa kalimat pasif lebih baik digunakan dalam penulisan ilmiah? Jelaskan alasan Anda!",
  options: [
    "Ya, karena kalimat pasif lebih formal",
    "Tidak, karena kalimat aktif lebih jelas",
    "Tergantung konteks penggunaan",
    "Kalimat pasif dan aktif sama baiknya",
  ],
  correctAnswer: "2",
  cognitiveTarget: "MEMAHAMI",  // R2 but actual task is R5
});

// ── G07: SOFT_FAIL — R5 declared but task is R1 ──────────────────────────────

export const G07_MISMATCH_R5_VS_R1: CanonicalItem = baseItem({
  id: "V10-G07",
  stem: "Sebutkan tiga jenis kalimat berdasarkan strukturnya!",
  options: ["Kalimat simpleks, komposit, kompleks", "Kalimat aktif, pasif, transif", "Kalimat deklaratif, interrogatif, imperatif", "Kalimat efektif, tidak efektif"],
  correctAnswer: "0",
  cognitiveTarget: "MENGEVALUASI",  // R5 but actual task is R1
});

// ── G08: ADVISORY — stem too short for inference ──────────────────────────────

export const G08_INSUFFICIENT_EVIDENCE: CanonicalItem = baseItem({
  id: "V10-G08",
  stem: "Kalimat aktif",
  options: ["Kalimat yang subjeknya melakukan aksi", "Kalimat yang subjeknya menerima aksi", "Kalimat yang menggunakan kata 'oleh'", "Kalimat yang tidak efektif"],
  correctAnswer: "0",
  cognitiveTarget: "MENGINGAT",
});

// ── G09: ADVISORY — generic stem with no task verb ────────────────────────────

export const G09_GENERIC_STEM: CanonicalItem = baseItem({
  id: "V10-G09",
  stem: "Kalimat efektif adalah kalimat yang jelas, padat, dan baik.",
  options: [
    "Kalimat aktif",
    "Kalimat pasif",
    "Kalimat efektif",
    "Kalimat tidak efektif",
  ],
  correctAnswer: "2",
  cognitiveTarget: "MEMAHAMI",
});

// ── G10: COGNITIVE_LABEL_MISSING — no cognitiveTarget ────────────────────────

export const G10_MISSING_TARGET: CanonicalItem = baseItem({
  id: "V10-G10",
  stem: "Manakah kalimat berikut yang merupakan kalimat aktif?",
  options: [
    "Buku itu dibaca oleh anak-anak.",
    "Anak-anak membaca buku itu.",
    "Buku itu akan dibaca.",
    "Buku sedang dibaca.",
  ],
  correctAnswer: "1",
  // No cognitiveTarget
});

// ── G11: ISIAN_SINGKAT with short answer (R1–R3, insufficient evidence) ─────

export const G11_ISIAN_SHORT: CanonicalItem = baseItem({
  id: "V10-G11",
  stem: "Kalimat aktif adalah kalimat yang subjeknya melakukan ...",
  options: [],
  correctAnswer: "aksi",
  questionType: "ISIAN_SINGKAT",
  cognitiveTarget: "MENGINGAT",
});

// ── G12: ISIAN_SINGKAT with long answer (R6, PASS) ──────────────────────────

export const G12_ISIAN_LONG: CanonicalItem = baseItem({
  id: "V10-G12",
  stem: "Jelaskan perbedaan antara kalimat aktif dan kalimat pasif berikut dengan memberikan masing-masing dua contoh kalimat beserta analisis subjek dan objeknya!",
  options: [],
  correctAnswer: "Kalimat aktif adalah kalimat yang subjeknya melakukan aksi terhadap objek, contoh: Anak-anak membaca buku. Kalimat pasif adalah kalimat yang subjeknya menerima aksi, contoh: Buku dibaca oleh anak-anak.",
  questionType: "ISIAN_SINGKAT",
  cognitiveTarget: "MENCIPTAKAN",
});
