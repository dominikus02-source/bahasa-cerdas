import { MasterQuestion } from "../../master-recovery";

export type RepairCategory =
  | "SAFE_REPAIR"
  | "CONTEXT_REPAIR"
  | "FACT_DEPENDENT_REPAIR"
  | "SEMANTIC_REPAIR";

export type SemanticVerdict =
  | "SEMANTIC_MATCH"
  | "SEMANTIC_MISMATCH"
  | "AMBIGUOUS"
  | "INSUFFICIENT_CONTEXT";

export type PilotDecision =
  | "GOLD"
  | "HUMAN_REVIEW"
  | "BLOCKED"
  | "REPAIR_FAILED"
  | "INVALID_CONTRACT"
  | "REJECT";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export interface GateResult {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface DistractorReport {
  option: string;
  whyWrong: string;
  plausible: boolean;
}

export interface RepairV2Record {
  id: string;
  sourceSha256: string;
  sourceImmutable: boolean;
  original: MasterQuestion;
  candidate: MasterQuestion | null;
  category: RepairCategory;
  repairType: string[];
  decision: PilotDecision;
  confidence: Confidence;
  gates: GateResult[];
  distractorReports: DistractorReport[];
  reason: string[];
  aiMeta?: {
    provider: string;
    model: string;
    attempted: boolean;
    failureReason?: string;
  } | null;
  validatorVersion: string;
  timestamp: string;
}

export interface V2EngineContext {
  allBank: MasterQuestion[];
  aiEnabled: boolean;
  maxAiAttempts: number;
  aiBudgetUsed: number;
}

export const V2_VALIDATOR_VERSION = "master-semantic-repair-v2";

export const PILOT_DECISIONS: PilotDecision[] = [
  "GOLD",
  "HUMAN_REVIEW",
  "BLOCKED",
  "REPAIR_FAILED",
  "INVALID_CONTRACT",
];