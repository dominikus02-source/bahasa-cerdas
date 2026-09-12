# BC AGENT — P4 TOOLS REPORT

## 1. STATUS

**PASS** — Tool System + 4 genuinely read-only tools implemented, executed through the full security boundary, proven against a real local database, with all gates green.

| Gate | Result |
|---|---|
| `npm run typecheck` | ✅ exit 0 |
| `npm run lint` | ✅ exit 0 |
| `npm run build` | ✅ compiled successfully (78s) |
| P1 core | ✅ 183/183 |
| P2 persistence | ✅ 59/59 |
| P3 intelligence | ✅ 89/89 |
| **P4 tools (new)** | ✅ **145/145** |
| BC AI regression (`test:ai-tools-audit`) | ✅ 40/40 |
| RPG regressions | ✅ 49/49 + 31/31 |

## 2. EXISTING INTEGRATION FINDINGS (all FACT unless noted)

| Area | Finding |
|---|---|
| P1 `ToolDefinition` | Ready for P4: metadata contract + `validateToolDefinition` (contradictory-metadata rejection) + `ToolContext.credentials` were forward-declared in `src/agent/core/tool.ts`. P4 fills the intended role. |
| P1 policy | `evaluatePolicy` / `decideWithApproval` in `src/agent/core/policy.ts` — pure, default-deny; READ → ALLOW; approval can never flip a DENY. Reused verbatim. |
| P1 approval | `validateApproval` / `consumeApproval` (4-way binding, expiry boundary `now >= expiresAt` ⇒ expired) in `src/agent/core/approval.ts`. |
| P2 persistence | `AgentTaskService.consumeApproval` is ATOMIC (row-lock `FOR UPDATE` + conditional consume) — the executor consumes approvals exclusively through it. `TaskAttempt.toolExecutionIds` / `evidenceIds` JSON fields existed unused; P4 can link execution ids there. |
| P2 schema | No `ToolExecution`/`Evidence` models existed (grep-verified). Two models added (§6). |
| P3 intelligence | `IntelligenceProvider`/adapter untouched; P4 adds the executor that will consume its proposals in P5. |
| GitHub integration | **None exists** in the repo (grep: no `api.github.com`, no GitHub SDK, no `GITHUB_TOKEN` anywhere in env files). P4 adds a fresh, credential-optional REST adapter. |
| Vercel integration | **None exists** (no `api.vercel.com`, no `VERCEL_TOKEN`). Fresh credential-required adapter. |
| Supabase access | `SUPABASE_SERVICE_ROLE_KEY` exists; **no read-only role exists** (P0 finding — still true). Handled honestly (§13). |
| Secrets conventions | `.env*` files carry keys; nothing committed. P4 tools take credentials ONLY via per-execution `ToolContext.credentials` — zero env-var reads in `src/agent/tools/**` (grep-verified). |
| Zod | `zod@^3.23.8` already a dependency — used for all input/output schemas. |
| Node | v26.8.1, global `fetch` available — no HTTP SDK added. |

## 3. TOOL ARCHITECTURE

```
AI (P3 IntelligenceProvider)
   ↓ proposes (ToolProposal: taskId, attemptId, toolName, input, approvalId?)
TOOL EXECUTOR  (src/agent/tools/executor.ts — THE security boundary)
   1. resolve tool          → ToolRegistry (typed TOOL_NOT_FOUND)
   2. validate input        → tool's zod schema (AI input is untrusted)
   3. classify + policy     → P1 evaluatePolicy (default-deny)
   4. approval enforcement  → P2 ATOMIC validate-and-consume (WRITE/L2+ only)
   5. record START          → ToolExecution row (RUNNING)
   6. execute               → tool.run under ONE deadline (withDeadline)
   7. validate output       → tool's zod output contract
   8. record RESULT         → SUCCEEDED/FAILED + bounded redacted metadata
   9. evidence              → FACT only from validated output (provenance)
   ↓
ToolExecution (durable audit) + ToolEvidence (provenance ledger)
```

**AI proposes. Core decides. Policy governs. Tool executes. Evidence proves.**
No other module in `src/agent/**` executes tools (grep-verified: only `executor.ts` calls `tool.run`).

## 4. TOOL REGISTRY

`src/agent/tools/registry.ts` — pure catalog. `register` runs full P1 `validateToolDefinition` (contradictory metadata rejected at the door — the P1 audit's "coherently lying tool metadata" is stopped at registration *and* constrained by implementation). Duplicate → `ToolDuplicateError`; unknown → `ToolNotFoundError`; list is deterministic (name-sorted). Registry never executes and holds no business logic. **FACT**: suite section 1 covers valid/duplicate/invalid/contradictory/lookup/list.

## 5. TOOL EXECUTOR

- **Never trusts the caller**: policy re-evaluated on every execution; `inputHash` recomputed from the actual input via P1 `hashCanonicalInput` (order-independence proven by test); approvals consumed only through the P2 atomic path — a caller-side "already approved" string cannot exist in the flow.
- **Rejections are durable**: unknown tool, invalid input, policy denial, approval failure each leave a FAILED `ToolExecution` row with the typed `errorCode` (best-effort for FK-invalid attempts, where the typed outcome still returns).
- **One deadline per execution** (`withDeadline`, §17): timeout → typed `TOOL_TIMEOUT`, FAILED row, no FACT.
- **Output contract (§7)**: output re-validated against the tool's zod schema; violation → `TOOL_OUTPUT_INVALID`, FAILED row, **no FACT**.
- **Persistence failure ≠ silent success**: if the RESULT record fails, `ToolExecutionRecordError` throws — an explicit ambiguity, never a lie (§22).
- **Evidence**: `factFromToolOutput` builds a bounded operational claim (`"<tool> succeeded: N item(s), M bytes (truncated?) from <source>"`) — never quotes content, never from AI interpretation.

## 6. TOOL EXECUTION PERSISTENCE

**Models added (add-only; no existing model touched):**

- `ToolExecution`: id, taskId, attemptId, toolName, inputHash, status (`RUNNING|SUCCEEDED|FAILED|CANCELLED` with CHECK: finished rows always carry finishedAt+durationMs), startedAt/finishedAt, durationMs, errorCode, `outputMeta` (bounded metadata ONLY), approvalId. Indexes: (taskId, startedAt), attemptId, (toolName, status).
- `ToolEvidence`: id, taskId, attemptId, executionId (nullable), kind (`FACT|OBSERVATION|INFERENCE|RECOMMENDATION|UNKNOWN`), claim (≤500), source, confidence, metadata. **DB-level evidence boundary** via `ToolEvidence_fact_provenance_check`: FACT ⇔ executionId present AND source not agent/founder; non-FACT ⇔ executionId null. Both directions proven by live-DB tests.

**Migration**: `prisma/migrations/manual/2026-09-12_bc_agent_p4_tools.sql` — repo convention (schema.prisma canonical; psql apply; add-only; `CREATE TABLE IF NOT EXISTS`). Applied and verified on local `bahasacerdas_staging`. **Not applied to production Supabase** (founder action, same as the P2 migration — see §27).

**Bounded retention (§4)**: `outputMeta` is `redactMeta(summaryMeta(envelope))` — counts, flags, source label ≤200 chars, ≤10 keys, depth ≤2, secret-named keys dropped, arrays ≤5. Raw tool output never reaches the DB.

## 7. POLICY ENFORCEMENT

Every execution: `evaluatePolicy` first — DENY (DESTRUCTIVE, ambiguous metadata) throws before anything runs; approval never flips a DENY (proven: DESTRUCTIVE fixture with an approval id in hand still fails `POLICY_DENIED`). READ/L0 tools allow unconditionally; WRITE/L2+ REQUIRE_APPROVAL paths consume atomically or fail typed. **FACT**: suite sections 2–3.

## 8. APPROVAL ENFORCEMENT

Executor step 4 calls `AgentTaskService.consumeApproval({taskId, attemptId, toolName, inputHash}, executionId)` — the P2 row-locked validate-and-consume. Consequences proven by tests: missing approval → `APPROVAL_REQUIRED`; mismatch (typed from service) → `APPROVAL_INVALID`; valid → execution proceeds with `approvalId` on the outcome; P4's read-only tools never require one (P1 validation forbids READ + requiresApproval).

## 9. EVIDENCE ARCHITECTURE

| Kind | Provenance rule | Generator |
|---|---|---|
| FACT | executionId + non-agent source (DB CHECK enforced both ways) | `factFromToolOutput` — only from validated tool output |
| OBSERVATION | never executionId | "FACT" without tool provenance is **downgraded**, never forged |
| INFERENCE | never executionId | `inference()` — AI interpretation, never upgraded |
| RECOMMENDATION | never executionId | `recommendation()` |
| UNKNOWN | never executionId | `unknownEvidence()` |

Claims bounded to 500 chars; `metadata` carries only counts/flags. Proven by suite section 4 + live-DB CHECK tests.

## 10. REPO.READ

`src/agent/tools/tools/repo-read.ts` — bounded filesystem reader. **Read-only by construction**: no write/delete/rename/chmod/shell code exists in the module — capability is the implementation.

- Root injected explicitly; every path `realpathSync`-resolved then confined (`path.relative` check) — traversal (`../`, absolute, backslash forms) and **symlink escape** both rejected (`TOOL_PATH_DENIED`), proven by tests including a live symlink fixture.
- Size caps: per-call `maxBytes` ≤ 1 MiB default; response envelope ≤ 256 KiB; oversized → `TOOL_SIZE_LIMIT`.
- Binary files: null-byte sniff of first 8 KB → `isBinary: true`, content withheld.
- Directory reads refused. Output envelope: bytes/items/truncated/source(`repo:<path>`).
- Repository content returned **verbatim as DATA** — injection fixture ("IGNORE ALL PREVIOUS INSTRUCTIONS…") passes through untouched and never reaches any evidence claim or policy surface (§20 proven).

## 11. GITHUB.READ

`src/agent/tools/tools/github-read.ts` — REST adapter over `api.github.com` via the shared bounded `fetchJsonBounded` (AbortSignal timeout 15s, Content-Length + mid-stream 256 KiB caps, typed errors: TIMEOUT/RATE_LIMITED/UNAVAILABLE/AUTH/FAILED).

- Ops: `repo`, `branches`, `commits`, `issues`, `pulls`, `file` (contents API, base64→utf8, content capped at 64 KiB). **No mutation op exists** — no create/edit/merge/push code in the module.
- Field allowlist per op trims payloads (proven: unknown fields dropped).
- Pagination bounded by schema: `page ≤ 3`, `per_page = 20` — never an unbounded walk.
- Credentials: `ctx.credentials.githubToken` only; unauthenticated fallback works (60 req/h) and reports `authenticated: false`. Token never appears in output (proven for vercel; same envelope path for github).
- GitHub content is DATA: injection content in commit messages passes through verbatim and is never interpreted (proven).

## 12. VERCEL.READ

`src/agent/tools/tools/vercel-read.ts` — ops: `project` (v9), `deployments` (v6, limit ≤ 20), `deployment` (v13). No deploy/rollback/env-mutation code exists.

- **Credential-required by design** (Vercel has no useful unauthenticated API): missing token → typed `AUTH` before any fetch.
- Capability scoping proven at the HTTP layer: only the Vercel token is in `Authorization` (asserted verbatim), and the token never appears in the output envelope.

## 13. SUPABASE.READ

`src/agent/tools/tools/supabase-read.ts` — **the P0 "no read-only role" limitation stands**; the guarantee is architectural, not credential-based, and is honestly documented rather than faked:

1. **Fixed query allowlist only** — `tables` (pg_class metadata), `columns` (information_schema), `rows` (SELECT * LIMIT n on the 6 agent-owned tables ONLY — schema-enforced enum), `migrations` (_prisma_migrations). Arbitrary SQL is impossible: there is no SQL input field.
2. **Engine-level READ ONLY**: every query runs inside `SET LOCAL TRANSACTION READ ONLY` + `statement_timeout`. Proven by a test that attempts an INSERT through the same transaction path — PostgreSQL rejects it (`25006 cannot execute INSERT in a read-only transaction`).
3. Row limits in SQL (LIMIT ≤ 50); identifier guard rejects non-`[A-Za-z0-9_]` names (injection string test passes); secret-named columns redacted; BigInt columns JSON-normalized.

## 14. CAPABILITY / CREDENTIAL BOUNDARIES

| Tool | Credential | Scope | Isolation proof |
|---|---|---|---|
| repo.read | none (filesystem path confinement) | repo files under injected root | symlink/traversal tests |
| github.read | `credentials.githubToken` (optional) | api.github.com GET only | field allowlist + typed errors |
| vercel.read | `credentials.vercelToken` (+ optional teamId) | api.vercel.com GET only | Authorization header asserted |
| supabase.read | injected PrismaClient (no env reads) | fixed allowlist, READ ONLY tx | engine-rejection test |

No tool reads `process.env` (grep-verified: `src/agent/tools/**` contains no `process.env`); credential injection is the executor's/context's job — a tool cannot see another tool's credential. **RECOMMENDATION** (next hardening): a dedicated read-only Postgres role + per-provider fine-grained tokens; until then supabase.read's READ ONLY transaction is the mutation barrier.

## 15. TIMEOUTS

Every path bounded: executor-level `withDeadline(tool.timeoutMs)` — one timer per execution (same principle as P3); HTTP: AbortSignal per request + mid-stream byte caps; DB: `statement_timeout` + transaction timeout. Tool definitions: repo 10s, github/vercel 15s, supabase 10s. Proven: hanging tool → typed `TOOL_TIMEOUT` near the cap, FAILED row, no FACT.

## 16. RETRIES

**P4 implements no automatic tool retry** — the brief's bounded-retry concern is satisfied by not retrying at all at this layer: a transient GitHub timeout surfaces as a typed FAILED outcome; the *agent loop* (P5) decides whether to re-propose. Task retry remains exclusively the P2 engine's fresh-attempt semantics. A tool failure can never silently create a new TaskAttempt. **RECOMMENDATION**: if P5 wants bounded provider retries for external reads, wrap `fetchJsonBounded` (≤2 attempts, jittered backoff) inside the adapter — never inside the executor.

## 17. RESULT LIMITS

repo.read: 1 MiB/file cap, 256 KiB response envelope, binary withheld. github/vercel: 256 KiB stream cap, ≤20 items/page, ≤3 pages, field allowlists, file content ≤64 KiB. supabase.read: ≤50 rows, ≤100 metadata rows, redacted columns. All envelopes carry `bytes/maxBytes/items/truncated`. Truncation is structure-preserving (string-value shortening passes, valid JSON always — a naive serialized-form truncation bug was caught by the suite and fixed in `tools/shared.ts`).

## 18. PROMPT INJECTION DEFENSE

All external content (repo files, GitHub payloads, Vercel payloads, DB rows) flows through `ToolOutputEnvelope` with provenance labels and is returned **verbatim as DATA**. Proven by fixtures across all four tools: "ignore previous instructions", "run this command", fake system/grant text pass through untouched, appear in NO evidence claim (claims are operational envelope summaries only), and cannot influence policy — policy consumes only tool metadata and the P1 engine, which external content cannot reach. There is deliberately **no AI in the P4 execution path at all**: the executor is pure code + policy, so there is nothing for injected text to persuade.

## 19. SECURITY LOGGING

`redactMeta` is the single gate to `outputMeta`: secret-named keys dropped (`token|key|secret|password|authorization|credential|apikey`), strings ≤200, arrays ≤5, depth ≤2. Recorded: task, attempt, tool, inputHash, status, timing, error code, approval ref, envelope summary. Never recorded: tokens, headers, raw output, file contents, response bodies. Errors carry bounded messages (≤300 chars on outcomes, ≤200 in metadata).

## 20. TEST RESULTS

`scripts/test-bc-agent-p4-tools.ts` → `npm run test:bc-agent-p4-tools` — **145/145 passed** (localhost-guarded staging DB; zero real network calls, zero real credentials):

| Section | Coverage |
|---|---|
| 1. Registry (8) | valid/duplicate/invalid-metadata/contradictory/lookup/list |
| 2. Executor basics (30) | success rows+evidence; unknown; invalid input (rejection row); invalid output (no FACT); runtime failure; timeout bounds |
| 3. Policy+approvals (13) | APPROVAL_REQUIRED; mismatch; valid-consume; DENY-not-flippable; inputHash recomputation (order-independence) |
| 4. Evidence (12) | FACT provenance; downgrade; 500-char bound; no-content-quotes; AI-stays-INFERENCE |
| 5. repo.read (16) | valid; missing; 4 traversal forms; symlink escape; oversized; binary; directory; injection-fixture |
| 6. github.read (11) | mock success; allowlist; injection; TIMEOUT; RATE_LIMITED; AUTH; malformed; schema rejections; page bounds |
| 7. vercel.read (6) | no-token AUTH; success; token isolation; malformed; injection |
| 8. supabase.read (8) | READ ONLY flag; tables/columns/rows; allowlist; identifier injection; engine-level INSERT rejection |
| 9. Persistence (13) | real-DB START/RESULT rows; bounded outputMeta; FACT row + provenance; both DB CHECK directions; linkage |
| 10. Security (8) | injection-as-data through the executor; redactMeta; truncation envelope |

## 21. TYPECHECK

`npm run typecheck` — **exit 0**.

## 22. LINT

`npm run lint` — **exit 0**.

## 23. BUILD

`npm run build` — **compiled successfully** (78s, 272 pages).

## 24. FILES CREATED

- `src/agent/tools/types.ts` — envelope, outcomes, evidence types
- `src/agent/tools/errors.ts` — typed tool errors + ToolErrorCode
- `src/agent/tools/registry.ts` — ToolRegistry
- `src/agent/tools/executor.ts` — ToolExecutor (security boundary)
- `src/agent/tools/evidence.ts` — evidence factory + boundary
- `src/agent/tools/timeout.ts` — withDeadline
- `src/agent/tools/sanitize.ts` — redactMeta
- `src/agent/tools/index.ts` — barrel + makeP4Registry
- `src/agent/tools/tools/shared.ts` — boundedOutput
- `src/agent/tools/tools/http.ts` — bounded fetch + typed errors
- `src/agent/tools/tools/repo-read.ts`
- `src/agent/tools/tools/github-read.ts`
- `src/agent/tools/tools/vercel-read.ts`
- `src/agent/tools/tools/supabase-read.ts`
- `prisma/migrations/manual/2026-09-12_bc_agent_p4_tools.sql`
- `scripts/test-bc-agent-p4-tools.ts`
- `docs/BC_AGENT_P4_TOOLS_REPORT.md`

## 25. FILES MODIFIED

- `prisma/schema.prisma` — add-only: `ToolExecution` + `ToolEvidence` models, 2 relation fields on AgentTask, 2 on TaskAttempt (Agent block only)
- `package.json` — +1 line: `test:bc-agent-p4-tools` script

## 26. DEPENDENCY CHANGES

**None.** Zod already present; Node global fetch used; no SDKs added. GitHub/Vercel adapters are dependency-free REST calls.

## 27.5 POST-AUDIT CLOSURE (P4 audit → fix pass)

The independent P4 audit confirmed the claimed greens and found three defects, each now closed with regression assertions in the committed suite (145/145) and adversarial boundary probes (17/17, probe surfaces below):

1. **FACT provenance now FK-enforced at rest** (was: only a CHECK that executionId is *present*, so a FACT with a *fabricated* executionId persisted). `ToolEvidence.executionId` is now a FOREIGN KEY to `ToolExecution(id)` with ON DELETE CASCADE — a fact can never reference a nonexistent execution, and deleting an execution deletes its supporting facts (the ledger never outlives its provenance). Migration amended (idempotent DO-block) and re-applied to local staging; Prisma schema updated. Pinned by: forged-executionId FACT → FK violation; empty-string executionId → rejected; cascade-delete proof; positive-control persist with a real execution.
2. **Approval-mismatch mapping made exact** (was: an approval lookup that came back empty — e.g. approval bound to a different inputHash — surfaced as `POLICY_DENIED` via a fall-through). The executor now remaps P2 `AgentNotFoundError` from the approval path to `APPROVAL_INVALID`. Pinned by: mocked-service remap test + real-DB hash-mismatch test (both assert `APPROVAL_INVALID`, and no `POLICY` text in the error).
3. **`boundedOutput` marker floor minimized** (was: a 55-byte `{note: "[payload too large to include]", maxBytes}` marker violating the envelope's ≤cap invariant below ~55-byte caps). The marker is now the minimal 22-byte `{note: "[too large]"}`; below ~22 bytes the invariant is mathematically unrepresentable and the marker is the honest smallest payload. Pinned by: 32-byte-cap test asserting `bytes === true payload size`, fit under cap, and minimality; probe matrix at caps 32/10/1.

Adversarial closure probes also confirmed: factory downgrade behavior unchanged (agent-sourced "FACT" → OBSERVATION), empty/missing approval paths still precisely typed, normal truncation caps unaffected, marker data valid JSON. The DB-level fact/agent-source CHECK (both directions) remains from the original implementation and is re-tested in the suite.

## 27. KNOWN LIMITATIONS

1. **Production Supabase migration unapplied** — `2026-09-12_bc_agent_p4_tools.sql` is committed but, like the P2 migration, awaits the founder's psql apply against production DIRECT_URL. All P4 DB proofs are on local `bahasacerdas_staging` (localhost-guarded).
2. **No read-only DB role** — supabase.read relies on READ ONLY transactions + query allowlist, not a credential-scoped role (P0 gap, honestly preserved; §14 has the hardening path).
3. **No automatic tool retry** — deliberate (§16); P5 decides re-proposal policy.
4. **`ToolExecution`/`ToolEvidence` FK to TaskAttempt** is enforced (onDelete: Cascade); rejection rows for nonexistent attempts cannot be persisted — the typed outcome still returns (best-effort rejection recording, documented in executor).
5. **github.read unauthenticated fallback** is rate-limited (60 req/h) — fine for P4 testing; P5 should make the token a standard execution credential.
6. **Credential provisioning is manual** — `ToolContext.credentials` must be populated by the future worker (P5) from a secrets source; no secrets manager exists yet.
7. **repo.read reads files, not directories** — listing op intentionally deferred (keep the surface minimal); add `repo.list` as a separate op when P5 needs it.
8. **Single execution row per phase pair** (START then RESULT via two writes) — crash between them leaves a RUNNING row; P5's stale-attempt recovery (P2 heartbeat primitives) should reconcile RUNNING ToolExecutions of dead attempts.

## 28. ACCEPTANCE CRITERIA

All 26 P4 criteria met: registry ✅, executor ✅, P1 ToolDefinition reused ✅, policy-before-execution ✅, approval enforcement (atomic) ✅, ToolExecution persisted ✅, input validation ✅, output validation ✅, evidence generated ✅, FACT provenance ✅ (both code and DB CHECK), genuinely read-only tools ✅ (no mutation code exists), repo.read ✅, github.read ✅, vercel.read ✅, supabase.read ✅ (with documented architectural guarantee), result limits ✅, timeouts ✅, bounded/no tool retry ✅, injection defenses tested ✅, credential isolation ✅, P1 ✅ 183, P2 ✅ 59, P3 ✅ 89, typecheck ✅, lint ✅, build ✅.

## 29. RECOMMENDATION FOR P5

**P5 (Worker) can begin.** The full chain now exists: durable tasks (P2) → intelligence (P3) → safe hands (P4). P5's worker loop should be: `claimTask` → plan via IntelligenceProvider → for each AI-proposed step, call `ToolExecutor.execute` (policy gates it) → collect FACT evidence → `finishAttempt` + verify → report. Reuse P2's heartbeat/stale-attempt primitives for crash recovery (close §27.8 by reconciling RUNNING ToolExecutions of reclaimed attempts). Also schedule: founder applies both pending migrations; then a real-network smoke of github/vercel.read with founder-provided tokens.
