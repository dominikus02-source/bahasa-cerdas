/**
 * Question Factory V2 — V11 Distractor Quality Golden Fixtures (P3.5C).
 *
 * 14 fixtures (G01–G14) covering:
 *   - G01–G03: PASS cases (quality distractors)
 *   - G04–G05: SOFT_FAIL near-duplicate distractors
 *   - G06: SOFT_FAIL near-answer distractor
 *   - G07: SOFT_FAIL length outlier
 *   - G08: SOFT_FAIL parallelism break
 *   - G09: SOFT_FAIL subset of answer
 *   - G10–G11: Skip (BENAR_SALAH, ISIAN_SINGKAT)
 *   - G12: Multiple issues (near-dup + length outlier)
 *   - G13: PASS with varying lengths (testing that length variation is OK)
 *   - G14: PASS with semantically diverse distractors
 *
 * Section references:
 *   P3.5C §V11    — Distractor quality validator
 *   Quality §7     — No meaningless distractors
 *   Quality §9     — Single-best-answer discipline
 */

import type { CanonicalItem, D10State, ItemPurpose } from "../types";

function baseItem(overrides: {
  id: string;
  stem: string;
  options: string[];
  correctAnswer: string;
  questionType?: string;
  purpose?: ItemPurpose;
  d10State?: D10State;
}): CanonicalItem {
  return {
    identity: {
      id: overrides.id,
      version: 1,
      source: "V2_PILOT",
      createdAt: new Date().toISOString(),
      createdById: "test-user-v11",
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
      purpose: overrides.purpose ?? "PRACTICE",
      d10State: overrides.d10State ?? "HYPOTHESIS",
    },
    taxonomy: {
      skill: "GRAMMAR",
      subskill: "GRAMMAR_KALIMAT_EFEKTIF",
      difficulty: "MEDIUM",
      cognitiveTarget: "MEMAHAMI",
    },
    provenance: {
      provenance: "EXISTING_DATA",
    },
    reviewState: "NOT_REVIEWED",
  };
}

// ── G01: PASS — Diverse, plausible distractors ───────────────────────────────

export const G01_PASS_DIVERSE: CanonicalItem = baseItem({
  id: "V11-G01",
  stem: "Manakah kalimat berikut yang merupakan kalimat aktif?",
  options: [
    "Buku itu dibaca oleh anak-anak.",
    "Anak-anak membaca buku itu.",
    "Buku itu akan segera dibaca.",
    "Buku sedang dibaca di perpustakaan.",
  ],
  correctAnswer: "1",
});

// ── G02: PASS — Parallel structure, different content ────────────────────────

export const G02_PASS_PARALLEL: CanonicalItem = baseItem({
  id: "V11-G02",
  stem: "Apa yang dimaksud dengan kalimat efektif?",
  options: [
    "Kalimat yang menggunakan kata baku",
    "Kalimat yang jelas dan padat",
    "Kalimat yang panjang dan lengkap",
    "Kalimat yang menggunakan bahasa daerah",
  ],
  correctAnswer: "1",
});

// ── G03: PASS — Short stem with diverse options ──────────────────────────────

export const G03_PASS_SHORT: CanonicalItem = baseItem({
  id: "V11-G03",
  stem: "Bahasa Indonesia adalah bahasa ...",
  options: [
    "resmi negara Indonesia",
    "sehari-hari masyarakat Jawa",
    "internasional yang digunakan PBB",
    "program komputer yang umum",
  ],
  correctAnswer: "0",
});

// ── G04: SOFT_FAIL — Near-duplicate distractors ──────────────────────────────

export const G04_NEAR_DUPLICATE: CanonicalItem = baseItem({
  id: "V11-G04",
  stem: "Manakah yang merupakan kalimat pasif?",
  options: [
    "Buku dibaca oleh siswa",
    "Buku sedang dibaca oleh siswa",
    "Siswa membaca buku",
    "Buku akan dibaca oleh siswa",
  ],
  correctAnswer: "2",
});

// ── G05: SOFT_FAIL — Paraphrase duplicate distractors ────────────────────────

export const G05_PARAPHRASE_DUP: CanonicalItem = baseItem({
  id: "V11-G05",
  stem: "Apa ciri kalimat efektif?",
  options: [
    "Jelas dan padat",
    "Jelas serta padat",
    "Tidak bertele-tele",
    "Menggunakan kata baku",
  ],
  correctAnswer: "3",
});

// ── G06: SOFT_FAIL — Distractor near correct answer ──────────────────────────

export const G06_NEAR_ANSWER: CanonicalItem = baseItem({
  id: "V11-G06",
  stem: "Kalimat aktif adalah kalimat yang subjeknya melakukan ...",
  options: [
    "buku itu dibaca oleh anak",
    "buku ini dibaca oleh anak",
    "belajar dengan tekun",
    "menulis di buku tulis",
  ],
  correctAnswer: "0",
});

// ── G07: SOFT_FAIL — Length outlier ───────────────────────────────────────────

export const G07_LENGTH_OUTLIER: CanonicalItem = baseItem({
  id: "V11-G07",
  stem: "Manakah yang bukan kalimat efektif?",
  options: [
    "Kalimat tidak efektif",
    "Kalimat berbelit-belit",
    "Kalimat tidak jelas",
    "Kalimat yang panjang sekali dan bertele-tele dan menggunakan banyak kata yang tidak perlu dan berbelit-belit sehingga sulit dipahami oleh pembaca",
  ],
  correctAnswer: "0",
});

// ── G08: SOFT_FAIL — Parallelism break ───────────────────────────────────────

export const G08_PARALLELISM_BREAK: CanonicalItem = baseItem({
  id: "V11-G08",
  stem: "Jenis kalimat berdasarkan tujuannya adalah?",
  options: [
    "Kalimat berita",
    "Kalimat tanya",
    "Efektif",
    "Kalimat perintah",
  ],
  correctAnswer: "0",
});

// ── G09: SOFT_FAIL — Distractor is subset of answer ──────────────────────────

export const G09_SUBSET_OF_ANSWER: CanonicalItem = baseItem({
  id: "V11-G09",
  stem: "Apa itu kalimat aktif?",
  options: [
    "Kalimat yang subjeknya melakukan aksi terhadap objek secara langsung",
    "subjeknya melakukan aksi",
    "Kalimat yang jelas",
    "Kalimat yang efektif",
  ],
  correctAnswer: "0",
});

// ── G10: SKIP — BENAR_SALAH type ─────────────────────────────────────────────

export const G10_SKIP_BENAR_SALAH: CanonicalItem = baseItem({
  id: "V11-G10",
  stem: "Kalimat 'Anak-anak membaca buku' adalah kalimat aktif.",
  options: ["Benar", "Salah"],
  correctAnswer: "0",
  questionType: "BENAR_SALAH",
});

// ── G11: SKIP — ISIAN_SINGKAT type ───────────────────────────────────────────

export const G11_SKIP_ISIAN: CanonicalItem = baseItem({
  id: "V11-G11",
  stem: "Kalimat yang subjeknya melakukan aksi disebut kalimat ...",
  options: [],
  correctAnswer: "aktif",
  questionType: "ISIAN_SINGKAT",
});

// ── G12: Multiple issues — near-duplicate + length outlier ────────────────────

export const G12_MULTIPLE_ISSUES: CanonicalItem = baseItem({
  id: "V11-G12",
  stem: "Apa yang membuat kalimat tidak efektif?",
  options: [
    "Tidak ada masalah",
    "Penggunaan kata berulang secara berlebihan",
    "Penggunaan kata berulang secara berlebihan sekali",
    "Kalimat yang panjang sekali dan bertele-tele dan menggunakan banyak kata yang tidak perlu sehingga sulit dipahami oleh pembaca karena terlalu berbelit",
  ],
  correctAnswer: "0",
});

// ── G13: PASS — Varying lengths (not an outlier) ─────────────────────────────

export const G13_PASS_VARYING_LENGTHS: CanonicalItem = baseItem({
  id: "V11-G13",
  stem: "Bahasa Indonesia resmi sejak...",
  options: [
    "17 Agustus 1945",
    "28 Oktober 1928",
    "1 Juni 1945",
    "1 Mei 1964",
  ],
  correctAnswer: "0",
});

// ── G14: PASS — Semantically diverse distractors ─────────────────────────────

export const G14_PASS_SEMANTICALLY_DIVERSE: CanonicalItem = baseItem({
  id: "V11-G14",
  stem: "Apa tujuan penggunaan kalimat efektif dalam komunikasi?",
  options: [
    "Agar pendengar atau pembaca mudah memahami pesan yang disampaikan",
    "Agar kalimat terdengar lebih panjang dan rumit",
    "Agar pengguna terlihat pandai",
    "Agar sesuai dengan aturan tata bahasa Jepang",
  ],
  correctAnswer: "0",
});
