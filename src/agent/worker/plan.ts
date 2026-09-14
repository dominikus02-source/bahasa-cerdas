/**
 * BC Agent P5 — the AI plan contract (§4) + validation (§5).
 *
 * The plan is UNTRUSTED AI output. It is a *proposal*, nothing more:
 * it carries no policy decision, no approval status, no autonomy
 * escalation, and no evidence classification — those are Agent-owned
 * and the plan schema structurally cannot express them (unknown fields
 * are rejected; the model cannot smuggle authority into the contract).
 *
 * Validation (§5): strict schema, action count bounded, purpose bounded,
 * every action's toolName must exist in the registry, and the whole plan
 * must fit the configured character budget. A plan that fails any of
 * these is never partially executed.
 */

import { z } from "zod";
import type { ToolRegistry } from "../tools/registry";

/** One proposed action — a request, never a command. */
export interface ProposedAction {
  readonly toolName: string;
  readonly input: unknown;
  readonly purpose: string;
}

export interface AgentPlan {
  readonly objective: string;
  readonly reasoning: string;
  readonly proposedActions: readonly ProposedAction[];
}

export type PlanValidationResult =
  | { readonly ok: true; readonly plan: AgentPlan }
  | { readonly ok: false; readonly reason: string };

/** String schema shared by objective/reasoning/purpose: bounded, single-purpose text. */
const boundedText = (max: number) => z.string().min(1).max(max);

/** Character budgets for plan fields. */
export const PLAN_LIMITS = {
  objectiveChars: 500,
  reasoningChars: 2_000,
  purposeChars: 300,
} as const;

/**
 * The responseSchema handed to the IntelligenceProvider. Strict objects:
 * unknown keys rejected, so a model cannot inject `approval`, `policy`,
 * `autonomy`, `evidence`, or any other authority field.
 */
export function planResponseSchema(maxActions: number): z.ZodTypeAny {
  const actionSchema = z
    .object({
      toolName: z.string().min(1).max(100),
      input: z.unknown(),
      purpose: boundedText(PLAN_LIMITS.purposeChars),
    })
    .strict();
  return z
    .object({
      objective: boundedText(PLAN_LIMITS.objectiveChars),
      reasoning: boundedText(PLAN_LIMITS.reasoningChars),
      proposedActions: z.array(actionSchema).max(maxActions),
    })
    .strict();
}

/**
 * Validate a parsed plan against the registry: schema shape (done by the
 * caller via planResponseSchema), then tool existence + overall size.
 * Returns a typed result — never throws for AI mistakes.
 */
export function validatePlan(
  candidate: unknown,
  registry: ToolRegistry,
  limits: { maxActions: number; maxPlanChars: number }
): PlanValidationResult {
  const parsed = planResponseSchema(limits.maxActions).safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, reason: `plan schema violation at ${issue.path.join(".") || "<root>"}: ${issue.message.slice(0, 120)}` };
  }
  const plan = parsed.data;

  const serialized = JSON.stringify(plan);
  if (serialized.length > limits.maxPlanChars) {
    return { ok: false, reason: `plan exceeds ${limits.maxPlanChars} chars (${serialized.length})` };
  }

  for (const action of plan.proposedActions) {
    if (!registry.has(action.toolName)) {
      return { ok: false, reason: `unknown tool "${action.toolName.slice(0, 100)}" in proposed action` };
    }
  }
  return { ok: true, plan };
}
