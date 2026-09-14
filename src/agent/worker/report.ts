/**
 * BC Agent P5 — structured task report (§21).
 *
 * Assembled exclusively from persisted rows: task, attempts, events,
 * tool executions, evidence. The report never invents claims — every
 * number in it is a count of real rows. AI text appears only as the
 * plan's objective (labeled as AI-proposed intent, not as fact).
 */

import type { PrismaClient } from "@prisma/client";
import type { AgentPlan } from "./plan";
import type { VerificationResult } from "./verify";

export type TaskOutcome = "COMPLETED" | "FAILED" | "WAITING_APPROVAL" | "WAITING_INTELLIGENCE" | "CANCELLED";

export interface TaskReport {
  readonly taskId: string;
  readonly attemptId: string;
  readonly outcome: TaskOutcome;
  readonly objective: string | null; // AI-proposed intent (labeled)
  readonly actionsProposed: number;
  readonly actionsExecuted: number;
  readonly actionsSucceeded: number;
  readonly actionsRejected: number;
  readonly factEvidenceCount: number;
  readonly verification: VerificationResult;
  readonly warnings: readonly string[];
  readonly failureReason: string | null;
  readonly durationMs: number | null;
}

export async function buildTaskReport(input: {
  prisma: PrismaClient;
  taskId: string;
  attemptId: string;
  outcome: TaskOutcome;
  plan: AgentPlan | null;
  verification: VerificationResult;
  startedTick: number;
  failureReason?: string;
}): Promise<TaskReport> {
  const { prisma, taskId, attemptId, outcome, plan, verification, startedTick } = input;

  const executions = await prisma.toolExecution.findMany({
    where: { attemptId },
    select: { status: true },
  });
  const factCount = await prisma.toolEvidence.count({ where: { attemptId, kind: "FACT" } });

  const actionsExecuted = executions.length;
  const actionsSucceeded = executions.filter((e) => e.status === "SUCCEEDED").length;
  const actionsRejected = executions.filter((e) => e.status === "FAILED").length;

  const warnings: string[] = [];
  if (plan && plan.proposedActions.length > 0 && actionsExecuted < plan.proposedActions.length) {
    warnings.push(`${plan.proposedActions.length - actionsExecuted} proposed action(s) were never executed (task stopped early)`);
  }
  if (actionsSucceeded > 0 && factCount === 0) {
    warnings.push("executions succeeded but no FACT evidence exists");
  }

  return {
    taskId,
    attemptId,
    outcome,
    objective: plan?.objective ?? null,
    actionsProposed: plan?.proposedActions.length ?? 0,
    actionsExecuted,
    actionsSucceeded,
    actionsRejected,
    factEvidenceCount: factCount,
    verification,
    warnings,
    failureReason: input.failureReason ?? null,
    durationMs: Date.now() - startedTick,
  };
}
