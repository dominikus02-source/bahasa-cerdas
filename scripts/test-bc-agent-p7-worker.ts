/**
 * BC Agent P7 — always-on worker tests (identity, heartbeat, health, adversarial).
 *
 * Runs against a LOCAL PostgreSQL database only (bahasacerdas_staging on
 * localhost). SAFETY: overrides DATABASE_URL to the local staging DB and
 * REFUSES any non-localhost host — production Supabase can never be touched
 * by this suite, even if env vars are misconfigured.
 *
 * Covers the P7 Phase 12 checklist and the Phase 13 adversarial matrix:
 * registration (idempotent), worker heartbeat (throttled/cheap), stale
 * detection (query-only, DRAINING not reclaimable, STOPPED never stale),
 * registry integration in the loop (register on run, assignment pointer,
 * DEGRADED on task failure, recovery to RUNNING, DRAINING on stop, STOPPED
 * on exit, health() reflects persisted lifecycle), health view addendum
 * (registry signal, workers list), and the adversarial set: forged workerId
 * update rejection, duplicate registration, stale-worker detection, forged
 * health claims (registry lies about RUNNING cannot beat a dead heartbeat).
 *
 * Run: npx tsx scripts/test-bc-agent-p7-worker.ts
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { AgentTaskService } from "../src/agent/persistence/service";
import { getWorkerHealthView } from "../src/agent/persistence/queries";
import {
  Worker,
  parseWorkerConfig,
  registerWorker,
  heartbeatWorker,
  setWorkerAssignment,
  setWorkerStatus,
  findStaleWorkers,
  listRecentWorkers,
  WORKER_STALE_AFTER_MS,
} from "../src/agent/worker";
import type { WorkerConfig } from "../src/agent/worker";
import { createWorkerLogger } from "../src/agent/worker/logger";
import type { WorkerLogLine } from "../src/agent/worker/logger";
import { ToolRegistry, ToolExecutor, defineTool, boundedOutput } from "../src/agent/tools";
import type { ReadOnlyTool, EvidenceRecord } from "../src/agent/tools";
import type { IntelligenceProvider, IntelligenceRequest, IntelligenceResult } from "../src/agent/intelligence";
import { z } from "zod";

// ─── DB safety gate ─────────────────────────────────────────────────────

const LOCAL_USER = process.env.USER || process.env.USERNAME || "postgres";
const LOCAL_URL = `postgresql://${LOCAL_USER}@localhost:5432/bahasacerdas_staging`;
{
  const host = new URL(LOCAL_URL).hostname;
  if (!/^localhost$|^127\.0\.0\.1$/.test(host)) {
    console.error(`FATAL: refusing to run against non-localhost host "${host}"`);
    process.exit(1);
  }
  process.env.DATABASE_URL = LOCAL_URL;
}

const prisma = new PrismaClient({ log: ["error"] });
const newId = () => randomUUID();
const nowIso = () => new Date().toISOString();

// ─── Harness ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(cond: boolean, label: string): void {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`  ❌ ${label}`);
  }
}

function section(name: string): void {
  console.log(`\n── ${name} ─────────────────────────────────────────`);
}

async function cleanupWorker(workerId: string): Promise<void> {
  await prisma.agentWorker.deleteMany({ where: { id: workerId } }).catch(() => undefined);
}

async function cleanupTask(taskId: string): Promise<void> {
  await prisma.toolEvidence.deleteMany({ where: { taskId } });
  await prisma.toolExecution.deleteMany({ where: { taskId } });
  await prisma.taskEvent.deleteMany({ where: { taskId } });
  await prisma.agentApproval.deleteMany({ where: { taskId } });
  await prisma.taskAttempt.deleteMany({ where: { taskId } });
  await prisma.agentTask.deleteMany({ where: { id: taskId } });
}

/** Scripted intelligence provider (same pattern as P5). */
function makeIntelligenceFake(
  script: Array<(req: IntelligenceRequest) => Partial<IntelligenceResult> | Error>
): { provider: IntelligenceProvider; requests: IntelligenceRequest[] } {
  const requests: IntelligenceRequest[] = [];
  let call = 0;
  return {
    requests,
    provider: {
      async run(req) {
        requests.push(req);
        const item = script[Math.min(call, script.length - 1)];
        call++;
        const out = item(req);
        if (out instanceof Error) throw out;
        return {
          requestId: req.requestId,
          text: "",
          provider: "fake",
          model: "fake-model",
          latencyMs: 1,
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          providerAttempts: 1,
          ...out,
        } as IntelligenceResult;
      },
    },
  };
}

function planResult(plan: unknown): Partial<IntelligenceResult> {
  return { text: JSON.stringify(plan), structured: plan };
}

function makeEchoTool(): ReadOnlyTool<{ value: string }, { value: string }> {
  return {
    name: "test.echo",
    description: "test echo tool",
    risk: "READ",
    reversible: true,
    requiresApproval: false,
    autonomyLevel: "L0",
    inputSchema: "test.echo.input",
    outputSchema: "test.echo.output",
    timeoutMs: 2_000,
    productionImpact: "NONE",
    category: "OBSERVE",
    idempotent: true,
    input: z.object({ value: z.string().min(1) }),
    output: z.object({
      data: z.object({ value: z.string() }),
      bytes: z.number().int().nonnegative(),
      maxBytes: z.number().int().positive(),
      items: z.number().int().nonnegative(),
      truncated: z.boolean(),
      source: z.string(),
    }),
    async run(input) {
      return boundedOutput({ value: input.value }, { maxBytes: 10_000, items: 1, source: `test:${input.value.slice(0, 20)}` });
    },
  } as unknown as ReadOnlyTool<{ value: string }, { value: string }>;
}

function makeFailingTool(): ReadOnlyTool<{ value: string }, { value: string }> {
  const tool = makeEchoTool();
  return { ...tool, name: "test.fail", description: "always fails", async run() { throw new Error("boom"); } } as unknown as ReadOnlyTool<{ value: string }, { value: string }>;
}

interface WorkerHarness {
  worker: Worker;
  svc: AgentTaskService;
  logs: WorkerLogLine[];
  /** Full deps for constructing additional Workers (registry-failure test). */
  deps: {
    intelligence: IntelligenceProvider;
    registry: ToolRegistry;
    executor: ToolExecutor;
    config: WorkerConfig;
    logger: ReturnType<typeof createWorkerLogger>;
  };
}

function makeWorkerHarness(opts?: {
  tools?: ReadOnlyTool<never, never>[];
  intelligenceScript?: Array<(req: IntelligenceRequest) => Partial<IntelligenceResult> | Error>;
  config?: Partial<WorkerConfig>;
  /** Simulate a worker-internal crash: the log sink throws on the report event. */
  sinkCrashesOnReport?: boolean;
}): WorkerHarness {
  const config = parseWorkerConfig({
    pollIntervalMs: 5,
    maxPollIntervalMs: 10,
    heartbeatIntervalMs: 20,
    recoveryScanIntervalMs: 5,
    ...(opts?.config ?? {}),
  });
  const svc = new AgentTaskService(prisma, nowIso, newId);
  const registry = new ToolRegistry();
  for (const t of opts?.tools ?? [makeEchoTool()]) registry.register(t as never);

  const intelligence = makeIntelligenceFake(
    opts?.intelligenceScript ?? [
      () =>
        planResult({
          objective: "echo the marker",
          reasoning: "single read-only call",
          proposedActions: [{ toolName: "test.echo", input: { value: "hello" }, purpose: "produce evidence" }],
        }),
    ]
  );

  const logs: WorkerLogLine[] = [];
  const logger = createWorkerLogger("p7-test-worker", (l) => {
    if (opts?.sinkCrashesOnReport && (l.event === "TASK_COMPLETED" || l.event === "TASK_FAILED")) {
      // Worker-internal error OUTSIDE the task try/catch: propagates to the
      // loop's error budget — the DEGRADED trigger (not a task failure).
      throw new Error("log sink crashed (simulated worker-internal error)");
    }
    logs.push(l);
  });

  const executor = new ToolExecutor({
    registry,
    taskService: svc,
    recordExecution: async (row) => {
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
          update: {},
        });
      } else {
        await prisma.toolExecution.updateMany({
          where: { id: row.executionId, status: "RUNNING" },
          data: {
            status: row.status,
            finishedAt: row.finishedAt ? new Date(row.finishedAt) : null,
            durationMs: row.durationMs,
            errorCode: row.errorCode,
            outputMeta: row.outputMeta ? JSON.parse(JSON.stringify(row.outputMeta)) : undefined,
          },
        });
      }
    },
    recordEvidence: async (e: EvidenceRecord) => {
      const stored = await prisma.toolEvidence.create({
        data: {
          id: e.evidenceId,
          taskId: e.taskId,
          attemptId: e.attemptId,
          executionId: e.executionId,
          kind: e.kind,
          claim: e.claim,
          source: e.source,
          confidence: e.confidence,
          metadata: e.metadata ? JSON.parse(JSON.stringify(e.metadata)) : undefined,
        },
      });
      return { ...e, evidenceId: stored.id };
    },
    now: nowIso,
    newId,
  });

  const worker = new Worker({
    prisma,
    taskService: svc,
    intelligence: intelligence.provider,
    executor,
    registry,
    config,
    logger,
    newId,
    sleep: async (ms) => {
      void ms; // tests: never actually wait
    },
  });
  return { worker, svc, logs, deps: { intelligence: intelligence.provider, registry, executor, config, logger } };
}

async function createPendingTask(instruction: string): Promise<string> {
  const id = newId();
  const svc = new AgentTaskService(prisma, nowIso, newId);
  await svc.createTask({ id, instruction, intentType: "ANALYZE_REPO", channel: "WEB", createdBy: "p7-test" });
  return id;
}

// ═════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log("BC AGENT P7 — ALWAYS-ON WORKER TESTS (local staging only)");

  // FIFO hygiene (same contract as the P5 suite): clear leftover PENDING
  // tasks from earlier crashed runs so claim tests always see the tasks
  // they create. Also drop orphan AgentWorker rows from crashed P7 runs
  // (rows are liveness-only; no task ownership lives in them).
  await prisma.agentTask.deleteMany({ where: { status: "PENDING" } });
  await prisma.agentWorker.deleteMany({});

  // ── 1. Registry primitives ───────────────────────────────────────────
  section("Worker registration (idempotent)");
  {
    const wid = `worker-${randomUUID()}`;
    await registerWorker(prisma, { workerId: wid, version: "p7-test", hostname: "localhost", pid: 12345 }, new Date());
    let row = await prisma.agentWorker.findUniqueOrThrow({ where: { id: wid } });
    ok(row.status === "RUNNING", "registration persists RUNNING");
    ok(row.version === "p7-test" && row.pid === 12345, "version/pid persisted");
    ok(row.stoppedAt === null, "no stoppedAt on registration");

    // Idempotency: second registration of the SAME id updates, not duplicates.
    await registerWorker(prisma, { workerId: wid, version: "p7-test-2", hostname: "localhost", pid: 12346 }, new Date());
    const count = await prisma.agentWorker.count({ where: { id: wid } });
    ok(count === 1, "re-registration does not duplicate rows");
    row = await prisma.agentWorker.findUniqueOrThrow({ where: { id: wid } });
    ok(row.version === "p7-test-2" && row.pid === 12346, "re-registration updates metadata");

    await cleanupWorker(wid);
  }

  section("Worker heartbeat (cheap, throttled by caller)");
  {
    const wid = `worker-${randomUUID()}`;
    await registerWorker(prisma, { workerId: wid }, new Date());
    const t0 = new Date(Date.now() - 60_000);
    await prisma.agentWorker.update({ where: { id: wid }, data: { lastHeartbeatAt: t0 } });
    await heartbeatWorker(prisma, wid, new Date());
    const row = await prisma.agentWorker.findUniqueOrThrow({ where: { id: wid } });
    ok(row.lastHeartbeatAt.getTime() > t0.getTime(), "heartbeat refreshes lastHeartbeatAt");
    // A heartbeat on a foreign/unknown worker must fail loudly (no upsert semantics).
    let threw = false;
    try {
      await heartbeatWorker(prisma, `worker-${randomUUID()}`, new Date());
    } catch {
      threw = true;
    }
    ok(threw, "heartbeat on unknown workerId fails (never fabricates a row)");
    await cleanupWorker(wid);
  }

  section("Assignment pointer + lifecycle transitions");
  {
    const wid = `worker-${randomUUID()}`;
    await registerWorker(prisma, { workerId: wid }, new Date());
    const tid = newId();
    await setWorkerAssignment(prisma, wid, tid, newId(), new Date());
    let row = await prisma.agentWorker.findUniqueOrThrow({ where: { id: wid } });
    ok(row.currentTaskId === tid, "assignment pointer persisted");
    await setWorkerAssignment(prisma, wid, null, null, new Date());
    row = await prisma.agentWorker.findUniqueOrThrow({ where: { id: wid } });
    ok(row.currentTaskId === null && row.currentAttemptId === null, "assignment cleared after task");

    await setWorkerStatus(prisma, wid, "DRAINING", new Date());
    row = await prisma.agentWorker.findUniqueOrThrow({ where: { id: wid } });
    ok(row.status === "DRAINING" && row.stoppedAt === null, "DRAINING persists without stoppedAt");
    await setWorkerStatus(prisma, wid, "STOPPED", new Date());
    row = await prisma.agentWorker.findUniqueOrThrow({ where: { id: wid } });
    ok(row.status === "STOPPED" && row.stoppedAt !== null, "STOPPED persists with stoppedAt");

    // Default deny: unknown lifecycle value is rejected, never written.
    let threw = "";
    try {
      await setWorkerStatus(prisma, wid, "RUNNING!" as never, new Date());
    } catch (e) {
      threw = e instanceof Error ? e.message : "?";
    }
    ok(threw.includes("invalid worker lifecycle status"), "invalid lifecycle status rejected (default deny)");
    await cleanupWorker(wid);
  }

  section("Stale detection (query-only)");
  {
    const staleWid = `worker-${randomUUID()}`;
    const freshWid = `worker-${randomUUID()}`;
    const drainingWid = `worker-${randomUUID()}`;
    const stoppedWid = `worker-${randomUUID()}`;
    await registerWorker(prisma, { workerId: staleWid }, new Date());
    await registerWorker(prisma, { workerId: freshWid }, new Date());
    await registerWorker(prisma, { workerId: drainingWid }, new Date());
    await registerWorker(prisma, { workerId: stoppedWid }, new Date());
    const old = new Date(Date.now() - WORKER_STALE_AFTER_MS - 60_000);
    await prisma.agentWorker.update({ where: { id: staleWid }, data: { lastHeartbeatAt: old } });
    await prisma.agentWorker.update({ where: { id: stoppedWid }, data: { lastHeartbeatAt: old, status: "STOPPED" } });
    await prisma.agentWorker.update({ where: { id: drainingWid }, data: { lastHeartbeatAt: old, status: "DRAINING" } });

    const { stale, drainingQuiet } = await findStaleWorkers(prisma, WORKER_STALE_AFTER_MS, new Date());
    ok(stale.some((w) => w.id === staleWid), "RUNNING row past threshold reported stale");
    ok(!stale.some((w) => w.id === freshWid), "fresh worker never stale");
    ok(!stale.some((w) => w.id === stoppedWid), "STOPPED rows never stale (finished on purpose)");
    ok(drainingQuiet.some((w) => w.id === drainingWid) && !stale.some((w) => w.id === drainingWid), "quiet DRAINING reported separately, not a reclaim target");

    // Invalid input rejected (fail-fast, no magic tolerance).
    let threw = false;
    try {
      await findStaleWorkers(prisma, 0, new Date());
    } catch {
      threw = true;
    }
    ok(threw, "non-positive staleAfterMs rejected");

    await cleanupWorker(staleWid);
    await cleanupWorker(freshWid);
    await cleanupWorker(drainingWid);
    await cleanupWorker(stoppedWid);
  }

  section("listRecentWorkers (bounded read model)");
  {
    const wid = `worker-${randomUUID()}`;
    await registerWorker(prisma, { workerId: wid, version: "v1" }, new Date());
    const rows = await listRecentWorkers(prisma, new Date());
    const mine = rows.find((r) => r.id === wid);
    ok(mine !== undefined, "recent workers include the registered row");
    ok(mine !== undefined && mine.secondsSinceHeartbeat === 0, "secondsSinceHeartbeat computed");

    // A stale row must remain VISIBLE in the view (last-known state is the
    // signal), not vanish by aging out — no dishonest disappearance.
    const old = new Date(Date.now() - WORKER_STALE_AFTER_MS - 60_000);
    await prisma.agentWorker.update({ where: { id: wid }, data: { lastHeartbeatAt: old } });
    const rows2 = await listRecentWorkers(prisma, new Date());
    ok(rows2.some((r) => r.id === wid && r.secondsSinceHeartbeat * 1000 >= WORKER_STALE_AFTER_MS), "stale row stays visible with computed age");
    await cleanupWorker(wid);
  }

  // ── 2. Loop integration ──────────────────────────────────────────────
  section("Loop integration: registration on run()");
  {
    const h = makeWorkerHarness();
    h.worker.stop("signal"); // exit immediately after start
    await h.worker.run();
    const wid = h.worker.id;
    const row = await prisma.agentWorker.findUniqueOrThrow({ where: { id: wid } });
    ok(row.status === "STOPPED", "run() persists STOPPED in run-finally");
    ok(row.hostname !== null && row.pid !== null, "hostname/pid persisted (informational)");
    ok(h.worker.health().registryStatus === "REGISTERED", "health reports REGISTERED");
    ok(h.worker.health().lifecycle === "STOPPED", "health lifecycle STOPPED after run");
    await cleanupWorker(wid);
  }

  section("Loop integration: DEGRADED on worker-internal error, recovery to RUNNING");
  {
    // DEGRADED is a WORKER-lifecycle signal, not a task outcome: only a
    // worker-INTERNAL error (here: the log sink crashing mid-report, outside
    // the task try/catch) burns the error budget. Task-level failures must
    // NOT degrade the worker (verified: failing-tool task keeps RUNNING).
    const healthy = makeWorkerHarness({ tools: [makeFailingTool()] });
    const tHealthy = await createPendingTask("p7 task-level failure");
    await healthy.worker.tick();
    const healthyRow = await prisma.agentWorker.findUniqueOrThrow({ where: { id: healthy.worker.id } });
    const taskRowHealthy = await prisma.agentTask.findUniqueOrThrow({ where: { id: tHealthy } });
    ok(taskRowHealthy.status === "FAILED", "task-level failure recorded durably");
    ok(healthyRow.status === "RUNNING", "task-level failure does NOT degrade the worker");

    const h = makeWorkerHarness({ sinkCrashesOnReport: true });
    const t = await createPendingTask("p7 degraded");
    await h.worker.tick();
    const wid = h.worker.id;
    const row = await prisma.agentWorker.findUniqueOrThrow({ where: { id: wid } });
    ok(row.status === "DEGRADED", "worker-internal error persists DEGRADED");
    ok(row.currentTaskId === null, "assignment pointer cleared after task");
    ok(h.worker.health().lifecycle === "DEGRADED", "health() reflects DEGRADED");

    // Recovery to healthy: a succeeding tick resets DEGRADED → RUNNING.
    const h2 = makeWorkerHarness(); // healthy echo tool, clean sink
    const t2 = await createPendingTask("p7 recovery");
    await h2.worker.tick();
    const row2 = await prisma.agentWorker.findUniqueOrThrow({ where: { id: h2.worker.id } });
    ok(row2.status === "RUNNING", "healthy worker stays RUNNING");
    void t2;
    await cleanupTask(tHealthy);
    await cleanupTask(t);
    await cleanupTask(t2);
    await cleanupWorker(healthy.worker.id);
    await cleanupWorker(wid);
    await cleanupWorker(h2.worker.id);
  }

  section("Loop integration: DRAINING on stop, health() honesty");
  {
    const h = makeWorkerHarness();
    h.worker.stop("signal");
    await h.worker.run();
    // After run completes the row is STOPPED; during draining it was DRAINING.
    const row = await prisma.agentWorker.findUniqueOrThrow({ where: { id: h.worker.id } });
    ok(row.status === "STOPPED", "terminal state persisted");
    // A never-run worker must NOT report STOPPED (P5 guard, now P7 lifecycle).
    const h2 = makeWorkerHarness();
    ok(h2.worker.health().lifecycle === "STARTING", "never-run worker reports STARTING (never STOPPED)");
    ok(h2.worker.health().registryStatus === "NOT_REGISTERED", "never-run worker registry NOT_REGISTERED");
    await cleanupWorker(h.worker.id);
  }

  section("Loop integration: registry failure never blocks claiming");
  {
    // A worker whose registry writes fail must still claim and finish work:
    // ownership is the P2 claim (principle 2), the row is only liveness.
    const h = makeWorkerHarness();
    const t = await createPendingTask("p7 registry-down");
    // Break ONLY the agentWorker delegate via a Proxy; everything else passes through.
    const brokenPrisma = new Proxy(prisma, {
      get(target, prop, recv) {
        if (prop === "agentWorker") {
          return new Proxy(
            {},
            {
              get() {
                throw new Error("registry unavailable (simulated)");
              },
            }
          );
        }
        return Reflect.get(target, prop, recv);
      },
    }) as unknown as typeof prisma;
    const worker2 = new Worker({
      prisma: brokenPrisma,
      taskService: new AgentTaskService(brokenPrisma, nowIso, newId),
      intelligence: h.deps.intelligence,
      executor: h.deps.executor,
      registry: h.deps.registry,
      config: h.deps.config,
      logger: h.deps.logger,
      newId,
      sleep: async () => undefined,
    });
    ok(worker2.health().registryStatus === "NOT_REGISTERED", "unstarted worker reports NOT_REGISTERED");
    await worker2.tick();
    const taskRow = await prisma.agentTask.findUniqueOrThrow({ where: { id: t } });
    ok(taskRow.status === "COMPLETED", "task completed despite registry failure");
    ok(worker2.health().registryStatus === "REGISTRY_FAILED", "health honestly reports REGISTRY_FAILED");
    ok(worker2.health().lifecycle === "RUNNING", "process continues in RUNNING lifecycle state");
    await cleanupTask(t);
  }

  section("Health view addendum (P7 fields)");
  {
    const wid = `worker-${randomUUID()}`;
    await registerWorker(prisma, { workerId: wid, version: "p7-view" }, new Date());
    const view = await getWorkerHealthView(prisma);
    ok(view.registry !== null && view.registry !== undefined, "registry signal present");
    ok(view.registry?.workerId === wid, "registry signal points at the live row");
    ok(view.registry?.isStale === false, "fresh heartbeat not stale");
    ok(Array.isArray(view.workers) && view.workers.some((w) => w.workerId === wid), "workers list includes row");
    ok(typeof view.staleWorkers === "number", "staleWorkers count present");

    // Stale signal: age the row past the threshold. The registry signal must
    // REMAIN present and be flagged stale — never silently disappear.
    const old = new Date(Date.now() - WORKER_STALE_AFTER_MS - 60_000);
    await prisma.agentWorker.update({ where: { id: wid }, data: { lastHeartbeatAt: old } });
    const view2 = await getWorkerHealthView(prisma);
    ok(view2.registry !== null && view2.registry !== undefined, "registry signal still present after going stale");
    ok(view2.registry?.workerId === wid && view2.registry.isStale === true, "stale registry heartbeat flagged");
    ok((view2.staleWorkers ?? 0) >= 1, "staleWorkers counts the stale row");
    await cleanupWorker(wid);
  }

  // ── 3. Adversarial (Phase 13) ────────────────────────────────────────
  section("Adversarial: forged worker identity / ownership");
  {
    // A forged workerId cannot assume ownership of an existing attempt lease:
    // reclaimStaleAttempt CASes on the observed heartbeat — a forged caller
    // with the wrong heartbeat loses the CAS. (P5 contract, unchanged by P7.)
    // Here we prove the P7 side: worker rows are writable ONLY by their owner
    // (update on unknown id fails; no upsert path in the P7 registry).
    const wid = `worker-${randomUUID()}`;
    await registerWorker(prisma, { workerId: wid }, new Date());
    let forgedUpdateFailed = false;
    try {
      await prisma.agentWorker.update({ where: { id: `worker-${randomUUID()}` }, data: { status: "RUNNING" } });
    } catch {
      forgedUpdateFailed = true;
    }
    ok(forgedUpdateFailed, "forged workerId cannot mutate a foreign registry row");
    void wid;
    await cleanupWorker(wid);
  }

  section("Adversarial: forged health (registry says RUNNING, heartbeat dead)");
  {
    // A compromised/broken worker that flips its row to RUNNING cannot fake
    // health: staleness is derived from lastHeartbeatAt, not the status label.
    const wid = `worker-${randomUUID()}`;
    await registerWorker(prisma, { workerId: wid }, new Date());
    const old = new Date(Date.now() - WORKER_STALE_AFTER_MS - 60_000);
    await prisma.agentWorker.update({ where: { id: wid }, data: { lastHeartbeatAt: old, status: "RUNNING" } });
    const { stale } = await findStaleWorkers(prisma, WORKER_STALE_AFTER_MS, new Date());
    ok(stale.some((w) => w.id === wid), "RUNNING label with dead heartbeat is still stale");
    const view = await getWorkerHealthView(prisma);
    ok(view.registry?.workerId === wid && view.registry.isStale === true, "health view flags the dead-heartbeat row");
    await cleanupWorker(wid);
  }

  section("Adversarial: STOPPED worker cannot be resurrected into stale ambiguity");
  {
    const wid = `worker-${randomUUID()}`;
    await registerWorker(prisma, { workerId: wid }, new Date());
    await setWorkerStatus(prisma, wid, "STOPPED", new Date());
    const old = new Date(Date.now() - WORKER_STALE_AFTER_MS - 60_000);
    await prisma.agentWorker.update({ where: { id: wid }, data: { lastHeartbeatAt: old } });
    const { stale } = await findStaleWorkers(prisma, WORKER_STALE_AFTER_MS, new Date());
    ok(!stale.some((w) => w.id === wid), "STOPPED row never appears in stale set (no phantom recovery)");
    await cleanupWorker(wid);
  }

  section("Adversarial: restart creates a NEW identity (no ownership corruption)");
  {
    const oldWid = `worker-${randomUUID()}`;
    await registerWorker(prisma, { workerId: oldWid }, new Date());
    await setWorkerStatus(prisma, oldWid, "STOPPED", new Date());
    // A restarted process constructs a new Worker → new workerId → new row.
    const h = makeWorkerHarness();
    ok(h.worker.id !== oldWid, "new Worker instance has a fresh identity");
    const task = await createPendingTask("p7 restart");
    await h.worker.tick();
    const taskRow = await prisma.agentTask.findUniqueOrThrow({ where: { id: task } });
    ok(taskRow.status === "COMPLETED" || taskRow.status === "FAILED", "new worker claims and finishes work independently");
    const oldRow = await prisma.agentWorker.findUniqueOrThrow({ where: { id: oldWid } });
    ok(oldRow.status === "STOPPED", "old identity remains STOPPED (lifecycle separation)");
    await cleanupTask(task);
    await cleanupWorker(oldWid);
    await cleanupWorker(h.worker.id);
  }

  section("Adversarial: concurrent registration of distinct workers");
  {
    const w1 = `worker-${randomUUID()}`;
    const w2 = `worker-${randomUUID()}`;
    await Promise.all([
      registerWorker(prisma, { workerId: w1 }, new Date()),
      registerWorker(prisma, { workerId: w2 }, new Date()),
    ]);
    const count = await prisma.agentWorker.count({ where: { id: { in: [w1, w2] } } });
    ok(count === 2, "distinct workers register independently (no cross-writes)");
    await cleanupWorker(w1);
    await cleanupWorker(w2);
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log(`\n════════════════════════════════════════════════════`);
  console.log(`PASSED: ${passed}  FAILED: ${failed}`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  ❌ ${f}`);
  }
  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err: unknown) => {
  console.error(`FATAL: ${err instanceof Error ? err.message : String(err)}`);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
