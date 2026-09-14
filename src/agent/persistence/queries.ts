/**
 * BC Agent P6 — canonical read boundary for the Founder Control Center.
 *
 * ROLE: this module is the ONLY place the web control plane reads Agent
 * tables. It is a READ MODEL — every fact it returns is a persisted row,
 * converted to serializable DTOs (Dates → ISO strings). It contains zero
 * lifecycle logic: mutations stay in AgentTaskService (P2), the worker (P5),
 * and resumeIntelligenceWait (P3).
 *
 * Boundedness: every list query has a hard take-limit (pagination is
 * bounded and cursor-anchored by createdAt+id, never offset-scan). The DB
 * remains the source of truth; the control center never caches state.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

import { hashCanonicalInput } from "../core/hash";
import type { TaskStatus, TaskIntentType } from "../core/types";
import { TASK_STATUSES, isTaskStatus } from "../core/types";
import type { WorkerHealth } from "../worker/loop";

export const P6_MAX_PAGE_SIZE = 100;
export const P6_DEFAULT_PAGE_SIZE = 25;

// ─── DTOs (serializable — no Dates cross the server/client boundary) ────

export interface AgentTaskListItem {
  readonly id: string;
  readonly instruction: string;
  readonly instructionPreview: string;
  readonly intentType: TaskIntentType | string;
  readonly channel: string;
  readonly createdBy: string;
  readonly status: TaskStatus | string;
  readonly attemptCount: number;
  readonly currentAttemptId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Worker that owns the current attempt's lease, if persisted. */
  readonly leaseWorkerId: string | null;
  /** Most recent event summary, when present. */
  readonly lastEvent: {
    readonly eventType: string;
    readonly newStatus: string;
    readonly actor: string;
    readonly createdAt: string;
  } | null;
  /** Persisted terminal-attempt error, when present. */
  readonly lastError: string | null;
}

export interface AgentTaskListPage {
  readonly tasks: readonly AgentTaskListItem[];
  readonly cursor: string | null; // opaque: `createdAt|id` of the last row
  readonly pageSize: number;
  readonly hasMore: boolean;
}

export interface AgentApprovalView {
  readonly approvalId: string;
  readonly taskId: string;
  readonly attemptId: string;
  readonly toolName: string;
  /** Bounded operational summary of the input that would run. */
  readonly inputSummary: string | null;
  readonly inputHash: string;
  readonly status: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly usedAt: string | null;
}

export interface AgentAttemptView {
  readonly id: string;
  readonly taskId: string;
  readonly sequence: number;
  readonly status: string;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly error: string | null;
  readonly actionsProposed: number;
  readonly workerId: string | null;
}

export interface AgentEventView {
  readonly seq: number;
  readonly eventType: string;
  readonly previousStatus: string;
  readonly newStatus: string;
  readonly actor: string;
  readonly createdAt: string;
}

export interface AgentExecutionView {
  readonly executionId: string;
  readonly toolName: string;
  readonly status: string;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly durationMs: number | null;
  readonly errorCode: string | null;
  readonly outputMeta: Record<string, unknown> | null;
}

export interface AgentEvidenceView {
  readonly evidenceId: string;
  readonly kind: string; // FACT | OBSERVATION | INFERENCE | RECOMMENDATION | UNKNOWN
  readonly claim: string;
  readonly source: string;
  readonly confidence: string;
  readonly executionId: string | null;
  readonly createdAt: string;
}

export interface AgentTaskDetailView {
  readonly task: Omit<AgentTaskListItem, "lastEvent" | "lastError">;
  readonly attempts: readonly AgentAttemptView[];
  readonly events: readonly AgentEventView[];
  readonly approvals: readonly AgentApprovalView[];
  readonly executions: readonly AgentExecutionView[];
  readonly evidence: readonly AgentEvidenceView[];
  /** From the current attempt's persisted verification JSON, when present. */
  readonly verification: {
    readonly status: string;
    readonly strategy?: string;
    readonly summary?: string;
  } | null;
}

// ─── List: bounded, cursor-paginated, newest-first ──────────────────────

export interface ListAgentTasksInput {
  readonly status?: string;
  readonly intentType?: string;
  readonly pageSize?: number;
  /** Opaque cursor from a previous page (last row's `createdAt|id`). */
  readonly cursor?: string;
}

function parseCursor(cursor: string): { createdAt: Date; id: string } | null {
  const sep = cursor.lastIndexOf("|");
  if (sep <= 0) return null;
  const createdAtMs = Number(cursor.slice(0, sep));
  const id = cursor.slice(sep + 1);
  if (!Number.isFinite(createdAtMs) || !id) return null;
  const d = new Date(createdAtMs);
  return Number.isNaN(d.getTime()) ? null : { createdAt: d, id };
}

function clampPageSize(pageSize?: number): number {
  if (!pageSize || !Number.isFinite(pageSize) || pageSize < 1) return P6_DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(pageSize), P6_MAX_PAGE_SIZE);
}

const INSTRUCTION_PREVIEW_CHARS = 140;

function preview(instruction: string): string {
  return instruction.length <= INSTRUCTION_PREVIEW_CHARS
    ? instruction
    : `${instruction.slice(0, INSTRUCTION_PREVIEW_CHARS)}…`;
}

export function validStatusFilter(status: string | undefined | null): TaskStatus | undefined {
  return status && isTaskStatus(status) ? status : undefined;
}

/** Valid TaskStatus values for the UI filter (canonical Final-8 only). */
export const CANONICAL_TASK_STATUSES = TASK_STATUSES;

export async function listAgentTasks(
  prisma: PrismaClient,
  input: ListAgentTasksInput
): Promise<AgentTaskListPage> {
  const status = validStatusFilter(input.status);
  const intentType = input.intentType?.trim();
  const pageSize = clampPageSize(input.pageSize);
  const cursor = input.cursor ? parseCursor(input.cursor) : null;

  // Cursor rule: strictly older than the cursor row (createdAt desc tiebreak
  // by id asc). A missing cursor row means the cursor is stale — start over.
  let createdAtLt: Date | undefined;
  if (cursor) {
    const anchor = await prisma.agentTask.findUnique({
      where: { id: cursor.id },
      select: { createdAt: true },
    });
    if (!anchor || anchor.createdAt.getTime() !== cursor.createdAt.getTime()) return { tasks: [], cursor: null, pageSize, hasMore: false };
    createdAtLt = anchor.createdAt;
  }

  const where: Prisma.AgentTaskWhereInput = {
    ...(status ? { status } : {}),
    ...(intentType ? { intentType } : {}),
    ...(createdAtLt ? { createdAt: { lt: createdAtLt } } : {}),
  };

  // take: pageSize+1 to cheaply detect hasMore without a count scan.
  const rows = await prisma.agentTask.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: pageSize + 1,
    select: {
      id: true,
      instruction: true,
      intentType: true,
      channel: true,
      createdBy: true,
      status: true,
      attemptCount: true,
      currentAttemptId: true,
      createdAt: true,
      updatedAt: true,
      attempts: {
        where: { status: "ACTIVE" },
        select: { id: true, metadata: true },
        take: 1,
      },
      events: {
        orderBy: { seq: "desc" },
        take: 1,
        select: { eventType: true, newStatus: true, actor: true, createdAt: true },
      },
    },
  });

  const hasMore = rows.length > pageSize;
  const pageRows = rows.slice(0, pageSize);
  // Terminal-attempt errors are fetched separately to keep the main select flat.
  const errorRows = pageRows.length
    ? await prisma.taskAttempt.findMany({
        where: { taskId: { in: pageRows.map((r) => r.id) }, status: "FAILED" },
        orderBy: { sequence: "desc" },
        select: { taskId: true, error: true, sequence: true },
      })
    : [];
  const lastErrorByTask = new Map<string, string>();
  for (const e of errorRows) {
    const cur = lastErrorByTask.get(e.taskId);
    if (e.error && (cur === undefined || cur.length < e.error.length)) lastErrorByTask.set(e.taskId, e.error);
  }

  const tasks: AgentTaskListItem[] = pageRows.map((r) => {
    const active = r.attempts[0];
    const meta = (active?.metadata ?? null) as Record<string, unknown> | null;
    const lease = meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, unknown>).lease : null;
    const workerId =
      lease && typeof lease === "object" && !Array.isArray(lease) && typeof (lease as Record<string, unknown>).workerId === "string"
        ? ((lease as Record<string, unknown>).workerId as string)
        : null;
    const ev = r.events[0];
    return {
      id: r.id,
      instruction: r.instruction,
      instructionPreview: preview(r.instruction),
      intentType: r.intentType,
      channel: r.channel,
      createdBy: r.createdBy,
      status: r.status,
      attemptCount: r.attemptCount,
      currentAttemptId: r.currentAttemptId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      leaseWorkerId: workerId,
      lastEvent: ev
        ? { eventType: ev.eventType, newStatus: ev.newStatus, actor: ev.actor, createdAt: ev.createdAt.toISOString() }
        : null,
      lastError: lastErrorByTask.get(r.id) ?? null,
    };
  });

  const last = pageRows[pageRows.length - 1];
  return {
    tasks,
    cursor: hasMore && last ? `${last.createdAt.getTime()}|${last.id}` : null,
    pageSize,
    hasMore,
  };
}

// ─── Detail: one task, all related records (each bounded) ───────────────

const MAX_EVENTS = 200;
const MAX_ATTEMPTS = 20;
const MAX_EXECUTIONS = 100;
const MAX_EVIDENCE = 100;
const MAX_APPROVALS = 50;
const APPROVAL_INPUT_SUMMARY_CHARS = 200;

/**
 * Bounded operational summary of the input behind an approval. The proposal
 * is located in the attempt's PERSISTED plan (created by the P5 loop before
 * any execution) and confirmed by recomputing hashCanonicalInput — a plan
 * entry is only used if its hash matches the approval's inputHash. No raw
 * tool output, no secrets, never model text presented as truth.
 */
function buildApprovalInputSummary(
  toolName: string,
  inputHash: string,
  attemptId: string,
  plansByAttempt: ReadonlyMap<string, unknown[]>
): string | null {
  const plan = plansByAttempt.get(attemptId);
  if (!plan) return null;
  for (const action of plan) {
    if (!action || typeof action !== "object" || Array.isArray(action)) continue;
    const rec = action as Record<string, unknown>;
    if (rec.toolName !== toolName) continue;
    try {
      if (hashCanonicalInput(rec.input) !== inputHash) continue;
    } catch {
      continue; // unhashable input (functions etc.) — never summarize by guess
    }
    const json = JSON.stringify(rec.input);
    return json.length <= APPROVAL_INPUT_SUMMARY_CHARS ? json : `${json.slice(0, APPROVAL_INPUT_SUMMARY_CHARS)}…`;
  }
  return null;
}

export async function getTaskDetail(
  prisma: PrismaClient,
  taskId: string
): Promise<AgentTaskDetailView | null> {
  const task = await prisma.agentTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      instruction: true,
      intentType: true,
      channel: true,
      createdBy: true,
      status: true,
      attemptCount: true,
      currentAttemptId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!task) return null;

  const [attempts, events, approvals, executions, evidence] = await Promise.all([
    prisma.taskAttempt.findMany({
      where: { taskId },
      orderBy: { sequence: "asc" },
      take: MAX_ATTEMPTS,
      select: {
        id: true,
        taskId: true,
        sequence: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        error: true,
        plan: true,
        verification: true,
        metadata: true,
      },
    }),
    prisma.taskEvent.findMany({
      where: { taskId },
      orderBy: { seq: "asc" },
      take: MAX_EVENTS,
      select: { seq: true, eventType: true, previousStatus: true, newStatus: true, actor: true, createdAt: true },
    }),
    prisma.agentApproval.findMany({
      where: { taskId },
      orderBy: { issuedAt: "asc" },
      take: MAX_APPROVALS,
      select: {
        id: true,
        taskId: true,
        attemptId: true,
        toolName: true,
        inputHash: true,
        status: true,
        issuedAt: true,
        expiresAt: true,
        usedAt: true,
      },
    }),
    prisma.toolExecution.findMany({
      where: { taskId },
      orderBy: { startedAt: "desc" },
      take: MAX_EXECUTIONS,
      select: {
        id: true,
        toolName: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        durationMs: true,
        errorCode: true,
        outputMeta: true,
      },
    }),
    prisma.toolEvidence.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
      take: MAX_EVIDENCE,
      select: {
        id: true,
        kind: true,
        claim: true,
        source: true,
        confidence: true,
        executionId: true,
        createdAt: true,
      },
    }),
  ]);

  const plansByAttempt = new Map<string, unknown[]>();
  for (const a of attempts) {
    if (Array.isArray(a.plan)) plansByAttempt.set(a.id, a.plan as unknown[]);
  }

  const currentAttempt = attempts.find((a) => a.id === task.currentAttemptId) ?? null;
  const verification = (() => {
    if (!currentAttempt || currentAttempt.verification === null || currentAttempt.verification === undefined) return null;
    const v = currentAttempt.verification as unknown;
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const rec = v as Record<string, unknown>;
    if (typeof rec.status !== "string") return null;
    return {
      status: rec.status,
      ...(typeof rec.strategy === "string" ? { strategy: rec.strategy } : {}),
      ...(typeof rec.summary === "string" ? { summary: rec.summary } : {}),
    };
  })();

  return {
    task: {
      id: task.id,
      instruction: task.instruction,
      instructionPreview: preview(task.instruction),
      intentType: task.intentType,
      channel: task.channel,
      createdBy: task.createdBy,
      status: task.status,
      attemptCount: task.attemptCount,
      currentAttemptId: task.currentAttemptId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      leaseWorkerId: null,
    },
    attempts: attempts.map((a) => {
      const meta = a.metadata as Record<string, unknown> | null;
      const lease = meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, unknown>).lease : null;
      const workerId =
        lease && typeof lease === "object" && !Array.isArray(lease) && typeof (lease as Record<string, unknown>).workerId === "string"
          ? ((lease as Record<string, unknown>).workerId as string)
          : null;
      const plan = Array.isArray(a.plan) ? a.plan : [];
      return {
        id: a.id,
        taskId: a.taskId,
        sequence: a.sequence,
        status: a.status,
        startedAt: a.startedAt.toISOString(),
        finishedAt: a.finishedAt ? a.finishedAt.toISOString() : null,
        error: a.error,
        actionsProposed: plan.length,
        workerId,
      };
    }),
    events: events.map((e) => ({
      seq: e.seq,
      eventType: e.eventType,
      previousStatus: e.previousStatus,
      newStatus: e.newStatus,
      actor: e.actor,
      createdAt: e.createdAt.toISOString(),
    })),
    approvals: approvals.map((a) => ({
      approvalId: a.id,
      taskId: a.taskId,
      attemptId: a.attemptId,
      toolName: a.toolName,
      inputSummary: buildApprovalInputSummary(a.toolName, a.inputHash, a.attemptId, plansByAttempt),
      inputHash: a.inputHash,
      status: a.status,
      issuedAt: a.issuedAt.toISOString(),
      expiresAt: a.expiresAt.toISOString(),
      usedAt: a.usedAt ? a.usedAt.toISOString() : null,
    })),
    executions: executions.map((e) => ({
      executionId: e.id,
      toolName: e.toolName,
      status: e.status,
      startedAt: e.startedAt.toISOString(),
      finishedAt: e.finishedAt ? e.finishedAt.toISOString() : null,
      durationMs: e.durationMs,
      errorCode: e.errorCode,
      outputMeta: (e.outputMeta as Record<string, unknown> | null) ?? null,
    })),
    evidence: evidence.map((e) => ({
      evidenceId: e.id,
      kind: e.kind,
      claim: e.claim,
      source: e.source,
      confidence: e.confidence,
      executionId: e.executionId,
      createdAt: e.createdAt.toISOString(),
    })),
    verification,
  };
}

// ─── Approval queue: PENDING approvals on WAITING_APPROVAL tasks ────────

export async function listPendingApprovals(
  prisma: PrismaClient,
  opts?: { limit?: number }
): Promise<AgentApprovalView[]> {
  const limit = clampPageSize(opts?.limit);
  // Join through the task so the queue only shows approvals that actually
  // gate a parked WAITING_APPROVAL task (expired/consumed rows are excluded).
  const rows = await prisma.agentApproval.findMany({
    where: { status: "PENDING", task: { status: "WAITING_APPROVAL" } },
    orderBy: { issuedAt: "asc" },
    take: limit,
    select: {
      id: true,
      taskId: true,
      attemptId: true,
      toolName: true,
      inputHash: true,
      status: true,
      issuedAt: true,
      expiresAt: true,
      usedAt: true,
      task: { select: { instruction: true, intentType: true } },
    },
  });
  // Plans of the referenced attempts — the source for hash-verified input
  // summaries (bounded by the same take as the approvals).
  const attemptIds = Array.from(new Set(rows.map((r) => r.attemptId)));
  const planRows = attemptIds.length
    ? await prisma.taskAttempt.findMany({
        where: { id: { in: attemptIds } },
        select: { id: true, plan: true },
      })
    : [];
  const plansByAttemptQueue = new Map<string, unknown[]>();
  for (const p of planRows) {
    if (Array.isArray(p.plan)) plansByAttemptQueue.set(p.id, p.plan as unknown[]);
  }
  return rows.map((a) => ({
    approvalId: a.id,
    taskId: a.taskId,
    attemptId: a.attemptId,
    toolName: a.toolName,
    inputSummary: buildApprovalInputSummary(a.toolName, a.inputHash, a.attemptId, plansByAttemptQueue),
    inputHash: a.inputHash,
    status: a.status,
    issuedAt: a.issuedAt.toISOString(),
    expiresAt: a.expiresAt.toISOString(),
    usedAt: a.usedAt ? a.usedAt.toISOString() : null,
  }));
}

// ─── WAITING_INTELLIGENCE queue ─────────────────────────────────────────

export interface WaitingIntelligenceView {
  readonly taskId: string;
  readonly instructionPreview: string;
  readonly intentType: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Persisted INTELLIGENCE_WAIT event metadata (category, if recorded). */
  readonly waitingCategory: string | null;
  readonly waitingSince: string | null;
  readonly currentAttemptId: string | null;
  readonly lastAttemptError: string | null;
  /** Retry/backoff info is not persisted by P3/P5 — always surfaced honestly. */
  readonly nextRetryInfo: string;
}

export async function listWaitingIntelligence(
  prisma: PrismaClient,
  opts?: { limit?: number }
): Promise<WaitingIntelligenceView[]> {
  const limit = clampPageSize(opts?.limit);
  const tasks = await prisma.agentTask.findMany({
    where: { status: "WAITING_INTELLIGENCE" },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: {
      id: true,
      instruction: true,
      intentType: true,
      createdAt: true,
      updatedAt: true,
      currentAttemptId: true,
      events: {
        where: { eventType: "INTELLIGENCE_WAIT" },
        orderBy: { seq: "desc" },
        take: 1,
        select: { createdAt: true, metadata: true },
      },
    },
  });
  const failedRows = tasks.length
    ? await prisma.taskAttempt.findMany({
        where: { taskId: { in: tasks.map((t) => t.id) }, status: "FAILED" },
        orderBy: { sequence: "desc" },
        select: { taskId: true, error: true },
      })
    : [];
  const lastError = new Map<string, string>();
  for (const f of failedRows) {
    if (f.error && !lastError.has(f.taskId)) lastError.set(f.taskId, f.error);
  }
  return tasks.map((t) => {
    const ev = t.events[0];
    const meta = (ev?.metadata ?? null) as Record<string, unknown> | null;
    const category =
      meta && typeof meta === "object" && !Array.isArray(meta) && typeof (meta as Record<string, unknown>).intelligenceCategory === "string"
        ? ((meta as Record<string, unknown>).intelligenceCategory as string)
        : null;
    return {
      taskId: t.id,
      instructionPreview: preview(t.instruction),
      intentType: t.intentType,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      waitingCategory: category,
      waitingSince: ev ? ev.createdAt.toISOString() : null,
      currentAttemptId: t.currentAttemptId,
      lastAttemptError: lastError.get(t.id) ?? null,
      // P3/P5 persist no retry/backoff ledger — the UI states this honestly.
      nextRetryInfo: "Belum dijadwalkan otomatis — lanjutkan dengan aksi Founder (Resume).",
    };
  });
}

// ─── Worker health (P5 contract, read-only) ─────────────────────────────

export type WorkerRuntimeHealth = "ACTIVE" | "IDLE" | "UNKNOWN";

export interface WorkerHealthView {
  /** Persisted ACTIVE attempt lease → a worker exists. */
  readonly runtimeState: WorkerRuntimeHealth;
  readonly basis: string;
  readonly activeAttemptId: string | null;
  readonly activeTaskId: string | null;
  readonly workerId: string | null;
  readonly lastHeartbeatAt: string | null;
  readonly secondsSinceHeartbeat: number | null;
  readonly activeLeases: number;
  readonly note: string;
}

/** P5 keeps worker identity in the attempt lease; there is no worker table. */
export async function getWorkerHealthView(prisma: PrismaClient): Promise<WorkerHealthView> {
  const active = await prisma.taskAttempt.findMany({
    where: { status: "ACTIVE" },
    orderBy: { heartbeatAt: "desc" },
    take: 10,
    select: {
      id: true,
      taskId: true,
      heartbeatAt: true,
      metadata: true,
      task: { select: { status: true } },
    },
  });
  const inWorkflow = active.filter((a) => a.task.status === "RUNNING");
  const newest = inWorkflow[0] ?? null;
  const meta = (newest?.metadata ?? null) as Record<string, unknown> | null;
  const lease = meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, unknown>).lease : null;
  const workerId =
    lease && typeof lease === "object" && !Array.isArray(lease) && typeof (lease as Record<string, unknown>).workerId === "string"
      ? ((lease as Record<string, unknown>).workerId as string)
      : null;
  const nowMs = Date.now();
  const secondsSinceHeartbeat = newest ? Math.round((nowMs - newest.heartbeatAt.getTime()) / 1000) : null;
  const fresh = secondsSinceHeartbeat !== null && secondsSinceHeartbeat < 300;
  const runtimeState: WorkerRuntimeHealth = inWorkflow.length > 0 && fresh ? "ACTIVE" : inWorkflow.length > 0 ? "UNKNOWN" : "IDLE";
  const basis =
    inWorkflow.length > 0
      ? "lease pada attempt aktif (TaskAttempt.metadata.lease) — kontrak P5"
      : "tidak ada attempt ACTIVE pada task RUNNING — pekerja diam atau tidak berjalan";
  return {
    runtimeState,
    basis,
    activeAttemptId: newest?.id ?? null,
    activeTaskId: newest?.taskId ?? null,
    workerId,
    lastHeartbeatAt: newest ? newest.heartbeatAt.toISOString() : null,
    secondsSinceHeartbeat,
    activeLeases: inWorkflow.length,
    // P5 regression guard: a worker that never ran must NOT be reported STOPPED.
    note:
      runtimeState === "IDLE"
        ? "Tidak ada klaim aktif. Worker mungkin berjalan diam (IDLE) atau belum dijalankan — status proses worker tidak teramati dari database."
        : runtimeState === "UNKNOWN"
          ? "Ada attempt RUNNING dengan lease tetapi heartbeat kedaluwarsa (>5 menit). Kepemilikan tidak pasti — lihat aktivitas recovery worker."
          : "Worker aktif memproses attempt dengan heartbeat segar.",
  };
}

// ─── Command-center summary (bounded counts) ────────────────────────────

export interface AgentSummaryView {
  readonly byStatus: Readonly<Record<TaskStatus | string, number>>;
  readonly pendingApprovals: number;
  readonly waitingIntelligence: number;
  readonly running: number;
  readonly recentCompleted: number;
  readonly recentFailed: number;
  readonly totalVisible: number;
}

export async function getAgentSummary(prisma: PrismaClient, recentWindowMs = 24 * 60 * 60 * 1000): Promise<AgentSummaryView> {
  const since = new Date(Date.now() - recentWindowMs);
  const grouped = await prisma.agentTask.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const byStatus: Record<string, number> = {};
  for (const g of grouped) byStatus[g.status] = g._count._all;
  const [pendingApprovals, waitingIntelligence, recentCompleted, recentFailed] = await Promise.all([
    prisma.agentApproval.count({ where: { status: "PENDING", task: { status: "WAITING_APPROVAL" } } }),
    prisma.agentTask.count({ where: { status: "WAITING_INTELLIGENCE" } }),
    prisma.agentTask.count({ where: { status: "COMPLETED", updatedAt: { gte: since } } }),
    prisma.agentTask.count({ where: { status: "FAILED", updatedAt: { gte: since } } }),
  ]);
  return {
    byStatus,
    pendingApprovals,
    waitingIntelligence,
    running: byStatus["RUNNING"] ?? 0,
    recentCompleted,
    recentFailed,
    totalVisible: grouped.reduce((acc, g) => acc + g._count._all, 0),
  };
}

export type { WorkerHealth };
