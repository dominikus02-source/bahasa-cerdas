# BC AGENT — P1 CORE REPORT

## 1. STATUS

**PASS**

All P1 modules implemented as pure TypeScript, 183/183 core tests passing (after the post-audit closure round — see §18), typecheck clean, existing RPG regression suites untouched and passing, zero I/O dependencies, zero new packages.

## 2. FILES CREATED

| Path | Purpose |
|---|---|
| `src/agent/core/types.ts` | Canonical types: 8-state lifecycle, `AgentTask`, `TaskEvent`, `TransitionResult` |
| `src/agent/core/errors.ts` | 10 typed domain errors extending `AgentError` (machine-readable `code`) |
| `src/agent/core/hash.ts` | Deterministic canonicalization + true FNV-1a-64 input hashing (KAT-pinned) |
| `src/agent/core/task.ts` | Pure state machine: `transitionTask`, `isTransitionLegal`, `createTask` |
| `src/agent/core/attempt.ts` | Attempt isolation: `createAttempt`, `createRetryAttempt`, immutable updates |
| `src/agent/core/approval.ts` | Approval contract: binding validation, consumption, expiry, revocation |
| `src/agent/core/tool.ts` | Tool metadata contract + registration-time validation |
| `src/agent/core/policy.ts` | Pure policy engine: `evaluatePolicy`, `decideWithApproval` |
| `src/agent/core/index.ts` | Barrel export (the complete P1 public surface) |
| `scripts/test-bc-agent-p1-core.ts` | 183-assertion test suite (repo `scripts/test-*.ts` convention) |
| `docs/BC_AGENT_P1_CORE_REPORT.md` | This report |

## 3. FILES MODIFIED

| Path | Change |
|---|---|
| `package.json` | +1 line: `"test:bc-agent-p1-core": "npx tsx scripts/test-bc-agent-p1-core.ts"` |

No other file was touched. Untracked pre-existing content (question-factory docs, `scripts/lib/question-bank-validator/`, `src/game/rpg/legacy/`, GIM card images) was left untouched.

## 4. ARCHITECTURE

Module responsibilities — every module is pure (no I/O, no clocks, no randomness, no mutation):

```
types.ts     canonical vocabulary (statuses, events, task shape)
errors.ts    typed failures (instanceof + stable .code, never string matching)
hash.ts      canonicalize(input) → stable text; hashCanonicalInput → bound token
task.ts      transitionTask(task, event, now) → new task | typed error
attempt.ts   blank-slate attempts; retry = fresh attempt; attempt-scoped state
approval.ts  validate/consume/expire/reject/revoke — single-use, expiring, 4-way bound
tool.ts      ToolDefinition metadata + validateToolDefinition (registration gate)
policy.ts    evaluatePolicy(tool) → decision; decideWithApproval(tool, input, ctx, approval?)
index.ts     public surface; the only import point for P2+ modules
```

Time policy: every function that needs time takes `now` as an explicit ISO argument. The core never reads a clock — the future worker injects real time, tests inject fixed time. This keeps the core deterministic and the same functions reusable in P2 persistence.

## 5. TASK STATE MACHINE

**Lifecycle resolution (explicit, as the P1 brief required):** the P0 blueprint (`docs/BC_AGENT_V0_1_BLUEPRINT.md` §7.1, "Final 8") is canonical — `PLANNING` and `READY` are collapsed into `RUNNING` (a plan is an artifact on the attempt, not a state). The brief's 10-state example was superseded by P0's simplification. The implemented set:

```
PENDING · RUNNING · WAITING_APPROVAL · WAITING_INTELLIGENCE · VERIFYING · COMPLETED · FAILED · CANCELLED
```

Canonical graph (implemented in `task.ts` `TRANSITIONS`, enforced per-event):

```
PENDING ── CLAIM → RUNNING          PENDING ── CANCEL → CANCELLED
RUNNING ── APPROVAL_REQUIRED → WAITING_APPROVAL
RUNNING ── INTELLIGENCE_WAIT → WAITING_INTELLIGENCE
RUNNING ── WORK_COMPLETED → VERIFYING
RUNNING ── FAILURE → FAILED        RUNNING ── CANCEL → CANCELLED
WAITING_APPROVAL ── APPROVAL_GRANTED → RUNNING
WAITING_APPROVAL ── APPROVAL_REJECTED / APPROVAL_EXPIRED → FAILED
WAITING_INTELLIGENCE ── INTELLIGENCE_RECOVERED → RUNNING
VERIFYING ── VERIFICATION_PASSED → COMPLETED
VERIFYING ── VERIFICATION_FAILED → FAILED
VERIFYING ── REWORK → RUNNING     (single bounded rework cycle)
COMPLETED / FAILED / CANCELLED → (terminal: zero outgoing transitions)
```

Illegal transitions return `{ ok: false, error: InvalidTaskTransitionError }` — never coerced, never silently ignored, always carrying `from`, `event`, and `taskId`.

**Deliberate omission:** there is no `RETRY` event. Retry is not an in-place transition; it creates a fresh attempt (§6). This is the structural anti-contamination decision from P0 §7.3.

## 6. ATTEMPT ISOLATION

`TaskAttempt` scopes everything execution-specific: `plan`, `decisions`, `verification`, `evidenceIds`, `toolExecutionIds`, `error`, `metadata`. The task carries only intent + lifecycle + attempt counters.

`createRetryAttempt({ id, task, previousAttempt, startedAt })`:

- requires the previous attempt to belong to the same task (typed `InvalidAttemptError` otherwise),
- requires the task to have no active attempt attached (`createAttempt` guard — a finished attempt must first be detached via `withoutCurrentAttempt`),
- builds the new attempt from the **blank slate** — inheriting the previous attempt's state is structurally impossible because the constructor never reads those fields,
- advances `sequence` from `task.attemptCount`, sets the task back to `RUNNING` on the new attempt id.

Tested non-inheritance (each explicitly asserted): plan, policy decisions, verification result, evidence, tool outputs, error, execution metadata.

## 7. POLICY MODEL

Autonomy ladder mapped to risk classes (default-deny — anything unrecognized is `DENY`):

| Risk | Autonomy | Decision |
|---|---|---|
| `READ` | L0 | `ALLOW` (reason `OBSERVE_ALLOWED`) |
| `ANALYZE` | L1 | `ALLOW` (reason `ANALYZE_ALLOWED`) |
| `WRITE` | L2 | `REQUIRE_APPROVAL` (TTL suggestion 60 min) |
| `HIGH_RISK` | L3 | `REQUIRE_APPROVAL` (TTL suggestion 15 min) |
| `DESTRUCTIVE` category | — | **outright `DENY`** — approval can never flip this |
| Ambiguous/unknown metadata | — | **`DENY` (`DENIED_AMBIGUOUS`)** |

Policy consumes only tool metadata + approval context. There is no code path from model output to a decision: AI output can *request* a tool; the decision is computed from the registered tool's declared facts. The policy↔approval sequence is exactly: `evaluatePolicy` → if `REQUIRE_APPROVAL` → `validateApproval` (4-way binding) → `ALLOW` or typed error.

## 8. APPROVAL MODEL

`Approval` binds four dimensions: `taskId`, `attemptId`, `toolName`, `inputHash` (canonical hash of the exact action input). Plus: `issuedAt`/`expiresAt` (expiry enforced at validation time, `now` injected), single-use (`CONSUMED` records `usedAt` + `consumedBy`), explicit statuses `PENDING | CONSUMED | EXPIRED | REVOKED | REJECTED`.

**Time policy (audit closure §18):** `expiresAt` is the LAST valid instant — `now >= expiresAt` is expired (exact-boundary case pinned by test). Timestamps must be well-formed ISO 8601 (UTC, `Date`-round-trippable); malformed values are `ApprovalInvalidError`, never lexically compared. `usedAt`/`status` must be coherent: `usedAt` set on anything but `CONSUMED` is malformed (F2).

An approval can never authorize: another task, another attempt, another tool, different input, an expired window, or an already-consumed action — each is a distinct typed rejection (`ApprovalMismatchError` with the offending `field`, `ApprovalExpiredError`, `ApprovalConsumedError`, `ApprovalInvalidError`). Consumption is immutable; helpers exist for revoke/reject/expire reconciliation.

**Approval does not replace policy:** `decideWithApproval` evaluates policy *first*; an outright `DENY` (destructive, ambiguous) throws `PolicyDeniedError` even when a structurally valid approval is presented. Tested explicitly.

## 9. TOOL CONTRACT

`ToolDefinition` declares: `name` (dotted, non-empty), `description`, `risk` (enum), `reversible`, `requiresApproval`, `autonomyLevel` (enum), `inputSchema`/`outputSchema` (identifiers — P4 wires real zod schemas), `timeoutMs`, `productionImpact` (enum), `category` (enum), `idempotent`.

`validateToolDefinition` enforces at registration time: field types, enum membership, positive-integer timeout, and **consistency rules** — WRITE/HIGH_RISK must declare `requiresApproval: true`; READ cannot require approval; HIGH_RISK and DESTRUCTIVE must be irreversible; each risk pins its autonomy level and category; unknown enums fail. `defineTool()` is the validated factory. The execution layer itself is deliberately absent (P4).

## 10. HASHING

`canonicalize(value)` produces deterministic text: object keys sorted (UTF-16 order), `undefined` values dropped, arrays order-preserved, numbers normalized (`1` ≡ `1.0`), strings JSON-escaped. Non-plain objects (Date/Map/class instances), functions, symbols, `NaN`, `Infinity`, and top-level `undefined` are **refused with `TypeError`** — deterministic refusal rather than silent coercion. `hashCanonicalInput` returns `bc1:<canonicalLength>:<fnv1a64-hex>` — no external crypto dependency; the goal is stable binding (same input → same token), not secrecy. Tested: key-order invariance, nested objects, array-order sensitivity, null vs absent vs empty-string, primitive distinctions, refusal cases.

**Digest correctness (audit closure §18):** the digest is **true FNV-1a-64** (basis `0xcbf29ce484222325`, prime `0x100000001b3`), implemented in exact 32-bit-half arithmetic (ES2017 target forbids BigInt literals) and proven equivalent to a BigInt reference on 20,000+ randomized inputs. Known-answer vectors are pinned as regression tests over the *canonical form* of inputs (string inputs hash as JSON literals, quotes included): `"foobar"` → `bc1:8:6477f76a9c2fba7e`, `""` → `bc1:2:07cc7607b4949e25`, `"a"` → `bc1:3:d4272417d7c77eea`, `[1,2]` → `bc1:5:6a12f12d4705a9b6`. The original implementation's basis words were swapped relative to the true constant — these vectors would have caught it.

**Deliberate acceptance (documented in hash.ts):** null-prototype objects (`Object.create(null)`) are treated as plain objects — they carry no custom behavior that could leak into canonicalization; every other non-plain prototype is refused. Pinned by test.

## 11. TEST RESULTS

```
Command: npm run test:bc-agent-p1-core
         (npx tsx scripts/test-bc-agent-p1-core.ts)
Result:  BC AGENT P1 CORE: 183/183 passed, 0 failed  ✅
```

Coverage areas (all in `scripts/test-bc-agent-p1-core.ts`): canonical 8-state resolution · 14 legal transitions · 15 illegal transitions · terminal stability · cancellation · factory validation · attempt sequencing + 7 non-inheritance assertions · policy per level/risk · ambiguity default-deny · policy+approval interaction incl. the denial-is-not-flippable case · 20 tool validation cases incl. contradictions · approval 4-way binding + expiry (incl. exact-boundary) + single-use + status gates + F1/F2 coherence cases · 22 hashing cases incl. 5 FNV-1a-64 KATs + null-prototype acceptance · immutability (task/approval/attempt/tool via `structuredClone` before/after) · 11-step integration chain (claim → approval gate → grant → allow → consume → re-use blocked → verify → complete; plus intelligence-wait recovery and approval-expiry failure paths).

## 12. TYPECHECK

```
Command: npm run typecheck   (tsc --noEmit, strict)
Result:  exit 0, no errors   ✅
```

## 13. DEPENDENCY CHANGES

**None.** Zero npm packages added or removed. `hash.ts` uses only `TextEncoder` + exact number arithmetic; `structuredClone` (Node ≥17, available on this machine's Node v26) is used only inside tests. No runtime imports outside the core itself.

## 14. SECURITY REVIEW

Threats considered and their P1 treatment:

| Threat | P1 defense |
|---|---|
| Model output steering permissions | Policy reads only registered tool metadata; no model→decision code path exists |
| Approval replay across tasks/inputs | 4-way binding + canonical input hash; single-use consumption |
| Approval as policy bypass | Outright `DENY` (destructive/ambiguous) thrown before approval is ever consulted |
| Stale retry state | Fresh-attempt construction; inheritance structurally impossible; 7 assertions |
| Tool metadata forgery | Registration-time consistency validation (incoherent relabels rejected) — see §15 for the honest boundary of what validation *cannot* do |
| Illegal state reachability | Enforced transition table; every illegal transition typed-rejected; terminal states have zero outgoing edges |
| Time-based approval abuse | Expiry enforced with injected `now`; `expireApproval` refuses premature expiry |
| Non-determinism smuggled into core | No clocks/randomness in core; hashing refuses non-plain objects |
| Mutation-based state corruption | All transitions return new objects; immutability tested with structuredClone |

Deferred to later phases (by design): credential scoping (P4), timeout/subprocess kill (P4/P5), prompt-injection content filtering (P3/P10), channel authentication (P6/P7).

## 15. KNOWN LIMITATIONS

1. **Metadata validation cannot read intent.** A tool definition that *coherently* lies (a write-capable tool labeled `READ`/`OBSERVE`/L0 in every field) passes structural validation — validation proves internal consistency, not truthfulness. The runtime backstop is P4 capability-scoped credentials (a lying READ tool still never receives write credentials). This limitation is documented and asserted in the tests rather than hidden.
2. **Hash is not cryptographic.** FNV-1a-64 binds inputs for approval correlation; it is not collision-resistant against an adversarial input crafter. If approvals ever authorize attacker-controlled inputs, swap in SHA-256 behind the same interface (one function).
3. **`isTransitionLegal` is a convenience pre-check**, not a security gate — the authority is `transitionTask` itself.
4. **Rework cycle is unbounded in P1** (`VERIFYING → REWORK → RUNNING → VERIFYING …`). Budgeting the cycle is worker-policy (P5); the core deliberately expresses the graph without that business rule.
5. **`consumeApproval` does not re-validate expiry** — validation and consumption are separate pure steps; **P2 dependency: resolved — the P2 persistence layer wraps validate+consume in one row-locked transaction** (`consumeApproval` in `src/agent/persistence/service.ts`), proven single-use under 5-way concurrency. The F3 nuance stands at the core level: within the pure core, single-use is enforced by caller discipline plus the object-level guards (`consumeApproval` refuses non-PENDING; `validateApproval` refuses CONSUMED) — object immutability alone was never the enforcement mechanism.
6. **No persistence yet** — attempts/approvals are in-memory shapes; P2 maps them to Prisma models with the same field semantics. *(Resolved in P2: `AgentTask`/`TaskAttempt`/`TaskEvent`/`AgentApproval` tables exist, migration applied to the local staging DB.)*

## 16. ACCEPTANCE CRITERIA

| # | Requirement | Status |
|---|---|---|
| 1 | Canonical types with P0-approved lifecycle | ✅ Final-8 resolved explicitly (§5) |
| 2 | Pure transitions, no mutation, typed illegal-transition failure | ✅ 29 transition tests + immutability suite |
| 3 | Attempt isolation; retry creates fresh attempt; no stale inheritance | ✅ 7 non-inheritance assertions |
| 4 | Policy engine L0–L3, default-deny, ambiguity → DENY | ✅ 12 policy tests |
| 5 | Model cannot bypass policy | ✅ no code path + forged-metadata rejection test (with documented boundary) |
| 6 | Tool contract with enum validation + contradiction rejection | ✅ 20 validation cases |
| 7 | Approval: task/attempt/tool/input-hash bound, expiring, single-use | ✅ 24 approval tests (incl. F1/F2/boundary) |
| 8 | Deterministic canonical input hashing, order-insensitive | ✅ 22 hashing tests (incl. 5 FNV KATs) |
| 9 | Policy+approval sequence with denial-not-flippable | ✅ tested |
| 10 | Typed domain errors (10 classes) | ✅ all thrown/asserted by tests |
| 11 | Zero side effects (no fetch/DB/Redis/AI/Telegram/fs/spawn) | ✅ zero such imports in `src/agent/core/` |
| 12 | Repo test convention followed | ✅ `scripts/test-*.ts` + npm script |
| 13 | TypeScript passes | ✅ exit 0 |
| 14 | All existing tests pass | ✅ rpg-phase1a 49/49, rpg-phase1b 31/31 |
| 15 | No production behavior outside P1 changed | ✅ diff = 1 package.json line + new files only |
| 16 | No new dependencies | ✅ |
| 17 | No migration | ✅ |

## 17. POST-AUDIT CLOSURE (F1 / F2 / F-hash / export duplication)

An independent audit of the P1 work surfaced four defects/nuances; all are closed with regression assertions in the suite (170 → 183 assertions).

| Finding | Closure | Regression test |
|---|---|---|
| **F1** — malformed/non-ISO `issuedAt`/`expiresAt`/`usedAt` silently accepted and lexically compared | `malformedReason` now requires strict ISO 8601 UTC instants (regex + `Date` round-trip); any malformed timestamp → `ApprovalInvalidError` | non-ISO `issuedAt` rejected; `09/11/2026` `expiresAt` rejected; `+00:00`-offset expiry rejected; malformed `usedAt` rejected |
| **F2** — `usedAt` set while `status` is `PENDING` (incoherent state) accepted | `usedAt` must be `null` unless `status === "CONSUMED"`; enforced in `malformedReason` and re-asserted in `consumeApproval` | PENDING-with-`usedAt` → `ApprovalInvalidError` |
| **Boundary** — `now == expiresAt` untested; a `>` → `>=` flip would have passed CI | Expiry policy fixed and documented: `expiresAt` is the LAST valid instant, `now >= expiresAt` ⇒ expired; `expireApproval` aligned (`now < expiresAt` refuses) | exact-boundary rejection test + just-before-boundary validity test |
| **F-hash** — `fnv1a64` basis words swapped relative to true FNV-1a-64 (`0xcbf29ce4/0x84222325` reversed; prime was the 32-bit one) | Replaced with **true FNV-1a-64** (basis `0xcbf29ce484222325`, prime `0x100000001b3`), exact 32-bit-half arithmetic, proven equivalent to a BigInt reference on 20,000+ randomized inputs; `Math.imul` claim removed from §13 | 5 known-answer vectors over canonical forms (`foobar`/``/`a`/`[1,2]` + canonicalize-text pin) |
| **Duplicate export paths** — `withCurrentAttempt`/`withoutCurrentAttempt` re-exported from both `task.ts` and `attempt.ts`; `isTerminal` from both `types.ts` and `task.ts` | Both second paths removed — each symbol exports from its owning module exactly once (`index.ts` unchanged at the barrel; all consumers import via the barrel) | `tsc --noEmit` clean; full suite green after removal |
| **F3 nuance (ruled acceptable, clarified)** — single-use enforcement location | The audit's ruling is recorded: within the pure core, single-use is caller discipline + object-level guards; the *transactional* guarantee lives at the P2 persistence boundary (row-locked validate+consume, 5-way concurrency proof in the P2 report §10) | P2 suite: `test:bc-agent-p2-persistence` atomic-consumption block |

Also documented (not a defect): null-prototype objects are **deliberately accepted** as plain objects in `canonicalize` — safe because they carry no custom behavior; pinned by test.

## 18. FINAL RECOMMENDATION

**P2 (Task + Persistence) can begin.** The core contract is stable, fully tested, and side-effect-free; P2 can map `AgentTask`/`TaskAttempt`/`Approval`/`ToolExecution`/`TaskEvent` onto Prisma models and implement the atomic claim loop against these exact types. One P2 constraint inherited from §15: validate-and-consume of approvals must become a single transaction at the persistence boundary. *(Post-audit note: P2 has since been delivered — see `docs/BC_AGENT_P2_PERSISTENCE_REPORT.md`; the constraint is closed there, and the P1 core fixes in §17 are regression-pinned.)*
