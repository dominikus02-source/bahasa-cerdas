"use server";

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
