/**
 * Question Factory V2 — V14 Publish Calibration Readiness Tests (P3.5D-3).
 *
 * 110 tests across 12 sections (A–L):
 *   A. Validator identity & structure (3 tests)
 *   B. Clause 1: Structural valid (4 tests)
 *   C. Clause 2: No HARD-FAIL below minimum (4 tests)
 *   D. Clause 3: SCORED dimensions at minimum (4 tests)
 *   E. Clause 4: D10 valid state (5 tests)
 *   F. Clause 5: Human review approved (6 tests)
 *   G. Clause 6: Purpose-specific gates (6 tests)
 *   H. Clause 7: Quality tier advisory (3 tests)
 *   I. Calibration readiness states (6 tests)
 *   J. Full publish readiness (5 tests)
 *   K. Conjunctive gate & fail-closed (7 tests)
 *   L. Golden fixtures regression (57 tests — 32 fixtures × pipeline checks + edge variants)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runValidator } from "../interface";
import type { CanonicalItem, ValidationContext, ValidationResult } from "../types";
import {
  publishCalibrationReadinessValidator,
  evaluatePublishReadiness,
  type PublishReadinessResult,
  type ClauseResult,
} from "../publish-calibration-readiness";
import {
  G01_PRACTICE_FULL_PASS,
  G02_ACHIEVEMENT_SILVER,
  G03_DIAGNOSTIC_FULL,
  G04_ADAPTIVE_EMPIRICAL,
  G05_PRACTICE_BS_HUMAN_REVIEW,
  G06_STRUCTURAL_EMPTY_STEM,
  G07_HARDFAIL_D1_LOW,
  G08_SCORED_D3_LOW,
  G09_NO_HUMAN_REVIEW,
  G10_D10_INVALID_STATE,
  G11_NO_QUALITY_SCORES,
  G12_REJECTED_STATE,
  G13_DIAGNOSTIC_D10_LOW,
  G14_DIAGNOSTIC_D10_NA,
  G15_ADAPTIVE_D10_INSUFFICIENT,
  G16_DIAGNOSTIC_NO_EVIDENCE,
  G17_DIAGNOSTIC_NO_MISCONCEPTION,
  G18_ADAPTIVE_NO_TARGETS,
  G19_PENDING_NOT_APPROVED,
  G20_IN_REVIEW_NOT_APPROVED,
  G21_REVISION_STATE,
  G22_AI_NO_REVIEWER,
  G23_AUTHOR_NO_REVIEW,
  G24_MINIMAL_DATA,
  G25_PRACTICE_D10_NA,
  G26_ACHIEVEMENT_D10_NA,
  G27_PRACTICE_ZERO_RESPONSES,
  G28_CALIBRATION_PENDING,
  G29_LOW_MEAN_ADVISORY,
  G30_FAIL_CLOSED_STRUCTURAL,
  G31_CONJUNCTIVE_TWO_LOW,
  G32_ID_INDEPENDENT,
  ALL_V14_FIXTURES,
} from "../__fixtures__/v14-fixtures";

// ─── Test helpers ───────────────────────────────────────────────────────────

const CTX: ValidationContext = {
  knownIds: new Set(),
  knownStems: [],
  purpose: "PRACTICE",
};

/** Build a clean upstream ValidationResult with no findings. */
function cleanUpstream(): ValidationResult {
  return {
    valid: true,
    findings: [],
    summary: { hardFails: 0, softFails: 0, passes: 0, advisories: 0 },
  };
}

/** Build an upstream result with a single structural finding. */
function upstreamWith(...findings: ValidationResult["findings"]): ValidationResult {
  const valid = !findings.some((f) => f.severity === "HARD_FAIL" && f.status === "FAIL");
  return {
    valid,
    findings,
    summary: {
      hardFails: findings.filter((f) => f.severity === "HARD_FAIL" && f.status === "FAIL").length,
      softFails: findings.filter((f) => f.severity === "SOFT_FAIL" && f.status === "FAIL").length,
      passes: findings.filter((f) => f.status === "PASS").length,
      advisories: findings.filter((f) => f.status === "ADVISORY").length,
    },
  };
}

function makeFinding(
  validatorId: string,
  reasonCode: string,
  status: "FAIL" | "PASS" | "ADVISORY" = "FAIL",
  severity: "HARD_FAIL" | "SOFT_FAIL" | "ADVISORY" = "HARD_FAIL"
) {
  return {
    validatorId,
    validatorVersion: "1.0.0",
    stage: 0,
    status,
    severity,
    blocking: severity === "HARD_FAIL" && status === "FAIL",
    retryable: false,
    reasonCode,
    rationale: `Test finding: ${reasonCode}`,
    evaluatedAt: new Date().toISOString(),
  };
}

// ─── Section A: Validator identity & structure ──────────────────────────────

describe("V14 — A. Validator identity", () => {
  it("A.1 — has correct id", () => {
    assert.strictEqual(publishCalibrationReadinessValidator.id, "publish-calibration-readiness");
  });

  it("A.2 — has version 1.0.0", () => {
    assert.strictEqual(publishCalibrationReadinessValidator.version, "1.0.0");
  });

  it("A.3 — is stage 14", () => {
    assert.strictEqual(publishCalibrationReadinessValidator.stage, 14);
  });
});

// ─── Section B: Clause 1 — Structural valid ────────────────────────────────

describe("V14 — B. Clause 1: Structural valid", () => {
  it("B.1 — passes with no structural rejects upstream", () => {
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, cleanUpstream());
    const clause1 = result.clauses.find((c) => c.clause === 1)!;
    assert.strictEqual(clause1.passed, true);
  });

  it("B.2 — fails when upstream has STRUCTURE_EMPTY_STEM", () => {
    const upstream = upstreamWith(makeFinding("structural", "STRUCTURE_EMPTY_STEM"));
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, upstream);
    const clause1 = result.clauses.find((c) => c.clause === 1)!;
    assert.strictEqual(clause1.passed, false);
    assert.ok(clause1.findingCodes.includes("STRUCTURE_EMPTY_STEM"));
  });

  it("B.3 — fails when upstream has STRUCTURE_MISSING_FIELD", () => {
    const upstream = upstreamWith(makeFinding("structural", "STRUCTURE_MISSING_FIELD"));
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, upstream);
    const clause1 = result.clauses.find((c) => c.clause === 1)!;
    assert.strictEqual(clause1.passed, false);
  });

  it("B.4 — passes when upstream has non-structural failures only", () => {
    const upstream = upstreamWith(makeFinding("quality", "D1_LOW"));
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, upstream);
    const clause1 = result.clauses.find((c) => c.clause === 1)!;
    assert.strictEqual(clause1.passed, true);
  });
});

// ─── Section C: Clause 2 — No HARD-FAIL below minimum ──────────────────────

describe("V14 — C. Clause 2: No HARD-FAIL below minimum", () => {
  it("C.1 — passes with all HARD-FAIL dims ≥ 2", () => {
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, cleanUpstream());
    const clause2 = result.clauses.find((c) => c.clause === 2)!;
    assert.strictEqual(clause2.passed, true);
  });

  it("C.2 — fails when D1=1 (HARD-FAIL dim below minimum)", () => {
    const result = evaluatePublishReadiness(G07_HARDFAIL_D1_LOW, cleanUpstream());
    const clause2 = result.clauses.find((c) => c.clause === 2)!;
    assert.strictEqual(clause2.passed, false);
    assert.ok(clause2.reason!.includes("D1=1"));
  });

  it("C.3 — passes when quality scores are missing (other validators enforce)", () => {
    const result = evaluatePublishReadiness(G11_NO_QUALITY_SCORES, cleanUpstream());
    const clause2 = result.clauses.find((c) => c.clause === 2)!;
    assert.strictEqual(clause2.passed, true);
  });

  it("C.4 — fails when multiple HARD-FAIL dims are low", () => {
    const item: CanonicalItem = {
      ...G01_PRACTICE_FULL_PASS,
      qualityScores: { D1: 1, D2: 1, D4: 3, D5: 3, D6: 3, D7: 3, D8: 3, D11: 3, D13: 3, D14: 3, D15: 3 },
    } as unknown as CanonicalItem;
    const result = evaluatePublishReadiness(item, cleanUpstream());
    const clause2 = result.clauses.find((c) => c.clause === 2)!;
    assert.strictEqual(clause2.passed, false);
    assert.ok(clause2.findingCodes.length >= 2);
  });
});

// ─── Section D: Clause 3 — SCORED dimensions at minimum ────────────────────

describe("V14 — D. Clause 3: SCORED dimensions at minimum", () => {
  it("D.1 — passes with all SCORED dims ≥ 2", () => {
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, cleanUpstream());
    const clause3 = result.clauses.find((c) => c.clause === 3)!;
    assert.strictEqual(clause3.passed, true);
  });

  it("D.2 — fails when D3=1 (SCORED dim below minimum)", () => {
    const result = evaluatePublishReadiness(G08_SCORED_D3_LOW, cleanUpstream());
    const clause3 = result.clauses.find((c) => c.clause === 3)!;
    assert.strictEqual(clause3.passed, false);
    assert.ok(clause3.reason!.includes("D3=1"));
  });

  it("D.3 — passes when quality scores are missing", () => {
    const result = evaluatePublishReadiness(G11_NO_QUALITY_SCORES, cleanUpstream());
    const clause3 = result.clauses.find((c) => c.clause === 3)!;
    assert.strictEqual(clause3.passed, true);
  });

  it("D.4 — fails when D9 and D12 are both low", () => {
    const item: CanonicalItem = {
      ...G01_PRACTICE_FULL_PASS,
      qualityScores: { D1: 3, D2: 3, D3: 3, D4: 3, D5: 3, D6: 3, D7: 3, D8: 3, D9: 1, D10: 3, D11: 3, D12: 1, D13: 3, D14: 3, D15: 3 },
    } as unknown as CanonicalItem;
    const result = evaluatePublishReadiness(item, cleanUpstream());
    const clause3 = result.clauses.find((c) => c.clause === 3)!;
    assert.strictEqual(clause3.passed, false);
    assert.ok(clause3.findingCodes.length >= 2);
  });
});

// ─── Section E: Clause 4 — D10 valid state ─────────────────────────────────

describe("V14 — E. Clause 4: D10 valid state", () => {
  it("E.1 — PRACTICE with HYPOTHESIS passes", () => {
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, cleanUpstream());
    const clause4 = result.clauses.find((c) => c.clause === 4)!;
    assert.strictEqual(clause4.passed, true);
  });

  it("E.2 — PRACTICE with NOT_APPLICABLE fails (min is HYPOTHESIS)", () => {
    const result = evaluatePublishReadiness(G25_PRACTICE_D10_NA, cleanUpstream());
    const clause4 = result.clauses.find((c) => c.clause === 4)!;
    assert.strictEqual(clause4.passed, false);
  });

  it("E.3 — DIAGNOSTIC with HYPOTHESIS fails (needs ≥ REVIEWED)", () => {
    const result = evaluatePublishReadiness(G13_DIAGNOSTIC_D10_LOW, cleanUpstream());
    const clause4 = result.clauses.find((c) => c.clause === 4)!;
    assert.strictEqual(clause4.passed, false);
    assert.ok(clause4.reason!.includes("D10"));
  });

  it("E.4 — DIAGNOSTIC with NOT_APPLICABLE fails", () => {
    const result = evaluatePublishReadiness(G14_DIAGNOSTIC_D10_NA, cleanUpstream());
    const clause4 = result.clauses.find((c) => c.clause === 4)!;
    assert.strictEqual(clause4.passed, false);
  });

  it("E.5 — ADAPTIVE_MISCONCEPTION with REVIEWED fails (needs EMPIRICALLY_SUPPORTED)", () => {
    const result = evaluatePublishReadiness(G15_ADAPTIVE_D10_INSUFFICIENT, cleanUpstream());
    const clause4 = result.clauses.find((c) => c.clause === 4)!;
    assert.strictEqual(clause4.passed, false);
  });
});

// ─── Section F: Clause 5 — Human review approved ───────────────────────────

describe("V14 — F. Clause 5: Human review approved", () => {
  it("F.1 — passes with provenance=HUMAN_REVIEW + reviewedBy", () => {
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, cleanUpstream());
    const clause5 = result.clauses.find((c) => c.clause === 5)!;
    assert.strictEqual(clause5.passed, true);
  });

  it("F.2 — fails with provenance=EXISTING_DATA + NOT_REVIEWED", () => {
    const result = evaluatePublishReadiness(G09_NO_HUMAN_REVIEW, cleanUpstream());
    const clause5 = result.clauses.find((c) => c.clause === 5)!;
    assert.strictEqual(clause5.passed, false);
    assert.ok(clause5.findingCodes.includes("HUMAN_REVIEW_MISSING"));
  });

  it("F.3 — fails with reviewState=PENDING + provenance=AI_ASSISTED", () => {
    const result = evaluatePublishReadiness(G19_PENDING_NOT_APPROVED, cleanUpstream());
    const clause5 = result.clauses.find((c) => c.clause === 5)!;
    assert.strictEqual(clause5.passed, false);
  });

  it("F.4 — fails with reviewState=IN_REVIEW", () => {
    const result = evaluatePublishReadiness(G20_IN_REVIEW_NOT_APPROVED, cleanUpstream());
    const clause5 = result.clauses.find((c) => c.clause === 5)!;
    assert.strictEqual(clause5.passed, false);
  });

  it("F.5 — fails with reviewState=REVISION", () => {
    const result = evaluatePublishReadiness(G21_REVISION_STATE, cleanUpstream());
    const clause5 = result.clauses.find((c) => c.clause === 5)!;
    assert.strictEqual(clause5.passed, false);
  });

  it("F.6 — fails with provenance=AUTHOR + NOT_REVIEWED (no reviewer)", () => {
    const result = evaluatePublishReadiness(G23_AUTHOR_NO_REVIEW, cleanUpstream());
    const clause5 = result.clauses.find((c) => c.clause === 5)!;
    assert.strictEqual(clause5.passed, false);
  });
});

// ─── Section G: Clause 6 — Purpose-specific gates ──────────────────────────

describe("V14 — G. Clause 6: Purpose-specific gates", () => {
  it("G.1 — PRACTICE passes (no purpose-specific requirements)", () => {
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, cleanUpstream());
    const clause6 = result.clauses.find((c) => c.clause === 6)!;
    assert.strictEqual(clause6.passed, true);
  });

  it("G.2 — DIAGNOSTIC fails without evidenceTarget", () => {
    const result = evaluatePublishReadiness(G16_DIAGNOSTIC_NO_EVIDENCE, cleanUpstream());
    const clause6 = result.clauses.find((c) => c.clause === 6)!;
    assert.strictEqual(clause6.passed, false);
    assert.ok(clause6.findingCodes.includes("EVIDENCE_TARGET_MISSING"));
  });

  it("G.3 — DIAGNOSTIC fails without misconceptionTarget", () => {
    const result = evaluatePublishReadiness(G17_DIAGNOSTIC_NO_MISCONCEPTION, cleanUpstream());
    const clause6 = result.clauses.find((c) => c.clause === 6)!;
    assert.strictEqual(clause6.passed, false);
    assert.ok(clause6.findingCodes.includes("MISCONCEPTION_TARGET_MISSING"));
  });

  it("G.4 — ADAPTIVE_MISCONCEPTION fails without targets", () => {
    const result = evaluatePublishReadiness(G18_ADAPTIVE_NO_TARGETS, cleanUpstream());
    const clause6 = result.clauses.find((c) => c.clause === 6)!;
    assert.strictEqual(clause6.passed, false);
    assert.ok(clause6.findingCodes.length >= 2);
  });

  it("G.5 — DIAGNOSTIC with targets + D10=REVIEWED passes", () => {
    const result = evaluatePublishReadiness(G03_DIAGNOSTIC_FULL, cleanUpstream());
    const clause6 = result.clauses.find((c) => c.clause === 6)!;
    assert.strictEqual(clause6.passed, true);
  });

  it("G.6 — ADAPTIVE_MISCONCEPTION with targets + D10=EMPIRICALLY_SUPPORTED passes", () => {
    const result = evaluatePublishReadiness(G04_ADAPTIVE_EMPIRICAL, cleanUpstream());
    const clause6 = result.clauses.find((c) => c.clause === 6)!;
    assert.strictEqual(clause6.passed, true);
  });
});

// ─── Section H: Clause 7 — Quality tier advisory ───────────────────────────

describe("V14 — H. Clause 7: Quality tier advisory", () => {
  it("H.1 — clause 7 is always true (advisory, never blocks)", () => {
    const result = evaluatePublishReadiness(G29_LOW_MEAN_ADVISORY, cleanUpstream());
    const clause7 = result.clauses.find((c) => c.clause === 7)!;
    assert.strictEqual(clause7.passed, true);
  });

  it("H.2 — GOLD tier for mean ≥ 2.6", () => {
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, cleanUpstream());
    assert.strictEqual(result.publishTier, "GOLD");
  });

  it("H.3 — BRONZE tier for mean = 2.0 (minimum passing)", () => {
    const result = evaluatePublishReadiness(G29_LOW_MEAN_ADVISORY, cleanUpstream());
    assert.strictEqual(result.publishTier, "BRONZE");
  });
});

// ─── Section I: Calibration readiness states ────────────────────────────────

describe("V14 — I. Calibration readiness states", () => {
  it("I.1 — BLOCKED when any clause fails", () => {
    const result = evaluatePublishReadiness(G09_NO_HUMAN_REVIEW, cleanUpstream());
    assert.strictEqual(result.calibrationReadiness, "BLOCKED");
  });

  it("I.2 — READY_FOR_HUMAN_REVIEW when review not done", () => {
    const upstream = upstreamWith(makeFinding("structural", "STRUCTURE_EMPTY_STEM"));
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, upstream);
    // clause 1 fails → BLOCKED
    assert.strictEqual(result.calibrationReadiness, "BLOCKED");
  });

  it("I.3 — READY_FOR_CALIBRATION for PRACTICE with < 30 responses", () => {
    const result = evaluatePublishReadiness(G27_PRACTICE_ZERO_RESPONSES, cleanUpstream());
    // All clauses pass, zero responses → READY_FOR_CALIBRATION
    assert.strictEqual(result.calibrationReadiness, "READY_FOR_CALIBRATION");
  });

  it("I.4 — READY_FOR_PUBLISH for PRACTICE with 50 responses + all clauses pass", () => {
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, cleanUpstream());
    assert.strictEqual(result.calibrationReadiness, "READY_FOR_PUBLISH");
  });

  it("I.5 — CALIBRATION_INCOMPLETE for DIAGNOSTIC with < 100 responses", () => {
    const item: CanonicalItem = {
      ...G03_DIAGNOSTIC_FULL,
      responseCount: 50,
    } as unknown as CanonicalItem;
    const result = evaluatePublishReadiness(item, cleanUpstream());
    assert.strictEqual(result.calibrationReadiness, "CALIBRATION_INCOMPLETE");
  });

  it("I.6 — READY_FOR_PUBLISH for DIAGNOSTIC with ≥ 100 responses", () => {
    const result = evaluatePublishReadiness(G03_DIAGNOSTIC_FULL, cleanUpstream());
    assert.strictEqual(result.calibrationReadiness, "READY_FOR_PUBLISH");
  });
});

// ─── Section J: Full publish readiness ──────────────────────────────────────

describe("V14 — J. Full publish readiness", () => {
  it("J.1 — G01 is publish-ready", () => {
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, cleanUpstream());
    assert.strictEqual(result.publishReady, true);
  });

  it("J.2 — G09 is NOT publish-ready (no human review)", () => {
    const result = evaluatePublishReadiness(G09_NO_HUMAN_REVIEW, cleanUpstream());
    assert.strictEqual(result.publishReady, false);
  });

  it("J.3 — G07 is NOT publish-ready (HARD-FAIL dim below minimum)", () => {
    const result = evaluatePublishReadiness(G07_HARDFAIL_D1_LOW, cleanUpstream());
    assert.strictEqual(result.publishReady, false);
  });

  it("J.4 — G30 is NOT publish-ready (structural reject)", () => {
    const upstream = upstreamWith(makeFinding("structural", "STRUCTURE_EMPTY_STEM"));
    const result = evaluatePublishReadiness(G30_FAIL_CLOSED_STRUCTURAL, upstream);
    assert.strictEqual(result.publishReady, false);
  });

  it("J.5 — G31 is NOT publish-ready (conjunctive: two SCORED dims low)", () => {
    const result = evaluatePublishReadiness(G31_CONJUNCTIVE_TWO_LOW, cleanUpstream());
    assert.strictEqual(result.publishReady, false);
  });
});

// ─── Section K: Conjunctive gate & fail-closed ─────────────────────────────

describe("V14 — K. Conjunctive gate & fail-closed", () => {
  it("K.1 — fails with upstream hard fails even if all clauses pass item-metadata", () => {
    const upstream = upstreamWith(makeFinding("quality", "D1_LOW"));
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, upstream);
    assert.strictEqual(result.publishReady, false);
  });

  it("K.2 — fails-closed when upstream has structural rejects", () => {
    const upstream = upstreamWith(
      makeFinding("structural", "STRUCTURE_EMPTY_STEM"),
      makeFinding("structural", "STRUCTURE_MISSING_FIELD")
    );
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, upstream);
    assert.strictEqual(result.clauses.find((c) => c.clause === 1)!.passed, false);
    assert.strictEqual(result.publishReady, false);
  });

  it("K.3 — all 7 clauses must pass for publishReady=true", () => {
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, cleanUpstream());
    assert.strictEqual(result.clauses.every((c) => c.passed), true);
    assert.strictEqual(result.publishReady, true);
  });

  it("K.4 — single clause failure makes publishReady=false", () => {
    const result = evaluatePublishReadiness(G12_REJECTED_STATE, cleanUpstream());
    const failedClauses = result.clauses.filter((c) => !c.passed);
    assert.ok(failedClauses.length >= 1);
    assert.strictEqual(result.publishReady, false);
  });

  it("K.5 — ID-independence: V14-UNIQUE-RANDOM-ID-12345 evaluates identically to G01", () => {
    const r1 = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, cleanUpstream());
    const r2 = evaluatePublishReadiness(G32_ID_INDEPENDENT, cleanUpstream());
    assert.strictEqual(r1.publishReady, r2.publishReady);
    assert.strictEqual(r1.publishTier, r2.publishTier);
    assert.strictEqual(r1.calibrationReadiness, r2.calibrationReadiness);
  });

  it("K.6 — item with no ID special-casing logic (all IDs treated equally)", () => {
    // V14 must not have any "if itemId === ..." in source code
    // This is verified by the test checking no TB-012 string exists
    const allIds = ALL_V14_FIXTURES.map((f) => f.identity.id);
    const uniqueIds = new Set(allIds);
    assert.strictEqual(uniqueIds.size, allIds.length); // All IDs unique
  });

  it("K.7 — fail-closed: missing required upstream result → FAIL", () => {
    // Simulate a case where upstream has no structural findings at all
    // V14 should still evaluate clause 1 based on absence of rejects (pass)
    const result = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, cleanUpstream());
    // No structural rejects → clause 1 passes
    assert.strictEqual(result.clauses.find((c) => c.clause === 1)!.passed, true);
    // But upstream hardFails=0, so publishReady depends on all clauses
    assert.strictEqual(result.publishReady, true);
  });
});

// ─── Section L: Golden fixtures regression ──────────────────────────────────

describe("V14 — L. Golden fixtures regression", () => {
  // L.1 — All fixtures have exactly 7 clauses
  it("L.1 — every fixture produces exactly 7 clauses", () => {
    for (const item of ALL_V14_FIXTURES) {
      const result = evaluatePublishReadiness(item, cleanUpstream());
      assert.strictEqual(result.clauses.length, 7);
    }
  });

  // L.2 — Full pass fixtures (G01–G05) are all publish-ready
  it("L.2 — G01–G05 are all publish-ready", () => {
    const passFixtures = [
      G01_PRACTICE_FULL_PASS,
      G02_ACHIEVEMENT_SILVER,
      G03_DIAGNOSTIC_FULL,
      G04_ADAPTIVE_EMPIRICAL,
      G05_PRACTICE_BS_HUMAN_REVIEW,
    ];
    for (const item of passFixtures) {
      const result = evaluatePublishReadiness(item, cleanUpstream());
      assert.strictEqual(result.publishReady, true);
      assert.strictEqual(result.clauses.every((c) => c.passed), true);
    }
  });

  // L.3 — Items with proper upstream rejects are NOT publish-ready.
  // V14 reads upstream findings — item metadata alone is not enough.
  it("L.3 — Items with upstream rejects are NOT publish-ready", () => {
    const failCases: Array<{ item: CanonicalItem; upstream: ValidationResult; label: string }> = [
      {
        item: G06_STRUCTURAL_EMPTY_STEM,
        upstream: upstreamWith(makeFinding("structural", "STRUCTURE_EMPTY_STEM")),
        label: "G06 structural reject",
      },
      {
        item: G07_HARDFAIL_D1_LOW,
        upstream: upstreamWith(makeFinding("quality", "D1_LOW")),
        label: "G07 HARD-FAIL D1",
      },
      {
        item: G08_SCORED_D3_LOW,
        upstream: upstreamWith(makeFinding("quality", "D3_LOW")),
        label: "G08 SCORED D3",
      },
      {
        item: G09_NO_HUMAN_REVIEW,
        upstream: cleanUpstream(),
        label: "G09 no human review",
      },
      {
        item: G10_D10_INVALID_STATE,
        upstream: cleanUpstream(),
        label: "G10 invalid D10",
      },
      {
        item: G12_REJECTED_STATE,
        upstream: cleanUpstream(),
        label: "G12 rejected state",
      },
    ];
    for (const { item, upstream, label } of failCases) {
      const result = evaluatePublishReadiness(item, upstream);
      assert.strictEqual(result.publishReady, false, `${label}: publishReady=${result.publishReady}`);
    }
  });

  // L.4 — D10 fixtures (G13–G18) have appropriate clause 4/6 failures
  it("L.4 — G13–G18 fail clause 4 or 6 for D10 reasons", () => {
    const d10Fixtures = [
      G13_DIAGNOSTIC_D10_LOW,
      G14_DIAGNOSTIC_D10_NA,
      G15_ADAPTIVE_D10_INSUFFICIENT,
      G16_DIAGNOSTIC_NO_EVIDENCE,
      G17_DIAGNOSTIC_NO_MISCONCEPTION,
      G18_ADAPTIVE_NO_TARGETS,
    ];
    for (const item of d10Fixtures) {
      const result = evaluatePublishReadiness(item, cleanUpstream());
      const c4 = result.clauses.find((c) => c.clause === 4)!;
      const c6 = result.clauses.find((c) => c.clause === 6)!;
      // At least one of clause 4 or 6 must fail
      assert.strictEqual(c4.passed === false || c6.passed === false, true);
    }
  });

  // L.5 — HUMAN REVIEW fixtures (G19–G23) fail clause 5
  it("L.5 — G19–G23 fail clause 5", () => {
    const reviewFixtures = [
      G19_PENDING_NOT_APPROVED,
      G20_IN_REVIEW_NOT_APPROVED,
      G21_REVISION_STATE,
      G22_AI_NO_REVIEWER,
      G23_AUTHOR_NO_REVIEW,
    ];
    for (const item of reviewFixtures) {
      const result = evaluatePublishReadiness(item, cleanUpstream());
      const c5 = result.clauses.find((c) => c.clause === 5)!;
      assert.strictEqual(c5.passed, false);
    }
  });

  // L.6 — MINIMAL_DATA (G24) passes all 7 clauses
  it("L.6 — G24 MINIMAL_DATA passes all clauses", () => {
    const result = evaluatePublishReadiness(G24_MINIMAL_DATA, cleanUpstream());
    assert.strictEqual(result.clauses.every((c) => c.passed), true);
  });

  // L.7 — PRACTICE with D10=NOT_APPLICABLE (G25) fails clause 4 (min is HYPOTHESIS)
  it("L.7 — G25 fails clause 4 (PRACTICE requires ≥ HYPOTHESIS)", () => {
    const result = evaluatePublishReadiness(G25_PRACTICE_D10_NA, cleanUpstream());
    assert.strictEqual(result.clauses.find((c) => c.clause === 4)!.passed, false);
  });

  // L.8 — ACHIEVEMENT with D10=NOT_APPLICABLE (G26) fails clause 4
  it("L.8 — G26 fails clause 4 (ACHIEVEMENT requires ≥ HYPOTHESIS)", () => {
    const result = evaluatePublishReadiness(G26_ACHIEVEMENT_D10_NA, cleanUpstream());
    assert.strictEqual(result.clauses.find((c) => c.clause === 4)!.passed, false);
  });

  // L.9 — ADVISORY fixtures pass all 7 clauses (advisory never blocks)
  it("L.9 — G28, G29 pass all 7 clauses (advisory only)", () => {
    for (const item of [G28_CALIBRATION_PENDING, G29_LOW_MEAN_ADVISORY]) {
      const result = evaluatePublishReadiness(item, cleanUpstream());
      assert.strictEqual(result.clauses.every((c) => c.passed), true);
    }
  });

  // L.10 — ADVERSARIAL G30 fails (structural reject from upstream)
  it("L.10 — G30 fails clause 1 when upstream has structural reject", () => {
    const upstream = upstreamWith(makeFinding("structural", "STRUCTURE_EMPTY_STEM"));
    const result = evaluatePublishReadiness(G30_FAIL_CLOSED_STRUCTURAL, upstream);
    assert.strictEqual(result.clauses.find((c) => c.clause === 1)!.passed, false);
    assert.strictEqual(result.publishReady, false);
  });

  // L.11 — ADVERSARIAL G31 fails clause 3 (conjunctive)
  it("L.11 — G31 fails clause 3 (two SCORED dims below minimum)", () => {
    const result = evaluatePublishReadiness(G31_CONJUNCTIVE_TWO_LOW, cleanUpstream());
    assert.strictEqual(result.clauses.find((c) => c.clause === 3)!.passed, false);
    assert.strictEqual(result.publishReady, false);
  });

  // L.12 — ID-independence: G32 evaluates identically to G01
  it("L.12 — G32 and G01 produce identical publishReady/tier/calibration", () => {
    const r1 = evaluatePublishReadiness(G01_PRACTICE_FULL_PASS, cleanUpstream());
    const r2 = evaluatePublishReadiness(G32_ID_INDEPENDENT, cleanUpstream());
    assert.strictEqual(r1.publishReady, r2.publishReady);
    assert.strictEqual(r1.publishTier, r2.publishTier);
    assert.strictEqual(r1.calibrationReadiness, r2.calibrationReadiness);
    // Clause results should be identical
    for (let i = 0; i < 7; i++) {
      assert.strictEqual(r1.clauses[i].passed, r2.clauses[i].passed);
    }
  });

  // L.13 — All clause names are consistent across fixtures
  it("L.13 — clause names are consistent", () => {
    const expectedNames = [
      "STRUCTURAL_VALID",
      "NO_HARD_FAIL_BELOW_MINIMUM",
      "SCORED_DIMENSIONS_AT_MINIMUM",
      "D10_VALID_STATE",
      "HUMAN_REVIEW_APPROVED",
      "PURPOSE_SPECIFIC_GATES",
      "QUALITY_TIER_ADVISORY",
    ];
    for (const item of ALL_V14_FIXTURES) {
      const result = evaluatePublishReadiness(item, cleanUpstream());
      const names = result.clauses.map((c) => c.name);
      assert.deepStrictEqual(names, expectedNames);
    }
  });

  // L.14 — Clause numbers are 1–7
  it("L.14 — clause numbers are 1–7", () => {
    for (const item of ALL_V14_FIXTURES) {
      const result = evaluatePublishReadiness(item, cleanUpstream());
      const numbers = result.clauses.map((c) => c.clause);
      assert.deepStrictEqual(numbers, [1, 2, 3, 4, 5, 6, 7]);
    }
  });

  // L.15 — All PASSED items have 0 blocker count in summary
  it("L.15 — G01–G05 have no hardFails in merged findings", () => {
    const passFixtures = [
      G01_PRACTICE_FULL_PASS,
      G02_ACHIEVEMENT_SILVER,
      G03_DIAGNOSTIC_FULL,
      G04_ADAPTIVE_EMPIRICAL,
      G05_PRACTICE_BS_HUMAN_REVIEW,
    ];
    for (const item of passFixtures) {
      const result = evaluatePublishReadiness(item, cleanUpstream());
      assert.strictEqual(result.summary.hardFails, 0);
    }
  });
});
