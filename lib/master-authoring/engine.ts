import { MasterQuestion, ClassificationResult, normOption } from "../master-recovery";
import {
  AiOutputContract,
  AuthoringDecision,
  AuthoringExecutor,
  AuthoringGates,
  AuthoringQuestion,
  AuthoringRecord,
  AuthoringSkill,
  AuthoringTelemetry,
  VALIDATOR_VERSION,
} from "./types";
import { allGatesPass, runGates, gateFailureSummary, gateFailuresCount } from "./gates";
import { buildAuthoringPrompt } from "./prompts";
import { buildRequestForExecutor, modelToUse, parseContract, sanitizeError, telemetryFromResponse } from "./provider";

export interface AuthoringContext {
  bank: MasterQuestion[];
  authored: AuthoringQuestion[];
  familyKey?: string;
  facts?: string[];
}

export interface AuthorQuestionOptions {
  executor?: AuthoringExecutor;
  model?: string;
  force?: boolean;
  now?: Date;
}

const GOLD_MIN_CONFIDENCE = 0.7;

function classifySkill(c: ClassificationResult | undefined, source: MasterQuestion): AuthoringSkill {
  void c;
  const t = `${source.text} ${source.options?.join(" ")}`.toLowerCase();
  if (/sinonim|persamaan kata/i.test(t)) return "SINONIM";
  if (/antonim|lawan kata/i.test(t)) return "ANTONIM";
  if (/\b(subjek|predikat|objek|keterangan|pelengkap|pola)\b/i.test(t)) return "SPOK";
  if (/kalimat efektif|kalimat yang|kalimat berikut/i.test(t)) return "KALIMAT_EFEKTIF";
  if (/penulisan|ejaan|tanda baca/i.test(t)) return "EJAAN";
  if (/majas|gaya bahasa/i.test(t)) return "MAJAS";
  if (/\bmakna\b|\bbermakna\b|maknanya|arti kata/i.test(t)) return "MAKNA_KATA";
  return "KONSEP";
}

function routeByConfidence(
  ai: AiOutputContract,
  gates: AuthoringGates,
  source: MasterQuestion
): { decision: AuthoringDecision; risks: string[] } {
  const risks = gateFailureSummary(gates);
  const hasEvidence =
    ai.difficultyEvidence.trim().length >= 20 && ai.semanticEvidence.trim().length >= 20;
  const aiTrusted = ai.sourceQuestionId === source.kodeSoal && ai.sourcePreserved === true;

  if (ai.decision === "REJECT") return { decision: "REJECT", risks };
  if (ai.decision === "HUMAN_REVIEW") return { decision: "HUMAN_REVIEW_REQUIRED", risks };

  // AI mengklaim GOLD — verifikasi server-side penuh.
  if (!ai.question) return { decision: "HUMAN_REVIEW_REQUIRED", risks: ["GOLD tanpa question", ...risks] };
  if (!aiTrusted) risks.push("sourceQuestionId/sourcePreserved tidak sesuai");
  if (!hasEvidence) risks.push("evidence tidak lengkap (difficulty/semantic < 20 char)");
  if (ai.confidence < GOLD_MIN_CONFIDENCE) risks.push(`confidence ${ai.confidence} < ${GOLD_MIN_CONFIDENCE}`);

  if (risks.length === 0 && allGatesPass(gates)) return { decision: "GOLD", risks };
  if (!gates.passA.passed) return { decision: "REJECT", risks };
  return { decision: "HUMAN_REVIEW_REQUIRED", risks };
}

/**
 * Authoring satu soal sumber → candidate aman.
 * Source TIDAK pernah dimutasi (prinsip STEP 7.3).
 * Idempoten per (source.kodeSoal, opts): output record deterministik dgn timestamp yang dapat distabilkan.
 */
export async function authorQuestion(
  source: MasterQuestion,
  classification: ClassificationResult | undefined,
  ctx: AuthoringContext,
  opts: AuthorQuestionOptions = {}
): Promise<AuthoringRecord> {
  const started = performance.now();
  const skill = classifySkill(classification, source);
  const repairType = classification?.disposition ?? "AI_REPAIR_CANDIDATE";
  const user = buildAuthoringPrompt({
    source,
    skill,
    repairType,
    familyKey: ctx.familyKey,
    facts: ctx.facts ?? [],
  }).user;

  let telemetry: AuthoringTelemetry = {
    provider: "none",
    model: "none",
    attempted: false,
    latencyMs: 0,
    tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };
  let contract: AiOutputContract | null = null;
  let decision: AuthoringDecision = "REPAIR_FAILED";
  let gates: AuthoringGates | null = null;
  let reason: string[] = [];
  let risks: string[] = [];

  const executor = opts.executor;
  if (!executor) {
    telemetry = {
      provider: "none",
      model: "none",
      attempted: false,
      latencyMs: Math.round(performance.now() - started),
      errorCode: "EXECUTOR_UNAVAILABLE",
      tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
    decision = "REPAIR_FAILED";
    reason = ["executor tidak tersedia (panggil dengan executor default dari createAuthoringExecutor)"];
  } else {
    try {
      const req = buildRequestForExecutor(opts.model ?? modelToUse(), user);
      const res = await executor(req);
      telemetry = telemetryFromResponse(res, true);
      contract = parseContract(res.content);
    } catch (e) {
      telemetry = {
        provider: "unknown",
        model: opts.model ?? modelToUse(),
        attempted: true,
        latencyMs: Math.round(performance.now() - started),
        errorCode: "PROVIDER_FAILED",
        tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
      decision = "REPAIR_FAILED";
      reason = [sanitizeError(e)];
    }
  }

  if (telemetry.attempted && contract === null && telemetry.errorCode === undefined) {
    telemetry = { ...telemetry, errorCode: "INVALID_CONTRACT" };
    decision = "HUMAN_REVIEW_REQUIRED";
    reason = ["output AI tidak sesuai kontrak (parse gagal)"];
  }

  let candidate: AuthoringQuestion | null = null;
  if (contract && contract.question) {
    candidate = contract.question;
    gates = runGates(candidate, skill, ctx, {
      difficultyEvidence: contract.difficultyEvidence,
      semanticEvidence: contract.semanticEvidence,
    });
    const routed = routeByConfidence(contract, gates, source);
    decision = routed.decision;
    risks = routed.risks;
    reason = [contract.reason, ...gateFailureSummary(gates)];
  } else if (contract) {
    gates = null;
    decision = contract.decision === "REJECT" ? "REJECT" : "HUMAN_REVIEW_REQUIRED";
    reason = [contract.reason || "tanpa alasan"];
  }

  return {
    questionId: source.kodeSoal,
    source: JSON.parse(JSON.stringify(source)) as MasterQuestion,
    candidate,
    decision,
    gates,
    confidence: contract?.confidence ?? 0,
    difficultyEvidence: contract?.difficultyEvidence ?? "",
    semanticEvidence: contract?.semanticEvidence ?? "",
    reason,
    repairType,
    telemetry,
    detectedRisks: risks,
    validatorVersion: VALIDATOR_VERSION,
    timestamp: (opts.now ?? new Date()).toISOString(),
  };
}

/** Konversi record → MasterQuestion siap produksi (kunci jadi index). */
export function authoringCandidate(r: AuthoringRecord): MasterQuestion | null {
  if (!r.candidate) return null;
  const c = r.candidate;
  const idx = c.options.findIndex((o) => normOption(o) === normOption(c.correctAnswer));
  if (idx === -1) return null;
  return {
    ...r.source,
    type: c.type,
    text: c.stem,
    options: [...c.options],
    correctAnswer: String(idx),
    explanation: c.explanation || r.source.explanation,
  } as MasterQuestion;
}

export function summarizeAuthoring(records: AuthoringRecord[]) {
  const stats = {
    total: records.length,
    gold: 0,
    humanReview: 0,
    rejected: 0,
    failed: 0,
    avgLatencyMs: 0,
    providerDistribution: {} as Record<string, number>,
    errorCodes: {} as Record<string, number>,
    gateFailures: {} as Record<string, number>,
  };
  let latencySum = 0;
  for (const r of records) {
    if (r.decision === "GOLD") stats.gold++;
    else if (r.decision === "HUMAN_REVIEW_REQUIRED") stats.humanReview++;
    else if (r.decision === "REJECT") stats.rejected++;
    else stats.failed++;
    latencySum += r.telemetry.latencyMs;
    stats.providerDistribution[r.telemetry.provider] = (stats.providerDistribution[r.telemetry.provider] ?? 0) + 1;
    if (r.telemetry.errorCode)
      stats.errorCodes[r.telemetry.errorCode] = (stats.errorCodes[r.telemetry.errorCode] ?? 0) + 1;
    const gf = gateFailuresCount(r.gates);
    for (const [k, v] of Object.entries(gf)) stats.gateFailures[k] = (stats.gateFailures[k] ?? 0) + v;
  }
  stats.avgLatencyMs = records.length ? Math.round(latencySum / records.length) : 0;
  return stats;
}

export { gateFailureSummary, allGatesPass };
