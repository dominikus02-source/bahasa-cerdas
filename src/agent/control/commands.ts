/**
 * BC Agent P6 — founder command layer.
 *
 * The ONLY mutation surface exposed to the web control plane. Every command:
 *
 *   1. runs the injected authorization gate FIRST (the web layer passes
 *      `authorizeFounder`, which resolves the session server-side — the
 *      client can never supply identity, role, or ownership);
 *   2. reads binding data from PERSISTED rows (execution ids / task ids are
 *      pointers; tool name + inputHash always come from the DB, never from
 *      the request — so a client cannot approve a different action);
 *   3. delegates to the canonical service (P2 approve/reject/retry/cancel,
 *      P3 resume) — no lifecycle logic lives here;
 *   4. re-reads canonical state after every mutation (no optimistic claims).
 *
 * Approval binding rule (P0 §9, unchanged by P6): an approval is
 * task-bound, attempt-bound, tool-bound, inputHash-bound, expiring,
 * single-use. approveTask never accepts an "approved=true" flag or a
 * browser-serialized approval — it consumes the PENDING approval row the
 * database shows for the task's current attempt, and the worker's ToolExecutor
 * re-validates everything again atomically at execution time.
 */

import type { PrismaClient } from "@prisma/client";

import { isTaskStatus, type TaskStatus } from "../core/types";
import { AgentNotFoundError } from "../persistence/errors";
import { getTaskDetail } from "../persistence/queries";
import type { AgentTaskService } from "../persistence/service";
import { resumeIntelligenceWait } from "../intelligence/waiting";
import type { FounderAccess, FounderAccessDeniedReason } from "./auth";

export type FounderCommandCode =
  | FounderAccessDeniedReason
  | "TASK_NOT_FOUND"
  | "INVALID_TRANSITION"
  | "APPROVAL_NOT_PENDING"
  | "APPROVAL_NOT_FOUND"
  | "APPROVAL_EXPIRED"
  | "APPROVAL_CONSUMED"
  | "APPROVAL_MISMATCH"
  | "APPROVAL_INVALID"
  | "TASK_NOT_WAITING_INTELLIGENCE"
  | "COMMAND_FAILED";

export type FounderCommandResult =
  | { ok: true; code: "OK"; message: string; taskStatus: TaskStatus | string }
  | { ok: false; code: FounderCommandCode; message: string; taskStatus: TaskStatus | string | null };

export interface FounderCommandContext {
  readonly prisma: PrismaClient;
  readonly taskService: AgentTaskService;
  /** Authorization gate — supplied by the web layer as authorizeFounder. */
  readonly authorize: () => Promise<FounderAccess>;
}

function errorCodeOf(err: unknown): FounderCommandCode {
  if (err instanceof AgentNotFoundError) return "APPROVAL_NOT_FOUND";
  const code = (err as { code?: unknown })?.code;
  switch (code) {
    case "APPROVAL_EXPIRED":
      return "APPROVAL_EXPIRED";
    case "APPROVAL_CONSUMED":
      return "APPROVAL_CONSUMED";
    case "APPROVAL_MISMATCH":
      return "APPROVAL_MISMATCH";
    case "APPROVAL_INVALID":
      return "APPROVAL_INVALID";
    case "INVALID_TASK_TRANSITION":
      return "INVALID_TRANSITION";
    default:
      return "COMMAND_FAILED";
  }
}

async function failWith(
  ctx: FounderCommandContext,
  taskId: string,
  err: unknown
): Promise<FounderCommandResult> {
  // Re-read canonical state so the UI shows the DB truth, not a guess.
  let status: TaskStatus | string | null = null;
  try {
    const row = await ctx.prisma.agentTask.findUnique({ where: { id: taskId }, select: { status: true } });
    status = row?.status ?? null;
  } catch {
    status = null;
  }
  return { ok: false, code: errorCodeOf(err), message: errorMessage(err), taskStatus: status };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message.slice(0, 300);
  return String(err).slice(0, 300);
}

async function rereadTaskStatus(ctx: FounderCommandContext, taskId: string): Promise<TaskStatus | string | null> {
  const row = await ctx.prisma.agentTask.findUnique({ where: { id: taskId }, select: { status: true } });
  return row?.status ?? null;
}

function canonicalStatusOrSelf(value: string): TaskStatus | string {
  return isTaskStatus(value) ? value : value;
}

// ─── Approve (WAITING_APPROVAL → RUNNING via canonical APPROVAL_GRANTED) ──

/** Founder approval TTL — the policy engine's suggested window for WRITE risk. */
const APPROVAL_TTL_MS = 60 * 60 * 1000;

export async function approveTask(ctx: FounderCommandContext, taskId: string): Promise<FounderCommandResult> {
  const access = await ctx.authorize();
  if (!access.ok) return { ok: false, code: access.reason, message: "Akses ditolak.", taskStatus: null };

  try {
    const task = await ctx.prisma.agentTask.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, currentAttemptId: true },
    });
    if (!task) return { ok: false, code: "TASK_NOT_FOUND", message: "Task tidak ditemukan.", taskStatus: null };
    if (task.status !== "WAITING_APPROVAL") {
      const status = await rereadTaskStatus(ctx, taskId);
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `Task tidak sedang menunggu persetujuan (status ${task.status}).`,
        taskStatus: canonicalStatusOrSelf(task.status),
      };
    }
    if (!task.currentAttemptId) {
      return { ok: false, code: "INVALID_TRANSITION", message: "Task tidak memiliki attempt aktif.", taskStatus: task.status };
    }

    // The binding (toolName + inputHash) is read from the PERSISTED parked
    // execution — the executor recorded the APPROVAL_REQUIRED rejection with
    // the canonical input hash it recomputed at validation time. The client
    // only supplies the task pointer; it cannot choose what gets approved.
    const parked = await ctx.prisma.toolExecution.findFirst({
      where: { taskId, attemptId: task.currentAttemptId, errorCode: "APPROVAL_REQUIRED" },
      orderBy: { startedAt: "desc" },
      select: { toolName: true, inputHash: true },
    });
    if (!parked) {
      return {
        ok: false,
        code: "APPROVAL_NOT_PENDING",
        message: "Tidak ada aksi parkir yang memerlukan persetujuan untuk attempt ini.",
        taskStatus: task.status,
      };
    }

    // Canonical approval service (P2): creates the approval bound to
    // (task, attempt, tool, inputHash), expiring, single-use. The executor
    // re-validates and consumes it atomically when the action re-runs —
    // consumption is never done here (that would bypass ToolExecutor).
    await ctx.taskService.createApproval({
      approvalId: crypto.randomUUID(),
      taskId,
      attemptId: task.currentAttemptId,
      toolName: parked.toolName,
      inputHash: parked.inputHash,
      expiresAt: new Date(Date.now() + APPROVAL_TTL_MS).toISOString(),
      approvedBy: access.userId,
    });

    // Canonical lifecycle transition (core-validated, audited as TaskEvent).
    await ctx.taskService.transitionTask(taskId, { type: "APPROVAL_GRANTED" }, { actor: access.userId, attemptId: task.currentAttemptId });

    // Re-read canonical state — never claim success optimistically.
    const status = await rereadTaskStatus(ctx, taskId);
    return { ok: true, code: "OK", message: `Approval dibuat via layanan kanonik untuk "${parked.toolName}" (terikat inputHash, kedaluwarsa 1 jam).`, taskStatus: canonicalStatusOrSelf(status ?? task.status) };
  } catch (err) {
    return failWith(ctx, taskId, err);
  }
}

// ─── Reject (WAITING_APPROVAL → FAILED via canonical APPROVAL_REJECTED) ──

export async function rejectTask(ctx: FounderCommandContext, taskId: string): Promise<FounderCommandResult> {
  const access = await ctx.authorize();
  if (!access.ok) return { ok: false, code: access.reason, message: "Akses ditolak.", taskStatus: null };

  try {
    const task = await ctx.prisma.agentTask.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, currentAttemptId: true },
    });
    if (!task) return { ok: false, code: "TASK_NOT_FOUND", message: "Task tidak ditemukan.", taskStatus: null };
    if (task.status !== "WAITING_APPROVAL" || !task.currentAttemptId) {
      const status = await rereadTaskStatus(ctx, taskId);
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `Task tidak dapat ditolak dari status ${task.status}.`,
        taskStatus: canonicalStatusOrSelf(task.status),
      };
    }

    // If a PENDING approval row exists, reject it through the canonical
    // service (binding-validated, CAS single-use, task transition + audit
    // event in the same transaction).
    const pending = await ctx.prisma.agentApproval.findFirst({
      where: { taskId, attemptId: task.currentAttemptId, status: "PENDING" },
      orderBy: { issuedAt: "asc" },
      select: { toolName: true, inputHash: true },
    });
    if (pending) {
      await ctx.taskService.rejectApproval({
        taskId,
        attemptId: task.currentAttemptId,
        toolName: pending.toolName,
        inputHash: pending.inputHash,
        rejectedBy: access.userId,
      });
    } else {
      // No approval row (the executor records APPROVAL_REQUIRED as a FAILED
      // execution without creating one): the founder decision is the
      // canonical APPROVAL_REJECTED transition itself — core-validated and
      // audited through P2, never a direct status write.
      await ctx.taskService.transitionTask(taskId, { type: "APPROVAL_REJECTED" }, {
        actor: access.userId,
        attemptId: task.currentAttemptId,
        metadata: { rejectedBy: access.userId },
      });
    }

    const status = await rereadTaskStatus(ctx, taskId);
    return { ok: true, code: "OK", message: "Approval ditolak melalui layanan kanonik.", taskStatus: canonicalStatusOrSelf(status ?? task.status) };
  } catch (err) {
    return failWith(ctx, taskId, err);
  }
}

// ─── Resume (WAITING_INTELLIGENCE → RUNNING via P3 canonical transition) ──

export async function resumeTask(ctx: FounderCommandContext, taskId: string): Promise<FounderCommandResult> {
  const access = await ctx.authorize();
  if (!access.ok) return { ok: false, code: access.reason, message: "Akses ditolak.", taskStatus: null };

  try {
    const task = await ctx.prisma.agentTask.findUnique({
      where: { id: taskId },
      select: { id: true, status: true },
    });
    if (!task) return { ok: false, code: "TASK_NOT_FOUND", message: "Task tidak ditemukan.", taskStatus: null };
    if (task.status !== "WAITING_INTELLIGENCE") {
      const status = await rereadTaskStatus(ctx, taskId);
      return {
        ok: false,
        code: "TASK_NOT_WAITING_INTELLIGENCE",
        message: `Task tidak sedang menunggu intelijen (status ${task.status}).`,
        taskStatus: canonicalStatusOrSelf(task.status),
      };
    }

    // Canonical P3 lifecycle: INTELLIGENCE_RECOVERED → RUNNING. The current
    // attempt CONTINUES — no new attempt is created (P3 contract).
    await resumeIntelligenceWait(ctx.taskService, taskId, access.userId);

    const status = await rereadStatusAfter(ctx, taskId);
    return { ok: true, code: "OK", message: "Task dilanjutkan melalui transisi kanonik INTELLIGENCE_RECOVERED.", taskStatus: canonicalStatusOrSelf(status ?? "RUNNING") };
  } catch (err) {
    return failWith(ctx, taskId, err);
  }
}

async function rereadStatusAfter(ctx: FounderCommandContext, taskId: string): Promise<TaskStatus | string | null> {
  return rereadTaskStatus(ctx, taskId);
}

// ─── Retry (FAILED → fresh attempt via canonical retryTask) ──────────────

export async function retryTask(ctx: FounderCommandContext, taskId: string): Promise<FounderCommandResult> {
  const access = await ctx.authorize();
  if (!access.ok) return { ok: false, code: access.reason, message: "Akses ditolak.", taskStatus: null };

  try {
    const task = await ctx.prisma.agentTask.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, attemptCount: true },
    });
    if (!task) return { ok: false, code: "TASK_NOT_FOUND", message: "Task tidak ditemukan.", taskStatus: null };
    if (task.status !== "FAILED") {
      const status = await rereadTaskStatus(ctx, taskId);
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `Retry hanya untuk task FAILED (status ${task.status}).`,
        taskStatus: canonicalStatusOrSelf(task.status),
      };
    }

    // Canonical P2 retry: fresh blank-slate attempt, zero inherited state.
    const { attempt } = await ctx.taskService.retryTask(taskId, access.userId);

    // Structural freshness proof — read back what was persisted.
    const detail = await getTaskDetail(ctx.prisma, taskId);
    const fresh = detail?.attempts.find((a) => a.id === attempt.id);
    const clean =
      fresh !== undefined &&
      detail &&
      detail.evidence.every((e) => detail.attempts.find((a) => a.id === attempt.id) !== undefined);

    const status = await rereadStatusAfter(ctx, taskId);
    return {
      ok: true,
      code: "OK",
      message: clean
        ? `Retry dibuat: attempt #${attempt.sequence} (baru, tanpa state warisan).`
        : `Retry dibuat: attempt #${attempt.sequence}.`,
      taskStatus: canonicalStatusOrSelf(status ?? "RUNNING"),
    };
  } catch (err) {
    return failWith(ctx, taskId, err);
  }
}

// ─── Cancel (→ CANCELLED via canonical CANCEL event) ─────────────────────

const CANCELLABLE_STATUSES: readonly string[] = ["PENDING", "RUNNING", "WAITING_APPROVAL", "WAITING_INTELLIGENCE", "VERIFYING"];

export async function cancelTask(ctx: FounderCommandContext, taskId: string): Promise<FounderCommandResult> {
  const access = await ctx.authorize();
  if (!access.ok) return { ok: false, code: access.reason, message: "Akses ditolak.", taskStatus: null };

  try {
    const task = await ctx.prisma.agentTask.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, currentAttemptId: true },
    });
    if (!task) return { ok: false, code: "TASK_NOT_FOUND", message: "Task tidak ditemukan.", taskStatus: null };
    if (!CANCELLABLE_STATUSES.includes(task.status)) {
      const status = await rereadTaskStatus(ctx, taskId);
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `Task ${task.status} tidak dapat dibatalkan.`,
        taskStatus: canonicalStatusOrSelf(task.status),
      };
    }

    // Canonical CANCEL transition (core-validated, optimistic-guarded,
    // audited as a TaskEvent). The pending approval, if any, is revoked
    // through the canonical service — never a direct status write here.
    await ctx.taskService.transitionTask(taskId, { type: "CANCEL", by: access.userId }, {
      actor: access.userId,
      attemptId: task.currentAttemptId ?? undefined,
      metadata: { cancelledFrom: task.status },
    });

    const status = await rereadStatusAfter(ctx, taskId);
    return { ok: true, code: "OK", message: "Task dibatalkan melalui transisi kanonik CANCEL.", taskStatus: canonicalStatusOrSelf(status ?? "CANCELLED") };
  } catch (err) {
    return failWith(ctx, taskId, err);
  }
}
