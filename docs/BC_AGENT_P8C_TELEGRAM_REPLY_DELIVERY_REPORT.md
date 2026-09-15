# BC AGENT P8C — TELEGRAM REPLY DELIVERY REPORT

**Phase**: P8C — Outbound Telegram reply-delivery transport & hardening
**Status**: **PASS**
**Date**: September 15, 2026
**Baseline**: P8B implementation `9c354f1`, P8B report `401d67c` (promoted, CI green)

---

## 1. STATUS

**PASS.** All Definition-of-Done boxes verified with evidence:

| Requirement | Evidence |
|---|---|
| Telegram outbound transport implemented | `src/agent/telegram/transport.ts` (sendTelegramMessage / answerTelegramCallback) |
| Exactly one Telegram API boundary | Gate 5/53: only `src/agent/telegram/transport.ts` constructs `api.telegram.org` URLs |
| sendMessage works against deterministic mock | P8C suite §2, ok 6–10 (mock fetch injected; zero real network) |
| Canonical state independent from delivery state | P8C suite §6, ok 36–39 (`canonicalOk` stays true on delivery failure) |
| Bounded retry | MAX_ATTEMPTS=3, backoff ≤2s ceiling, suite §3 ok 22–24 |
| 429 handling | retry-after honored (clamped), suite ok 15–16 |
| Timeout ambiguity documented | §8 below + `TIMEOUT_AMBIGUOUS` category + ok 18/19 |
| No token leakage | redact patterns + config status-only exposure, suite §1/§4 ok 1–3, 25–28 |
| Wrong-chat protection | chatId re-read from binding row, never caller input (§6) |
| Revoked binding protection | fail-closed refusal, zero network I/O (ok 31–32) |
| Response sanitization | renderer allowlist + redact pass + 3800-char bound (ok 45–46) |
| ≥35 P8C assertions | **55/55** (46 delivery + 9 static security gates) |
| P8B 48/48 | ✅ re-run after P8C changes |
| P5 64/64, P6 87/87, P7 53/53 | ✅ all re-run |
| typecheck / eslint / build | ✅ 0 errors / clean / pass |
| Static security gates | 9/9 (suite §9, ok 47–55) |
| No production Telegram contact | no real token in any env file; suite uses mock fetch + fake token |
| No production migration | no schema change in this phase |
| No production webhook | webhook remains dormant (404 without secret; token unset) |
| No commit / no push | index verified empty; nothing staged |

## 2. P8B BASELINE (UNCHANGED)

P8B inbound flow preserved exactly: zod adapter parse → identity (fail-closed DB binding) → rate limit → dedupe (`tg-<updateId>`) → canonical commands via `AgentTaskService` → bounded render. The gateway still acks and never blocks on Telegram API. No P8B file was redesigned; P8C only **extended** the gateway outcome (added `bindingId`) and the renderer's redact patterns.

## 3. TRANSPORT ARCHITECTURE

```
Canonical Result (durable)
  → gateway outcome (text + bindingId)
  → webhook route: after(() => safeDeliverReply(db, bindingId, text))
      → delivery.ts: re-read chatId from ACTIVE binding row (fail-closed)
      → transport.ts: redact → bound (3800) → POST https://api.telegram.org/bot<token>/sendMessage
      → typed DeliveryResult { delivered | failed | uncertain | dormant }
```

One outbound boundary (`transport.ts`). Renderer never sees the token. Delivery is **never** part of canonical state — `DeliveryResult` is a transport-only type.

## 4. SENDMESSAGE IMPLEMENTATION

- Request: `{ chat_id, text }` only. `parse_mode` is **deliberately never set** — plain text makes HTML/Markdown injection structurally inert (Telegram renders it literally).
- Text: `redactSecrets(text).slice(0, 3800)` (Telegram hard cap 4096, margin for envelopes). Callback answers capped at 180.
- chatId validation: non-empty, ≤64 chars, shape-checked; otherwise typed `BAD_REQUEST` refusal before any network I/O.
- Token: from `BC_AGENT_TELEGRAM_BOT_TOKEN` (P8A-established name, reused). Server-side only; never logged, never in thrown errors, never returned.
- `AbortController` 5s timeout per attempt (P8B report §19 recommendation).
- Never throws — every path returns a typed `DeliveryResult`.

## 5. CONFIGURATION

`src/agent/telegram/config.ts` — status-only surface:

| Env var | Status handling |
|---|---|
| `BC_AGENT_TELEGRAM_BOT_TOKEN` | MISSING (dormant) / INVALID (dormant, wrong shape never sent upstream) / SET (armed) |
| `BC_AGENT_TELEGRAM_WEBHOOK_SECRET` | MISSING / SET (inbound gate, unchanged from P8B) |

Token shape check: `^\d{6,12}:[A-Za-z0-9_-]{30,50}$`. Values are **never** exposed — only the enum. Current live posture: **no env file defines the bot token → delivery DORMANT in every environment** (verified via `grep -l` over `.env*`; nothing printed).

## 6. RENDERER

- P8B allowlist renders (`/status`, `/health`, `/help`) unchanged and bounded (≤3500 chars, `clip()` with `…(terpotong)` marker).
- `redactSecrets` hardened in P8C (suite caught two real gaps):
  - **bare Telegram token shape** (`\d{6,12}:[A-Za-z0-9_-]{30,50}`) — previously only the `bot<digits>:` URL form was caught;
  - **mid-line stack frames** (`[\w./\\-]+\.tsx?:\d+(?::\d+)?`) — previously only line-anchored `at …` frames were caught.
- Existing patterns kept: `sk-…` keys, `postgres(ql)://…` URLs, JWTs, PEM blocks, `ENV=value` assignments, whole `at` lines.
- Mutation responses reuse the same bounded rendering; the transport applies a second redact+bound pass before the wire (defense in depth).

## 7. DELIVERY SEMANTICS (Phase 6)

- **Canonical independence**: a canonical command that succeeds stays successful even when delivery fails. `deliverReply` returns `{ canonicalOk: true, delivery: <failed result> }`. No rollback, no state flip, ever. Suite ok 36–37 proves no `AgentTask` row changes status.
- **Timeout ambiguity**: a timed-out request MAY have been delivered. The transport reports `UNCERTAIN` (category `TIMEOUT_AMBIGUOUS`) and **does not retry** — Telegram sendMessage has no idempotency key, so a blind resend risks duplicate founder notifications, and a duplicated "OK" can provoke the founder into re-running a command. Documented in code + suite ok 18/19.
- **Delivery is at-least-once / uncertain under timeout.** Exactly-once is NOT claimed anywhere. No duplicate-suppression table was added (Phase 8 minimum-mechanism rule): the only inbound idempotency remains P8B's `tg-<updateId>` dedupe ledger.

## 8. RETRY POLICY (Phase 7)

| Class | Retry? | Notes |
|---|---|---|
| Connection refused/reset (`NETWORK`) | ✅ | request never left — safe |
| HTTP 500/502/503/504 | ✅ | transient server errors |
| HTTP 429 | ✅ | `retry-after` honored (clamped to 2s ceiling) |
| Timeout / mid-flight abort | ❌ | ambiguous — resend risk (see §7) |
| 400 / 401 / 403 / 404 | ❌ | permanent |
| Malformed response | ❌ | transport trusts HTTP status only |

Bounded: max 3 attempts (1 + 2 retries), exponential backoff 250ms base, hard 2s ceiling, ≤100ms jitter. No infinite loops possible (loop counter, no recursion). Suite ok 22–24.

## 9. IDEMPOTENCY (Phase 8)

- Inbound: P8B `AgentCommandDedupe` (`tg-<updateId>`), untouched. Suite ok 41–42 re-proves duplicate update → single execution.
- Outbound: **Telegram sendMessage provides no idempotency mechanism for this use case** (no client-supplied dedupe key on the Bot API). Explicitly documented: delivery is at-least-once / **uncertain** under timeout. Chosen strategy: do not resend on ambiguity; single retry budget only for failures that are provably pre-flight. No new DB table.

## 10. WEBHOOK BEHAVIOR (Phase 9 — DECISION: B. ASYNC)

**Choice: asynchronous delivery via `after()` from `next/server`** (available and already used in this repo — Next 16.2.6). Rationale:

1. Telegram API latency (up to 5s timeout × retries) must never delay the webhook ACK or the canonical command handler; the durable result is committed **before** the ack regardless.
2. `after()` tasks run post-response: a Telegram API failure cannot crash or slow the command handler; `safeDeliverReply` additionally converts any unexpected throw into a typed failed outcome.
3. The webhook still always returns 2xx after the secret check (Telegram retry policy on the inbound leg is unchanged from P8B).

Preserved from P8B: secret validation (404 without secret env), identity, dedupe, durable state, no worker dependency. Unauthenticated/malformed updates get **no** outbound reply at all — no channel-verification oracle for attackers.

## 11. SECURITY (Phase 11)

| Vector | Mitigation |
|---|---|
| Token leakage | token only inside `transport.ts`; status-only config; redact patterns on wire; never in errors/logs |
| chatId injection | chatId never accepted from update/task text — re-read from binding row at delivery time |
| Message injection | plain text (no parse_mode) + redact + 3800 bound |
| Oversized output | bounded at render (3500) and transport (3800) |
| HTML/Markdown injection | inert by parse_mode absence (suite ok 27) |
| Telegram API error leakage | opaque bounded notes (`http_400`), raw bodies never forwarded (ok 12) |
| Retry amplification | 3 attempts, 2s ceiling, no retry on ambiguity |
| 429 abuse | retry-after honored with clamp; bounded attempts |
| Wrong-chat response | delivery follows the binding ROW, never caller input (ok 29–30) |
| Stale binding | chatId re-read at delivery time, `revokedAt` checked |
| Revoked binding | fail-closed refusal, zero network I/O (ok 31) |
| Sensitive report content | renderer allowlist; no raw records, stack traces, SQL, or env values |
| Unauthorized response delivery | no reply to unauthenticated senders (bindingId absent from outcome) |

**Critical rule enforced**: a response goes ONLY to the `telegramChatId` on the authenticated ACTIVE binding that initiated the command.

## 12. FAILURE ISOLATION

- Telegram API failure does not alter worker state (P7 worker untouched; suite ok 40 proves AgentTask rows identical across a failing delivery).
- Delivery failure does not flip canonical lifecycle (`COMPLETED → FAILED` impossible from the delivery path).
- DB unavailable on the outbound leg → typed refusal, canonical result unaffected.
- No feedback loop: bot replies never re-enter command processing (gateway only runs on founder-initiated updates; delivery never calls the command layer).

## 13. TEST RESULTS

`scripts/test-bc-agent-p8c-telegram-delivery.ts` — **55/55 PASS** (min 35):

- CONFIG: 5 (missing/malformed/armed token, no value exposure)
- SENDMESSAGE SUCCESS: 5 (delivery, chatId, URL shape, bounds)
- FAILURE TAXONOMY: 11 (400/401/403/429/500/timeout/reset/malformed + raw-body blocking)
- RETRY POLICY: 3 (bounded count, exponential+ceiling, 400 permanent)
- SECURITY: 4 (token/DATABASE_URL/stack/env redaction) + 2 (inert markup, callback boundary)
- BINDING SECURITY: 5 (row-owned chatId, wrong-chat, revoked, unknown, never-throws wrapper)
- SEMANTICS: 6 (canonical independence ×3, timeout no-rollback, UNCERTAIN telemetry, gateway bindingId)
- ISOLATION: 3 (task rows identical, dedupe single-execution, single ledger row)
- RENDERER BOUNDS: 2
- STATIC GATES: 9 (Phase 13)

Mock Telegram API is deterministic (injectable `fetchImpl`/`sleep`/`now`); staging DB is localhost-gated (refuses non-localhost); suite force-exits after summary (test-runner convention).

## 14. STATIC SECURITY GATES (Phase 13)

All 9 verified twice (grep during development + embedded suite assertions ok 47–55):

1. no ToolExecutor import under telegram (comments excluded from check)
2. no worker internals / `core/` runtime import (P8B `import type` DI preserved)
3. no shell / child_process
4. no OpenCode
5. no direct canonical-table Prisma mutation from telegram
6. no token logging
7. no env dumping
8. exactly ONE Telegram outbound API implementation (`transport.ts`)
9. no Telegram fetch from worker/core

## 15. REGRESSION RESULTS (Phase 14)

| Suite | Result |
|---|---|
| P8B `test-bc-agent-p8-telegram.ts` | **48/48** ✅ |
| P5 `test-bc-agent-p5-worker.ts` | **64/64** ✅ |
| P6 `test-bc-agent-p6-control.ts` | **87/87** ✅ |
| P7 `test-bc-agent-p7-worker.ts` | **53/53** ✅ |
| P8C (new) | **55/55** ✅ |
| `tsc --noEmit` | **0 errors** ✅ |
| `eslint` (all P8C files) | **clean** ✅ |
| `npm run build` | **pass** ✅ |

Known unrelated parallel-session modifications (`prisma/schema.prisma`, RPG contracts/state, `package.json`, `app/.DS_Store`, RPG assets, untracked phase docs) were present before P8C, remain untouched, and the build/typecheck pass with them in place.

## 16. STAGING / MOCK RESULT (Phase 15)

Proven chain against the deterministic mock, zero real Telegram contact:

```
handleTelegramUpdate (real gateway, staging DB)
  → /status → canonical AgentTaskService read → renderer
  → outcome.text + bindingId
  → deliverReply (real delivery orchestrator, staging binding row)
  → sendTelegramMessage (real transport, fake token)
  → MOCK Telegram API (injected fetch) → DELIVERED
```

Failure paths proven on the same chain: mock 403 → delivery FAILED while `canonicalOk` stays true; mock timeout → UNCERTAIN; mock 500/429 → bounded retries.

## 17. OBSERVABILITY (Phase 16)

`TelegramDeliveryTelemetry` (injectable, default no-op) emits bounded secret-free events:

- `attempt` — attempt number, chatId class (`bound`/`unknown`)
- `outcome` — status (delivered/failed/uncertain/dormant), HTTP status, failure category, attempts, latencyMs

Never logged: bot token, Authorization header, message content, raw Telegram response bodies. Failure categories are coarse (`AUTH`, `RATE_LIMITED`, `TIMEOUT_AMBIGUOUS`, …) by design — enough for dashboards, useless for attackers.

## 18. PRODUCTION READINESS CHECKLIST (for P8D — NOT executed here)

| # | Item | Owner/action |
|---|---|---|
| 1 | Bot credential source | Founder creates bot via @BotFather; token into Vercel env `BC_AGENT_TELEGRAM_BOT_TOKEN` only |
| 2 | Webhook secret | Generate 32+ byte random `BC_AGENT_TELEGRAM_WEBHOOK_SECRET` (same env store) |
| 3 | Production URL | `https://bahasacerdas.com/api/agent/telegram/webhook` |
| 4 | Founder binding | Seed `AgentTelegramBinding` row (founder userId + telegramUserId + chatId) via staging-verified script — never via chat |
| 5 | Chat identity | Verify binding chat is the founder's private chat; bot privacy mode ON |
| 6 | Outbound delivery | Confirm config flips to `armed` (status-only check); first real send = `/status` smoke |
| 7 | Rate limits | Keep P8B defaults (10 mutations/min); verify 429 telemetry shows no founder-driven storms |
| 8 | Rollback | Unset bot token env → delivery+webhook dormant immediately (no code deploy needed) |
| 9 | Emergency revoke | Set `revokedAt` on binding row → all inbound commands and outbound replies refused instantly |
| 10 | Monitoring | Wire `TelegramDeliveryTelemetry` to logs; alert on AUTH/FORBIDDEN categories (binding/credential drift) |
| 11 | Smoke test | `/status` → expect DELIVERED outcome + correct bounded reply |
| 12 | Incident procedure | revoke binding → unset token → inspect telemetry categories → re-bind after root cause |

## 19. KNOWN LIMITATIONS

1. **Outbound delivery is not persisted** — no delivery log table; observability is telemetry-only (per minimum-mechanism rule). If durable delivery audit is ever required, that is a new schema decision for a later phase.
2. Timeout-ambiguous sends are **never resent** — a rare silent gap is possible; the founder can always re-ask via `/status`/`/task`.
3. `answerCallbackQuery` is best-effort, no retries (ephemeral UI state; durable reply is sendMessage).
4. Malformed-response handling trusts HTTP status; Telegram body `ok:false` with HTTP 200 would be treated as delivered (never observed in practice; noted for honesty).
5. Latency/backoff in tests uses injectable clock; production jitter is wall-clock-derived (0–99ms) — adequate, not cryptographic.
6. Renderer mutation-response texts for `/approve`, `/reject`, `/retry`, `/resume`, `/cancel`, `/create` reuse P8B canonical outcome strings bounded by the same redact+clip pass — a dedicated per-command template set is a possible P8D polish, not a security gap.

## 20. EXACT P8D RECOMMENDATION

Proceed to **P8D — Controlled Production Activation** as a checklist-gated phase, in this order:

1. Founder provisions bot credentials + webhook secret (checklist items 1–2); values only in Vercel env store.
2. Seed the founder binding row via script (item 4); verify with status-only config probe (`armed`).
3. Register the webhook via Telegram `setWebhook` API **once**, with `secret_token`; verify 404-without-secret behavior on production.
4. Run smoke `/status` (item 11); require DELIVERED + bounded reply before any mutation command is attempted.
5. Wire telemetry sink (item 10) BEFORE enabling any scheduled/automated Telegram flows — none exist today.
6. Document rollback drill (items 8–9) as a runbook; rehearse once on staging binding.
7. Do NOT widen the command surface in P8D; mutation commands remain exactly the P8B set.
8. Only after 7 consecutive green daily smoke runs, consider the deferred reply-delivery persistence (limitations §19.1) as a separate add-only migration.

---

*Report generated by BC Agent P8C session. No commit, no push, index empty — verification commands in transcript.*
