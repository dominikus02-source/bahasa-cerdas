# BC AGENT — P2 PERSISTENCE REPORT

## 1. STATUS

**PASS**

All quality gates green: typecheck clean, P1 core 170/170 (unbroken), P2 suite 59/59 including both atomic-concurrency proofs, Prisma schema valid, migration applied to a local test database only. No production code touched. No AI/Telegram/Web/Worker integrations.

## 2. EXISTING DB FINDINGS (FACT — inspected this session)

| Finding | Evidence |
|---|---|
| Canonical schema is `prisma/schema.prisma` (3,492+ lines, ~95 models); migrations are applied as hand-written SQL under `prisma/migrations/manual/*.sql` via psql because `prisma db push` times out on the Supabase pooler (AGENTS.md Phase 8C) | `prisma/migrations/manual/` (50 files), `AGENTS.md` |
| `AIJob` model exists (Postgres-backed queue, `PENDING→PROCESSING`) but uses a **race-prone find-then-update claim** | `prisma/schema.prisma` L871, `lib/ai-queue.ts` |
| Enum-ish columns are stored as `String` with comments, not Prisma enums (repo convention, e.g. `AIJob.status`) | `prisma/schema.prisma` L875 |
| `lib/db.ts` is the PrismaClient singleton (extends client, keeps `extensionUrl` aware) | `lib/db.ts` L58–70 |
| Local Postgres available: `bahasacerdas_staging` on localhost:5432 (72 tables, superuser, **no** `Agent*` tables before this phase) | probed via psql |
| `.env.local` DATABASE_URL/DIRECT_URL point at **production Supabase** (`aws-1-ap-southeast-1.pooler.supabase.com`) | `.env.local` (credentials redacted here) |
| No naming collision: only `TaskShareToken` existed among `*Task*` models | schema grep |

## 3. MODELS CREATED

Four models appended to `prisma/schema.prisma` (add-only; zero existing models modified):

| Model | Purpose | Key fields | Constraints / Indexes |
|---|---|---|---|
| `AgentTask` | Durable founder intent | `instruction, intentType, channel, createdBy, status, attemptCount, currentAttemptId, resolvedBy` | `@@index([status, createdAt])`, `@@index([createdBy, createdAt])` |
| `TaskAttempt` | One execution pass; attempt-scoped state only | `taskId, sequence, status, startedAt, finishedAt, error, plan/decisions/verification/evidenceIds/toolExecutionIds/metadata (Json), heartbeatAt` | `@@unique([taskId, sequence])`, `@@index([status, heartbeatAt])`, `@@index([taskId, status])` |
| `TaskEvent` | Append-only audit log | `taskId, attemptId?, seq, eventType, previousStatus, newStatus, actor, metadata?` | `@@unique([taskId, seq])`, `@@index([taskId, createdAt])` |
| `AgentApproval` | Single-use, expiring, 4-way-bound approval | `taskId, attemptId, toolName, inputHash, status, expiresAt, approvedBy, usedAt, consumedBy` | `@@index([taskId, status])`, `@@index([attemptId])`, `@@index([status, expiresAt])` |

Design decisions:
- Status/intent columns are `String` (repo convention) with the **P1 canonical value sets enforced by the service**, which re-validates against `TASK_STATUSES` before any write — a drifted enum can never reach the DB. CHECK constraints in the SQL mirror the same sets (defense in depth).
- `AgentTask` deliberately has **no** `metadata`/`cancelReason` columns — the P1 core's `AgentTask` shape has no such fields; nothing speculative was added (brief §2: do not create speculative models).
- `approvalIds` is not stored on the task row; approvals are queried by `taskId` (single owner of state).
- All four tables cascade-delete from `AgentTask` (test namespace cleanup relies on this).
- Evidence is **not** persisted at P2 (see §16 — P0 assigns evidence durability to P4/P5).

## 4. MIGRATIONS

- File: `prisma/migrations/manual/2026-09-12_bc_agent_p2_persistence.sql` (idempotent `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`, CHECK constraints, FK cascades).
- **Applied to**: local `bahasacerdas_staging` only (verified via psql — 4 tables created).
- **NOT applied to production Supabase.** Applying to production is a founder action:
  `psql "$DIRECT_URL" -f prisma/migrations/manual/2026-09-12_bc_agent_p2_persistence.sql`
- No destructive operations; no unrelated models touched; no naming collisions.
- `npx prisma validate` passes (with env vars supplied — bare invocation fails with P1012 because `DIRECT_URL` is not in the shell env, a pre-existing repo quirk).

## 5. TASK PERSISTENCE

`AgentTaskService.createTask` → pure `createTask` (core) → `upsert` (idempotent on id — duplicate creation returns the existing row, tested). `getTask` / `listTasks` return P1 core types, never Prisma types. Status values are re-validated against the P1 lifecycle on every write path.

## 6. ATTEMPT PERSISTENCE

Attempts are rows in `TaskAttempt` with DB-enforced `@@unique([taskId, sequence])` (tested: duplicate sequence insert → Prisma P2002). `claimTask` creates attempt #1; `retryTask` creates attempt N+1 via the **pure** `createRetryAttempt` (blank slate — structurally impossible to inherit decisions/verification/evidence/tool-outputs/error/metadata). History is preserved: a retried task keeps all prior attempt rows intact (tested: attempt 1's decisions and error still present after retry).

## 7. EVENT PERSISTENCE

`TaskEvent` is append-only with gap-free per-task `seq` (`@@unique([taskId, seq])`; service computes `max(seq)+1` inside the same transaction as the state change — state and event can never diverge, tested). The event vocabulary is a superset of the core's transition commands: `RETRY` and `RECOVERY` are audit-only lifecycle actions that are not transitions (retry mutates nothing at transition level; FAILED stays terminal to `transitionTask`).

## 8. APPROVAL PERSISTENCE

`createApproval` validates expiry-is-future at creation **and** checks attempt↔task binding integrity (an approval cannot be created for an attempt belonging to a different task — tested). All four binding dimensions (taskId, attemptId, toolName, inputHash) are stored and checked at consume time through the pure P1 `validateApproval`.

## 9. ATOMIC TASK CLAIM

`claimTask` transaction: `SELECT ... FOR UPDATE` with `status = 'PENDING'` re-check → insert attempt (seq 1) → conditional UPDATE to RUNNING → CLAIM event → commit.

**Concurrency proof (real DB, 5 parallel claimers): exactly 1 fulfils; 4 receive `AgentClaimConflictError`; attempt count = 1; CLAIM events = 1.**

Claim eligibility rule (documented and enforced): only `PENDING` is claimable. `WAITING_INTELLIGENCE`/`VERIFYING` re-entry and `FAILED` retry are explicit service operations, never `claimTask`. `WAITING_APPROVAL`/`COMPLETED`/`CANCELLED` are never claimable.

Note: `FOR UPDATE SKIP LOCKED` was evaluated but plain `FOR UPDATE` is the better fit here — claim losers must **fail loudly**, not silently skip to another task; the locked row's status re-check guarantees the single-winner outcome. (P5's multi-task worker loop can adopt SKIP LOCKED when failing-fast on a specific task is no longer the desired semantics.)

## 10. ATOMIC APPROVAL CONSUMPTION

`consumeApproval` transaction: row-lock matching PENDING approval `FOR UPDATE` → pure P1 `validateApproval` on the locked row → conditional consume UPDATE (`WHERE status = 'PENDING'`). One consistent `now()` per consume closes the expiry race.

**Concurrency proof (real DB, 5 parallel consumers): exactly 1 fulfils; 4 receive `ApprovalConsumedError`; row is CONSUMED with `usedAt` set.**

Error precision: no matching row at all → `AgentNotFoundError`; binding exists but consumed/expired/mismatched → the corresponding typed P1 error (`ApprovalConsumedError` / `ApprovalExpiredError` / `ApprovalMismatchError`).

## 11. TRANSACTION BOUNDARIES

| Operation | Transaction contents |
|---|---|
| A. claim | lock-check + attempt insert + task update + CLAIM event |
| B. attempt creation | inside claim/retry tx (never standalone) |
| C. approval consumption | row-lock + pure validation + conditional update |
| D. state transition + event | single tx: core validates, guarded `updateMany`, event insert |

Retry is also a single tx (FAILED check + attempt insert + guarded task update + RETRY event). `Prisma.PrismaClientKnownRequestError` P2002 is mapped to typed `AgentConflictError`; original error preserved as `cause`.

## 12. RETRY SEMANTICS

`retryTask(taskId, actor)`: refuses anything but `FAILED` (typed `InvalidTaskTransitionError`); takes latest attempt; core `createRetryAttempt` yields a blank-slate attempt (verified field-by-field: zero decisions/evidence/toolExecutions, `NOT_REQUIRED` verification, null error); task flips FAILED→RUNNING with an optimistic guard; RETRY audit event written. **A stale approval bound to the old attempt cannot authorize the new attempt** — proven at DB level: consume with new attemptId → `AgentNotFoundError` (no approval row matches that binding).

## 13. CRASH RECOVERY

Minimum viable primitives, no distributed lease system: `heartbeatAt` on every attempt (default now), `heartbeat(attemptId)` refresh, `findStaleActiveAttempts()` returning ACTIVE attempts with `heartbeatAt` older than `STALE_ATTEMPT_THRESHOLD_MS` (15 min constant, exported). Tested: artificial 20-minute-old heartbeat is detected; refresh clears it. P5's recovery loop decides reclaim-vs-fail; P2 only surfaces facts. `startedAt` + `finishedAt` + attempt status give full forensic reconstruction.

## 14. IDEMPOTENCY

- `createTask` — idempotent on id (upsert, tested: no duplicate row).
- Claim — idempotent by impossibility: second claim on RUNNING task is a typed conflict (tested).
- Approval consumption — single-use by transaction (tested under concurrency).
- Event persistence — `@@unique([taskId, seq])` makes duplicate seq writes impossible; gap-free numbering tested.
- `finishAttempt` — double-finish rejected by the pure core's already-finished guard (`InvalidAttemptError`), with the DB-level optimistic guard behind it.

## 15. REPOSITORY/SERVICE ARCHITECTURE

```
P1 core (pure: src/agent/core)          ← untouched, zero new imports
        ↑ implements
AgentTaskService (src/agent/persistence/service.ts)
        ↑ uses
mappers.ts (row⇄core, single conversion owner) · json.ts (toDbJson/fromDbJson)
        ↑
Prisma (lib/db.ts singleton at the edge)
```

- Callers see only core types (`AgentTask`, `TaskAttempt`, `Approval`, `PersistedTaskEvent`) and typed `AgentError`s. Prisma types never leak past the service (the `Prisma` import is value-level for `$transaction`/error mapping only).
- All time is injected (`now: () => string`); ids injected (`newId`). Fully deterministic in tests.
- `errors.ts` adds 5 typed persistence errors (`AGENT_NOT_FOUND`, `AGENT_CONFLICT`, `AGENT_CONCURRENT_MODIFICATION`, `AGENT_CLAIM_CONFLICT`, `AGENT_PERSISTENCE_ERROR`) on the P1 `AgentError` base — stable `.code`, no string matching.

## 16. EVIDENCE (decision)

Not persisted at P2 — deliberate. P0's evidence model attaches to tool executions (P4) and verification runs (P5); building `Evidence` tables now would be speculative infrastructure with no producer. The attempt rows already carry `evidenceIds`/`verification`/`decisions` JSON so P4 can attach provenance without schema surgery. (FACT: no evidence producer exists yet; RECOMMENDATION: persist Evidence in P4 together with ToolExecution.)

## 17. TEST DATABASE

**Local `bahasacerdas_staging` (localhost:5432), superuser, 72 pre-existing tables untouched.** The test script hard-codes the local URL and **refuses any non-localhost host** before opening a connection (production Supabase URLs from `.env.local` can never be hit, even by misconfiguration). Tests namespace their rows (`p2test_` prefix) and cascade-clean at start. No destructive statement is ever issued against any other database. `(OBSERVATION: there is no dedicated CI test DB in this repo; local staging is the established safe target — AGENTS.md Phase 8C used it identically.)`

## 18. TEST RESULTS

Command: `npm run test:bc-agent-p2-persistence` → **59 passed, 0 failed** (exit 0)

| Suite | Assertions |
|---|---|
| Task create/read/transition (+idempotency, illegal transitions, terminal) | 13 |
| Claim eligibility (running/missing task) | 2 |
| Attempt lifecycle + retry isolation (+ stale-approval non-inheritance) | 14 |
| DB-level (taskId, sequence) uniqueness (P2002) | 1 |
| Events: order, gap-free seq, status recording, state/event atomicity | 7 |
| Approvals: binding mismatches, consume, expiry, creation guards, cross-task binding | 11 |
| **Atomic approval consumption (5 concurrent consumers → 1 winner)** | 4 |
| **Atomic claim (5 concurrent claimers → 1 winner)** | 5 |
| Idempotency (double-finish guard) | 1 |
| Crash recovery (stale detection + heartbeat) | 2 |

## 19. TYPECHECK

`npm run typecheck` (`tsc --noEmit`) → **0 errors** (exit 0), including all new `src/agent/persistence/*` files. `npx tsc -p tsconfig.scripts.json` reports zero errors for BC Agent scripts; the only failures are in `scripts/production-truth-audit.ts`, which is **pre-existing damage from commit `96c01c5`** (unmodified by this phase — verified via git).

## 20. REGRESSION RESULTS

| Suite | Result |
|---|---|
| `test:bc-agent-p1-core` | **170/170** ✅ (pure core untouched) |
| `test:rpg-phase1a` | 49/49 ✅ |
| `test:rpg-phase1b` | 31/31 ✅ |
| `npx prisma validate` | valid ✅ (with env vars supplied) |

## 21. SECURITY REVIEW

| Threat | Defense (implemented at P2) |
|---|---|
| Double-spend of an approval | Transactional row-lock + conditional update (proven under 5-way concurrency) |
| Approval rebinding across attempts/tasks/tools/inputs | 4-way binding checked against locked row at consume; creation-time task↔attempt integrity check |
| Stale approval authorizing a retry | Approvals are attempt-bound; new attempt id never matches (proven) |
| Concurrent duplicate claim | Locked status re-check (proven under 5-way concurrency) |
| Enum drift corrupting DB state | Service re-validates every status against P1 canonical sets pre-write; SQL CHECK constraints as backstop |
| Audit tampering | TaskEvent append-only; (RECOMMENDATION: revoke UPDATE/DELETE grants on TaskEvent at production deploy) |
| Test suite hitting production DB | Hard localhost guard, fails closed |
| Error leakage | Prisma errors mapped to typed domain errors; original preserved internally as `cause` |

## 22. KNOWN LIMITATIONS

1. **`nextEventSeq` is read-then-write** inside the transition tx — safe today because the guarded status update serializes concurrent transitions of the same task, but a future code path that writes events without the guard would need `SELECT max(seq) ... FOR UPDATE` on the task row. (P1-audit's rule honored: documented, not hidden.)
2. **Claim uses `FOR UPDATE`, not `SKIP LOCKED`** — deliberate (§9); P5's worker loop should re-evaluate for multi-task batching.
3. **No production migration applied** — founder action (§4).
4. **Expiry sweeper absent** — expired approvals are only evaluated at consume time; a scheduled reconciliation that flips stale PENDING rows to EXPIRED belongs in P5 (worker cron).
5. **JSON columns are unvalidated at read** — `fromDbJson` casts; shapes are total for rows written through this module only.
6. **P2 suite needs a live local Postgres** — it is an integration suite by design (concurrency cannot be proven against mocks); the P1 pure suite remains the fast lane.

## 23. FILES CREATED

- `prisma/migrations/manual/2026-09-12_bc_agent_p2_persistence.sql`
- `src/agent/persistence/service.ts`
- `src/agent/persistence/mappers.ts`
- `src/agent/persistence/errors.ts`
- `src/agent/persistence/events.ts`
- `src/agent/persistence/json.ts`
- `src/agent/persistence/index.ts`
- `scripts/test-bc-agent-p2-persistence.ts`
- `docs/BC_AGENT_P2_PERSISTENCE_REPORT.md` (this file)

## 24. FILES MODIFIED

- `prisma/schema.prisma` — appended 4 models + section comment (add-only; no existing model touched)
- `package.json` — one line: `"test:bc-agent-p2-persistence"` script

## 25. FINAL ACCEPTANCE CRITERIA

| Criterion | Status |
|---|---|
| Durable task/attempt/event/approval state | ✅ |
| No speculative models; existing models untouched | ✅ |
| P1 status set preserved, no invented states | ✅ ("Final 8") |
| Attempts independent; retry = fresh attempt; history preserved | ✅ (tested) |
| `(taskId, sequence)` unique at DB level | ✅ (tested) |
| Events append-only, forensic-usable, atomic with state | ✅ (tested) |
| Atomic claim (`FOR UPDATE` + status re-check), race-tested | ✅ (5-way, real DB) |
| Atomic approval consumption, race-tested | ✅ (5-way, real DB) |
| Expiry checked against transaction-consistent time | ✅ (injected `now()` per tx) |
| Claim eligibility documented + enforced | ✅ |
| Retry clears all stale state incl. approvals | ✅ (tested) |
| Crash-recovery primitives (heartbeat/stale detection) | ✅ (tested) |
| Targeted idempotency | ✅ (tested) |
| Clean service boundary; no Prisma leakage into core | ✅ |
| Typed error mapping | ✅ |
| Migration safe, applied only to local test DB | ✅ |
| typecheck / P1 170/170 / regressions | ✅ all green |
| No AI/Telegram/Web/Worker/GitHub/Vercel integration | ✅ |

## RECOMMENDATION FOR P3

**P3 (Intelligence) can begin.** The durable substrate P3 needs is in place: `WAITING_INTELLIGENCE` is a persisted task state with legal entry/exit transitions, and the task/attempt/event model gives P3's provider calls a place to record recoverable progress. Suggested P3 scope: `IntelligenceProvider` port (interface only in core, adapter in `src/agent/intelligence/`) wrapping the existing BC AI provider chain (`src/ai/core/provider.ts` — reuse, do not duplicate), with failure mapping to `WAITING_INTELLIGENCE` + retry/fallback, and evidence records for every model response used in a report.

**Pre-P3 founder action:** apply the migration SQL to production Supabase (§4) — P3 does not strictly require it, but P4/P5 do, and applying now keeps schema and code in lockstep.
