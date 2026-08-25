import { z } from "zod";

// ─── Identifiers ────────────────────────────────────────────
export type AgentId =
  | "rpp"
  | "soal"
  | "ppt"
  | "bc-assistant"
  | "review"
  | "eyd"
  | "feedback"
  | "grading"
  | "text-analysis"
  | "rubric"
  | "akm-literacy"
  | "curriculum-align"
  | "mentor";

// ─── Target users ───────────────────────────────────────────
export type AgentTargetUser = "guru" | "murid" | "admin" | "all";

// ─── Agent capabilities ────────────────────────────────────
export interface AgentCapability {
  id: string;
  label: string;
  description: string;
}

// ─── Quality checks ────────────────────────────────────────
export interface AgentQualityCheck {
  id: string;
  label: string;
  description: string;
  severity: "error" | "warning";
}

// ─── Provider configuration ────────────────────────────────
export interface AgentProviderConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  fallbackModel?: string;
  apiKeyEnvVar: string;
}

// ─── Input / Output schemas ────────────────────────────────
export interface AgentIO {
  input: z.ZodTypeAny;
  output: z.ZodTypeAny;
}

// ─── Workflow step ─────────────────────────────────────────
export interface AgentWorkflowStep {
  id: string;
  name: string;
  description: string;
  order: number;
}

// ─── Safety rule ───────────────────────────────────────────
export interface AgentSafetyRule {
  id: string;
  rule: string;
  category: "privacy" | "content" | "pedagogy" | "security";
}

// ─── Example ───────────────────────────────────────────────
export interface AgentExample {
  name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  description: string;
}

// ─── Run context (injected at runtime) ─────────────────────
export interface AgentRunContext {
  userId: string;
  userRole: string;
  isPremium: boolean;
  requestId: string;
  timestamp: Date;
  db: unknown;
}

// ─── Agent input wrapper ───────────────────────────────────
export type AgentInput = Record<string, unknown>;

// ─── Agent output wrapper ──────────────────────────────────
export type AgentOutput = Record<string, unknown>;

// ─── Run result ────────────────────────────────────────────
export interface AgentRunResult {
  success: boolean;
  agentId: AgentId;
  output: AgentOutput | null;
  text: string | null;
  error: string | null;
  warnings: string[];
  qualityScore: number;
  qualityChecks: { passed: boolean; checkId: string; message: string }[];
  provider: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUSD: number;
    provider: string;
    model: string;
    durationMs: number;
  };
  latencyMs: number;
  metadata: {
    requestId: string;
    timestamp: Date;
    userId: string;
  };
}

// ─── Usage log entry ──────────────────────────────────────
export interface AgentUsageLog {
  id?: string;
  userId: string;
  agentId: AgentId;
  feature?: string;
  input: AgentInput;
  output: AgentOutput | null;
  success: boolean;
  error: string | null;
  errorCode?: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number;
  provider: string;
  model: string;
  latencyMs?: number | null;
  durationMs: number;
  createdAt: Date;
}

// ─── Agent definition (the core contract) ─────────────────
export interface AgentDefinition<I extends AgentInput = AgentInput, O extends AgentOutput = AgentOutput> {
  id: AgentId;
  name: string;
  description: string;
  role: string;
  targetUser: AgentTargetUser;
  capabilities: AgentCapability[];
  limitations: string[];
  systemPrompt: string;
  inputSchema: z.ZodType<I, any, any>;
  outputSchema: z.ZodType<O, any, any>;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  workflowSteps: AgentWorkflowStep[];
  qualityChecklist: AgentQualityCheck[];
  safetyRules: AgentSafetyRule[];
  examples: AgentExample[];

  run(input: I, context: AgentRunContext): Promise<AgentRunResult>;
}
