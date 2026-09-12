# BC AGENT — P3 INTELLIGENCE REPORT

> **Status**: PASS — all acceptance criteria met.
> **Date**: 2026-09-12
> **Source of truth**: `docs/BC_AGENT_V0_1_BLUEPRINT.md`, `docs/BC_AGENT_P1_CORE_REPORT.md`, `docs/BC_AGENT_P2_PERSISTENCE_REPORT.md`
> **Rule honored**: no second AI ecosystem — the Agent gains a clean `IntelligenceProvider` port over the EXISTING BC AI stack. No Telegram, no worker, no tools, no OpenCode, no UI.

---

## 1. STATUS

**PASS.** Typecheck 0 errors · P3 suite 89/89 (83 + 6 post-audit closure regressions) · P1 183/183 · P2 59/59 · BC AI regression 40/40 · RPG 49/49 + 31/31 · zero production-code changes outside `src/agent/`.

## 2. EXISTING BC AI FINDINGS (all FACT — read from source this pass)

| Finding | Evidence |
|---|---|
| Primary entry: `callWithFallback(req: ProviderRequest): Promise<ProviderResponse>` | `src/ai/core/provider.ts` |
| Provider priority is **Groq-only** (founder decision, STEP 5.1.3) — DeepSeek/Gemini remain as dormant code, active only via `AI_PROVIDER_PRIORITY` override | `loadPriority()` returns `["groq"]` |
| In-provider model chain: Groq `gpt-oss-120b → gpt-oss-20b` | `providerModels()` |
| Multi-key round-robin rotation (comma-separated env values), retried across the model chain before switching provider | `getApiKeys`, `nextKey`, `callWithFallback` loops |
| Per-call bounded timeout via `AbortSignal.timeout(req.timeoutMs)` | all three `call*` functions |
| Streaming watchdog exists but is **streaming-only** (idle-based abort; 300s total) — not used by P3 (Agent calls are non-streaming) | `createStreamWatchdog`, `streamProviderText` |
| Typed sanitized errors: `ProviderChainFailedError.errors` carries per-provider strings like `"groq/openai/gpt-oss-120b: HTTP 429"` — no keys, no bodies | provider.ts error section + STEP 5.1.2 comments |
| Reusable pure JSON recovery: `cleanJSONOutput` / `tryFixJSON` (fences, trailing commas, wrapped JSON) | `src/ai/core/output-validator.ts` |
| `responseFormat: "json_object"` was deliberately REMOVED by BC AI (STEP 5.1) — prompt-strict JSON + parser salvage is the house style | comments in `callDeepSeek`/`callGroq` |
| `AgentDefinition` (agent-types.ts) is a **user-facing product-agent contract** (zod I/O, systemPrompt, qualityChecklist, runAgent with its own retry-then-salvage loop) — NOT a raw intelligence port | `src/ai/core/agent-types.ts`, `agent-runner.ts` |

**Decision on §7 (AgentDefinition)**: **Option C — a separate BC Agent Intelligence contract.** INFERENCE: `runAgent` bundles prompt building, input guardrails, quality scoring, usage logging, RPP fallback templates, and a built-in one-shot retry with salvage-to-text — product behaviors that would leak educator-domain semantics into the Agent layer. The adapter therefore targets the layer *below* it (`callWithFallback`), which is the actual provider boundary. This reuses everything the blueprint cares about (fallback/rotation/watchdog) and duplicates nothing.

## 3. INTELLIGENCE ARCHITECTURE

```
BC AGENT (task/policy/approval/state — P1 core + P2 engine)
        │  depends ONLY on the interface
        ▼
IntelligenceProvider.run(IntelligenceRequest) → IntelligenceResult   [types.ts]
        │ implemented by
        ▼
BcAiIntelligenceAdapter [bc-ai-adapter.ts]
   ├─ assemblePrompt (trust boundary)      [prompt.ts]
   ├─ overall deadline (ONE timer)         [timeout.ts]
   ├─ bounded retry (1+providerRetries)    [adapter]
   ├─ parseStructured (zod + BC AI cleaner) [structured.ts]
   └─ failure normalization → 7 categories [errors.ts]
        │ the ONLY call into BC AI
        ▼
callWithFallback (existing BC AI core)
   ├─ provider fallback chain (Groq-only today; architecture intact)
   ├─ model chain gpt-oss-120b → 20b
   ├─ multi-key round-robin rotation
   └─ per-call AbortSignal timeout
```

**Ownership split (blueprint-final rule):** the Agent owns task/policy/approval/state; BC AI owns model/provider/fallback/watchdog. Neither crosses.

## 4. INTELLIGENCE PROVIDER CONTRACT

**Request** (`IntelligenceRequest`) — exactly the brief's fields, nothing speculative: `requestId`, `systemPolicy`, `founderInstruction`, `taskContext?`, `untrustedExternalData?` (`UntrustedContent[]`), `memory?` (`MemorySnippet[]`), `responseSchema?` (zod), `timeoutMs?`, `maxTokens?`, `temperature?`. No model names, no provider hints, no credentials.

**Result** (`IntelligenceResult`): `requestId`, `text`, `structured?` (schema-validated), `provider`, `model` (BC AI's own reported strings — metadata only; the core never branches on them), `latencyMs`, `usage` (tokens), `providerAttempts`.

**Defaults**: timeout 120s · maxTokens 4096 · temperature 0.2 · prompt cap 200k chars · response cap 1M chars · provider retries 1 · backoff 1s.

**Model selection** stays in BC AI configuration: adapter default = `getFastModel() || getDefaultModel()` (i.e. `AI_FAST_MODEL` → `AI_DEFAULT_MODEL`); overridable per-adapter via `BcAiAdapterOptions.model` (used by tests). The Agent layer contains no model literal of its own.

## 5. BC AI ADAPTER

`BcAiIntelligenceAdapter` (`bc-ai-adapter.ts`), dependency-injected:
- `bcAiCall` — defaults to the real `callWithFallback`; tests inject mocks (offline).
- `now` / `sleep` — injected clocks (deterministic tests, no real waits).
- `onLog` — metadata-only audit sink (`IntelligenceLogEntry`); type structurally CANNOT carry prompt/response content, asserted by tests.

`responseFormat` is deliberately left unset — consistent with BC AI's STEP 5.1 decision; the adapter parses/validates itself.

## 6. PROVIDER ERROR MAPPING

Seven canonical categories (`IntelligenceError.category` + stable `code: "INTELLIGENCE_ERROR"`), mapped from `ProviderChainFailedError.errors` statuses:

| Evidence in chain | Category | Recoverable |
|---|---|---|
| HTTP 429 | `INTELLIGENCE_RATE_LIMIT` | yes |
| HTTP 401/403 | `INTELLIGENCE_AUTH_ERROR` | **no** |
| HTTP 408 / timeout-flavored text | `INTELLIGENCE_TIMEOUT` | yes |
| HTTP 5xx | `INTELLIGENCE_UNAVAILABLE` | yes |
| HTTP 400/404/413/422, "not configured" | `INTELLIGENCE_INVALID_REQUEST` | **no** |
| "empty response" | `INTELLIGENCE_PROVIDER_ERROR` | yes |
| unexpected throw | `INTELLIGENCE_PROVIDER_ERROR` | yes |
| schema failure after bounded retry | `INTELLIGENCE_RESPONSE_INVALID` | **no** |

Mixed chains classify by the first status found in priority order 429 → 401/403 → 408 → 4xx → 5xx, so a chain containing *any* rate-limit signal is treated as recoverable (documented, tested). Raw provider errors never reach the Agent core; `cause` preserves the original internally. Messages additionally pass a credential-pattern scrubber (`authorization|bearer|x-goog-api-key|api-key|sk-…|AIza…`) as defense-in-depth.

## 7. WAITING_INTELLIGENCE SEMANTICS

`waiting.ts` is the single mapping point (tested durably against the P2 engine):

- **Recoverable** (timeout/rate-limit/unavailable/provider-error) → `transitionTask(INTELLIGENCE_WAIT)` → task **WAITING_INTELLIGENCE**, category recorded in the audit event metadata. Same attempt is preserved. Resume via `resumeIntelligenceWait` → `INTELLIGENCE_RECOVERED` → RUNNING, same attempt continues.
- **Permanent** (auth/invalid-request/response-invalid) → `transitionTask(FAILURE)` → **FAILED**. Re-entry only via P2 `retryTask` (fresh blank attempt). Verified no-op-safe when the task concurrently moved (race handled: typed `InvalidTaskTransitionError` swallowed, state untouched).

Provider failure **never** creates a new TaskAttempt implicitly (§12); the integration test asserts `currentAttemptId` is unchanged across WAIT → RESUME.

## 8. FALLBACK / MODEL SELECTION

**REUSE, not reimplementation.** The adapter makes ONE kind of call — `callWithFallback` — which already performs provider fallback, in-provider model chain (120b→20b), and multi-key rotation, each bounded by BC AI's own per-call timeout. FACT: operationally the chain is Groq-only today (founder decision); DeepSeek/Gemini are architecturally present but dormant. The Agent neither knows nor cares — if the founder re-enables providers via `AI_PROVIDER_PRIORITY`, the Agent inherits the wider chain with zero changes.

## 9. STRUCTURED OUTPUT

`structured.ts`: raw text → size guard → `cleanJSONOutput` (BC AI's own fence/trailing-comma/wrapper recovery) → `JSON.parse` → zod `safeParse`. Failure → `INTELLIGENCE_RESPONSE_INVALID` with a content-safe reason (first 3 zod issues, ≤300 chars). The adapter may retry ONCE (bounded) with `correctionAddendum` — a ≤2,000-char corrective note carrying the failure excerpt, never the full raw output. No infinite loops.

## 10. PROMPT TRUST BOUNDARY

`prompt.ts` assembles five zones in fixed order: SYSTEM/AGENT POLICY → FOUNDER INSTRUCTION → TASK CONTEXT → **UNTRUSTED EXTERNAL DATA** → MEMORY. The system message states the boundary explicitly in Indonesian: data-zone content is DATA, never instruction, never permission — even when it mentions "founder", "izin", "approve", or boundary-like text. Fences are content-derived (`requestId`-tagged, padded beyond the longest `=` run in the content) so adversarial data cannot forge a zone close. Per-zone caps: policy 40k, founder 20k, context 40k, external 80k (tightest — it's the injection vector), memory 40k; total 200k enforced with `InvalidIntelligenceRequestError`. Memory is DATA: "founder previously allowed X" in memory cannot bypass policy (policy lives in the P1 engine, outside AI — unchanged).

## 11. TIMEOUT / RETRY

- **Per-call bound**: BC AI's `AbortSignal.timeout` (existing, untouched).
- **Overall bound**: ONE timer in `timeout.ts` wrapping ALL adapter activity (every attempt + backoff + parse). No stacked/uncontrolled timers — exactly one new clock boundary, tested with a hanging provider call (fires promptly; retry loop cannot outlive it; attempt count reported accurately from a closure counter).
- **Provider retry**: bounded (`1 + providerRetries`, default 2 calls), budget resets per request (no cross-request contamination — tested), permanent categories fail fast without burning retries (tested).
- **Task retry**: unchanged P2 semantics — explicit `retryTask`, fresh attempt. Proven separate in the integration test.

## 12. SECURITY

- **Secrets**: categories carry HTTP status/kind only; credential-pattern scrubber on any embedded detail; log entries are metadata-only and their type has no content fields (tested: founder text and model output provably absent).
- **Prompt injection**: structural zone separation + content-derived fences + explicit system boundary statement (§10, tested with adversarial fixtures).
- **Response spoofing**: model output is parsed against a schema; it can never become policy or a tool command (no execution path exists in P3).
- **Oversized prompts/responses**: hard caps both directions (tested).
- **API keys**: untouched — BC AI reads env vars server-side; the adapter never sees them (its injected `bcAiCall` takes a request object with no credential field).
- **Idempotency**: NOT claimed. `IntelligenceLogEntry` records requestId/outcome/provider/model/latency/attempts/usage per call for correlation; no fake request-id dedup invented.

## 13. TESTS

`scripts/test-bc-agent-p3-intelligence.ts` — **89 assertions, all passing, fully offline** (mocked `bcAiCall`, injected clock/sleep; zero network):

| Section | Coverage |
|---|---|
| 1. Contract | empty systemPolicy/founderInstruction/requestId rejected (`InvalidIntelligenceRequestError`); exactly 7 categories |
| 2. Success | text passthrough, structured passthrough, fenced-JSON recovery (BC AI cleaner), provider/model/usage/attempts metadata |
| 3. Failure mapping | 11 chain/error fixtures → correct category + recoverability; mixed-chain dominance; HTTP-status table |
| 4. Security | secret scrubbing in messages + details; logs metadata-only (success AND failure); no prompt/response fields |
| 5. Retry | recovery within bound, stop at bound, auth fail-fast, per-request budget reset |
| 6. Timeout | hanging call bounded by overall deadline; retry loop cannot outlive deadline |
| 7. Structured | unparseable → permanent RESPONSE_INVALID; corrective retry heals; oversize rejected; addendum bounded |
| 8. Trust boundary | zone framing, fence-forgery resistance, per-zone caps, total-cap rejection |
| 9. Coupling | model comes from config/injection, not Agent literals |
| 10. Integration | full chain on local staging DB: claim → recoverable failure → durable WAITING_INTELLIGENCE (attempt preserved, event metadata) → resume same attempt → structured success → VERIFYING → COMPLETED; permanent failure → durable FAILED → explicit retry attempt 2; terminal-task no-op safety |
| 11. Purity | `src/agent/**` imports no provider SDK; BC AI internals referenced ONLY by `bc-ai-adapter.ts` + `structured.ts` |

DB safety: hard localhost guard identical to P2 — production Supabase unreachable by this suite.

## 14. TYPECHECK

`npm run typecheck` → **exit 0** (FACT).

## 15. REGRESSION

| Suite | Result |
|---|---|
| P1 core (`test:bc-agent-p1-core`) | **183/183** |
| P2 persistence (`test:bc-agent-p2-persistence`) | **59/59** (localhost-guarded) |
| BC AI (`test:ai-tools-audit`) | **40/40** |
| RPG (`test:rpg-phase1a` / `test:rpg-phase1b`) | **49/49**, **31/31** |

## 16. FILES CREATED

- `src/agent/intelligence/types.ts` — contract, defaults, `IntelligenceProvider` port
- `src/agent/intelligence/errors.ts` — 7 categories, recoverable/permanent sets, HTTP mapping, sanitized `IntelligenceError`
- `src/agent/intelligence/prompt.ts` — trust-boundary assembly with caps
- `src/agent/intelligence/structured.ts` — bounded zod pipeline over BC AI's `output-validator`
- `src/agent/intelligence/timeout.ts` — single overall deadline
- `src/agent/intelligence/bc-ai-adapter.ts` — production adapter over `callWithFallback`
- `src/agent/intelligence/waiting.ts` — durable WAITING_INTELLIGENCE / FAILED mapping
- `src/agent/intelligence/index.ts` — public surface
- `scripts/test-bc-agent-p3-intelligence.ts` — 83-assertion suite
- `docs/BC_AGENT_P3_INTELLIGENCE_REPORT.md` — this document

## 17. FILES MODIFIED

- `package.json` — +1 line: `test:bc-agent-p3-intelligence` script. Nothing else.

## 18. DEPENDENCY CHANGES

**None.** zod was already present (`^3.23.8`). No new packages.

## 19. KNOWN LIMITATIONS

0. **Post-audit closure (2026-09-12, both regression-tested in the suite, now 89/89):**
   - **Recoverable-failure race guard** — `handleIntelligenceFailure`'s WAITING branch now mirrors the permanent branch: a duplicate recoverable failure while already `WAITING_INTELLIGENCE` returns the typed outcome instead of escaping as a raw `InvalidTaskTransitionError`. Pinned by the integration suite (typed outcome, state unchanged, no event churn) and a DB boundary matrix (recoverable-on-FAILED, duplicate-permanent-on-FAILED, exactly one INTELLIGENCE_WAIT event).
   - **Default audit sink** — the adapter no longer ships silent: without an injected `onLog`, every call (success, provider failure, AND contract rejection) emits one metadata-only `[BC Intelligence]` line (request id, outcome, category, provider, model, latency, attempts, token count). The log-entry type has no prompt/response field and the default sink adds none — content can never leak through this path (asserted by tests).
1. **No real-network smoke test in CI** — the suite is offline by design; the real `callWithFallback` path is exercised only in production. Mitigation: the adapter is a thin translation over an already battle-tested BC AI entry point. (RECOMMENDATION: a founder-run manual smoke when P5 wires the worker.)
2. **Operational chain is Groq-only** (founder decision) — "fallback" currently means the Groq model chain + key rotation. Architectural fallback to DeepSeek/Gemini remains available via `AI_PROVIDER_PRIORITY` without Agent changes. (FACT + documented distinction per brief §6.)
3. **Mixed-chain classification is optimistic** — a chain containing any 429 classifies as RATE_LIMIT (recoverable) even if another member failed with 401. Chosen deliberately: recoverable classification routes to WAITING (safe, resumable) rather than terminal FAILED. Documented + tested.
4. **No streaming** — Agent calls use the non-streaming path; the watchdog/`streamProviderText` machinery is unused by P3. Fine for plan/analysis workloads; revisit only if long generations become a need.
5. **Usage tokens are best-effort** — BC AI's streaming path reports zeros; non-streaming reports real usage. P3 uses non-streaming, so usage is real today.
6. **`IntelligenceLogEntry` is a port-level contract** — the default console sink guarantees an always-on trail, but DURABLE persistence of intelligence audit rows still belongs to the P4 tool-execution/evidence layer (same deferral pattern as P2's Evidence decision).

## 20. ACCEPTANCE CRITERIA

| Criterion | Status |
|---|---|
| IntelligenceProvider exists | ✅ `types.ts` |
| Agent Core depends only on abstraction | ✅ port-only surface; purity greps pass (§13.11) |
| Existing BC AI reused | ✅ `callWithFallback` + `output-validator` reused; nothing duplicated |
| No duplicate fallback engine | ✅ adapter makes one call type; chain/rotation/watchdog untouched |
| Provider errors normalized | ✅ 7 categories, typed, sanitized |
| Recoverable → WAITING_INTELLIGENCE | ✅ durable, tested |
| Permanent → FAILED | ✅ durable, tested |
| Timeout bounded | ✅ per-call (BC AI) + single overall (Agent) |
| Provider retry bounded | ✅ default 1 retry, fail-fast on permanent |
| Task retry separate | ✅ no implicit attempts; explicit P2 retry only |
| Structured output validated | ✅ zod + BC AI cleaner, bounded corrective retry |
| External content ≠ trusted instruction | ✅ structural zones + fences + explicit system statement |
| No secrets in errors/logs | ✅ scrubber + metadata-only logs, tested |
| No provider SDK in Agent Core | ✅ grep-proven |
| Existing BC AI tests pass | ✅ 40/40 |
| P1 183/183 | ✅ |
| P2 59/59 | ✅ |
| Typecheck | ✅ exit 0 |
| No Telegram/worker/tools/OpenCode/UI | ✅ none implemented |

## 21. RECOMMENDATION FOR P4

**P4 (Tools) can begin.** The substrate is ready:
- P1 `ToolDefinition` + policy + approval contracts are stable and exercised.
- P2's `consumeApproval` is transactionally single-use (proven) — the tool executor's gate.
- P3 provides the intelligence port the planner/summarizer roles will use.

Suggested P4 scope: tool registry + executor honoring `ToolDefinition` metadata (risk/reversible/approval), `ToolExecution` persistence model, evidence records (closing the P2 §16 deferral), and the first read-only tools (`github.read`, `repo.read`, `vercel.read`, `supabase.read`) — all L0/L1, no approval-path write tools yet. The intelligence port should be consumed for planning only: AI proposes, policy disposes.
