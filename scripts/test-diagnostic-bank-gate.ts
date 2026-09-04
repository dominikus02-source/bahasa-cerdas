#!/usr/bin/env npx tsx
/**
 * P0.5 CONTAINMENT — CONTRACT TEST: Diagnostic Question Safety Gate.
 *
 * Kontrak: butir bank yang tidak aman TIDAK PERNAH sampai ke murid lewat jalur
 * fallback diagnostik. Gate (lib/diagnostic-ai/bank-gate.ts) deterministik dan
 * murni; pengiriman (pickSafeBankFallbackCandidate) menguji-ulang kandidat
 * dengan kunci asli. Validator AI R1–R16 tidak disentuh.
 */
import { isDiagnosticSafeItem, diagnosticSafeIssues } from "../lib/diagnostic-ai/bank-gate";
import type { DiagnosticSafeReason } from "../lib/diagnostic-ai/bank-gate";
import { pickSafeBankFallbackCandidate } from "../lib/diagnostic-ai/bank-fallback";
import { validateAiDiagnosticItem } from "../lib/diagnostic-ai/validator";
import type { DiagnosticCandidate } from "../lib/diagnostic/types";

const FILLER = ["Menulis cerita pendek", "Membaca puisi", "Menyusun laporan"];

interface Case {
  name: string;
  input: Parameters<typeof isDiagnosticSafeItem>[0];
  expectSafe: boolean;
  expectReason?: DiagnosticSafeReason;
}

const CASES: Case[] = [
  // A. Safe valid PG → accepted
  { name: "A. PG sah diterima", input: { id: "BC-ANTONIM-0001", text: "Antonim dari kata 'panas' adalah...", options: ["Hangat", "Sejuk", "Dingin", "Segar"], questionType: "PILIHAN_GANDA", correctAnswer: "2" }, expectSafe: true },
  // B. Missing prompt → rejected
  { name: "B. prompt kosong ditolak", input: { id: "B1", text: "   ", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", correctAnswer: "0" }, expectSafe: false, expectReason: "TEXT_MISSING" },
  // C. Missing options (bukan array / <2) → rejected
  { name: "C. options bukan array ditolak", input: { id: "C1", text: "Manakah kata baku yang benar?", options: "Salah", questionType: "PILIHAN_GANDA", correctAnswer: "0" }, expectSafe: false, expectReason: "OPTIONS_SHAPE" },
  { name: "C2. PG hanya 1 opsi ditolak", input: { id: "C2", text: "Manakah kata baku yang benar?", options: ["A"], questionType: "PILIHAN_GANDA", correctAnswer: "0" }, expectSafe: false, expectReason: "OPTIONS_TOO_FEW" },
  // D. Empty option → rejected
  { name: "D. opsi kosong ditolak", input: { id: "D1", text: "Manakah kata baku yang benar?", options: ["Keduanya", "", " ", "Z"], questionType: "PILIHAN_GANDA", correctAnswer: "0" }, expectSafe: false, expectReason: "EMPTY_OPTION" },
  // E. Duplicate normalized options → rejected
  { name: "E. opsi duplikat ditolak", input: { id: "ADH-000020", text: "Penulisan yang benar sesuai PUEBI adalah...", options: ["di rumah", "dirumah", "di-rumah", "diRumah"], questionType: "PILIHAN_GANDA", correctAnswer: "0" }, expectSafe: false, expectReason: "DUPLICATE_OPTION" },
  // F. Invalid answer key → rejected
  { name: "F1. kunci kosong ditolak", input: { id: "F1", text: "Manakah kata baku yang benar?", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", correctAnswer: "" }, expectSafe: false, expectReason: "KEY_MISSING" },
  { name: "F2. kunci bukan indeks ditolak", input: { id: "F2", text: "Manakah penulisan yang benar?", options: ["Ibu pergi ke pasar.", "Ibu pergi kepasar."], questionType: "PILIHAN_GANDA", correctAnswer: "Ibu pergi ke pasar." }, expectSafe: false, expectReason: "KEY_NOT_INDEX" },
  { name: "F3. kunci di luar opsi ditolak", input: { id: "F3", text: "Manakah kata baku yang benar?", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", correctAnswer: "7" }, expectSafe: false, expectReason: "KEY_OUT_OF_RANGE" },
  // G. ISIAN_SINGKAT with options → rejected
  { name: "G. isian ber-opsi palsu ditolak", input: { id: "BC-IMBUHAN-0025", text: "Jelaskan pengertian Imbuhan menurut pemahaman Anda.", options: ["imbuhan"], questionType: "ISIAN_SINGKAT", correctAnswer: "0" }, expectSafe: false, expectReason: "ISIAN_HAS_OPTIONS" },
  // H. Known tautology template → rejected
  { name: "H. template tautologi ditolak", input: { id: "BC-CERPEN-0014", text: "Berikut ini yang termasuk contoh Cerpen adalah...", options: ["Cerpen", ...FILLER], questionType: "PILIHAN_GANDA", correctAnswer: "0" }, expectSafe: false, expectReason: "TEMPLATE_STEM" },
  // I. Known filler-distractor structure → rejected
  { name: "I. distraktor isian lintas-topik ditolak", input: { id: "I1", text: "Yang mana contoh dari sebuah karangan?", options: ["Resensi", "Menulis cerita pendek", "Membaca puisi", "Menyusun laporan"], questionType: "PILIHAN_GANDA", correctAnswer: "0" }, expectSafe: false, expectReason: "FILLER_DISTRACTORS" },
  // J. Same normalized stem in avoidStems → rejected
  { name: "J. stem duplikat sesi ditolak", input: { id: "J1", text: "Kapan Indonesia memproklamasikan kemerdekaannya?", options: ["17 Agustus 1945", "17 Agustus 1946", "28 Oktober 1928", "1 Juni 1945"], questionType: "PILIHAN_GANDA", correctAnswer: "0", avoidStems: ["Kapan Indonesia memproklamasikan kemerdekaannya?"] }, expectSafe: false, expectReason: "STEM_DUPLICATE" },
  // K. Different IDs + same normalized stem → rejected (via delivery path below)
  // L. Valid AI output → existing validator unchanged
  { name: "L. tipe tak dikenal ditolak", input: { id: "L1", text: "Pertanyaan apapun", options: ["A", "B"], questionType: "URAIAN", correctAnswer: "x" }, expectSafe: false, expectReason: "TYPE_UNSUPPORTED" },
  { name: "L2. BENAR_SALAH bentuk rusak ditolak", input: { id: "L2", text: "Apakah pernyataan ini benar?", options: ["Betul", "Salah"], questionType: "BENAR_SALAH", correctAnswer: "0" }, expectSafe: false, expectReason: "BS_SHAPE" },
];

let passed = 0;
const failures: string[] = [];

for (const test of CASES) {
  const result = isDiagnosticSafeItem(test.input);
  const okSafe = result.safe === test.expectSafe;
  const okReason = test.expectReason ? result.reasons.includes(test.expectReason) : true;
  if (okSafe && okReason) {
    passed += 1;
  } else {
    failures.push(`${test.name}: safe=${result.safe} (harap ${test.expectSafe}), reasons=[${result.reasons.join(",")}]${test.expectReason ? `, butuh ${test.expectReason}` : ""}`);
  }
}

// ── 8. REGRESSION: butir rusak teraudit HARUS ditolak gate ──
const BROKEN_ID_CASES: Record<string, { text: string; options: string[]; correctAnswer: string; type: string }> = {
  "BC-CERPEN-0014": { text: "Berikut ini yang termasuk contoh Cerpen adalah...", options: ["Cerpen", ...FILLER], correctAnswer: "0", type: "PILIHAN_GANDA" },
  "BC-CERPEN-0026": { text: "Berikut ini yang termasuk contoh Cerpen adalah...", options: ["Cerpen", ...FILLER], correctAnswer: "0", type: "PILIHAN_GANDA" },
  "BC-ANTONIM-0026": { text: "Berikut ini yang termasuk contoh Antonim adalah...", options: ["Antonim", ...FILLER], correctAnswer: "0", type: "PILIHAN_GANDA" },
  "BC-ARTIKEL-0001": { text: "Berikut ini yang termasuk contoh Artikel adalah...", options: ["Artikel", ...FILLER], correctAnswer: "0", type: "PILIHAN_GANDA" },
  "BC-ARTIKEL-0014": { text: "Berikut ini yang termasuk contoh Artikel adalah...", options: ["Artikel", ...FILLER], correctAnswer: "0", type: "PILIHAN_GANDA" },
  "BC-EJAAN-0002": { text: "Berikut ini yang termasuk contoh Ejaan adalah...", options: ["Ejaan", ...FILLER], correctAnswer: "0", type: "PILIHAN_GANDA" },
  // sibling representative
  "BC-SURAT-DINAS-0014": { text: "Berikut ini yang termasuk contoh Surat Dinas adalah...", options: ["Surat Dinas", ...FILLER], correctAnswer: "0", type: "PILIHAN_GANDA" },
  "BC-PUEBI-0014": { text: "Berikut ini yang termasuk contoh PUEBI adalah...", options: ["PUEBI", ...FILLER], correctAnswer: "0", type: "PILIHAN_GANDA" },
  "BC-IMBUHAN-0025": { text: "Jelaskan pengertian Imbuhan menurut pemahaman Anda.", options: ["imbuhan"], correctAnswer: "0", type: "ISIAN_SINGKAT" },
};

for (const [id, data] of Object.entries(BROKEN_ID_CASES)) {
  const result = isDiagnosticSafeItem({ id, text: data.text, options: data.options, questionType: data.type, correctAnswer: data.correctAnswer });
  if (!result.safe) {
    passed += 1;
  } else {
    failures.push(`Butir teraudit ${id} LULUS gate — harus ditolak`);
  }
}

// ── L. Validator AI R1–R16 tidak diubah: output AI yang sah tetap valid ──
const VALID_AI_RAW = {
  id: "ai-valid-fixture-1",
  text: "Dalam sebuah cerita pendek, terdapat beberapa unsur penting. Manakah yang menggambarkan waktu dan tempat terjadinya peristiwa?",
  options: ["Tema", "Tokoh", "Latar", "Alur"],
  questionType: "PILIHAN_GANDA",
  correctAnswer: 2,
  explanation: "Latar adalah unsur yang menggambarkan waktu dan tempat terjadinya peristiwa. Tema, tokoh, dan alur menjawab aspek lain dari cerita.",
  misconceptionMap: { 0: "Tema adalah gagasan pokok cerita, bukan tempat atau waktu.", 1: "Tokoh adalah pelaku cerita, bukan latar.", 3: "Alur adalah rangkaian peristiwa, bukan tempat dan waktu." },
  skill: "LITERATURE",
  subskill: "LITERATURE_UNSUR_CERITA",
  difficulty: "MEDIUM",
  topic: "Unsur cerita",
  cognitiveTarget: "MEMAHAMI",
  evidenceTarget: { skill: "LITERATURE", confidence: "MEDIUM" },
  diagnosticRationale: "Mengukur pemahaman murid terhadap unsur intrinsik cerita.",
};
const aiValidation = validateAiDiagnosticItem(VALID_AI_RAW, { avoidStems: [], avoidIds: [] });
if (aiValidation.valid) {
  passed += 1;
} else {
  failures.push(`Validator AI menolak output sah: ${aiValidation.issues.join(", ")}`);
}

// ── K + M. Jalur penyerahan: id beda/stem sama ditolak; pool tak aman → null ──
const candidate = (id: string, text: string, skill = "READING", difficulty = "MEDIUM"): DiagnosticCandidate => ({
  id,
  text,
  options: ["A", "B", "C", "D"],
  questionType: "PILIHAN_GANDA",
  skill,
  subskill: null,
  difficulty: difficulty as DiagnosticCandidate["difficulty"],
  topic: null,
  seenAt: null,
});

// K. ID berbeda + stem sama: kandidat kedua tidak boleh terpilih.
const stem = "Kapan Indonesia merdeka?";
const sameStemPool = [candidate("k1", stem), candidate("k2", stem), candidate("k3", "Siapa presiden pertama Indonesia?")];
const kResult = pickSafeBankFallbackCandidate(sameStemPool, { skill: "READING", difficulty: "MEDIUM" }, [], [stem], (id) => (id === "k3" ? "1" : "0"));
if (kResult?.candidate.id === "k3") {
  passed += 1;
} else {
  failures.push(`K: id beda/stem sama — terpilih ${kResult?.candidate.id ?? "null"}, harap k3`);
}

// M. Pool hanya berisi kandidat tak aman → TIDAK PERNAH memilih kandidat tak aman.
const brokenAsCandidates: DiagnosticCandidate[] = Object.entries(BROKEN_ID_CASES)
  .filter(([, d]) => d.type === "PILIHAN_GANDA")
  .map(([id, d]) => ({ id, text: d.text, options: d.options, questionType: "PILIHAN_GANDA" as const, skill: "READING", subskill: null, difficulty: "MEDIUM" as const, topic: null, seenAt: null }));
const keyOfBroken = (id: string) => BROKEN_ID_CASES[id]?.correctAnswer ?? "";
const mResult = pickSafeBankFallbackCandidate(brokenAsCandidates, { skill: "READING", difficulty: "MEDIUM" }, [], [], keyOfBroken);
if (mResult === null) {
  passed += 1;
} else {
  failures.push(`M: pool tak aman menghasilkan kandidat ${mResult.candidate.id} — harus null`);
}
// M2. Pool kosong → null.
if (pickSafeBankFallbackCandidate([], { skill: "READING", difficulty: "MEDIUM" }, [], [], () => undefined) === null) {
  passed += 1;
} else {
  failures.push("M2: pool kosong harus null");
}

// ── 9. Struktur hasil gate: { safe, reasons } tanpa detail bocor ──
const shapeResult = isDiagnosticSafeItem({ id: "X", text: "Soal?", options: ["A", "B"], questionType: "PILIHAN_GANDA", correctAnswer: "9" });
if (shapeResult.safe === false && Array.isArray(shapeResult.reasons) && shapeResult.reasons.includes("KEY_OUT_OF_RANGE") && !("detail" in shapeResult)) {
  passed += 1;
} else {
  failures.push(`Bentuk hasil gate tidak sesuai kontrak: ${JSON.stringify(shapeResult)}`);
}
// Reasons tidak pernah memuat kunci/isi sensitif (hanya kode).
const leaked = shapeResult.reasons.some((reason) => typeof reason !== "string" || reason.includes("9"));
if (!leaked) {
  passed += 1;
} else {
  failures.push("reasons memuat nilai sensitif");
}
// diagnosticSafeIssues masih menyediakan detail utk log server-side.
if (diagnosticSafeIssues({ id: "X", text: "Soal?", options: ["A", "B"], questionType: "PILIHAN_GANDA", correctAnswer: "9" })[0]?.detail) {
  passed += 1;
} else {
  failures.push("diagnosticSafeIssues kehilangan detail");
}

const TOTAL = CASES.length + Object.keys(BROKEN_ID_CASES).length + 7;
console.log(`Diagnostic safety gate contract: ${passed}/${TOTAL} lulus`);
if (failures.length > 0) {
  console.error("GAGAL:");
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
process.exit(0);
