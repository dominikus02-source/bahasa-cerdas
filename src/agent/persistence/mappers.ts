/**
 * BC Agent P2 — Prisma row ⇄ P1 core type mappers.
 *
 * Single owner of every conversion between the durable representation and
 * the pure core contracts. The core never imports Prisma; the service never
 * hand-rolls conversions. Timestamps are stored as Date, exchanged as ISO
 * strings (the core's contract).
 */

import type {
  AgentTask as PrismaAgentTask,
  TaskAttempt as PrismaTaskAttempt,
  TaskEvent as PrismaTaskEvent,
  AgentApproval as PrismaAgentApproval,
} from "@prisma/client";

import type { AgentTask, TaskChannel, TaskIntentType, TaskStatus, TaskVerification } from "../core/types";
import type { TaskAttempt, AttemptStatus, PlanStep, PolicyDecisionRef } from "../core/attempt";
import type { Approval, ApprovalStatus } from "../core/approval";
import type { TaskEventType } from "./events";
import { fromDbJson } from "./json";

// ─── Row → Core ─────────────────────────────────────────────────────────

export function toCoreTask(row: PrismaAgentTask): AgentTask {
  return {
    id: row.id,
    instruction: row.instruction,
    intentType: row.intentType as TaskIntentType,
    channel: row.channel as TaskChannel,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    status: row.status as TaskStatus,
    attemptCount: row.attemptCount,
    currentAttemptId: row.currentAttemptId,
    approvalIds: [], // approvals live in AgentApproval; task-side list is derived, not stored
    ...(row.resolvedBy !== null ? { resolvedBy: row.resolvedBy } : {}),
  };
}

export function toCoreAttempt(row: PrismaTaskAttempt): TaskAttempt {
  return {
    id: row.id,
    taskId: row.taskId,
    sequence: row.sequence,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    status: row.status as AttemptStatus,
    plan: fromDbJson<PlanStep[]>(row.plan),
    decisions: fromDbJson<PolicyDecisionRef[]>(row.decisions),
    verification: fromDbJson<TaskVerification>(row.verification),
    evidenceIds: fromDbJson<string[]>(row.evidenceIds),
    toolExecutionIds: fromDbJson<string[]>(row.toolExecutionIds),
    error: row.error,
    metadata: fromDbJson<Record<string, string>>(row.metadata),
  };
}

export function toCoreApproval(row: PrismaAgentApproval): Approval {
  return {
    approvalId: row.id,
    taskId: row.taskId,
    attemptId: row.attemptId,
    toolName: row.toolName,
    inputHash: row.inputHash,
    issuedAt: row.issuedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    approvedBy: row.approvedBy,
    usedAt: row.usedAt ? row.usedAt.toISOString() : null,
    status: row.status as ApprovalStatus,
    consumedBy: row.consumedBy,
  };
}

export function toCoreEvent(row: PrismaTaskEvent): PersistedTaskEvent {
  return {
    id: row.id,
    taskId: row.taskId,
    attemptId: row.attemptId,
    seq: row.seq,
    eventType: row.eventType as TaskEventType,
    previousStatus: row.previousStatus as TaskStatus,
    newStatus: row.newStatus as TaskStatus,
    actor: row.actor,
    metadata: row.metadata === null ? null : fromDbJson<Record<string, unknown>>(row.metadata),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Persisted event view — core TaskEvent is the transition *command*; this is the audit record. */
export interface PersistedTaskEvent {
  readonly id: string;
  readonly taskId: string;
  readonly attemptId: string | null;
  readonly seq: number;
  readonly eventType: TaskEventType;
  readonly previousStatus: TaskStatus;
  readonly newStatus: TaskStatus;
  readonly actor: string;
  readonly metadata: Record<string, unknown> | null;
  readonly createdAt: string;
}

// ─── Core → Row (create payloads) ───────────────────────────────────────

export function taskCreateData(task: AgentTask): {
  id: string;
  instruction: string;
  intentType: string;
  channel: string;
  createdBy: string;
  status: string;
  attemptCount: number;
  currentAttemptId: string | null;
  resolvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    id: task.id,
    instruction: task.instruction,
    intentType: task.intentType,
    channel: task.channel,
    createdBy: task.createdBy,
    status: task.status,
    attemptCount: task.attemptCount,
    currentAttemptId: task.currentAttemptId,
    resolvedBy: task.resolvedBy ?? null,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
  };
}
