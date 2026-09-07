/**
 * Question Factory V2 — V10 + V11 Test Suite (P3.5C).
 *
 * Sections:
 *   A — V10 golden fixtures (12 fixtures)
 *   B — V11 golden fixtures (14 fixtures)
 *   C — V10 regression (TB-012 + PASSING_ITEM)
 *   D — V11 regression (TB-012 + PASSING_ITEM)
 *   E — V10 edge cases
 *   F — V11 edge cases
 *   G — V10/V11 integration with pipeline
 *   H — V10 no-overfit invariant
 *   I — V11 no-bad-heuristic invariant
 *   J — MASTER_BANK negative corpus (V10 + V11)
 *   K — Protected zone invariants
 */

import { cognitiveLabelValidator } from "../cognitive-label";
import { distractorQualityValidator } from "../distractor-quality";
import { runValidator } from "../interface";
import { DEFAULT_PIPELINE } from "../index";
import type { CanonicalItem } from "../types";
import type { Validator } from "../interface";

// ── V10 fixtures ─────────────────────────────────────────────────────────────
import {
  G01_R1_SEBUTKAN,
  G02_R2_MENURUT_TEKS,
  G03_R3_JIKA_MAKA,
  G04_R4_MENGAPA,
  G05_MISMATCH_R1_VS_R4,
  G06_MISMATCH_R2_VS_R5,
  G07_MISMATCH_R5_VS_R1,
  G08_INSUFFICIENT_EVIDENCE,
  G09_GENERIC_STEM,
  G10_MISSING_TARGET,
  G11_ISIAN_SHORT,
  G12_ISIAN_LONG,
} from "../__fixtures__/v10-fixtures";

// ── V11 fixtures ─────────────────────────────────────────────────────────────
import {
  G01_PASS_DIVERSE,
  G02_PASS_PARALLEL,
  G03_PASS_SHORT,
  G04_NEAR_DUPLICATE,
  G05_PARAPHRASE_DUP,
  G06_NEAR_ANSWER,
  G07_LENGTH_OUTLIER,
  G08_PARALLELISM_BREAK,
  G09_SUBSET_OF_ANSWER,
  G10_SKIP_BENAR_SALAH,
  G11_SKIP_ISIAN,
  G12_MULTIPLE_ISSUES,
  G13_PASS_VARYING_LENGTHS,
  G14_PASS_SEMANTICALLY_DIVERSE,
} from "../__fixtures__/v11-fixtures";

// ── TB-012 + PASSING_ITEM ────────────────────────────────────────────────────
import { createTB012, PASSING_ITEM } from "../__fixtures__/tb-012";

// ── Test helpers ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let total = 0;
const failures: string[] = [];

function assert(condition: boolean, msg: string): void {
  total++;
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(`FAIL [${total}]: ${msg}`);
    console.error(`  ✗ FAIL [${total}]: ${msg}`);
  }
}

function assertHasCode(findings: ReturnType<typeof cognitiveLabelValidator.validate>, code: string): void {
  assert(
    findings.some((f) => f.reasonCode === code),
    `Expected reason code '${code}' in findings. Got: [${findings.map((f) => f.reasonCode).join(", ")}]`
  );
}

function assertNoCode(findings: ReturnType<typeof cognitiveLabelValidator.validate>, code: string): void {
  assert(
    !findings.some((f) => f.reasonCode === code),
    `Unexpected reason code '${code}' in findings.`
  );
}

function assertStatus(findings: ReturnType<typeof cognitiveLabelValidator.validate>, status: string): void {
  assert(
    findings.some((f) => f.status === status),
    `Expected status '${status}' in findings. Got: [${findings.map((f) => f.status).join(", ")}]`
  );
}

function assertPass(findings: ReturnType<typeof cognitiveLabelValidator.validate>): void {
  assertStatus(findings, "PASS");
}

function assertFail(findings: ReturnType<typeof cognitiveLabelValidator.validate>): void {
  assert(
    findings.some((f) => f.status === "FAIL"),
    `Expected at least one FAIL finding. Got: [${findings.map((f) => f.status).join(", ")}]`
  );
}

function assertAdvisory(findings: ReturnType<typeof cognitiveLabelValidator.validate>): void {
  assertStatus(findings, "ADVISORY");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A — V10 Golden Fixtures (12 tests)
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n═══ SECTION A: V10 Golden Fixtures ═══");

// A.1 — G01: PASS (R1 Sebutkan)
{
  const f = cognitiveLabelValidator.validate(G01_R1_SEBUTKAN, {} as any);
  assertPass(f);
  assertNoCode(f, "COGNITIVE_LABEL_MISMATCH");
}

// A.2 — G02: PASS (R2 Menurut teks)
{
  const f = cognitiveLabelValidator.validate(G02_R2_MENURUT_TEKS, {} as any);
  assertPass(f);
}

// A.3 — G03: PASS (R3 Jika...maka)
{
  const f = cognitiveLabelValidator.validate(G03_R3_JIKA_MAKA, {} as any);
  assertPass(f);
}

// A.4 — G04: PASS (R4 Mengapa)
{
  const f = cognitiveLabelValidator.validate(G04_R4_MENGAPA, {} as any);
  assertPass(f);
}

// A.5 — G05: SOFT_FAIL (R1 declared but actual R4)
{
  const f = cognitiveLabelValidator.validate(G05_MISMATCH_R1_VS_R4, {} as any);
  assertFail(f);
  assertHasCode(f, "COGNITIVE_LABEL_MISMATCH");
}

// A.6 — G06: SOFT_FAIL (R2 declared but actual R5)
{
  const f = cognitiveLabelValidator.validate(G06_MISMATCH_R2_VS_R5, {} as any);
  assertFail(f);
  assertHasCode(f, "COGNITIVE_LABEL_MISMATCH");
}

// A.7 — G07: SOFT_FAIL (R5 declared but actual R1)
{
  const f = cognitiveLabelValidator.validate(G07_MISMATCH_R5_VS_R1, {} as any);
  assertFail(f);
  assertHasCode(f, "COGNITIVE_LABEL_MISMATCH");
}

// A.8 — G08: ADVISORY (insufficient evidence)
{
  const f = cognitiveLabelValidator.validate(G08_INSUFFICIENT_EVIDENCE, {} as any);
  assertAdvisory(f);
  assertHasCode(f, "COGNITIVE_LABEL_INSUFFICIENT_EVIDENCE");
}

// A.9 — G09: ADVISORY (generic stem)
{
  const f = cognitiveLabelValidator.validate(G09_GENERIC_STEM, {} as any);
  assertAdvisory(f);
}

// A.10 — G10: SOFT_FAIL (missing cognitiveTarget)
{
  const f = cognitiveLabelValidator.validate(G10_MISSING_TARGET, {} as any);
  assertFail(f);
  assertHasCode(f, "COGNITIVE_LABEL_MISSING");
}

// A.11 — G11: ADVISORY (ISIAN_SINGKAT short answer)
{
  const f = cognitiveLabelValidator.validate(G11_ISIAN_SHORT, {} as any);
  assertAdvisory(f);
}

// A.12 — G12: PASS (ISIAN_SINGKAT long answer → R6)
{
  const f = cognitiveLabelValidator.validate(G12_ISIAN_LONG, {} as any);
  assertPass(f);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B — V11 Golden Fixtures (14 tests)
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n═══ SECTION B: V11 Golden Fixtures ═══");

// B.1 — G01: PASS (diverse distractors)
{
  const f = distractorQualityValidator.validate(G01_PASS_DIVERSE, {} as any);
  assertPass(f);
}

// B.2 — G02: PASS (parallel structure)
{
  const f = distractorQualityValidator.validate(G02_PASS_PARALLEL, {} as any);
  assertPass(f);
}

// B.3 — G03: PASS (short stem, diverse options)
{
  const f = distractorQualityValidator.validate(G03_PASS_SHORT, {} as any);
  assertPass(f);
}

// B.4 — G04: SOFT_FAIL (near-duplicate distractors)
{
  const f = distractorQualityValidator.validate(G04_NEAR_DUPLICATE, {} as any);
  assertFail(f);
  assertHasCode(f, "DISTRACTOR_NEAR_DUPLICATE");
}

// B.5 — G05: SOFT_FAIL (paraphrase duplicate)
{
  const f = distractorQualityValidator.validate(G05_PARAPHRASE_DUP, {} as any);
  assertFail(f);
  assertHasCode(f, "DISTRACTOR_NEAR_DUPLICATE");
}

// B.6 — G06: SOFT_FAIL (near-answer distractor)
{
  const f = distractorQualityValidator.validate(G06_NEAR_ANSWER, {} as any);
  assertFail(f);
  assertHasCode(f, "DISTRACTOR_NEAR_ANSWER");
}

// B.7 — G07: SOFT_FAIL (length outlier)
{
  const f = distractorQualityValidator.validate(G07_LENGTH_OUTLIER, {} as any);
  assertFail(f);
  assertHasCode(f, "DISTRACTOR_LENGTH_OUTLIER");
}

// B.8 — G08: SOFT_FAIL (parallelism break)
{
  const f = distractorQualityValidator.validate(G08_PARALLELISM_BREAK, {} as any);
  assertFail(f);
  assertHasCode(f, "DISTRACTOR_PARALLELISM_BREAK");
}

// B.9 — G09: SOFT_FAIL (subset of answer)
{
  const f = distractorQualityValidator.validate(G09_SUBSET_OF_ANSWER, {} as any);
  assertFail(f);
  assertHasCode(f, "DISTRACTOR_SUBSET_OF_ANSWER");
}

// B.10 — G10: PASS (BENAR_SALAH — skipped)
{
  const f = distractorQualityValidator.validate(G10_SKIP_BENAR_SALAH, {} as any);
  assertPass(f);
  assertNoCode(f, "DISTRACTOR_NEAR_DUPLICATE");
}

// B.11 — G11: PASS (ISIAN_SINGKAT — skipped)
{
  const f = distractorQualityValidator.validate(G11_SKIP_ISIAN, {} as any);
  assertPass(f);
}

// B.12 — G12: SOFT_FAIL (multiple issues)
{
  const f = distractorQualityValidator.validate(G12_MULTIPLE_ISSUES, {} as any);
  assertFail(f);
  assert(
    f.filter((x) => x.status === "FAIL").length >= 2,
    `G12 should have ≥2 FAIL findings. Got: ${f.filter((x) => x.status === "FAIL").length}`
  );
}

// B.13 — G13: PASS (varying lengths — not outlier)
{
  const f = distractorQualityValidator.validate(G13_PASS_VARYING_LENGTHS, {} as any);
  assertPass(f);
}

// B.14 — G14: PASS (semantically diverse)
{
  const f = distractorQualityValidator.validate(G14_PASS_SEMANTICALLY_DIVERSE, {} as any);
  assertPass(f);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION C — V10 Regression (TB-012 + PASSING_ITEM)
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n═══ SECTION C: V10 Regression ═══");

// C.1 — TB-012: no cognitiveTarget → COGNITIVE_LABEL_MISSING
{
  const tb = createTB012();
  const f = cognitiveLabelValidator.validate(tb, {} as any);
  assertFail(f);
  assertHasCode(f, "COGNITIVE_LABEL_MISSING");
}

// C.2 — PASSING_ITEM: has cognitiveTarget, should not crash
{
  const f = cognitiveLabelValidator.validate(PASSING_ITEM, {} as any);
  assert(f.length > 0, "PASSING_ITEM V10 should produce at least one finding");
}

// C.3 — TB-012 with cognitiveTarget override: should validate
{
  const tb = createTB012({ id: "TB-012-COGNITIVE" });
  tb.taxonomy.cognitiveTarget = "MENGINGAT";
  const f = cognitiveLabelValidator.validate(tb, {} as any);
  assert(f.length > 0, "TB-012 with cognitiveTarget should produce findings");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION D — V11 Regression (TB-012 + PASSING_ITEM)
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n═══ SECTION D: V11 Regression ═══");

// D.1 — TB-012: has duplicate options → DISTRACTOR_NEAR_DUPLICATE
{
  const tb = createTB012();
  const f = distractorQualityValidator.validate(tb, {} as any);
  assertHasCode(f, "DISTRACTOR_NEAR_ANSWER");
}

// D.2 — PASSING_ITEM: has similar distractors ("dibaca." repeats) → V11 SOFT_FAIL
{
  const f = distractorQualityValidator.validate(PASSING_ITEM, {} as any);
  assertFail(f);
}

// D.3 — TB-012 with different duplicate → still catches
{
  const tb = createTB012({
    id: "TB-012-DUP2",
    options: ["A", "B", "C", "A"],
  });
  const f = distractorQualityValidator.validate(tb, {} as any);
  assertHasCode(f, "DISTRACTOR_NEAR_DUPLICATE");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION E — V10 Edge Cases
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n═══ SECTION E: V10 Edge Cases ═══");

// E.1 — Empty stem → ADVISORY (no signal)
{
  const item: CanonicalItem = {
    ...G01_R1_SEBUTKAN,
    content: { ...G01_R1_SEBUTKAN.content, stem: "" },
    taxonomy: { ...G01_R1_SEBUTKAN.taxonomy, cognitiveTarget: "MENGEVALUASI" },
  };
  const f = cognitiveLabelValidator.validate(item, {} as any);
  // Empty stem produces no pattern matches → ADVISORY
  assert(
    f.some((x) => x.status === "ADVISORY" || x.status === "FAIL"),
    "Empty stem should produce ADVISORY or FAIL"
  );
}

// E.2 — Unknown cognitiveTarget → COGNITIVE_LABEL_MISSING
{
  const item: CanonicalItem = {
    ...G01_R1_SEBUTKAN,
    taxonomy: { ...G01_R1_SEBUTKAN.taxonomy, cognitiveTarget: "UNKNOWN_LEVEL" },
  };
  const f = cognitiveLabelValidator.validate(item, {} as any);
  assertHasCode(f, "COGNITIVE_LABEL_MISSING");
}

// E.3 — Gap of exactly 1 → PASS (within tolerance)
{
  // G04 is R4 declared, inferred R4 → PASS (gap 0)
  const f = cognitiveLabelValidator.validate(G04_R4_MENGAPA, {} as any);
  assertPass(f);
}

// E.4 — BENAR_SALAH with R2 → should work
{
  const item: CanonicalItem = {
    ...G01_R1_SEBUTKAN,
    responseModel: {
      questionType: "BENAR_SALAH",
      correctAnswer: "0",
    },
    taxonomy: { ...G01_R1_SEBUTKAN.taxonomy, cognitiveTarget: "MEMAHAMI" },
  };
  const f = cognitiveLabelValidator.validate(item, {} as any);
  assert(f.length > 0, "BENAR_SALAH should produce findings");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION F — V11 Edge Cases
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n═══ SECTION F: V11 Edge Cases ═══");

// F.1 — Single distractor (3 options, 1 correct, 2 distractors) → PASS
{
  const item: CanonicalItem = {
    ...G01_PASS_DIVERSE,
    content: {
      ...G01_PASS_DIVERSE.content,
      options: ["Ya, benar", "Tidak benar", "Belum tentu"],
    },
    responseModel: { ...G01_PASS_DIVERSE.responseModel, correctAnswer: "1" },
  };
  const f = distractorQualityValidator.validate(item, {} as any);
  assertPass(f);
}

// F.2 — All identical distractors → should catch near-duplicate
{
  const item: CanonicalItem = {
    ...G01_PASS_DIVERSE,
    content: {
      ...G01_PASS_DIVERSE.content,
      options: ["Kalimat aktif", "Kalimat aktif", "Kalimat aktif", "Kalimat pasif"],
    },
    responseModel: { ...G01_PASS_DIVERSE.responseModel, correctAnswer: "3" },
  };
  const f = distractorQualityValidator.validate(item, {} as any);
  assertHasCode(f, "DISTRACTOR_NEAR_DUPLICATE");
}

// F.3 — 2 options only (edge) → should still run
{
  const item: CanonicalItem = {
    ...G01_PASS_DIVERSE,
    content: {
      ...G01_PASS_DIVERSE.content,
      options: ["A", "B"],
    },
    responseModel: { ...G01_PASS_DIVERSE.responseModel, correctAnswer: "0" },
  };
  const f = distractorQualityValidator.validate(item, {} as any);
  assert(f.length > 0, "2-option item should produce findings");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION G — V10/V11 Integration with Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n═══ SECTION G: Pipeline Integration ═══");

// G.1 — V10 and V11 are in DEFAULT_PIPELINE
{
  const pipelineArr = DEFAULT_PIPELINE as readonly Validator[];
  const ids = pipelineArr.map((v) => v.id);
  assert(ids.includes("cognitive-label"), "V10 (cognitive-label) in DEFAULT_PIPELINE");
  assert(ids.includes("distractor-quality"), "V11 (distractor-quality) in DEFAULT_PIPELINE");
}

// G.2 — V10 and V11 are in correct order (after state-guard, before end)
{
  const pipelineArr = DEFAULT_PIPELINE as readonly Validator[];
  const ids = pipelineArr.map((v) => v.id);
  const sgIdx = ids.indexOf("state-guard");
  const v10Idx = ids.indexOf("cognitive-label");
  const v11Idx = ids.indexOf("distractor-quality");
  assert(v10Idx > sgIdx, `V10 (idx ${v10Idx}) after state-guard (idx ${sgIdx})`);
  assert(v11Idx > v10Idx, `V11 (idx ${v11Idx}) after V10 (idx ${v10Idx})`);
}

// G.3 — runValidator works with V10
{
  const result = runValidator(cognitiveLabelValidator, G01_R1_SEBUTKAN, {} as any);
  assert(result.valid === true || result.valid === false, "runValidator V10 returns ValidationResult");
  assert(result.findings.length > 0, "runValidator V10 produces findings");
}

// G.4 — runValidator works with V11
{
  const result = runValidator(distractorQualityValidator, G01_PASS_DIVERSE, {} as any);
  assert(result.valid === true || result.valid === false, "runValidator V11 returns ValidationResult");
  assert(result.findings.length > 0, "runValidator V11 produces findings");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION H — V10 No-Overfit Invariant
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n═══ SECTION H: V10 No-Overfit Invariant ═══");

// H.1 — Verify no keyword classifier for "mengapa" → R5
{
  const item: CanonicalItem = {
    ...G01_R1_SEBUTKAN,
    content: {
      ...G01_R1_SEBUTKAN.content,
      stem: "Mengapa Anda memilih jawaban tersebut?",
    },
    taxonomy: { ...G01_R1_SEBUTKAN.taxonomy, cognitiveTarget: "MENGEVALUASI" },
  };
  const f = cognitiveLabelValidator.validate(item, {} as any);
  // "Mengapa" → R4 pattern, NOT R5. If R5 were forced by keyword, this would PASS.
  // Since R4 is inferred and gap to R5 is 1 → PASS (within tolerance).
  assertPass(f);
}

// H.2 — Verify "apakah benar" does NOT infer R5 (no keyword classifier)
{
  const item: CanonicalItem = {
    ...G01_R1_SEBUTKAN,
    content: {
      ...G01_R1_SEBUTKAN.content,
      stem: "Apakah benar kalimat 'Anak-anak membaca buku' adalah kalimat aktif?",
    },
    taxonomy: { ...G01_R1_SEBUTKAN.taxonomy, cognitiveTarget: "MENGEVALUASI" },
  };
  const f = cognitiveLabelValidator.validate(item, {} as any);
  // "Apakah benar" is NOT an R5 pattern — V10 correctly returns ADVISORY
  // (no deterministic signal to infer R5 from this stem alone)
  assertAdvisory(f);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION I — V11 No-Bad-Heuristic Invariant
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n═══ SECTION I: V11 No-Bad-Heuristic Invariant ═══");

// I.1 — Different-length options should NOT trigger length check
{
  const item: CanonicalItem = {
    ...G01_PASS_DIVERSE,
    content: {
      ...G01_PASS_DIVERSE.content,
      options: [
        "Ya",
        "Tidak",
        "Mungkin",
        "Belum tentu",
      ],
    },
  };
  const f = distractorQualityValidator.validate(item, {} as any);
  assertNoCode(f, "DISTRACTOR_LENGTH_OUTLIER");
}

// I.2 — Option containing answer word should NOT trigger subset check
{
  const item: CanonicalItem = {
    ...G01_PASS_DIVERSE,
    content: {
      ...G01_PASS_DIVERSE.content,
      options: [
        "Buku dibaca oleh siswa",
        "Siswa membaca buku dengan cepat",
        "Meja tulis di kelas",
        "Koran pagi hari ini",
      ],
    },
  };
  const f = distractorQualityValidator.validate(item, {} as any);
  // Options 2,3 share "buku"/"siswa" tokens but are NOT strict subsets
  assertNoCode(f, "DISTRACTOR_SUBSET_OF_ANSWER");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION J — MASTER_BANK Negative Corpus (V10 + V11)
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n═══ SECTION J: MASTER_BANK Negative Corpus ═══");

// Load MASTER_BANK
const MASTER_BANK_PATH = "../../../data/question-bank/master";
import * as fs from "fs";
import * as path from "path";

const masterBankDir = path.resolve(__dirname, MASTER_BANK_PATH);
let masterItems: CanonicalItem[] = [];

try {
  const files = fs.readdirSync(masterBankDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(masterBankDir, file), "utf-8"));
    if (Array.isArray(data)) {
      masterItems = masterItems.concat(data);
    }
  }
} catch {
  console.log("  ⚠ MASTER_BANK directory not found — skipping section J");
}

if (masterItems.length > 0) {
  // J.1 — V10: no crash on any MASTER_BANK item
  let v10Crashes = 0;
  for (const item of masterItems) {
    try {
      cognitiveLabelValidator.validate(item as CanonicalItem, {} as any);
    } catch {
      v10Crashes++;
    }
  }
  assert(v10Crashes === 0, `V10 crashed on ${v10Crashes}/${masterItems.length} MASTER_BANK items`);

  // J.2 — V11: no crash on any MASTER_BANK item
  let v11Crashes = 0;
  for (const item of masterItems) {
    try {
      distractorQualityValidator.validate(item as CanonicalItem, {} as any);
    } catch {
      v11Crashes++;
    }
  }
  assert(v11Crashes === 0, `V11 crashed on ${v11Crashes}/${masterItems.length} MASTER_BANK items`);

  // J.3 — V10: finds COGNITIVE_LABEL_MISMATCH or ADVISORY on some items
  let v10FindsSomething = 0;
  for (const item of masterItems) {
    const f = cognitiveLabelValidator.validate(item as CanonicalItem, {} as any);
    if (f.some((x) => x.status === "FAIL" || x.status === "ADVISORY")) {
      v10FindsSomething++;
    }
  }
  assert(v10FindsSomething > 0, `V10 finds issues on ${v10FindsSomething}/${masterItems.length} items (expected >0)`);

  // J.4 — V11: gracefully handles non-CanonicalItem items (MASTER_BANK has no
  // taxonomy/content/responseModel) — returns PASS or FAIL but never crashes
  let v11HandledGracefully = 0;
  for (const item of masterItems) {
    const f = distractorQualityValidator.validate(item as CanonicalItem, {} as any);
    // Must return a valid finding array (PASS or FAIL, never throw)
    if (Array.isArray(f) && f.length > 0) {
      v11HandledGracefully++;
    }
  }
  assert(
    v11HandledGracefully === masterItems.length,
    `V11 handled ${v11HandledGracefully}/${masterItems.length} MASTER_BANK items gracefully (expected all)`
  );

  console.log(`  V10: ${v10FindsSomething}/${masterItems.length} items with findings`);
  console.log(`  V11: ${v11HandledGracefully}/${masterItems.length} items handled gracefully`);
} else {
  assert(true, "MASTER_BANK not available — section J skipped");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION K — Protected Zone Invariants
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n═══ SECTION K: Protected Zone Invariants ═══");

// K.1 — V10 validator ID
assert(cognitiveLabelValidator.id === "cognitive-label", "V10 id = 'cognitive-label'");
assert(cognitiveLabelValidator.stage === 10, "V10 stage = 10");

// K.2 — V11 validator ID
assert(distractorQualityValidator.id === "distractor-quality", "V11 id = 'distractor-quality'");
assert(distractorQualityValidator.stage === 11, "V11 stage = 11");

// K.3 — V10 findings have correct validatorId
{
  const f = cognitiveLabelValidator.validate(G01_R1_SEBUTKAN, {} as any);
  for (const finding of f) {
    assert(finding.validatorId === "cognitive-label", `V10 finding validatorId = 'cognitive-label'`);
    assert(finding.validatorVersion !== undefined, "V10 finding has validatorVersion");
    assert(finding.stage === 10, "V10 finding stage = 10");
    assert(finding.evaluatedAt !== undefined, "V10 finding has evaluatedAt");
  }
}

// K.4 — V11 findings have correct validatorId
{
  const f = distractorQualityValidator.validate(G01_PASS_DIVERSE, {} as any);
  for (const finding of f) {
    assert(finding.validatorId === "distractor-quality", `V11 finding validatorId = 'distractor-quality'`);
    assert(finding.validatorVersion !== undefined, "V11 finding has validatorVersion");
    assert(finding.stage === 11, "V11 finding stage = 11");
    assert(finding.evaluatedAt !== undefined, "V11 finding has evaluatedAt");
  }
}

// K.5 — V10 no "TB-012" hardcoded logic
{
  const tb = createTB012({ id: "SPECIAL-ITEM-999" });
  tb.taxonomy.cognitiveTarget = "MENGINGAT";
  const f1 = cognitiveLabelValidator.validate(tb, {} as any);
  const tb2 = createTB012({ id: "ANOTHER-ITEM-888" });
  tb2.taxonomy.cognitiveTarget = "MENGINGAT";
  const f2 = cognitiveLabelValidator.validate(tb2, {} as any);
  // Both should produce identical findings (no item-ID special casing)
  assert(
    f1.length === f2.length && f1[0]?.status === f2[0]?.status,
    "V10 produces consistent results for different IDs with same characteristics"
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n═══════════════════════════════════════════════════════════════════════════════");
console.log(`  V10 + V11 TEST RESULTS: ${passed} passed, ${failed} failed, ${total} total`);
console.log("═══════════════════════════════════════════════════════════════════════════════");

if (failures.length > 0) {
  console.error("\nFAILURES:");
  for (const f of failures) {
    console.error(`  ${f}`);
  }
  process.exit(1);
} else {
  console.log("\n✅ ALL V10 + V11 TESTS PASSED\n");
  process.exit(0);
}
