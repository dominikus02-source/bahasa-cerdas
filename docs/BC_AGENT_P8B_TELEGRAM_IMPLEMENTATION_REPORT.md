# BC AGENT P8B — TELEGRAM REMOTE CONTROL IMPLEMENTATION REPORT

## 1. STATUS

**PASS WITH NOTES** — every acceptance gate executed with evidence. Notes: (a)
`package.json` intentionally untouched (parallel-session modifications; P8B
adds no dependency — zod was already present); (b) staging retains one
test-founder User row + one fixture binding row (documented in §16); (c) the
reply-delivery path (Telegram sendMessage) is deliberately deferred to P8C —
results are durable in the DB and the transport ack contract is proven.

## 2. FILES CHANGED (all P8B-owned, all left UNCOMMITTED per directive)

New:
| File | Purpose |
|---|---|
| `src/agent/telegram/types.ts` | Bounded update/command types, read/mutation unions, opaque denial reasons |
| `src/agent/telegram/adapter.ts` | zod update validation, size caps, strict command vocabulary parser |
| `src/agent/telegram/identity.ts` | Fail-closed binding resolution → `FounderAccess` contract; User resolved by binding's userId (never by Telegram-supplied name) |
| `src/agent/telegram/rate-limit.ts` | Fail-closed limiter (mutations deny when backing absent); injectable counter |
| `src/agent/telegram/rate-limit-upstash.ts` | Upstash-backed counter (separated so the core has no Redis/Next imports) |
| `src/agent/telegram/render.ts` | Allowlisted bounded replies + `redactSecrets` defense-in-depth |
| `src/agent/telegram/create-task.ts` | Deterministic `tg-<updateId>` task creation via canonical `createTask` upsert |
| `src/agent/telegram/gateway.ts` | Pipeline: parse → identity → rate limit → dedupe → canonical commands → bounded reply |
| `src/agent/telegram/index.ts` | Barrel export |
| `app/api/agent/telegram/webhook/route.ts` | DORMANT transport (404 without `BC_AGENT_TELEGRAM_WEBHOOK_SECRET`; constant-time secret header check; always-2xx ack policy) |
| `app/(dashboard)/admin/agent/telegram/page.tsx` | Founder-only binding enrollment/revocation (server actions re-run `authorizeFounder`) |
| `scripts/test-bc-agent-p8-telegram.ts` | 48-assertion adversarial suite (localhost-staging-gated) |
| `prisma/migrations/manual/2026-09-15_bc_agent_p8b_telegram.sql` | Additive staging migration |
| `docs/BC_AGENT_P8B_TELEGRAM_IMPLEMENTATION_REPORT.md` | This report |

Modified:
| File | Change |
|---|---|
| `prisma/schema.prisma` | Trailing additive block: `AgentTelegramBinding` + `AgentCommandDedupe` (diff verified purely additive; **the working diff also contains the parallel session's Pendekar block — hunk surgery required at commit time**) |
| `app/(dashboard)/admin/agent/page.tsx` | One "Telegram Binding" link in the CC header |

**Untouched (verified by design and by the static gates):**
`src/agent/core/**`, `src/agent/persistence/service.ts`,
`src/agent/control/commands.ts`, `src/agent/worker/**`, `package.json`.

## 3. DATABASE CHANGES

Two additive models (P8A §27 exactly):

- `AgentTelegramBinding` — `telegramUserId @unique` (structurally prevents
  ambiguous active bindings), `telegramChatId`, `userId`, `boundBy`,
  `revokedAt` (active iff NULL), `lastSeenAt`, timestamps.
- `AgentCommandDedupe` — `dedupeKey @unique` (`tg:<updateId>:<command>`),
  `command`, `telegramUpdateId BigInt?`, `resultCode`. Survives restarts;
  in-memory dedupe is nowhere a source of truth.

Applied **staging only** (§16). No production migration.

## 4. ARCHITECTURE IMPLEMENTED

Exactly the P8A boundary: Telegram update → transport gate (webhook route) →
adapter (validate/normalize/parse) → identity (fail-closed binding) → rate
limit (fail-closed mutations) → dedupe (CAS via unique key) → **canonical**
`control/commands.ts` mutations / `persistence/queries.ts` reads →
allowlisted bounded reply. The gateway injects a Telegram-resolved
`authorize` closure implementing the P6 `FounderAccess` contract, so the
canonical command layer runs unmodified. Telegram-created tasks carry
`channel: "TELEGRAM"` (the enum value that already existed).

## 5. AUTHENTICATION

Transport: dormant 404 without secret env; `X-Telegram-Bot-Api-Secret-Token`
constant-time compared, 401 pre-parse otherwise. Identity: binding row +
active check + exact chat match + canonical founder predicate
(`isFounder || role === "ADMIN"`, same vocabulary as `control/auth.ts`).
Senderless messages DENY (decided during implementation — channel posts
cannot be authorized).

## 6. AUTHORIZATION

Explicit enrollment only, via the session-gated CC page; no name/username
inference exists in code. Unknown/wrong-chat/revoked/malformed → one opaque
"Akses ditolak." (no binding-existence oracle). Revocation takes effect on
the next command. Proven by tests 1–6.

## 7. IDEMPOTENCY

Two independent layers: (1) dedupe ledger unique on
`tg:<updateId>:<command>` — replays return the recorded outcome ( losers get
`duplicate: true`, never a second canonical call); (2) deterministic task id
`tg-<updateId>` hitting `createTask`'s idempotent upsert. Proven: duplicate
update/command/callback, concurrent 3-way delivery → exactly one task row and
one approval row; replayed /approve executes nothing twice.

## 8. APPROVAL SECURITY

Telegram supplies ONLY the task pointer. `toolName`/`inputHash`/`attemptId`
are read server-side from the persisted parked `ToolExecution`
(`control/commands.ts`, unmodified). Binding + expiry + single-use
consumption inside ToolExecutor unchanged. Forged wrong-attempt and expired
rows (created at row level because canonical `createApproval` refuses to
build them — itself evidence the guard exists) are rejected typed
(`APPROVAL_EXPIRED` proven). Concurrent /approve → exactly one approval row.

## 9. RATE LIMITING

Mutations 10/min, reads 30/min per bound user. **Fail-closed for mutations**
when the backing is absent (diverges deliberately from the fail-open
`lib/rate-limit.ts` — documented in module header, per P8A F5). Proven:
12-command flood → limit trips, task creation bounded.

## 10. INPUT VALIDATION

zod envelope validation pre-DB; text ≤4000, callback ≤64; strict vocabulary
(fixed keywords + task-id pointers; free text valid only as /create
instruction). Malicious/prompt-injection text proven to land verbatim in
`AgentTask.instruction` (P3 trusted zone) with no privileged path.

## 11. SECRET HANDLING

No secrets in logs or replies: allowlisted field rendering + `redactSecrets`
(bot-token, sk-, postgres://, JWT, private-key shapes). Webhook route never
prints the token. Proven by redaction tests + reply-content scan.

## 12. FAILURE ISOLATION

DB down → fail-closed denial, no crash (proven against a dead endpoint).
Canonical outcome durable regardless of transport (proven). Worker shares no
state with the adapter (structural: zero imports; P5 suite green with the
module present). Webhook returns 2xx after secret check — no retry storms.

## 13. TEST RESULTS

`scripts/test-bc-agent-p8-telegram.ts`: **48 passed / 0 failed** (exceeds the
40 minimum; all 44 mandated cases present: AUTH 6, INPUT 6, IDEMPOTENCY 6
incl. concurrent, APPROVAL 8 incl. concurrent, COMMANDS 11, SECURITY 3+static
gate, RESILIENCE 5).

## 14. STATIC SECURITY GATES

Automated in-suite (comments stripped before scanning, 9 files): no
ToolExecutor import · no `../worker/` import · no child_process · no
execSync/spawnSync/spawn · no opencode · **zero** direct Prisma mutations of
canonical tables from telegram modules (only `agentTelegramBinding` and
`agentCommandDedupe` writes exist). Gates: PASS.

## 15. REGRESSION RESULTS

| Gate | Result |
|---|---|
| P5 | **64/64** |
| P6 | **87/87** |
| P7 | **53/53** |
| P8 | **48/48** |
| `tsc --noEmit` | **0 errors** excluding the known parallel-session file (`app/arena/game/rpg/preview/page.tsx` — pre-existing, untouched, documented) |
| eslint (all new files) | **clean** |
| `npm run build` | **success — 425 pages**; `ƒ /admin/agent/telegram`, `ƒ /api/agent/telegram/webhook` registered |

## 16. STAGING MIGRATION RESULT

`2026-09-15_bc_agent_p8b_telegram.sql` applied to
`localhost:5432/bahasacerdas_staging` (ON_ERROR_STOP): 3 tables+indexes
created, zero errors. Existing agent data unaffected (65 tasks before/after;
worker rows untouched). Post-suite cleanup removed all test tasks/dedupe
rows; retained intentionally: 1 fixture binding + 1 raw-SQL test founder User
(staging-only; deletable via the same provenance rules). Rollback: `DROP
TABLE "AgentCommandDedupe"; DROP TABLE "AgentTelegramBinding";` — additive
only, no dependency from canonical code (the module denies if the tables are
absent — fail-closed).

## 17. PRODUCTION CHANGES

**NONE.** No production migration, no webhook registered, no Telegram API
call made, no bot credentials created or requested, no production worker
touch, no production data modified.

## 18. KNOWN LIMITATIONS

1. Reply delivery (`sendMessage`/`answerCallbackQuery`) not implemented —
   results are durable in the DB; the webhook ack contract is proven. P8C.
2. Schema working diff entangled with the parallel Pendekar block — commit
   time requires hunk surgery (my block is a clean trailing region).
3. The webhook's pre-identity Upstash absorber is wired but no explicit
   global threshold is enforced there yet (per-user limits are enforced).
4. CC enrollment page is minimal (no nonce pairing flow — the directive's
   simple explicit-binding path was chosen; founder enters IDs under
   session; acceptable because possession of the Telegram account + chat is
   verified at command time).
5. Staging `User` table lags `schema.prisma` (no `nickname` column) — the
   test suite works around it with raw SQL; unrelated to P8B runtime.

## 19. P8C RECOMMENDATION

1. Telegram reply delivery module (bounded, post-commit, 5s timeout, 2
   retries) + callback answers.
2. Set `BC_AGENT_TELEGRAM_WEBHOOK_SECRET` in staging; founder registers
   webhook via BotFather manually (never auto).
3. End-to-end staging smoke with a real bot in a test chat.
4. Founder decides DB-vs-Redis retention for dedupe rows (add a TTL cleanup).
5. Optional: nonce-based pairing UX upgrade for enrollment.
