/**
 * BC Agent P7.3 Phase 9 — production task smoke via the CANONICAL service path.
 * Creates ONE read-only ANALYZE_REPO task (no mutations, READ tools only),
 * then polls to a terminal state and prints the full pipeline evidence.
 * No secrets are printed. Runs against whatever DATABASE_URL is in env.
 */
import { PrismaClient } from "@prisma/client";
import { AgentTaskService } from "../src/agent/persistence/service";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const svc = new AgentTaskService(prisma);
  const id = `p73-smoke-${randomUUID().slice(0, 8)}`;
  const instruction =
    process.argv[2] ??
    "Tugas smoke test read-only: baca file src/agent/worker/config.ts pada repo ini, laporkan nama konstanta interval heartbeat beserta nilainya. Jangan ubah apa pun.";
  await svc.createTask({
    id,
    instruction,
    intentType: "ANALYZE_REPO",
    channel: "WEB",
    createdBy: "p73-smoke",
  });
  console.log(`TASK_CREATED id=${id}`);

  const deadline = Date.now() + 120_000;
  let last = "PENDING";
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const t = await prisma.agentTask.findUnique({ where: { id } });
    if (!t) throw new Error("task vanished");
    last = t.status;
    if (!["PENDING", "RUNNING", "VERIFYING"].includes(t.status)) break;
  }
  const task = await prisma.agentTask.findUnique({ where: { id } });
  const attempts = await prisma.taskAttempt.findMany({ where: { taskId: id }, orderBy: { sequence: "asc" } });
  const events = await prisma.taskEvent.findMany({ where: { taskId: id }, orderBy: { seq: "asc" } });
  const execs = await prisma.toolExecution.findMany({ where: { taskId: id } });
  const evidence = await prisma.toolEvidence.findMany({ where: { taskId: id } });
  console.log(
    JSON.stringify(
      {
        finalStatus: task?.status,
        resolvedBy: task?.resolvedBy,
        attemptCount: task?.attemptCount,
        attempts: attempts.map((a) => ({
          id: a.id,
          seq: a.sequence,
          status: a.status,
          verification: a.verification,
        })),
        events: events.map((e) => `${e.seq}:${e.eventType} ${e.previousStatus}->${e.newStatus} by ${e.actor}`),
        toolExecutions: execs.map((x) => `${x.toolName}:${x.status}:${x.durationMs ?? "-"}ms`),
        evidence: evidence.map((e) => `${e.kind}:${e.source}:${e.claim.slice(0, 90)}`),
      },
      null,
      2,
    ),
  );
  console.log(`TERMINAL_STATE=${last}`);
}

main()
  .catch((e) => {
    console.error("SMOKE_SCRIPT_ERROR", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
