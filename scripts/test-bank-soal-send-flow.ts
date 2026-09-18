/**
 * Guru Bank send-flow — question-set contract tests (pure logic, no DB).
 *
 * Mandates verified:
 *   1. seededShuffle deterministic: same seed → same order; different seed → different order.
 *   2. pickBankSoalSet: preview set == send set for same (candidates, seed, config).
 *   3. pickBankSoalSet applies delivery-gate filtering (quarantined rows excluded).
 *   4. normalizeDifficulty: UI values map to DB values (no MUDAH→EASY regression).
 *   5. Set size respected; no over-selection beyond deliverable pool.
 * Run: npx tsx scripts/test-bank-soal-send-flow.ts
 */
import { normalizeDifficulty, pickBankSoalSet, seededShuffle } from "../lib/question-bank/seeded-pick";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---- Fixtures: mimic Soal rows (enough fields for toDeliverySoal gate) ----
function mkSoal(i: number, difficulty: string | null) {
  return {
    id: `s${i}`,
    kodeSoal: "BC-GB2-TEST-" + String(i).padStart(3, "0"),
    source: "MASTER_BANK",
    topik: "Ejaan",
    kelas: "SEMUA",
    difficulty,
    text: `Soal ke-${i} tentang ejaan yang benar.`,
    options: ["A. satu", "B. dua", "C. tiga", "D. empat"],
    correctAnswer: i % 4,
    explanation: i % 2 === 0 ? `Pembahasan soal ${i}` : null,
    type: "PILIHAN_GANDA",
    isActive: true,
  };
}
const pool = Array.from({ length: 50 }, (_, i) => mkSoal(i, ["MUDAH", "SEDANG", "SULIT"][i % 3]));

console.log("\n═══ 1. seededShuffle determinism ═══");
const a1 = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "seed-alpha");
const a2 = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "seed-alpha");
const b1 = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "seed-beta");
check("same seed → identical order", JSON.stringify(a1) === JSON.stringify(a2));
check("different seed → different order", JSON.stringify(a1) !== JSON.stringify(b1));
check(
  "shuffle is a permutation (no loss/dup)",
  [...a1].sort((x, y) => x - y).join() === [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].join()
);
check(
  "empty seed handled",
  seededShuffle([1, 2, 3], "").join() === seededShuffle([1, 2, 3], "").join()
);

console.log("\n═══ 2. Preview == Send (same config → same set) ═══");
const cfg = { jumlah: 10, difficulty: "SEDANG" as string | null, seed: "abc123" };
const previewResult = pickBankSoalSet(pool, cfg);
const sendResult = pickBankSoalSet(pool, cfg);
check(
  "identical config → identical IDs",
  JSON.stringify(previewResult.selected.map((s) => s.id)) ===
    JSON.stringify(sendResult.selected.map((s) => s.id))
);
check("set size == jumlah", previewResult.selected.length === 10, `got ${previewResult.selected.length}`);
check(
  "difficulty filter respected",
  previewResult.selected.every((s) => s.difficulty === "SEDANG")
);
check(
  "deliverableTotal reflects post-difficulty-filter pool (50/3≈17)",
  previewResult.deliverableTotal === pool.filter((s) => s.difficulty === "SEDANG").length
);

console.log("\n═══ 3. Delivery gate enforced inside the picker ═══");
const contaminated = [
  ...pool.slice(0, 45),
  // Quarantine-pattern rows (template garbage) — must never be selected.
  mkSoal(90, "MUDAH"),
  mkSoal(91, "MUDAH"),
  mkSoal(92, "MUDAH"),
  mkSoal(93, "MUDAH"),
  mkSoal(94, "MUDAH"),
].map((s, i) => (i >= 45 ? { ...s, text: "", options: [], correctAnswer: null, kodeSoal: "MASTER-000" + i } : s));
const gated = pickBankSoalSet(contaminated, { jumlah: 45, difficulty: null, seed: "zzz" });
check(
  "quarantined rows excluded from selection",
  gated.selected.every((s) => s.id !== "s90" && s.id !== "s94")
);

console.log("\n═══ 4. normalizeDifficulty (no MUDAH→EASY regression) ═══");
check("MUDAH → MUDAH", normalizeDifficulty("MUDAH") === "MUDAH");
check("Sedang (mixed case) → SEDANG", normalizeDifficulty("Sedang") === "SEDANG");
check("SULIT → SULIT", normalizeDifficulty("SULIT") === "SULIT");
check("empty → null (Semua)", normalizeDifficulty("") === null);
check("garbage → null (rejected upstream)", normalizeDifficulty("EASY") === null);

console.log("\n═══ 5. Boundary: pool smaller than jumlah ═══");
const small = pickBankSoalSet(pool.slice(0, 4), { jumlah: 10, difficulty: null, seed: "k" });
check("returns at most available", small.selected.length === 4);
check("deliverableTotal reflects reality", small.deliverableTotal === 4);

console.log(`\n═══ RESULT: ${passed} passed, ${failed} failed ═══`);
if (failed > 0) process.exit(1);
process.exit(0);
