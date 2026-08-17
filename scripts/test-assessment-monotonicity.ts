/**
 * BC ASSESSMENT ENGINE 2.2 — MONOTONICITY TESTS.
 * Unit murni, tanpa DB. Run: npm run test:assessment-monotonicity
 *
 * Aturan:
 *   - Evidence tambahan yang konsisten/lebih baik → confidence TIDAK turun.
 *   - Performa difficulty yang lebih baik → ability TIDAK menurun.
 *   - Evidence baru yang lebih buruk → ability boleh turun, tapi confidence
 *     (bukti) tetap tidak menurun secara tidak masuk akal.
 */
import { computeAbilityProfile, skillConfidenceFor } from "../lib/diagnostic/ability";
import { fill } from "./fixtures/assessment-archetypes";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

console.log("\nBC ASSESSMENT ENGINE 2.2 — MONOTONICITY\n");

// ── 1. Confidence ladder per skill ──
console.log("── Confidence ladder (skillConfidenceFor) ──");
check("0 bukti → NO_DATA", skillConfidenceFor(0, 0, 0, null) === "NO_DATA");
check("2 → LOW", skillConfidenceFor(2, 1, 0, 1) === "LOW");
check("8 (diff 2) → MEDIUM", skillConfidenceFor(8, 2, 0.4, 0.8) === "MEDIUM");
check("12 (diff 3, subskill) → HIGH", skillConfidenceFor(12, 3, 0.4, 0.8) === "HIGH");
check("Monotonik: n naik + coverage sama → confidence tidak turun",
  skillConfidenceFor(5, 2, 0.4, 0.8) === "MEDIUM" && skillConfidenceFor(20, 2, 0.4, 0.8) !== "LOW");

// ── 2. Evidence konsisten tambahan → confidence tidak turun ──
console.log("\n── Evidence konsisten tambahan ──");
const base10 = computeAbilityProfile(fill("READING", 10, 0.8, ["EASY", "MEDIUM"]));
const base25 = computeAbilityProfile(fill("READING", 25, 0.8, ["EASY", "MEDIUM", "HARD"]));
const base50 = computeAbilityProfile(fill("READING", 50, 0.8, ["EASY", "MEDIUM", "HARD"]));
check("10 → 25 → 50 bukti (akurasi sama): confidence tidak turun",
  rank(base10.overallConfidence) <= rank(base25.overallConfidence) &&
  rank(base25.overallConfidence) <= rank(base50.overallConfidence));

function rank(c: string): number {
  return ["NO_DATA", "LOW", "MEDIUM", "HIGH"].indexOf(c);
}

// ── 3. Difficulty lebih baik → ability tidak menurun ──
console.log("\n── Difficulty lebih baik ──");
const easyOnly = computeAbilityProfile(fill("READING", 20, 0.9, ["EASY"]));
const mixed = computeAbilityProfile(fill("READING", 20, 0.9, ["EASY", "MEDIUM"]));
const hardReached = computeAbilityProfile(fill("READING", 20, 0.9, ["EASY", "MEDIUM", "HARD"]));
const bandRank = (b: string | null) => (b === "TINGGI" ? 2 : b === "MENENGAH" ? 1 : b === "DASAR" ? 0 : -1);
check("EASY-only → DASAR", bandRank(easyOnly.skills.find((s) => s.skill === "READING")!.abilityBand) === 0);
check("Tambah MEDIUM → ability tidak turun", bandRank(mixed.skills.find((s) => s.skill === "READING")!.abilityBand) >= 0);
check("Tambah HARD → ability tidak turun", bandRank(hardReached.skills.find((s) => s.skill === "READING")!.abilityBand) >= bandRank(mixed.skills.find((s) => s.skill === "READING")!.abilityBand));
check("Akurasi sama + difficulty lebih luas → band naik/stabil",
  bandRank(hardReached.skills.find((s) => s.skill === "READING")!.abilityBand) >= bandRank(easyOnly.skills.find((s) => s.skill === "READING")!.abilityBand));

// ── 4. Evidence baru lebih buruk → ability boleh turun (alasan: akurasi) ──
console.log("\n── Evidence lebih buruk (alasan eksplisit) ──");
const good = computeAbilityProfile(fill("READING", 20, 0.9, ["EASY", "MEDIUM", "HARD"]));
const thenBad = computeAbilityProfile([...fill("READING", 20, 0.9, ["EASY", "MEDIUM", "HARD"]), ...fill("READING", 20, 0.2, ["EASY", "MEDIUM", "HARD"])]);
const goodReading = good.skills.find((s) => s.skill === "READING")!;
const thenBadReading = thenBad.skills.find((s) => s.skill === "READING")!;
check("Akurasi turun drastis → weightedAccuracy turun (alasan jelas)",
  (thenBadReading.weightedAccuracy ?? 0) < (goodReading.weightedAccuracy ?? 1));
check("Bukti bertambah → confidence TIDAK turun",
  rank(thenBad.overallConfidence) >= rank(good.overallConfidence));

// ── 5. Confidence overall depend pada coverage, bukan akurasi saja ──
console.log("\n── Confidence overall vs coverage ──");
const narrow = computeAbilityProfile(fill("READING", 50, 0.9, ["EASY"]));
const broad = computeAbilityProfile([
  ...fill("READING", 15, 0.9, ["EASY", "MEDIUM", "HARD"]),
  ...fill("GRAMMAR", 15, 0.9, ["EASY", "MEDIUM", "HARD"]),
  ...fill("VOCABULARY", 15, 0.9, ["EASY", "MEDIUM", "HARD"]),
  ...fill("LITERATURE", 10, 0.9, ["EASY", "MEDIUM", "HARD"]),
]);
check("50 bukti satu skill (EASY) → bukan HIGH", narrow.overallConfidence !== "HIGH");
check("50 bukti lintas skill → confidence lebih tinggi", rank(broad.overallConfidence) > rank(narrow.overallConfidence));

console.log(`\n${"=".repeat(50)}`);
console.log(`Hasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
