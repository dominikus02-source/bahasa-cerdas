/**
 * Phase UKBI/TKA FOUNDATION 2B — Snapshot Integrity Audit
 *
 * Code-level audit: verifies snapshot field exists, routes reference snapshots,
 * no raw snapshot returned to client, no answer leakage.
 *
 * Run: npx tsx scripts/audit-ukbi-tka-snapshot-integrity.ts
 */

import * as fs from "fs";
import * as path from "path";
import { sanitizeSnapshotQuestionForClient, deepScanSensitiveFields, buildClientQuestionPayload } from "../lib/security";

const PROJECT_ROOT = path.resolve(__dirname, "..");

interface AuditCheck {
  name: string;
  file: string;
  pattern: string;
  expectFound: boolean;
}

let passed = 0;
let failed = 0;
const warnings: string[] = [];
const errors: string[] = [];

function checkFileContains(filePath: string, pattern: string): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content.includes(pattern);
  } catch {
    return false;
  }
}

function runCheck(check: AuditCheck) {
  const fullPath = path.join(PROJECT_ROOT, check.file);
  const found = checkFileContains(fullPath, check.pattern);
  if (found === check.expectFound) {
    passed++;
    console.log(`  ✅ ${check.name}`);
  } else {
    failed++;
    const msg = `${check.name}: expected ${check.expectFound ? "FOUND" : "NOT FOUND"} '${check.pattern}' in ${check.file}`;
    errors.push(msg);
    console.log(`  ❌ ${msg}`);
  }
}

console.log("\n═══════════════════════════════════════════");
console.log("  UKBI/TKA Snapshot Integrity Audit");
console.log("═══════════════════════════════════════════\n");

// ── A. Schema: questionSnapshot field exists on TestSession ──
console.log("── A. Schema: questionSnapshot field on TestSession ──");

runCheck({
  name: "questionSnapshot field in Prisma schema",
  file: "prisma/schema.prisma",
  pattern: "questionSnapshot Json?",
  expectFound: true,
});

runCheck({
  name: "TestSession model exists",
  file: "prisma/schema.prisma",
  pattern: "model TestSession",
  expectFound: true,
});

// ── B. Types: snapshot types exist ──
console.log("\n── B. Snapshot types ──");

runCheck({
  name: "AttemptSnapshot interface defined",
  file: "lib/types/snapshot.ts",
  pattern: "AttemptSnapshot",
  expectFound: true,
});

runCheck({
  name: "QuestionSnapshot interface defined",
  file: "lib/types/snapshot.ts",
  pattern: "QuestionSnapshot",
  expectFound: true,
});

runCheck({
  name: "Snapshot version field",
  file: "lib/types/snapshot.ts",
  pattern: "version",
  expectFound: true,
});

runCheck({
  name: "Snapshot questions field",
  file: "lib/types/snapshot.ts",
  pattern: "questions:",
  expectFound: true,
});

runCheck({
  name: "QuestionSnapshot has correctAnswer field",
  file: "lib/types/snapshot.ts",
  pattern: "correctAnswer",
  expectFound: true,
});

runCheck({
  name: "QuestionSnapshot has options field",
  file: "lib/types/snapshot.ts",
  pattern: "options:",
  expectFound: true,
});

// ── C. GET route: stores snapshot ──
console.log("\n── C. GET route: snapshot storage ──");

runCheck({
  name: "GET route imports snapshot types",
  file: "app/api/kompetensi/[paketId]/route.ts",
  pattern: "lib/types/snapshot",
  expectFound: true,
});

runCheck({
  name: "GET route updates session with questionSnapshot",
  file: "app/api/kompetensi/[paketId]/route.ts",
  pattern: "questionSnapshot:",
  expectFound: true,
});

runCheck({
  name: "GET route uses createSessionSeed",
  file: "app/api/kompetensi/[paketId]/route.ts",
  pattern: "createSessionSeed",
  expectFound: true,
});

// ── D. Submit route: reads snapshot ──
console.log("\n── D. Submit route: snapshot usage ──");

runCheck({
  name: "Submit route imports AttemptSnapshot type",
  file: "app/api/kompetensi/[paketId]/submit/route.ts",
  pattern: "AttemptSnapshot",
  expectFound: true,
});

runCheck({
  name: "Submit route reads questionSnapshot from session",
  file: "app/api/kompetensi/[paketId]/submit/route.ts",
  pattern: "questionSnapshot",
  expectFound: true,
});

runCheck({
  name: "Submit route filters snapshot questions by answer IDs",
  file: "app/api/kompetensi/[paketId]/submit/route.ts",
  pattern: "snapshotQuestions.filter",
  expectFound: true,
});

runCheck({
  name: "Submit route falls back to DB live for legacy",
  file: "app/api/kompetensi/[paketId]/submit/route.ts",
  pattern: "falling back to live DB",
  expectFound: true,
});

// ── E. No raw snapshot returned to client ──
console.log("\n── E. No raw snapshot exposed to client ──");

runCheck({
  name: "GET route response does NOT include questionSnapshot",
  file: "app/api/kompetensi/[paketId]/route.ts",
  pattern: "questionSnapshot",
  expectFound: true, // questionSnapshot IS found in route (for DB update),
  // but we need to verify it's NOT in the return statement
});

// Manually check the return statement
const routeContent = fs.readFileSync(
  path.join(PROJECT_ROOT, "app/api/kompetensi/[paketId]/route.ts"),
  "utf-8"
);
const returnIndex = routeContent.lastIndexOf("return NextResponse.json({");
const afterReturn = routeContent.slice(returnIndex);
const hasSnapshotInReturn = afterReturn.includes("questionSnapshot");

if (!hasSnapshotInReturn) {
  passed++;
  console.log("  ✅ questionSnapshot NOT in API response body");
} else {
  failed++;
  errors.push("questionSnapshot found in API response body — LEAK!");
  console.log("  ❌ questionSnapshot found in API response body — LEAK!");
}

// ── F. Sanitizer exists ──
console.log("\n── F. Client sanitizer ──");

runCheck({
  name: "sanitizeSnapshotQuestionForClient exported",
  file: "lib/security.ts",
  pattern: "sanitizeSnapshotQuestionForClient",
  expectFound: true,
});

runCheck({
  name: "buildClientQuestionPayload exported",
  file: "lib/security.ts",
  pattern: "buildClientQuestionPayload",
  expectFound: true,
});

runCheck({
  name: "deepScanSensitiveFields available",
  file: "lib/security.ts",
  pattern: "deepScanSensitiveFields",
  expectFound: true,
});

// ── G. Sanitizer strips sensitive fields ──
console.log("\n── G. Sanitizer field safety ──");

const sampleQ = {
  id: "q1",
  type: "PILIHAN_GANDA",
  text: "test",
  options: [{ id: "A", text: "test" }],
  correctAnswer: "A",
  seed: "secret",
  version: "1.0",
  paketId: "p1",
  userId: "u1",
  questionOrder: ["q1"],
  difficulty: "EASY",
  section: "MEMBACA",
  seksi: "MEMBACA",
  kompetensi: undefined,
  weight: undefined,
  tags: undefined,
  product: "UKBI",
};

const sanitized = sanitizeSnapshotQuestionForClient(sampleQ);
const allowedKeys = ["id", "type", "text", "options", "difficulty", "section", "seksi"];
const sanitizedKeys = Object.keys(sanitized);
const extraKeys = sanitizedKeys.filter(k => !allowedKeys.includes(k));

if (extraKeys.length === 0) {
  passed++;
  console.log(`  ✅ Sanitizer only allows safe fields (${sanitizedKeys.join(", ")})`);
} else {
  failed++;
  errors.push(`Sanitizer leaked fields: ${extraKeys.join(", ")}`);
  console.log(`  ❌ Sanitizer leaked fields: ${extraKeys.join(", ")}`);
}

// ── Summary ──
console.log("\n═══════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);

if (warnings.length > 0) {
  console.log(`\n  Warnings:`);
  warnings.forEach(w => console.log(`    ⚠️  ${w}`));
}

if (failed > 0) {
  console.log(`\n  Errors:`);
  errors.forEach(e => console.log(`    - ${e}`));
  console.log("\n  Audit: ❌ FAILED\n");
  process.exit(1);
} else {
  console.log("\n  Audit: ✅ PASSED\n");
  process.exit(0);
}
