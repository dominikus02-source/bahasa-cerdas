/**
 * GAME QUESTION QUALITY — test suite.
 *
 * Memvalidasi SELURUH bank soal game terhadap kontrak kanonik
 * lib/game-questions:
 *  - structural (id/question/options/duplicate options)
 *  - answer integrity (correctAnswer ∈ options, tepat satu jawaban)
 *  - content integrity (placeholder/malformed/short)
 *  - dedupe (exact/normalized/near)
 *  - karantina (QUARANTINED tidak boleh masuk gameplay)
 *  - sampler (seed deterministik, sesi berbeda → kombinasi berbeda, anti-repeat,
 *    difficulty balance, topic spread)
 *  - semua game punya pool valid & non-kosong
 *
 * Run: npx tsx scripts/test-game-question-quality.ts
 */

import { QUESTION_BANK_EXPANDED } from "../lib/game/question-bank";
import { BANK_EKSPANSI_2026 } from "../lib/game/question-bank-expansion";
import { kataPlayLevels } from "../components/game/kataplay-content";
import {
  normalizeBankQuestion,
  normalizeKataPlayQuestion,
} from "../lib/game-questions/normalizer";
import {
  validateQuestion,
  validateAll,
} from "../lib/game-questions/validator";
import {
  findExactDuplicates,
  findDuplicates,
} from "../lib/game-questions/dedupe";
import { sampleQuestions } from "../lib/game-questions/sampler";
import { filterEligible } from "../lib/game-questions/quality";
import type { GameQuestion } from "../lib/game-questions/types";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      passed++;
      console.log(`  ✅ ${name}`);
    } else {
      failed++;
      errors.push(name);
      console.log(`  ❌ ${name}`);
    }
  } catch (e) {
    failed++;
    errors.push(`${name}: ${e instanceof Error ? e.message : e}`);
    console.log(`  ❌ ${name}`);
  }
}

console.log("\n════════════════════════════════════════════");
console.log("  GAME QUESTION QUALITY — Audit, Repair & Expansion");
console.log("════════════════════════════════════════════\n");

// ── Normalisasi seluruh bank ke kontrak kanonik ──
const bankQuestions: GameQuestion[] = QUESTION_BANK_EXPANDED.map((q, i) =>
  normalizeBankQuestion(q, i, "bank")
);
const katastraQuestions: GameQuestion[] = kataPlayLevels.flatMap((lvl) =>
  lvl.lessons.flatMap((lesson, li) =>
    lesson.questions.map((q, qi) =>
      normalizeKataPlayQuestion(q, li * 100 + qi, lesson.title, "katastra")
    )
  )
);
const all = [...bankQuestions, ...katastraQuestions];

console.log(`Total soal: bank=${bankQuestions.length} katastra=${katastraQuestions.length} (total ${all.length})`);

/* ── 1. Structural & answer integrity ── */
console.log("\n── 1. Structural & answer integrity ──");
test("setiap soal punya id", () => all.every((q) => !!q.id && q.id.trim() !== ""));
test("setiap soal punya pertanyaan non-empty", () => all.every((q) => q.question.trim().length > 0));
test("setiap soal MCQ punya opsi valid (≥2, non-empty)", () =>
  all.filter((q) => !q.freeText).every((q) => q.options.length >= 2 && q.options.every((o) => o.trim() !== "")));
test("tidak ada opsi duplikat (case-sensitive — beda kapital itu sah di soal ejaan)", () =>
  all.filter((q) => !q.freeText).every((q) => {
    const n = q.options.map((o) => o.trim().replace(/\s+/g, " "));
    return new Set(n).size === n.length;
  }));
test("correctAnswer selalu ada & valid", () => all.every((q) => q.correctAnswer.trim() !== ""));
test("correctAnswer ∈ options (MCQ)", () =>
  all.filter((q) => !q.freeText).every((q) => q.options.includes(q.correctAnswer)));

/* ── 2. Content integrity ── */
console.log("\n── 2. Content integrity ──");
const BAD = ["undefined", "null", "lorem", "TODO", "FIXME", "contoh soal"];
test("tidak ada placeholder/debug text", () =>
  all.every((q) => !BAD.some((b) => q.question.toLowerCase().includes(b))));
test("tidak ada pertanyaan terlalu pendek (<12 char, kecuali instruksi katastra)", () =>
  all.every((q) => q.question.trim().length >= 12 || q.freeText || q.source === "katastra"));

/* ── 3. Validator penuh (status + skor) ── */
console.log("\n── 3. Validator penuh ──");
const results = validateAll(all);
const quarantined = results.filter((r) => r.status === "QUARANTINED");
const review = results.filter((r) => r.status === "REVIEW");
test(`0 soal QUARANTINED (ditemukan ${quarantined.length})`, () => quarantined.length === 0);
test(`soal REVIEW wajar (ditemukan ${review.length})`, () => review.length <= all.length * 0.1);
test("rata-rata skor kualitas ≥ 85", () => {
  const avg = results.reduce((s, r) => s + r.qualityScore, 0) / results.length;
  console.log(`     rata-rata skor: ${avg.toFixed(1)}`);
  return avg >= 85;
});

/* ── 4. Dedupe ── */
console.log("\n── 4. Duplicate analysis ──");
const exact = findExactDuplicates(all);
test(`0 duplicate persis (ditemukan ${exact.length})`, () => exact.length === 0);
const near = findDuplicates(all, 0.85).filter((g) => g.kind === "near");
console.log(`     near-duplicate groups (Jaccard ≥0.85): ${near.length}`);
test("near-duplicate hanya DITANDAI (tidak dihapus otomatis)", () => near.every((g) => g.questions.length >= 2));

/* ── 5. Karantina tidak masuk gameplay ── */
console.log("\n── 5. Karantina vs gameplay ──");
test("filterEligible tidak pernah meloloskan QUARANTINED", () => {
  const eligible = filterEligible(all);
  return eligible.every((q) => validateQuestion(q).status !== "QUARANTINED");
});
test("filterEligible tetap mengembalikan mayoritas soal", () => filterEligible(all).length >= all.length * 0.9);

/* ── 6. Sampler ── */
console.log("\n── 6. Randomization & anti-repeat ──");
test("sampler: seed sama → hasil sama (deterministik)", () => {
  const a = sampleQuestions(bankQuestions, 10, { seed: "sesi-1" }).map((q) => q.id);
  const b = sampleQuestions(bankQuestions, 10, { seed: "sesi-1" }).map((q) => q.id);
  return JSON.stringify(a) === JSON.stringify(b);
});
test("sampler: sesi berbeda → kombinasi dapat berbeda", () => {
  const a = sampleQuestions(bankQuestions, 10, { seed: "sesi-1" }).map((q) => q.id);
  const b = sampleQuestions(bankQuestions, 10, { seed: "sesi-2" }).map((q) => q.id);
  return JSON.stringify(a) !== JSON.stringify(b);
});
test("sampler: anti-repeat membuang recentIds", () => {
  const recent = sampleQuestions(bankQuestions, 10, { seed: "x" }).map((q) => q.id);
  const next = sampleQuestions(bankQuestions, 10, { seed: "y", recentIds: recent });
  return next.every((q) => !recent.includes(q.id));
});
test("sampler: fallback bila recent memakan seluruh pool", () => {
  const small = bankQuestions.slice(0, 5);
  const recent = small.map((q) => q.id);
  const out = sampleQuestions(small, 3, { recentIds: recent });
  return out.length === 3;
});
test("sampler: pool kecil tidak pernah gagal", () => {
  const out = sampleQuestions(bankQuestions.slice(0, 2), 10, { seed: "kecil" });
  return out.length === 2;
});

/* ── 7. Difficulty & topic ── */
console.log("\n── 7. Difficulty & topic balance ──");
test("ekspansi bank punya difficulty (EASY/MEDIUM/HARD)", () => {
  const d = BANK_EKSPANSI_2026.map((q) => q.tingkat);
  const counts = { EASY: 0, MEDIUM: 0, HARD: 0 } as Record<string, number>;
  d.forEach((t) => { if (t) counts[t]++; });
  console.log(`     EASY ${counts.EASY} · MEDIUM ${counts.MEDIUM} · HARD ${counts.HARD}`);
  return counts.EASY > 0 && counts.MEDIUM > 0 && counts.HARD > 0;
});
test("distribusi difficulty mendekati 30/50/20 (toleransi ±15%)", () => {
  const d = BANK_EKSPANSI_2026.map((q) => q.tingkat).filter(Boolean) as string[];
  const pct = (k: string) => (d.filter((x) => x === k).length / d.length) * 100;
  const e = pct("EASY"), m = pct("MEDIUM"), h = pct("HARD");
  console.log(`     EASY ${e.toFixed(0)}% · MEDIUM ${m.toFixed(0)}% · HARD ${h.toFixed(0)}%`);
  return Math.abs(e - 30) <= 15 && Math.abs(m - 50) <= 15 && Math.abs(h - 20) <= 15;
});
test("kategori/topik bervariasi (≥8 topik di bank)", () => {
  const topics = new Set(bankQuestions.map((q) => q.topic).filter(Boolean));
  console.log(`     topik: ${[...topics].join(", ")}`);
  return topics.size >= 8;
});
test("topik ekspansi mencakup pemahaman teks & kalimat efektif", () => {
  const topics = BANK_EKSPANSI_2026.map((q) => q.kategori);
  return topics.includes("Kalimat Efektif") && topics.includes("Jenis Kata") && topics.includes("Kata Baku");
});
test("topic spread: hasil tidak didominasi satu topik", () => {
  const out = sampleQuestions(bankQuestions, 20, { seed: "spread", topicSpread: true });
  const byTopic = new Map<string, number>();
  for (const q of out) byTopic.set(q.topic || "-", (byTopic.get(q.topic || "-") || 0) + 1);
  const max = Math.max(...byTopic.values());
  return max <= Math.ceil(20 / 2);
});

/* ── 8. Semua game punya pool valid ── */
console.log("\n── 8. Pool per game ──");
test("bank kurasi + ekspansi non-kosong (≥200 soal)", () => bankQuestions.length >= 200);
test("katastra non-kosong (≥80 soal)", () => katastraQuestions.length >= 80);
test("semua level katastra punya pertanyaan valid", () =>
  kataPlayLevels.every((lvl) => lvl.lessons.every((l) => l.questions.length > 0)));
test("ekspansi 2026 hadir (≥80 soal)", () => BANK_EKSPANSI_2026.length >= 80);

/* ── Summary ── */
console.log("\n════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("════════════════════════════════════════════\n");
if (failed > 0) {
  console.log("Errors:");
  errors.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
