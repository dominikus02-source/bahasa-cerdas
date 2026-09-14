# BC AGENT P7 REPORT — ALWAYS-ON WORKER + REMOTE CONTROL HARDENING

**Date**: 2026-09-14 · **Branch**: `bc-agent-p4-tools` · **Base**: P0–P6 (untouched contracts)

## 1. STATUS

**PASS WITH NOTES** — every mandatory gate executed and green; production deployment NOT performed (per directive).

## 2. EXECUTIVE SUMMARY

P7 makes the existing P5 worker operational as an always-on system: durable worker identity
and liveness in the DB (`AgentWorker` registry), founder-visible worker health in the
Control Center, a read-only health endpoint separating liveness/readiness/worker-health,
a deterministic non-root Docker worker image with verified signal-honest shutdown, and a
153-assertion test suite (incl. the Phase 13 adversarial matrix). Task lifecycle, claim
atomicity, approval binding, WAITING_INTELLIGENCE semantics, and the P2/P3/P4/P6 security
contracts are unchanged — P7 is additive infrastructure only.

## 3. AUDIT FINDINGS (Phase 0 — full doc: `BC_AGENT_P7_ALWAYS_ON_WORKER_AUDIT.md`)

- Worker identity was in-memory only; an idle worker left zero DB trace (FM-1/2/3).
- Health derived solely from attempt leases — "running idle" indistinguishable from "dead" (FM-2).
- No health API, no container packaging, `tsx` unpinned (FM-4/5).
- Vercel cannot spawn duplicate workers (no worker code in the web runtime); the real
  deployment gap was that no always-on worker existed at all (audit J).
- Recovery correctly filtered WAITING_* attempts and used CAS reclaim (kept as-is).

## 4. ARCHITECTURE CHANGES

```
Worker process (run.ts, unchanged composition)
  └─ Worker loop (loop.ts)
       ├─ P7 registry: register on start/tick → heartbeat (throttled + piggybacked)
       │   → assignment pointer → DEGRADED on worker-internal errors → DRAINING → STOPPED
       ├─ P2 AgentTaskService.claimTask (atomic — the ONLY ownership path)
       └─ P5 recovery sweep (CAS, unchanged)
Control Center → queries.getWorkerHealthView (+ registry addendum, additive)
GET /api/admin/agent/health → liveness | readiness | worker (persisted truth only)
```

## 5. FILES CHANGED

| File | Change |
|---|---|
| `prisma/schema.prisma` | + `AgentWorker` model; + `binaryTargets = ["native","debian-openssl-3.0.x"]` (worker image engine) |
| `prisma/migrations/manual/2026-09-14_bc_agent_p7_worker_registry.sql` | NEW — registry DDL (applied to local staging) |
| `src/agent/worker/registry.ts` | NEW — idempotent registration, cheap heartbeat, assignment pointer, lifecycle transitions (default-deny on unknown status), query-only stale detection, bounded read model |
| `src/agent/worker/loop.ts` | Integration: register (run + lazy on tick), throttled worker beat, heartbeat piggyback during tasks, DEGRADED↔RUNNING persistence, DRAINING on stop, STOPPED in finally, `version` dep, `lifecycle`/`registryStatus` in `health()` (incl. never-run = STARTING guard) |
| `src/agent/worker/run.ts` | `BC_AGENT_VERSION` → registry version |
| `src/agent/worker/index.ts` | Registry exports |
| `src/agent/persistence/queries.ts` | `WorkerHealthView` + optional `registry`/`staleWorkers`/`workers` (additive, never fabricates) |
| `app/(dashboard)/admin/agent/_components/worker-health-card.tsx` | Registry strip: workerId, status, version, stale flag, absent-registry note |
| `app/api/admin/agent/health/route.ts` | NEW — read-only health (founder session OR `BC_AGENT_HEALTH_TOKEN` bearer) |
| `Dockerfile.worker` | NEW — multi-stage, pinned node:22-bookworm-slim, npm ci, prisma generate, openssl (runtime detection), non-root, `node --import tsx` PID-1 entrypoint |
| `.dockerignore` | NEW — minimal context, `.env*` excluded |
| `scripts/test-bc-agent-p7-worker.ts` | NEW — 53 assertions incl. adversarial |
| `package.json` | + `tsx@^4.23.13` (pinned), + `test:bc-agent-p7-worker` |
| `docs/BC_AGENT_P7_ALWAYS_ON_WORKER_AUDIT.md`, `docs/BC_AGENT_P7_OPERATIONS.md`, this report | NEW |

## 6. DATABASE CHANGES

One additive table, no FKs, no task-table changes:

```sql
AgentWorker(id PK, status, version, hostname, pid, currentTaskId, currentAttemptId,
            startedAt, lastHeartbeatAt, stoppedAt, createdAt, updatedAt)
INDEX(status, lastHeartbeatAt)
```

Applied to local staging via the manual migration; production application is a documented
manual step (no auto-deploy).

## 7–10. LIFECYCLE / HEARTBEAT / CLAIM / RECOVERY CONTRACTS

- **Worker lifecycle**: STARTING → RUNNING ⇄ DEGRADED → DRAINING → STOPPED (all persisted;
  restart = new workerId = new lifecycle instance; STOPPED never resurrected into stale).
- **Heartbeat**: worker row beat ≤1 UPDATE per `heartbeatIntervalMs` (30s default), plus
  piggyback on attempt heartbeats during tasks; attempt heartbeat (P2) unchanged.
  `WORKER_STALE_AFTER_MS = 300_000` is the single named constant — no scattered magic numbers.
- **Claim/lease**: unchanged P2 row-locked transactional claim; two workers can never
  legitimately own one attempt (proven by P5 regression + P7 concurrency tests).
- **Recovery**: unchanged semantics (CAS reclaim → durable orphan-FAIL → explicit retry
  creates the fresh attempt); P7 adds worker-level stale DETECTION only — no component
  mutates foreign worker rows.

## 11. CONTROL CENTER CONTRACT

Commands (approve/reject/resume/retry/cancel) still flow exclusively through
`control/commands.ts` → canonical services — zero direct UI DB mutations (unchanged).
Read side gains the registry strip and the health endpoint. No secrets in any response.

## 12. DOCKER/OPS

Image built and exercised for real: containerized worker registered durably (RUNNING row
with container hostname/PID) and on `docker stop` persisted DRAINING→STOPPED and exited **0**.
Two production-relevant defects were found and fixed during smoke testing:
(1) slim image lacked the `openssl` CLI → Prisma picked the wrong engine;
(2) `npx`/tsx-shim PID 1 swallowed SIGTERM → SIGKILL → falsely-RUNNING row; final entrypoint
is `node --import tsx` so node itself is PID 1. Documented in `BC_AGENT_P7_OPERATIONS.md`.

## 13. SECURITY REVIEW

Principles 1–16 hold: DB sole ownership authority (P2 claim untouched); approval binding
and ToolExecutor exclusivity unchanged; external content remains DATA; no secrets in logs
(worker logger redacts/bounds; registry stores hostname/PID only); health responses carry
no credentials; default deny on unknown lifecycle values; forged workerId cannot mutate
foreign rows (update-by-unknown-id fails; no upsert path); a RUNNING label with a dead
heartbeat is still reported stale — status labels cannot fake health.

## 14–15. TEST RESULTS

| Suite | Result |
|---|---|
| P1 core | 183/183 ✅ |
| P2 persistence | 59/59 ✅ |
| P3 intelligence | 89/89 ✅ |
| P4 tools | 145/145 ✅ |
| P5 worker | 64/64 ✅ |
| P6 control | 87/87 ✅ |
| **P7 worker (new)** | **53/53 ✅** |
| **Total** | **680 assertions, 0 failures** |

P7 adversarial coverage: forged identity/ownership, forged health (RUNNING label + dead
heartbeat), STOPPED-never-stale, restart identity separation, concurrent registration,
registry-failure-doesn't-block-claiming, claim races (P5 suite), crash recovery (P5 suite).

## 16–18. GATES

- **typecheck**: `npx tsc --noEmit` — exit 0 ✅
- **lint**: `npx eslint` on all 8 touched TS files — 0 violations ✅
- **build**: `npm run build` — compiled successfully, 423/423 pages ✅
- **prisma validate** — valid ✅
- **docker build** — deterministic image ✅ (+ live container run verified)

## 19. KNOWN LIMITATIONS

1. Recovery still fails orphans (founder retries explicitly) — auto-requeue remains a
   deliberate future decision.
2. `BC_AGENT_HEALTH_TOKEN` auth is single-token (no rotation); fine for probes, not multi-tenant.
3. Docker image is built and smoke-tested only — no registry push, no orchestrator config (out of scope).
4. Worker heartbeat inside a long single transaction can still gap slightly (attempt-level
   heartbeat covers ownership; worker-row staleness during that window is reported honestly).
5. Production deployment steps are documented but NOT executed or verified against Supabase.

## 20. PRODUCTION READINESS

Code-ready: yes. Deployed: **no** — applying the SQL to production, pushing the image, and
starting a hosted worker remain explicit founder-approved ops steps (procedure in OPERATIONS §8).

## 21. EXACT NEXT STEP

Founder applies `2026-09-14_bc_agent_p7_worker_registry.sql` to the Supabase production DB
(SQL editor), then runs the worker container on the chosen host with runtime env per
`BC_AGENT_P7_OPERATIONS.md` §2, and verifies via the Control Center health strip.
