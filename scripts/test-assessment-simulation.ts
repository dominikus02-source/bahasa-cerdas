/**
 * BC ASSESSMENT ENGINE 2.2 — SYNTHETIC STUDENT SIMULATION (GOLDEN TESTS).
 * Unit murni, tanpa DB. Run: npm run test:assessment-simulation
 *
 * Memvalidasi bahwa scoring yang benar secara matematis juga menghasilkan
 * profil yang masuk akal: tidak overclaim, tidak over-penalize, tidak absurd.
 */
import { computeAbilityProfile } from "../lib/diagnostic/ability";
import { buildPersonalizedAction } from "../lib/diagnostic/personalization";
import { computeProfileFromEvidence, withUntestedSkills } from "../lib/diagnostic/profile";
import { ARCHETYPES } from "./fixtures/assessment-archetypes";
import type { DiagnosticEvidenceDetail } from "../lib/diagnostic/types";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

console.log("\nBC ASSESSMENT ENGINE 2.2 — SYNTHETIC STUDENT SIMULATION\n");

const ALL_SKILLS = ["READING", "WRITING", "LISTENING", "SPEAKING", "GRAMMAR", "VOCABULARY", "LITERATURE"];

/** Profile untuk archetype evidence (array) atau timeline (baseline+recent). */
function profileFor(key: string) {
  const fixture = ARCHETYPES[key];
  if (Array.isArray(fixture)) {
    return { profile: computeAbilityProfile(fixture), timeline: false };
  }
  const combined = [...fixture.baseline, ...fixture.recent];
  return {
    profile: computeAbilityProfile(combined, { baseline: fixture.baseline, recent: fixture.recent }),
    timeline: true,
  };
}

// ── S1: semua pemula ──
console.log("── S1: Semua skill pemula ──");
const s1 = profileFor("S1").profile;
check("S1: overallConfidence LOW (bukan HIGH)", s1.overallConfidence === "LOW" || s1.overallConfidence === "NO_DATA");
check("S1: placement tidak TINGGI", s1.placement?.band !== "TINGGI");
check("S1: tidak ada mastery PROFICIENT", !s1.skills.some((s) => s.masteryState === "PROFICIENT"));
check("S1: ada skill yang masuk insufficient (belum terukur)", s1.insufficient.length > 0);

// ── S2: semua kuat ──
console.log("\n── S2: Semua skill kuat ──");
const s2 = profileFor("S2").profile;
check("S2: overallConfidence HIGH (banyak bukti, coverage luas)", s2.overallConfidence === "HIGH");
check("S2: strongest tidak kosong", s2.strongest.length > 0);
check("S2: placement TINGGI", s2.placement?.band === "TINGGI");
check("S2: mastery PROFICIENT di skill kuat", s2.skills.some((s) => s.masteryState === "PROFICIENT"));

// ── S3: Reading kuat, Grammar lemah ──
console.log("\n── S3: Reading kuat, Grammar lemah ──");
const s3 = profileFor("S3").profile;
check("S3: strongest berisi READING", s3.strongest.includes("READING"));
check("S3: focus berisi GRAMMAR", s3.focus.includes("GRAMMAR"));

// ── S4: Grammar kuat, Vocabulary lemah ──
console.log("\n── S4: Grammar kuat, Vocabulary lemah ──");
const s4 = profileFor("S4").profile;
check("S4: strongest berisi GRAMMAR", s4.strongest.includes("GRAMMAR"));
check("S4: focus berisi VOCABULARY", s4.focus.includes("VOCABULARY"));

// ── S5: akurasi tinggi, evidence sedikit ──
console.log("\n── S5: Akurasi tinggi, evidence sedikit ──");
const s5 = profileFor("S5").profile;
check("S5: accuracy 100% tapi overallConfidence BUKAN HIGH", s5.overallConfidence !== "HIGH");
check("S5: mastery tidak PROFICIENT (2 bukti)", s5.skills.find((s) => s.skill === "READING")?.masteryState !== "PROFICIENT");

// ── S6: akurasi rendah, evidence banyak ──
console.log("\n── S6: Akurasi rendah, evidence banyak ──");
const s6 = profileFor("S6").profile;
const s6Reading = s6.skills.find((s) => s.skill === "READING")!;
check("S6: accuracy ≈ 0.4 (jujur)", s6Reading.accuracy !== null && Math.abs(s6Reading.accuracy - 0.4) < 0.05);
check("S6: confidence tidak overclaim HIGH (satu skill saja)", s6.overallConfidence !== "HIGH");
check("S6: mastery DEVELOPING (bukan PROFICIENT)", s6Reading.masteryState !== "PROFICIENT");

// ── S7: Easy kuat, Medium lemah ──
console.log("\n── S7: Easy kuat, Medium lemah ──");
const s7 = profileFor("S7").profile;
const s7Grammar = s7.skills.find((s) => s.skill === "GRAMMAR")!;
check("S7: konsistensi VARIED (Easy 100% vs Medium 20%)", s7Grammar.consistency === "VARIED");
check("S7: mastery BUKAN PROFICIENT (kontradiksi antar difficulty)", s7Grammar.masteryState !== "PROFICIENT");

// ── S8: Easy lemah, Hard kuat ──
console.log("\n── S8: Easy lemah, Hard kuat ──");
const s8 = profileFor("S8").profile;
const s8Grammar = s8.skills.find((s) => s.skill === "GRAMMAR")!;
check("S8: mastery BUKAN PROFICIENT (pola tidak konsisten)", s8Grammar.masteryState !== "PROFICIENT");

// ── S9–S12: baseline vs recent ──
console.log("\n── S9–S12: Baseline vs Recent ──");
const s9 = profileFor("S9").profile;
check("S9: meningkat → signal CURRENT (bukan CONTRADICTED)", s9.reassessmentSignal === "CURRENT");
const s10 = profileFor("S10").profile;
check("S10: menurun → signal CONTRADICTED", s10.reassessmentSignal === "CONTRADICTED");
const s11 = profileFor("S11").profile;
check("S11: baseline kuat + recent lemah → CONTRADICTED (tidak overwrite naif)", s11.reassessmentSignal === "CONTRADICTED");
const s12 = profileFor("S12").profile;
check("S12: baseline lemah + recent kuat → CURRENT (membaik)", s12.reassessmentSignal === "CURRENT");

// ── S13: satu skill terukur ──
console.log("\n── S13: Hanya satu skill terukur ──");
const s13 = profileFor("S13").profile;
check("S13: coverage.skills rendah (< 0.5)", s13.coverage.skills < 0.5);
check("S13: overallConfidence BUKAN HIGH (skill coverage rendah)", s13.overallConfidence !== "HIGH");

// ── S14: banyak evidence, subskill coverage buruk ──
console.log("\n── S14: Banyak evidence, subskill coverage buruk ──");
const s14 = profileFor("S14").profile;
check("S14: coverage.subskills rendah (< 0.3)", s14.coverage.subskills < 0.3);
check("S14: overallConfidence BUKAN HIGH (subskill coverage buruk)", s14.overallConfidence !== "HIGH");

// ── S15: hampir sempurna tapi hanya EASY ──
console.log("\n── S15: Hampir sempurna, hanya EASY ──");
const s15 = profileFor("S15").profile;
const s15Grammar = s15.skills.find((s) => s.skill === "GRAMMAR")!;
check("S15: ability DIBATASI DASAR (sinyal mudah terbatas)", s15Grammar.abilityBand === "DASAR");
check("S15: mastery BUKAN PROFICIENT (difficulty coverage 1)", s15Grammar.masteryState !== "PROFICIENT");

// ── S16: 70% tersebar EASY/MEDIUM/HARD ──
console.log("\n── S16: 70% merata di semua difficulty ──");
const s16 = profileFor("S16").profile;
const s16Reading = s16.skills.find((s) => s.skill === "READING")!;
check("S16: accuracy ≈ 0.7", s16Reading.accuracy !== null && Math.abs(s16Reading.accuracy - 0.7) < 0.05);
check("S16: difficulty coverage penuh (3)", s16Reading.difficultyCoverage >= 3);
check("S16: band MENENGAH/TINGGI (difficulty tercapai)", s16Reading.abilityBand === "MENENGAH" || s16Reading.abilityBand === "TINGGI");

// ── Personalization sanity ──
console.log("\n── Personalization sanity ──");
function diagProfile(key: string) {
  const fixture = ARCHETYPES[key];
  if (!Array.isArray(fixture)) return null;
  const details: DiagnosticEvidenceDetail[] = fixture.map((e) => ({
    skill: e.skill,
    difficulty: e.difficulty,
    isCorrect: e.isCorrect,
  }));
  return withUntestedSkills(computeProfileFromEvidence(details), ALL_SKILLS);
}
const s3Action = buildPersonalizedAction(diagProfile("S3")!);
check("S3 (Reading kuat, Grammar lemah) → rekomendasi GRAMMAR (terlemah berbukti)",
  s3Action.targetSkill === "GRAMMAR" && s3Action.title.includes("Tata Bahasa"));
const s4Action = buildPersonalizedAction(diagProfile("S4")!);
check("S4 → rekomendasi mengarah ke VOCABULARY",
  s4Action.targetSkill === "VOCABULARY");
const s1Action = buildPersonalizedAction(diagProfile("S1")!);
check("S1 (bukti tipis) → confidence BUKAN PROFILE_CONFIDENT (tidak overclaim)",
  s1Action.confidence !== "PROFILE_CONFIDENT");
const s2Action = buildPersonalizedAction(diagProfile("S2")!);
check("S2 (semua kuat) → tidak menyuruh baseline ulang",
  s2Action.actionType !== "CONTINUE_EVIDENCE" && s2Action.targetSkill !== null);

// Kasus misi: Reading LEMAH, Grammar KUAT → rekomendasi harus READING.
const readingWeakGrammarStrong = withUntestedSkills(
  computeProfileFromEvidence([
    { skill: "READING", difficulty: "EASY", isCorrect: false },
    { skill: "READING", difficulty: "MEDIUM", isCorrect: false },
    { skill: "READING", difficulty: "MEDIUM", isCorrect: true },
    { skill: "READING", difficulty: "EASY", isCorrect: false },
    { skill: "READING", difficulty: "HARD", isCorrect: false },
    { skill: "GRAMMAR", difficulty: "MEDIUM", isCorrect: true },
    { skill: "GRAMMAR", difficulty: "HARD", isCorrect: true },
    { skill: "GRAMMAR", difficulty: "MEDIUM", isCorrect: true },
    { skill: "GRAMMAR", difficulty: "HARD", isCorrect: true },
  ]),
  ALL_SKILLS
);
const rwgsAction = buildPersonalizedAction(readingWeakGrammarStrong);
check("Reading lemah + Grammar kuat → rekomendasi READING (bukan random)",
  rwgsAction.targetSkill === "READING");

// Kasus misi: SEMUA skill tanpa bukti → continuation, bukan 'latih skill X'.
const allEmptyAction = buildPersonalizedAction(computeProfileFromEvidence([]));
check("Semua skill tanpa bukti → CONTINUE_EVIDENCE, bukan 'latih skill X'",
  allEmptyAction.actionType === "CONTINUE_EVIDENCE" && allEmptyAction.targetSkill === null);

console.log(`\n${"=".repeat(50)}`);
console.log(`Hasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
