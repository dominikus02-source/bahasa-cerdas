/**
 * BC Agent P2 — durable task service (Prisma/PostgreSQL adapter around the
 * pure P1 core).
 *
 * Architecture rule (P0/P1): P1 core stays pure. This module is the only
 * place where core state meets durability. Every write that matters is
 * transactional:
 *
 *   claimTask       → tx: row-lock claim + attempt insert + CLAIM event
 *   transitionTask  → tx: core transition + guarded update + audit event
 *   retryTask       → tx: FAILED check + fresh blank-slate attempt + RETRY event
 *   consumeApproval → tx: row-lock + pure P1 validation + conditional consume
 *
 * Claim eligibility rule: only PENDING tasks are claimable. A task returned
 * to work from WAITING_INTELLIGENCE/VERIFYING goes through explicit service
 * transitions, never through claimTask. FAILED tasks are only re-entered via
 * retryTask. WAITING_APPROVAL / COMPLETED / CANCELLED are never claimable.
 *
 * All time comes from an injected `now()` — deterministic in tests, real in
 * production. Prisma errors with domain meaning are mapped to typed
 * AgentErrors; the original error is preserved as `cause`.
 */

import { Prisma, type PrismaClient } from "@prisma/client";

import type { AgentTask, TaskEvent as TaskTransitionEvent, TaskStatus } from "../core/types";
import { createTask as coreCreateTask, transitionTask as coreTransitionTask } from "../core/task";
import {
  createRetryAttempt as coreCreateRetryAttempt,
  finishAttempt as coreFinishAttempt,
  type TaskAttempt,
} from "../core/attempt";
import { validateApproval, consumeApproval, type Approval } from "../core/approval";
import { InvalidTaskTransitionError, InvalidTaskError } from "../core/errors";
import {
  AgentNotFoundError,
  AgentConflictError,
  AgentClaimConflictError,
  AgentConcurrentModificationError,
} from "./errors";
import {
  toCoreApproval,
  toCoreAttempt,
  toCoreEvent,
  toCoreTask,
  taskCreateData,
  type PersistedTaskEvent,
} from "./mappers";
import { toDbJson } from "./json";

/** Operations eligible for atomic claiming (see module docstring). */
export const CLAIMABLE_STATUSES: readonly TaskStatus[] = ["PENDING"];

/** Attempts with no heartbeat for longer than this are stale (P5 recovery decides reclaim vs fail). */
export const STALE_ATTEMPT_THRESHOLD_MS = 15 * 60 * 1000;

// ─── Service ────────────────────────────────────────────────────────────

export class AgentTaskService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly newId: () => string
  ) {}

  // ── Task creation ─────────────────────────────────────────────────

  /** Create a durable task from founder intent. Idempotent on `id`. */
  async createTask(input: {
    id: string;
    instruction: string;
    intentType: AgentTask["intentType"];
    channel: AgentTask["channel"];
    createdBy: string;
  }): Promise<AgentTask> {
    const nowIso = this.now();
    const coreTask = coreCreateTask({ ...input, createdAt: nowIso });
    const row = await this.prisma.agentTask.upsert({
      where: { id: coreTask.id },
      create: taskCreateData(coreTask),
      update: {}, // idempotent: an existing task is returned untouched
    });
    return toCoreTask(row);
  }

  async getTask(taskId: string): Promise<AgentTask> {
    const row = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
    if (!row) throw new AgentNotFoundError("task", taskId);
    return toCoreTask(row);
  }

  async listTasks(status?: TaskStatus): Promise<AgentTask[]> {
    const rows = await this.prisma.agentTask.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map(toCoreTask);
  }

  // ── Atomic claim (PENDING → RUNNING + first attempt) ──────────────

  /**
   * Claim a PENDING task and create its first attempt — atomically.
   * Concurrency proof: the SELECT takes a row lock with a status re-check;
   * only one concurrent transaction can observe PENDING, flip it to
   * RUNNING, and commit. Losers block on the lock, then see a non-PENDING
   * row and receive AgentClaimConflictError.
   */
  async claimTask(taskId: string, workerId: string): Promise<{ task: AgentTask; attempt: TaskAttempt }> {
    const nowIso = this.now();
    const attemptId = this.newId();
    return this.tx("claim", async (c) => {
      const locked = await c.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "AgentTask"
        WHERE "id" = ${taskId} AND "status" = 'PENDING'
        FOR UPDATE`;

      if (locked.length === 0) {
        const current = await c.agentTask.findUnique({ where: { id: taskId }, select: { status: true } });
        throw new AgentClaimConflictError(taskId, current?.status ?? "MISSING");
      }

      const attemptRow = await c.taskAttempt.create({
        data: {
          id: attemptId,
          taskId,
          sequence: 1, // PENDING ⇒ zero prior attempts (retry re-enters as RUNNING, never PENDING)
          status: "ACTIVE",
          startedAt: new Date(nowIso),
          metadata: toDbJson({ workerId }),
        },
      });

      await c.agentTask.update({
        where: { id: taskId },
        data: { status: "RUNNING", currentAttemptId: attemptId, attemptCount: { increment: 1 }, updatedAt: new Date(nowIso) },
      });

      await c.taskEvent.create({
        data: {
          taskId,
          attemptId,
          seq: 1,
          eventType: "CLAIM",
          previousStatus: "PENDING",
          newStatus: "RUNNING",
          actor: workerId,
        },
      });

      const row = await c.agentTask.findUniqueOrThrow({ where: { id: taskId } });
      return { task: toCoreTask(row), attempt: toCoreAttempt(attemptRow) };
    });
  }

  // ── Transitions + events (atomic) ─────────────────────────────────

  /**
   * Apply a P1 transition event durably: the pure core validates legality,
   * the UPDATE re-checks the status we transitioned from (optimistic guard
   * — also serializes event sequencing per task), and the audit event is
   * written in the same transaction. State and event can never diverge.
   */
  async transitionTask(
    taskId: string,
    event: TaskTransitionEvent,
    opts?: { actor?: string; attemptId?: string; metadata?: Record<string, unknown> }
  ): Promise<AgentTask> {
    return this.tx("transition", async (c) => {
      const row = await c.agentTask.findUnique({ where: { id: taskId } });
      if (!row) throw new AgentNotFoundError("task", taskId);
      const coreTask = toCoreTask(row);
      const result = coreTransitionTask(coreTask, event, this.now());
      if (!result.ok) throw result.error; // typed InvalidTaskTransitionError

      const updated = await c.agentTask.updateMany({
        where: { id: taskId, status: row.status }, // optimistic guard
        data: {
          status: result.task.status,
          updatedAt: new Date(),
          ...(event.type === "CANCEL" && result.task.resolvedBy ? { resolvedBy: result.task.resolvedBy } : {}),
        },
      });
      if (updated.count === 0) throw new AgentConcurrentModificationError("task", taskId);

      await c.taskEvent.create({
        data: {
          taskId,
          attemptId: opts?.attemptId ?? coreTask.currentAttemptId,
          seq: await nextEventSeq(c, taskId),
          eventType: event.type,
          previousStatus: row.status,
          newStatus: result.task.status,
          actor: opts?.actor ?? "SYSTEM",
          metadata: opts?.metadata ? toDbJson(opts.metadata) : undefined,
        },
      });
      return result.task;
    });
  }

  // ── Retry (fresh attempt, zero stale state) ───────────────────────

  /**
   * Retry a FAILED task: creates a brand-new attempt via the P1 core and
   * flips the task back to RUNNING — atomically. Attempt-scoped state
   * (decisions/verification/evidence/tool outputs/error/metadata) is
   * structurally not inherited: coreCreateRetryAttempt starts blank.
   */
  async retryTask(taskId: string, actor: string): Promise<{ task: AgentTask; attempt: TaskAttempt }> {
    const attemptId = this.newId();
    const nowIso = this.now();
    return this.tx("retry", async (c) => {
      const row = await c.agentTask.findUnique({ where: { id: taskId } });
      if (!row) throw new AgentNotFoundError("task", taskId);
      if (row.status !== "FAILED") {
        throw new InvalidTaskTransitionError(row.status, "RETRY", taskId);
      }

      const prevAttemptRow = await c.taskAttempt.findFirst({
        where: { taskId },
        orderBy: { sequence: "desc" },
      });
      if (!prevAttemptRow) {
        throw new InvalidTaskError(`task ${taskId} has no previous attempt to retry`, { taskId });
      }

      const coreTask = toCoreTask(row);
      const { attempt, task } = coreCreateRetryAttempt({
        id: attemptId,
        task: { ...coreTask, currentAttemptId: null },
        previousAttempt: toCoreAttempt(prevAttemptRow),
        startedAt: nowIso,
      });

      await c.taskAttempt.create({ data: attemptCreateData(attempt, { retriedBy: actor }) });
      const updated = await c.agentTask.updateMany({
        where: { id: taskId, status: "FAILED" }, // optimistic guard
        data: {
          status: "RUNNING",
          attemptCount: task.attemptCount,
          currentAttemptId: attempt.id,
          updatedAt: new Date(nowIso),
        },
      });
      if (updated.count === 0) throw new AgentConcurrentModificationError("task", taskId);

      await c.taskEvent.create({
        data: {
          taskId,
          attemptId: attempt.id,
          seq: await nextEventSeq(c, taskId),
          eventType: "RETRY",
          previousStatus: "FAILED",
          newStatus: "RUNNING",
          actor,
        },
      });
      return { task, attempt };
    });
  }

  // ── Approval persistence + atomic consumption ─────────────────────

  /** Record a founder approval bound to (task, attempt, tool, inputHash). */
  async createApproval(input: {
    approvalId: string;
    taskId: string;
    attemptId: string;
    toolName: string;
    inputHash: string;
    expiresAt: string;
    approvedBy: string;
  }): Promise<Approval> {
    const nowIso = this.now();
    if (input.expiresAt <= nowIso) {
      throw new InvalidTaskError("approval expiresAt must be in the future", { expiresAt: input.expiresAt });
    }
    // Binding integrity: the attempt must exist and belong to the task.
    const attempt = await this.prisma.taskAttempt.findUnique({ where: { id: input.attemptId } });
    if (!attempt || attempt.taskId !== input.taskId) {
      throw new InvalidTaskError(`attempt ${input.attemptId} does not belong to task ${input.taskId}`);
    }
    const row = await this.prisma.agentApproval.create({
      data: {
        id: input.approvalId,
        taskId: input.taskId,
        attemptId: input.attemptId,
        toolName: input.toolName,
        inputHash: input.inputHash,
        status: "PENDING",
        issuedAt: new Date(nowIso),
        expiresAt: new Date(input.expiresAt),
        approvedBy: input.approvedBy,
      },
    });
    return toCoreApproval(row);
  }

  /**
   * Atomic validate-and-consume — closes P1's identified race:
   * 1. row-lock candidate approvals FOR UPDATE (status = PENDING)
   * 2. run the pure P1 validation against the locked row (binding + expiry)
   * 3. consume via conditional UPDATE (status still PENDING)
   *
   * Two concurrent consumers serialize on the row lock; the second observes
   * CONSUMED and throws ApprovalConsumedError. Expiry is evaluated against
   * the transaction's `now()` — one consistent time source per consume.
   */
  async consumeApproval(
    expected: { taskId: string; attemptId: string; toolName: string; inputHash: string },
    executionId: string
  ): Promise<Approval> {
    return this.tx("consumeApproval", async (c) => {
      const locked = await c.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "AgentApproval"
        WHERE "taskId" = ${expected.taskId}
          AND "attemptId" = ${expected.attemptId}
          AND "toolName" = ${expected.toolName}
          AND "inputHash" = ${expected.inputHash}
          AND "status" = 'PENDING'
        ORDER BY "issuedAt" ASC
        FOR UPDATE`;

      if (locked.length === 0) {
        // Distinguish "no such binding" from "binding exists but not consumable"
        // so callers get the precise typed error.
        const any = await c.agentApproval.findFirst({
          where: {
            taskId: expected.taskId,
            attemptId: expected.attemptId,
            toolName: expected.toolName,
            inputHash: expected.inputHash,
          },
        });
        if (!any) throw new AgentNotFoundError("approval", `${expected.taskId}/${expected.toolName}`);
        const core = toCoreApproval(any);
        const check = validateApproval(core, expected, this.now());
        if (!check.ok) throw check.error; // CONSUMED / EXPIRED / mismatch — typed
        throw new AgentConflictError("approval", "exists but is not consumable");
      }

      const row = await c.agentApproval.findUniqueOrThrow({ where: { id: locked[0].id } });
      const core = toCoreApproval(row);
      const nowIso = this.now();
      const check = validateApproval(core, expected, nowIso);
      if (!check.ok) throw check.error; // expiry / binding — typed

      const consumed = consumeApproval(core, nowIso, executionId); // pure, typed on bad status
      const updated = await c.agentApproval.updateMany({
        where: { id: row.id, status: "PENDING" },
        data: { status: "CONSUMED", usedAt: new Date(nowIso), consumedBy: executionId },
      });
      if (updated.count === 0) throw new AgentConflictError("approval", "consumed concurrently");
      return consumed;
    });
  }

  async getApproval(approvalId: string): Promise<Approval> {
    const row = await this.prisma.agentApproval.findUnique({ where: { id: approvalId } });
    if (!row) throw new AgentNotFoundError("approval", approvalId);
    return toCoreApproval(row);
  }

  // ── Attempt lifecycle ─────────────────────────────────────────────

  /** Finish the active attempt (COMPLETED/FAILED/CANCELLED). Task-level status is a separate transition. */
  async finishAttempt(
    attemptId: string,
    status: "COMPLETED" | "FAILED" | "CANCELLED",
    error?: string
  ): Promise<TaskAttempt> {
    return this.tx("finishAttempt", async (c) => {
      const row = await c.taskAttempt.findUnique({ where: { id: attemptId } });
      if (!row) throw new AgentNotFoundError("attempt", attemptId);
      const core = toCoreAttempt(row);
      const finished = coreFinishAttempt(core, status, this.now(), error);
      const updated = await c.taskAttempt.updateMany({
        where: { id: attemptId, status: "ACTIVE" },
        data: {
          status: finished.status,
          finishedAt: finished.finishedAt ? new Date(finished.finishedAt) : null,
          error: finished.error,
        },
      });
      if (updated.count === 0) throw new AgentConcurrentModificationError("attempt", attemptId);
      return finished;
    });
  }

  /** Immutably append a policy decision to the attempt's decision log. */
  async recordDecision(
    attemptId: string,
    decision: { toolName: string; outcome: "ALLOWED" | "DENIED" | "APPROVAL_REQUIRED"; at: string }
  ): Promise<void> {
    const row = await this.prisma.taskAttempt.findUnique({ where: { id: attemptId } });
    if (!row) throw new AgentNotFoundError("attempt", attemptId);
    const core = toCoreAttempt(row);
    await this.prisma.taskAttempt.update({
      where: { id: attemptId },
      data: { decisions: toDbJson([...core.decisions, decision]) },
    });
  }

  // ── Crash-recovery primitives ─────────────────────────────────────

  /** Worker liveness: refresh the attempt heartbeat. */
  async heartbeat(attemptId: string): Promise<void> {
    await this.prisma.taskAttempt.updateMany({
      where: { id: attemptId, status: "ACTIVE" },
      data: { heartbeatAt: new Date() },
    });
  }

  /**
   * Detect stale RUNNING work: ACTIVE attempts whose heartbeat is older
   * than the threshold. P5's recovery loop decides reclaim vs fail; P2
   * only surfaces the facts (RECOVERY is an audit event, not a transition).
   */
  async findStaleActiveAttempts(): Promise<
    Array<{ attemptId: string; taskId: string; startedAt: string; lastHeartbeatAt: string }>
  > {
    const cutoff = new Date(new Date(this.now()).getTime() - STALE_ATTEMPT_THRESHOLD_MS);
    const rows = await this.prisma.taskAttempt.findMany({
      where: { status: "ACTIVE", heartbeatAt: { lt: cutoff } },
      select: { id: true, taskId: true, startedAt: true, heartbeatAt: true },
    });
    return rows.map((r) => ({
      attemptId: r.id,
      taskId: r.taskId,
      startedAt: r.startedAt.toISOString(),
      lastHeartbeatAt: r.heartbeatAt.toISOString(),
    }));
  }

  // ── Reads ─────────────────────────────────────────────────────────

  async listEvents(taskId: string): Promise<PersistedTaskEvent[]> {
    const rows = await this.prisma.taskEvent.findMany({ where: { taskId }, orderBy: { seq: "asc" } });
    return rows.map(toCoreEvent);
  }

  async listApprovals(taskId: string): Promise<Approval[]> {
    const rows = await this.prisma.agentApproval.findMany({
      where: { taskId },
      orderBy: { issuedAt: "asc" },
    });
    return rows.map(toCoreApproval);
  }

  async listAttempts(taskId: string): Promise<TaskAttempt[]> {
    const rows = await this.prisma.taskAttempt.findMany({ where: { taskId }, orderBy: { sequence: "asc" } });
    return rows.map(toCoreAttempt);
  }

  // Internal ───────────────────────────────────────────────────────────

  /**
   * Run a transaction with P2002 (unique violation) mapped to a typed
   * conflict. All other domain errors propagate untouched.
   */
  private tx<T>(op: string, fn: (c: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn).catch((err: unknown) => {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new AgentConflictError(op, "unique constraint violation", err);
      }
      throw err;
    });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

async function nextEventSeq(c: Prisma.TransactionClient, taskId: string): Promise<number> {
  const last = await c.taskEvent.findFirst({
    where: { taskId },
    orderBy: { seq: "desc" },
    select: { seq: true },
  });
  return (last?.seq ?? 0) + 1;
}

function attemptCreateData(attempt: TaskAttempt, extraMetadata: Record<string, unknown>) {
  return {
    id: attempt.id,
    taskId: attempt.taskId,
    sequence: attempt.sequence,
    status: attempt.status,
    startedAt: new Date(attempt.startedAt),
    finishedAt: attempt.finishedAt ? new Date(attempt.finishedAt) : null,
    error: attempt.error,
    plan: toDbJson(attempt.plan),
    decisions: toDbJson(attempt.decisions),
    verification: toDbJson(attempt.verification),
    evidenceIds: toDbJson(attempt.evidenceIds),
    toolExecutionIds: toDbJson(attempt.toolExecutionIds),
    metadata: toDbJson({ ...attempt.metadata, ...extraMetadata }),
  };
}
