/**
 * BC Agent P5 — worker entrypoint / composition root (§28).
 *
 * Initializes real dependencies, validates configuration, starts the loop,
 * and handles SIGINT/SIGTERM with a bounded graceful-shutdown sequence:
 *
 *   1. stop claiming new tasks
 *   2. let the in-flight task reach a safe boundary
 *   3. stop heartbeat (the loop's per-task heartbeat ends with the task)
 *   4. disconnect the DB client
 *   5. exit 0 (or 1 on fatal)
 *
 * This file is the ONLY place that knows about process signals, env vars,
 * and the real Prisma client. The Worker class itself stays pure-orchestration.
 *
 * Run: npx tsx src/agent/worker/run.ts   (or via the Dockerfile in P5 ops)
 */

import { PrismaClient } from "@prisma/client";

import { AgentTaskService } from "../persistence/service";
import { BcAiIntelligenceAdapter } from "../intelligence/bc-ai-adapter";
import { ToolExecutor } from "../tools/executor";
import { makeP4Registry } from "../tools";
import { parseWorkerConfig } from "./config";
import { createWorkerLogger } from "./logger";
import { Worker, recordExecution, recordEvidence } from "./loop";
import path from "node:path";

function repoRoot(): string {
  return process.env.BC_AGENT_REPO_ROOT
    ? path.resolve(process.env.BC_AGENT_REPO_ROOT)
    : path.resolve(process.cwd());
}

async function main(): Promise<void> {
  // 1. Configuration — fail fast before any claim (§27).
  const config = parseWorkerConfig({
    ...(process.env.BC_AGENT_POLL_MS ? { pollIntervalMs: Number(process.env.BC_AGENT_POLL_MS) } : {}),
    ...(process.env.BC_AGENT_CONCURRENCY ? { concurrency: Number(process.env.BC_AGENT_CONCURRENCY) } : {}),
  });
  // P7: build/version identifier for the registry row — informational,
  // never an identity. In the worker image this is a build arg; locally it
  // defaults to the git short SHA when available (best-effort, bounded).
  const version = process.env.BC_AGENT_VERSION ?? `run-ts-${new Date().toISOString().slice(0, 10)}`;

  // 2. Dependencies.
  const prisma = new PrismaClient({ log: ["error"] });
  const taskService = new AgentTaskService(
    prisma,
    () => new Date().toISOString(),
    () => crypto.randomUUID()
  );
  const logger = createWorkerLogger(`worker-${crypto.randomUUID()}`);

  // Read-only tools only. Credentials are NOT provisioned in P5 (§16 of P4
  // report): github.read/vercel.read run unauthenticated with bounded public
  // access until the credential-provisioning phase.
  const registry = makeP4Registry({ repoRoot: repoRoot(), prisma });
  const executor = new ToolExecutor({
    registry,
    taskService,
    recordExecution: (row) => recordExecution(prisma, row),
    recordEvidence: (e) => recordEvidence(prisma, e),
    now: () => new Date().toISOString(),
    newId: () => crypto.randomUUID(),
  });

  const worker = new Worker({
    prisma,
    taskService,
    intelligence: new BcAiIntelligenceAdapter(),
    executor,
    registry,
    config,
    logger,
    version,
  });

  // 3. Signals — graceful shutdown, never mid-transaction (§16).
  let exitCode = 0;
  const onSignal = (signal: string): void => {
    logger.emit("WORKER_STOPPING", { detail: `received ${signal}` });
    worker.stop("signal");
  };
  process.on("SIGINT", () => onSignal("SIGINT"));
  process.on("SIGTERM", () => onSignal("SIGTERM"));

  const shutdownWatchdog = setInterval(() => {
    if (worker.health().status === "STOPPING") {
      // Bounded shutdown: if a task hangs past the grace period, force exit.
      // The task's ownership is recovered by another worker's sweep.
      logger.emit("WORKER_ERROR", { category: "SHUTDOWN_TIMEOUT", detail: "grace period exceeded; forcing exit" });
      process.exit(exitCode);
    }
  }, config.shutdownTimeoutMs);
  shutdownWatchdog.unref();

  // 4. Run to completion.
  try {
    await worker.run();
  } catch (err) {
    logger.emit("WORKER_ERROR", { category: "FATAL", detail: err instanceof Error ? err.message : String(err) });
    exitCode = 1;
  } finally {
    clearInterval(shutdownWatchdog);
    await prisma.$disconnect();
  }
  process.exit(exitCode);
}

main().catch((err: unknown) => {
  process.stderr.write(`bc-agent worker fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
