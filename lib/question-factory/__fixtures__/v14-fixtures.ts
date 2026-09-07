/**
 * Question Factory V2 — V14 Publish Calibration Readiness Golden Fixtures (P3.5D-3).
 *
 * 32 golden fixtures covering:
 *   G01–G05: FULL PASS (all 7 clauses pass)
 *   G06–G12: HARD-FAIL (structural, quality, provenance)
 *   G13–G18: D10 (purpose gates, state validity)
 *   G19–G23: HUMAN REVIEW (missing, wrong state)
 *   G24–G27: MISSING RESULT (missing upstream findings)
 *   G28–G29: ADVISORY (calibration pending, mean low)
 *   G30–G32: ADVERSARIAL (conjunctive gate, fail-closed, ID-independence)
 *
 * Section references:
 *   P3.3 §13        — Publish contract (7 clauses)
 *   P3.3 §11.4      — D10 purpose gates
 *   P3.3 §12        — Review state machine
 *   P3.5D-3 §V14.4  — Golden fixtures specification
 */

import type { CanonicalItem } from "../types";

// ─── Base helper ────────────────────────────────────────────────────────────

function baseItem(overrides: {
  id: string;
  stem: string;
  options?: string[];
  correctAnswer?: string;
  qtype?: "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT";
  purpose?: "PRACTICE" | "ACHIEVEMENT" | "DIAGNOSTIC" | "ADAPTIVE_MISCONCEPTION";
  d10State?: "NOT_APPLICABLE" | "HYPOTHESIS" | "REVIEWED" | "EMPIRICALLY_SUPPORTED";
  skill?: string;
  subskill?: string;
  difficulty?: string;
  cognitiveTarget?: string;
  topic?: string;
  reviewState?: "NOT_REVIEWED" | "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "REVISION" | "RE_SUBMITTED" | "PUBLISHED";
  provenance?: "AUTHOR" | "CURRICULUM" | "EXISTING_DATA" | "AI_ASSISTED" | "HUMAN_REVIEW" | "EMPIRICAL";
  reviewedBy?: string[];
  reviewedAt?: string;
  evidenceTarget?: { skill: string; confidence: "LOW" | "MEDIUM" | "HIGH" };
  misconceptionTarget?: Array<{ option: string; misconception: string }>;
  qualityScores?: Record<string, number>;
  responseCount?: number;
  calibrationLevel?: 0 | 1 | 2 | 3;
}): CanonicalItem {
  return {
    identity: {
      id: overrides.id,
      version: 1,
      source: "V2_PILOT",
      createdAt: "2026-01-15T00:00:00.000Z",
      createdById: "test-user-v14",
    },
    content: {
      stem: overrides.stem,
      options: overrides.options ?? [
        "Jakarta adalah ibu kota Indonesia",
        "Bandung adalah ibu kota Indonesia",
        "Surabaya adalah ibu kota Indonesia",
        "Medan adalah ibu kota Indonesia",
      ],
    },
    responseModel: {
      questionType: (overrides.qtype ?? "PILIHAN_GANDA") as "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT",
      correctAnswer: overrides.correctAnswer ?? "A",
    },
    purpose: {
      purpose: (overrides.purpose ?? "PRACTICE") as "PRACTICE" | "ACHIEVEMENT" | "DIAGNOSTIC" | "ADAPTIVE_MISCONCEPTION",
      d10State: (overrides.d10State ?? "HYPOTHESIS") as "NOT_APPLICABLE" | "HYPOTHESIS" | "REVIEWED" | "EMPIRICALLY_SUPPORTED",
      evidenceTarget: overrides.evidenceTarget,
      misconceptionTarget: overrides.misconceptionTarget,
      calibrationLevel: overrides.calibrationLevel ?? 0,
    },
    taxonomy: {
      skill: overrides.skill ?? "GRAMMAR",
      subskill: overrides.subskill,
      difficulty: (overrides.difficulty ?? "MEDIUM") as "EASY" | "MEDIUM" | "HARD",
      cognitiveTarget: overrides.cognitiveTarget,
      topic: overrides.topic,
    },
    provenance: {
      provenance: (overrides.provenance ?? "HUMAN_REVIEW") as "AUTHOR" | "CURRICULUM" | "EXISTING_DATA" | "AI_ASSISTED" | "HUMAN_REVIEW" | "EMPIRICAL",
      reviewedBy: overrides.reviewedBy,
      reviewedAt: overrides.reviewedAt,
    },
    reviewState: (overrides.reviewState ?? "APPROVED") as "NOT_REVIEWED" | "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "REVISION" | "RE_SUBMITTED" | "PUBLISHED",
    ...(overrides.qualityScores ? { qualityScores: overrides.qualityScores } : {}),
    ...(overrides.responseCount !== undefined ? { responseCount: overrides.responseCount } : {}),
  } as CanonicalItem;
}

// ─── Quality score sets ─────────────────────────────────────────────────────

/** Full quality scores — all dimensions ≥ 2 (GOLD tier). */
const GOOD_SCORES: Record<string, number> = {
  D1: 3, D2: 3, D3: 3, D4: 3, D5: 3, D6: 3, D7: 3,
  D8: 3, D9: 3, D10: 3, D11: 3, D12: 3, D13: 3, D14: 3, D15: 3,
};

/** Quality scores with one HARD-FAIL dimension at 1 (below minimum). */
const ONE_LOW_HARDFAIL: Record<string, number> = {
  D1: 1, D2: 3, D3: 3, D4: 3, D5: 3, D6: 3, D7: 3,
  D8: 3, D9: 3, D10: 3, D11: 3, D12: 3, D13: 3, D14: 3, D15: 3,
};

/** Quality scores with one SCORED dimension at 1 (below minimum). */
const ONE_LOW_SCORED: Record<string, number> = {
  D1: 3, D2: 3, D3: 1, D4: 3, D5: 3, D6: 3, D7: 3,
  D8: 3, D9: 3, D10: 3, D11: 3, D12: 3, D13: 3, D14: 3, D15: 3,
};

/** Quality scores with mean = 2.0 exactly (Bronze tier, minimum passing).
 *  All dimensions = 2 → mean = 30/15 = 2.0. Advisory: no quality headroom. */
const LOW_MEAN_SCORES: Record<string, number> = {
  D1: 2, D2: 2, D3: 2, D4: 2, D5: 2, D6: 2, D7: 2,
  D8: 2, D9: 2, D10: 2, D11: 2, D12: 2, D13: 2, D14: 2, D15: 2,
};

// ─── G01–G05: FULL PASS (all 7 clauses pass) ──────────────────────────────

/** G01: PRACTICE item with full scores, human review, 50 responses → PASS all clauses. */
export const G01_PRACTICE_FULL_PASS: CanonicalItem = baseItem({
  id: "V14-G01",
  stem: "Apa nama ibu kota Indonesia?",
  options: ["Jakarta", "Bandung", "Surabaya", "Medan"],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-001"],
  reviewedAt: "2026-08-01T10:00:00.000Z",
  qualityScores: GOOD_SCORES,
  responseCount: 50,
});

/** G02: ACHIEVEMENT item, SILVER tier, 100 responses → PASS. */
export const G02_ACHIEVEMENT_SILVER: CanonicalItem = baseItem({
  id: "V14-G02",
  stem: "Manakah yang merupakan contoh energi terbarukan?",
  options: ["Matahari", "Minyak bumi", "Gas alam", "Batubara"],
  purpose: "ACHIEVEMENT",
  d10State: "HYPOTHESIS",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-002"],
  reviewedAt: "2026-08-02T10:00:00.000Z",
  qualityScores: {
    D1: 2, D2: 3, D3: 2, D4: 2, D5: 3, D6: 3, D7: 2,
    D8: 3, D9: 2, D10: 2, D11: 3, D12: 2, D13: 3, D14: 3, D15: 3,
  },
  responseCount: 100,
});

/** G03: DIAGNOSTIC item with evidenceTarget + misconceptionTarget + D10=REVIEWED, 150 responses → PASS. */
export const G03_DIAGNOSTIC_FULL: CanonicalItem = baseItem({
  id: "V14-G03",
  stem: "Pilihlah kata yang tepat untuk melengkapi kalimat: 'Guru ___ muridnya dengan penuh kesabaran.'",
  options: ["mendidik", "memarahi", "memuji", "mengabaikan"],
  purpose: "DIAGNOSTIC",
  d10State: "REVIEWED",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-003"],
  reviewedAt: "2026-08-03T10:00:00.000Z",
  evidenceTarget: { skill: "TATA_BAHASA", confidence: "HIGH" },
  misconceptionTarget: [
    { option: "memarahi", misconception: "Mengira mendidik sama dengan memarahi" },
  ],
  qualityScores: GOOD_SCORES,
  responseCount: 150,
});

/** G04: ADAPTIVE_MISCONCEPTION item with D10=EMPIRICALLY_SUPPORTED, 200 responses → PASS. */
export const G04_ADAPTIVE_EMPIRICAL: CanonicalItem = baseItem({
  id: "V14-G04",
  stem: "Tentukan makna kata 'ambivalen' dalam kalimat berikut.",
  options: [
    "Memiliki dua perasaan yang bertentangan",
    "Sangat senang",
    "Sedih mendalam",
    "Tidak peduli",
  ],
  purpose: "ADAPTIVE_MISCONCEPTION",
  d10State: "EMPIRICALLY_SUPPORTED",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-004"],
  reviewedAt: "2026-08-04T10:00:00.000Z",
  evidenceTarget: { skill: "KOSAKATA", confidence: "HIGH" },
  misconceptionTarget: [
    { option: "Sangat senang", misconception: "Salah mengartikan ambivalen sebagai euforia" },
  ],
  qualityScores: GOOD_SCORES,
  responseCount: 200,
});

/** G05: PRACTICE BenarSalah with HUMAN_REVIEW provenance (not APPROVED state), 40 responses → PASS. */
export const G05_PRACTICE_BS_HUMAN_REVIEW: CanonicalItem = baseItem({
  id: "V14-G05",
  stem: "Air bersih adalah sumber kehidupan bagi semua makhluk.",
  options: ["Benar", "Salah"],
  qtype: "BENAR_SALAH",
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "NOT_REVIEWED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-005"],
  reviewedAt: "2026-08-05T10:00:00.000Z",
  qualityScores: GOOD_SCORES,
  responseCount: 40,
});

// ─── G06–G12: HARD-FAIL ────────────────────────────────────────────────────

/** G06: Structural reject — stem is empty → CLAUSE 1 fail. */
export const G06_STRUCTURAL_EMPTY_STEM: CanonicalItem = baseItem({
  id: "V14-G06",
  stem: "",
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-006"],
  reviewedAt: "2026-08-06T10:00:00.000Z",
  qualityScores: GOOD_SCORES,
  responseCount: 50,
});

/** G07: HARD-FAIL dimension D1=1 (below minimum) → CLAUSE 2 fail. */
export const G07_HARDFAIL_D1_LOW: CanonicalItem = baseItem({
  id: "V14-G07",
  stem: "Apa yang dimaksud dengan fotosintesis?",
  options: [
    "Proses pembuatan makanan oleh tumbuhan",
    "Proses pernapasan pada manusia",
    "Proses pencernaan makanan",
    "Proses pertumbuhan akar",
  ],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-007"],
  reviewedAt: "2026-08-07T10:00:00.000Z",
  qualityScores: ONE_LOW_HARDFAIL,
  responseCount: 50,
});

/** G08: SCORED dimension D3=1 (below minimum) → CLAUSE 3 fail. */
export const G08_SCORED_D3_LOW: CanonicalItem = baseItem({
  id: "V14-G08",
  stem: "Sebutkan tiga jenis energi!",
  options: ["Kinetic, potensial, termal", "Cahaya, bunyi, magnet", "Listrik, nuklir, kimia", "Semua benar"],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-008"],
  reviewedAt: "2026-08-08T10:00:00.000Z",
  qualityScores: ONE_LOW_SCORED,
  responseCount: 50,
});

/** G09: No human review, reviewState=NOT_REVIEWED, provenance=EXISTING_DATA → CLAUSE 5 fail. */
export const G09_NO_HUMAN_REVIEW: CanonicalItem = baseItem({
  id: "V14-G09",
  stem: "Apa ibu kota Jepang?",
  options: ["Tokyo", "Osaka", "Kyoto", "Nagoya"],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "NOT_REVIEWED",
  provenance: "EXISTING_DATA",
  qualityScores: GOOD_SCORES,
  responseCount: 50,
});

/** G10: D10 state is invalid (not in enum) → CLAUSE 4 fail. */
export const G10_D10_INVALID_STATE: CanonicalItem = baseItem({
  id: "V14-G10",
  stem: "Manakah yang bukan bagian dari ekosistem?",
  options: ["Plastik", "Tumbuhan", "Hewan", "Jamur"],
  purpose: "PRACTICE",
  d10State: "INVALID_STATE" as "NOT_APPLICABLE",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-010"],
  reviewedAt: "2026-08-10T10:00:00.000Z",
  qualityScores: GOOD_SCORES,
  responseCount: 50,
});

/** G11: No quality scores at all → CLAUSE 2 & 3 pass (missing scores not checked by V14),
 *  but this tests the "missing quality scores" path. */
export const G11_NO_QUALITY_SCORES: CanonicalItem = baseItem({
  id: "V14-G11",
  stem: "Apa itu metabolisme?",
  options: [
    "Proses kimia dalam tubuh",
    "Proses fisika dalam tubuh",
    "Proses biologi dalam tubuh",
    "Proses mekanik dalam tubuh",
  ],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-011"],
  reviewedAt: "2026-08-11T10:00:00.000Z",
  responseCount: 50,
  // qualityScores intentionally omitted
});

/** G12: reviewState=REJECTED (not APPROVED) + no HUMAN_REVIEW provenance → CLAUSE 5 fail. */
export const G12_REJECTED_STATE: CanonicalItem = baseItem({
  id: "V14-G12",
  stem: "Apa fungsi mitokondria?",
  options: [
    "Pembangkit energi sel",
    "Penyimpanan informasi genetik",
    "Pencernaan protein",
    "Transportasi zat",
  ],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "REJECTED",
  provenance: "EXISTING_DATA",
  qualityScores: GOOD_SCORES,
  responseCount: 50,
});

// ─── G13–G18: D10 purpose gates ────────────────────────────────────────────

/** G13: DIAGNOSTIC purpose but D10=HYPOTHESIS (needs ≥ REVIEWED) → CLAUSE 4 & 6 fail. */
export const G13_DIAGNOSTIC_D10_LOW: CanonicalItem = baseItem({
  id: "V14-G13",
  stem: "Pilih kata yang benar: 'Semua siswa ___ ujian.'",
  options: ["telah mengerjakan", "sudah mengerjakan", "akan mengerjakan", "sedang mengerjakan"],
  purpose: "DIAGNOSTIC",
  d10State: "HYPOTHESIS",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-013"],
  reviewedAt: "2026-08-13T10:00:00.000Z",
  evidenceTarget: { skill: "TATA_BAHASA", confidence: "MEDIUM" },
  misconceptionTarget: [
    { option: "sedang mengerjakan", misconception: "Salah memilih waktu" },
  ],
  qualityScores: GOOD_SCORES,
  responseCount: 150,
});

/** G14: DIAGNOSTIC purpose but D10=NOT_APPLICABLE → CLAUSE 4 & 6 fail. */
export const G14_DIAGNOSTIC_D10_NA: CanonicalItem = baseItem({
  id: "V14-G14",
  stem: "Apa yang dimaksud dengan teks deskripsi?",
  options: [
    "Teks yang menggambarakan objek",
    "Teks yang membujuk",
    "Teks yang menceritakan",
    "Teks yang menjelaskan",
  ],
  purpose: "DIAGNOSTIC",
  d10State: "NOT_APPLICABLE",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-014"],
  reviewedAt: "2026-08-14T10:00:00.000Z",
  qualityScores: GOOD_SCORES,
  responseCount: 150,
});

/** G15: ADAPTIVE_MISCONCEPTION purpose but D10=REVIEWED (needs EMPIRICALLY_SUPPORTED) → CLAUSE 4 & 6 fail. */
export const G15_ADAPTIVE_D10_INSUFFICIENT: CanonicalItem = baseItem({
  id: "V14-G15",
  stem: "Tentukan sinonim dari kata 'gemilang'.",
  options: ["Cemerlang", "Gelap", "Suram", "Hancur"],
  purpose: "ADAPTIVE_MISCONCEPTION",
  d10State: "REVIEWED",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-015"],
  reviewedAt: "2026-08-15T10:00:00.000Z",
  evidenceTarget: { skill: "KOSAKATA", confidence: "HIGH" },
  misconceptionTarget: [
    { option: "Gelap", misconception: "Salah mengartikan gemilang" },
  ],
  qualityScores: GOOD_SCORES,
  responseCount: 200,
});

/** G16: DIAGNOSTIC purpose but missing evidenceTarget → CLAUSE 6 fail. */
export const G16_DIAGNOSTIC_NO_EVIDENCE: CanonicalItem = baseItem({
  id: "V14-G16",
  stem: "Pilihlah kalimat yang efektif.",
  options: [
    "Guru mengajar dengan sabar",
    "Guru yang mengajar dengan sabar",
    "Guru itu mengajar dengan penuh kesabaran",
    "Mengajar adalah tugas guru yang sabar",
  ],
  purpose: "DIAGNOSTIC",
  d10State: "REVIEWED",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-016"],
  reviewedAt: "2026-08-16T10:00:00.000Z",
  // evidenceTarget intentionally omitted
  misconceptionTarget: [
    { option: "Guru yang mengajar dengan sabar", misconception: "Redundan" },
  ],
  qualityScores: GOOD_SCORES,
  responseCount: 150,
});

/** G17: DIAGNOSTIC purpose but missing misconceptionTarget → CLAUSE 6 fail. */
export const G17_DIAGNOSTIC_NO_MISCONCEPTION: CanonicalItem = baseItem({
  id: "V14-G17",
  stem: "Apa antonim dari kata 'besar'?",
  options: ["Kecil", "Tinggi", "Panjang", "Lebar"],
  purpose: "DIAGNOSTIC",
  d10State: "REVIEWED",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-017"],
  reviewedAt: "2026-08-17T10:00:00.000Z",
  evidenceTarget: { skill: "KOSAKATA", confidence: "HIGH" },
  // misconceptionTarget intentionally omitted
  qualityScores: GOOD_SCORES,
  responseCount: 150,
});

/** G18: ADAPTIVE_MISCONCEPTION but missing evidenceTarget + misconceptionTarget → CLAUSE 6 fail. */
export const G18_ADAPTIVE_NO_TARGETS: CanonicalItem = baseItem({
  id: "V14-G18",
  stem: "Apa makna kiasan dari 'hati-hati'?",
  options: [
    "Berhati-hati dalam bertindak",
    "Memiliki hati yang hati-hati",
    "Hati yang berdetak kencang",
    "Hati yang tenang",
  ],
  purpose: "ADAPTIVE_MISCONCEPTION",
  d10State: "EMPIRICALLY_SUPPORTED",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-018"],
  reviewedAt: "2026-08-18T10:00:00.000Z",
  // evidenceTarget intentionally omitted
  // misconceptionTarget intentionally omitted
  qualityScores: GOOD_SCORES,
  responseCount: 200,
});

// ─── G19–G23: HUMAN REVIEW ─────────────────────────────────────────────────

/** G19: reviewState=PENDING (not APPROVED) + provenance=AI_ASSISTED → CLAUSE 5 fail. */
export const G19_PENDING_NOT_APPROVED: CanonicalItem = baseItem({
  id: "V14-G19",
  stem: "Jelaskan perbedaan antara teks argumentasi dan teks eksposisi.",
  options: [
    "Argumentasi membuktikan, eksposisi menjelaskan",
    "Keduanya sama",
    "Argumentasi menyampaikan, eksposisi membuktikan",
    "Eksposisi membuktikan, argumentasi menjelaskan",
  ],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "PENDING",
  provenance: "AI_ASSISTED",
  qualityScores: GOOD_SCORES,
  responseCount: 50,
});

/** G20: reviewState=IN_REVIEW (not APPROVED) + provenance=EXISTING_DATA → CLAUSE 5 fail. */
export const G20_IN_REVIEW_NOT_APPROVED: CanonicalItem = baseItem({
  id: "V14-G20",
  stem: "Apa itu teks persuasif?",
  options: [
    "Teks yang bertujuan membujuk",
    "Teks yang bertujuan menjelaskan",
    "Teks yang bertujuan menceritakan",
    "Teks yang bertujuan menggambarkan",
  ],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "IN_REVIEW",
  provenance: "EXISTING_DATA",
  qualityScores: GOOD_SCORES,
  responseCount: 50,
});

/** G21: reviewState=REVISION → CLAUSE 5 fail. */
export const G21_REVISION_STATE: CanonicalItem = baseItem({
  id: "V14-G21",
  stem: "Apa tujuan penulis menulis teks deskripsi?",
  options: [
    "Menggambarkan objek secara detail",
    "Membujuk pembaca",
    "Menyampaikan informasi",
    "Menghibur pembaca",
  ],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "REVISION",
  provenance: "EXISTING_DATA",
  qualityScores: GOOD_SCORES,
  responseCount: 50,
});

/** G22: provenance=AI_ASSISTED, reviewedBy=[], reviewedAt=null, reviewState=NOT_REVIEWED → CLAUSE 5 fail. */
export const G22_AI_NO_REVIEWER: CanonicalItem = baseItem({
  id: "V14-G22",
  stem: "Identifikasi jenis kalimat: 'Anak-anak bermain di taman.'",
  options: ["Kalimat berita", "Kalimat tanya", "Kalimat perintah", "Kalimat seru"],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "NOT_REVIEWED",
  provenance: "AI_ASSISTED",
  reviewedBy: [],
  qualityScores: GOOD_SCORES,
  responseCount: 50,
});

/** G23: provenance=AUTHOR, reviewState=NOT_REVIEWED → CLAUSE 5 fail. */
export const G23_AUTHOR_NO_REVIEW: CanonicalItem = baseItem({
  id: "V14-G23",
  stem: "Apa yang dimaksud dengan paragraf?",
  options: [
    "Kumpulan kalimat yang runtut",
    "Satu kalimat saja",
    "Kumpulan kata",
    "Gagasan utama",
  ],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "NOT_REVIEWED",
  provenance: "AUTHOR",
  qualityScores: GOOD_SCORES,
  responseCount: 50,
});

// ─── G24–G27: MISSING RESULT ───────────────────────────────────────────────

/** G24: Item with no quality scores, no responseCount — tests missing data path. */
export const G24_MINIMAL_DATA: CanonicalItem = baseItem({
  id: "V14-G24",
  stem: "Apa itu bahasa?",
  options: ["Sistem komunikasi", "Alat musik", "Jenis makanan", "Olahraga"],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-024"],
  reviewedAt: "2026-08-24T10:00:00.000Z",
  // qualityScores intentionally omitted
  // responseCount intentionally omitted
});

/** G25: PRACTICE with D10=NOT_APPLICABLE — should FAIL clause 4 (PRACTICE min is HYPOTHESIS, NOT_APPLICABLE < HYPOTHESIS). */
export const G25_PRACTICE_D10_NA: CanonicalItem = baseItem({
  id: "V14-G25",
  stem: "Tentukan subjek dalam kalimat: 'Guru mengajar dengan sabar.'",
  options: ["Guru", "Mengajar", "Sabar", "Dengan"],
  purpose: "PRACTICE",
  d10State: "NOT_APPLICABLE",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-025"],
  reviewedAt: "2026-08-25T10:00:00.000Z",
  qualityScores: GOOD_SCORES,
  responseCount: 50,
});

/** G26: ACHIEVEMENT with D10=NOT_APPLICABLE — should fail clause 4 (ACHIEVEMENT requires ≥ HYPOTHESIS). */
export const G26_ACHIEVEMENT_D10_NA: CanonicalItem = baseItem({
  id: "V14-G26",
  stem: "Apa fungsi kata kerja dalam kalimat?",
  options: [
    "Menunjukkan perbuatan",
    "Menunjukkan sifat",
    "Menunjukkan jumlah",
    "Menunjukkan tempat",
  ],
  purpose: "ACHIEVEMENT",
  d10State: "NOT_APPLICABLE",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-026"],
  reviewedAt: "2026-08-26T10:00:00.000Z",
  qualityScores: GOOD_SCORES,
  responseCount: 50,
});

/** G27: PRACTICE with zero responses — calibration advisory. */
export const G27_PRACTICE_ZERO_RESPONSES: CanonicalItem = baseItem({
  id: "V14-G27",
  stem: "Apa itu kalimat aktif?",
  options: [
    "Kalimat yang subjeknya melakukan kerja",
    "Kalimat yang subjeknya dikenai kerja",
    "Kalimat yang tidak punya subjek",
    "Kalimat yang punya dua objek",
  ],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-027"],
  reviewedAt: "2026-08-27T10:00:00.000Z",
  qualityScores: GOOD_SCORES,
  responseCount: 0,
});

// ─── G28–G29: ADVISORY ─────────────────────────────────────────────────────

/** G28: PRACTICE with 25 responses (< 30) — calibration advisory. */
export const G28_CALIBRATION_PENDING: CanonicalItem = baseItem({
  id: "V14-G28",
  stem: "Apa perbedaan antara sinonim dan antonim?",
  options: [
    "Sinonim sama makna, antonim berlawanan",
    "Sinonim berlawanan, antonim sama makna",
    "Keduanya sama",
    "Tidak ada perbedaan",
  ],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-028"],
  reviewedAt: "2026-08-28T10:00:00.000Z",
  qualityScores: GOOD_SCORES,
  responseCount: 25,
});

/** G29: PRACTICE with mean = 2.0 exactly (Bronze tier) — advisory only (no headroom above Bronze), clause 7 passes. */
export const G29_LOW_MEAN_ADVISORY: CanonicalItem = baseItem({
  id: "V14-G29",
  stem: "Sebutkan jenis-jenis teks!",
  options: ["Deskripsi, argumentasi, eksposisi", "Cerita, puisi, drama", "Berita, laporan, resensi", "Semua benar"],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-029"],
  reviewedAt: "2026-08-29T10:00:00.000Z",
  qualityScores: LOW_MEAN_SCORES,
  responseCount: 50,
});

// ─── G30–G32: ADVERSARIAL ──────────────────────────────────────────────────

/** G30: FAIL-CLOSED — item with structural reject + good scores + human review.
 *  V14 must still fail (structural fail takes precedence). */
export const G30_FAIL_CLOSED_STRUCTURAL: CanonicalItem = baseItem({
  id: "V14-G30",
  stem: "   ", // Empty/whitespace stem → structural reject
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-030"],
  reviewedAt: "2026-08-30T10:00:00.000Z",
  qualityScores: GOOD_SCORES,
  responseCount: 50,
});

/** G31: CONJUNCTIVE GATE — two SCORED dimensions at 1 (D3=1, D9=1), mean still ≥ 2.0.
 *  V14 must fail clause 3 (conjunctive, no arithmetic override). */
export const G31_CONJUNCTIVE_TWO_LOW: CanonicalItem = baseItem({
  id: "V14-G31",
  stem: "Analisis struktur kalimat dalam paragraf berikut: Pendidikan adalah kunci utama kemajuan bangsa. Tanpa pendidikan yang berkualitas, sebuah negara akan sulit bersaing di tingkat global.",
  options: [
    "Subjek: pendidikan, predikat: adalah, objek: kunci",
    "Subjek: bangsa, predikat: maju, objek: tanpa",
    "Subjek: negara, predikat: bersaing, objek: global",
    "Subjek: pendidikan, predikat: sulit, objek: bersaing",
  ],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-031"],
  reviewedAt: "2026-08-31T10:00:00.000Z",
  qualityScores: {
    D1: 3, D2: 3, D3: 1, D4: 3, D5: 3, D6: 3, D7: 3,
    D8: 3, D9: 1, D10: 3, D11: 3, D12: 3, D13: 3, D14: 3, D15: 3,
  },
  responseCount: 50,
});

/** G32: ID-INDEPENDENCE — item with different ID but same content as G01.
 *  V14 must not special-case IDs; evaluate purely on metadata. */
export const G32_ID_INDEPENDENT: CanonicalItem = baseItem({
  id: "V14-UNIQUE-RANDOM-ID-12345",
  stem: "Apa nama ibu kota Indonesia?",
  options: ["Jakarta", "Bandung", "Surabaya", "Medan"],
  purpose: "PRACTICE",
  d10State: "HYPOTHESIS",
  reviewState: "APPROVED",
  provenance: "HUMAN_REVIEW",
  reviewedBy: ["reviewer-032"],
  reviewedAt: "2026-09-01T10:00:00.000Z",
  qualityScores: GOOD_SCORES,
  responseCount: 50,
});

// ─── Aggregate ──────────────────────────────────────────────────────────────

export const ALL_V14_FIXTURES: readonly CanonicalItem[] = [
  G01_PRACTICE_FULL_PASS,
  G02_ACHIEVEMENT_SILVER,
  G03_DIAGNOSTIC_FULL,
  G04_ADAPTIVE_EMPIRICAL,
  G05_PRACTICE_BS_HUMAN_REVIEW,
  G06_STRUCTURAL_EMPTY_STEM,
  G07_HARDFAIL_D1_LOW,
  G08_SCORED_D3_LOW,
  G09_NO_HUMAN_REVIEW,
  G10_D10_INVALID_STATE,
  G11_NO_QUALITY_SCORES,
  G12_REJECTED_STATE,
  G13_DIAGNOSTIC_D10_LOW,
  G14_DIAGNOSTIC_D10_NA,
  G15_ADAPTIVE_D10_INSUFFICIENT,
  G16_DIAGNOSTIC_NO_EVIDENCE,
  G17_DIAGNOSTIC_NO_MISCONCEPTION,
  G18_ADAPTIVE_NO_TARGETS,
  G19_PENDING_NOT_APPROVED,
  G20_IN_REVIEW_NOT_APPROVED,
  G21_REVISION_STATE,
  G22_AI_NO_REVIEWER,
  G23_AUTHOR_NO_REVIEW,
  G24_MINIMAL_DATA,
  G25_PRACTICE_D10_NA,
  G26_ACHIEVEMENT_D10_NA,
  G27_PRACTICE_ZERO_RESPONSES,
  G28_CALIBRATION_PENDING,
  G29_LOW_MEAN_ADVISORY,
  G30_FAIL_CLOSED_STRUCTURAL,
  G31_CONJUNCTIVE_TWO_LOW,
  G32_ID_INDEPENDENT,
];
