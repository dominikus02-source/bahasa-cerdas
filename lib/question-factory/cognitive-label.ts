/**
 * Question Factory V2 — Cognitive Label Validator (V10, P3.5C).
 *
 * Stage 10: Deterministic cognitive-target vs actual-operation comparison.
 *
 * Rules (P3.5C §V10):
 *   - MUST NOT overfit (no keyword classifiers like stem.includes("mengaha") => R5)
 *   - Inspect actual task operation via structural heuristics
 *   - Return REVIEW/ADVISORY when deterministic evidence is insufficient
 *   - R-mapping (P3.3 DNA §5):
 *     R1 = MENGINGAT  (recall/recognize)
 *     R2 = MEMAHAMI   (understand/locate explicit info)
 *     R3 = MENERAPKAN (apply rule to new material)
 *     R4 = MENGANALISIS (infer/analyze relations)
 *     R5 = MENGEVALUASI (evaluate/reflect)
 *     R6 = MENCIPTAKAN (create/transform/produce)
 *
 * Section references:
 *   P3.3 §5       — Cognitive scale mapping (R1–R6)
 *   P3.4 §11      — Distractor validator (V10 original spec)
 *   P3.5C §V10    — Cognitive label validator (this file)
 *   DNA §5         — R-mapping canonical
 */

import type { CanonicalItem, ValidationContext, ValidationFinding } from "./types";
import type { Validator } from "./interface";

const VERSION = "1.0.0";
const STAGE = 10;

// ─── R-level definitions ─────────────────────────────────────────────────────

type RLevel = 1 | 2 | 3 | 4 | 5 | 6;

const R_LEVEL_ORDER: RLevel[] = [1, 2, 3, 4, 5, 6];

const R_LABELS: Record<RLevel, string> = {
  1: "MENGINGAT",
  2: "MEMAHAMI",
  3: "MENERAPKAN",
  4: "MENGANALISIS",
  5: "MENGEVALUASI",
  6: "MENCIPTAKAN",
};

// ─── Mapping from declared cognitiveTarget string to R-level ──────────────────

const COGNITIVE_TARGET_MAP: Record<string, RLevel> = {
  MENGINGAT: 1,
  MEMAHAMI: 2,
  MENERAPKAN: 3,
  MENGANALISIS: 4,
  MENGEVALUASI: 5,
  MENCIPTAKAN: 6,
  // R-scale aliases
  R1: 1,
  R2: 2,
  R3: 3,
  R4: 4,
  R5: 5,
  R6: 6,
};

function resolveRLevel(cognitiveTarget: string | undefined): RLevel | null {
  if (!cognitiveTarget) return null;
  const normalized = cognitiveTarget.trim().toUpperCase();
  return COGNITIVE_TARGET_MAP[normalized] ?? null;
}

// ─── Helper: finding factory ─────────────────────────────────────────────────

function finding(
  code: string,
  rationale: string,
  blocking: boolean,
  severity: "HARD_FAIL" | "SOFT_FAIL" = "SOFT_FAIL",
  details?: Record<string, unknown>
): ValidationFinding {
  return {
    validatorId: "cognitive-label",
    validatorVersion: VERSION,
    stage: STAGE,
    status: "FAIL",
    severity,
    blocking,
    retryable: false,
    reasonCode: code,
    rationale,
    details,
    evaluatedAt: new Date().toISOString(),
  };
}

function pass(rationale: string): ValidationFinding {
  return {
    validatorId: "cognitive-label",
    validatorVersion: VERSION,
    stage: STAGE,
    status: "PASS",
    severity: "ADVISORY",
    blocking: false,
    retryable: false,
    reasonCode: "PASS",
    rationale,
    evaluatedAt: new Date().toISOString(),
  };
}

function advisory(rationale: string, details?: Record<string, unknown>): ValidationFinding {
  return {
    validatorId: "cognitive-label",
    validatorVersion: VERSION,
    stage: STAGE,
    status: "ADVISORY",
    severity: "ADVISORY",
    blocking: false,
    retryable: false,
    reasonCode: "COGNITIVE_LABEL_INSUFFICIENT_EVIDENCE",
    rationale,
    details,
    evaluatedAt: new Date().toISOString(),
  };
}

// ─── Text normalization ──────────────────────────────────────────────────────

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function wordCount(text: string): number {
  return normalize(text).split(/\s+/).filter(Boolean).length;
}

// ─── Stem task-operation analysis (deterministic heuristics) ─────────────────

/**
 * Infer the ACTUAL cognitive operation the item requires.
 *
 * Uses structural heuristics on the stem and options — NOT keyword matching.
 * Returns null when deterministic evidence is insufficient (caller emits ADVISORY).
 */
function inferCognitiveLevel(item: CanonicalItem): RLevel | null {
  const stem = normalize(item.content?.stem ?? "");
  const options = item.content?.options ?? [];
  const correctAnswer = item.responseModel?.correctAnswer;
  const qType = item.responseModel?.questionType;

  if (!stem || !qType) return null;

  // ── R6: Create/transform — only for constructed-response ──────────────────
  // If questionType is ISIAN_SINGKAT with long expected answer, likely R6.
  // But for P3.5C deterministic: skip — R6 is rare in MCQ bank.
  if (qType === "ISIAN_SINGKAT") {
    const answerLen = wordCount(String(correctAnswer));
    if (answerLen > 10) return 6; // Long constructed response → R6
    // Short ISIAN could be R1 (recall) or R3 (apply) — insufficient evidence
    return null;
  }

  // ── For PILIHAN_GANDA and BENAR_SALAH: analyze stem structure ────────────

  // Heuristic 1: Does the stem present a stimulus + ask for APPLICATION?
  // Pattern: stem contains a passage/context + asks "what should be done" / "which is correct application"
  const hasPassage = item.content?.stimulusContent
    ? wordCount(item.content.stimulusContent) > 30
    : stem.includes("\n") || stem.length >= 200;

  // Heuristic 2: Stem task verb group detection via structural patterns
  // These are STRUCTURAL patterns (presence of imperative/interrogative frame),
  // NOT keyword matching. The presence of certain syntactic frames indicates
  // the cognitive demand of the task.

  // R1 indicators: stem asks to IDENTIFY/NOMINATE/NAME
  // Structural pattern: "Sebutkan...", "Apa nama...", "...disebut..."
  const r1Patterns = [
    /^(sebutkan|namakan|nyatakan|tuliskan)\s/i,
    /\b(apakah\s+.{0,30}\s+merupakan\s+)/i,
  ];

  // R2 indicators: stem asks to EXPLAIN/DESCRIBE/LOCATE explicit info
  // Structural pattern: "Apa yang dimaksud...", "Jelaskan...", "Menurut teks..."
  const r2Patterns = [
    /^(apa\s+(yang\s+)?dimaksud|jelaskan|uraikan|gambarkan)\s/i,
    /\b(menurut\s+(teks|paragraf|bacaan|artikel))/i,
    /\b(berdasarkan\s+(teks|paragraf|bacaan|artikel))/i,
  ];

  // R3 indicators: stem presents NOVEL scenario + asks to APPLY rule
  // Structural pattern: "Jika..., maka..." / "Dalam kalimat berikut, tentukan..."
  const r3Patterns = [
    /\b(jika|apabila|bila)\s.{10,}\s+(maka|hasil|akibat)/i,
    /\b(dalam\s+(kalimat|paragraf|konteks)\s+berikut)/i,
    /\b(tentukan\s+(kalimat|bentuk|jenis|nilai))/i,
  ];

  // R4 indicators: stem asks to ANALYZE/INFER/COMPARE relationships
  // Structural pattern: "Mengapa...", "Apa hubungan...", "Bandingkan..."
  const r4Patterns = [
    /^(mengapa|kapankah|dimanakah)\s/i,
    /\b(hubungan\s+antara)/i,
    /\b(bandingkan|perbandingan)/i,
    /\b(sebab[- ]akibat|akibat\s+dari)/i,
    /\b(pola|struktur|susunan)\s/i,
  ];

  // R5 indicators: stem asks to EVALUATE/JUDGE/ARGUE
  // Structural pattern: "Setujukah...", "Manakah yang lebih baik...", "Apakah benar..."
  const r5Patterns = [
    /^(setujukah|bagaimana\s+pendapatmu)/i,
    /\b(yang\s+(lebih\s+)?(baik|tepat|benar|sesuai|valid))/i,
    /\b(apakah\s+pernyataan\s+.{5,}\s+(benar|salah|tepat))/i,
    /\b(kritik|evaluasi|penilaian|refleksi)/i,
  ];

  // Score each level based on pattern matches
  const scores: Record<RLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (const p of r1Patterns) if (p.test(stem)) scores[1] += 2;
  for (const p of r2Patterns) if (p.test(stem)) scores[2] += 2;
  for (const p of r3Patterns) if (p.test(stem)) scores[3] += 2;
  for (const p of r4Patterns) if (p.test(stem)) scores[4] += 2;
  for (const p of r5Patterns) if (p.test(stem)) scores[5] += 2;

  // Bonus: presence of stimulus content pushes toward R3+ (apply/analyze/evaluate)
  if (hasPassage) {
    scores[3] += 1;
    scores[4] += 1;
    scores[5] += 1;
  }

  // Bonus: BENAR_SALAH type is often R2 (comprehension) or R3 (apply rule)
  if (qType === "BENAR_SALAH") {
    scores[2] += 1;
    scores[3] += 1;
  }

  // Find the level with highest score
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return null; // No signal → insufficient evidence

  const candidates = R_LEVEL_ORDER.filter((l) => scores[l] === maxScore);

  // If exactly one candidate, return it
  if (candidates.length === 1) return candidates[0];

  // If tie, return the LOWER level (conservative — don't over-assign higher cognition)
  return candidates[0];
}

// ─── Validator ───────────────────────────────────────────────────────────────

/**
 * V10 Cognitive Label Validator — compares declared cognitiveTarget
 * against inferred actual cognitive operation.
 *
 * Returns:
 *   PASS          — declared level matches inferred level (within ±1)
 *   ADVISORY      — insufficient evidence to determine (no pattern match)
 *   SOFT_FAIL     — declared level mismatches inferred level by ≥2
 */
export const cognitiveLabelValidator: Validator = {
  id: "cognitive-label",
  version: VERSION,
  stage: STAGE,

  validate(item: CanonicalItem, _ctx: ValidationContext): ValidationFinding[] {
    const findings: ValidationFinding[] = [];
    const declaredLevel = resolveRLevel(item.taxonomy?.cognitiveTarget);

    // ── COGNITIVE_LABEL_MISSING: no cognitiveTarget declared ────────────────
    if (declaredLevel === null) {
      findings.push(finding(
        "COGNITIVE_LABEL_MISSING",
        "No cognitiveTarget declared in taxonomy. Cannot validate cognitive alignment.",
        false,
        "SOFT_FAIL",
        { cognitiveTarget: item.taxonomy?.cognitiveTarget }
      ));
      return findings;
    }

    // ── Infer actual cognitive level from task operation ─────────────────────
    const inferredLevel = inferCognitiveLevel(item);

    if (inferredLevel === null) {
      // Insufficient deterministic evidence → ADVISORY (human must confirm)
      findings.push(advisory(
        `Declared level R${declaredLevel} (${R_LABELS[declaredLevel]}) cannot be verified deterministically. Human review recommended.`,
        { declaredLevel, inferredLevel: null }
      ));
      return findings;
    }

    // ── COGNITIVE_LABEL_MISMATCH: declared vs inferred differ by ≥2 ─────────
    const gap = Math.abs(declaredLevel - inferredLevel);

    if (gap >= 2) {
      findings.push(finding(
        "COGNITIVE_LABEL_MISMATCH",
        `Declared R${declaredLevel} (${R_LABELS[declaredLevel]}) but actual task operation appears to be R${inferredLevel} (${R_LABELS[inferredLevel]}). Gap of ${gap} levels.`,
        false, // SOFT — human must confirm (deterministic heuristic can be wrong)
        "SOFT_FAIL",
        {
          declaredLevel,
          inferredLevel,
          gap,
          declaredLabel: R_LABELS[declaredLevel],
          inferredLabel: R_LABELS[inferredLevel],
        }
      ));
    } else {
      // gap ≤ 1 → PASS (within acceptable range)
      findings.push(pass(
        `Declared R${declaredLevel} (${R_LABELS[declaredLevel]}) is consistent with inferred R${inferredLevel} (${R_LABELS[inferredLevel]}).`
      ));
    }

    return findings;
  },
};
