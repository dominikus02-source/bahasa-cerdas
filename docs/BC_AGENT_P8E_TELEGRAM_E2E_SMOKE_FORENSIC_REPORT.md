# P8E TELEGRAM E2E SMOKE FORENSIC REPORT

**Date**: September 15, 2026
**Mode**: Read-only investigation — no code/config/secret/DB change, no commit, no push, no deploy.

---

## Smoke
- `/start` observed: YES (Telegram UI shows sent)
- `/status` observed: YES (×2)
- reply observed: **NO**

## Webhook (getWebhookInfo, live during this forensic)

**The registered token returns `401 Unauthorized` from the Telegram Bot API.** The same token succeeded at `setWebhook`/`getWebhookInfo` earlier today (activation session, HTTP 200) — so it has been **revoked/rotated since activation**. Consequences, all evidence-backed:

- `getWebhookInfo` itself is now unobtainable (401) → URL / `pending_update_count` / `last_error_*` are **NO EVIDENCE** from Telegram's side.
- Inbound is very likely still reaching us (webhook registration + secret header do not require a live token), but **outbound is guaranteed dead**: every `sendMessage` would 401.
- This alone fully explains "no reply", but it does **not** explain the empty dedupe ledger — see Root Cause.

## Database (read-only)

| Check | Result |
|---|---|
| Binding | **active** (`revokedAt IS NULL`), `lastSeenAt = NULL`, bound 15-09 15:21:50 |
| Dedupe rows | **0** — empty ledger |
| AgentTask | total 2, **0** channel=TELEGRAM, 0 in last 3h |
| Worker registry | 4 RUNNING (latest heartbeat 16:36:35, **fresh**), 2 DRAINING (10:26), 3 STOPPED — healthy |

## Runtime

- **Webhook request observed: NO EVIDENCE either way** (no runtime log access from this environment; `vercel logs` CLI subcommand does not exist in v59; Vercel requires dashboard/Log Drain access — only the Founder can pull this).
- Live-route probe with the **registered secret**: **HTTP 200 `{"ok":true,"duplicate":false}`** — route alive on the latest deployment (deployed 4m prior), Vercel secret matches Telegram registration, gate enforcing.
- **Delivery attempt observed: NO** (dedupe empty ⇒ no command ever completed; delivery happens after execution).

## End-to-End Trace

| Hop | Status | Evidence |
|---|---|V
| Telegram → webhook | **NO EVIDENCE** | No runtime-log access; getWebhookInfo is 401-dead so Telegram-side confirmation is unobtainable. Live-route probe proves the endpoint works *when called with the right secret* — it does not prove Telegram called it |
| Secret gate | **PASS** | Live probe 200 with registered secret; 401 otherwise (this forensic session) |
| Binding | **PASS (static)** | Row active in DB. `lastSeenAt = NULL` = **hard negative evidence** that no authorized command ever *completed* the gateway pipeline |
| Gateway | **NOT REACHED or denied pre-dedupe** | Empty dedupe ledger: neither `/status` claimed a key (gateway step 5). Fork: (B1) request never arrived, or (B2) arrived but denied pre-dedupe at identity |
| Dedupe | **NOT REACHED** | 0 rows — `claimDedupeKey` creates the row *before* execution (gateway.ts:118) |
| AgentTask | NOT REACHED | `/status` is a read command — no task by design; task hop only applies to `/create` |
| Worker | PASS (health) | 4 RUNNING, fresh heartbeats; **untested by smoke** — read commands never depend on workers |
| Execution | **NOT REACHED** | Follows dedupe |
| Delivery | **FAIL (proven)** | Token revoked → any `sendMessage` returns Telegram 401; P8C transport returns `deliveryStatus: FAILED` |
| Telegram reply | **FAIL (proven)** | No reply arrived |

## Earliest Failure

**Inconclusive between two boundaries — both read-only-invisible without Vercel runtime logs:**

- **B1 — "Telegram → webhook" (request never arrived)**: Telegram retries with backoff, holds pending updates while errors persist, and `pending_update_count` is unobtainable (401-dead getWebhookInfo). Cannot be ruled out; also cannot be confirmed.
- **B2 — "identity" (arrived but denied pre-dedupe)**: denied commands write nothing (fail-closed). With `lastSeenAt = NULL` and empty dedupe, B2 is **consistent with every observed fact**, and — given the founder enrolled their binding ~1.5h before the smoke — **the most probable single explanation**: Telegram's webhook registration happened ~1.5h after enrollment, so founder messages sent **before registration** simply never reach us (Telegram holds no pending updates for a webhook that isn't registered yet).

- **Independent second defect (proven, but not the earliest hop)**: **the bot token was revoked after activation**. Even if the commands had executed, every reply would have failed at `sendMessage` with Telegram 401 — and the P8C transport would (correctly, by design) have returned `deliveryStatus: FAILED` without touching canonical state.

## Root Cause (two independent defects)

1. **Token revoked post-activation** (proven): getWebhookInfo → `{"ok":false,"error_code":401,"description":"Unauthorized"`. The same token succeeded at activation. Outbound replies are dead until a fresh token from @BotFather goes into Vercel Production + redeploy. **Every recorded P8B/P8C/activation result came from the earlier, live-token window — nothing was fabricated.**
2. **First-smoke timing vs webhook registration** (probable for B1) and/or **pre-dedupe identity denial** (B2, consistent with all DB evidence, unverifiable without logs).

## Recommended Minimal Fix (proposal only — NOT implemented)

1. **Recover outbound**: Founder creates a **fresh token** in @BotFather (the current one is revoked — likely by the Founder's own security action), sets `BC_AGENT_TELEGRAM_BOT_TOKEN` in Vercel Production, **redeploys** (transport reads env at request time), verifies with `getWebhookInfo` returning 200. **Then re-register the webhook** (`setWebhook` per P8D §8 — a revoked token's registration is on the old token identity, re-arming is one call).
**2. Prove the inbound hop**: the **only read-only door left** is the Vercel runtime logs — **only the Founder can open it** (dashboard → Deployments → Functions → `/api/agent/telegram/webhook` → Runtime Logs around 15:5x–16:0x). Decision tree: requests visible + 200 → B1 false → B2 confirmed (then inspect binding `telegramUserId`/`chatId` vs the actual Telegram account); requests absent → B1 confirmed (timing) → just resend `/status` after token recovery.
3. **Repair the smoke**: with token live + registration re-armed, founder resends `/status` — dedupe ledger must gain a row, `lastSeenAt` gets touched, and a reply must arrive.
4. **Structural hardening (future phase)**: denial-path observability is the actual gap that made this smoke unfalsifiable — a tiny `AgentTelegramDenial` ledger or a safe log line on identity denials would make B1/B2 separable next time. No DDL was run (read-only phase).

## Git
- Files modified by this phase: **NONE** — zero `git status` delta beyond pre-existing parallel-session noise.
- commit: none. push: none. deploy: none. No restart, no rotation (impossible: token already revoked).
