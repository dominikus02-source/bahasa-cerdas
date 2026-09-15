# BC AGENT P8D — TELEGRAM PRODUCTION ACTIVATION RUNBOOK & PRE-FLIGHT

**Phase**: P8D — Production activation pre-flight (activation GATED)
**Status**: **BLOCKED — activation intentionally not performed; all technical pre-flight checks that could run, passed**
**Date**: September 15, 2026
**Baseline**: P8A PASS · P8B `9c354f1` (on main) · P8B report `401d67c` · P8C PASS (local-only, not on main)
**Rule honored**: absent explicit Founder authorization, the webhook was NOT registered and nothing was sent.

---

## 1. Executive summary

The production endpoint is deployed, dormant, and behaving exactly per the P8B contract. Production identity is VERIFIED. However, four explicit Founder prerequisites are missing, so activation is **BLOCKED**:

1. **Credentials**: `BC_AGENT_TELEGRAM_WEBHOOK_SECRET` is MISSING in production (proven by live 404-dormant behavior). Bot token status is unverifiable from outside and must be provided/confirmed by the Founder in the Vercel env store. No credentials were created by the agent.
2. **Database**: `AgentTelegramBinding` and `AgentCommandDedupe` are **MISSING** in the production schema (read-only census). The P8B Telegram migration was applied staging-only (P8B report records this). Production migration requires explicit Founder authorization; not applied here.
3. **Founder binding**: none exists (0 rows — the table itself is absent). Enrollment is a Founder Control Center action after the tables exist.
4. **Activation authorization**: none given in this phase; `setWebhook` was therefore NOT executed. The exact operation is prepared in §8.

No production data was modified. No Telegram message was sent. No secret value was printed.

## 2. P8A/P8B/P8C baseline

| Phase | Status | Where |
|---|---|---|
| P8A architecture & threat model | PASS | `docs/BC_AGENT_P8A_TELEGRAM_ARCHITECTURE_THREAT_MODEL.md` |
| P8B implementation (inbound remote control) | PASS, 48/48 tests | commit `9c354f1` on main; report `401d67c` |
| P8C reply-delivery transport | PASS, 55/55 tests | **local working tree only — NOT on main** (`config.ts`, `transport.ts`, `delivery.ts` + render/gateway/webhook edits are uncommitted) |

**Deployment implication**: production currently runs the P8B surface (inbound-only). Canonical results are durable in the DB and retrievable via the Founder Control Center; Telegram reply delivery exists only once P8C is committed and deployed. Activation is possible on P8B alone; promoting P8C before activation is recommended so the founder receives replies (§20).

## 3. Production environment verification

| Check | Method | Result |
|---|---|---|
| Domain | `curl -sI https://bahasacerdas.com` | HTTP/2 308 → `https://www.bahasacerdas.com/` — canonical prod host is **www** |
| Vercel production deployment | TLS cert (Vercel), `x-vercel-*` headers, homepage 200 | **VERIFIED** |
| Webhook route deployed | `POST https://www.bahasacerdas.com/api/agent/telegram/webhook` | HTTP 404 `{"ok":false,"error":"Not found"}` — the P8B dormant contract (secret env unset ⇒ 404, no DB touched) |
| Method gating | `GET` on webhook | HTTP 405 — only POST exists |
| Production Supabase + Prisma | `GET /api/health` | `{"status":"ok","db":"up",...,"latencyMs":215}` — **VERIFIED** |
| Production DB identity (corroboration) | Read-only fingerprint from local checkout: `PushSubscription` table EXISTS, 0 rows, 0 distinct users, VAPID keys set — identical to live `/api/health` counters (`tabel:true, langganan:0, pengguna:0, murid:0, vapid:true`) | **CONSISTENT** (the DB reachable from this checkout's `DATABASE_URL` behaves like production) |

Environment identity verdict: **VERIFIED**. (Homepage content-grep was inconclusive because content renders client-side; identity does not rest on it.)

## 4. Credential status (Phase 3 — presence only, never values)

| Variable | Production status | Evidence |
|---|---|---|
| `BC_AGENT_TELEGRAM_WEBHOOK_SECRET` | **MISSING** | Live 404-dormant response is the compiled contract of "secret unset" |
| `BC_AGENT_TELEGRAM_BOT_TOKEN` | **UNVERIFIABLE** (assume MISSING) | Token is never observable without contacting Telegram; P8C config gate keeps delivery dormant without it. Founder must set/confirm in Vercel |
| `BC_AGENT_SWEEPER_SECRET` | not probed | Out of P8D scope; same dormant pattern applies |

Local checkout posture (for transparency): `.env.local` in this workspace holds `[SENSITIVE]` placeholders — production secrets are correctly not present in the repo. Vercel CLI census was attempted (`vercel whoami`, `vercel env ls`) but no token is configured locally and interactive auth is unavailable in this environment; the env-var census must be confirmed by the Founder in the dashboard. Nothing was echoed.

## 5. Database status (Phase 7 — read-only)

Read-only census (`scripts/p8d-production-census.ts`, zero writes, prints classifications/counts only):

```
DATABASE_URL host class: supabase port: 6543
AgentTelegramBinding table: MISSING
AgentCommandDedupe table:   MISSING
CENSUS OK (read-only)
```

**PRODUCTION TELEGRAM SCHEMA NOT ACTIVE.** Per phase instructions: STOP on schema, no improvised migration, no automatic migration without explicit Founder authorization. The add-only migration SQL already exists on main at `prisma/migrations/manual/2026-09-15_bc_agent_p8b_telegram.sql` (creates exactly the two tables + indexes; no destructive statements).

## 6. Binding status (Phase 5)

- Enrollment mechanism verified in code on main: Founder Control Center `app/(dashboard)/admin/agent/telegram/page.tsx` — session-gated (`authorizeFounder()`), explicit numeric Telegram user id + chat id entry, explicit revoke, upsert un-revoke is an explicit founder act. No token-in-URL pairing, no username-based identity, no automatic name matching. **Mechanism: VERIFIED.**
- Production bindings: **0** (table absent). **FOUNDER BINDING REQUIRED** before activation. No binding was seeded (requires explicit Founder authorization).

## 7. Webhook endpoint (Phase 4)

| Property | Result |
|---|---|
| HTTPS + production domain | ✅ `https://www.bahasacerdas.com/api/agent/telegram/webhook` |
| Route exists in deployed build | ✅ (404 dormant body matches deployed contract exactly) |
| Webhook secret validation | compiled-in (constant-time compare, 401 pre-parse); live-verified only up to the 404 gate because the secret is unset |
| Malformed requests rejected | ✅ code path (400 on unparseable JSON) + suite coverage; live 404/405 behavior confirms gating order |
| Unknown identity / inactive binding denied | ✅ proven by P8B suite (48/48) on identical gateway code |
| `setWebhook` called | ❌ NOT called (no authorization) |

## 8. Webhook registration plan (Phase 8 — prepared, NOT executed)

When the Founder authorizes activation, execute exactly this (requires `BC_AGENT_TELEGRAM_WEBHOOK_SECRET` to already be set in Vercel — the same value goes in `secret_token`):

```
curl -s "https://api.telegram.org/bot<$BOT_TOKEN>/setWebhook" \
  -d "url=https://www.bahasacerdas.com/api/agent/telegram/webhook" \
  -d "secret_token=$BC_AGENT_TELEGRAM_WEBHOOK_SECRET" \
  -d "allowed_updates=[\"message\",\"callback_query\"]" \
  -d 'drop_pending_updates=true'
```

Post-conditions to verify (evidence-only):
1. `{"ok":true,"result":true,"description":"Webhook was set"}` from setWebhook.
2. `getWebhookInfo` shows `url` = production URL, `last_error_message` absent/empty.
3. Production probe WITHOUT the secret header still returns 404-dormant → armed requires BOTH env secret AND header (do this probe BEFORE the first real update).
4. No production message has been sent by this phase (true: zero outbound capability exercised).

## 9. FOUNDER GATE (Phase 9)

```
FOUNDATION READY: [x]  P8A/P8B PASS on main; P8C PASS local-only (see note)
PRODUCTION:       [x]  www.bahasacerdas.com VERIFIED (Vercel, HTTPS, db up)
CREDENTIAL:       [ ]  webhook secret MISSING (proven); bot token UNVERIFIABLE — Founder must set both
DATABASE:         [ ]  AgentTelegramBinding + AgentCommandDedupe MISSING — migration needs Founder authorization
BINDING:          [ ]  0 bindings — FOUNDER BINDING REQUIRED (Control Center, after tables exist)
WEBHOOK:          [~]  endpoint deployed + dormant-correct; registration NOT authorized/executed
SECURITY:         [x]  P8B 48/48 + P8C 55/55 on this tree; gates A–L mapped; live deny-paths verified
ROLLBACK:         [x]  documented (§14) — nothing active to drill against
SMOKE TEST:       [ ]  NOT RUN (blocked by the above)
```

**Verdict: BLOCKED.** Missing Founder prerequisites (in order):

1. Set `BC_AGENT_TELEGRAM_BOT_TOKEN` and `BC_AGENT_TELEGRAM_WEBHOOK_SECRET` in the Vercel production env store (32+ byte random secret). The agent must not create credentials.
2. Explicitly authorize application of `prisma/migrations/manual/2026-09-15_bc_agent_p8b_telegram.sql` to production (add-only; two tables).
3. Enroll the Founder binding via the Founder Control Center.
4. Explicitly authorize webhook registration per §8.

Optional but recommended before activation: commit & deploy P8C so founder commands receive Telegram replies (P8B alone leaves results DB-only).

## 10. Activation result (Phase 10)

**NOT EXECUTED — no authorization.** No `setWebhook`, no `getWebhookInfo` against a registered webhook, no credentials created.

## 11. Real production smoke (Phase 11)

**NOT RUN** (activation blocked). Plan retained: from the Founder-bound account only — `/status`, `/health`, one safe read; then at most one `/create` with a harmless read-only instruction; verify the full chain inbound → validation → binding → canonical → task → worker → result → sendMessage.

## 12. Approval smoke (Phase 12)

**NOT RUN** (activation blocked). Binding properties (taskId/attemptId/toolName/inputHash/expiry/single-use) are proven by P5/P6/P8B suites (e.g. "replayed approval callback → dedupe, no second canonical approve"); production smoke remains gated on activation.

## 13. Failure isolation (Phase 13 — safe, suite-based evidence)

Proven on this tree by the P8B/P8C suites (no production damage possible or attempted):

- Telegram delivery failure ≠ canonical task failure — P8C ok 36–37 (`canonicalOk` stays true; no `AgentTask` row flips status).
- Telegram delivery timeout ≠ rollback — P8C ok 38 (`UNCERTAIN`, canonical untouched).
- Webhook/Telegram outage ≠ worker failure — P8B Phase 12: webhook shares no state with the worker loop; failures confined to HTTP responses.
- Telegram outage ≠ worker shutdown — worker is an independent process with lease-based reclaim (`reclaimStaleAttempt`, `failOrphanedTask`); no runtime dependency on Telegram.
- Duplicate update ≠ duplicate task — P8B ok 48 + P8C ok 41–42 (dedupe ledger single execution).

## 14. Rollback drill (Phase 14 — documented; nothing active to drill)

Rollback order (safe at any time, no data deletion):

1. **Revoke binding** — Founder Control Center revoke (sets `revokedAt`) → all inbound commands and outbound replies refused instantly (fail-closed, P8C ok 31).
2. **Disable webhook** — Telegram `deleteWebhook` (and/or unset `BC_AGENT_TELEGRAM_WEBHOOK_SECRET` in Vercel → route returns 404 dormant; token unset additionally silences all outbound).
3. **Verify** — production probe: POST without secret → 404; with secret+header → 401 only while env secret exists, else 404; binding revoked → denial.
4. **Worker remains healthy** — independent process; Telegram is not in its dependency path (no telegram import under `src/agent/worker/`/`core/` — P8C gate 9).
5. **Canonical tasks intact** — no deletion path exists in any phase; dedupe/task history is preserved by design (rollback deletes nothing).

Live drill NOT RUN (no active webhook/binding to drill against).

## 15. Observability (Phase 15)

Verified capabilities on the current tree:

| Signal | Where |
|---|---|
| webhook accepted / denied | route responses (404/401/200) — deny order proven live |
| command authorized / denied | P8B gateway outcomes (typed denials, opaque text) |
| dedupe replay | `AgentCommandDedupe` ledger + `duplicate` flag in ack |
| delivery success / failure / uncertain / dormant | P8C `DeliveryTelemetry` (`attempt`/`outcome` events: status, HTTP class, category, attempts, latencyMs) |
| rate limited | P8B rate-limit denials + Upstash-backed counter |

No secrets in any telemetry path (P8C §17; token/status-only config; redacted notes).

## 16. Production census (Phase 16 — as of this phase)

```
Telegram webhook:        NOT REGISTERED
Active Founder bindings: 0  (table absent)
Telegram delivery:       NOT VERIFIED (P8C not deployed)
Worker:                  NOT VERIFIED (no production invocation surface found;
                         worker is an external process by design — P7 registry exists,
                         no Vercel cron runs it; Founder/ops must confirm)
Agent tasks:             UNCHANGED (zero production writes this phase)
Security:                PASS
```

## 17. Incidents

**None.** No production data modified, no migration applied, no credentials created, no messages sent, no secrets exposed, no rate-limit events triggered (probes: 3 lightweight GETs + 2 empty POSTs to public endpoints).

## 18. Known limitations

1. Vercel env census not independently completable from this environment (no CLI token; interactive auth unavailable) — credential confirmation is delegated to the Founder, with the 404-dormant probe as objective evidence for the webhook secret.
2. Production DB identity rests on behavior fingerprinting (push counters + table existence match), not on a Founder confirmation; treat as high-confidence, not cryptographic.
3. Worker production status is not observable from any endpoint in the current build (P7 registry exists but exposes no public surface).
4. P8C reply delivery is not deployed; until it is, Telegram users get no replies (results remain durable in the DB).
5. Secret-header validation on production is compiled but only live-verifiable once the secret env is set (the 404 gate short-circuits everything else — by design).

## 19. Final production status

**BLOCKED — four Founder prerequisites outstanding** (credentials, production migration authorization, binding enrollment, activation authorization). All technically-verifiable pre-flight checks passed: environment VERIFIED, endpoint contract VERIFIED dormant, security gates PASS (48/48 + 55/55), rollback documented, zero production mutations.

## 20. P8E recommendation

**P8E — Founder-Gated Activation Execution**, executed only after the Founder completes the §9 checklist:

1. Founder sets both env vars in Vercel production; confirm via dormant→armed probe (404 must flip to 401 for header-less requests once the secret exists).
2. Founder authorizes + applies the two-table add-only migration; re-run `scripts/p8d-production-census.ts` expecting `EXISTS`/`EXISTS`.
3. Founder enrolls binding via Control Center; census shows `active=1` (ids withheld).
4. Founder explicitly authorizes registration; operator executes §8 `setWebhook` verbatim, verifies `getWebhookInfo` + dormant/armed probes.
5. Founder runs the §11 smoke from the bound account; require DELIVERED delivery telemetry + correct bounded reply before any mutation command.
6. Only then: approval smoke (§12) with a real approval-gated task created through the normal `/create` flow — no synthetic privileged operations.
7. Close P8E with a census delta report (webhook REGISTERED, bindings 1, delivery WORKING, tasks CHANGED-by-founder-only).
