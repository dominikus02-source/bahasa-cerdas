/**
 * Phase 2 Step 3C — question-level evidence ledger tests.
 * Static contract/boundary checks; no production database writes.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (file: string) => readFileSync(join(ROOT, file), "utf8");

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${name}`);
  }
}

console.log("\nSTEP 3C QUESTION-LEVEL EVIDENCE LEDGER TESTS\n");

const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/manual/2026-08-15_learning_evidence.sql");
const evidence = read("lib/learning-loop/evidence.ts");
const jalurSubmit = read("app/api/jalur-cerdas/[unitId]/submit/route.ts");
const jalurProgress = read("app/api/jalur-cerdas/[unitId]/progress/route.ts");
const quizRoute = read("app/api/murid/quiz/[id]/route.ts");
const ukbiSubmit = read("app/api/kompetensi/[paketId]/submit/route.ts");

// Contract and database identity.
check("1. LearningEvidence model exists", schema.includes("model LearningEvidence"));
check("2. Evidence owns userId", schema.includes("userId         String") && schema.includes("user User @relation"));
check("3. Stable source/activity/question identity", schema.includes("source         String") && schema.includes("activityId     String") && schema.includes("questionId     String"));
check("4. Correctness is persisted", schema.includes("isCorrect      Boolean?"));
check("5. Skill and difficulty remain nullable", schema.includes("skill          LearningSkillType?") && schema.includes("difficulty     Difficulty?"));
check("6. Composite idempotency constraint", schema.includes("@@unique([userId, source, activityId, questionId])"));
check("7. User/time and question indexes", schema.includes("@@index([userId, answeredAt])") && schema.includes("@@index([userId, questionId])"));
check("8. Migration is additive and idempotent", migration.includes("CREATE TABLE IF NOT EXISTS") && migration.includes("CREATE UNIQUE INDEX IF NOT EXISTS"));
check("9. Migration has ownership foreign key", migration.includes("LearningEvidence_userId_fkey"));
check("10. Migration does not touch certified models", !migration.includes("UKBIQuestion") && !migration.includes("TKAQuestion") && !migration.includes("TestSession"));

// Canonical evidence helper and reward separation.
check("11. Evidence helper uses server DB upsert", evidence.includes("db.learningEvidence.upsert"));
check("12. Evidence helper uses composite unique key", evidence.includes("userId_source_activityId_questionId"));
check("13. Evidence helper has no XP/coin engine calls", !evidence.includes("awardXp") && !evidence.includes("awardCoins") && !evidence.includes("addCoin"));
check("14. Batch evidence uses bounded two-operation transaction", evidence.includes("db.$transaction") && evidence.includes("deleteMany") && evidence.includes("createMany"));

// Jalur: answer is server-validated and evidence precedes completion effects.
check("15. Jalur submit derives owner from authenticated session", jalurSubmit.includes("user.id") && !jalurSubmit.includes("body.userId"));
check("16. Jalur submit validates answer with server key", jalurSubmit.includes("isJalurAnswerCorrect(question.jawaban, answer)"));
check("17. Jalur submit persists evidence", jalurSubmit.includes("upsertLearningEvidence") && jalurSubmit.includes('source: "JALUR_CERDAS"'));
check("18. Jalur evidence stores selected answer/result, not client isCorrect", jalurSubmit.includes("selectedAnswer: String(answer)") && !jalurSubmit.includes("body.isCorrect"));
check("19. Jalur quest runs after evidence write", jalurSubmit.indexOf("await upsertLearningEvidence") < jalurSubmit.lastIndexOf("trackQuestProgress"));
check("20. Jalur completion verifies evidence exists/matches", jalurProgress.includes("db.learningEvidence.findMany") && jalurProgress.includes("EVIDENCE_REQUIRED"));
check("21. Jalur completion score remains server-derived", jalurProgress.includes("scoreJalurAnswers") && !jalurProgress.includes("body.score"));
check("22. Jalur reward still uses canonical awardXp", jalurProgress.includes("awardXp(user.id"));

// Latihan/Bank Soal share the same ledger and server result.
check("23. Latihan reads final server QuizAnswer rows", quizRoute.includes("finalAnswers") && quizRoute.includes("db.quizAnswer.findMany"));
check("24. Latihan persists the same LearningEvidence model", quizRoute.includes("replaceLearningEvidenceBatch") && quizRoute.includes('source: "LATIHAN"'));
check("25. Latihan evidence is written before SUBMITTED", quizRoute.indexOf("replaceLearningEvidenceBatch") < quizRoute.indexOf('status: "SUBMITTED"'));
check("26. Latihan evidence owner is dbUser session owner", quizRoute.includes("userId: dbUser.id") && !quizRoute.includes("body.userId"));
check("27. Quiz result is calculated from server Soal/customAnswer", quizRoute.includes("soal.correctAnswer") && quizRoute.includes("qq.customAnswer"));

// UKBI/TKA boundary remains untouched.
check("28. UKBI/TKA scoring file does not import LearningEvidence", !ukbiSubmit.includes("LearningEvidence") && !ukbiSubmit.includes("learningEvidence"));
check("29. UKBI/TKA snapshot scoring remains present", ukbiSubmit.includes("scoredFromSnapshot") && ukbiSubmit.includes("buildAnswerRows"));

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
