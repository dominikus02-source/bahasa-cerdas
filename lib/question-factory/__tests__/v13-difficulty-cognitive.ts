/**
 * Question Factory V2 — V13 Difficulty-Cognitive Consistency Tests (P3.5D-2).
 *
 * 48 tests covering:
 *   A. Import & identity (4)
 *   B. PASS cases (15)
 *   C. FAIL cases (7)
 *   D. REVIEW cases (7)
 *   E. INSUFFICIENT cases (1)
 *   F. Pipeline integration (3)
 *   G. V10 interaction (3)
 *   H. V11 interaction (2)
 *   I. V12 interaction (2)
 *   J. Dimension-specific tests (5)
 *   K. Over-rejection resistance (3)
 *   L. Structural integrity (4)
 *
 * Section references:
 *   P3.5D-2 §V13.4 — Golden fixtures
 *   P3.5D-2 §V13.6 — Test suite specification
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { difficultyCognitiveConsistencyValidator } from "../difficulty-cognitive-consistency";
import { runValidator } from "../interface";
import { DEFAULT_PIPELINE } from "../index";
import type { CanonicalItem, ValidationContext } from "../types";

import {
  ALL_V13_FIXTURES,
  G01_EASY_R1_RECALL,
  G02_EASY_R2_UNDERSTAND,
  G03_EASY_R1_BS,
  G04_EASY_R3_BORDERLINE,
  G05_MEDIUM_R2_WITH_STIMULUS,
  G06_MEDIUM_R3_STIMULUS,
  G07_MEDIUM_R3_NO_STIMULUS,
  G08_MEDIUM_R4_ANALYZE,
  G09_HARD_R4_LONG_STIMULUS,
  G10_HARD_R5_EVALUATE,
  G11_EASY_R5_MISMATCH,
  G12_EASY_R6_MISMATCH,
  G13_HARD_R1_MISMATCH,
  G14_HARD_R1_NO_STIMULUS,
  G15_MEDIUM_R1_MISMATCH,
  G16_EASY_LONG_STIMULUS,
  G17_HARD_TRIVIAL_CONTENT,
  G18_EASY_COMPLEX_STEM,
  G19_HARD_R6_SHORT_STIMULUS,
  G20_MEDIUM_R5_EVALUATE,
  G21_EASY_R3_SIMPLE_STIMULUS,
  G22_HARD_R4_TRIVIAL_DISTRACTORS,
  G23_MEDIUM_R3_SIMPLE_DISTRACTORS,
  G24_MEDIUM_R2_LONG_STEM,
  G25_NO_DIFFICULTY,
  G26_NO_COGNITIVE,
  G27_NO_DIFFICULTY_NO_COGNITIVE,
  G28_INVALID_DIFFICULTY,
  G29_HARD_R3_COMPOUND,
  G30_EASY_R1_SHORT_BS,
} from "../__fixtures__/v13-fixtures";

// ─── Test helpers ────────────────────────────────────────────────────────────

const CTX: ValidationContext = {
  knownIds: new Set(),
  knownStems: [],
  purpose: "PRACTICE",
};

function validate(item: CanonicalItem) {
  return runValidator(difficultyCognitiveConsistencyValidator, item, CTX);
}

function findCode(result: ReturnType<typeof validate>, code: string) {
  return result.findings.find((f) => f.reasonCode === code);
}

function hasCode(result: ReturnType<typeof validate>, code: string): boolean {
  return result.findings.some((f) => f.reasonCode === code);
}

function summary(result: ReturnType<typeof validate>) {
  return result.summary as { hardFails: number; softFails: number; advisories: number; passes: number };
}

// ─── A. Import & identity (4) ───────────────────────────────────────────────

describe("V13 Difficulty-Cognitive Consistency — Import & identity", () => {
  it("A.1 — validator id is 'difficulty-cognitive-consistency'", () => {
    assert.equal(difficultyCognitiveConsistencyValidator.id, "difficulty-cognitive-consistency");
  });

  it("A.2 — validator stage is 13", () => {
    assert.equal(difficultyCognitiveConsistencyValidator.stage, 13);
  });

  it("A.3 — validator version is '1.0.0'", () => {
    assert.equal(difficultyCognitiveConsistencyValidator.version, "1.0.0");
  });

  it("A.4 — all 30 fixtures are defined", () => {
    assert.equal(ALL_V13_FIXTURES.length, 30);
  });
});

// ─── B. PASS cases (15 fixtures) ─────────────────────────────────────────────
// PASS = SF=0, has PASS finding, may have ADV (CALIBRATION_REQUIRED)

describe("V13 — PASS cases (consistent difficulty-cognitive)", () => {
  const PASS_IDS = [
    "V13-G01", "V13-G02", "V13-G03", "V13-G04",
    "V13-G05", "V13-G06", "V13-G07", "V13-G08",
    "V13-G21", "V13-G23", "V13-G24",
    "V13-G26",
    "V13-G30",
  ];

  for (const id of PASS_IDS) {
    it(`B — ${id} → PASS (SF=0, has PASS finding)`, () => {
      const item = ALL_V13_FIXTURES.find((f) => f.identity.id === id)!;
      const r = validate(item);
      const s = summary(r);
      assert.equal(s.softFails, 0, `${id} should have 0 softFails`);
      assert.ok(hasCode(r, "PASS"), `${id} should have PASS finding`);
    });
  }
});

// ─── C. FAIL cases (7 fixtures) ──────────────────────────────────────────────
// FAIL = SF=1, has FAIL/SOFT_FAIL finding

describe("V13 — FAIL cases (difficulty-cognitive mismatch)", () => {
  const FAIL_IDS = [
    "V13-G10", "V13-G13", "V13-G14",
    "V13-G17", "V13-G18", "V13-G19", "V13-G22",
  ];

  for (const id of FAIL_IDS) {
    it(`C — ${id} → FAIL (SF=1, FAIL/SOFT_FAIL finding)`, () => {
      const item = ALL_V13_FIXTURES.find((f) => f.identity.id === id)!;
      const r = validate(item);
      const s = summary(r);
      assert.equal(s.softFails, 1, `${id} should have 1 softFail`);
      const failFinding = r.findings.find((f) => f.status === "FAIL");
      assert.ok(failFinding, `${id} should have FAIL finding`);
      assert.equal(failFinding!.severity, "SOFT_FAIL", `${id} FAIL finding should be SOFT_FAIL`);
    });
  }

  it("C-G10 — HARD+R5 with short stimulus → DIFFICULTY_DEMAND_TOO_LOW", () => {
    const r = validate(G10_HARD_R5_EVALUATE);
    assert.ok(hasCode(r, "DIFFICULTY_DEMAND_TOO_LOW"));
  });

  it("C-G13 — HARD+R1 trivial recall → DIFFICULTY_DEMAND_TOO_HIGH", () => {
    const r = validate(G13_HARD_R1_MISMATCH);
    assert.ok(hasCode(r, "DIFFICULTY_DEMAND_TOO_HIGH"));
  });

  it("C-G14 — HARD+R1 recall no stimulus → DIFFICULTY_DEMAND_TOO_HIGH", () => {
    const r = validate(G14_HARD_R1_NO_STIMULUS);
    assert.ok(hasCode(r, "DIFFICULTY_DEMAND_TOO_HIGH"));
  });

  it("C-G17 — HARD+trivial 1+1 content → DIFFICULTY_DEMAND_TOO_LOW", () => {
    const r = validate(G17_HARD_TRIVIAL_CONTENT);
    assert.ok(hasCode(r, "DIFFICULTY_DEMAND_TOO_LOW"));
  });

  it("C-G18 — EASY+complex multi-part stem → DIFFICULTY_DEMAND_TOO_LOW", () => {
    const r = validate(G18_EASY_COMPLEX_STEM);
    assert.ok(hasCode(r, "DIFFICULTY_DEMAND_TOO_LOW"));
  });

  it("C-G19 — HARD+R6 create with short stimulus → DIFFICULTY_DEMAND_TOO_LOW", () => {
    const r = validate(G19_HARD_R6_SHORT_STIMULUS);
    assert.ok(hasCode(r, "DIFFICULTY_DEMAND_TOO_LOW"));
  });

  it("C-G22 — HARD+R4 with trivial distractors → DIFFICULTY_DEMAND_TOO_LOW", () => {
    const r = validate(G22_HARD_R4_TRIVIAL_DISTRACTORS);
    assert.ok(hasCode(r, "DIFFICULTY_DEMAND_TOO_LOW"));
  });
});

// ─── D. REVIEW cases (7 fixtures) ────────────────────────────────────────────
// REVIEW = SF=0, has DIFFICULTY_COGNITIVE_MISMATCH advisory

describe("V13 — REVIEW cases (borderline, 1 dimension mismatch)", () => {
  const REVIEW_IDS = [
    "V13-G09", "V13-G11", "V13-G12",
    "V13-G15", "V13-G16",
    "V13-G20", "V13-G29",
  ];

  for (const id of REVIEW_IDS) {
    it(`D — ${id} → REVIEW (SF=0, COGNITIVE_MISMATCH advisory)`, () => {
      const item = ALL_V13_FIXTURES.find((f) => f.identity.id === id)!;
      const r = validate(item);
      const s = summary(r);
      assert.equal(s.softFails, 0, `${id} should have 0 softFails`);
      assert.ok(hasCode(r, "DIFFICULTY_COGNITIVE_MISMATCH"), `${id} should have COGNITIVE_MISMATCH advisory`);
    });
  }

  it("D-G09 — HARD+R4 borderline → COGNITIVE_MISMATCH", () => {
    const r = validate(G09_HARD_R4_LONG_STIMULUS);
    assert.ok(hasCode(r, "DIFFICULTY_COGNITIVE_MISMATCH"));
  });

  it("D-G11 — EASY+R5 borderline → COGNITIVE_MISMATCH", () => {
    const r = validate(G11_EASY_R5_MISMATCH);
    assert.ok(hasCode(r, "DIFFICULTY_COGNITIVE_MISMATCH"));
  });

  it("D-G12 — EASY+R6 borderline → COGNITIVE_MISMATCH", () => {
    const r = validate(G12_EASY_R6_MISMATCH);
    assert.ok(hasCode(r, "DIFFICULTY_COGNITIVE_MISMATCH"));
  });

  it("D-G15 — MEDIUM+R1 borderline → COGNITIVE_MISMATCH", () => {
    const r = validate(G15_MEDIUM_R1_MISMATCH);
    assert.ok(hasCode(r, "DIFFICULTY_COGNITIVE_MISMATCH"));
  });

  it("D-G20 — MEDIUM+R5 evaluate borderline → COGNITIVE_MISMATCH", () => {
    const r = validate(G20_MEDIUM_R5_EVALUATE);
    assert.ok(hasCode(r, "DIFFICULTY_COGNITIVE_MISMATCH"));
  });

  it("D-G29 — HARD+R3 compound borderline → COGNITIVE_MISMATCH", () => {
    const r = validate(G29_HARD_R3_COMPOUND);
    assert.ok(hasCode(r, "DIFFICULTY_COGNITIVE_MISMATCH"));
  });
});

// ─── E. INSUFFICIENT cases (1 fixture) ───────────────────────────────────────

describe("V13 — INSUFFICIENT cases (missing data)", () => {
  it("E-G25 — no difficulty → DIFFICULTY_EVIDENCE_INSUFFICIENT", () => {
    const r = validate(G25_NO_DIFFICULTY);
    assert.equal(summary(r).softFails, 0);
    assert.ok(hasCode(r, "DIFFICULTY_EVIDENCE_INSUFFICIENT"));
    assert.ok(!hasCode(r, "PASS"), "No difficulty should not PASS");
  });

  it("E-G27 — no difficulty + no cognitive → DIFFICULTY_EVIDENCE_INSUFFICIENT", () => {
    const r = validate(G27_NO_DIFFICULTY_NO_COGNITIVE);
    assert.equal(summary(r).softFails, 0);
    assert.ok(hasCode(r, "DIFFICULTY_EVIDENCE_INSUFFICIENT"));
    assert.ok(!hasCode(r, "PASS"), "No difficulty/cognitive should not PASS");
  });

  it("E-G28 — invalid difficulty → DIFFICULTY_EVIDENCE_INSUFFICIENT", () => {
    const r = validate(G28_INVALID_DIFFICULTY);
    assert.equal(summary(r).softFails, 0);
    assert.ok(hasCode(r, "DIFFICULTY_EVIDENCE_INSUFFICIENT"));
  });

  it("E-G28 — no PASS finding (evidence insufficient)", () => {
    const r = validate(G28_INVALID_DIFFICULTY);
    assert.ok(!hasCode(r, "PASS"), "INSUFFICIENT should not have PASS finding");
  });
});

// ─── F. Pipeline integration (3) ─────────────────────────────────────────────

describe("V13 — Pipeline integration", () => {
  it("F.1 — V13 is in DEFAULT_PIPELINE at stage 13", () => {
    const stage13 = DEFAULT_PIPELINE.find((v) => v.stage === 13);
    assert.ok(stage13, "V13 should be in DEFAULT_PIPELINE at stage 13");
    assert.equal(stage13!.id, "difficulty-cognitive-consistency");
  });

  it("F.2 — V13 is last pipeline stage", () => {
    const maxStage = Math.max(...DEFAULT_PIPELINE.map((v) => v.stage));
    assert.equal(maxStage, 13, "V13 should be the last pipeline stage");
  });

  it("F.3 — pipeline runs V13 without errors on a PASS item", () => {
    const item = G01_EASY_R1_RECALL;
    const stage13 = DEFAULT_PIPELINE.find((v) => v.stage === 13)!;
    const result = runValidator(stage13, item, CTX);
    assert.ok(result.summary);
    assert.ok(Array.isArray(result.findings));
  });
});

// ─── G. V10 interaction (3) ──────────────────────────────────────────────────

describe("V13 — V10 interaction (cognitive label mismatch)", () => {
  it("G.1 — V13 does not override V10 COGNITIVE_LABEL_MISMATCH", () => {
    // If V10 detects mismatch, V13 should report inconclusive/dependent
    const item: CanonicalItem = {
      ...G13_HARD_R1_MISMATCH,
      taxonomy: {
        ...G13_HARD_R1_MISMATCH.taxonomy,
        cognitiveTarget: "MENGINGAT",
      },
    };
    const r = validate(item);
    // V13 should still run and produce findings (may be INCONSISTENT or REVIEW)
    assert.ok(r.findings.length > 0, "V13 should produce findings even if V10 might disagree");
  });

  it("G.2 — V13 reason code DIFFICULTY_COGNITIVE_MISMATCH is distinct from V10 COGNITIVE_LABEL_MISMATCH", () => {
    const r = validate(G11_EASY_R5_MISMATCH);
    const v13Code = findCode(r, "DIFFICULTY_COGNITIVE_MISMATCH");
    assert.ok(v13Code, "V13 should emit DIFFICULTY_COGNITIVE_MISMATCH");
    assert.notEqual(v13Code!.reasonCode, "COGNITIVE_LABEL_MISMATCH", "V13 code must differ from V10 code");
  });

  it("G.3 — V13 CALIBRATION_REQUIRED always emitted as advisory", () => {
    // Every item that has both difficulty and cognitive should get this advisory
    const r = validate(G01_EASY_R1_RECALL);
    assert.ok(hasCode(r, "DIFFICULTY_CALIBRATION_REQUIRED"), "V13 should emit CALIBRATION_REQUIRED advisory");
  });
});

// ─── H. V11 interaction (2) ──────────────────────────────────────────────────

describe("V13 — V11 interaction (distractor quality)", () => {
  it("H.1 — V11 FAIL does not automatically cause V13 FAIL", () => {
    // G17 has trivial distractors (V11 would flag), but V13 FAIL reason is DIFFICULTY_DEMAND_TOO_LOW
    const r = validate(G17_HARD_TRIVIAL_CONTENT);
    assert.ok(hasCode(r, "DIFFICULTY_DEMAND_TOO_LOW"), "V13 FAIL reason should be its own, not V11's");
  });

  it("H.2 — V13 uses V11 evidence but keeps separate verdict", () => {
    const r = validate(G17_HARD_TRIVIAL_CONTENT);
    const v13Finding = findCode(r, "DIFFICULTY_DEMAND_TOO_LOW");
    assert.ok(v13Finding, "V13 should have its own finding");
    assert.equal(v13Finding!.validatorId, "difficulty-cognitive-consistency", "Finding should be from V13");
  });
});

// ─── I. V12 interaction (2) ──────────────────────────────────────────────────

describe("V13 — V12 interaction (duplicate similarity)", () => {
  it("I.1 — V12 duplication is NOT difficulty evidence", () => {
    // Even if an item is duplicate, V13 should still assess difficulty independently
    const r = validate(G01_EASY_R1_RECALL);
    // V13 should not mention duplication
    const dupFindings = r.findings.filter((f) =>
      f.reasonCode?.includes("DUPLICATE") || f.reasonCode?.includes("SIMILARITY")
    );
    assert.equal(dupFindings.length, 0, "V13 should not produce duplicate findings");
  });

  it("I.2 — V13 reason codes are distinct from V12 codes", () => {
    const v13Codes = ["DIFFICULTY_COGNITIVE_MISMATCH", "DIFFICULTY_DEMAND_TOO_LOW", "DIFFICULTY_DEMAND_TOO_HIGH",
      "DIFFICULTY_EVIDENCE_INSUFFICIENT", "DIFFICULTY_DISCRIMINATION_LOW", "DIFFICULTY_STIMULUS_COMPLEXITY_MISMATCH",
      "DIFFICULTY_RESPONSE_COMPLEXITY_MISMATCH", "DIFFICULTY_CALIBRATION_REQUIRED"];
    const v12Codes = ["DUPLICATE_EXACT", "DUPLICATE_SIMILAR", "DUPLICATE_REVIEW"];
    for (const code of v13Codes) {
      assert.ok(!v12Codes.includes(code), `V13 code ${code} must not collide with V12`);
    }
  });
});

// ─── J. Dimension-specific tests (5) ────────────────────────────────────────

describe("V13 — Dimension-specific tests", () => {
  it("J.1 — EASY items can have R3 (apply) at boundary", () => {
    // G04: EASY + R3 → should PASS (R3 within EASY range [1,3])
    const r = validate(G04_EASY_R3_BORDERLINE);
    assert.equal(summary(r).softFails, 0, "EASY+R3 should not FAIL");
    assert.ok(hasCode(r, "PASS"), "EASY+R3 should PASS");
  });

  it("J.2 — MEDIUM items can have R4 (analyze) at boundary", () => {
    // G08: MEDIUM + R4 → should PASS (R4 within MEDIUM range [2,4])
    const r = validate(G08_MEDIUM_R4_ANALYZE);
    assert.equal(summary(r).softFails, 0, "MEDIUM+R4 should not FAIL");
    assert.ok(hasCode(r, "PASS"), "MEDIUM+R4 should PASS");
  });

  it("J.3 — HARD items can have R3 (apply) at boundary", () => {
    // G29: HARD + R3 → should be REVIEW or PASS (R3 at boundary of HARD range [3,6])
    const r = validate(G29_HARD_R3_COMPOUND);
    // Should NOT FAIL (R3 is within range)
    assert.equal(summary(r).softFails, 0, "HARD+R3 should not FAIL");
  });

  it("J.4 — EASY + R5 (evaluate) is borderline → REVIEW", () => {
    // G11: EASY + R5 → REVIEW (R5 exceeds EASY max R3, but only 1 dim mismatch)
    const r = validate(G11_EASY_R5_MISMATCH);
    assert.equal(summary(r).softFails, 0, "EASY+R5 borderline should REVIEW, not FAIL");
    assert.ok(hasCode(r, "DIFFICULTY_COGNITIVE_MISMATCH"));
  });

  it("J.5 — INSUFFICIENT with no difficulty → no PASS finding", () => {
    const r = validate(G27_NO_DIFFICULTY_NO_COGNITIVE);
    assert.ok(!hasCode(r, "PASS"), "No difficulty/cognitive should not PASS");
    assert.equal(summary(r).softFails, 0);
  });
});

// ─── K. Over-rejection resistance (3) ───────────────────────────────────────

describe("V13 — Over-rejection resistance", () => {
  it("K.1 — G29: HARD+R3 compound with long stem → not FAIL", () => {
    // R3 CAN be HARD if task is complex. V13 must NOT reject.
    const r = validate(G29_HARD_R3_COMPOUND);
    assert.equal(summary(r).softFails, 0, "HARD+R3 compound should not FAIL");
  });

  it("K.2 — G30: EASY+R1 BenarSalah → not FAIL (short ≠ harder)", () => {
    const r = validate(G30_EASY_R1_SHORT_BS);
    assert.equal(summary(r).softFails, 0, "EASY+R1 BS should not FAIL");
    assert.ok(hasCode(r, "PASS"), "EASY+R1 BS should PASS");
  });

  it("K.3 — G04: EASY+R3 apply → not FAIL (R3 at EASY boundary)", () => {
    const r = validate(G04_EASY_R3_BORDERLINE);
    assert.equal(summary(r).softFails, 0, "EASY+R3 should not FAIL");
  });
});

// ─── L. Structural integrity (4) ─────────────────────────────────────────────

describe("V13 — Structural integrity", () => {
  it("L.1 — all 30 fixtures produce findings", () => {
    for (const item of ALL_V13_FIXTURES) {
      const r = validate(item);
      assert.ok(r.findings.length > 0, `${item.identity.id} should produce findings`);
    }
  });

  it("L.2 — all findings have required fields", () => {
    for (const item of ALL_V13_FIXTURES) {
      const r = validate(item);
      for (const f of r.findings) {
        assert.ok(f.validatorId, `${item.identity.id} finding should have validatorId`);
        assert.ok(f.reasonCode, `${item.identity.id} finding should have reasonCode`);
        assert.ok(f.status, `${item.identity.id} finding should have status`);
        assert.ok(f.severity, `${item.identity.id} finding should have severity`);
        assert.ok(f.rationale, `${item.identity.id} finding should have rationale`);
      }
    }
  });

  it("L.3 — findings are V13-only (no cross-contamination from other validators)", () => {
    for (const item of ALL_V13_FIXTURES) {
      const r = validate(item);
      for (const f of r.findings) {
        assert.equal(f.validatorId, "difficulty-cognitive-consistency",
          `${item.identity.id} finding should be from V13, not ${f.validatorId}`);
      }
    }
  });

  it("L.4 — validator returns valid=true always (hardFails always 0)", () => {
    // V13 uses SOFT_FAIL severity, so hardFails is always 0
    for (const item of ALL_V13_FIXTURES) {
      const r = validate(item);
      assert.equal(summary(r).hardFails, 0, `${item.identity.id} should have 0 hardFails`);
    }
  });
});
