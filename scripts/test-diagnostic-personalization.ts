/**
 * STEP 4E.2 — DIAGNOSTIC → PERSONALIZED LEARNING ACTIVATION
 * Test fokus: lapisan personalisasi (murni) + wiring server + UI states.
 * Statik + unit murni (tanpa DB). Jangan melemahkan test lain.
 *
 * Run: npm run test:diagnostic-personalization
 */
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");

// ── Unit murni: personalization engine ──
import { computeProfileFromEvidence, withUntestedSkills, computeDiagnosticProfile } from "../lib/diagnostic/profile";
import {
  buildPersonalizedAction,
  pickTargetSkill,
  explanationFor,
  type PersonalizedLearningAction,
} from "../lib/diagnostic/personalization";
import { DIAGNOSTIC_CONFIDENCE } from "../lib/diagnostic/config";
import type { DiagnosticEvidenceDetail, DiagnosticProfile } from "../lib/diagnostic/types";

function evidence(skill: string, isCorrect: boolean, difficulty: "EASY" | "MEDIUM" | "HARD"): DiagnosticEvidenceDetail {
  return { skill, isCorrect, difficulty };
}

/** Profil A: Reading STRONG (2/2), Grammar WEAK (1/2 → 0.5), Vocabulary DEVELOPING (2/3). */
function profileA(): DiagnosticProfile {
  return withUntestedSkills(
    computeProfileFromEvidence([
      evidence("READING", true, "MEDIUM"),
      evidence("READING", true, "HARD"),
      evidence("GRAMMAR", true, "EASY"),
      evidence("GRAMMAR", false, "MEDIUM"),
      evidence("VOCABULARY", true, "EASY"),
      evidence("VOCABULARY", true, "MEDIUM"),
      evidence("VOCABULARY", false, "HARD"),
    ]),
    ["READING", "WRITING", "LISTENING", "SPEAKING", "GRAMMAR", "VOCABULARY", "LITERATURE"]
  );
}

/** Profil B: Reading WEAK (1/2 → 0.5), Grammar STRONG (2/2). */
function profileB(): DiagnosticProfile {
  return withUntestedSkills(
    computeProfileFromEvidence([
      evidence("READING", true, "EASY"),
      evidence("READING", false, "MEDIUM"),
      evidence("GRAMMAR", true, "MEDIUM"),
      evidence("GRAMMAR", true, "HARD"),
    ]),
    ["READING", "WRITING", "LISTENING", "SPEAKING", "GRAMMAR", "VOCABULARY", "LITERATURE"]
  );
}

let passed = 0;
let failed = 0;
function check(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      passed++;
      console.log(`  ✅ ${name}`);
    } else {
      failed++;
      console.log(`  ❌ ${name}`);
    }
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name} — ${(e as Error).message}`);
  }
}

const personalization = read("lib/diagnostic/personalization.ts");
const adaptiveRoute = read("app/api/player/adaptive-practice/route.ts");
const diagnosticRoute = read("app/api/player/diagnostic/route.ts");
const homeData = read("components/student-home/home-data.tsx");
const card = read("components/student-home/ContinueLearningCard.tsx");

function main() {
  console.log("\n📋 STEP 4E.2 — DIAGNOSTIC → PERSONALIZED LEARNING");
  console.log("=".repeat(60));

  // 1. no diagnostic → diagnostic CTA
  console.log("\n── State A: tanpa diagnostik → CTA Tes Awal ──");
  check("1. home-data single-source tetap fetch adaptive + diagnostic preview",
    () => homeData.includes("/api/player/adaptive-practice?mode=preview") && homeData.includes("/api/player/diagnostic?mode=preview"));
  check("1. STATE A: kartu merender CTA Tes Awal (Mulai Tes Awal)",
    () => card.includes("Mulai Tes Awal") && card.includes("Kenali Kemampuanmu"));

  // 2. completed diagnostic → personalized CTA
  console.log("\n── State B: diagnostik selesai → profil siap ──");
  check("2. STATE B: judul 'Profil Belajarmu Sudah Siap' ada di kartu",
    () => card.includes("Profil Belajarmu Sudah Siap"));
  check("2. STATE B: CTA 'Mulai Latihan Personal'", () => card.includes("Mulai Latihan Personal"));
  check("2. adaptive preview membawa diagnosticCompleted (server-derived)",
    () => adaptiveRoute.includes("diagnosticCompleted") && adaptiveRoute.includes("hasCompletedDiagnostic"));

  // 3. no evidence ≠ weak
  console.log("\n── Jujur: no evidence ≠ lemah ──");
  check("3. profil kosong → INSUFFICIENT_EVIDENCE (bukan WEAK)",
    () => computeProfileFromEvidence([]).perSkill.length === 0);
  check("3. target null untuk profil tanpa bukti (tidak mengarang skill)",
    () => {
      const action = buildPersonalizedAction(computeDiagnosticProfile([]));
      return action.targetSkill === null && action.actionType === "CONTINUE_EVIDENCE";
    });

  // 4. insufficient evidence wording
  check("4. kata 'lemah' tidak muncul untuk INSUFFICIENT",
    () => !explanationFor({ skill: "GRAMMAR", label: "Tata Bahasa", attempts: 0, correct: 0, accuracy: null, category: "INSUFFICIENT_EVIDENCE", confidence: DIAGNOSTIC_CONFIDENCE.INSUFFICIENT_EVIDENCE, band: null, evidenceCount: 0, strongestEvidence: null, recommendation: null }).includes("lemah"));

  // 5. profile produces target skill
  console.log("\n── Target skill dari profil ──");
  check("5. profil A → target = Grammar (terlemah)", () => buildPersonalizedAction(profileA()).targetSkill === "GRAMMAR");
  check("5. profil A → label 'Tata Bahasa'", () => buildPersonalizedAction(profileA()).targetSkillLabel === "Tata Bahasa");

  // 6. target skill server-derived (murni, tanpa input klien)
  check("6. engine menerima hanya profile/source — tanpa parameter skill klien",
    () => personalization.includes("profile: DiagnosticProfile") && !/function buildPersonalizedAction\([^)]*skill/i.test(personalization));

  // 7. deterministic
  console.log("\n── Deterministik ──");
  check("7. dua pemanggilan profil sama → hasil identik",
    () => JSON.stringify(buildPersonalizedAction(profileA())) === JSON.stringify(buildPersonalizedAction(profileA())));

  // 8. Reading strong + Grammar weak → Grammar
  check("8. A (Reading STRONG, Grammar WEAK) → Grammar practice",
    () => {
      const a = profileA();
      const action = buildPersonalizedAction(a);
      return action.targetSkill === "GRAMMAR" && action.reasonCode === "WEAK_SKILL";
    });

  // 9. Reading weak + Grammar strong → Reading
  check("9. B (Reading WEAK, Grammar STRONG) → Reading practice",
    () => {
      const action = buildPersonalizedAction(profileB());
      return action.targetSkill === "READING" && action.reasonCode === "WEAK_SKILL";
    });

  // 10. all insufficient → continue evidence gathering
  console.log("\n── Semua belum terukur ──");
  check("10. profil tanpa bukti → CONTINUE_EVIDENCE + judul 'BC Masih Mengenali'",
    () => {
      const action = buildPersonalizedAction(computeDiagnosticProfile([]));
      return action.actionType === "CONTINUE_EVIDENCE" && action.title === "BC Masih Mengenali";
    });
  check("10. kartu STATE D 'BC Masih Mengenali' tampil saat tanpa target",
    () => card.includes("BC Masih Mengenali") && card.includes("belum cukup terukur"));

  // 11. diagnostic evidence reaches LearnerState
  console.log("\n── Wiring: evidence → state → adaptive ──");
  check("11. learner-state aggregate tanpa filter source (diagnostic ikut terhitung)",
    () => read("lib/learner-state/service.ts").includes('FROM "LearningEvidence" e') && !read("lib/learner-state/service.ts").includes("reasonCode"));

  // 12. adaptive consumes LearnerState
  check("12. adaptive route memanggil getLearnerState + selectAdaptivePractice",
    () => adaptiveRoute.includes("getLearnerState(userId)") && adaptiveRoute.includes("selectAdaptivePractice"));

  // 13. adaptive target reflects available evidence (selector WEAK_SKILL ≥5 attempts)
  check("13. selector: WEAK_SKILL hanya untuk skill attemptCount ≥ 5 (threshold 4D dijaga)",
    () => read("lib/adaptive-practice/selector.ts").includes("attemptCount >= 5"));

  // 14. selector reason remains honest
  check("14. selector tetap memakai reason asli (WEAK_SKILL/PRACTICE_GAP/NO_DATA)",
    () => {
      const selector = read("lib/adaptive-practice/selector.ts");
      return selector.includes("WEAK_SKILL") && selector.includes("PRACTICE_GAP") && selector.includes("NO_DATA");
    });

  // 15-18. no client-controlled fields
  console.log("\n── Server-authoritative ──");
  const clientCalls = [card, homeData];
  check("15. klien tidak pernah mengirim skill", () => clientCalls.every((c) => !/body:\s*JSON\.stringify\(\{[^}]*skill/i.test(c)));
  check("16. klien tidak pernah mengirim difficulty", () => clientCalls.every((c) => !/JSON\.stringify\(\{[^}]*difficulty/i.test(c)));
  check("17. klien tidak pernah mengirim level/score/confidence",
    () => clientCalls.every((c) => !/JSON\.stringify\(\{[^}]*(level|score|confidence)/i.test(c)));
  check("18. klien tidak pernah mengirim XP/coin/reasonCode",
    () => clientCalls.every((c) => !/JSON\.stringify\(\{[^}]*(\bx[pP]|coin|reasonCode)/i.test(c)));

  // 19. no diagnostic XP
  console.log("\n── Reward & schema ──");
  check("19. route diagnostik tanpa awardXp", () => !diagnosticRoute.includes("awardXp"));

  // 20. no coin
  check("20. route diagnostik tanpa addCoin",
    () => !diagnosticRoute.includes("addCoin") && !diagnosticRoute.includes("awardCoin"));

  // 21. no schema migration
  check("21. prisma/ 0 diff", () => execSync(`git diff --name-only HEAD -- prisma/`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0);

  // 22. no protected-zone changes
  console.log("\n── Protected zones ──");
  check("22. protected zones 0 diff (prisma, gamification, learning-loop, engines, adaptive core, apk, coins)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts lib/adaptive-practice/ lib/learner-state/`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return diff.length === 0;
    });
  check("22. selector adaptive tidak diubah (0 diff)", () => {
    const d = execSync(`git diff --name-only HEAD -- lib/adaptive-practice/selector.ts`, { encoding: "utf8", cwd: process.cwd() }).trim();
    return d.length === 0;
  });

  // 23. existing diagnostic tests remain green
  console.log("\n── Regression (dijalankan terpisah) ──");
  check("23. test-diagnostic-assessment.ts & test-diagnostic-4e1.ts TIDAK diubah (0 diff)",
    () => {
      const d = execSync(`git diff --name-only HEAD -- scripts/test-diagnostic-assessment.ts scripts/test-diagnostic-4e1.ts`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return d.length === 0;
    });

  // 24. existing adaptive tests remain green
  check("24. test adaptive TIDAK diubah (0 diff)",
    () => {
      const d = execSync(`git diff --name-only HEAD -- scripts/test-adaptive-practice.ts scripts/test-adaptive-reward-hardening.ts scripts/test-adaptive-simulation.ts`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return d.length === 0;
    });

  // 25. Student Home preview single-source
  console.log("\n── Student Home single-source ──");
  check("25. preview tetap difetch HANYA di home-data.tsx (adaptive + diagnostic)",
    () => {
      const homeDir = execSync(`rg -l "adaptive-practice\\\\?mode=preview|diagnostic\\\\?mode=preview" components/student-home/ 2>/dev/null || true`, { encoding: "utf8", cwd: process.cwd() });
      const files = homeDir.trim().split("\n").filter(Boolean);
      return files.length === 1 && files[0].includes("home-data.tsx");
    });

  console.log("\n" + "=".repeat(60));
  console.log(`Hasil: ${passed} lulus, ${failed} gagal`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main();
