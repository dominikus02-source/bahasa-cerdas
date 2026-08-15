/** Question metadata taxonomy/validation/security tests; no DB writes. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateQuestionMetadata, validateQuestionMetadataBatch } from "../lib/question-metadata/validation";

const ROOT = join(__dirname, "..");
const read = (file: string) => readFileSync(join(ROOT, file), "utf8");
const sample = JSON.parse(read("data/question-metadata/sample-001.json")) as Record<string, unknown>[];

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

const valid = sample[0];
check("1. sample metadata valid", validateQuestionMetadata(valid).valid);
check("2. invalid skill rejected", !validateQuestionMetadata({ ...valid, skill: "FAKE_SKILL" }).valid);
check("3. valid subskill-parent accepted", validateQuestionMetadata(valid).valid);
check("4. invalid subskill-parent rejected", !validateQuestionMetadata({ ...valid, subskill: "GRAMMAR_EJAAN" }).valid);
check("5. valid difficulty accepted", validateQuestionMetadata({ ...valid, difficulty: "HARD" }).valid);
check("6. invalid difficulty rejected", !validateQuestionMetadata({ ...valid, difficulty: "IMPOSSIBLE" }).valid);
check("7. valid question type accepted", validateQuestionMetadata({ ...valid, questionType: "BENAR_SALAH" }).valid);
check("8. invalid question type rejected", !validateQuestionMetadata({ ...valid, questionType: "MATCHING" }).valid);
check("9. CEFR nullable", validateQuestionMetadata({ ...valid, cefr: null }).valid);
check("10. invalid CEFR rejected", !validateQuestionMetadata({ ...valid, cefr: "A0" }).valid);
check("11. metadata API is editor-only", read("app/api/admin/question-metadata/route.ts").includes("user.role !== \"ADMIN\""));
check("12. metadata API derives operator from session", read("app/api/admin/question-metadata/route.ts").includes("createdById: auth.user.id") && !read("app/api/admin/question-metadata/route.ts").includes("body.userId"));
check("13. provenance required", !validateQuestionMetadata({ ...valid, provenance: "" }).valid);
check("14. malformed metadata rejected", !validateQuestionMetadata({ ...valid, questionId: "" }).valid);
check("15. AI metadata cannot auto-approve", !validateQuestionMetadata({ ...valid, provenance: "AI_ASSISTED", status: "APPROVED" }).valid);
check("16. Jalur level constrained 1..12", !validateQuestionMetadata({ ...valid, source: "JALUR_CERDAS", level: 13 }).valid);
check("17. non-Jalur level remains nullable", validateQuestionMetadata({ ...valid, source: "BANK_SOAL", level: null }).valid);
check("18. UKBI/TKA sources rejected", !validateQuestionMetadata({ ...valid, source: "UKBI" }).valid && !validateQuestionMetadata({ ...valid, source: "TKA" }).valid);
check("19. sample has 30 auditable records", sample.length === 30 && validateQuestionMetadataBatch(sample as never).valid);
check("20. sample spans three content difficulties", new Set(sample.map((item) => item.difficulty)).size === 3);
check("21. sample spans three question types", new Set(sample.map((item) => item.questionType)).size === 3);
check("22. sample remains review-only", sample.every((item) => item.status === "NEEDS_REVIEW"));
const metadataMigration = read("prisma/migrations/manual/2026-08-15_question_metadata.sql");
check("23. migration is additive", metadataMigration.includes("CREATE TABLE IF NOT EXISTS") && !metadataMigration.split("\n").some((line) => !line.trim().startsWith("--") && line.includes("DROP TABLE")));
check("24. metadata model is not an answer/evidence table", !read("prisma/schema.prisma").slice(read("prisma/schema.prisma").indexOf("model QuestionMetadata"), read("prisma/schema.prisma").indexOf("model QuestionMetadata") + 1200).includes("correctAnswer"));

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
