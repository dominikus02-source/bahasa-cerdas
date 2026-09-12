/**
 * BC Agent Core — pure policy engine (default-deny).
 *
 * Classification → decision. The policy engine consumes *tool metadata*
 * (facts a tool declares about itself) and *context* (who approved what),
 * never model output. AI proposals are inputs to the agent loop, not
 * authority over policy — there is no code path where a model string can
 * flip a decision here.
 *
 * Decision model (P0 §9):
 *   OBSERVE  (L0) → ALLOW
 *   ANALYZE  (L1) → ALLOW
 *   WRITE    (L2) → ALLOW only with a valid bound approval
 *   HIGH_RISK (L3) → ALLOW only with a valid bound approval
 *   Ambiguous classification → DENY
 *
 * Approval does NOT replace policy: an approval validates a WRITE/HIGH_RISK
 * action that policy *permits conditionally*. It can never flip an outright
 * policy denial (see decideWithApproval — DENY stays DENY even with a valid
 * approval in hand).
 *
 * Pure: no clocks (time injected as `now`), no I/O, no mutation.
 */

import { AutonomyLevel, ProductionImpact, ToolCategory, ToolDefinition, ToolRisk } from "./tool";
import { PolicyDeniedError, ApprovalRequiredError } from "./errors";
import { Approval, validateApproval } from "./approval";
import { hashCanonicalInput } from "./hash";

export type PolicyDecision = "ALLOW" | "DENY" | "REQUIRE_APPROVAL";

export interface PolicyEvaluation {
  readonly decision: PolicyDecision;
  /** Machine-readable reason (stable identifier, not a prose string). */
  readonly reason:
    | "OBSERVE_ALLOWED"
    | "ANALYZE_ALLOWED"
    | "WRITE_REQUIRES_APPROVAL"
    | "HIGH_RISK_REQUIRES_APPROVAL"
    | "APPROVAL_VALID"
    | "APPROVAL_REQUIRED_NOT_PROVIDED"
    | "APPROVAL_INVALID"
    | "DENIED_AMBIGUOUS"
    | "DENIED_POLICY";
  /** For REQUIRE_APPROVAL: suggested expiry window in ms (founder-configurable). */
  readonly suggestedTtlMs?: number;
}

/**
 * Stage 1 — classify + decide from tool metadata alone (no approval yet).
 * Default-deny: anything that does not match a known rule is DENY.
 */
export function evaluatePolicy(tool: ToolDefinition): PolicyEvaluation {
  const RISKS: readonly ToolRisk[] = ["READ", "ANALYZE", "WRITE", "HIGH_RISK"];
  const CATEGORIES: readonly ToolCategory[] = [
    "OBSERVE",
    "ANALYZE",
    "WRITE",
    "DESTRUCTIVE",
    "FINANCIAL",
    "CREDENTIAL",
    "PUBLIC_COMMUNICATION",
  ];
  const IMPACTS: readonly ProductionImpact[] = ["PRODUCTION", "PREVIEW", "SANDBOX", "NONE"];
  const LEVELS: readonly AutonomyLevel[] = ["L0", "L1", "L2", "L3"];

  // Ambiguity check: unknown enum values that somehow passed registration
  // (or were constructed after validation) are denied outright.
  const unambiguous =
    RISKS.includes(tool.risk) &&
    CATEGORIES.includes(tool.category) &&
    IMPACTS.includes(tool.productionImpact) &&
    LEVELS.includes(tool.autonomyLevel) &&
    typeof tool.reversible === "boolean";
  if (!unambiguous) {
    return { decision: "DENY", reason: "DENIED_AMBIGUOUS" };
  }

  // Hard denials — these categories are never conditionally allowed.
  if (tool.category === "DESTRUCTIVE") {
    return { decision: "DENY", reason: "DENIED_POLICY" };
  }

  switch (tool.risk) {
    case "READ":
      return { decision: "ALLOW", reason: "OBSERVE_ALLOWED" };
    case "ANALYZE":
      return { decision: "ALLOW", reason: "ANALYZE_ALLOWED" };
    case "WRITE":
      return { decision: "REQUIRE_APPROVAL", reason: "WRITE_REQUIRES_APPROVAL", suggestedTtlMs: 60 * 60 * 1000 };
    case "HIGH_RISK":
      return {
        decision: "REQUIRE_APPROVAL",
        reason: "HIGH_RISK_REQUIRES_APPROVAL",
        suggestedTtlMs: 15 * 60 * 1000,
      };
    default:
      // Exhaustiveness guard — unknown risk = ambiguous = deny.
      return { decision: "DENY", reason: "DENIED_AMBIGUOUS" };
  }
}

export interface ApprovalCandidate {
  readonly approval: Approval;
  readonly input: unknown;
}

/**
 * Stage 2 — full interaction: classify → policy → approval validation →
 * allow/reject. Throws typed errors; never mutates inputs.
 *
 * Guarantees:
 * - ALLOW requires either an unconditional policy ALLOW (L0/L1) or
 *   (REQUIRE_APPROVAL + a valid approval bound to this exact action).
 * - A valid approval CANNOT authorize an action policy denies outright
 *   (DESTRUCTIVE, ambiguous metadata). The denial reason is preserved.
 * - If policy says approval is required and none/invalid is provided, the
 *   typed error tells the caller which approval to request.
 */
export function decideWithApproval(
  tool: ToolDefinition,
  input: unknown,
  context: { taskId: string; attemptId: string; now: string },
  approvalCandidate?: ApprovalCandidate
): PolicyEvaluation {
  const stage1 = evaluatePolicy(tool);

  // Outright denials stand regardless of any approval.
  if (stage1.decision === "DENY") {
    throw new PolicyDeniedError(tool.name, stage1.reason);
  }

  // Unconditional allow (L0/L1).
  if (stage1.decision === "ALLOW") {
    return stage1;
  }

  // REQUIRE_APPROVAL path.
  if (!approvalCandidate) {
    throw new ApprovalRequiredError(tool.name, tool.risk);
  }

  const inputHash = hashCanonicalInput(input);
  const check = validateApproval(
    approvalCandidate.approval,
    {
      taskId: context.taskId,
      attemptId: context.attemptId,
      toolName: tool.name,
      inputHash,
    },
    context.now
  );
  if (!check.ok) {
    throw check.error;
  }

  // HIGH_RISK provenance check: the approver identity must be present.
  if (tool.risk === "HIGH_RISK" && (!check.approval.approvedBy || !check.approval.approvedBy.trim())) {
    throw new PolicyDeniedError(tool.name, "HIGH_RISK approval has no approver identity");
  }

  return { decision: "ALLOW", reason: "APPROVAL_VALID" };
}
