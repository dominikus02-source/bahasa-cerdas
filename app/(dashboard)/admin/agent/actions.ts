"use server";

import { randomUUID } from "node:crypto";

/**
 * BC Agent P6 — server actions for the Founder Control Center.
 *
 * Every action independently re-runs the server-side authorization gate
 * (the layout gate is not trusted — mutations must be authorized on their
 * own), then delegates to the canonical command layer. No lifecycle logic,
 * no direct table writes, no client-supplied identity anywhere.
 */

import { db } from "@/lib/db";

import { authorizeFounder, getAgentTaskService } from "@/src/agent/control";
import { approveTask, cancelTask, rejectTask, resumeTask, retryTask, type FounderCommandResult } from "@/src/agent/control/commands";
import { revalidatePath } from "next/cache";
import type { TaskIntentType } from "@/src/agent/core/types";
import { BC_AGENT_RUNTIME_PROTOCOL } from "@/src/agent/runtime-protocol";

async function run(command: (taskId: string) => Promise<FounderCommandResult>, taskId: string): Promise<FounderCommandResult> {
  const result = await command(taskId);
  revalidatePath("/admin/agent");
  revalidatePath(`/admin/agent/tasks/${taskId}`);
  return result;
}

export async function approveTaskAction(taskId: string): Promise<FounderCommandResult> {
  return run((id) => approveTask({ prisma: db, taskService: getAgentTaskService(), authorize: authorizeFounder }, id), taskId);
}

export async function rejectTaskAction(taskId: string): Promise<FounderCommandResult> {
  return run((id) => rejectTask({ prisma: db, taskService: getAgentTaskService(), authorize: authorizeFounder }, id), taskId);
}

export async function resumeTaskAction(taskId: string): Promise<FounderCommandResult> {
  return run((id) => resumeTask({ prisma: db, taskService: getAgentTaskService(), authorize: authorizeFounder }, id), taskId);
}

export async function retryTaskAction(taskId: string): Promise<FounderCommandResult> {
  return run((id) => retryTask({ prisma: db, taskService: getAgentTaskService(), authorize: authorizeFounder }, id), taskId);
}

export async function cancelTaskAction(taskId: string): Promise<FounderCommandResult> {
  return run((id) => cancelTask({ prisma: db, taskService: getAgentTaskService(), authorize: authorizeFounder }, id), taskId);
}


export interface CreateAgentTaskActionResult {
  readonly ok: boolean;
  readonly message: string;
  readonly taskId: string | null;
  readonly taskStatus: string | null;
}

const WEB_TASK_MAX_CHARS = 4_000;

function inferWebIntent(instruction: string): TaskIntentType {
  const text = instruction.toLowerCase();
  if (/database|db\b|supabase|user|pengguna|subscription|langganan|sekolah/.test(text)) return "AUDIT_DB";
  if (/vercel|deploy|production|produksi|runtime|log|error|incident|insiden/.test(text)) return "AUDIT_DEPLOYMENT";
  if (/github|repo|repository|kode|source|commit|branch|pull request|\bpr\b/.test(text)) return "ANALYZE_REPO";
  if (/\bqa\b|test|uji|regresi|smoke/.test(text)) return "QA_RUN";
  if (/riset|research/.test(text)) return "RESEARCH";
  return "OTHER";
}

/**
 * Founder web command → canonical AgentTask.
 *
 * Identity is resolved server-side; the client cannot supply createdBy.
 * The command creates only a PENDING task. It does not run a tool inside the
 * request and therefore cannot bypass the worker/executor/policy boundary.
 */
export async function createAgentTaskAction(formData: FormData): Promise<CreateAgentTaskActionResult> {
  const access = await authorizeFounder();
  if (!access.ok) {
    return { ok: false, message: "Akses ditolak.", taskId: null, taskStatus: null };
  }

  const compatibleWorker = await db.agentWorker.findFirst({
    where: {
      status: { in: ["RUNNING", "DEGRADED"] },
      lastHeartbeatAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      version: { startsWith: `${BC_AGENT_RUNTIME_PROTOCOL}@` },
    },
    select: { id: true },
    orderBy: { lastHeartbeatAt: "desc" },
  });
  if (!compatibleWorker) {
    return {
      ok: false,
      message: "Worker BC Agent perlu upgrade/restart ke runtime P9 sebelum menerima diagnosis baru.",
      taskId: null,
      taskStatus: null,
    };
  }

  const raw = formData.get("instruction");
  const instruction = typeof raw === "string" ? raw.trim().slice(0, WEB_TASK_MAX_CHARS) : "";
  if (instruction.length < 3) {
    return { ok: false, message: "Perintah terlalu pendek.", taskId: null, taskStatus: null };
  }

  const taskId = `web-${Date.now()}-${randomUUID().slice(0, 8)}`;
  try {
    const task = await getAgentTaskService().createTask({
      id: taskId,
      instruction,
      intentType: inferWebIntent(instruction),
      channel: "WEB",
      createdBy: access.userId,
    });
    revalidatePath("/admin/agent");
    return {
      ok: true,
      message: "Perintah masuk antrean BC Agent.",
      taskId: task.id,
      taskStatus: task.status,
    };
  } catch {
    return {
      ok: false,
      message: "Gagal membuat task Agent. Coba lagi.",
      taskId: null,
      taskStatus: null,
    };
  }
}
