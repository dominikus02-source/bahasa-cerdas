import { createHash } from "crypto";
import { MasterQuestion, keyIndex, normOption, normText } from "../../master-recovery";
import { NAMED_FACT_RISK } from "../../master-authoring/gates";
import {
  RepairV2Record,
  V2EngineContext,
  V2_VALIDATOR_VERSION,
  RepairCategory,
} from "./types";
import { categorizeQuestion } from "./classify";
import {
  synonymGate,
  antonymGate,
  maknaKataGate,
  spokGate,
  majasGate,
  ejaanGate,
  kalimatEfektifGate,
  distractorEngine,
  singleCorrectHardGate,
  explanationGate,
  aiSoundingGate,
  duplicateGateV2,
} from "./gates";
import {
  typeRepairSafe,
  explanationReword,
  semanticKeyRepair,
  ejaanRepair,
  sanitizeOptionWhitespace,
  isTemplateExplanationOnly,
} from "./safe";
import { aiRepairCandidate } from "../ai-client";

export function sha256Source(q: MasterQuestion): string {
  return createHash("sha256").update(JSON.stringify(q)).digest("hex");
}

function now(): string {
  return new Date().toISOString();
}

function factIn(text: string | undefined): boolean {
  if (!text) return false;
  NAMED_FACT_RISK.lastIndex = 0;
  return NAMED_FACT_RISK.test(text);
}

function allPass(records: { passed: boolean }[]): boolean {
  return records.every((r) => r.passed);
}

function str(parts: Array<string | undefined>): string {
  return parts.filter((p): p is string => !!p).join("; ");
}

function gatesFor(candidate: MasterQuestion, source: MasterQuestion, ctx: V2EngineContext) {
  const single = singleCorrectHardGate(candidate);
  const expl = explanationGate(candidate, source);
  const aiS = aiSoundingGate(candidate);
  const dup = duplicateGateV2(candidate, ctx);
  const dist = distractorEngine(candidate);
  return {
    gates: [single, expl, aiS, dup, { name: "distractor-engine", passed: dist.passed, detail: dist.reason }],
    distractorReports: dist.reports,
    single,
    expl,
    aiS,
    dup,
    dist,
  };
}

export async function runSemanticRepairV2(
  q: MasterQuestion,
  ctx: V2EngineContext,
  repairIntent?: string
): Promise<RepairV2Record> {
  const base: RepairV2Record = {
    id: q.kodeSoal,
    sourceSha256: sha256Source(q),
    sourceImmutable: true,
    original: q,
    candidate: null,
    category: "SAFE_REPAIR",
    repairType: [],
    decision: "INVALID_CONTRACT",
    confidence: "LOW",
    gates: [],
    distractorReports: [],
    reason: [],
    aiMeta: null,
    validatorVersion: V2_VALIDATOR_VERSION,
    timestamp: now(),
  };

  const cat = categorizeQuestion(q, repairIntent);

  // ── INVALID_CONTRACT: struktur dasar rusak ──
  // CONTEXT_REPAIR dikecualikan — AI/manusia boleh MEMBANGUN opsi baru
  // (mis. ISIAN_SINGKAT "Jelaskan ..." tanpa opsi → BAD_EXPLAIN_TO_MCQ).
  if (cat.category !== "CONTEXT_REPAIR" && (!q.text || q.options.length < 2 || keyIndex(q.correctAnswer, q.type) === null)) {
    return { ...base, category: cat.category, repairType: [cat.subType], decision: "INVALID_CONTRACT", reason: ["kontrak soal rusak (teks kosong / opsi < 2 / kunci tidak valid)"] };
  }
  if (cat.category === "CONTEXT_REPAIR" && !q.text) {
    return { ...base, category: cat.category, repairType: [cat.subType], decision: "INVALID_CONTRACT", reason: ["kontrak soal rusak (teks kosong)"] };
  }

  // ── FACT-DEPENDENT — VERIFY OR BLOCK ──
  if (cat.category === "FACT_DEPENDENT_REPAIR") {
    const factInSource = factIn(q.text) || /\bkarya\b|\bpengarang\b|\btokoh\b/.test(q.text);
    if (!factInSource) {
      return {
        ...base,
        category: cat.category,
        repairType: [cat.subType],
        decision: "BLOCKED",
        confidence: "LOW",
        reason: ["fakta bernama tidak dapat diverifikasi dari sumber/evidence — BLOCK (jangan menebak)", cat.reason],
      };
    }
    return {
      ...base,
      category: cat.category,
      repairType: [cat.subType],
      decision: "HUMAN_REVIEW",
      confidence: "MEDIUM",
      reason: ["fakta ada di sumber namun kebenaran atribusi tidak dapat dibuktikan engine — konfirmasi manusia", cat.reason],
    };
  }

  // ── SAFE_REPAIR (deterministik) ──
  if (cat.category === "SAFE_REPAIR") {
    return safeRepairPath(q, ctx, base, cat);
  }

  // ── CONTEXT_REPAIR ──
  if (cat.category === "CONTEXT_REPAIR") {
    return contextRepairPath(q, ctx, base, cat);
  }

  // ── SEMANTIC_REPAIR ──
  return semanticRepairPath(q, ctx, base, cat);
}

function safeRepairPath(q: MasterQuestion, ctx: V2EngineContext, base: RepairV2Record, cat: ReturnType<typeof categorizeQuestion>): RepairV2Record {
  let candidate: MasterQuestion;
  const reasons: string[] = [];

  if (cat.subType === "TYPE_REPAIR") {
    candidate = typeRepairSafe(q);
    reasons.push("tipe dinormalkan ke PILIHAN_GANDA (konten asli dipertahankan)");
  } else if (cat.subType === "KEY_REPAIR") {
    const repaired = semanticKeyRepair(q);
    if (!repaired) {
      return { ...base, category: cat.category, repairType: [cat.subType], decision: "HUMAN_REVIEW", confidence: "MEDIUM", reason: ["tidak ada SATU opsi yang objektif benar dari tabel terverifikasi — butuh manusia"] };
    }
    candidate = repaired;
    reasons.push("kunci diganti ke satu-satunya opsi benar (tabel sinonim/antonim terverifikasi)");
  } else if (cat.subType === "EXPLANATION_REPAIR") {
    candidate = isTemplateExplanationOnly(q) ? explanationReword(q) : q;
    reasons.push("explanasi template di-reword dengan alasan spesifik (tanpa fakta baru)");
  } else {
    candidate = sanitizeOptionWhitespace(q);
    reasons.push("normalisasi whitespace/punctuation (intent tidak berubah)");
  }

  if (factIn(candidate.text) || factIn(candidate.explanation)) {
    return { ...base, category: cat.category, repairType: [cat.subType], candidate, decision: "BLOCKED", confidence: "LOW", reason: [...reasons, "kandidat memuat fakta bernama yang tidak ada di sumber — BLOCK"] };
  }

  const { gates, distractorReports, single, expl, aiS, dup, dist } = gatesFor(candidate, q, ctx);
  if (!single.passed) {
    return { ...base, category: cat.category, repairType: [cat.subType], candidate, gates, distractorReports, decision: "REJECT", confidence: "LOW", reason: [...reasons, str([single.detail])] };
  }
  if (!dup.passed) {
    return { ...base, category: cat.category, repairType: [cat.subType], candidate, gates, distractorReports, decision: "BLOCKED", confidence: "LOW", reason: [...reasons, str([dup.detail])] };
  }
  if (allPass(gates)) {
    return { ...base, category: cat.category, repairType: [cat.subType], candidate, gates, distractorReports, decision: "GOLD", confidence: "HIGH", reason: [...reasons, "semua gate lulus (single-correct, explanation, ai-sounding, duplicate, distractor)"] };
  }
  return {
    ...base,
    category: cat.category,
    repairType: [cat.subType],
    candidate,
    gates,
    distractorReports,
    decision: "HUMAN_REVIEW",
    confidence: "MEDIUM",
    reason: [...reasons, [...gates.filter((g) => !g.passed).map((g) => g.detail), dist.reason].filter(Boolean).join("; ") || "gate tidak lulus"],
  };
}

async function contextRepairPath(q: MasterQuestion, ctx: V2EngineContext, base: RepairV2Record, cat: ReturnType<typeof categorizeQuestion>): Promise<RepairV2Record> {
  const type = cat.subType.startsWith("TAUTOLOGY")
    ? "TAUTOLOGY_TO_VALID_ITEM"
    : cat.subType.startsWith("BAD_EXPLAIN")
    ? "BAD_EXPLAIN_TO_MCQ"
    : "CONCEPT_TO_CONTEXT";

  const hasSourceInfo =
    !!q.tema?.trim() && !!q.indikator?.trim() && (q.kataKunci ?? []).length > 0;

  if (!hasSourceInfo) {
    return {
      ...base,
      category: cat.category,
      repairType: [type],
      decision: "HUMAN_REVIEW",
      confidence: "MEDIUM",
      reason: ["syarat CONTEXT_REPAIR tidak terpenuhi: source tidak memberi konteks (tema/indikator/kataKunci) — HUMAN_REVIEW"],
    };
  }

  if (!ctx.aiEnabled || ctx.aiBudgetUsed >= ctx.maxAiAttempts) {
    return {
      ...base,
      category: cat.category,
      repairType: [type],
      decision: "HUMAN_REVIEW",
      confidence: "MEDIUM",
      reason: ["syarat CONTEXT_REPAIR butuh authoring konteks (AI/manusia); tanpa provider atau kuota → HUMAN_REVIEW, bukan karangan"],
    };
  }

  const out = await aiRepairCandidate(q, type as never);
  ctx.aiBudgetUsed++;
  if (!out.ok || !out.candidate) {
    return {
      ...base,
      category: cat.category,
      repairType: [type],
      decision: "REPAIR_FAILED",
      confidence: "LOW",
      reason: [`repair AI gagal: ${out.aiMeta.failureReason || "unknown"}`],
      aiMeta: out.aiMeta,
    };
  }

  if (factIn(out.candidate.text) || factIn(out.candidate.explanation)) {
    const factInSource = factIn(q.text);
    if (!factInSource) {
      return {
        ...base,
        category: cat.category,
        repairType: [type],
        candidate: out.candidate,
        decision: "BLOCKED",
        confidence: "LOW",
        reason: ["kandidat AI memuat fakta bernama yang tidak ada di sumber — hallucinated attribution — BLOCK"],
        aiMeta: out.aiMeta,
      };
    }
  }

  const { gates, distractorReports, single, expl, aiS, dup, dist } = gatesFor(out.candidate, q, ctx);
  if (!single.passed) {
    return {
      ...base, category: cat.category, repairType: [type], candidate: out.candidate, gates, distractorReports,
      decision: "REJECT", confidence: "LOW", reason: [str([single.detail]), "single-correct HARD GATE — tidak diturunkan ke HUMAN_REVIEW"], aiMeta: out.aiMeta,
    };
  }
  if (!dup.passed) {
    return {
      ...base, category: cat.category, repairType: [type], candidate: out.candidate, gates, distractorReports,
      decision: "BLOCKED", confidence: "LOW", reason: [str([dup.detail])], aiMeta: out.aiMeta,
    };
  }
  if (allPass(gates)) {
    return {
      ...base, category: cat.category, repairType: [type], candidate: out.candidate, gates, distractorReports,
      decision: "GOLD", confidence: "HIGH", reason: ["kandidat AI melewati SEMUA gate"], aiMeta: out.aiMeta,
    };
  }
  return {
    ...base, category: cat.category, repairType: [type], candidate: out.candidate, gates, distractorReports,
    decision: "HUMAN_REVIEW", confidence: "MEDIUM",
    reason: [str([...gates.filter((g) => !g.passed).map((g) => g.detail), dist.reason]) || "gate tidak lulus"],
    aiMeta: out.aiMeta,
  };
}

function semanticRepairPath(q: MasterQuestion, ctx: V2EngineContext, base: RepairV2Record, cat: ReturnType<typeof categorizeQuestion>): RepairV2Record {
  const sub = cat.subType;
  const targetMatch = (q.text || "").match(/dari (?:kata )?'([^']+)'/i);
  const target = targetMatch ? targetMatch[1] : null;
  const idx = keyIndex(q.correctAnswer, q.type);
  const keyOpt = idx === null ? "" : q.options[idx] ?? "";
  let verdict: string = "INSUFFICIENT_CONTEXT";
  let detail = "";

  if (sub === "SINONIM") {
    verification:
    if (target) {
      const v = synonymGate(target, keyOpt);
      verdict = v;
      detail = `sinonim('${target}', opsi kunci)`;
    }
  } else if (sub === "ANTONIM") {
    if (target) {
      const v = antonymGate(target, keyOpt);
      verdict = v;
      detail = `antonim('${target}', opsi kunci)`;
    }
  } else if (sub === "MAKNA_KATA") {
    const v = maknaKataGate(q.text, target ?? "");
    verdict = v;
    detail = `makna kata dalam konteks kalimat`;
  } else if (sub === "SPOK") {
    const v = spokGate(q);
    verdict = v;
    detail = "verifikasi struktur SPOK (tabel terverifikasi)";
  } else if (sub === "MAJAS") {
    const r = majasGate(q.text, keyOpt);
    verdict = r.verdict;
    detail = r.reason || "majas";
  } else if (sub === "EJAAN") {
    const repaired = ejaanRepair(q);
    if (repaired) {
      const r = ejaanGate(keyOpt, (idx === null ? "" : repaired.options[idx]) ?? "");
      verdict = r.verdict;
      detail = r.reason || r.rule || "ejaan";
    } else {
      verdict = "AMBIGUOUS";
      detail = "tidak ada rule ejaan terverifikasi untuk opsi";
    }
  } else if (sub === "KALIMAT_EFEKTIF") {
    const v = kalimatEfektifGate(q);
    verdict = v;
    detail = "verifikasi kalimat (hemat/cermat/padu/sejajar/logis via tabel)";
  }

  if (verdict === "AMBIGUOUS" || verdict === "INSUFFICIENT_CONTEXT") {
    return {
      ...base, category: cat.category, repairType: [sub], decision: "HUMAN_REVIEW", confidence: "MEDIUM",
      reason: [`gate ${sub}: ${verdict} — ${detail || "butuh penilaian semantik manusia / konteks tidak cukup"}`],
    };
  }

  if (verdict === "SEMANTIC_MISMATCH") {
    const repaired = semanticKeyRepair(q);
    if (!repaired) {
      return {
        ...base, category: cat.category, repairType: [sub], decision: "HUMAN_REVIEW", confidence: "MEDIUM",
        reason: [`gate ${sub}: SEMANTIC_MISMATCH dan tidak ada kunci alternatif yang terverifikasi — HUMAN_REVIEW`, detail].filter(Boolean),
      };
    }
    return finalizeSemanticRepair(q, repaired, ctx, base, cat);
  }

  if (verdict === "SEMANTIC_MATCH") {
    const candidate = ejaanRepair(q) ?? q;
    return finalizeSemanticRepair(q, candidate, ctx, base, cat);
  }

  return {
    ...base, category: cat.category, repairType: [sub], decision: "HUMAN_REVIEW", confidence: "MEDIUM",
    reason: [`gate ${sub}: verdict tidak dikenal`],
  };
}

function finalizeSemanticRepair(q: MasterQuestion, candidate: MasterQuestion, ctx: V2EngineContext, base: RepairV2Record, cat: ReturnType<typeof categorizeQuestion>): RepairV2Record {
  const { gates, distractorReports, single, dup } = gatesFor(candidate, q, ctx);
  const changed = JSON.stringify(candidate) !== JSON.stringify(q);
  const reasons = [changed ? `repair ${cat.subType} diterapkan` : `soal ${cat.subType} valid tanpa perubahan`, cat.reason];
  if (!single.passed) {
    return { ...base, category: cat.category, repairType: [cat.subType], candidate, gates, distractorReports, decision: "REJECT", confidence: "LOW", reason: [...reasons, str([single.detail])] };
  }
  if (!dup.passed) {
    return { ...base, category: cat.category, repairType: [cat.subType], candidate, gates, distractorReports, decision: "BLOCKED", confidence: "LOW", reason: [...reasons, str([dup.detail])] };
  }
  if (allPass(gates)) {
    return { ...base, category: cat.category, repairType: [cat.subType], candidate, gates, distractorReports, decision: "GOLD", confidence: "HIGH", reason: [...reasons, "semua gate semantik lulus"] };
  }
  return {
    ...base, category: cat.category, repairType: [cat.subType], candidate, gates, distractorReports,
    decision: "HUMAN_REVIEW", confidence: "MEDIUM",
    reason: [...reasons, gates.filter((g) => !g.passed).map((g) => g.detail).join("; ")],
  };
}