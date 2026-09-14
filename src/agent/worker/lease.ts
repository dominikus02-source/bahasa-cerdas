/**
 * BC Agent P5 — crash-recovery lease helpers (§11, §15).
 *
 * The lease token lives in `TaskAttempt.metadata.lease` (P2's metadata Json
 * column — no schema change needed). A lease is claimed by conditional
 * update (WHERE heartbeat matches the observed one), so a stale attempt can
 * be reclaimed by exactly one worker even with several candidates racing:
 * the first CAS wins; the loser re-reads the row, sees a fresh lease, and
 * backs off.
 *
 * Rules:
 * - Only ACTIVE attempts on RUNNING tasks older than the stale threshold
 *   are reclaimable.
 * - A live heartbeat (fresh lease) blocks recovery — active workers are
 *   never interrupted.
 * - The worker's own liveness is bounded: heartbeat is written for active
 *   work only and stops when the attempt finishes.
 * - If a heartbeat write fails, ownership is uncertain (§15) → the caller
 *   must not continue blindly; the loop treats it as a lost lease.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

/** The lease token persisted on the attempt. */
export interface AttemptLease {
  /** Owning worker id. */
  readonly workerId: string;
  /** ISO time the lease was (re)claimed. */
  readonly claimedAt: string;
  /** The heartbeat value this lease observed — CAS anchor. */
  readonly heartbeatAnchor: string;
}

/** Type guard for rows coming back from the Json column. */
export function parseLease(metadata: Prisma.JsonValue | null): AttemptLease | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const lease = (metadata as Record<string, unknown>).lease;
  if (!lease || typeof lease !== "object" || Array.isArray(lease)) return null;
  const l = lease as Record<string, unknown>;
  if (typeof l.workerId !== "string" || typeof l.claimedAt !== "string" || typeof l.heartbeatAnchor !== "string") {
    return null;
  }
  return { workerId: l.workerId, claimedAt: l.claimedAt, heartbeatAnchor: l.heartbeatAnchor };
}

export interface StaleAttemptRow {
  readonly id: string;
  readonly taskId: string;
  readonly heartbeatAt: Date;
  readonly metadata: Prisma.JsonValue | null;
}

/**
 * Attempt-level reclaim: CAS the lease onto a stale attempt. `expectedHeartbeat`
 * must match the row's current heartbeatAt exactly; otherwise the attempt
 * was concurrently modified and the caller must re-observe.
 *
 * The taskId guard in the WHERE clause keeps the reclaim tied to the task
 * we decided to recover — a concurrent task CANCEL does not leave us
 * holding a lease on a task we no longer own.
 */
export async function reclaimStaleAttempt(
  prisma: PrismaClient,
  attemptId: string,
  taskId: string,
  expectedHeartbeat: Date,
  workerId: string,
  now: Date
): Promise<boolean> {
  const lease: AttemptLease = { workerId, claimedAt: now.toISOString(), heartbeatAnchor: expectedHeartbeat.toISOString() };
  const updated = await prisma.taskAttempt.updateMany({
    where: {
      id: attemptId,
      taskId,
      status: "ACTIVE",
      heartbeatAt: expectedHeartbeat,
    },
    data: { metadata: { lease } as unknown as Prisma.InputJsonValue },
  });
  return updated.count === 1;
}

/**
 * Task-level completion of recovery: FAIL the orphaned task and finish its
 * attempt. Uses a transaction so the task status flip, attempt finish, and
 * audit event land together — recovery never leaves a half-failed state.
 * CAS semantics: the task must still be RUNNING; if it moved, this is a
 * no-op loser race (returns false).
 */
export async function failOrphanedTask(
  prisma: PrismaClient,
  taskId: string,
  attemptId: string,
  reason: string,
  actor: string,
  now: Date
): Promise<boolean> {
  return prisma.$transaction(async (c) => {
    const updated = await c.agentTask.updateMany({
      where: { id: taskId, status: "RUNNING" },
      data: { status: "FAILED", updatedAt: now },
    });
    if (updated.count === 0) return false;

    await c.taskAttempt.updateMany({
      where: { id: attemptId, status: "ACTIVE" },
      data: { status: "FAILED", finishedAt: now, error: reason.slice(0, 300) },
    });

    const last = await c.taskEvent.findFirst({ where: { taskId }, orderBy: { seq: "desc" }, select: { seq: true } });
    await c.taskEvent.create({
      data: {
        taskId,
        attemptId,
        seq: (last?.seq ?? 0) + 1,
        eventType: "FAILURE",
        previousStatus: "RUNNING",
        newStatus: "FAILED",
        actor,
        metadata: { recoveryReason: reason.slice(0, 200) },
      },
    });
    return true;
  });
}
