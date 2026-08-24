export type AiPlan =
  | "FOUNDER"
  | "MURID_FREE"
  | "MURID_PREMIUM"
  | "GURU_PRO"
  | "GURU_PRO_TRIAL"
  | "GURU_FREE"
  | "SCHOOL";

export type CreditWeight = "light" | "medium" | "heavy";

export interface CostPolicyResult {
  credits: number;
  weight: CreditWeight;
  reason: string;
}

export interface PlanResolverResult {
  plan: AiPlan;
  unlimited: boolean;
  creditsTotal: number;
  period: string;
  isTrial: boolean;
  trialEndsAt: Date | null;
  reason: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  mode: "soft" | "hard";
  wouldBlock: boolean;
  reason: string;
  creditsRequired: number;
  creditsUsed: number;
  creditsTotal: number;
  creditsRemaining: number;
  plan: AiPlan;
  period: string;
  warning?: string;
}

export interface ProviderHealth {
  healthy: boolean;
  degraded: boolean;
  cooldownUntil: number | null;
  failureCount: number;
  lastFailureAt: number | null;
}

export type AiAgentId =
  | "rpp"
  | "soal"
  | "ppt"
  | "review"
  | "bc-assistant"
  | "eyd"
  | "feedback"
  | "grading"
  | "text-analysis"
  | "rubric"
  | "akm-literacy"
  | "curriculum-align";
