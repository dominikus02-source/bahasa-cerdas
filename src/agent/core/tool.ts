/**
 * BC Agent Core — tool contract.
 *
 * P1 defines the contract + registration-time validation only. The actual
 * registry/execution layer (credential injection, timeouts, subprocesses) is
 * P4 per the P0 roadmap.
 *
 * Tools declare facts about themselves (risk, reversibility, impact); the
 * policy engine (policy.ts) turns those facts into decisions. A tool can
 * never grant itself permissions.
 */

import { InvalidToolDefinitionError } from "./errors";

/** Risk classes (P0 §8). Finite enum — no free-form risk strings. */
export type ToolRisk = "READ" | "ANALYZE" | "WRITE" | "HIGH_RISK";

/** Autonomy ladder (P0 §9). */
export type AutonomyLevel = "L0" | "L1" | "L2" | "L3";

/**
 * Production impact: does this action affect the live product/production
 * environment (vs preview/sandbox/local)?
 */
export type ProductionImpact = "PRODUCTION" | "PREVIEW" | "SANDBOX" | "NONE";

/** Category of harm used by policy for special-case rules. */
export type ToolCategory =
  | "OBSERVE"
  | "ANALYZE"
  | "WRITE"
  | "DESTRUCTIVE"
  | "FINANCIAL"
  | "CREDENTIAL"
  | "PUBLIC_COMMUNICATION";

/**
 * Tool metadata contract. `execute` is declared for forward-compatibility but
 * P1 builds no execution layer; a tool definition without execute is valid
 * for contract/policy purposes.
 */
export interface ToolDefinition<I = unknown> {
  /** Dotted name, e.g. "github.read". Non-empty. */
  readonly name: string;
  readonly description: string;
  readonly risk: ToolRisk;
  /** Whether the action can be undone by the agent itself (branch, preview, dry-run). */
  readonly reversible: boolean;
  /** Declared approval requirement — must be consistent with risk (validated). */
  readonly requiresApproval: boolean;
  /** Minimum autonomy tier the tool belongs to. */
  readonly autonomyLevel: AutonomyLevel;
  /** Identifiers of the input/output schemas (zod schema ids, P4 wires real schemas). */
  readonly inputSchema: string;
  readonly outputSchema: string;
  /** Hard timeout for future execution (ms). */
  readonly timeoutMs: number;
  /** Whether the action's effect hits production vs preview/sandbox. */
  readonly productionImpact: ProductionImpact;
  /** Harm category used by policy. */
  readonly category: ToolCategory;
  /** Whether identical inputs produce identical safe outcomes. */
  readonly idempotent: boolean;
}

export interface ToolContext {
  readonly taskId: string;
  readonly attemptId: string;
  readonly executionId: string;
  /** Per-call scoped credentials — injected by the future execution layer, never by tools. */
  readonly credentials?: Readonly<Record<string, string>>;
}

export interface ToolResult {
  readonly status: "SUCCESS" | "FAILED" | "TIMEOUT";
  readonly output?: unknown;
  readonly error?: string;
  readonly durationMs: number;
}

/**
 * Validate a tool definition at registration time. Throws
 * InvalidToolDefinitionError on any violation. Deterministic.
 */
export function validateToolDefinition(tool: ToolDefinition): void {
  if (tool === null || tool === undefined || typeof tool !== "object") {
    throw new InvalidToolDefinitionError("<unknown>", "definition is not an object");
  }
  if (typeof tool.name !== "string" || !tool.name.trim()) {
    throw new InvalidToolDefinitionError(String(tool?.name ?? "<unknown>"), "name must be a non-empty string");
  }
  if (typeof tool.description !== "string" || !tool.description.trim()) {
    throw new InvalidToolDefinitionError(tool.name, "description must be a non-empty string");
  }
  const RISKS: readonly ToolRisk[] = ["READ", "ANALYZE", "WRITE", "HIGH_RISK"];
  if (!RISKS.includes(tool.risk)) {
    throw new InvalidToolDefinitionError(tool.name, `unknown risk level "${String(tool.risk)}"`);
  }
  const LEVELS: readonly AutonomyLevel[] = ["L0", "L1", "L2", "L3"];
  if (!LEVELS.includes(tool.autonomyLevel)) {
    throw new InvalidToolDefinitionError(tool.name, `unknown autonomy level "${String(tool.autonomyLevel)}"`);
  }
  if (typeof tool.reversible !== "boolean") {
    throw new InvalidToolDefinitionError(tool.name, "reversible must be boolean");
  }
  if (typeof tool.requiresApproval !== "boolean") {
    throw new InvalidToolDefinitionError(tool.name, "requiresApproval must be boolean");
  }
  if (typeof tool.idempotent !== "boolean") {
    throw new InvalidToolDefinitionError(tool.name, "idempotent must be boolean");
  }
  if (typeof tool.inputSchema !== "string" || !tool.inputSchema) {
    throw new InvalidToolDefinitionError(tool.name, "inputSchema must be a schema identifier string");
  }
  if (typeof tool.outputSchema !== "string" || !tool.outputSchema) {
    throw new InvalidToolDefinitionError(tool.name, "outputSchema must be a schema identifier string");
  }
  if (!Number.isInteger(tool.timeoutMs) || tool.timeoutMs <= 0) {
    throw new InvalidToolDefinitionError(tool.name, "timeoutMs must be a positive integer");
  }
  const CATEGORIES: readonly ToolCategory[] = [
    "OBSERVE",
    "ANALYZE",
    "WRITE",
    "DESTRUCTIVE",
    "FINANCIAL",
    "CREDENTIAL",
    "PUBLIC_COMMUNICATION",
  ];
  if (!CATEGORIES.includes(tool.category)) {
    throw new InvalidToolDefinitionError(tool.name, `unknown category "${String(tool.category)}"`);
  }
  const IMPACTS: readonly ProductionImpact[] = ["PRODUCTION", "PREVIEW", "SANDBOX", "NONE"];
  if (!IMPACTS.includes(tool.productionImpact)) {
    throw new InvalidToolDefinitionError(tool.name, `unknown productionImpact "${String(tool.productionImpact)}"`);
  }

  // Consistency rules — contradictory metadata is a registration error.
  const approvalRiskClasses: readonly ToolRisk[] = ["WRITE", "HIGH_RISK"];
  if (approvalRiskClasses.includes(tool.risk) && !tool.requiresApproval) {
    throw new InvalidToolDefinitionError(
      tool.name,
      `risk ${tool.risk} requires requiresApproval=true (contradictory metadata)`
    );
  }
  if (tool.risk === "READ" && tool.requiresApproval) {
    throw new InvalidToolDefinitionError(tool.name, "READ risk cannot require approval");
  }
  if (tool.risk === "HIGH_RISK" && tool.reversible) {
    throw new InvalidToolDefinitionError(tool.name, "HIGH_RISK tools must be declared irreversible");
  }
  if (tool.category === "DESTRUCTIVE" && tool.reversible) {
    throw new InvalidToolDefinitionError(tool.name, "DESTRUCTIVE tools must be declared irreversible");
  }
  if (tool.risk === "READ" && tool.category !== "OBSERVE") {
    throw new InvalidToolDefinitionError(tool.name, "READ risk must use category OBSERVE");
  }
  if (tool.risk === "ANALYZE" && tool.category !== "ANALYZE") {
    throw new InvalidToolDefinitionError(tool.name, "ANALYZE risk must use category ANALYZE");
  }
  if (tool.risk === "HIGH_RISK" && tool.autonomyLevel !== "L3") {
    throw new InvalidToolDefinitionError(tool.name, "HIGH_RISK tools must be autonomy L3");
  }
  if (tool.risk === "WRITE" && tool.autonomyLevel !== "L2") {
    throw new InvalidToolDefinitionError(tool.name, "WRITE tools must be autonomy L2");
  }
  if (tool.risk === "READ" && tool.autonomyLevel !== "L0") {
    throw new InvalidToolDefinitionError(tool.name, "READ tools must be autonomy L0");
  }
  if (tool.risk === "ANALYZE" && tool.autonomyLevel !== "L1") {
    throw new InvalidToolDefinitionError(tool.name, "ANALYZE tools must be autonomy L1");
  }
}

/** Convenience factory: validate on construction. */
export function defineTool(tool: ToolDefinition): ToolDefinition {
  validateToolDefinition(tool);
  return tool;
}
