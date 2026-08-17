import { MasterQuestion } from "../master-recovery";
import { ProviderResponse } from "../../src/ai/core/provider";

export const VALIDATOR_VERSION = "master-authoring-v1";

export type AuthoringSkill =
  | "SINONIM"
  | "ANTONIM"
  | "SPOK"
  | "KALIMAT_EFEKTIF"
  | "EJAAN"
  | "MAJAS"
  | "MAKNA_KATA"
  | "KONSEP";

export type AuthoringType = "PILIHAN_GANDA" | "BENAR_SALAH";

export interface AuthoringQuestion {
  type: AuthoringType;
  skill: AuthoringSkill;
  difficulty: "MUDAH" | "SEDANG" | "SULIT";
  stem: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

/** Kontrak output AI — strict JSON (STEP 7.3). */
export interface AiOutputContract {
  decision: "GOLD" | "HUMAN_REVIEW" | "REJECT";
  question: AuthoringQuestion | null;
  reason: string;
  confidence: number;
  difficultyEvidence: string;
  semanticEvidence: string;
  repairType: string;
  sourceQuestionId: string;
  sourcePreserved: boolean;
}

export type AuthoringDecision =
  | "GOLD"
  | "HUMAN_REVIEW_REQUIRED"
  | "REJECT"
  | "REPAIR_FAILED";

export interface GateCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface GateResult {
  passed: boolean;
  checks: GateCheck[];
}

export interface AuthoringGates {
  passA: GateResult; // structural
  passB: GateResult; // linguistic
  passC: GateResult; // semantic
  passD: GateResult; // duplicate
  passE: GateResult; // educational
}

export interface AuthoringTelemetry {
  provider: string;
  model: string;
  attempted: boolean;
  latencyMs: number;
  errorCode?: string;
  tokens: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface AuthoringRecord {
  questionId: string;
  source: MasterQuestion;
  candidate: AuthoringQuestion | null;
  decision: AuthoringDecision;
  gates: AuthoringGates | null;
  confidence: number;
  difficultyEvidence: string;
  semanticEvidence: string;
  reason: string[];
  repairType: string;
  telemetry: AuthoringTelemetry;
  detectedRisks: string[];
  validatorVersion: string;
  timestamp: string;
}

export interface AuthoringStats {
  total: number;
  gold: number;
  humanReview: number;
  rejected: number;
  failed: number;
  avgLatencyMs: number;
  providerDistribution: Record<string, number>;
  errorCodes: Record<string, number>;
  gateFailures: Record<string, number>;
}

/** Executor injectable — default callWithFallback; stub utk test. */
export type AuthoringExecutor = (req: {
  model: string;
  messages: { role: "system" | "user"; content: string }[];
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}) => Promise<ProviderResponse>;

export const DIFFICULTY_LEVELS = ["MUDAH", "SEDANG", "SULIT"] as const;

export const SKILL_LABELS: Record<AuthoringSkill, string> = {
  SINONIM: "sinonim",
  ANTONIM: "antonim",
  SPOK: "SPOK",
  KALIMAT_EFEKTIF: "kalimat efektif",
  EJAAN: "ejaan",
  MAJAS: "majas",
  MAKNA_KATA: "makna kata dalam konteks",
  KONSEP: "konsep/kata",
};

/** Peta skill → pola stem yang WAJIB ada agar skill benar-benar diuji (PASS E). */
export const SKILL_STEM_PATTERNS: Record<AuthoringSkill, RegExp[]> = {
  SINONIM: [/sinonim/i, /persamaan kata/i],
  ANTONIM: [/antonim/i, /lawan kata/i, /lawan/i],
  SPOK: [/\b(subjek|predikat|objek|keterangan|pelengkap)\b/i],
  KALIMAT_EFEKTIF: [/kalimat (yang |yang tepat|efektif|berikut|paling)/i, /penulisan kalimat/i],
  EJAAN: [/penulisan/i, /ejaan/i, /tanda baca/i, /\bkata\b.*\bbaku\b/i],
  MAJAS: [/majas/i, /gaya bahasa/i],
  MAKNA_KATA: [/\bmakna\b/i, /\barti\b/i, /\bmaksud\b/i, /dalam kalimat/i],
  KONSEP: [/termasuk/i, /contoh/i, /\badalah\b/i, /\byaitu\b/i, /\bmerupakan\b/i, /yang dimaksud/i, /\bpengertian\b/i, /menggambarkan/i, /\bdefinisi\b/i, /\bistilah\b/i, /\bmaksud\b/i, /pernyataan (berikut|yang)/i],
};
