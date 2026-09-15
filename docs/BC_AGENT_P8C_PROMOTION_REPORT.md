# BC AGENT P8C PROMOTION REPORT

**Phase**: P8C Production Promotion — promote the PASS P8C reply-delivery transport to main
**Status**: **PASS**
**Date**: September 15, 2026
**Promoted commit**: `8a209746c74baf0578042856d2fe6f2564c7f240` — `feat(agent): add telegram reply delivery`
**Push**: `fb45c09..8a20974 main -> main` (plain fast-forward, no force)

---

## 1. STATUS

**PASS.** The exact P8C implementation (code + tests + report) was promoted to `origin/main` in a single clean commit, with zero unrelated content, zero history rewrite, and zero production contact.

## 2. Exact P8C commit

`8a209746c74baf0578042856d2fe6f2564c7f240` (short `8a20974`), parent `fb45c091` (`feat(activation): reduce classroom student join friction`). Message: `feat(agent): add telegram reply delivery` — verified non-conflicting against full history before commit (no prior use of the phrase).

## 3. Exact files promoted (9)

| File | Change |
|---|---|
| `src/agent/telegram/config.ts` | NEW — status-only delivery config (SET/MISSING/INVALID), dormant without well-formed token |
| `src/agent/telegram/transport.ts` | NEW — THE single outbound Telegram API boundary; typed results; bounded retry |
| `src/agent/telegram/delivery.ts` | NEW — outbound security boundary; chatId re-read from ACTIVE binding row |
| `src/agent/telegram/render.ts` | +19/−8 — redaction hardening (bare token, stack frames, ENV=value) + `renderCallbackAnswer` |
| `src/agent/telegram/gateway.ts` | +24/−8 — outcome carries authenticated `bindingId`; unauthenticated updates never replied to |
| `src/agent/telegram/index.ts` | +14 — barrel exports for config/transport/delivery |
| `app/api/agent/telegram/webhook/route.ts` | +35/−3 — async delivery via `after()`; canonical durable BEFORE ack |
| `scripts/test-bc-agent-p8c-telegram-delivery.ts` | NEW — 55-assertion suite incl. 9 static security gates |
| `docs/BC_AGENT_P8C_TELEGRAM_REPLY_DELIVERY_REPORT.md` | NEW — the P8C phase report (255 lines) |

Total: 1,409 insertions, 8 deletions, 9 files. (`scripts/p8d-production-census.ts` was deliberately EXCLUDED — it is a P8D artifact, not P8C.)

## 4. Git baseline

| At mission start | Value |
|---|---|
| Branch | `main` |
| HEAD | `fb45c091c00d725e534f42dd00649d22bbbc5ba4` (== origin/main after fetch) |
| origin/main | `fb45c091c00d725e534f42dd00649d22bbbc5ba4` |
| New since P8B report | `eb3e447` (live pulse), `fb45c09` (classroom join) — **neither touched any telegram path** (`git log 401d67c..HEAD -- src/agent/telegram app/api/agent/telegram` → empty) |
| Index | empty before staging |

## 5. Ownership proof

Hunk-level review of all four modified files confirmed **100% P8C-owned diffs** (bindingId threading, barrel exports, redaction patterns + callback helper, `after()` outbound leg). All untracked P8C files were created by the P8C session. One dead helper from P8C WIP (`renderDeliveryUnconfirmed`, zero references) was removed from `render.ts` before staging — tightening the boundary to shipped code only. Contamination verdict: **NONE**. Untracked/unstaged unrelated work (RPG, Pendekar assets, Live Pulse docs, Mac reports, question-bank pilots, `package.json`, `prisma/schema.prisma`, `app/.DS_Store`, P8D census script) was never staged and remains exactly as it was.

## 6–10. Regression gates (run pre-commit AND re-run post-commit on the committed tree)

| Suite | Result |
|---|---|
| P8C `test-bc-agent-p8c-telegram-delivery.ts` | **55/55 PASS** (both runs) |
| P8B `test-bc-agent-p8-telegram.ts` | **48/48 PASS** (both runs) |
| P5 `test-bc-agent-p5-worker.ts` | **64/64 PASS** (both runs) |
| P6 `test-bc-agent-p6-control.ts` | **87/87 PASS** (both runs) |
| P7 `test-bc-agent-p7-worker.ts` | **53/53 PASS** (both runs) |

## 11. TypeScript

`npx tsc --noEmit` → **exit 0, zero errors** (pre-commit and post-commit).

## 12. ESLint

`npx eslint` over all 8 P8C source/test files → **exit 0, clean**.

## 13. Build

`npm run build` → **exit 0**, `✓ Compiled successfully in 37.1s` (the `prisma:error` lines are the known build-time prerender noise, non-fatal, pre-existing).

## 14. Static security gates (re-verified at promotion)

A. single outbound boundary — `grep -rln api.telegram.org src/ app/ lib/` → only `transport.ts` ✅
B. tests use injected mock fetch / fake token only — suite design ✅
C. no token values anywhere — pre-commit staged-diff secret scan (regex on secret-shaped assignments) → clean; 19 `BC_AGENT_TELEGRAM_BOT_TOKEN` occurrences are env-name references, not values ✅
D. delivery re-reads ACTIVE binding chatId from DB (`delivery.ts`, suite ok 29–32) ✅
E. caller chatId cannot control delivery (never accepted as input; suite ok 30) ✅
F. delivery failure cannot mutate canonical outcome (suite ok 36–37, 40) ✅
G. timeout UNCERTAIN, never retried (suite ok 18–19, 38) ✅
H. bounded retry: 3 attempts max, 429 retry-after honored/clamped ≤2s, 250ms exponential backoff bounded, no 400/401/403 retries, no timeout retries (suite §3) ✅
I. no ToolExecutor/worker imports, no shell, no OpenCode, no arbitrary network clients, no canonical-table mutation under telegram (suite gates ok 47–55) ✅
J. webhook dormant branch intact — 404 without secret env verified in committed route (and live-verified during P8D) ✅

## 15. PR / merge details

Direct-to-main promotion per repository workflow (P8B promotion precedent; no PR process in evidence). Pre-push checks: `origin/main..HEAD` = exactly `8a20974`; `HEAD..origin/main` empty; `merge-base --is-ancestor` OK → pure fast-forward. `git push origin main` — no force flags.

## 16. CI result

GitHub Actions run **`34944953156`** ("CI", push event, main) auto-triggered; observed to completion: **conclusion = success** (~4 min, consistent with the repo's green baseline).

## 17. Vercel result

Not independently observable from this environment (no Vercel CLI token; interactive auth unavailable). If auto-deploy from main is configured, the `8a20974` deploy proceeds on its own; nothing was triggered manually. Note: deploying P8C changes NO production behavior — delivery remains dormant without `BC_AGENT_TELEGRAM_BOT_TOKEN`.

## 18. Production activation status

**NOT ACTIVATED.** No `setWebhook`, no Telegram API call of any kind, no message sent.

## 19. Production migration status

**NOT APPLIED.** `AgentTelegramBinding` / `AgentCommandDedupe` remain absent from production schema (P8D census finding stands; migration still requires explicit Founder authorization).

## 20. Credential status

**UNTOUCHED.** No credentials created, read, modified, or printed.

## 21. Webhook status

**NOT REGISTERED** — production webhook remains 404-dormant.

## 22. Telegram smoke status

**NOT RUN** — gated on P8D Founder prerequisites.

## 23. Unrelated work preserved

All pre-existing dirty state survived byte-identical: modified (`app/.DS_Store`, `lib/game/rpg/server-contracts.ts`, `lib/game/rpg/server-state.ts`, `package.json`, `prisma/schema.prisma`) and the full untracked set (RPG/Pendekar assets, Live Pulse docs, Mac reports, question-bank pilots, investor docs, `scripts/p8d-production-census.ts`, `scripts/test-rpg-reward-settlement.ts`, migration SQL). Index verified empty before staging, after commit, and after push.

## 24. Remaining Founder Gate (from P8D — unchanged by this promotion)

1. Set `BC_AGENT_TELEGRAM_BOT_TOKEN` + `BC_AGENT_TELEGRAM_WEBHOOK_SECRET` in Vercel production (Founder-provided; agent must not create credentials).
2. Explicitly authorize the add-only production migration `prisma/migrations/manual/2026-09-15_bc_agent_p8b_telegram.sql`.
3. Enroll the Founder binding via Founder Control Center.
4. Explicitly authorize webhook registration (exact operation prepared in P8D report §8).

With P8C now on main, activation will have end-to-end outbound reply capability from the first smoke test.

## 25. Recommendation

Proceed to **P8E only after all four Founder prerequisites above are explicitly cleared**. Execution order per P8D report §20: census verify (tables EXIST) → dormant→armed probe → `setWebhook` verbatim → `getWebhookInfo` + probes → founder smoke (`/status`, `/health`, one read; DELIVERED telemetry required) → approval smoke. This report itself is intentionally **uncommitted** (created after the promotion commit was pushed; per standing policy no automatic second commit without explicit authorization) — promote it docs-only whenever the Founder directs.
