# BC AGENT P7 — ALWAYS-ON WORKER FORENSIC AUDIT

**Date**: 2026-09-14 · **Phase**: P7 Phase 0 (read-only audit, completed before any implementation)
**Scope**: worker lifecycle, identity, health, claim/lease, recovery, control-plane wiring, deployment.

---

## 1. CURRENT ARCHITECTURE (P0–P6, unchanged)

```
Founder (session, isFounder)
  → /admin/agent pages + server actions (app/(dashboard)/admin/agent/**)
    → src/agent/control/commands.ts   (authorize → read persisted bindings → canonical service)
      → src/agent/persistence/service.ts  AgentTaskService (P2: claim / transition / retry / approval)
        → src/agent/core (P1 pure lifecycle + policy)
      → src/agent/intelligence (P3: plan provider, WAITING_INTELLIGENCE park/resume)
      → src/agent/tools (P4: ToolExecutor = ONLY execution path, evidence store)
  → src/agent/worker (P5: loop.ts orchestrator + run.ts composition root)
  → GET /api/cron/agent-resume (P6 sweeper: WAITING_INTELLIGENCE → RUNNING, secret-gated)
```

DB (Prisma/Postgres): `AgentTask`, `TaskAttempt` (heartbeatAt, metadata.lease), `TaskEvent`
(audit, `@@unique([taskId, seq])`), `ToolExecution`, `ToolEvidence`, `AgentApproval`.
**No worker table exists** — worker identity is `worker-<uuid>` created in the `Worker`
constructor and lives only in process memory; the only durable worker trace is the
`metadata.lease.workerId` written on an ACTIVE attempt.

## 2. CURRENT WORKER LIFECYCLE

- Entry: `npx tsx src/agent/worker/run.ts` (standalone process — already independent of Next.js).
- `run.ts` parses config (fail-fast `parseWorkerConfig`), builds Prisma + AgentTaskService +
  P4 registry/executor + P3 adapter, installs SIGINT/SIGTERM handlers, starts `Worker.run()`.
- `Worker.run()` loops `tick()`: recovery sweep (throttled 60s) → claim next PENDING → process.
- In-memory `WorkerHealth` (workerId, status IDLE/PROCESSING/STOPPING/STOPPED, counters) —
  exposed via `worker.health()`; **never persisted**.
- Graceful shutdown: `stop()` → no new claims → in-flight task reaches a safe boundary →
  bounded watchdog (`shutdownTimeoutMs`) forces exit; attempt heartbeat ends with the task.

## 3. ANSWERS TO THE MANDATED QUESTIONS

| # | Question | Finding |
|---|----------|---------|
| A | Worker lifecycle | Standalone `run.ts` → loop ticks; signals handled; bounded shutdown watchdog. |
| B | Health persisted/reported | **Not persisted.** In-memory `health()`; P6 `getWorkerHealthView()` derives ACTIVE/UNKNOWN/IDLE from attempt leases only. An IDLE always-on worker is indistinguishable from "never ran". |
| C | Claiming | `AgentTaskService.claimTask` — row-locked transaction: task PENDING→RUNNING + attempt insert + CLAIM event. Atomic; losers get typed errors. |
| D | Heartbeats | Attempt-level only: `TaskAttempt.heartbeatAt` refreshed by `taskService.heartbeat()` every `HEARTBEAT_INTERVAL_MS=30s`; write failure ⇒ ownership uncertain ⇒ attempt abandoned (lease.ts contract). |
| E | Stale recovery | Loop sweep: ACTIVE attempts on RUNNING tasks with `heartbeatAt < now-15min` → CAS `reclaimStaleAttempt` → `failOrphanedTask` (RUNNING→FAILED + attempt FAILED + FAILURE event, one transaction). Requeue is EXPLICIT `retryTask` (fresh attempt). WAITING_* attempts are filtered out — never recovered. |
| F | WAITING_INTELLIGENCE resume | P3 `handleIntelligenceFailure` parks (durable event); resume via `resumeIntelligenceWait` from founder command or the secret-gated cron sweeper (bounded 10/invocation, optimistic-guarded). No busy-loop: parked tasks leave the claim path. |
| G | Control Center → service | Server actions re-run `authorizeFounder` per call → `control/commands.ts` (reads bindings from persisted rows only) → P2/P3 canonical transitions → re-read canonical state. No direct UI DB writes. |
| H | Worker outside web process | Yes — already runs standalone; needs only `DATABASE_URL`, BC AI keys (via `src/ai/core/provider`), optional `BC_AGENT_POLL_MS` / `BC_AGENT_CONCURRENCY` / `BC_AGENT_REPO_ROOT`. |
| I | Required env/secrets | `DATABASE_URL`; AI provider keys consumed by `src/ai/core/provider`; `BC_AGENT_SWEEPER_SECRET` (cron route, optional); `BC_AGENT_REPO_ROOT` (tool sandbox). |
| J | Vercel duplicate-worker risk | Low: no worker code runs in the web deployment (loop only starts from `run.ts`); the cron route only flips parked tasks. Risk is the opposite: **no always-on worker exists in deployment at all** — nothing consumes PENDING tasks off-Vercel today. |

## 4. CURRENT FAILURE MODES / GAPS (P7 targets)

1. **FM-1 Worker identity not durable** — restart creates an anonymous process; a crashed
   worker is detectable only via an orphaned attempt lease. An IDLE worker leaves zero trace.
2. **FM-2 Health is process-local** — Control Center cannot distinguish "worker running,
   queue empty" from "worker dead" (view honestly says UNKNOWN/IDLE but has no positive
   liveness signal). Principle 13 violated structurally.
3. **FM-3 No worker-level heartbeat** — attempt heartbeats exist only while processing; an
   idle always-on worker has no liveness contract. `WORKER_STALE_AFTER` is undefined.
4. **FM-4 No health API** — no liveness/readiness endpoint for container ops or uptime checks.
5. **FM-5 No container packaging** — no `Dockerfile.worker`; `npx tsx` is not a pinned
   dependency (resolves transitively) → non-deterministic startup.
6. **FM-6 Recovery detects stale attempts, not stale workers** — no query answers "which
   worker rows stopped heartbeating".

## 5. DEPLOYMENT RISKS

- Vercel cannot accidentally spawn duplicate workers (audit J) — keep the loop OUT of the
  Next.js runtime; never import `Worker` from app code.
- The cron sweeper stays secret-gated and OFF by default (no vercel.json cron entry) — unchanged.
- Production DB is Supabase pooler (PgBouncer): recovery/claim transactions are short and
  row-locked — no new long transactions may be introduced by P7 (worker registry writes are
  single-row upserts/updates only).
- No production deployment is performed in P7; Docker image is build-only until founder approves ops.

## 6. EXACT FILES INSPECTED

`docs/BC_AGENT_V0_1_BLUEPRINT.md`; `src/agent/worker/{loop,run,lease,config,logger,index}.ts`,
`plan.ts`, `verify.ts`, `report.ts`, `execution-store.ts` (surface read); `src/agent/persistence/{service,queries}.ts`;
`src/agent/control/{commands,service,auth}.ts`; `src/agent/intelligence/bc-ai-adapter.ts` (+ waiting contract);
`app/(dashboard)/admin/agent/**` (page, actions, worker-health-card, task-table, ui, layout, approvals);
`app/api/cron/agent-resume/route.ts`; `prisma/schema.prisma` (AgentTask/TaskAttempt/TaskEvent blocks);
`prisma/migrations/manual/2026-09-12_bc_agent_p{2,4}_*.sql`; `scripts/test-bc-agent-p{1..6}-*.ts`; `package.json`.

## 7. RECOMMENDED MINIMAL CHANGES (P7 scope)

1. **`AgentWorker` model** (+ manual SQL migration, repo convention): durable identity —
   workerId (PK), status (STARTING/RUNNING/DRAINING/STOPPED/DEGRADED), version, hostname
   (informational only), currentTaskId/currentAttemptId, startedAt, lastHeartbeatAt.
2. **`src/agent/worker/registry.ts`**: idempotent registration (upsert), cheap heartbeat
   (single-row UPDATE), draining/stopped transitions, stale-worker **detection** (query-only,
   no cross-worker writes).
3. **Loop integration**: register on start → heartbeat every tick AND piggybacked on the
   attempt heartbeat (so long tasks keep worker liveness fresh) → DRAINING on signal →
   STOPPED in the run-finally; DEGRADED persisted whenever consecutiveErrors > 0.
4. **Config**: `WORKER_STALE_AFTER_MS = 300_000` exported constant (no scattered magic numbers).
5. **Health view**: extend `getWorkerHealthView` with the registry signal (additive, optional
   fields — P6 UI keeps compiling; lease-derived truth stays primary while processing).
6. **`GET /api/admin/agent/health`**: read-only liveness/readiness/worker-health, founder
   session OR `BC_AGENT_HEALTH_TOKEN` bearer; zero secrets in the response.
7. **`Dockerfile.worker` + `.dockerignore`** (+ `tsx` pinned as devDependency): deterministic
   build, non-root user, no secrets in context, SIGTERM-native entrypoint.
8. **`scripts/test-bc-agent-p7-worker.ts`**: localhost-staging-gated suite covering Phase 12
   checklist + Phase 13 adversarial cases; P1–P6 suites must stay green.

## 8. EXPLICIT NON-GOALS

No Telegram, no WRITE tools, no new AI provider architecture, no microservices/Kubernetes,
no Control Center redesign, no task-lifecycle changes (P1 "Final 8" is canonical), no new
claim mechanism (P2 `claimTask` stays the only one), no cross-worker row mutation, no
production deployment, no changes outside `src/agent/**`, `app/(dashboard)/admin/agent/**`,
one API route, `prisma/**`, Docker/ops files and docs.
