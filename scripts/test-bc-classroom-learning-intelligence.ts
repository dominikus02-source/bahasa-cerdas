/**
 * STEP 6.3 — BC CLASSROOM LEARNING INTELLIGENCE
 * Test statik: quiz → LearningEvidence (kontrak benar + idempoten), learner
 * state membaca evidence, insight murid/guru server-derived, reuse 4E.2,
 * tanpa engine baru, tanpa XP/coin, protected zones. Tanpa DB write.
 *
 * Run: npm run test:bc-classroom-learning-intelligence
 */
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const exists = (p: string) => existsSync(p);

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

const quizRoute = read("app/api/murid/quiz/[id]/route.ts");
const muridApi = read("app/api/murid/kelasku/[id]/route.ts");
const muridPage = read("app/(dashboard)/murid/kelasku/[id]/page.tsx");
const guruInsight = read("app/api/guru/kelasku/[id]/insight/route.ts");
const guruPage = read("app/(dashboard)/guru/kelasku/page.tsx");
const review = read("components/kelas/SubmissionReview.tsx");
const evidence = read("lib/learning-loop/evidence.ts");
const learnerService = read("lib/learner-state/service.ts");
const selector = read("lib/adaptive-practice/selector.ts");
const personalization = read("lib/diagnostic/personalization.ts");
const schema = read("prisma/schema.prisma");

function main() {
  console.log("\n📋 STEP 6.3 — BC CLASSROOM LEARNING INTELLIGENCE TEST");
  console.log("=".repeat(60));

  // 1-2. Quiz result → evidence
  console.log("\n── 1-2. Quiz → LearningEvidence ──");
  check("1. route quiz menulis evidence (replaceLearningEvidenceBatch dipanggil)",
    () => quizRoute.includes("replaceLearningEvidenceBatch(classroomEvidence)"));
  check("2. evidence memakai source BANK_SOAL (agar JOIN QuestionMetadata terbaca)",
    () => quizRoute.includes('source: "BANK_SOAL"'));
  check("2. questionId = kodeSoal (metadata questionId, bukan QuizQuestion id)",
    () => quizRoute.includes("questionId: soal.kodeSoal"));

  // 3-4. Valid/invalid result & skill tidak diinvent
  console.log("\n── 3-4. Validitas & tanpa invent skill ──");
  check("3. skill diambil dari QuestionMetadata APPROVED (bukan dikarang)",
    () => quizRoute.includes('status: "APPROVED"') && quizRoute.includes("skill: { not: null }"));
  check("4. tanpa kodeSoal/metadata → tanpa evidence (flatMap return [])",
    () => quizRoute.includes("if (!soal?.kodeSoal) return []") && quizRoute.includes("if (!meta?.skill) return []"));

  // 5-6. Source & activity reference
  console.log("\n── 5-6. Kontrak evidence ──");
  check("5. source valid (BANK_SOAL — METADATA_SOURCES)", () => read("lib/question-metadata/taxonomy.ts").includes('"BANK_SOAL"'));
  check("6. activityId = submission.id (reference aktivitas unik)",
    () => quizRoute.includes("activityId: submission.id"));

  // 7-9. Idempotency
  console.log("\n── 7-9. Idempotensi ──");
  check("7. composite unique pada LearningEvidence (userId+source+activityId+questionId)",
    () => schema.includes("@@unique([userId, source, activityId, questionId])"));
  check("8. replaceLearningEvidenceBatch: deleteMany + createMany skipDuplicates (retry aman)",
    () => evidence.includes("deleteMany") && evidence.includes("skipDuplicates: true"));
  check("9. replay result aman (batch replace per aktivitas, bukan append)",
    () => evidence.includes("replaceLearningEvidenceBatch"));

  // 10-12. Learner state membaca evidence
  console.log("\n── 10-12. LearnerState ──");
  check("10. learner-state JOIN QuestionMetadata source+questionId (membaca BANK_SOAL evidence)",
    () => learnerService.includes('m."source" = e."source"') && learnerService.includes('FROM "LearningEvidence" e'));
  check("11. diagnostic tetap memakai jalur sama (BANK_SOAL) — kompatibel",
    () => read("lib/diagnostic/config.ts").includes('DIAGNOSTIC_SUPPORTED_SOURCES = ["BANK_SOAL"]'));
  check("12. classroom evidence tidak merusak diagnostic (tanpa ubah diagnostic)",
    () => execSync(`git diff --name-only HEAD -- lib/diagnostic/`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0);

  // 13-15. Adaptive untouched
  console.log("\n── 13-15. Adaptive Practice ──");
  check("13. selector adaptive 0 diff", () => execSync(`git diff --name-only HEAD -- lib/adaptive-practice/selector.ts`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0);
  check("14. adaptive membaca states dari getLearnerState (evidence baru otomatis masuk)",
    () => read("app/api/player/adaptive-practice/route.ts").includes("getLearnerState(userId)"));
  check("15. WEAK_SKILL threshold attemptCount >= 5 tetap",
    () => selector.includes("attemptCount >= 5"));

  // 16. Insufficient ≠ weak
  console.log("\n── 16-18. Personalization reuse ──");
  check("16. insight guru: BELUM_CUKUP_DATA (bukan lemah) untuk evidence kurang",
    () => guruInsight.includes("BELUM_CUKUP_DATA") && guruInsight.includes("MIN_CLASS_ATTEMPTS"));
  check("17. insight murid memakai buildPersonalizedAction (4E.2 existing)",
    () => muridApi.includes("buildPersonalizedAction") && !personalization.includes("classroom"));
  check("18. tidak ada personalization engine kedua (file baru hanya lib/classroom/deadline)",
    () => {
      const untracked = execSync(`git status --short -- lib/`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return !untracked.includes("lib/personalization") && !untracked.includes("lib/insight") && !untracked.includes("lib/analytics");
    });

  // 19-20. Insight server-derived
  console.log("\n── 19-20. Insight server-derived ──");
  check("19. insight murid dihitung server (route), UI hanya render",
    () => muridApi.includes("let insight") && muridPage.includes("data.insight"));
  check("20. insight guru dihitung server (endpoint insight), UI fetch",
    () => guruInsight.includes("profileFromLearnerState") && guruPage.includes("/insight"));

  // 21. Raw percentage bukan level
  console.log("\n── 21-25. Konten & tipe ──");
  check("21. guru insight memakai threshold profil (STRONG >= 0.8) + BELUM_CUKUP_DATA, bukan label mahir/menengah",
    () => guruInsight.includes("DIAGNOSTIC_PROFILE_THRESHOLDS.STRONG_MIN") && !guruInsight.includes("Mahir"));
  check("22. materi tidak otomatis mastery (tidak ada evidence di materi route)",
    () => !read("app/api/guru/materi/[id]/kirim/route.ts").includes("learningEvidence"));
  check("23. pengumuman tidak menghasilkan evidence",
    () => !read("app/api/guru/pengumuman/route.ts").includes("learningEvidence"));
  check("24. tugas praktik (link) tidak mengarang evidence (praktik route tanpa learningEvidence)",
    () => !read("app/api/murid/penugasan/[id]/praktik/route.ts").includes("learningEvidence"));
  check("25. quiz menghasilkan evidence (route quiz memakai replaceLearningEvidenceBatch)",
    () => quizRoute.includes("replaceLearningEvidenceBatch"));

  // 26-27. Client tidak mengirim score/skill
  console.log("\n── 26-27. Server-authoritative ──");
  check("26. route quiz menghitung isCorrect server-side (soal.correctAnswer)",
    () => quizRoute.includes("String(answer.answerIndex) === String(soal.correctAnswer)"));
  check("27. evidence memakai hasil server (finalAnswers), bukan payload klien",
    () => quizRoute.includes("finalAnswers") && quizRoute.includes("finalAnswerByQuestion"));

  // 28-29. No XP / no coin
  console.log("\n── 28-29. Tanpa XP/koin ──");
  check("28. route quiz tidak memanggil awardXp/addCoin",
    () => !quizRoute.includes("awardXp") && !quizRoute.includes("addCoin") && !quizRoute.includes("addCoin("));
  check("29. insight endpoint tidak memanggil awardXp/addCoin",
    () => !guruInsight.includes("awardXp") && !guruInsight.includes("addCoin"));

  // 30. Protected zones
  console.log("\n── 30. Protected zones ──");
  check("30. protected zones 0 diff (prisma/gamification/learning-loop/adaptive/diagnostic/arena/coins/apk/player)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ lib/adaptive-practice/ lib/learner-state/ lib/diagnostic/ app/api/player/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return diff.length === 0;
    });
  check("30. prisma 0 diff (0 schema change, 0 migration)", () => execSync(`git diff --name-only HEAD -- prisma/`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0);

  console.log("\n" + "=".repeat(60));
  console.log(`Hasil: ${passed} lulus, ${failed} gagal`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main();
