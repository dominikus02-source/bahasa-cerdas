import {
  MasterQuestion,
  ClassificationResult,
  BankContext,
  isTemplateConceptQuestion,
  isJelaskanTokenQuestion,
  isTautologyBS,
  buildDuplicateContext,
  exactDuplicateKey,
} from "../master-recovery";
import { RepairRecord, RepairType, Confidence, RepairDisposition, VALIDATOR_VERSION } from "./types";
import { passAStructural, passBSemantic, explainWhy } from "./validate";
import { typeRepair, wrongKeyRepair, isSelfAnswerRepairNeeded } from "./deterministic";
import { repairAiAvailable, aiRepairCandidate, buildRepairPrompt } from "./ai-client";

export interface RepairContext {
  bankCtx: BankContext;
  allBank: MasterQuestion[];
  aiEnabled: boolean;
  aiOnlyContentRepair: boolean;
}

export function buildRepairContext(all: MasterQuestion[]): RepairContext {
  return {
    bankCtx: buildDuplicateContext(all),
    allBank: all,
    aiEnabled: repairAiAvailable(),
    aiOnlyContentRepair: true,
  };
}

function now(): string {
  return new Date().toISOString();
}

function mkRecord(
  id: string,
  original: MasterQuestion,
  candidate: MasterQuestion | null,
  repairType: RepairType[],
  reason: string[],
  disposition: RepairDisposition,
  confidence: Confidence,
  validation: RepairRecord["validation"]
): RepairRecord {
  const r: RepairRecord = {
    id,
    original,
    candidate,
    repairType,
    reason,
    validation,
    confidence,
    disposition,
    gold: disposition === "GOLD",
    validatorVersion: VALIDATOR_VERSION,
    timestamp: now(),
  };
  return r;
}

export function passBoth(
  v: { passA: { passed: boolean }; passB: { passed: boolean } }
): boolean {
  return v.passA.passed && v.passB.passed;
}

/**
 * Repair SATU soal berdasarkan DISPOSITION source-of-truth dari STEP 7.1.
 * Original TIDAK pernah dimutasi. AI hanya digunakan untuk repair konten
 * (pattern questions); deterministik untuk tipe/kunci. No hallucination:
 * tanpa source yang cukup → REPAIR_FAILED/HUMAN_REVIEW yang jujur.
 */
export async function repairQuestion(
  q: MasterQuestion,
  classification: ClassificationResult,
  ctx: RepairContext
): Promise<RepairRecord> {
  const disp = classification.disposition;

  // ── GOLD (sudah layak produksi) — pass-through ──
  if (disp === "GOLD") {
    return mkRecord(
      q.kodeSoal,
      q,
      null,
      [],
      ["sudah GOLD di STEP 7.1 — tanpa repair"],
      "GOLD",
      "HIGH",
      null
    );
  }

  // ── AUTO_REPAIR_ALLOWED: salah tipe, konten asli valid → TYPE_REPAIR ──
  if (disp === "AUTO_REPAIR_ALLOWED") {
    return repairByType(q, ctx);
  }

  // ── AI_REPAIR_CANDIDATE: pattern (template konsep / jelaskan / tautologi) ──
  if (disp === "AI_REPAIR_CANDIDATE") {
    const type = isJelaskanTokenQuestion(q)
      ? ("BAD_EXPLAIN_TO_MCQ" as const)
      : isTautologyBS(q)
      ? ("TAUTOLOGY_TO_VALID_ITEM" as const)
      : isTemplateConceptQuestion(q).is
      ? ("CONCEPT_TO_CONTEXT" as const)
      : null;

    if (!type) {
      return mkRecord(
        q.kodeSoal,
        q,
        null,
        [],
        ["AI_REPAIR_CANDIDATE tanpa jenis repairable yang dikenal — HUMAN_REVIEW"],
        "HUMAN_REVIEW_REQUIRED",
        "MEDIUM",
        null
      );
    }
    return repairByAiContent(q, type, ctx);
  }

  // ── HUMAN_REVIEW_REQUIRED: coba deterministik hanya utk kunci salah ──
  if (disp === "HUMAN_REVIEW_REQUIRED") {
    const wrongKeyCandidate =
      classification.flags.includes("WRONG_KEY") || isSelfAnswerRepairNeeded(q);
    if (wrongKeyCandidate) {
      const repaired = wrongKeyRepair(q);
      if (!repaired) {
        return mkRecord(
          q.kodeSoal,
          q,
          null,
          ["KEY_REPAIR"],
          [...classification.reason, "tidak ada SATU opsi yang objektif benar — butuh manusia"],
          "HUMAN_REVIEW_REQUIRED",
          "MEDIUM",
          null
        );
      }
      const validation = {
        passA: passAStructural(repaired),
        passB: passBSemantic(repaired),
      };
      const dupTrouble = hasDupCollision(repaired, ctx);
      if (passBoth(validation) && !dupTrouble) {
        return mkRecord(
          q.kodeSoal,
          q,
          repaired,
          ["KEY_REPAIR", "TYPE_REPAIR", "EXPLANATION_REPAIR"],
          ["kunci diganti ke satu-satunya opsi yang objektif benar (tabel semantik); tipe dinormalkan; explanation diperbaiki"],
          "GOLD",
          "HIGH",
          validation
        );
      }
      return mkRecord(
        q.kodeSoal,
        q,
        repaired,
        ["KEY_REPAIR", "TYPE_REPAIR", "EXPLANATION_REPAIR"],
        [`validasi kandidat gagal: ${explainWhy(repaired)}${dupTrouble ? "; tabrakan duplikat dengan bank" : ""}`],
        "HUMAN_REVIEW_REQUIRED",
        "MEDIUM",
        validation
      );
    }

    return mkRecord(
      q.kodeSoal,
      q,
      null,
      [],
      classification.reason.length ? classification.reason : ["butuh tinjauan manusia"],
      "HUMAN_REVIEW_REQUIRED",
      "MEDIUM",
      null
    );
  }

  // ── REJECT ──
  return mkRecord(
    q.kodeSoal,
    q,
    null,
    [],
    classification.reason.length ? classification.reason : ["ditandai REJECT pada STEP 7.1"],
    "REJECT",
    "LOW",
    null
  );
}

// ── TYPE_REPAIR (deterministik) ──
function repairByType(q: MasterQuestion, ctx: RepairContext): RepairRecord {
  const candidate = typeRepair(q);
  const validation = {
    passA: passAStructural(candidate),
    passB: passBSemantic(candidate),
  };
  if (passBoth(validation) && !hasDupCollision(candidate, ctx)) {
    return mkRecord(
      q.kodeSoal,
      q,
      candidate,
      ["TYPE_REPAIR"],
      ["tipe dinormalkan ke PILIHAN_GANDA (konten asli dipertahankan)"],
      "GOLD",
      "HIGH",
      validation
    );
  }
  return mkRecord(
    q.kodeSoal,
    q,
    candidate,
    ["TYPE_REPAIR"],
    ["validasi kandidat gagal: " + explainWhy(candidate)],
    "HUMAN_REVIEW_REQUIRED",
    "MEDIUM",
    validation
  );
}

// ── AI content repair (pattern questions; no-hallucination) ──
async function repairByAiContent(
  q: MasterQuestion,
  type: "CONCEPT_TO_CONTEXT" | "BAD_EXPLAIN_TO_MCQ" | "TAUTOLOGY_TO_VALID_ITEM",
  ctx: RepairContext
): Promise<RepairRecord> {
  const reasonForFail = [
    "repair konten memerlukan AI authoring; tanpa provider → REPAIR_FAILED (tanpa mengarang soal)",
    `prompt siap: ${buildRepairPrompt(q, type, 1).slice(0, 200)}…`,
  ];

  if (!ctx.aiEnabled) {
    return {
      ...mkRecord(
        q.kodeSoal,
        q,
        null,
        [type as RepairType],
        reasonForFail,
        "REPAIR_FAILED",
        "LOW",
        null
      ),
      aiMeta: {
        provider: "none",
        model: "none",
        attempted: false,
        failureReason: "AI_PROVIDER_UNAVAILABLE",
      },
    };
  }

  const out = await aiRepairCandidate(q, type as RepairType);
  if (!out.ok || !out.candidate) {
    return {
      ...mkRecord(
        q.kodeSoal,
        q,
        null,
        [type as RepairType],
        [`repair AI gagal: ${out.aiMeta.failureReason || "unknown"}`],
        "REPAIR_FAILED",
        "LOW",
        null
      ),
      aiMeta: out.aiMeta,
    };
  }

  const validation = {
    passA: passAStructural(out.candidate),
    passB: passBSemantic(out.candidate),
  };
  if (passBoth(validation) && !hasDupCollision(out.candidate, ctx)) {
    return {
      ...mkRecord(
        q.kodeSoal,
        q,
        out.candidate,
        [type as RepairType],
        ["kandidat hasil AI melewati validasi dua-pass"],
        "GOLD",
        "HIGH",
        validation
      ),
      aiMeta: out.aiMeta,
    };
  }
  return {
    ...mkRecord(
      q.kodeSoal,
      q,
      out.candidate,
      [type as RepairType],
      ["kandidat hasil AI gagal validasi: " + explainWhy(out.candidate)],
      "HUMAN_REVIEW_REQUIRED",
      "MEDIUM",
      validation
    ),
    aiMeta: out.aiMeta,
  };
}

function hasDupCollision(candidate: MasterQuestion, ctx: RepairContext): boolean {
  const key = exactDuplicateKey(candidate);
  return ctx.allBank.some((o) => o.kodeSoal !== candidate.kodeSoal && exactDuplicateKey(o) === key);
}