/**
 * BC Agent P5 — production persistence adapter for the P4 executor.
 *
 * P4's ToolExecutor takes injected `recordExecution` / `recordEvidence`
 * functions; this is the real Prisma-backed implementation. It also
 * maintains the attempt's `toolExecutionIds` / `evidenceIds` references so
 * the P2 attempt record reflects everything that happened.
 *
 * START rows are created idempotently (upsert on id) so a worker crash
 * between tool run and record never breaks a retry; RESULT updates are
 * guarded (RUNNING → terminal) and reject double-writes.
 */

import type { PrismaClient } from "@prisma/client";
import type { EvidenceRecord } from "../tools/types";

interface ExecutionRow {
  executionId: string;
  taskId: string;
  attemptId: string;
  toolName: string;
  inputHash: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  errorCode: string | null;
  outputMeta: Record<string, unknown> | null;
  approvalId: string | null;
}

/** Persist an execution record and maintain the attempt's execution references. */
export async function recordExecution(prisma: PrismaClient, row: ExecutionRow): Promise<void> {
  if (row.status === "RUNNING") {
    await prisma.toolExecution.upsert({
      where: { id: row.executionId },
      create: {
        id: row.executionId,
        taskId: row.taskId,
        attemptId: row.attemptId,
        toolName: row.toolName,
        inputHash: row.inputHash,
        status: "RUNNING",
        startedAt: new Date(row.startedAt),
      },
      update: {}, // idempotent re-START after a crash is a no-op
    });
    return;
  }

  // Terminal record: guard on RUNNING so a duplicate RESULT can never
  // overwrite an already-finalized row (append-only audit semantics).
  const updated = await prisma.toolExecution.updateMany({
    where: { id: row.executionId, status: "RUNNING" },
    data: {
      status: row.status,
      finishedAt: row.finishedAt ? new Date(row.finishedAt) : null,
      durationMs: row.durationMs,
      errorCode: row.errorCode,
      outputMeta: row.outputMeta ? JSON.parse(JSON.stringify(row.outputMeta)) : undefined,
    },
  });
  if (updated.count === 0) {
    // The START row is missing entirely (crash before START persisted) —
    // create the terminal row directly so the audit trail is never lost.
    await prisma.toolExecution.upsert({
      where: { id: row.executionId },
      create: {
        id: row.executionId,
        taskId: row.taskId,
        attemptId: row.attemptId,
        toolName: row.toolName,
        inputHash: row.inputHash,
        status: row.status,
        startedAt: new Date(row.startedAt),
        finishedAt: row.finishedAt ? new Date(row.finishedAt) : null,
        durationMs: row.durationMs,
        errorCode: row.errorCode,
        outputMeta: row.outputMeta ? JSON.parse(JSON.stringify(row.outputMeta)) : undefined,
        approvalId: row.approvalId,
      },
      update: {},
    });
  }

  // Maintain the attempt's execution reference list (best-effort, bounded).
  await prisma.taskAttempt.update({
    where: { id: row.attemptId },
    data: { toolExecutionIds: { push: row.executionId } },
  });
}

/** Persist an evidence record and maintain the attempt's evidence references. */
export async function recordEvidence(prisma: PrismaClient, evidence: EvidenceRecord): Promise<EvidenceRecord> {
  const stored = await prisma.toolEvidence.create({
    data: {
      id: evidence.evidenceId,
      taskId: evidence.taskId,
      attemptId: evidence.attemptId,
      executionId: evidence.executionId,
      kind: evidence.kind,
      claim: evidence.claim,
      source: evidence.source,
      confidence: evidence.confidence,
      metadata: evidence.metadata ? JSON.parse(JSON.stringify(evidence.metadata)) : undefined,
    },
  });
  await prisma.taskAttempt.update({
    where: { id: evidence.attemptId },
    data: { evidenceIds: { push: evidence.evidenceId } },
  });
  return { ...evidence, evidenceId: stored.id };
}
