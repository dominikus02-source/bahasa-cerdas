/**
 * BC ASSESSMENT ENGINE 2.1 — QUALITY + SCORING AUDIT TESTS.
 * Unit murni (tanpa DB) — menguji canonical ability engine.
 * Run: npm run test:assessment-quality
 */
import {
  computeAbilityProfile,
  normalizeEvidence,
  abilityBandFor,
  skillConfidenceFor,
  masteryFor,
  type AbilityEvidenceItem,
} from "../lib/diagnostic/ability";
import { computeProfileFromEvidence, withUntestedSkills } from "../lib/diagnostic/profile";
import { buildPersonalizedAction } from "../lib/diagnostic/personalization";
import type { DiagnosticEvidenceDetail } from "../lib/diagnostic/types";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

console.log("\nBC ASSESSMENT ENGINE 2.1 — QUALITY TESTS\n");

const ALL_SKILLS = ["READING", "WRITING", "LISTENING", "SPEAKING", "GRAMMAR", "VOCABULARY", "LITERATURE"];

function ev(skill: string, isCorrect: boolean, difficulty: "EASY" | "MEDIUM" | "HARD" | "VERY_HARD" | null = "MEDIUM", subskill: string | null = null): AbilityEvidenceItem {
  return { skill, subskill, difficulty, isCorrect };
}

function item(skill: string, isCorrect: boolean, difficulty: "EASY" | "MEDIUM" | "HARD" | "VERY_HARD" | null = "MEDIUM"): DiagnosticEvidenceDetail {
  return { skill, isCorrect, difficulty };
}

// ── 1. Confidence ≠ raw accuracy ──
console.log("── 1. Confidence vs Raw Accuracy (sample size) ──");
const small = computeAbilityProfile([ev("READING", true, "EASY"), ev("READING", true, "EASY")]);
const smallSkill = small.skills.find((s) => s.skill === "READING")!;
check("1. 2/2 → accuracy 100% tapi confidence LOW",
  smallSkill.accuracy === 1 && smallSkill.confidence === "LOW");

const medium = computeAbilityProfile(
  Array.from({ length: 10 }, (_, i) => ev("READING", i < 8, i % 3 === 0 ? "HARD" : "MEDIUM"))
);
const mediumSkill = medium.skills.find((s) => s.skill === "READING")!;
check("1. 8/10 → accuracy 80% dan confidence MEDIUM (n≥5, diff coverage ≥2)",
  mediumSkill.accuracy === 0.8 && mediumSkill.confidence === "MEDIUM");

const high = computeAbilityProfile(
  Array.from({ length: 25 }, (_, i) => ev("READING", i < 21, i % 4 === 0 ? "VERY_HARD" : i % 3 === 0 ? "HARD" : "MEDIUM", i % 2 === 0 ? "READING_INFERENSI" : "READING_IDE_POKOK"))
);
const highSkill = high.skills.find((s) => s.skill === "READING")!;
check("1. 21/25 → accuracy 84% dan confidence HIGH (n≥10, diff coverage ≥3)",
  highSkill.accuracy === 0.84 && highSkill.confidence === "HIGH");

// ── 2. Difficulty awareness ──
console.log("\n── 2. Difficulty-Aware Ability ──");
const easyOnly = computeAbilityProfile(Array.from({ length: 5 }, () => ev("GRAMMAR", true, "EASY")));
const easySkill = easyOnly.skills.find((s) => s.skill === "GRAMMAR")!;
check("2. 5/5 EASY → band DIBATASI DASAR (sinyal terbatas)",
  easySkill.abilityBand === "DASAR" && (easySkill.note ?? "").includes("mudah"));

const hardAll = computeAbilityProfile(Array.from({ length: 5 }, () => ev("GRAMMAR", true, "HARD")));
const hardSkill = hardAll.skills.find((s) => s.skill === "GRAMMAR")!;
check("2. 5/5 HARD → band TINGGI (sinyal kuat)",
  hardSkill.abilityBand === "TINGGI");

check("2. 100% EASY ≠ 100% HARD (band berbeda)",
  easySkill.abilityBand !== hardSkill.abilityBand);

// ── 3. Coverage ──
console.log("\n── 3. Coverage ──");
const lowCoverage = computeAbilityProfile([ev("READING", true, "EASY", "READING_IDE_POKOK")]);
const lowCovSkill = lowCoverage.skills.find((s) => s.skill === "READING")!;
check("3. 1 soal 1 subskill → subskill coverage rendah",
  lowCovSkill.subskillCoverage < 0.5);
check("3. Coverage rendah → masuk insufficient (belum cukup terukur, bukan lemah)",
  lowCoverage.insufficient.includes("READING") || lowCovSkill.confidence === "NO_DATA" || lowCovSkill.subskillCoverage === 0);

const broad = computeAbilityProfile([
  ev("READING", true, "EASY", "READING_IDE_POKOK"),
  ev("READING", true, "MEDIUM", "READING_INFERENSI"),
  ev("READING", false, "HARD", "READING_STRUKTUR_TEKS"),
]);
const broadSkill = broad.skills.find((s) => s.skill === "READING")!;
check("3. 3 subskill teruji → coverage lebih tinggi",
  broadSkill.subskillCoverage > lowCovSkill.subskillCoverage);

// ── 4. Mastery needs evidence + coverage + consistency ──
console.log("\n── 4. Mastery ──");
check("4. masteryFor: 2 attempts → NOT_ENOUGH_EVIDENCE (bukan PROFICIENT)",
  masteryFor(2, 1, 1, 1, "INSUFFICIENT_DATA") === "NOT_ENOUGH_EVIDENCE");
check("4. masteryFor: 10 attempts tapi diff coverage 1 → NOT_ENOUGH_EVIDENCE",
  masteryFor(10, 0.9, 1, 1, "STABLE") === "NOT_ENOUGH_EVIDENCE");
check("4. masteryFor: 10 attempts + 90% + coverage + stable → PROFICIENT",
  masteryFor(10, 0.9, 2, 1, "STABLE") === "PROFICIENT");
check("4. masteryFor: 10 attempts + 90% + coverage + VARIED → DEVELOPING",
  masteryFor(10, 0.9, 2, 1, "VARIED") === "DEVELOPING");
check("4. 100% akurasi + 1 soal TIDAK mastery (dari profil)",
  computeAbilityProfile([ev("VOCABULARY", true, "EASY")]).skills.find((s) => s.skill === "VOCABULARY")!.masteryState === "NOT_ENOUGH_EVIDENCE");

// ── 5. Assessment vs Practice evidence ──
console.log("\n── 5. Assessment vs Practice ──");
const practiceOnly = computeAbilityProfile([
  ev("READING", true, "MEDIUM"), ev("READING", true, "MEDIUM"), ev("READING", true, "MEDIUM"),
  ev("GRAMMAR", true, "MEDIUM"), ev("GRAMMAR", false, "MEDIUM"),
]);
const diagEvidence = [
  ev("READING", true, "MEDIUM"), ev("READING", true, "HARD"), ev("READING", true, "HARD"),
  ev("READING", true, "MEDIUM"), ev("READING", true, "HARD"), ev("READING", true, "VERY_HARD"),
  ev("READING", true, "MEDIUM"), ev("READING", true, "HARD"),
  ev("GRAMMAR", true, "EASY"), ev("GRAMMAR", true, "MEDIUM"),
  ev("VOCABULARY", true, "EASY"), ev("VOCABULARY", false, "MEDIUM"),
];
const diagProfile = computeAbilityProfile(diagEvidence);
check("5. Practice-only (5 soal) tidak menghasilkan confidence HIGH",
  practiceOnly.overallConfidence !== "HIGH");
check("5. Diagnostic 12 soal lintas skill → overall confidence lebih tinggi",
  diagProfile.overallConfidence === "MEDIUM" || diagProfile.overallConfidence === "HIGH");
check("5. Diagnostic profile menandai skill tanpa bukti sebagai insufficient",
  diagProfile.insufficient.includes("LISTENING") || diagProfile.insufficient.includes("SPEAKING") || diagProfile.insufficient.includes("WRITING") || diagProfile.insufficient.includes("LITERATURE"));

// ── 6. normalizeEvidence ──
console.log("\n── 6. normalizeEvidence ──");
const normalized = normalizeEvidence([
  { skill: "READING", difficulty: "HARD", isCorrect: true },
  { skill: "NOT_A_SKILL", difficulty: "HARD", isCorrect: true },
  { skill: "GRAMMAR", difficulty: "MEDIUM", isCorrect: null as unknown as boolean },
  { skill: "VOCABULARY", difficulty: "EASY", isCorrect: false },
]);
check("6. Skill tidak valid dibuang", !normalized.some((e) => e.skill === "NOT_A_SKILL"));
check("6. isCorrect null dibuang", !normalized.some((e) => e.skill === "GRAMMAR"));
check("6. Evidence valid dipertahankan (2 tersisa)",
  normalized.length === 2 && normalized.every((e) => e.isCorrect === true || e.isCorrect === false));

// ── 7. Contradiction / inconsistent evidence ──
console.log("\n── 7. Contradiction & Consistency ──");
const contradictory = computeAbilityProfile([
  ev("READING", true, "EASY"), ev("READING", false, "HARD"), ev("READING", false, "HARD"), ev("READING", true, "EASY"),
  ev("READING", true, "EASY"), ev("READING", false, "HARD"),
]);
const contraSkill = contradictory.skills.find((s) => s.skill === "READING")!;
check("7. Hasil bervariasi antar difficulty → consistency VARIED",
  contraSkill.consistency === "VARIED");
check("7. VARIED → mastery tidak bisa PROFICIENT",
  contraSkill.masteryState !== "PROFICIENT");

// ── 8. Placement difficulty-aware ──
console.log("\n── 8. Placement ──");
const placementEasy = computeAbilityProfile(Array.from({ length: 10 }, () => ev("READING", true, "EASY")));
const placementHard = computeAbilityProfile(Array.from({ length: 10 }, () => ev("READING", true, "HARD")));
check("8. Placement EASY-only tidak TINGGI",
  placementEasy.placement?.band !== "TINGGI");
check("8. Placement HARD-heavy bisa TINGGI",
  placementHard.placement?.band === "TINGGI");

// ── 9. Existing profile compatibility (back-compat) ──
console.log("\n── 9. Back-compat: existing profile engine ──");
const compat = withUntestedSkills(
  computeProfileFromEvidence([item("READING", true, "MEDIUM"), item("READING", false, "HARD")]),
  ALL_SKILLS
);
check("9. computeProfileFromEvidence tetap berfungsi (STRONG/DEVELOPING/WEAK)",
  compat.perSkill.length === 7 && compat.overallAccuracy !== null);
check("9. Skill tanpa bukti tetap INSUFFICIENT_EVIDENCE (bukan WEAK)",
  compat.perSkill.find((s) => s.skill === "LISTENING")?.category === "INSUFFICIENT_EVIDENCE");

// ── 10. No false personalization ──
console.log("\n── 10. False Personalization Prevention ──");
const emptyPersonalization = buildPersonalizedAction(computeProfileFromEvidence([]));
check("10. Tanpa bukti → CONTINUE_EVIDENCE (tidak mengklaim lemah)",
  emptyPersonalization.actionType === "CONTINUE_EVIDENCE");
check("10. Tanpa bukti → title 'BC Sedang Mengenalimu'",
  emptyPersonalization.title === "BC Sedang Mengenalimu");

const oneEv = withUntestedSkills(computeProfileFromEvidence([item("READING", true, "EASY")]), ALL_SKILLS);
const oneEvAction = buildPersonalizedAction(oneEv);
check("10. 1 soal → confidence TIDAK PROFILE_CONFIDENT (tidak overclaim)",
  oneEvAction.confidence !== "PROFILE_CONFIDENT");
check("10. 1 soal → rekomendasi tidak klaim HARD (sinyal terbatas)",
  oneEvAction.recommendation !== "HARD" || oneEvAction.confidence !== "PROFILE_CONFIDENT");

// ── 11. Deterministic ──
console.log("\n── 11. Deterministic ──");
const evidenceSet = [
  ev("READING", true, "MEDIUM"), ev("READING", false, "HARD"), ev("GRAMMAR", true, "EASY"),
  ev("GRAMMAR", true, "MEDIUM"), ev("VOCABULARY", false, "HARD"), ev("VOCABULARY", true, "EASY"),
];
const run1 = computeAbilityProfile(evidenceSet);
const run2 = computeAbilityProfile(evidenceSet);
check("11. computeAbilityProfile deterministik (2 run identik)",
  JSON.stringify(run1) === JSON.stringify(run2));
check("11. profileVersion eksplisit",
  run1.profileVersion === "2.1.0");

// ── 12. strongest/focus/insufficient ──
console.log("\n── 12. Profile outputs ──");
const mixed = computeAbilityProfile([
  ev("READING", true, "HARD"), ev("READING", true, "HARD"), ev("READING", true, "HARD"),
  ev("GRAMMAR", false, "MEDIUM"), ev("GRAMMAR", false, "MEDIUM"), ev("GRAMMAR", false, "MEDIUM"),
  ev("VOCABULARY", true, "EASY"),
]);
check("12. strongest berisi skill dengan sinyal tinggi",
  mixed.strongest.includes("READING"));
check("12. focus berisi skill dengan sinyal dasar (ada bukti)",
  mixed.focus.includes("GRAMMAR") || mixed.focus.includes("VOCABULARY"));
check("12. insufficient berisi skill tanpa bukti",
  mixed.insufficient.length > 0 && mixed.insufficient.includes("LISTENING"));

// ── 13. abilityBandFor edge cases ──
console.log("\n── 13. abilityBandFor ──");
check("13. null accuracy → null band", abilityBandFor(null, "HARD") === null);
check("13. EASY-only → DASAR walau akurasi tinggi", abilityBandFor(1, "EASY") === "DASAR");
check("13. HARD + 0.8 → TINGGI", abilityBandFor(0.8, "HARD") === "TINGGI");
check("13. HARD + 0.6 → MENENGAH", abilityBandFor(0.6, "HARD") === "MENENGAH");
check("13. MEDIUM + 0.9 → TINGGI", abilityBandFor(0.9, "MEDIUM") === "TINGGI");

// ── 14. skillConfidenceFor ──
console.log("\n── 14. skillConfidenceFor ──");
check("14. 0 attempts → NO_DATA", skillConfidenceFor(0, 0, 0, null) === "NO_DATA");
check("14. 2 attempts → LOW", skillConfidenceFor(2, 1, 1, 1) === "LOW");
check("14. 6 attempts + diff coverage 2 + subskill → MEDIUM",
  skillConfidenceFor(6, 2, 0.2, 0.8) === "MEDIUM");
check("14. 12 attempts + diff 3 + subskill + acc 0.85 → HIGH",
  skillConfidenceFor(12, 3, 0.2, 0.85) === "HIGH");
check("14. 12 attempts tapi diff coverage 1 → tetap LOW (bukan HIGH)",
  skillConfidenceFor(12, 1, 0.2, 0.85) === "LOW");

console.log(`\n${"=".repeat(50)}`);
console.log(`Hasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
