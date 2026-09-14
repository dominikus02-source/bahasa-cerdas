# BC AGENT P6 CONTROL CENTER REPORT

## 1. STATUS

**PASS WITH NOTES**

All 30 acceptance criteria are met. The two notes: (1) browser verification was
NOT performed (no interactive browser session was available in this environment;
verification is via integration tests, static security checks, typecheck, lint,
build, and the full P1–P6 regression chain — see §16/§17); (2) the P6 sweeper
route is implemented and secret-gated but deliberately NOT wired into
`vercel.json` crons — enabling the schedule is an explicit ops decision (§15).

## 2. Executive summary

P6 delivers the Founder Web Control Center: a founder-only, server-authorized
control plane over the existing BC Agent runtime (P1 core, P2 persistence,
P3 intelligence, P4/P4.1 tools+evidence, P5 worker). The control center is a
pure READ + COMMAND surface: it reads through one new canonical read boundary
(`src/agent/persistence/queries.ts`), and every mutation delegates to the
canonical services (`AgentTaskService`, `resumeIntelligenceWait`,
`buildTaskReport`). No second runtime, no duplicated lifecycle logic, no direct
table writes from the web layer, no tool execution path, no policy or approval
bypass. The only additions to canonical services are the smallest gaps P6
needed: a paginated read model and a binding-validated, single-use
`rejectApproval` (mirroring `consumeApproval`'s atomicity).

Surfaces shipped: Task Command Center (`/admin/agent`), Task Detail
(`/admin/agent/tasks/[taskId]`), Approval Queue (`/admin/agent/approvals`),
founder actions (approve / reject / resume / retry / cancel) as server actions,
Worker Health panel, and an env-gated bounded sweeper route
(`/api/cron/agent-resume`). Test suite: `scripts/test-bc-agent-p6-control.ts`
— **87/87 assertions PASS**.

## 3. Architecture

```
Founder (session: Supabase JWT verified server-side)
  ↓ /admin/agent/** (layout gate + per-page re-check + per-action re-check)
Server Actions (app/(dashboard)/admin/agent/actions.ts)
  ↓ authorizeFounder() — src/agent/control/auth.ts (gate FIRST, every call)
Founder Command Layer (src/agent/control/commands.ts)
  ↓ bindings read from PERSISTED rows only
Canonical services:
  • AgentTaskService (P2): createApproval / rejectApproval / transitionTask /
    retryTask / consumeApproval
  • resumeIntelligenceWait (P3): INTELLIGENCE_RECOVERED
  • buildTaskReport (P5): report computed from persisted rows
  ↓
P1 Core (pure state machine) → Prisma/PostgreSQL (source of truth)
```

Reads: `src/agent/persistence/queries.ts` — the only place the web plane
touches Agent tables for reads. Bounded by construction (hard take-limits,
cursor pagination). The web layer never imports Prisma models for mutation and
never writes Agent tables.

## 4. Route / access model

- Route: **`/admin/agent`** (inside the existing `(dashboard)/admin` route
  group, matching repo conventions and the existing founder/admin panel).
- `layout.tsx`: server-side gate — `getUser()` (verified JWT → Prisma User),
  redirect `/login` when unauthenticated, redirect `/admin` when
  `!isFounder && role !== "ADMIN"`. This mirrors the existing
  `requireFounder()` predicate in `lib/supabase/server.ts`.
- Every page re-checks authorization independently (a layout gate alone is not
  authorization).
- Every server action re-authorizes **first**, on every invocation, via
  `authorizeFounder()`. Identity is never accepted from the client: no
  `userId`, `founderId`, `role`, or ownership fields exist in any request
  contract.
- No secrets, provider keys, credentials, or authorization headers are ever
  returned to the client. `outputMeta` shown in the UI is the already-redacted
  persistence envelope produced by P4's `redactMeta()`.

## 5. Task Command Center

`/admin/agent` — hierarchy per brief §13: status summary (RUNNING /
WAITING_APPROVAL / WAITING_INTELLIGENCE / VERIFYING / PENDING / FAILED as
clickable filters), attention-required (WAITING_INTELLIGENCE with persisted
category + waitingSince), worker health strip, then the task table.

Table facts (all persisted): id, instruction preview, intentType, status,
attemptCount, worker lease owner (from `TaskAttempt.metadata.lease.workerId`,
the P5 contract), createdAt, last event (type + actor), last terminal error.

- Canonical Final-8 lifecycle only (`TASK_STATUSES` from P1 core). PLANNING
  and READY do not exist and are rejected as filters (tested).
- Bounded cursor pagination: `pageSize` clamped to ≤100 (default 25), cursor
  is `createdAt|id` of the last row, strictly-older keyset (no offset scans,
  never loads the table). Stale/invalid cursor → empty page, no crash (tested).

## 6. Task Detail

`/admin/agent/tasks/[taskId]` shows: identity, type, lifecycle state,
created/updated, current attempt, attempt history (sequence, worker, error),
event timeline (seq, event, transition, actor, time), approvals (binding,
hash, expiry, use), tool executions (bounded redacted outputMeta), evidence
inspector, verification (from persisted attempt JSON), report, failure info.

The report is produced by the **canonical P5 `buildTaskReport`** — numbers are
counts of real rows, never browser-synthesized. Displayed material is labeled
by persisted evidence kind: FACT / OBSERVATION / INFERENCE / RECOMMENDATION /
UNKNOWN (see §11). No historical state is reconstructed from AI output.

## 7. Approval Queue

`/admin/agent/approvals` shows two honestly-separated sections:

1. **Canonical PENDING approval rows** (P2 `AgentApproval` on
   WAITING_APPROVAL tasks): tool, task, attempt, inputHash, hash-verified
   input summary (see below), issuedAt, expiresAt, expired badge; expired
   rows render with Approve disabled.
2. **Parked tasks without an approval row** — the executor records
   APPROVAL_REQUIRED as a FAILED `ToolExecution` and does *not* create an
   approval row on rejection (P4 fact). For these, the card lists the parked
   task and the decision binds to the recorded execution.

**Input summary provenance**: the summary is located in the attempt's
*persisted plan* and is only shown when `hashCanonicalInput(plan entry input)`
equals the approval/execution `inputHash` — a hash-confirmed match, never model
text presented as truth, capped at 200 chars.

**Approve (server action → `approveTask` command)**: reads toolName +
inputHash from the persisted parked execution (client supplies only the task
pointer), creates the approval through canonical `createApproval` (bound to
task+attempt+tool+inputHash, TTL 1h, `approvedBy` = server-side founder id),
then the canonical `APPROVAL_GRANTED` transition. Consumption is left exactly
where P4 put it: the executor's atomic validate-and-consume (single-use,
re-validated). Verified in tests: binding fields, founder identity, audit
event, and that the executor path can consume the approval exactly once.

**Reject (server action → `rejectTask` command)**: with a PENDING row, goes
through the new canonical `AgentTaskService.rejectApproval` (row-locked
PENDING select FOR UPDATE → P1 binding validation → CAS PENDING→REJECTED →
`APPROVAL_REJECTED` transition + audit event, all in one transaction).
Without a PENDING row, the decision is the canonical `APPROVAL_REJECTED`
transition through P2 (never a direct status write). Tests: task → FAILED,
no lingering PENDING approval, typed errors preserved.

The UI never implements approval semantics and never accepts an
`approved=true` flag or browser-serialized approval object. After every
action the canonical state is re-read; the UI never fakes RUNNING and never
fabricates events or evidence.

## 8. WAITING_INTELLIGENCE Resume

- Queue view lists parked tasks with the persisted `intelligenceCategory`
  (from the INTELLIGENCE_WAIT event metadata), waitingSince, last attempt
  error, and current attempt id.
- Backoff honesty: P3/P5 persist **no retry ledger**, so the UI states
  "Belum dijadwalkan otomatis — lanjutkan dengan aksi Founder (Resume)"
  rather than inventing schedule data.
- Resume action → canonical `resumeIntelligenceWait` (P3):
  INTELLIGENCE_RECOVERED → RUNNING. Tests prove: task RUNNING afterwards, the
  **current attempt continues** (same `currentAttemptId` — no new attempt),
  and the audit event is written. After resume, state is re-read from the DB.

## 9. Retry

Retry is exposed **only for FAILED** tasks and goes through canonical
`AgentTaskService.retryTask`: fresh blank-slate `TaskAttempt` (P1
`createRetryAttempt` — structurally cannot inherit decisions, verification,
evidence, tool executions, error, or metadata), task → RUNNING via optimistic
guard, RETRY event audited. Tests prove: attempt #2 with zero inherited
state, blank verification, incremented attemptCount, typed
INVALID_TRANSITION when the task is not FAILED. After retry, the DB is
re-read (the command re-reads status and attempt detail before returning).

## 10. Cancel

Cancel is exposed for PENDING / RUNNING / WAITING_APPROVAL /
WAITING_INTELLIGENCE / VERIFYING and goes through the canonical `CANCEL`
transition (core-validated, optimistic-guarded, audited; `by`/actor = founder
id, `resolvedBy` persisted). Terminal tasks → typed INVALID_TRANSITION (no
direct write exists in the command layer — tested). The frontend never runs
`UPDATE AgentTask SET status='CANCELLED'`-style writes; cancellation
semantics live entirely in P2.

## 11. Evidence Inspector

Per evidence: id, kind badge (persisted kind, verbatim), bounded claim
(≤500 chars by the P4.1 factory), source, confidence, executionId, createdAt.

- **FACT provenance chain** rendered explicitly:
  `FACT → ToolExecution <id> → <toolName> → <status> (duration)` — and the
  chain is only drawn when the persisted `executionId` actually resolves to a
  persisted SUCCEEDED execution row. A FACT without a persisted execution
  relationship renders an explicit ANOMALY warning ("melanggar integritas
  P4.1 — jangan dipercaya sebagai tool-backed") instead of being shown as
  tool-backed.
- Non-FACT kinds render "tanpa provenance tool" and never carry an
  executionId (the P4.1 factory + DB CHECK enforce this; the UI reflects it).
- No unbounded raw tool output is exposed anywhere — the DB only holds
  `redactMeta()`-bounded metadata and the UI renders that envelope.

## 12. Tool Execution Inspector

Per execution: id, tool, lifecycle status, started/finished, durationMs,
bounded outputMeta (pretty-printed, capped at 800 chars in the view),
errorCode for failures. Task/attempt context comes from the detail scope.
No secrets (P4 `redactMeta` already strips secret-named keys at write time),
no authorization data, and **no browser-side "Run Tool" exists** — tool
execution remains exclusively inside `ToolExecutor` (static checks in §17
prove neither the web layer nor the command layer imports or invokes it).

## 13. Report Inspector

Rendered from the canonical P5 `buildTaskReport` over persisted rows:
outcome, actions proposed/executed/succeeded/rejected, FACT evidence count,
verification status, warnings (persisted-row-derived, e.g. "actions never
executed", "successes without FACT"), failure reason. AI-derived objective is
labeled AI-proposed intent and is absent here because the control center does
not re-fetch raw plan JSON for display. Evidence-derived numbers are counts of
persisted rows (FACT vs OBSERVATION etc.), so an AI statement is never
upgraded to FACT by display. When nothing is available the section states it
plainly; nothing is synthesized in the browser.

## 14. Worker Health

Derived **only** from the P5 persisted contract: ACTIVE attempts on RUNNING
tasks with their `metadata.lease` (workerId) and `heartbeatAt`.

- ACTIVE: fresh heartbeat (<5 min) on an active lease.
- UNKNOWN: active lease exists but heartbeat is stale — ownership uncertain,
  recovery activity (worker-side reclaim) is the arbiter; we do not guess.
- IDLE: no active attempts on RUNNING tasks.
- **P5 regression honored**: a never-run worker is reported IDLE with an
  explicit note that the worker process itself is not observable from the
  database — never fabricated as STOPPED. `WorkerHealth` (in-process) is
  typed and exported for future embedding, but the persisted view is the
  control-plane truth (a web server process cannot see the worker's RAM).
- Shows: state, basis (observation basis, stated honestly), workerId, last
  heartbeat + seconds-since, active task link, active lease count, and an
  explanatory note. No second heartbeat mechanism was invented.

## 15. Sweeper / timer decision

Implemented: **Founder Resume** (primary, §8) plus an **opt-in, bounded
sweeper route** `GET /api/cron/agent-resume`:

- Dormant unless `BC_AGENT_SWEEPER_SECRET` is set; then requires
  `Authorization: Bearer <secret>` (repo cron convention).
- Bounded: max 10 tasks per invocation, oldest-parked first.
- Canonical-only: each item goes through `resumeIntelligenceWait` (P3) —
  no tools executed, no approvals bypassed, no attempts created, no direct
  status writes; concurrency-safe because the transition is core-validated
  with an optimistic guard (a moved task is a typed no-op skip).
- **Deliberately NOT wired into `vercel.json`**: adding the cron schedule
  changes production behavior and belongs to an explicit founder/ops
  decision (also note `vercel.json` is shared with parallel workstreams).
  Documented follow-up: add `{"path":"/api/cron/agent-resume","schedule":"*/10 * * * *"}`-style
  entry once the founder wants automatic resume.

## 16. Security model

Adversarial checks (Phase 14 items 1–12) — verified by tests A/S/P/Q/R plus
construction:

1. Unauthenticated cannot read Agent data — layout + per-page `getUser()`
   gate redirects to `/login`; queries are only reachable from gated pages.
2. Unauthorized (non-founder) — redirected to `/admin`; gate predicate
   `isFounder || role==="ADMIN"` identical to the existing admin boundary.
3–6. Approve/reject/resume/retry/cancel — each command runs
   `authorizeFounder()` first; the integration suite drives all five with a
   denial gate and proves NOT_FOUNDER + zero state change.
7. Founder impersonation — identity comes from the server-verified Supabase
   session joined to Prisma User; no identity field exists in any client
   contract (static check).
8. Ownership injection — commands accept only a task id pointer; all binding
   data (attempt, tool, inputHash) is read from persisted rows.
9. Approval-binding bypass — approve binds to the parked execution's
   recorded `inputHash`; the executor re-validates and atomically consumes;
   rejectApproval validates the full binding before CAS.
10. Direct tool execution — impossible: no ToolExecutor import/invocation in
    the web layer or command layer (static checks P).
11. Fabricated evidence — no web-layer writes to ToolEvidence/ToolExecution
    (static check Q covers all Agent-table writes); sweeper check R.
12. Direct lifecycle mutation — no web-layer Prisma writes to Agent tables;
    every state change flows through P1-validated transitions.

Content safety: all rendered content is React text-node output (auto-escaped);
zero `dangerouslySetInnerHTML` in the control plane (static check). External
and model content is DATA. Destructive actions (reject/retry/cancel) require
a two-step confirmation click; approve/resume are single-click but every
action surfaces the canonical typed error/result text afterward.

## 17. Tests

`scripts/test-bc-agent-p6-control.ts` — **87/87 PASS** (`npm run
test:bc-agent-p6-control`), two layers:

- **Integration** (local staging PostgreSQL only, localhost safety gate
  identical to P2/P5 — refuses non-localhost hosts): B/C listing +
  pagination (ordering, no page overlap, stale cursor, filter validity,
  clamp), D detail, F approve (canonical create+transition+binding+identity+
  audit+single-use consumption by the executor path), G reject (canonical
  service, no lingering PENDING), H invalid-approval typed errors
  (INVALID_TRANSITION / TASK_NOT_WAITING_INTELLIGENCE / TASK_NOT_FOUND),
  I resume (current attempt continues), J retry (fresh attempt, zero
  inherited state, blank verification), K cancel (resolvedBy, audit,
  terminal-refusal), L/M evidence + FACT provenance chain + agent-FACT
  downgrade, N report from persisted rows, O worker health (lease/heartbeat
  derivation, honest notes, no fabricated STOPPED), S unauthorized
  rejection of all five commands with untouched state.
- **Static security** (source-level): A route authorization on all pages,
  P no ToolExecutor, Q no direct lifecycle mutation, R no
  `dangerouslySetInnerHTML` + sweeper guardrails (secret-gated, canonical
  resume only, never executes tools or fabricates evidence).

## 18. Gate results

| Gate | Result |
|---|---|
| `npm run typecheck` (tsc --noEmit) | ✅ 0 errors |
| `npm run lint` (eslint) | ✅ 0 problems |
| `npm run build` | ✅ Compiled successfully, 423 pages; `/admin/agent`, `/admin/agent/approvals`, `/admin/agent/tasks/[taskId]` registered as dynamic |
| `npm run test:bc-agent-p6-control` | ✅ 87/87 |
| `npm run test:bc-agent-p1-core` | ✅ 183/183 |
| `npm run test:bc-agent-p2-persistence` | ✅ 59/59 |
| `npm run test:bc-agent-p3-intelligence` | ✅ 89/89 |
| `npm run test:bc-agent-p4-tools` | ✅ 145/145 |
| `npm run test:bc-agent-p5-worker` | ✅ 64/64 |
| `npm run test:ai-bc-architecture` (BC AI) | ✅ 28/28 |
| `npm run test:rpg-vertical-slice` (RPG) | ✅ 32/32 |
| `npm run test:rpg-asset-integration` (RPG, parallel actor's modified area) | ✅ 47/47 |
| `npm run test:kuis-tempur-world` (Kuis Tempur) | ✅ 93/93 |

## 19. Exact files changed

**Created (P6):**

- `src/agent/persistence/queries.ts` — canonical read boundary (list/detail/
  queues/health/summary, bounded DTOs)
- `src/agent/control/auth.ts` — `authorizeFounder()` server-side predicate
- `src/agent/control/service.ts` — canonical `AgentTaskService` factory
- `src/agent/control/commands.ts` — approve/reject/resume/retry/cancel commands
- `src/agent/control/index.ts` — barrel
- `app/(dashboard)/admin/agent/layout.tsx` — server-side founder gate
- `app/(dashboard)/admin/agent/page.tsx` — Task Command Center
- `app/(dashboard)/admin/agent/approvals/page.tsx` — Approval Queue
- `app/(dashboard)/admin/agent/tasks/[taskId]/page.tsx` — Task Detail
- `app/(dashboard)/admin/agent/actions.ts` — "use server" actions
- `app/(dashboard)/admin/agent/_components/ui.tsx` — badges + confirm-guarded
  ActionButton (client)
- `app/(dashboard)/admin/agent/_components/task-table.tsx` — task table (client)
- `app/(dashboard)/admin/agent/_components/worker-health-card.tsx` — health
  panel (client)
- `app/api/cron/agent-resume/route.ts` — env-gated bounded sweeper
- `scripts/test-bc-agent-p6-control.ts` — P6 test suite (87 assertions)
- `docs/BC_AGENT_P6_CONTROL_CENTER_REPORT.md` — this report

**Modified (P6):**

- `src/agent/persistence/service.ts` — one addition: canonical
  `rejectApproval` (binding-validated, row-locked, CAS single-use, task
  transition + audit event in one transaction) + the `rejectApproval` import
  from the pure P1 core (which already exported it).
- `package.json` — +1 script line: `test:bc-agent-p6-control`.

## 20. Diff scope

`git status --short` / `git diff --stat` inspected file-by-file. P6's total
tracked-file delta: `package.json` (+2 lines, of which 1 is mine — the P5
actor's `test:bc-agent-p5-worker` line was already uncommitted in the working
tree before this phase) and `src/agent/persistence/service.ts` (+99, entirely
the `rejectApproval` method + import). All other modified/untracked paths
(`scripts/test-rpg-asset-integration.ts`,
`src/game/rpg/rendering/rpg-asset-manifest.ts`,
`public/game/Pendekar Suryakerta-BC/`, `src/game/rpg/legacy/`,
`public/game/rpg/characters/`, `docs/question-bank-pilot/*`, `src/agent/worker/`,
`scripts/test-bc-agent-p5-worker.ts`, etc.) belong to parallel workstreams and
were **not touched**. No resets, checkouts, stashes, cleans, or reverts were
run. No credentials touched; no production migration applied (the P6 schema
requires **zero** migration — all reads use existing columns).

## 21. Screens / UX implemented

1. **Command Center** — status tile hierarchy, attention-required panel,
   worker health strip, filterable task table with cursor pagination,
   approvals entry point.
2. **Task Detail** — identity header with lifecycle badges + contextual
   actions; verification; attempt history; event timeline; approvals;
   tool executions; evidence inspector with FACT provenance chain; report.
3. **Approval Queue** — decision cards with binding details, expiry badge,
   hash-verified input summary, confirm-guarded approve/reject.
4. **Worker Health** — state dot (AKTIF / TIDAK PASTI / IDLE), worker id,
   heartbeat timing, active task link, observation-basis note.

Design: calm iOS-inspired mission-control aesthetic consistent with the
existing admin panel (rounded-2xl cards, slate palette, dark-mode support,
lucide icons, minimal animation — a single spinner on actions only). All UI
copy is Bahasa Indonesia; status/event identifiers remain canonical English
tokens (FACT, RUNNING, APPROVAL_GRANTED) because they are machine contract
values, displayed verbatim.

## 22. Known limitations

1. **Browser verification not performed** — no interactive browser session
   was available in this environment. UI behavior is verified by integration
   tests of the exact query/command functions the pages call, static security
   checks, typecheck, build, and route registration. Per brief §18 this is
   stated honestly: no claim of visual/browser verification is made.
2. Worker health is derived from persisted leases/heartbeats only; the worker
   process itself (PID, uptime, host) is not observable from the web plane —
   shown honestly as basis + note rather than invented.
3. Approval input summaries appear only when the binding can be hash-verified
   against the persisted plan; otherwise the card shows the inputHash (the
   honest fallback).
4. The sweeper is implemented but not scheduled (deliberate; §15).
5. `WAITING_INTELLIGENCE` resume returns the task to RUNNING, but the running
   worker (if any) claims PENDING tasks only; a resumed task is picked up
   when its current attempt is re-adopted — the same P5 §31.5 limitation,
   now surfaced through the control center rather than hidden.
6. No in-app "create task" surface in P6 (control plane, not intake); tasks
   enter via the existing creation path.

## 23. Production readiness

Ready for founder use on the read paths and all five command paths. To
operate in production: (1) set the founder flag/role for the operator
account (existing mechanism), (2) optionally set `BC_AGENT_SWEEPER_SECRET`
and add the cron entry if automatic resume is wanted, (3) the worker itself
still needs the P5 ops step (containerized deploy) before queues become
live. No DB migration is required. Rollback = remove the `app/(dashboard)/admin/agent/`
tree + `app/api/cron/agent-resume/`; the service-layer addition is additive
and unused by the rest of the app.

## 24. P7 recommendation

1. **Telegram channel adapter** (P5 §33) — founder intent intake + approval
   notifications, reusing the same command layer (`approveTask`, …) so the
   approval contract stays identical across surfaces.
2. **Containerized worker deploy** (`Dockerfile.worker`) + a
   worker-liveness registry row so health can report process truth, not just
   lease inference.
3. **Scheduling the sweeper** (single cron entry) once automatic resume is
   desired, with a bounded resume-rate metric added to the command center.
4. **Credential provisioning** for `github.read`/`vercel.read` (P4 §16
   standing item) and the first WRITE-class tool behind the now-proven
   approval flow.
5. **Durable `AgentMemory`** blueprint pass (P5 §33 open design decision)
   before any cross-task learning features.
