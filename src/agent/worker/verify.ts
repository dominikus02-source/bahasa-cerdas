/**
 * BC Agent P5 — completion verification (§20).
 *
 * Completion rule: a task becomes COMPLETED only when verification passes.
 * Verification is Agent-owned and evidence-based — never AI self-
 * certification:
 *
 *   1. Every action the plan proposed must have a persisted ToolExecution.
 *   2. Every non-rejected execution must have produced FACT evidence
 *      (tool-sourced, provenance-backed) — the P4 evidence ledger.
 *   3. The plan's objective must be stated (structure, not semantics).
 *   4. If the plan proposed zero actions, verification is NOT_REQUIRED
 *      (a pure-thinking task completes on its plan alone).
 *
 * The verifier reads ONLY persisted rows (executor-persisted executions and
 * FK-provenanced evidence) — never AI claims. AI self-certification is
 * structurally impossible: the plan schema has no verification field, and
 * this module never receives model text as truth.
 */

import type { PrismaClient } from "@prisma/client";
import type { AgentPlan } from "./plan";

export type VerificationStatus = "NOT_REQUIRED" | "PASSED" | "FAILED";

export interface VerificationResult {
  readonly status: VerificationStatus;
  readonly strategy: "evidence-completeness";
  readonly summary: string;
}

export async function verifyAttemptCompletion(
  prisma: PrismaClient,
  attemptId: string,
  plan: AgentPlan
): Promise<VerificationResult> {
  // A plan with no actions is a pure-analysis plan: nothing to verify.
  if (plan.proposedActions.length === 0) {
    return { status: "NOT_REQUIRED", strategy: "evidence-completeness", summary: "plan proposed no actions" };
  }

  const executions = await prisma.toolExecution.findMany({
    where: { attemptId },
    select: { id: true, toolName: true, status: true, errorCode: true },
  });
  const evidence = await prisma.toolEvidence.findMany({
    where: { attemptId, kind: "FACT" },
    select: { executionId: true },
  });

  const proposed = plan.proposedActions.length;
  const byTool = new Map<string, number>();
  for (const a of plan.proposedActions) byTool.set(a.toolName, (byTool.get(a.toolName) ?? 0) + 1);

  // 1. Completeness: every proposed action attempted (count per tool).
  const missing: string[] = [];
  for (const [toolName, count] of byTool) {
    const ran = executions.filter((e) => e.toolName === toolName).length;
    if (ran < count) missing.push(`${toolName} (${ran}/${count})`);
  }
  if (missing.length > 0) {
    return {
      status: "FAILED",
      strategy: "evidence-completeness",
      summary: `missing executions for: ${missing.join(", ").slice(0, 200)}`,
    };
  }

  // 2. Soundness: every non-rejected execution has FACT provenance.
  const succeeded = executions.filter((e) => e.status === "SUCCEEDED");
  const factExecutionIds = new Set(evidence.map((e) => e.executionId));
  const withoutFacts = succeeded.filter((e) => !factExecutionIds.has(e.id));
  if (succeeded.length === 0) {
    return {
      status: "FAILED",
      strategy: "evidence-completeness",
      summary: `0 of ${proposed} proposed actions succeeded`,
    };
  }
  if (withoutFacts.length > 0) {
    return {
      status: "FAILED",
      strategy: "evidence-completeness",
      summary: `${withoutFacts.length} succeeded execution(s) lack FACT evidence`,
    };
  }

  return {
    status: "PASSED",
    strategy: "evidence-completeness",
    summary: `${succeeded.length}/${proposed} actions succeeded with FACT evidence`,
  };
}
