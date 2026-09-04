#!/usr/bin/env npx tsx
/**
 * P0.5 — CONTRACT TEST: Bank Gate Tes Awal (tanpa DB, murni).
 *
 * Kontrak: butir bank yang terbukti rusak (keluarga template "contoh {topik}",
 * isian dengan opsi palsu, opsi duplikat/kosong, kunci di luar opsi) TIDAK
 * boleh lolos gate, sementara butir bank sah dan butir AI tetap mengalir.
 * Sesi tidak boleh menyajikan konten yang sama dua kali (stem dedup).
 */
import { bankGateIssues, isBankEligible } from "../lib/diagnostic-ai/bank-gate";
import type { AiQuestionType } from "../lib/diagnostic-ai/types";
import { pickBankFallbackCandidate } from "../lib/diagnostic-ai/bank-fallback";
import type { DiagnosticCandidate } from "../lib/diagnostic/types";

interface GateCase {
  name: string;
  id: string;
  text: string;
  options: string[];
  questionType: AiQuestionType;
  correctAnswer: string;
  avoidStems?: string[];
  expectEligible: boolean;
  expectCode?: string; // kode penolakan yang wajib muncul saat expectEligible=false
}

const FILLER = ["Menulis cerita pendek", "Membaca puisi", "Menyusun laporan"];

const CASES: GateCase[] = [
  // ── keluarga template yang TERBUKTI dikirim ke murid (P0.5 audit) ──
  { name: "BC-CERPEN-0014 tertolak", id: "BC-CERPEN-0014", text: "Berikut ini yang termasuk contoh Cerpen adalah...", options: ["Cerpen", ...FILLER], questionType: "PILIHAN_GANDA", correctAnswer: "0", expectEligible: false, expectCode: "TEMPLATE_STEM" },
  { name: "BC-CERPEN-0026 tertolak", id: "BC-CERPEN-0026", text: "Berikut ini yang termasuk contoh Cerpen adalah...", options: ["Cerpen", ...FILLER], questionType: "PILIHAN_GANDA", correctAnswer: "0", expectEligible: false, expectCode: "TEMPLATE_STEM" },
  { name: "BC-ANTONIM-0026 tertolak", id: "BC-ANTONIM-0026", text: "Berikut ini yang termasuk contoh Antonim adalah...", options: ["Antonim", ...FILLER], questionType: "PILIHAN_GANDA", correctAnswer: "0", expectEligible: false, expectCode: "TEMPLATE_STEM" },
  { name: "BC-ARTIKEL-0014 tertolak", id: "BC-ARTIKEL-0014", text: "Berikut ini yang termasuk contoh Artikel adalah...", options: ["Artikel", ...FILLER], questionType: "PILIHAN_GANDA", correctAnswer: "0", expectEligible: false, expectCode: "TEMPLATE_STEM" },
  { name: "BC-EJAAN-0002 tertolak", id: "BC-EJAAN-0002", text: "Berikut ini yang termasuk contoh Ejaan adalah...", options: ["Ejaan", ...FILLER], questionType: "PILIHAN_GANDA", correctAnswer: "0", expectEligible: false, expectCode: "TEMPLATE_STEM" },
  { name: "BC-SURAT-DINAS-0014 tertolak", id: "BC-SURAT-DINAS-0014", text: "Berikut ini yang termasuk contoh Surat Dinas adalah...", options: ["Surat Dinas", ...FILLER], questionType: "PILIHAN_GANDA", correctAnswer: "0", expectEligible: false, expectCode: "TEMPLATE_STEM" },
  // ── cacat struktur lain yang teraudit ──
  { name: "ISIAN dengan opsi palsu tertolak", id: "BC-IMBUHAN-0025", text: "Jelaskan pengertian Imbuhan menurut pemahaman Anda.", options: ["imbuhan"], questionType: "ISIAN_SINGKAT", correctAnswer: "0", expectEligible: false, expectCode: "ISIAN_HAS_OPTIONS" },
  { name: "opsi duplikat tertolak", id: "ADH-000020", text: "Penulisan yang benar sesuai PUEBI adalah...", options: ["di rumah", "dirumah", "di-rumah", "diRumah"], questionType: "PILIHAN_GANDA", correctAnswer: "0", expectEligible: false, expectCode: "DUPLICATE_OPTION" },
  { name: "kunci di luar opsi tertolak", id: "OOB-1", text: "Manakah kalimat yang menggunakan kata baku?", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", correctAnswer: "7", expectEligible: false, expectCode: "KEY_OUT_OF_RANGE" },
  { name: "teks kosong tertolak", id: "EMPTY-1", text: "   ", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", correctAnswer: "0", expectEligible: false, expectCode: "TEXT_MISSING" },
  { name: "kunci bukan indeks tertolak", id: "KEY-1", text: "Manakah penulisan yang benar?", options: ["Ibu pergi ke pasar.", "Ibu pergi kepasar."], questionType: "PILIHAN_GANDA", correctAnswer: "Ibu pergi ke pasar.", expectEligible: false, expectCode: "KEY_NOT_INDEX" },
  { name: "stem duplikat dalam sesi tertolak", id: "DUP-STEM-2", text: "Kapan Indonesia memproklamasikan kemerdekaannya?", options: ["17 Agustus 1945", "17 Agustus 1946", "28 Oktober 1928", "1 Juni 1945"], questionType: "PILIHAN_GANDA", correctAnswer: "0", avoidStems: ["Kapan Indonesia memproklamasikan kemerdekaannya?"], expectEligible: false, expectCode: "STEM_DUPLICATE" },
  // ── butir sah tetap mengalir ──
  { name: "PG bank sah lolos", id: "BC-ANTONIM-0001", text: "Antonim dari kata 'panas' adalah...", options: ["Hangat", "Sejuk", "Dingin", "Segar"], questionType: "PILIHAN_GANDA", correctAnswer: "2", expectEligible: true },
  { name: "BENAR_SALAH sah lolos", id: "BC-EJAAN-0013", text: "Pernyataan: Ejaan adalah bagian dari materi Bahasa Indonesia.", options: ["Benar", "Salah"], questionType: "BENAR_SALAH", correctAnswer: "0", expectEligible: true },
  { name: "isian sah lolos", id: "ISIAN-OK", text: "Sebutkan ibu kota Provinsi Jawa Timur.", options: [], questionType: "ISIAN_SINGKAT", correctAnswer: "Surabaya", expectEligible: true },
  { name: "butir AI (uuid) lolos", id: "8f3f1103-2d2f-4d28-8a8b-9f9a1b2c3d4e", text: "Setiap pagi siswa membersihkan kelas agar nyaman untuk belajar. Apa ide pokok paragraf tersebut?", options: ["Siswa membersihkan kelas setiap pagi", "Buku disusun rapi", "Guru mengajar dengan sabar", "Kelas penuh fasilitas"], questionType: "PILIHAN_GANDA", correctAnswer: "0", expectEligible: true },
];

let passed = 0;
const failures: string[] = [];
for (const test of CASES) {
  const issues = bankGateIssues({
    id: test.id,
    text: test.text,
    options: test.options,
    questionType: test.questionType,
    correctAnswer: test.correctAnswer,
    avoidStems: test.avoidStems,
  });
  const eligible = issues.length === 0;
  const okEligibility = eligible === test.expectEligible;
  const okCode = test.expectCode ? issues.some((issue) => issue.code === test.expectCode) : true;
  if (okEligibility && okCode) {
    passed += 1;
  } else {
    failures.push(
      `${test.name}: eligible=${eligible} (harap ${test.expectEligible}), issues=[${issues.map((i) => i.code).join(",")}]${test.expectCode ? `, butuh ${test.expectCode}` : ""}`
    );
  }
}

// ── Fallback selector tidak mengulang stem dalam satu sesi ──
const candidate = (id: string, text: string, difficulty: string, skill = "READING"): DiagnosticCandidate => ({
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
const stem = "Kapan Indonesia merdeka?";
const pool: DiagnosticCandidate[] = [candidate("a", stem, "MEDIUM"), candidate("b", stem, "HARD"), candidate("c", "Siapa presiden pertama?", "MEDIUM")];
const picked = pickBankFallbackCandidate(pool, { skill: "READING", difficulty: "MEDIUM" }, [], [stem]);
if (picked?.id === "c") {
  passed += 1;
} else {
  failures.push(`fallback dengan avoidStems harus memilih butir c (dapat ${picked?.id ?? "null"})`);
}

console.log(`Bank gate contract: ${passed}/${CASES.length + 1} lulus`);
if (failures.length > 0) {
  console.error("GAGAL:");
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
process.exit(0);
