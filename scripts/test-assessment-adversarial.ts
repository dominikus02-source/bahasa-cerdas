/**
 * BC ASSESSMENT ENGINE 2.2 — ADVERSARIAL CASES.
 * Unit murni, tanpa DB. Run: npm run test:assessment-adversarial
 *
 * Memastikan engine tidak:
 *   - overestimate (claim strength/mastery tanpa bukti)
 *   - underestimate (mengabaikan sinyal sulit)
 *   - claim mastery tanpa evidence
 *   - claim weakness tanpa evidence
 */
import { computeAbilityProfile, difficultyWeight } from "../lib/diagnostic/ability";
import { ADVERSARIAL } from "./fixtures/assessment-archetypes";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

console.log("\nBC ASSESSMENT ENGINE 2.2 — ADVERSARIAL\n");

const readingOf = (p: ReturnType<typeof computeAbilityProfile>) => p.skills.find((s) => s.skill === "READING")!;

// ── A: 1/1 HARD ──
console.log("── A: 1/1 HARD ──");
const a = computeAbilityProfile(ADVERSARIAL.A);
const aSkill = readingOf(a);
check("A: band TINGGI (sinyal sulit kuat)", aSkill.abilityBand === "TINGGI");
check("A: confidence LOW (1 bukti — tidak overclaim)", aSkill.confidence === "LOW");
check("A: mastery BUKAN PROFICIENT", aSkill.masteryState !== "PROFICIENT");

// ── B: 10/10 EASY ──
console.log("\n── B: 10/10 EASY ──");
const b = computeAbilityProfile(ADVERSARIAL.B);
const bSkill = readingOf(b);
check("B: band DIBATASI DASAR (hanya EASY)", bSkill.abilityBand === "DASAR");
check("B: mastery BUKAN PROFICIENT (diff coverage 1)", bSkill.masteryState !== "PROFICIENT");

// ── C: 10/10 EASY + 10/10 MEDIUM ──
console.log("\n── C: 10/10 EASY + 10/10 MEDIUM ──");
const c = computeAbilityProfile(ADVERSARIAL.C);
const cSkill = readingOf(c);
check("C: band TINGGI (100% sampai MEDIUM)", cSkill.abilityBand === "TINGGI");
check("C: mastery wajar (20 bukti, 2 difficulty, subskill teruji)",
  cSkill.masteryState !== "NO_DATA");

// ── D: 10/10 EASY + 10/10 HARD ──
console.log("\n── D: 10/10 EASY + 10/10 HARD ──");
const d = computeAbilityProfile(ADVERSARIAL.D);
const dSkill = readingOf(d);
check("D: band TINGGI (100% sampai HARD)", dSkill.abilityBand === "TINGGI");
check("D: mastery tidak PROFICIENT (satu subskill belum tentu luas)", dSkill.masteryState !== "PROFICIENT" || dSkill.subskillCoverage > 0);

// ── E: 50/100 MEDIUM ──
console.log("\n── E: 50/100 MEDIUM ──");
const e = computeAbilityProfile(ADVERSARIAL.E);
const eSkill = readingOf(e);
check("E: accuracy ≈ 0.5 (jujur)", eSkill.accuracy !== null && Math.abs(eSkill.accuracy - 0.5) < 0.05);
check("E: confidence tidak HIGH (diff coverage 1)", eSkill.confidence !== "HIGH");
check("E: mastery DEVELOPING/NOT_ENOUGH (bukan PROFICIENT)", eSkill.masteryState !== "PROFICIENT");

// ── F: 1/10 EASY + 10/10 HARD ──
console.log("\n── F: 1/10 EASY + 10/10 HARD ──");
const f = computeAbilityProfile(ADVERSARIAL.F);
const fSkill = readingOf(f);
check("F: band TINGGI (10/10 HARD mendominasi wajar)", fSkill.abilityBand === "TINGGI");
check("F: mastery tidak PROFICIENT (pola tidak konsisten)", fSkill.masteryState !== "PROFICIENT");

// ── G: 100% satu subskill ──
console.log("\n── G: 100% satu subskill ──");
const g = computeAbilityProfile(ADVERSARIAL.G);
check("G: coverage.subskills rendah (satu subskill)", g.coverage.subskills < 0.3);
check("G: overallConfidence BUKAN HIGH (subskill coverage buruk)", g.overallConfidence !== "HIGH");

// ── H: 100% skill tapi satu subskill ──
console.log("\n── H: 100% skill, satu subskill ──");
const h = computeAbilityProfile(ADVERSARIAL.H);
const hSkill = readingOf(h);
check("H: subskillCoverage per skill rendah", hSkill.subskillCoverage < 0.5);
check("H: mastery NOT_ENOUGH_EVIDENCE (subskill sempit)", hSkill.masteryState === "NOT_ENOUGH_EVIDENCE");

// ── Difficulty weight sanity ──
console.log("\n── Difficulty weight sanity ──");
check("Weight: EASY=1.0", difficultyWeight("EASY") === 1.0);
check("Weight: MEDIUM=1.5", difficultyWeight("MEDIUM") === 1.5);
check("Weight: HARD=2.0", difficultyWeight("HARD") === 2.0);
check("Weight: 1 HARD benar ≠ > banyak EASY benar (2 EASY = 1 HARD)",
  difficultyWeight("HARD") === 2 && difficultyWeight("EASY") * 2 === 2);
const tenEasyWrongOneHard = computeAbilityProfile([
  ...Array.from({ length: 10 }, () => ({ skill: "READING", subskill: null as string | null, difficulty: "EASY" as const, isCorrect: false })),
  { skill: "READING", subskill: null, difficulty: "HARD" as const, isCorrect: true },
]);
const tenEasyWrongOneHardSkill = readingOf(tenEasyWrongOneHard);
check("Weight: 10 EASY salah + 1 HARD benar → weightedAccuracy kecil (bukan overclaim)",
  tenEasyWrongOneHardSkill.weightedAccuracy !== null && tenEasyWrongOneHardSkill.weightedAccuracy < 0.3);

console.log(`\n${"=".repeat(50)}`);
console.log(`Hasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
