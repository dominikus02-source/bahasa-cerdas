# BC Agent — P0 Blueprint & Architecture (V0.1)

> **Status**: BLUEPRINT ONLY — no production code was modified in this phase.
> **Date**: 2026-09-11
> **Branch inspected**: `deploy-pk` (working tree carries pre-existing unrelated modifications — RPG rendering files and `package.json` — which this document does not touch).
> **Evidence standard**: every repository claim below is tagged FACT (inspected in this session), INFERENCE (derived from facts), or RECOMMENDATION (design judgment). Claims about Hermes are tagged INFERENCE-BRIEF (derived from the founder's Hermes audit summary, NOT from repository code — see §2.3).

---

## 1. Executive Summary

**What BC Agent is**: a proprietary, founder-facing autonomous operating agent for BahasaCerdas.com — a "digital fourth team member" that accepts instructions via Web Control Center and Telegram, turns them into governed tasks, executes them with audited tools, verifies results with evidence, and reports back. The Agent Core — not the AI — owns task state, permissions, tool execution, approval, evidence, verification, and completion.

**Key architecture decisions (summary; details in referenced sections)**:

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Modular monolith** in the existing Next.js monorepo (`src/agent/*`), not microservices | Repo already runs one deployable (Vercel) + one worker process is the minimum viable topology; the repo's own `lib/ai-queue.ts` proves the DB-queue pattern works here |
| D2 | **Reuse the existing BC AI provider layer** (`src/ai/core/provider.ts`) behind a thin `IntelligenceProvider` port | It already implements multi-provider fallback, key rotation, model chains, stream watchdogs, and error sanitization — rebuilding this would be waste and divergence |
| D3 | **PostgreSQL (Supabase) is the durable queue and state store**; Upstash Redis used only for locks/leases/heartbeat | Founder's own brief says "AI bukan source of truth — Agent Core yang menentukan"; Postgres gives transactional state+queue consistency that Redis lacks; Supabase is already the system of record with backups (Phase 9 policy) |
| D4 | **8-state task lifecycle** (down from the 10 proposed) with attempt-scoped retry: every retry creates a fresh `TaskAttempt` and stale decisions/verifications/evidence are never carried over | Directly addresses the Hermes "retry state contamination" defect class |
| D5 | **Default-deny governance**: L0–L3 autonomy ladder, single-use expiring approvals bound to (task, tool, input-hash) | Founder remains ultimate authority; approval cannot be replayed across tasks (fixes Hermes "approval hierarchy/binding issues" class) |
| D6 | **Evidence claims typed** as FACT / OBSERVATION / INFERENCE / RECOMMENDATION / UNKNOWN; "DONE" is forbidden without verification evidence where verification applies | Makes agent reports auditable by construction |
| D7 | **Telegram is a channel adapter only**; Web is a channel adapter only; both speak to one Agent API | Prevents the Hermes "Telegram dual-path divergence" defect class |
| D8 | **OpenCode (or any coding engine) is an optional, replaceable execution engine** behind a `CodingEngine` port; it never holds credentials, approvals, memory, or governance | No permanent dependency; the engine is swappable (RECOMMENDATION) |
| D9 | **Local Mac ExecutionNode is an outbound-only poller** with per-node token, capability allowlist, command allowlist, and audit trail — default deny | Cloud agent gets no unrestricted laptop access by construction |

**What we are NOT building** (see §26): a generic agent framework, a copy of Hermes, a multi-agent swarm, Kubernetes, a second AI provider ecosystem.

---

## 2. Existing BC Architecture Findings

### 2.1 Repository topology (FACT — inspected)

| Path | Role | Evidence |
|------|------|----------|
| `app/` | Next.js App Router; API route handlers incl. `app/api/ai/*`, `app/api/cron/*` | `ls app/api/` → admin, ai, auth, cron, game, health, … |
| `src/ai/` | Product AI layer: agents, core runner, prompts, schemas, tools, evaluators, export | `ls src/ai/` → agents, bc, core, evaluators, export, index.ts, prompts, schemas, tools |
| `src/game/rpg/` | Production RPG (separate product track; out of scope for BC Agent) | prior phases 1A–1E commits |
| `lib/` | Business logic; includes `lib/ai-queue.ts`, `lib/ai-concurrency.ts`, `lib/redis.ts`, `lib/db.ts`, `lib/security.ts` | `ls lib/` |
| `prisma/schema.prisma` | 90+ models incl. `AIJob` (L871), `AIUsage` (L1387) | grep + read |
| `scripts/` | Operational scripts; `test-*.ts` convention run via `npx tsx` | `ls scripts/` → test-ai-agents.ts, test-ai-bc-*.ts, … |
| `docs/` | 236 phase documents; the established decision-record convention | `ls docs/ \| wc -l` → 236 |
| `game-server/` | Legacy socket.io server (VPS dead; out of scope) | AGENTS.md, prior audits |
| `vercel.json` | `"regions": ["sin1"]` + 8 cron entries hitting `/api/cron/*` | read vercel.json |

**INFERENCE**: the repo's deployment reality is (1) Vercel for web/API with Singapore region co-located with Supabase, (2) Supabase PostgreSQL, (3) Upstash Redis (REST client in `lib/redis.ts`), (4) Vercel cron for scheduled jobs, (5) no persistent compute anywhere (the old VPS died and was never replaced). BC Agent must fit into this — one small persistent worker is the only genuinely new infrastructure.

### 2.2 Existing BC AI findings (FACT — inspected `src/ai/core/provider.ts`, `agent-types.ts`, `src/ai/bc/*`)

- **Providers**: DeepSeek, Groq, Gemini implemented. **Active chain = Groq only** per founder decision STEP 5.1.3 recorded in code (`loadPriority()` returns `["groq"]`); DeepSeek/Gemini remain as dormant code. Model chain per provider: Groq `gpt-oss-120b → gpt-oss-20b`.
- **Resilience already solved**: multi-key round-robin rotation (comma-separated env keys), `callWithFallback` iterating provider→model→key, stream watchdog (connect 30s / idle 60s / total 280s), `ProviderStreamInterruptedError` that prevents splicing two partial responses across providers, `ProviderChainFailedError` aggregating sanitized errors.
- **Security posture already correct**: server-side env keys only, errors sanitized before client, `ProviderHttpError`/`ProviderEmptyError` typed internally.
- **Agent contract exists**: `AgentDefinition` in `src/ai/core/agent-types.ts` — zod input/output schemas, workflow steps, quality checklist, safety rules, `AgentRunContext`, `AgentRunResult` with usage/cost/latency. Nine agents registered (rpp, soal, bc-assistant, review, eyd, feedback, grading, mentor, text-analysis). Usage logging to `AIUsage` via `usage-logger.ts`.
- **BC persona knowledge**: `src/ai/bc/knowledge.ts` (exports `buildBcKnowledgeBlock`, `BC_KNOWLEDGE_MAX_CHARS = 3400`) + `personas.ts`.
- **Job queue precedent**: `lib/ai-queue.ts` implements a Postgres-backed queue over the `AIJob` model (PENDING → PROCESSING → COMPLETED/FAILED) with atomic claim via transaction. **Known limitation (FACT from code)**: `claimJob` is not safe under concurrency races (find-then-update, not `FOR UPDATE SKIP LOCKED`); BC Agent must use a stronger claim primitive.
- **Cache/coordination precedent**: `lib/redis.ts` is an Upstash REST client with graceful null-fallback when unconfigured — good defensive pattern to imitate, but it is cache-shaped only (no locks/streams yet).
- **Scheduled work precedent**: Vercel crons (`vercel.json`) hitting `/api/cron/*` — HTTP-triggered, short-lived, no long-running capability.

**INFERENCE**: BC Agent can reuse the provider layer directly — but the existing `AgentDefinition` contract is *product-facing* (single synchronous request→result for guru/murid tools). The agent needs a *task-facing* contract: multi-step, stateful, resumable, governed. Therefore: reuse the provider layer; do NOT reuse `AgentDefinition` as the task engine; wrap it.

### 2.3 Hermes findings (INFERENCE-BRIEF — no Hermes code exists in this repository)

A full-text search for "hermes" across `*.md`, `*.ts`, `*.tsx`, `*.json` returns exactly one hit: a string inside a data backup file (`backups/current/2026-08-05-15-14/StudentKarya.json` — a false positive, likely user content). **FACT: Hermes is not part of this codebase.** Its audit lives out-of-band. Consequently, the §22 migration matrix is built against the defect and capability list supplied in the founder's brief, and every "MIGRATE" action there means "recreate the concept, cleansed of the documented defect," not "move code."

---

## 3. Target Architecture

### 3.1 Evaluated proposal (from brief) and improvements

The brief's diagram (Founder → Web/Telegram → Core → THINK/WORK/REMEMBER → Tools → Verify → Report) is structurally sound. Improvements:

1. **Single Agent API, two channels.** Web and Telegram both become thin channel adapters over one authenticated API. No channel may execute tools directly. (Fixes dual-path divergence class.)
2. **Worker is a separate process, not a Vercel function.** Vercel cannot host long-running tasks; the worker is one Docker process on a small VPS. It runs the *same* monorepo code (`src/agent/*`) — one codebase, two processes.
3. **Queue lives in Postgres, coordination in Redis.** Postgres guarantees state transitions are transactional with task/event rows (auditable by construction); Redis provides distributed locks (worker leader), job wake-up signals, and heartbeats with TTL — the things Postgres is bad at. This avoids a second source of truth for task state.
4. **THINK is a component, not a peer.** Intelligence is called by the Core through a port; an intelligence outage degrades tasks to `WAITING_INTELLIGENCE` instead of crashing anything.
5. **VERIFY is mandatory before COMPLETED.** The lifecycle makes verification a state, not an afterthought.

### 3.2 Target diagram

```
Founder
  ├── Web Control Center (Vercel)  ──┐
  └── Telegram Bot                  ──┤
                                     ▼
                              AGENT API (Vercel route handlers)
                        auth: founder identity + channel adapter tokens
                                     │
                    writes tasks/approvals; reads reports/evidence
                                     │
                                     ▼
              ┌────────────── SUPABASE POSTGRES ──────────────┐
              │  AgentTask · TaskAttempt · TaskEvent ·        │
              │  ToolExecution · Approval · Evidence ·        │
              │  AgentMemory · AgentSession · ExecutionNode · │
              │  ScheduledJob                                 │
              └───────────────┬───────────────────────────────┘
                              │ claim (FOR UPDATE SKIP LOCKED)
                              ▼
                    WORKER (VPS Docker, 1 process)
                    BC AGENT CORE  = task engine + policy +
                    approval + tool registry + evidence + verify
                       │            │              │
                 INTELLIGENCE     TOOLS          MEMORY
                 (port → src/ai   (github,       (3 layers,
                  core provider)  vercel,        provenance-
                       │          supabase,      gated)
                       │          research)      │
                       ▼              ▼           ▼
                 WAITING_INTELLIGENCE │       AgentMemory
                 on provider failure  │
                                      ▼
                        EXECUTION NODES (optional, outbound-only)
                        local Mac: terminal/git/fs/build/test
                                      │
                                      ▼
                                 VERIFY → REPORT → Founder
         Upstash Redis: worker lock, heartbeat TTL, wake-up signal
```

---

## 4. Agent Core

**Responsibility** (FACT-grounded on the founder's principle "AI bukan source of truth"): the Core owns task state machine transitions, policy evaluation, approval binding, tool execution and timeouts, evidence capture, verification, and completion. AI models propose; the Core disposes.

**Module boundaries** (RECOMMENDATION, adapted to existing repo conventions):

```
src/agent/
  core/        agent-core.ts       — orchestration loop (claim → run → verify → report)
  task/        task-engine.ts, task-lifecycle.ts, attempt.ts
  policy/      policy.ts           — L0–L3 evaluation, pure function (riskLevel, action) → decision
  approval/    approval-service.ts — create/bind/consume/expire approvals
  tools/       registry.ts, tool-types.ts, … (one file per tool)
  evidence/    evidence-service.ts — typed claims, source capture
  verification/verify.ts          — per-task-type verification strategies
  memory/      memory-service.ts   — 3 layers, provenance gates
  intelligence/intelligence-provider.ts — port over src/ai/core/provider.ts
  coding/      coding-engine.ts    — port (OpenCode adapter optional)
  channels/    agent-api handlers shared by Web/Telegram adapters
  worker/      worker-loop.ts, claim.ts, heartbeat.ts
  execution/   execution-node protocol types, dispatch, result intake
  reporting/   report-builder.ts   — assembles evidence-cited reports
```

**Invariants**:
- Core is deterministic with respect to inputs: given the same task state + tool results + intelligence outputs, transitions are reproducible.
- Every state transition writes a `TaskEvent` row in the same transaction. (Auditable by construction.)
- Core never calls provider SDKs directly — only through `IntelligenceProvider`.
- Core never trusts instruction text embedded in external content (§19).

---

## 5. IntelligenceProvider (port)

**Reuse decision (FACT-based)**: `src/ai/core/provider.ts` already provides `callWithFallback` (provider→model→key chain), `streamProviderText` with watchdog, key rotation, typed sanitized errors, and the founder's Groq-only active chain. BC Agent wraps it — no second ecosystem.

```ts
// src/agent/intelligence/intelligence-provider.ts (design sketch)
export interface IntelligenceRequest {
  purpose: "plan" | "analyze" | "summarize" | "draft" | "extract";
  systemPrompt: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  jsonMode?: boolean; // enforced via prompt + parser, matching existing STEP 5.1 practice
}
export interface IntelligenceResult {
  content: string;
  provider: string; model: string;
  latencyMs: number;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}
export interface IntelligenceProvider {
  complete(req: IntelligenceRequest): Promise<IntelligenceResult>;
  health(): Promise<{ ok: boolean; activeChain: string[] }>;
}
```

**Failure semantics (RECOMMENDATION)**: `ProviderChainFailedError` (existing, FACT) is caught by the Core → task moves to `WAITING_INTELLIGENCE` with `TaskEvent(reason="provider_chain_failed")`, retry with exponential backoff capped (e.g. 5 attempts / 30 min), then `FAILED` with an evidence record of the provider errors. **AI unavailability never crashes the worker** — it is a task-level waiting state, exactly as the brief requires.

**Security concerns inherited (FACT)**: keys are read from env server-side; the existing layer never logs keys; BC Agent adds: provider outputs are *untrusted content* (§19) — they can propose tool calls but never trigger them directly; only the Core, after policy evaluation, executes tools.

---

## 6. CodingEngine (port)

**What OpenCode should handle** (if adopted later): executing concrete code-change jobs inside a sandboxed clone — reading the repo, editing files, running builds/tests, producing a diff/branch. Its value is interaction richness with a working tree, not judgment.

**What BC Agent Core always handles**: task intake, instruction interpretation, planning, approval, credential injection boundaries, evidence capture, verification strategy selection, reporting. These are governance functions and must never live inside an external engine.

**What must NEVER be delegated to OpenCode** (RECOMMENDATION):
- Holding long-lived credentials (GitHub tokens, Supabase service keys) — credentials are injected per-job, scoped, and never persisted by the engine
- Approving its own work — approval flow is Core-owned; engine output is *proposed* state
- Writing to `main` / production config / migration SQL directly
- Accessing the founder's Mac outside an ExecutionNode job with explicit capabilities
- Memory writes — an engine cannot rewrite organizational memory

**Security boundary (RECOMMENDATION)**: engine runs on a disposable worktree (`git worktree` per attempt) on the worker VPS or ExecutionNode; network egress allowlisted; output contract = `{ branch, diffSummary, testResults, artifacts[] }`; the Core verifies (build/typecheck/tests results are evidence, not claims) and creates a PR via `github.create_pr` (L2, approval-gated). Abstraction:

```ts
export interface CodingEngine {
  id: "opencode" | "bc-internal";
  apply(job: CodingJob, ctx: EngineContext): Promise<CodingResult>; // ctx carries scoped, time-boxed credentials
}
```

---

## 7. Task Engine

### 7.1 Lifecycle — proposed 10 states evaluated and simplified

Brief proposed: PENDING, PLANNING, READY, RUNNING, WAITING_APPROVAL, WAITING_INTELLIGENCE, VERIFYING, COMPLETED, FAILED, CANCELLED.

**Simplification (RECOMMENDATION)**: PLANNING and READY are collapsed into RUNNING — a plan is an *artifact* (Evidence of type RECOMMENDATION + a plan document on the attempt), not a state; states that only describe "what the worker is doing" invite transition-gap defects (the Hermes class). Final 8:

| State | Meaning |
|-------|---------|
| `PENDING` | created from instruction, not yet claimed |
| `RUNNING` | claimed; includes planning and tool execution |
| `WAITING_APPROVAL` | policy blocked on founder approval |
| `WAITING_INTELLIGENCE` | provider chain failed or budget-limited; backoff |
| `VERIFYING` | work done; verification strategy executing |
| `COMPLETED` | verified + report built (or verification N/A recorded) |
| `FAILED` | terminal: exhausted retries or verification failed |
| `CANCELLED` | terminal: founder cancelled (allowed from any non-terminal state) |

### 7.2 Legal transitions

```
PENDING → RUNNING | CANCELLED
RUNNING → WAITING_APPROVAL | WAITING_INTELLIGENCE | VERIFYING | FAILED | CANCELLED
WAITING_APPROVAL → RUNNING (approved) | CANCELLED (rejected or expired→FAILED)
WAITING_INTELLIGENCE → RUNNING (retry) | FAILED (backoff exhausted) | CANCELLED
VERIFYING → COMPLETED | FAILED | RUNNING (verification found defects; one bounded rework cycle)
COMPLETED / FAILED / CANCELLED → (terminal)
```

A transition table is enforced in `task-lifecycle.ts`; illegal transitions throw and are logged as `TaskEvent(type="illegal_transition")` — belt and suspenders against event transition gaps.

### 7.3 Retry semantics — clean deterministic state

Retry = **new `TaskAttempt` row** (attemptNo+1). Carried across attempts: task intent, instruction, and explicitly whitelisted context. NOT carried: prior attempt's plan, decisions, verification results, evidence, tool outputs, partial state. Each attempt starts by re-deriving its plan from the task intent. This is the structural fix for Hermes retry-state contamination. Retry budgets are per task (default 3) and per state (`WAITING_INTELLIGENCE` backoff separate).

---

## 8. Tool System

```ts
export type RiskLevel = "READ" | "ANALYZE" | "WRITE" | "HIGH_RISK";
export interface ToolDefinition {
  name: string;                       // "github.read"
  description: string;
  risk: RiskLevel;
  reversible: boolean;
  requiresApproval: boolean;          // derived from policy, but declared explicitly
  inputSchema: z.ZodTypeAny;          // zod, matching src/ai conventions
  outputSchema: z.ZodTypeAny;
  timeoutMs: number;
  audit: "NONE" | "SUMMARY" | "FULL_IO";
  idempotent: boolean;
  execute(input: unknown, ctx: ToolContext): Promise<ToolResult>; // ctx injects scoped creds per call
}
```

Initial toolset (proposed only — not implemented this phase):

| Class | Tools | Autonomy default |
|-------|-------|------------------|
| READ | `github.read`, `github.search`, `vercel.read`, `supabase.read` (read-only SQL role), `repo.read`, `filesystem.read` | L0 allowed |
| ANALYZE | `repo.audit`, `database.audit`, `deployment.audit`, `qa.run` (test suites), `research.search` | L1 allowed |
| WRITE | `repo.edit`, `github.create_pr`, `vercel.deploy` (preview), `database.migrate` (dry-run first) | L2, approval required |
| HIGH_RISK | `database.destructive`, `production.deploy`, `credential.rotate`, `financial.action`, `public.communicate` | L3, explicit approval, single-use |

Rules: every tool call creates a `ToolExecution` row (input hash, output ref, duration, status); tool credentials are per-call scoped (e.g. `supabase.read` uses a read-only Postgres role — RECOMMENDATION to create one; FACT: none exists today); a tool may not invoke other tools; timeouts kill the subprocess/connection and mark the execution `TIMEOUT`.

---

## 9. Approval / Governance

**Autonomy ladder** (as proposed in brief, kept — it maps cleanly to the tool risk classes):

- **L0 OBSERVE** — READ tools, always allowed, fully audited
- **L1 ANALYZE/PRODUCE** — ANALYZE tools + drafts/plans/reports, allowed
- **L2 CONTROLLED REVERSIBLE ACTION** — WRITE tools, approval required; must be reversible (branch, preview deploy, dry-run first)
- **L3 APPROVED PRODUCTION ACTION** — HIGH_RISK tools, explicit founder approval, single-use, never batched

Defaults: READ/ANALYZE/PROPOSE allowed; WRITE/destructive/financial/credential/public-communication require approval.

**Approval object (RECOMMENDATION)**:

```
Approval { id, taskId, toolName, inputHash, scope, expiresAt, consumedAt, consumedByExecutionId, createdAt }
```

- **Task binding + tool binding**: an approval is valid only for the (taskId, toolName) pair and only for the exact input hash — approval cannot be replayed on a different task or mutated input (fixes Hermes approval-binding class).
- **Expiration**: default TTL 60 minutes; expired approvals transition task to `FAILED` with `TaskEvent(reason="approval_expired")` (configurable per risk class).
- **Single use**: consuming sets `consumedAt` + execution id atomically.
- **Audit trail**: approval creation, consumption, expiry are all `TaskEvent`s; approvals are never deleted.
- **Hierarchy kept deliberately simple**: Founder is the single approver. No role ladder, no delegate approvals (Hermes complexity avoided without justification).

Founder-facing verbs: approve / reject / retry / cancel — available on both channels.

---

## 10. Evidence / Verification

**Evidence model** — every important claim is stored as a typed record:

```
Evidence {
  id, taskId, attemptId, toolExecutionId?,
  claimType: "FACT" | "OBSERVATION" | "INFERENCE" | "RECOMMENDATION" | "UNKNOWN",
  statement: string,
  source: { kind: "tool" | "intelligence" | "founder" | "system", ref: string }, // e.g. tool name + output URL
  confidence: number,       // 0–1; FACT/OBSERVATION = 1.0, others ≤ 0.9
  capturedAt: timestamp
}
```

**Hard rule (RECOMMENDATION)**: a task cannot enter `COMPLETED` unless, for every verification-applicable objective, an Evidence of type FACT with source `kind="tool"` exists. The report builder renders "DONE" claims as "DONE (verified)" vs "DONE (unverified)" — the latter surfaces prominently. This directly encodes the founder's demand that the agent never report DONE without verification where applicable.

**Verification strategies per task type** (declared at task creation): `none` (pure analysis — then report must label conclusions as INFERENCE), `test-suite` (run specified `scripts/test-*.ts` — repo convention, FACT), `build-check`, `url-probe`, `db-query-match` (expected row/state), `diff-review` (founder eyeballs the PR). Failed verification → bounded rework cycle (VERIFYING → RUNNING once) → FAILED with evidence of what failed.

---

## 11. Memory

Three layers, with provenance gates to avoid uncontrolled AI-generated "facts":

| Layer | Store | Lifetime | Writes |
|-------|-------|----------|--------|
| **Working memory** | in-process on the attempt (TaskAttempt.context JSON) | one attempt | free |
| **Task memory** | `AgentTask.summary` + Evidence rows | task lifetime | Core-written, auto |
| **Persistent organizational memory** | `AgentMemory` rows | indefinite | **provenance-gated** |

**Persistent memory capture**: founder decisions, architecture decisions, product principles, operational rules, known constraints. Writes originate from: (a) founder statements explicitly marked/recognized as decisions, or (b) agent proposals. Path (b) lands as `status="PROPOSED"` and becomes `CANONICAL` only on founder approval (in Control Center: a "Memory proposals" list). Every row records provenance (`sourceType: FOUNDER | AGENT | DOC`, `sourceRef`, `approvedBy`, `approvedAt`). Retrieval is deterministic (tag/type filters first; semantic search later, optional). Nothing the AI "remembers" silently becomes canon.

---

## 12. Database Design (Supabase/PostgreSQL — Prisma models planned; NO migration SQL in this phase)

Minimum viable set — 10 models, each justified:

| Model | Purpose | Key fields | Indexes | Relationships / retention |
|-------|---------|-----------|---------|---------------------------|
| `AgentTask` | the unit of founder intent | id, instruction, intentType, status, priority, channel, createdBy, currentAttemptId?, createdAt/updatedAt | `(status, priority, createdAt)` claim index; `(createdBy, createdAt)` | has many attempts/events/evidence; keep indefinitely (it is the org's work log) |
| `TaskAttempt` | one deterministic execution pass | id, taskId, attemptNo, status, planJson?, startedAt, finishedAt, failureReason? | `(taskId, attemptNo)` unique | retry isolation boundary |
| `TaskEvent` | append-only transition/audit log | id, taskId, attemptId?, type, payloadJson, createdAt | `(taskId, createdAt)` | append-only; partition/prune > 12 mo optional |
| `ToolExecution` | every tool call | id, taskId, attemptId, tool, risk, inputHash, inputJson?, outputRef?, status, durationMs, createdAt | `(taskId, createdAt)`, `(tool, status, createdAt)` | FULL_IO outputs to object storage after 30 days; row retained |
| `Approval` | single-use expiring permission | id, taskId, toolName, inputHash, scope, expiresAt, consumedAt?, consumedBy? | `(taskId, status)`, partial index on unconsumed | retained for audit |
| `Evidence` | typed claims | id, taskId, attemptId, claimType, statement, sourceJson, confidence, capturedAt | `(taskId, capturedAt)`, `(claimType)` | retained with task |
| `AgentMemory` | canonical org memory | id, kind (DECISION/PRINCIPLE/RULE/CONSTRAINT), content, status (PROPOSED/CANONICAL/SUPERSEDED), sourceType, sourceRef, approvedBy?, approvedAt? | `(kind, status)` | supersede, never delete |
| `AgentSession` | channel conversation continuity | id, channel, externalRef (tg chat/thread / web session), lastSeenAt, stateJson? | `(channel, externalRef)` unique | rolling 90-day prune of stateJson |
| `ExecutionNode` | registered local execution nodes | id, name, tokenHash, capabilities[], status, lastHeartbeatAt, registeredAt | `(status, lastHeartbeatAt)` | auto-deregister after 30d offline |
| `ScheduledJob` | cron-like recurring tasks | id, name, schedule, taskTemplateJson, enabled, lastRunAt, nextRunAt | `(enabled, nextRunAt)` | history via AgentTask rows |

Deliberately **not** created: per-tool result tables, agent metrics cubes (reuse `AIUsage` pattern — FACT it exists — for provider usage), a separate "notification" table (channel adapters poll task state).

---

## 13. Worker Architecture

**Topology (RECOMMENDATION — simplest production-worthy)**:

- **One worker process** (Docker, small VPS in Singapore — same region as Supabase sin1) running the agent loop: claim task (`SELECT … FOR UPDATE SKIP LOCKED`) → execute → verify → report → repeat.
- **Upstash Redis roles** (already in stack — FACT `lib/redis.ts`): worker leader lock (one active worker; second instance is cold standby), heartbeat key with TTL (worker health), wake-up signal (LISTEN/notify substitute: web API publishes "task created" to shorten latency; the loop also polls as fallback).
- **Why not Vercel for the worker**: functions are time-limited; agent tasks exceed that by design. Why not queue-in-Redis as source of truth: task state must be transactional with events/evidence (§12). Why not Kubernetes/microservices: one process, one queue, one DB — modularity is achieved at package level (§23).

**Failure handling**: worker crash mid-task → attempt stays RUNNING past lease timeout → next claim expires the lease and creates a fresh attempt (clean-state retry, §7.3). Heartbeat missing > 2 min → Control Center shows worker down. Provider down → WAITING_INTELLIGENCE (§5). DB down → worker idles with backoff; tasks unaffected (they live in the DB).

---

## 14. ExecutionNode (local Mac)

**Design**: outbound-only. The Mac runs a tiny poller (`bc-exec-node`); it makes HTTPS long-poll requests *to* the Agent API, never accepts inbound connections. Registration: one-time pairing token generated in Control Center → node exchanges it for a per-node API token (stored hashed server-side, `tokenHash`). Every job dispatch specifies: capabilities allowed (e.g. `terminal.run`, `git.op`, `filesystem.read`, `build.run`, `test.run`), an explicit command allowlist or exact command string, working directory, timeout, and a job token. The node rejects anything outside its registered capabilities and the job's allowlist (**default deny**). Results (stdout/stderr excerpts, exit code, artifact refs) return in the job response; cancellation is a flag checked between steps plus process-group kill server-side. Every dispatch/result is a `ToolExecution` with `audit: FULL_IO`. Node tokens are revocable from the Control Center.

This satisfies "authorized operations on the Founder Mac" without "cloud agent gets unrestricted laptop access."

---

## 15. Web Control Center (future UI — design only)

Single-page founder console under a new authenticated route group (reusing existing Supabase auth + GURU/admin role gates — FACT: role system exists):

- **Sections**: Current task (live state + streaming events) · Queue (PENDING list, reorder) · Waiting approvals (cards with tool, input diff, approve/reject) · Recent completed (report + evidence list) · Failures (reason, retry button) · Evidence inspector (filter by claim type) · Memory (canonical list + proposals awaiting approval) · Worker health (heartbeat, provider health).
- **Founder actions**: issue instruction (one textarea + intent picker), approve/reject, retry, cancel, inspect evidence, approve/supersede memory proposals.
- **Deliberately omitted**: graphs-for-graphs' sake, multi-user views, theme-heavy dashboards. One founder, one queue, readable states.

---

## 16. Telegram Architecture

```
Telegram → webhook (Vercel route) → Channel Adapter → Agent API → Task Engine
                ↑ replies only                        (never executes tools)
```

Adapter responsibilities (kept simpler than Hermes per brief): **founder allowlist** (telegram user id hard-allowlisted; anyone else gets a polite refusal, logged), **idempotency** (update_id deduped via `AgentSession.stateJson` or Redis SETNX), **sequential update handling** (single webhook consumer; Telegram retries on non-200), **bounded state** (only last message ref + pending-approval pointer per chat), **command normalization** (`/status`, `/approve <id>`, `/reject <id>`, `/cancel <id>`, free text = new instruction), **approval flow** (approval cards with inline buttons → callback hits same adapter → Agent API consumes approval atomically). Outbound messages: report summaries with evidence links to Control Center. Telegram never receives credentials and never touches tools directly.

---

## 17. External Integrations

| Integration | Authentication | Read/Write boundary | Failure handling | Approval |
|---|---|---|---|---|
| **GitHub** | fine-grained PAT (repo-scoped, short expiry) injected per tool call | read always; PR creation L2; direct push never | 401/403 → task FAILED with sanitized evidence; 5xx → retry ×3 | `github.create_pr` = approval |
| **Vercel** | scoped token (deployments read + preview create) | read always; preview deploy L2; **production deploy L3 only** | deployment status polled; failure → evidence + FAILED | prod deploy approval |
| **Supabase** | two Prisma clients: existing app client + a **new read-only role** for `supabase.read`/`database.audit` (RECOMMENDATION; none exists today — FACT) | read via RO role; `database.migrate` L2 (dry-run default); destructive L3 | statement timeout mandatory; RO role enforces boundary structurally | migrate = approval; destructive = approval + typed confirmation |
| **Telegram** | bot token server-side; founder id allowlist | messages only | webhook idempotency; safe retries | n/a (channel) |
| **Web research** | none/keyed per provider; fetched content = **untrusted data** (§19) | read-only; content enters as OBSERVATION evidence with URL source | timeout + size cap; domain allowlist optional | allowed (L1) |
| **Existing BC AI** | env keys (existing pattern — FACT) | provider calls via IntelligenceProvider port | ProviderChainFailedError → WAITING_INTELLIGENCE | allowed (L1) |

Secrets flow: all secrets live in environment variables on Vercel (web/API) and Docker env on the worker (lowest viable exposure); the Mac node holds only its node token; no secret is ever included in a prompt, a tool input hash source, evidence, or a report.

---

## 18. (Reserved — folded into §17/§19 to avoid duplication.)

---

## 19. Security Threat Model

| Threat | Defense |
|---|---|
| **Prompt injection** (via repo content, web pages, task output) | Hard rule: external content is DATA, never INSTRUCTIONS. Intelligence outputs can *propose* actions; only the Core executes tools after policy evaluation. Research content is stored as OBSERVATION evidence with source URL. Prompts mark untrusted blocks explicitly. No tool may be invoked by parsing model output for commands. |
| **Malicious repository content** | Coding engine runs in disposable worktree; no secrets in env passed to it; produced diffs are reviewed (evidence + approval) before any PR; test execution in sandboxed env with network egress allowlist |
| **Malicious web content** (research) | size/time caps, rendered-text-only extraction, domain allowlist option, content never executed |
| **Compromised Telegram account** | allowlist is necessary-not-sufficient: HIGH_RISK approvals require confirmation in the **Web Control Center** (second channel), not inline Telegram buttons; L3 actions can be configured to require a fresh approval even if one is pending |
| **Stolen API keys** | least-scope tokens (read-only DB role, fine-grained PAT, scoped Vercel token), short expiries, keys never logged (existing practice — FACT), rotation runbook, `credential.rotate` itself is L3 |
| **Tool abuse** | input schema validation (zod), allowlists per tool, `ToolExecution` audit for every call, risk-class timeouts, per-task tool budget |
| **Accidental production changes** | WRITE requires approval bound to input hash; production deploy L3; preview-first policy |
| **Destructive DB operations** | RO role cannot destruct; destructive tool exists behind L3 + explicit typed confirmation + mandatory pre-backup step (repo has backup tooling — FACT: `npm run backup:current`) |
| **Data exfiltration** | egress allowlist on worker; reports redact secrets; evidence stores refs, not raw payloads, for FULL_IO after 30 days |
| **Runaway loops / infinite retries** | task-level step budget, tool budget, retry caps (§7.3), wall-clock task deadline, worker leader lock prevents duplicate execution |

---

## 20. Observability (minimum, not overengineered)

- **Structured logs**: JSON lines on worker; task/attempt/tool ids on every line (repo already uses tagged `console.error` patterns — FACT `[AI Provider] …`).
- **Task events**: the append-only `TaskEvent` table *is* the activity log (no separate pipeline).
- **Tool execution records**: `ToolExecution` rows incl. duration/status/error code.
- **Error records**: failures land as evidence + TaskEvent, not just logs.
- **Worker heartbeat**: Redis TTL key + `ExecutionNode.lastHeartbeatAt` analog for the worker itself; Control Center renders green/red.
- **Provider health**: last `ProviderChainFailedError` chain detail (existing sanitized format — FACT) surfaced in Control Center.
- **Timing**: `ToolExecution.durationMs`, attempt wall-clock, provider latency (already in `AIUsage`-style records).

---

## 21. Deployment Architecture (concrete)

| Piece | Where | Notes |
|---|---|---|
| Web Control Center + Agent API + Telegram webhook | **Vercel** (`sin1` — keep; Supabase is ap-southeast-1, FACT policy in vercel.json/AGENTS.md) | route handlers under `app/api/agent/*`; founder auth via existing Supabase session |
| Database | **Supabase PostgreSQL** | new `agent_*` Prisma models pushed in a later phase (NOT now) |
| Locks / heartbeat / wake-up | **Upstash Redis** (REST, existing client pattern) | leader lock, TTL heartbeat, pub/sub channel `agent:wake` |
| Worker | **small VPS + Docker**, Singapore region | runs `tsx src/agent/worker/worker-loop.ts` from the same repo image; only new infra required |
| Optional ExecutionNode | **Founder Mac** | outbound poller; registered via Control Center pairing |
| AI | **existing BC AI chain** (Groq active — FACT) | via IntelligenceProvider port |
| Secrets | Vercel env + worker Docker env | never in DB/prompts/reports |

Networking: worker → Supabase over TLS (pooler), worker → Upstash REST, worker → GitHub/Vercel APIs egress; nothing inbound except SSH for ops. The Mac → Vercel HTTPS only.

---

## 22. Hermes Migration Matrix

*(Hermes is not in the repo — FACT §2.3. "Hermes" column = capability as described in the founder's audit; every action means "build the BC-native equivalent carrying over the sound concept and dropping the documented defect.")*

| Component | Hermes (per audit) | BC Agent | Action |
|---|---|---|---|
| Task lifecycle | present; event transition gaps | 8-state machine, enforced transition table + illegal-transition events | **MIGRATE** (concept) / REFACTOR |
| Event system | present; gaps | `TaskEvent` written in-transaction with every transition | **REPLACE** |
| Policy gate | present; inconsistencies | pure L0–L3 policy function, tool-declared risk | **REFACTOR** |
| Approval | hierarchy/binding issues | single-founder, single-use, input-hash-bound, expiring | **REFACTOR** |
| Evidence | present; validation gaps | typed claims + mandatory-FACT-before-COMPLETED rule | **MIGRATE** |
| Verification | present | strategy-per-task-type, bounded rework | **MIGRATE** |
| Reporting | present | report builder that labels verified vs unverified DONE | **MIGRATE** |
| Tools | registry present | ToolDefinition with explicit risk/reversibility/idempotency | **MIGRATE** |
| Telegram transport | dual-path divergence, flood/idempotency/offset issues | one adapter, one path, idempotent webhook, bounded state | **REPLACE** |
| Session | present | `AgentSession` minimal, bounded | **REFACTOR** |
| Retry | state contamination | fresh-attempt retry, whitelist carry-over | **REFACTOR** |
| Governance | present | L0–L3 ladder + single-use approvals | **REFACTOR** |
| Knowledge | present | provenance-gated `AgentMemory` (PROPOSED→CANONICAL) | **REPLACE** |
| Provider layer | provider dependency/timeouts | reuse `src/ai/core/provider.ts` (already hardened — FACT) + WAITING_INTELLIGENCE semantics | **REPLACE** (by existing BC layer) |
| Overall Hermes runtime | prototype/reference | not continued; not a dependency | **RETIRE** |

---

## 23. Repository Structure (future — adapted to existing conventions)

FACT: the repo already keeps product AI in `src/ai/` and shared logic in `lib/`. BC Agent follows the same pattern — `src/agent/` for the agent, `lib/agent-*` only if something must be shared with `app/` routes. Avoided: `packages/*` workspaces (pnpm workspace previously broke builds — FACT per AGENTS.md), a separate app, duplicated provider code.

```
src/agent/
  core/            agent-core.ts            — orchestration loop
  task/            task-engine.ts · task-lifecycle.ts · attempt.ts
  policy/          policy.ts                — pure, unit-testable
  approval/        approval-service.ts
  tools/           tool-types.ts · registry.ts · github/ · vercel/ · supabase/ · repo/ · research/
  evidence/        evidence-service.ts
  verification/    strategies.ts
  memory/          memory-service.ts
  intelligence/    intelligence-provider.ts — wraps src/ai/core/provider.ts
  coding/          coding-engine.ts · opcode-adapter.ts (optional, later)
  channels/        api-handlers.ts (shared by web + telegram adapters)
  worker/          worker-loop.ts · claim.ts · heartbeat.ts
  execution/       node-protocol.ts · dispatch.ts
  reporting/       report-builder.ts
app/api/agent/     tasks/ · approvals/ · memory/ · nodes/ · telegram/webhook/ · health/
```

---

## 24. Phased Roadmap

| Phase | Objective | Scope (files/modules) | Tests | Acceptance criteria | Security gate |
|---|---|---|---|---|---|
| **P0 — Blueprint** (this doc) | evidence-based architecture | `docs/BC_AGENT_V0_1_BLUEPRINT.md` only | n/a | founder signs off decisions D1–D9 | n/a |
| **P1 — Agent Core** | lifecycle + policy + approval as pure modules | `src/agent/{core,task,policy,approval}` | unit tests for transitions, policy matrix, approval binding/expiry (repo `scripts/test-*.ts` convention) | deterministic transitions; illegal transitions impossible; no I/O in core | policy defaults default-deny |
| **P2 — Task + Persistence** | Prisma models + queue claim | schema add-only + `task/`, `worker/claim.ts` | claim race test (parallel claims), lease-expiry test | no double-claim under concurrency; migration is add-only | no touch of existing tables |
| **P3 — Intelligence** | port + waiting semantics | `intelligence/` | mock-provider tests: chain-fail → WAITING_INTELLIGENCE → resume | provider outage never crashes; backoff capped | outputs untrusted (§19) |
| **P4 — Tools** | registry + READ/ANALYZE tools | `tools/` + evidence integration | schema-validation tests; ToolExecution audit assertions | every call audited; RO DB role enforced | credentials per-call only |
| **P5 — Worker** | persistent loop + Redis locks/heartbeat | `worker/`, VPS Docker | heartbeat TTL test; crash→fresh-attempt test | task survives worker kill; single leader | egress allowlist |
| **P6 — Web Control Center** | founder console | `app/(dashboard)/…` + `app/api/agent/*` | route auth tests; approval consume-once test | approve/reject/retry/cancel work end-to-end | founder-only role gate |
| **P7 — Telegram** | channel adapter | `app/api/agent/telegram/` | idempotency + allowlist tests | duplicate updates harmless; non-founder refused | L3 confirms via Web only |
| **P8 — GitHub/Vercel/Supabase integrations** | WRITE tools + PR flow | `tools/{github,vercel,supabase}/` | input-hash binding tests | PR created only post-approval; prod deploy L3 | no main push, ever |
| **P9 — Local Execution Node** | Mac poller | `execution/` + node script | capability/allowlist denial tests | default deny proven by tests; revocation works | outbound-only; token revocable |
| **P10 — Hardening** | threat-model sweep, budgets, deadlines | across | adversarial tests (injection samples, runaway loop) | all §19 defenses test-verified | production readiness review |

Sequence notes: P1–P2 before anything network-facing; Telegram deliberately after Web (P7) so approval UX exists before the riskier channel; ExecutionNode last because it is optional and highest-blast-radius.

---

## 25. Risks / Trade-offs

1. **DB-as-queue throughput ceiling** — fine for founder-scale (tens of tasks/day); revisit only if scheduled jobs multiply. (Accepted trade-off for transactional state.)
2. **Worker is new always-on infra** — the first since the VPS died; requires a small ops commitment (monitoring, updates). Mitigation: single Docker process, heartbeat, dead-simple restart.
3. **Upstash REST pub/sub latency** — wake-up signal is best-effort; correctness relies on polling fallback. Accepted.
4. **AI proposal quality** — the agent's plans are only as good as Groq's chain; mitigated by evidence-typing, verification gates, and approval for anything consequential.
5. **Single-founder bus factor** — approvals and memory are founder-bound by design; acceptable for current stage, revisit if a team grows.
6. **Read-only DB role doesn't exist yet** — P4 dependency; creating it is a Supabase-side change (documented, deferred).
7. **Scope creep into a framework** — the roadmap's phase gates and the non-goals list (§26) are the countermeasure.

---

## 26. Explicit Non-Goals

- NOT a generic multi-agent framework or plugin marketplace
- NOT a chatbot product for guru/murid (the product AI in `src/ai/` already serves them)
- NOT a copy of Hermes, and Hermes is NOT a runtime dependency
- NOT Kubernetes, service mesh, or microservices
- NOT a new AI provider stack (reuse `src/ai/core/provider.ts`)
- NOT autonomous production deploys, autonomous migrations, autonomous public communication, or autonomous financial actions — ever, without founder approval
- NOT an agent with standing unrestricted access to the founder's Mac
- NOT mass tool production before the core loop is proven (P4 ships READ/ANALYZE first)
- NOT implemented in this phase at all (blueprint only)

---

## 27. P0 Acceptance Criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Repository actually inspected; every FACT claim cites a file inspected this session | ✅ §2, §17 |
| 2 | Existing BC AI assessed for reuse with concrete API evidence | ✅ §2.2, §5 |
| 3 | Target architecture evaluated and improved, not copied | ✅ §3 |
| 4 | IntelligenceProvider + CodingEngine abstractions designed, AI-failure non-fatal | ✅ §5–6 |
| 5 | Task lifecycle simplified with legal transitions + clean-state retry | ✅ §7 |
| 6 | Tool, governance, evidence, memory models defined | ✅ §8–11 |
| 7 | DB design with purpose/indexes/retention; **no migration SQL written** | ✅ §12 |
| 8 | Worker + ExecutionNode + deployment concrete; no K8s | ✅ §13–14, §21 |
| 9 | Web + Telegram as channels over one Agent API | ✅ §15–16 |
| 10 | Threat model incl. prompt-injection rule; observability minimal | ✅ §19–20 |
| 11 | Hermes matrix with MIGRATE/REFACTOR/REPLACE/RETIRE; repo-truth caveat stated | ✅ §22 |
| 12 | Repo structure adapted to existing conventions; roadmap with gates | ✅ §23–24 |
| 13 | **Zero production code modified in this phase** | ✅ doc-only; `git status` shows only pre-existing unrelated changes |

---

### FINAL RECOMMENDATION

**Build**: the 8-state task engine with fresh-attempt retries; a policy/approval core that is default-deny with single-use, input-hash-bound approvals; a tool registry with typed risk; evidence-typed reporting with the mandatory-verification rule; one persistent worker on a small VPS with Postgres-as-queue and Redis-for-coordination; Web first, Telegram second; the local ExecutionNode last. Build it inside this monorepo at `src/agent/*`.

**Do NOT build**: a second AI provider stack, a generic agent framework, microservices, autonomous write powers, or any production-facing surface before P5. Do NOT continue Hermes as a runtime.

**Reuse**: `src/ai/core/provider.ts` (fallback chain, rotation, watchdogs — as-is through a thin port), the Supabase/Prisma stack and backup policy, Vercel crons pattern for `ScheduledJob` triggering, the repo's `scripts/test-*.ts` QA convention, existing auth/role gates for the Control Center.

**Replace**: Hermes entirely (per component matrix §22); `lib/ai-queue.ts`'s find-then-update claim pattern with `FOR UPDATE SKIP LOCKED` for agent tasks (leave the existing one serving its current users).

**Optional**: OpenCode as the first `CodingEngine` adapter; the Mac ExecutionNode; semantic memory search; a second worker instance.

**Implement first (P1)**: task lifecycle + policy + approval as pure, fully unit-tested modules with zero I/O — the deterministic heart everything else plugs into.

---

### VALIDATION

- Inspected this session (FACT): `git status/log`, `src/ai/core/provider.ts`, `src/ai/core/agent-types.ts`, `src/ai/bc/`, `lib/redis.ts`, `lib/ai-queue.ts`, `prisma/schema.prisma` (`AIJob` L871, `AIUsage` L1387), `vercel.json`, `app/api/` listing, `docs/` listing (236 files), full-repo "hermes" text search.
- FACT / INFERENCE / RECOMMENDATION are tagged inline throughout; nothing is claimed as tested, because nothing was executed — no code was changed, built, or run.
- No production code modified; no migrations; no new dependencies; Hermes untouched (it does not exist here).
