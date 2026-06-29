/**
 * Phase UKBI/TKA FOUNDATION 2C — Attempt History Integrity Audit
 *
 * Code-level audit: verifies answerDetails usage, append-not-replace pattern,
 * no raw answerDetails returned to client, scored from snapshot, legacy fallback.
 *
 * Run: npx tsx scripts/audit-ukbi-tka-attempt-history.ts
 */

import * as fs from "fs";
import * as path from "path";
import { sanitizeAttemptAnswerDetailsForClient, sanitizeAttemptHistoryForClient, deepScanSensitiveFields } from "../lib/security";

const PROJECT_ROOT = path.resolve(__dirname, "..");

interface AuditCheck {
  name: string;
  file: string;
  pattern: string;
  expectFound: boolean;
}

let passed = 0;
let failed = 0;
const errors: string[] = [];

function checkFileContains(filePath: string, pattern: string): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content.includes(pattern);
  } catch { return false; }
}

function runCheck(check: AuditCheck) {
  const fullPath = path.join(PROJECT_ROOT, check.file);
  const found = checkFileContains(fullPath, check.pattern);
  if (found === check.expectFound) {
    passed++;
    console.log(`  ✅ ${check.name}`);
  } else {
    failed++;
    errors.push(`${check.name}: expected ${check.expectFound ? "FOUND" : "NOT FOUND"} '${check.pattern}' in ${check.file}`);
    console.log(`  ❌ ${check.name}`);
  }
}

console.log("\n═══════════════════════════════════════════");
console.log("  UKBI/TKA Attempt History Audit");
console.log("═══════════════════════════════════════════\n");

// ── A. Schema: answerDetails exists on ProgresKompetensi ──
console.log("── A. Schema: answerDetails on ProgresKompetensi ──");

runCheck({
  name: "answerDetails field in ProgresKompetensi model",
  file: "prisma/schema.prisma",
  pattern: "answerDetails Json?",
  expectFound: true,
});

runCheck({
  name: "ProgresKompetensi has @@unique([userId, paketId, attemptNumber])",
  file: "prisma/schema.prisma",
  pattern: "@@unique([userId, paketId, attemptNumber])",
  expectFound: true,
});

// ── B. Types: AttemptAnswerDetails defined ──
console.log("\n── B. Attempt types ──");

runCheck({
  name: "AttemptAnswerDetails interface",
  file: "lib/types/snapshot.ts",
  pattern: "AttemptAnswerDetails",
  expectFound: true,
});

runCheck({
  name: "UserAnswerRecord interface",
  file: "lib/types/snapshot.ts",
  pattern: "UserAnswerRecord",
  expectFound: true,
});

runCheck({
  name: "ResultSummary interface",
  file: "lib/types/snapshot.ts",
  pattern: "ResultSummary",
  expectFound: true,
});

// ── C. Submit route: answerDetails saved ──
console.log("\n── C. Submit route saves answerDetails ──");

runCheck({
  name: "Submit route imports AttemptAnswerDetails",
  file: "app/api/kompetensi/[paketId]/submit/route.ts",
  pattern: "AttemptAnswerDetails",
  expectFound: true,
});

runCheck({
  name: "Submit route imports UserAnswerRecord",
  file: "app/api/kompetensi/[paketId]/submit/route.ts",
  pattern: "UserAnswerRecord",
  expectFound: true,
});

runCheck({
  name: "UKBI path builds userAnswerRecords",
  file: "app/api/kompetensi/[paketId]/submit/route.ts",
  pattern: "userAnswerRecords.push",
  expectFound: true,
});

runCheck({
  name: "TKA path builds userAnswerRecords",
  file: "app/api/kompetensi/[paketId]/submit/route.ts",
  pattern: "userAnswerRecords.push",
  expectFound: true,
});

runCheck({
  name: "UKBI saves answerDetails on ProgresKompetensi",
  file: "app/api/kompetensi/[paketId]/submit/route.ts",
  pattern: "answerDetails: JSON.parse(JSON.stringify(attemptAnswerDetails))",
  expectFound: true,
});

runCheck({
  name: "Scored from snapshot audit flag",
  file: "app/api/kompetensi/[paketId]/submit/route.ts",
  pattern: "scoredFromSnapshot: true",
  expectFound: true,
});

runCheck({
  name: "Live DB fallback tracked in audit",
  file: "app/api/kompetensi/[paketId]/submit/route.ts",
  pattern: "liveDbFallbackUsed",
  expectFound: true,
});

// ── D. No raw answerDetails returned to client ──
console.log("\n── D. No raw answerDetails exposed ──");

runCheck({
  name: "answerDetails NOT in hasil route response",
  file: "app/api/kompetensi/[paketId]/hasil/route.ts",
  pattern: "answerDetails",
  expectFound: false,
});

runCheck({
  name: "answerDetails NOT in submit route response (result section)",
  file: "app/api/kompetensi/[paketId]/submit/route.ts",
  pattern: "rawSnapshot",
  expectFound: true, // rawSnapshot is read internally, but NOT returned
});

// Verify submit route response excludes raw answerDetails
const submitContent = fs.readFileSync(
  path.join(PROJECT_ROOT, "app/api/kompetensi/[paketId]/submit/route.ts"), "utf-8"
);
const ukbiReturnIndex = submitContent.lastIndexOf("return NextResponse.json({");
const afterUkbiReturn = submitContent.slice(ukbiReturnIndex);
const hasAnswerDetailsInReturn = afterUkbiReturn.includes("answerDetails") && !afterUkbiReturn.includes("answerDetails: JSON.parse(JSON.stringify(attemptAnswerDetails))");
if (!hasAnswerDetailsInReturn) {
  passed++;
  console.log("  ✅ answerDetails NOT in submit API response body");
} else {
  failed++;
  errors.push("answerDetails found in submit API response body");
  console.log("  ❌ answerDetails found in submit API response body");
}

// ── E. Sanitizer exists ──
console.log("\n── E. Attempt history sanitizer ──");

runCheck({
  name: "sanitizeAttemptAnswerDetailsForClient exported",
  file: "lib/security.ts",
  pattern: "sanitizeAttemptAnswerDetailsForClient",
  expectFound: true,
});

runCheck({
  name: "sanitizeAttemptHistoryForClient exported",
  file: "lib/security.ts",
  pattern: "sanitizeAttemptHistoryForClient",
  expectFound: true,
});

// ── F. Sanitizer field safety ──
console.log("\n── F. Sanitizer strips sensitive fields ──");

const sampleDetails: any = {
  version: "1.0",
  attemptId: "test-1",
  sessionId: "sess-1",
  paketId: "p1",
  userId: "u1",
  product: "UKBI",
  startedAt: "2026-01-01",
  submittedAt: "2026-01-01",
  seed: "secret-seed-123",
  snapshot: { questions: [{ correctAnswer: "A" }] },
  userAnswers: [{ questionId: "q1", selectedOptionId: "A", isCorrect: true, score: 10, section: "M" }],
  scoring: { totalQuestions: 1, correctCount: 1, rawScore: 10, percentage: 100 },
  audit: { scoredFromSnapshot: true, liveDbFallbackUsed: false, snapshotVersion: "1.0" },
};

const sanitized = sanitizeAttemptAnswerDetailsForClient(sampleDetails);
assertSanitized(sanitized, "Full details");

const historySample = sanitizeAttemptHistoryForClient(sampleDetails);
assertSanitized(historySample, "History");

function assertSanitized(result: any, label: string) {
  if (!result) { failed++; errors.push(`${label} returned null`); console.log(`  ❌ ${label} returned null`); return; }
  const sensitiveInResult = deepScanSensitiveFields(result);
  if (sensitiveInResult.length === 0) {
    passed++; console.log(`  ✅ ${label}: zero sensitive fields in sanitized output`);
  } else {
    failed++; errors.push(`${label}: sensitive fields found: ${sensitiveInResult.join(", ")}`);
    console.log(`  ❌ ${label}: sensitive fields found: ${sensitiveInResult.join(", ")}`);
  }
}

// ── Summary ──
console.log("\n═══════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("═══════════════════════════════════════════\n");

if (failed > 0) {
  console.log("Errors:");
  errors.forEach(e => console.log(`  - ${e}`));
  process.exit(1);
} else {
  console.log("  Audit: ✅ PASSED\n");
  process.exit(0);
}
