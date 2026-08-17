import { MasterQuestion } from "../master-recovery";

export type RepairType =
  | "TYPE_REPAIR"
  | "CONCEPT_TO_CONTEXT"
  | "BAD_EXPLAIN_TO_MCQ"
  | "TAUTOLOGY_TO_VALID_ITEM"
  | "OPTION_REPAIR"
  | "KEY_REPAIR"
  | "STEM_REPAIR"
  | "DISTRACTOR_REPAIR"
  | "LANGUAGE_REPAIR"
  | "DIFFICULTY_REPAIR"
  | "EXPLANATION_REPAIR";

export const REPAIR_TYPES: RepairType[] = [
  "TYPE_REPAIR",
  "CONCEPT_TO_CONTEXT",
  "BAD_EXPLAIN_TO_MCQ",
  "TAUTOLOGY_TO_VALID_ITEM",
  "OPTION_REPAIR",
  "KEY_REPAIR",
  "STEM_REPAIR",
  "DISTRACTOR_REPAIR",
  "LANGUAGE_REPAIR",
  "DIFFICULTY_REPAIR",
  "EXPLANATION_REPAIR",
];

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type RepairDisposition =
  | "GOLD"
  | "HUMAN_REVIEW_REQUIRED"
  | "REJECT"
  | "REPAIR_FAILED";

export interface PassACheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface PassBCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface ValidationSummary {
  passA: {
    passed: boolean;
    checks: PassACheck[];
  };
  passB: {
    passed: boolean;
    checks: PassBCheck[];
  };
}

export interface RepairRecord {
  id: string;
  original: MasterQuestion;
  candidate: MasterQuestion | null;
  repairType: RepairType[];
  reason: string[];
  validation: ValidationSummary | null;
  confidence: Confidence;
  disposition: RepairDisposition;
  gold: boolean;
  aiMeta?: {
    provider: string;
    model: string;
    attempted: boolean;
    failureReason?: string;
  } | null;
  validatorVersion: string;
  timestamp: string;
}

export interface ReviewQueueEntry {
  questionId: string;
  original: MasterQuestion;
  candidate: MasterQuestion | null;
  repairType: RepairType[];
  failureReason: string;
  confidence: Confidence;
  recommendedAction: string;
  disposition: RepairDisposition;
}

export interface RepairStats {
  total: number;
  gold: number;
  humanReview: number;
  rejected: number;
  failed: number;
  byType: Partial<Record<RepairType, { attempted: number; repaired: number }>>;
  confidence: Partial<Record<Confidence, number>>;
  quality: {
    exactlyOneCorrect: number;
    contextValid: number;
    explanationValid: number;
    noAmbiguity: number;
    noDuplicate: number;
    skillValid: number;
    difficultyValid: number;
  };
}

export const VALIDATOR_VERSION = "master-repair-v1";
