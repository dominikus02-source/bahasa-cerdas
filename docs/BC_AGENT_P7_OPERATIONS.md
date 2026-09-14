# BC AGENT P7 — OPERATIONS GUIDE

**Scope**: running, monitoring, and recovering the always-on BC Agent worker. No real secret values appear here — secrets live in the deployment environment only.

---

## 1. REQUIRED ENVIRONMENT VARIABLES

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | worker + web | Postgres connection (production: Supabase pooler URL). |
| `DIRECT_URL` | migrations only | Supabase direct connection (port 5432) for `prisma migrate`/DDL. |
| AI keys (`DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`) | planning (P3) | Consumed by `src/ai/core/provider`; missing keys surface as recoverable `WAITING_INTELLIGENCE`, never fake success. |
| `BC_AGENT_POLL_MS` | optional | Poll interval override (ms). Invalid values fail fast at startup. |
| `BC_AGENT_CONCURRENCY` | optional | 1..8; default 1. |
| `BC_AGENT_VERSION` | optional | Build identifier persisted in the worker registry row (informational). |
| `BC_AGENT_REPO_ROOT` | optional | Tool sandbox root (default: cwd). |
| `BC_AGENT_SWEEPER_SECRET` | optional | Enables `GET /api/cron/agent-resume` (WAITING_INTELLIGENCE sweeper) with `Authorization: Bearer`. Dormant when unset. |
| `BC_AGENT_HEALTH_TOKEN` | optional | Enables bearer access to `GET /api/admin/agent/health` for container/uptime probes. |

**Never** put any of these in the image, the repo, or logs.

## 2. WORKER STARTUP

```bash
# Local (host):
npx tsx src/agent/worker/run.ts

# Container (recommended):
docker build -f Dockerfile.worker -t bc-agent-worker:<tag> .
docker run -d --name bc-agent-worker \
  -e DATABASE_URL="$DATABASE_URL" \
  -e DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" \
  -e BC_AGENT_VERSION="<git-sha>" \
  bc-agent-worker:<tag>
```

On start the worker: validates config (fail-fast) → registers a durable `AgentWorker` row
(status `RUNNING`, hostname/PID informational) → claims tasks FIFO via the P2 atomic claim.

## 3. WORKER SHUTDOWN

`docker stop` (SIGTERM) or Ctrl-C (SIGINT): the worker enters `DRAINING` (persisted),
stops claiming, lets the in-flight task reach a safe boundary, then persists `STOPPED`
(with `stoppedAt`) and exits 0. Bounded by the shutdown watchdog (`shutdownTimeoutMs`,
default 10s) plus the Docker stop grace (`-t 30` recommended). If the process is killed
before the terminal write, the row is detected stale by query — honest, recoverable.

## 4. HEALTH CHECKING

`GET /api/admin/agent/health` — read-only. Auth: founder/admin session OR
`Authorization: Bearer $BC_AGENT_HEALTH_TOKEN`.

- **LIVENESS** — the web tier answering the request (route responded).
- **READINESS** — `SELECT 1` on the DB; `503 readiness: DB_UNAVAILABLE` otherwise.
- **WORKER** — persisted truth only: registry heartbeat (`AgentWorker.lastHeartbeatAt`),
  lifecycle status, stale count, plus the P5 attempt-lease state. A process existing is
  never reported as "worker healthy".

Liveness probe guidance (container): the worker process itself has no HTTP server;
liveness = the container process (PID 1 node). Worker health truth lives in the DB and
in this endpoint's `worker` object.

## 5. RECOVERY

- **Stale attempts** (worker died mid-task): any live worker's sweep reclaims ACTIVE
  attempts on RUNNING tasks whose heartbeat is older than `STALE_ATTEMPT_THRESHOLD_MS`
  (15 min) via CAS, then fails the orphan durably. Requeue is always an explicit
  founder `retryTask` (fresh attempt).
- **Stale workers** (registry row quiet > `WORKER_STALE_AFTER_MS` = 5 min): reported by
  `findStaleWorkers` (query-only) and surfaced in the health view. Nothing auto-deletes
  or rewrites foreign worker rows.
- **WAITING_INTELLIGENCE**: resume via founder command (Control Center) or the
  secret-gated sweeper `GET /api/cron/agent-resume` (bounded 10/invocation). No
  busy-looping; AI failure never becomes fake success.

## 6. TROUBLESHOOTING

| Symptom | Check | Meaning |
|---|---|---|
| No `AgentWorker` rows at all | worker process running? | No worker is alive; tasks stay PENDING. |
| Row `RUNNING` but heartbeat old | `secondsSinceHeartbeat` | Worker wedged or killed un-gracefully; check container logs; stale set will report it. |
| Row `DEGRADED` | worker logs `WORKER_ERROR` | Error budget burning (worker-internal errors); task-level failures do NOT degrade. |
| Row `REGISTRY_FAILED` (health) | DB connectivity from worker | Worker keeps processing (P2 claim owns tasks); registry writes failing. |
| Tasks stuck `WAITING_INTELLIGENCE` | AI keys / provider status | Resume manually via Control Center or enable the sweeper. |
| Container exits 143 on stop | entrypoint | Must be `node --import tsx` (PID 1 = node). `npx`/`tsx` shims swallow SIGTERM → SIGKILL → row stuck RUNNING. |

## 7. LOCAL DEVELOPMENT

```bash
# 1. Local Postgres with the AgentWorker table (manual migration):
psql "$LOCAL_STAGING_URL" -f prisma/migrations/manual/2026-09-14_bc_agent_p7_worker_registry.sql
# 2. Regenerate client after schema changes:
npx prisma generate
# 3. Tests (localhost-staging gated, refuse non-localhost):
npm run test:bc-agent-p7-worker
```

## 8. STAGING / PRODUCTION DEPLOYMENT PROCEDURE (manual, founder-approved)

1. Apply `2026-09-14_bc_agent_p7_worker_registry.sql` to the target DB (Supabase SQL editor or psql via DIRECT_URL).
2. Build and push the worker image from a clean checkout: `docker build -f Dockerfile.worker -t <registry>/bc-agent-worker:<git-sha> .` — no secrets in build args.
3. Run the container on the chosen host with runtime env only (section 1); `docker stop -t 30` semantics preserved.
4. Verify: health endpoint `worker.registry.status = RUNNING` with fresh heartbeat; create a test task via the Control Center; confirm claim/complete; SIGTERM the container and confirm `STOPPED` row + exit 0.
5. Rollback: stop the container; the web tier and task pipeline are unaffected (no worker code runs inside Next.js).

**No automatic deployment exists or is authorized by P7.**
