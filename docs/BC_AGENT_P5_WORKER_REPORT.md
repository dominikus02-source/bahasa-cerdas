# BC AGENT — P5 WORKER REPORT

## 1. STATUS

**PASS** — persistent always-on worker implemented as a thin orchestrator over P2 (task engine), P3 (intelligence), and P4 (tools); every orchestration invariant probe-proven against the real local staging database; all gates green.

| Gate | Result |
|---|---|
| `npm run typecheck` | ✅ exit 0 |
| `npm run lint` | ✅ exit 0 |
| `npm run build` | ✅ compiled successfully |
| **P5 worker (new)** | ✅ **64/64** |
| P1 core | ✅ 183/183 |
| P2 persistence | ✅ 59/59 |
| P3 intelligence | ✅ 89/89 |
| P4 tools | ✅ 145/145 |
| BC AI regression | ✅ 40/40 |
| RPG regressions | ✅ 49/49 + 31/31 |

## 2. EXISTING RUNTIME FINDINGS

| Finding | Class |
|---|---|
| P2 `AgentTaskService.claimTask` is row-locked atomic (PENDING→RUNNING + attempt + CLAIM event in one transaction) | FACT |
| P2 exposes `heartbeat(attemptId)` and `findStaleActiveAttempts()` with `STALE_ATTEMPT_THRESHOLD_MS = 15min` — designed for P5 | FACT |
| `TaskAttempt.metadata` is a Json column and `heartbeatAt` has an index `[status, heartbeatAt]` — the lease fits with **zero schema changes** | FACT |
| The P1 transition graph has **no RUNNING→PENDING edge** — a recovered RUNNING task cannot be re-queued; only `retryTask` (FAILED→RUNNING, fresh attempt) re-enters execution | FACT |
| The P4 executor takes injected `recordExecution`/`recordEvidence`; the repo previously only had test doubles — no production wiring existed | FACT |
| No cron/worker infrastructure exists beyond Vercel's platform; `lib/ai-queue.ts` (find-then-update) is legacy and explicitly NOT to be copied | FACT |
| `randomUUID` from `node:crypto` is the repo's available collision-safe ID mechanism | FACT |

## 3. WORKER ARCHITECTURE

```
run.ts (composition root: env, signals, Prisma, real deps)
  └── Worker (loop.ts — ORCHESTRATOR ONLY)
        ├── claimNext    → P2 AgentTaskService.claimTask (atomic, row-locked)
        ├── planFor      → P3 IntelligenceProvider (strict plan schema)
        ├── executor     → P4 ToolExecutor (the ONLY tool path)
        ├── verify       → verify.ts (persisted evidence, not AI claims)
        ├── report       → report.ts (persisted rows only)
        ├── lease/recovery → lease.ts (CAS reclaim + fail-orphan)
        └── transitions  → P2 transitionTask (durable, atomic, event-appended)
```

Zero responsibility stolen: the worker holds no policy, no approval, no tool
logic, no provider logic, no DB business rules — it only sequences the
existing modules and owns the loop mechanics (backoff, heartbeat, shutdown).

## 4. WORKER LOOP

`run()` loops `tick()`: recovery sweep (throttled) → claim → process →
bounded idle backoff when the queue is empty. Backoff ladder (§14):
100ms → 250ms → 500ms → 1s → 2s → 5s → 10s (max). No busy polling; after
any successful claim the ladder resets (consecutive-error counter cleared;
queue-empty ticks re-step the ladder). Backoff is also applied after parking
a task (WAITING_APPROVAL / WAITING_INTELLIGENCE) so degraded providers and
unapproved actions are never hammered.

## 5. TASK CLAIMING

- Candidate selection: read-only FIFO query (`PENDING`, oldest first, `take: 1`).
- The claim itself is **exclusively P2's** row-locked transaction — no second claim mechanism.
- Probe-proven: two concurrent workers → exactly 1 `TASK_CLAIMED`, 1 attempt, 1 CLAIM event (§12).
- `WAITING_APPROVAL`, `WAITING_INTELLIGENCE`, `VERIFYING`, `FAILED`, terminal states are never claimable (probe-proven for WAITING_* and VERIFYING).

## 6. PLAN CONTRACT

`AgentPlan = { objective, reasoning, proposedActions: [{ toolName, input, purpose }] }` (§4).

- Strict zod schema (`planResponseSchema`): unknown fields rejected — a model **structurally cannot** express `approval`, `policy`, `autonomy`, or `evidence` authority (probe-proven).
- Bounds: `maxActionsPerPlan` (default 10), `maxPlanChars` (default 50k), per-field char caps (objective 500 / reasoning 2k / purpose 300).
- Every `toolName` must exist in the registry; unknown tools reject the WHOLE plan (never partial execution).
- `timeoutMs` for the plan call is the configured task time limit; the P3 adapter owns bounded provider retries internally (§12: provider retry ≠ task retry).

## 7. ACTION EXECUTION

Every proposed action goes through `ToolExecutor.execute()` — resolve →
validate input → classify/policy → approval if required → START record →
run under deadline → validate output → RESULT record → FACT evidence (§6).
The worker never imports tool implementations, never re-derives policy, and
never touches approvals directly. `APPROVAL_REQUIRED` stops the plan
immediately; other FAILED outcomes are durably recorded by the executor and
do not abort the remaining read-only plan (verification still gates completion).

## 8. WAITING_APPROVAL

On the first `APPROVAL_REQUIRED` outcome: durable `APPROVAL_REQUIRED`
transition → task `WAITING_APPROVAL`, later actions NOT executed, backoff
applied, no repeated ask, no spin (§7 — all probe-proven). The attempt stays
ACTIVE; when a founder approval is created and the task resumes via
`APPROVAL_GRANTED` (→ RUNNING), the executor's atomic consume path validates
the exact (task, attempt, tool, inputHash) binding.

## 9. WAITING_INTELLIGENCE

Recoverable intelligence errors (`INTELLIGENCE_TIMEOUT`, `RATE_LIMIT`,
`UNAVAILABLE`, `PROVIDER_ERROR`) go through **P3's own `handleIntelligenceFailure`**
→ durable `INTELLIGENCE_WAIT` → task `WAITING_INTELLIGENCE`, followed by
backoff (§8/§24). The worker does NOT: create a new attempt, re-plan in a
loop, or clobber the parked state — the outer failure handler explicitly
preserves the parked state (probe-proven: exactly 1 attempt, state intact,
second worker cannot claim it). Permanent errors (`AUTH_ERROR`,
`INVALID_REQUEST`, `RESPONSE_INVALID`) → durable FAILURE (probe-proven).
Resume uses P3's `resumeIntelligenceWait` (INTELLIGENCE_RECOVERED → RUNNING).

## 10. FAILURE CLASSIFICATION

| Class | Examples | Handling |
|---|---|---|
| Task-level permanent | malformed plan (after bounded provider retry), unknown tool, verification failed, policy denial | durable FAILURE; worker continues (§9) |
| Task-level parked | approval required; recoverable provider failure | WAITING_APPROVAL / WAITING_INTELLIGENCE + backoff |
| Worker-transient | claim race lost, single DB hiccup, heartbeat write failure | error counter + backoff; worker continues |
| Fatal (process exits) | persistent infrastructure failure: `maxConsecutiveErrors` (default 5) DB/loop errors in a row | `stop("max-errors")` → clean exit; recovered later by operator/another worker |

Worker-internal exceptions during a task are captured per-task (durable
FAILURE where possible) and never kill the loop; the error budget exists so
a dead database cannot produce an infinite crash-retry loop.

## 11. HEARTBEAT

Per-task lifecycle (§15): one loop per active task, refreshing
`TaskAttempt.heartbeatAt` every `heartbeatIntervalMs` (default 30s); the
loop exits when the task finishes or the worker stops — heartbeats never
outlive the task. **A failed heartbeat write flips ownership to uncertain:
the worker stops beating and abandons further work on that attempt** (logged
`HEARTBEAT_LOST`); recovery then owns the attempt. Config validation forbids
`heartbeatIntervalMs ≥ staleThresholdMs/2`, so a live worker always renews
well before the stale cutoff.

## 12. CRASH RECOVERY

Sweep (throttled to `recoveryScanIntervalMs`, default 60s):

1. Find candidates: `ACTIVE` attempts with `heartbeatAt < now − staleThreshold` **joined to tasks in status RUNNING only**. Attempts under parked tasks (WAITING_APPROVAL / WAITING_INTELLIGENCE) are deliberately unowned while parked and are NEVER recovered — the status join filters them out (probe-proven).
2. CAS reclaim (`reclaimStaleAttempt`): conditional UPDATE `WHERE id AND taskId AND status='ACTIVE' AND heartbeatAt = <observed>` writes a lease token into `metadata.lease`. Racing recoverers: exactly one wins; losers re-observe (no split-brain).
3. Reclaim outcome: the orphan is FAILED durably via transactional `failOrphanedTask` (task FAILED + attempt FAILED + FAILURE audit event, atomic). Requeue is **explicit `retryTask`** — which creates a fresh attempt (probe-proven: seq 2, zero inherited state). No fake "resume": with no RUNNING→PENDING transition, a RUNNING "requeue" would be an orphan forever, so that path does not exist.

Lease design (§11): the DB is the sole authority; the lease token is
advisory bookkeeping (who/when/which heartbeat anchor). Redis is not used —
with single-DB CAS there is no coordination problem Redis would solve, and
the blueprint forbids Redis as source of truth.

## 13. CONCURRENCY

`concurrency = 1` (default, per §13; config caps at 8). Multiple worker
*processes* are safe: claiming is row-locked (probe-proven), recovery is
CAS-guarded (probe-proven), and per-task processing is fully serialized
within a worker. No duplicate execution is possible without defeating the
DB row lock.

## 14. BACKOFF

Ladder `100/250/500/1000/2000/5000/10000ms`, stepped on consecutive
queue-empty ticks and after parking a task; error paths also back off.
Max 10s — the agent never appears dead (§14). Injectable `sleep` makes the
ladder deterministic in tests (asserted without real waits).

## 15. GRACEFUL SHUTDOWN

`stop()` sets a flag checked at every claim/loop/action boundary (§16):
no new claims after stop (probe-proven); the in-flight task reaches a safe
boundary (post-verification/report), or — if the stop lands mid-task — the
task is handed to recovery (`abandonForRecovery` → durable fail-orphan, no
silent ownership). The composition root (`run.ts`) traps SIGINT/SIGTERM,
runs a bounded shutdown watchdog (`shutdownTimeoutMs`), then disconnects
Prisma and exits; a hung task past the grace period force-exits and its
ownership is recovered by the next worker's sweep. Heartbeats stop with the
task (never written after completion).

## 16. WORKER HEALTH

`worker.health()` exposes (§17): `workerId`, `startedAt`, `lastHeartbeatAt`,
`currentTaskId`, `currentAttemptId`, `status` (IDLE / PROCESSING / STOPPING /
STOPPED), `tasksProcessed`, `consecutiveErrors`. Shape-stable for P6's Web
Control Center to read; no UI built.

## 17. IDEMPOTENCY

Crash windows are covered (§19): START rows are idempotent upserts; RESULT
updates are guarded on `RUNNING` so double-writes cannot falsify the audit;
a terminal record whose START row is missing is created directly (crash
between tool run and START never loses the audit trail); task transitions
are atomic with their events; completion requires verification against
persisted evidence, so a restart can never falsely claim COMPLETED without
evidence. Read-only tools re-executed after a crash are safe by P4's
read-only guarantee; conflicting attempts / stale approvals / false
completion / lost audit remain impossible (atomic claim, single-use
approvals, verification gate, event-log preservation).

## 18. VERIFICATION

Completion rule (§20): RUNNING → WORK_COMPLETED (VERIFYING) → verify →
`VERIFICATION_PASSED` (COMPLETED) or `VERIFICATION_FAILED` (FAILED). The
verifier (`verify.ts`) reads ONLY persisted rows: every proposed action must
have a ToolExecution; every SUCCEEDED execution must have FK-provenanced FACT
evidence; zero-action plans verify as NOT_REQUIRED. AI self-certification is
structurally impossible — the plan schema has no verification field and
verifier input is DB rows, never model text. Probe-proven: missing execution
→ FAILED; succeeded-but-no-FACT → FAILED.

## 19. REPORTING

`buildTaskReport` (§21) assembles from persisted rows only: outcome, actions
proposed/executed/succeeded/rejected, FACT evidence count, verification
result, warnings (e.g. "N proposed actions never executed"), failure reason,
duration. The only AI text is the plan's objective, labeled as AI-proposed
intent. The report is exposed via `worker.currentReport` for P6.

## 20. LOGGING

All 15 specified lifecycle events are emitted (§22) as single-line JSON with
taskId/attemptId/executionId/toolName/category correlation. The log-line type
has NO field that can carry prompts, outputs, or credentials; `detail` is
bounded to 200 chars and whitespace-flattened. Probe-proven: instruction
text never appears in any log line.

## 21. ERROR ISOLATION

One broken task never kills the worker (§23): task-level failures are
durably recorded and the loop continues (probe-proven: task A fails → task B
completes, same worker, `tasksProcessed = 2`). Fatal conditions are limited
to: explicit shutdown, `maxConsecutiveErrors` infrastructure failures, and
configuration errors (fail-fast before any claim, §27).

## 22. SECURITY

- AI proposes, never executes: the plan is schema-validated, registry-checked, policy-bound input — no code path from model text to execution (invariant 1).
- Authority smuggling structurally rejected: strict plan schema refuses `approval`/`autonomy`/policy fields (probe-proven).
- No write tools exist in the registry at all (P4 read-only set) — escalation to mutation is impossible, not merely forbidden (probe-proven).
- Approvals: only the founder-side service API creates them; consumption is atomic and 4-way-bound (P2/P4 guarantee re-proven: consuming a nonexistent approval → typed `AGENT_NOT_FOUND` → executor maps to `APPROVAL_INVALID`).
- External content is DATA: injection payloads in instructions pass through bounded, correlation-only logging and cannot alter policy/state (probe-proven).
- No secrets in logs (type-enforced) and no secrets in reports (persisted operational metadata only).

## 23. TEST ENVIRONMENT

Same convention as P2/P4: local `bahasacerdas_staging` on localhost with a
hard guard that refuses any non-localhost host before connecting. No
production credentials, no destructive operations, test rows cleaned per
section plus FIFO hygiene for claim tests.

## 24. TEST RESULTS

`npm run test:bc-agent-p5-worker` → **64 passed, 0 failed** (exit 0).

Coverage by brief section: config validation (5), claiming + no-claim-of-non-PENDING (4), concurrency race (4), planning valid/malformed/unknown-tool/bounds/authority-smuggling (5), execution via executor + evidence + completion (6), waiting-approval semantics (3), waiting-intelligence recoverable/permanent/no-new-attempt/backoff/not-claimable (5), failure isolation (3), crash recovery stale-detect/reclaim-CAS/parked-guard/explicit-retry-fresh-attempt/time-limit-orphan/audit-event (7), verification gate (2), reporting (4), graceful shutdown (3), security (5). Plus debug-level probes run during development: end-to-end COMPLETED with report, WAITING-preservation matrix, boundedOutput envelope validation.

## 25. TYPECHECK

`npm run typecheck` → exit 0.

## 26. LINT

`npm run lint` → exit 0.

## 27. BUILD

`npm run build` → compiled successfully (37s). The worker is not part of the
Next.js server bundle (outside `app/`); it compiles as TypeScript and runs
via `npx tsx src/agent/worker/run.ts`.

## 28. FILES CREATED

- `src/agent/worker/config.ts` — validated config + backoff ladder + fail-fast errors
- `src/agent/worker/logger.ts` — secret-proof structured logging (15 events)
- `src/agent/worker/plan.ts` — plan contract + strict validation
- `src/agent/worker/lease.ts` — CAS reclaim + transactional fail-orphan
- `src/agent/worker/verify.ts` — evidence-based completion verification
- `src/agent/worker/report.ts` — persisted-rows-only task report
- `src/agent/worker/execution-store.ts` — Prisma-backed executor persistence (idempotent START, guarded RESULT, attempt reference maintenance)
- `src/agent/worker/loop.ts` — the Worker orchestrator (claim/plan/execute/verify/report + heartbeat + recovery + shutdown)
- `src/agent/worker/index.ts` — barrel
- `src/agent/worker/run.ts` — composition root (env, signals, real deps)
- `scripts/test-bc-agent-p5-worker.ts` — 64-assertion suite

## 29. FILES MODIFIED

- `package.json` — one line: `test:bc-agent-p5-worker` script

No schema changes (the lease lives in the existing `metadata` Json column);
no production code outside `src/agent/worker/` touched; Kuis Tempur and the
parallel actor's files untouched.

## 30. DEPENDENCY CHANGES

**None.** No new npm dependencies. (P4 audit note stands: zod was already present; this phase adds zero packages.)

## 31. KNOWN LIMITATIONS

1. **Deploy target not yet containerized**: `run.ts` runs under tsx/node; a Dockerfile + deployment wiring is operator work (the blueprint's "single Dockerized process" needs its ops step). RECOMMENDATION: ship `Dockerfile.worker` in P6.
2. **Credential provisioning deferred** (P4 report §16 stands): `github.read`/`vercel.read` run unauthenticated (bounded public access); per-execution scoped credentials land with the worker's real production duties.
3. **Recovery requeue is explicit**: recovered orphans are FAILED; a founder/automation call to `retryTask` re-enters with a fresh attempt. No automatic requeue loop exists (deliberate — no RUNNING→PENDING transition; avoids silent retry storms). RECOMMENDATION: P6 adds an operator "retry" action in the Control Center.
4. **Concurrency is 1** and validated ≤ 8; multi-task pipelining within a worker is untested/unbuilt (founder-scale needs do not justify it yet).
5. **Intelligence resume is sweep-driven**: a WAITING_INTELLIGENCE task resumes when something calls `resumeIntelligenceWait` (operator/sweeper); the worker does not yet auto-poll parked tasks. RECOMMENDATION: P6 adds a parked-task requeue timer.
6. Real-network smoke of the plan call against live BC AI remains a founder-run action (same standing item as P3).

## 32. ACCEPTANCE CRITERIA

 persistent worker exists ✅ · orchestrator only ✅ · claiming via P2 ✅ · planning via P3 ✅ · execution via P4 ✅ · no direct tool execution ✅ · no policy bypass ✅ · approvals enforced ✅ · WAITING_APPROVAL works ✅ · WAITING_INTELLIGENCE works ✅ · heartbeat works ✅ · crash recovery implemented ✅ · no double-claim under concurrency ✅ · bounded backoff ✅ · graceful shutdown ✅ · failure isolation ✅ · verification before completion ✅ · report generation ✅ · structured logging ✅ · config validation ✅ · no Telegram ✅ · no Web UI ✅ · no OpenCode ✅ · no write tools ✅ · no production deployment ✅ · P1–P4 tests pass ✅ · typecheck/lint/build pass ✅

## 33. RECOMMENDATION FOR P6

Build the **Web Control Center** on the existing P2 query surface +
`worker.health()` + `buildTaskReport`: task queue view, waiting-approval
queue with approve/reject (founder-only, creating P2 approvals bound to the
exact attempt/inputHash), waiting-intelligence queue with resume, per-task
evidence/report inspector, retry (fresh attempt) and cancel actions, and
worker health. Persistence for durable `AgentMemory` and the operator
auth boundary are the two P6 design decisions that need a blueprint-level
pass first. Defer Telegram (P7) and keep all write-path tooling out until
the read-only boundary has production mileage.
