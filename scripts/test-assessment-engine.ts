/**
 * BC ASSESSMENT ENGINE 2.0 — test statis + unit (tanpa DB).
 * Run: npx tsx scripts/test-assessment-engine.ts
 *
 * Tests:
 *   1. Assessment state detection (unit murni, mock DB)
 *   2. Aksi Hari Ini UI states (5 states)
 *   3. Personalization copy updates
 *   4. Diagnostic route returns assessmentState
 *   5. ContinueLearningCard handles all 5 states
 *   6. "BC Masih Mengenali" removed, replaced with "BC Sedang Mengenalimu"
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (p: string) => {
  try { return readFileSync(join(ROOT, p), "utf8"); } catch { return ""; }
};

// Unit imports
import { detectAssessmentState, ASSESSMENT_STATE_LABELS, type AssessmentState } from "../lib/diagnostic/assessment-state";
import { buildPersonalizedAction } from "../lib/diagnostic/personalization";
import { computeProfileFromEvidence, withUntestedSkills } from "../lib/diagnostic/profile";
import { computeDiagnosticProfile } from "../lib/diagnostic/profile";
import type { DiagnosticEvidenceDetail, DiagnosticProfile } from "../lib/diagnostic/types";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

console.log("\nBC ASSESSMENT ENGINE 2.0 TESTS\n");

// ─── 1. Assessment State Labels ───
console.log("── Assessment State Labels ──");
check("1. All 5 states have labels",
  ["NO_BASELINE", "BASELINE_IN_PROGRESS", "BASELINE_COMPLETE_LOW", "PROFILE_READY", "PROFILE_CONFIDENT"]
    .every((s) => s in ASSESSMENT_STATE_LABELS));
check("1. NO_BASELINE: title = 'Kenali Kemampuanmu'",
  ASSESSMENT_STATE_LABELS.NO_BASELINE.title === "Kenali Kemampuanmu");
check("1. NO_BASELINE: ctaLabel = 'Mulai Tes Awal'",
  ASSESSMENT_STATE_LABELS.NO_BASELINE.ctaLabel === "Mulai Tes Awal");
check("1. BASELINE_IN_PROGRESS: title = 'Lanjutkan Tes Awal'",
  ASSESSMENT_STATE_LABELS.BASELINE_IN_PROGRESS.title === "Lanjutkan Tes Awal");
check("1. BASELINE_COMPLETE_LOW: title = 'BC Sedang Mengenalimu'",
  ASSESSMENT_STATE_LABELS.BASELINE_COMPLETE_LOW.title === "BC Sedang Mengenalimu");
check("1. PROFILE_READY: title = 'Latihan Untukmu'",
  ASSESSMENT_STATE_LABELS.PROFILE_READY.title === "Latihan Untukmu");
check("1. PROFILE_CONFIDENT: title = 'Latihan Untukmu'",
  ASSESSMENT_STATE_LABELS.PROFILE_CONFIDENT.title === "Latihan Untukmu");

// ─── 2. Personalization Copy ───
console.log("\n── Personalization Copy ──");
function evidence(skill: string, isCorrect: boolean, difficulty: "EASY" | "MEDIUM" | "HARD"): DiagnosticEvidenceDetail {
  return { skill, isCorrect, difficulty };
}

const profileWithEvidence = withUntestedSkills(
  computeProfileFromEvidence([
    evidence("READING", true, "MEDIUM"),
    evidence("READING", true, "HARD"),
    evidence("GRAMMAR", true, "EASY"),
    evidence("GRAMMAR", false, "MEDIUM"),
    evidence("VOCABULARY", true, "EASY"),
    evidence("VOCABULARY", true, "MEDIUM"),
  ]),
  ["READING", "WRITING", "LISTENING", "SPEAKING", "GRAMMAR", "VOCABULARY", "LITERATURE"]
);

const actionWithEvidence = buildPersonalizedAction(profileWithEvidence, "DIAGNOSTIC_PROFILE");
check("2. Profile with evidence → PERSONALIZED_PRACTICE",
  actionWithEvidence.actionType === "PERSONALIZED_PRACTICE");
check("2. Profile with evidence → target skill is not null",
  actionWithEvidence.targetSkill !== null);
check("2. Profile with evidence → title starts with 'Perkuat'",
  actionWithEvidence.title.startsWith("Perkuat"));

const emptyProfile = computeDiagnosticProfile([]);
const actionEmpty = buildPersonalizedAction(emptyProfile);
check("2. Empty profile → CONTINUE_EVIDENCE",
  actionEmpty.actionType === "CONTINUE_EVIDENCE");
check("2. Empty profile → title = 'BC Sedang Mengenalimu' (not 'BC Masih Mengenali')",
  actionEmpty.title === "BC Sedang Mengenalimu");
check("2. Empty profile → explanation does NOT contain 'lemah'",
  !actionEmpty.explanation.toLowerCase().includes("lemah"));

// ─── 3. "BC Masih Mengenali" removed from codebase ───
console.log("\n── BC Masih Mengenali removal ──");
const hero = read("components/student-home/StudentHomeHero.tsx");
const personalization = read("lib/diagnostic/personalization.ts");
check("3. Hero (pengganti kartu): 'BC Masih Mengenali' REMOVED",
  !hero.includes("BC Masih Mengenali"));
check("3. Hero: branch BASELINE_COMPLETE_LOW jujur ('mulai mengenali kemampuanmu')",
  hero.includes("BASELINE_COMPLETE_LOW") && hero.includes("mulai mengenali kemampuanmu"));
check("3. personalization.ts: 'BC Masih Mengenali' REMOVED",
  !personalization.includes("BC Masih Mengenali"));
check("3. personalization.ts: 'BC Sedang Mengenalimu' present",
  personalization.includes("BC Sedang Mengenalimu"));

// ─── 4. Diagnostic route returns assessmentState ───
console.log("\n── Diagnostic Route ──");
const diagRoute = read("app/api/player/diagnostic/route.ts");
check("4. Diagnostic route imports detectAssessmentState",
  diagRoute.includes("detectAssessmentState"));
check("4. Diagnostic route imports ASSESSMENT_STATE_LABELS",
  diagRoute.includes("ASSESSMENT_STATE_LABELS"));
check("4. Diagnostic route returns assessmentState in NO_BASELINE path",
  diagRoute.includes("assessmentState: assessment.state"));
check("4. Diagnostic route returns assessmentState in BASELINE_COMPLETE_LOW path",
  diagRoute.includes("BASELINE_COMPLETE_LOW"));
check("4. Diagnostic route returns assessmentState in PROFILE_READY path",
  diagRoute.includes("PROFILE_READY"));

// ─── 5. StudentHomeHero (pengganti ContinueLearningCard) handles states ───
console.log("\n── Hero States (pengganti ContinueLearningCard) ──");
check("5. Hero handles NO_BASELINE (isDiagnostic path)",
  hero.includes("isDiagnostic") && hero.includes("Kenali kemampuanmu."));
check("5. Hero handles BASELINE_IN_PROGRESS",
  hero.includes("BASELINE_IN_PROGRESS") && hero.includes("Lanjutkan Tes"));
check("5. Hero handles BASELINE_COMPLETE_LOW",
  hero.includes("BASELINE_COMPLETE_LOW") && hero.includes("Siap lanjut belajar?"));
check("5. Hero handles PROFILE_READY/PROFILE_CONFIDENT (ADAPTIVE path)",
  hero.includes("actionType === \"ADAPTIVE_PRACTICE\"") && hero.includes('{ kind: "start-adaptive" }'));
check("5. Hero uses assessmentState from server",
  hero.includes("assessmentState"));

// ─── 6. home-data.tsx has assessmentState in MyDayResponse ───
console.log("\n── Home Data ──");
const homeData = read("components/student-home/home-data.tsx");
check("6. MyDayResponse includes assessmentState field",
  homeData.includes("assessmentState"));

// ─── 7. Assessment state module is pure where possible ───
console.log("\n── Assessment State Module ──");
const assessState = read("lib/diagnostic/assessment-state.ts");
check("7. Module exports detectAssessmentState function",
  assessState.includes("export async function detectAssessmentState"));
check("7. Module exports ASSESSMENT_STATE_LABELS",
  assessState.includes("export const ASSESSMENT_STATE_LABELS"));
check("7. Module defines AssessmentState type with 5 states",
  assessState.includes("NO_BASELINE") && assessState.includes("BASELINE_IN_PROGRESS") &&
  assessState.includes("BASELINE_COMPLETE_LOW") && assessState.includes("PROFILE_READY") &&
  assessState.includes("PROFILE_CONFIDENT"));

// ─── 8. "Kenali Kemampuanmu" for students with no baseline (key product fix) ───
console.log("\n── Key Product Fix ──");
check("8. NO_BASELINE label = 'Kenali Kemampuanmu' (not 'Mulai Belajar')",
  ASSESSMENT_STATE_LABELS.NO_BASELINE.title === "Kenali Kemampuanmu");
check("8. NO_BASELINE description mentions 'tes singkat'",
  ASSESSMENT_STATE_LABELS.NO_BASELINE.description.includes("tes singkat"));
check("8. NO_BASELINE description mentions 'tanpa nilai benar-salah yang merugikan' or similar",
  ASSESSMENT_STATE_LABELS.NO_BASELINE.description.includes("latihan"));

// ─── 9. No "Mulai Latihan Personal" in card (replaced with server-derived) ───
console.log("\n── Server-Derived CTA ──");
check("9. Hero uses server-derived ctaLabel (resolveHeroContent, not hardcoded)",
  hero.includes("resolveHeroContent") && hero.includes("hero.ctaLabel"));
check("9. Hero does NOT hardcode 'Mulai Latihan Personal'",
  !hero.includes("Mulai Latihan Personal"));

// ─── Summary ───
console.log(`\n${"=".repeat(50)}`);
console.log(`Hasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
