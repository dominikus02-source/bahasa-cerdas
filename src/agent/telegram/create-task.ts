/**
 * BC Agent P8B — Telegram task creation (canonical delegation).
 *
 * Deterministic idempotency (P8A §11): the task id is derived from the
 * Telegram update id (`tg-<updateId>`), and `AgentTaskService.createTask`
 * upserts idempotently on that id. A duplicate Telegram delivery therefore
 * produces exactly ONE task row even if the dedupe ledger were bypassed.
 *
 * This module performs NO policy work: the instruction is DATA placed in the
 * P3 trusted founder-instruction zone; the planner/executor/policy stack
 * handles it exactly as for web-created tasks (P8B Phase 10).
 */

import type { TelegramGatewayDeps } from "./gateway";
import { renderCreated } from "./render";

const MAX_INSTRUCTION_CHARS = 4000;

export type CreateTaskOutcome = {
  readonly text: string;
  readonly code: "CREATED" | "ALREADY_EXISTS" | "CREATE_FAILED";
};

export async function createTask(
  deps: TelegramGatewayDeps,
  founderUserId: string,
  instruction: string,
  telegramUpdateId?: number
): Promise<CreateTaskOutcome> {
  const bounded = instruction.trim().slice(0, MAX_INSTRUCTION_CHARS);
  if (!bounded) {
    return { text: "Instruksi task kosong.", code: "CREATE_FAILED" };
  }

  const taskId = telegramUpdateId !== undefined ? `tg-${telegramUpdateId}` : `tg-${deps.now?.().getTime() ?? Date.now()}`;

  try {
    const task = await deps.taskService.createTask({
      id: taskId,
      instruction: bounded,
      intentType: "OTHER",
      channel: "TELEGRAM",
      createdBy: founderUserId,
    });
    // Distinguish fresh creation from upsert-hit by updatedAt proximity is
    // unreliable; the canonical upsert returns the row either way. The dedupe
    // ledger (gateway.ts) is the primary duplicate guard; this deterministic
    // id is the structural backstop (P8B Phase 6).
    return { text: renderCreated(task.id, task.status), code: "CREATED" };
  } catch {
    return { text: "Gagal membuat task. Coba lagi nanti.", code: "CREATE_FAILED" };
  }
}
