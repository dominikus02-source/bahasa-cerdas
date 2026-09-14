/**
 * BC Agent P7 — durable worker identity & liveness registry (§P7 Phases 1–3).
 *
 * ROLE: the ONLY module that writes the AgentWorker table. A worker process:
 *
 *   1. registers idempotently at startup (upsert on its own workerId);
 *   2. heartbeats on a cheap bounded cadence (single-row UPDATE);
 *   3. persists DRAINING on graceful shutdown start, STOPPED at exit;
 *   4. persists DEGRADED when consecutive infrastructure errors stack up
 *      (the process is alive but its error budget is burning);
 *   5. is detected stale by QUERY ONLY — nothing mutates another worker's
 *      row (principles 12/13/14: health comes from persisted truth, restart
 *      creates a fresh identity, recovery reads and decides, never rewrites
 *      foreign lifecycle rows).
 *
 * Hostname/PID are informational (debugging); identity is the random
 * workerId. Version is injected from config, never guessed.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

/** Worker lifecycle states (worker health ONLY — task lifecycle is P1's). */
export type WorkerLifecycleStatus = "STARTING" | "RUNNING" | "DRAINING" | "STOPPED" | "DEGRADED";

export const WORKER_LIFECYCLE_STATUSES: readonly WorkerLifecycleStatus[] = [
  "STARTING",
  "RUNNING",
  "DRAINING",
  "STOPPED",
  "DEGRADED",
];

/** A worker row with no heartbeat for longer than this is stale (queryable truth). */
export const WORKER_STALE_AFTER_MS = 300_000; // 5 minutes

/** Bounded display/debug truncation. */
const ID_MAX = 120;
const VERSION_MAX = 64;

export interface WorkerRegistration {
  readonly workerId: string;
  readonly version?: string;
  readonly hostname?: string;
  readonly pid?: number;
}

function clamp(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

/**
 * Idempotent startup registration. Re-invoking with the same workerId
 * updates metadata and resets liveness, but never resurrects a STOPPED row
 * into RUNNING under a different lifecycle: a genuinely restarted process
 * has a NEW workerId by construction (Worker constructor), so this upsert
 * only ever touches the caller's own identity.
 */
export async function registerWorker(prisma: PrismaClient, reg: WorkerRegistration, now: Date): Promise<void> {
  const data = {
    status: "RUNNING" as const,
    version: reg.version ? clamp(reg.version, VERSION_MAX) : null,
    hostname: reg.hostname ? clamp(reg.hostname, ID_MAX) : null,
    pid: typeof reg.pid === "number" ? reg.pid : null,
    currentTaskId: null,
    currentAttemptId: null,
    stoppedAt: null,
    lastHeartbeatAt: now,
  };
  await prisma.agentWorker.upsert({
    where: { id: clamp(reg.workerId, ID_MAX) },
    create: { id: clamp(reg.workerId, ID_MAX), ...data, status: "RUNNING", startedAt: now },
    update: data,
  });
}

/** Cheap liveness beat: one UPDATE, no transaction, bounded columns. */
export async function heartbeatWorker(prisma: PrismaClient, workerId: string, now: Date): Promise<void> {
  await prisma.agentWorker.update({
    where: { id: clamp(workerId, ID_MAX) },
    data: { lastHeartbeatAt: now },
  });
}

/** Point the registry at the task/attempt currently being processed. */
export async function setWorkerAssignment(
  prisma: PrismaClient,
  workerId: string,
  currentTaskId: string | null,
  currentAttemptId: string | null,
  now: Date
): Promise<void> {
  await prisma.agentWorker.update({
    where: { id: clamp(workerId, ID_MAX) },
    data: { currentTaskId, currentAttemptId, lastHeartbeatAt: now },
  });
}

/**
 * Persist a lifecycle status change. For terminal states (DRAINING keeps
 * heartbeating; STOPPED is final) stoppedAt is stamped. Unknown status
 * values are rejected — default deny for ambiguous writes (principle 8).
 */
export async function setWorkerStatus(
  prisma: PrismaClient,
  workerId: string,
  status: WorkerLifecycleStatus,
  now: Date
): Promise<void> {
  if (!WORKER_LIFECYCLE_STATUSES.includes(status)) {
    throw new Error(`invalid worker lifecycle status: ${String(status)}`);
  }
  const terminal = status === "STOPPED";
  await prisma.agentWorker.update({
    where: { id: clamp(workerId, ID_MAX) },
    data: { status, ...(terminal ? { stoppedAt: now } : {}) },
  });
}

export interface StaleWorkerRow {
  readonly id: string;
  readonly status: string;
  readonly lastHeartbeatAt: Date;
  readonly currentTaskId: string | null;
  readonly currentAttemptId: string | null;
}

/**
 * QUERY-ONLY stale detection: rows in a live status (RUNNING/DEGRADED) whose
 * heartbeat is older than the threshold. DRAINING workers may legitimately
 * pause between beats while finishing a bounded task, so they are reported
 * separately; STOPPED rows are never stale (they are finished, on purpose).
 * Never throws — callers use this for reporting/recovery decisions and must
 * tolerate a DB hiccup as "unknown".
 */
export async function findStaleWorkers(
  prisma: PrismaClient,
  staleAfterMs: number,
  now: Date,
  take = 20
): Promise<{ stale: StaleWorkerRow[]; drainingQuiet: StaleWorkerRow[] }> {
  if (!Number.isInteger(staleAfterMs) || staleAfterMs <= 0) {
    throw new Error("staleAfterMs must be a positive integer");
  }
  const cutoff = new Date(now.getTime() - staleAfterMs);
  const rows = await prisma.agentWorker.findMany({
    where: { status: { in: ["RUNNING", "DEGRADED", "DRAINING"] }, lastHeartbeatAt: { lt: cutoff } },
    select: { id: true, status: true, lastHeartbeatAt: true, currentTaskId: true, currentAttemptId: true },
    orderBy: { lastHeartbeatAt: "asc" },
    take,
  });
  const stale = rows.filter((r): r is StaleWorkerRow => r.status !== "DRAINING");
  const drainingQuiet = rows.filter((r): r is StaleWorkerRow => r.status === "DRAINING");
  return { stale, drainingQuiet };
}

/**
 * The registry view for health surfaces: the newest worker rows by
 * heartbeat, INCLUDING stale ones — the last-known state of a worker that
 * stopped beating is precisely the signal health consumers need, so rows
 * never vanish from the view by aging out. Bounded (take), read-only.
 */
export async function listRecentWorkers(
  prisma: PrismaClient,
  now: Date,
  take = 10
): Promise<
  Array<{
    id: string;
    status: string;
    version: string | null;
    hostname: string | null;
    pid: number | null;
    currentTaskId: string | null;
    currentAttemptId: string | null;
    startedAt: Date;
    lastHeartbeatAt: Date;
    secondsSinceHeartbeat: number;
  }>
> {
  const rows = await prisma.agentWorker.findMany({
    orderBy: { lastHeartbeatAt: "desc" },
    select: {
      id: true,
      status: true,
      version: true,
      hostname: true,
      pid: true,
      currentTaskId: true,
      currentAttemptId: true,
      startedAt: true,
      lastHeartbeatAt: true,
    },
    take,
  });
  return rows.map((r) => ({
    ...r,
    secondsSinceHeartbeat: Math.max(0, Math.round((now.getTime() - r.lastHeartbeatAt.getTime()) / 1000)),
  }));
}
