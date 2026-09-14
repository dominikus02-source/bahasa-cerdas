# GCS Money-Out Migration — Forensic Audit Report

**Phase 1: Xendit→Midtrans Migration — Full System Audit**
**Date**: September 14, 2026
**Status**: COMPLETE (audit only — no code changes)

---

## 1. Executive Summary

The Guru Cerdas Sejahtera (GCS) money-out payout system currently runs on **Xendit Payouts v3** as the PRIMARY production money rail. The founder has decided: **Do NOT re-enable Xendit — consolidate all payment rails to Midtrans** (both Money-In AND Money-Out).

**CRITICAL FINDING**: Midtrans does **NOT** provide a B2C disbursement API for third-party bank transfers. The existing `midtrans-provider.ts` is a STUB that deterministically fails with `MIDTRANS_NOT_SUPPORTED`. This is a **potential STOP condition** per Phase 2 capability verification.

**Current Production State**: All payout safety gates are OFF (`PAYOUT_REAL_MONEY_ENABLED=false`, `PAYOUT_PROVIDER_ENABLED=true`, `PAYOUT_PROVIDER=mock`). The system runs in sandbox mode. **Zero real payouts have ever been made.**

---

## 2. Architecture Overview

### 2.1 Provider Abstraction Layer

```
┌─────────────────────────────────────────────────┐
│                Teacher Payout Flow               │
│                                                   │
│  POST /api/teacher/commissions/withdraw           │
│    │                                              │
│    ├─ Rate limit (5/60s)                         │
│    ├─ evaluatePayoutGate() — safety gates         │
│    ├─ checkPayoutLimits() — daily/global limits   │
│    ├─ Destination cooldown check                  │
│    ├─ First payout protection                     │
│    ├─ requestWithdrawal() — wallet claim          │
│    │    └─ updateMany WHERE availableBalance >= N │
│    ├─ evaluateWithdrawalVelocitySignal()          │
│    └─ submitPayoutForWithdrawal() — orchestrator  │
│         └─ PayoutOrchestrator                     │
│              ├─ PayoutProvider (interface)         │
│              │    ├─ mock-provider.ts (sandbox)   │
│              │    ├─ xendit-provider.ts (PRIMARY) │
│              │    └─ midtrans-provider.ts (STUB)  │
│              ├─ state machine                     │
│              └─ reconciliation                    │
└─────────────────────────────────────────────────┘
```

### 2.2 Provider Registry (`lib/commission/payout/provider.ts`)

| Provider | Status | Money Rail | Notes |
|----------|--------|------------|-------|
| `mock` | Active (default) | None | Sandbox, QA only |
| `xendit` | PRIMARY production | Xendit Payouts v3 | Real-money OFF by safety gate |
| `midtrans` | STUB | None | All ops fail `MIDTRANS_NOT_SUPPORTED` |

### 2.3 Payout State Machine

```
PENDING → REQUESTED → VALIDATING → SUBMITTING → PROCESSING
                                                    ├→ PAID (terminal)
                                                    ├→ FAILED (terminal)
                                                    ├→ RETRYABLE_FAILURE
                                                    └→ RECONCILIATION_REQUIRED (timeout)
```

**CRITICAL RULES**:
- Unknown provider state NEVER auto-FAILED → always RECONCILIATION_REQUIRED
- Timeout → RECONCILIATION_REQUIRED (never auto-FAILED per §11)
- Financial invariant: `AVAILABLE → LOCKED → WITHDRAWN` (success) or `AVAILABLE → LOCKED → AVAILABLE` (definitive failure)

### 2.4 Wallet Financial Model

```
TeacherWallet {
  availableBalance  — ready to withdraw
  pendingBalance    — holding period not ended
  lockedBalance     — in active withdrawal (PENDING/APPROVED)
  lifetimeEarned    — total commissions ever created
  lifetimeWithdrawn — total successfully paid out
}
```

**Withdrawal state machine** (separate from payout):
```
PENDING → APPROVED → TRANSFERRED (admin action)
PENDING → REJECTED (locked → available — funds returned)
```

---

## 3. Xendit Implementation (Current PRIMARY)

### 3.1 Adapter (`lib/commission/payout/xendit-provider.ts`)

- **API**: Xendit Payouts v3 (`POST /v3/payouts`)
- **Auth**: Basic auth (API key:secret)
- **Idempotency**: `idempotency-key` header (deterministic `withdrawal:{id}`)
- **API Version**: `2025-09-01` (configurable via `PAYOUT_XENDIT_API_VERSION`)
- **Status inquiry**: `GET /v3/payouts/{id}`
- **Webhook**: `x-callback-token` header verification
- **Destination types**: BANK (`CARDLESS_ACCOUNT_NUMBER`) and EWALLET (`EWALLET`)

### 3.2 Xendit-Specific Features

- **Readiness bridge** (`lib/commission/payout/xendit-readiness.ts`): Production readiness checklist (9 evidence categories, founder confirmation)
- **Pre-canary** (`lib/commission/payout/pre-canary.ts`): Pre-deployment safety checks
- **Canary** (`lib/commission/payout/canary.ts`): Gradual rollout
- **Finance report** (`lib/commission/payout/finance-report.ts`): Financial reporting

### 3.3 Xendit Environment Variables

| Variable | Purpose | Current Value |
|----------|---------|---------------|
| `XENDIT_API_KEY` | Xendit Payouts API key | `[SENSITIVE]` (not in .env.local) |
| `XENDIT_WEBHOOK_TOKEN` | Webhook verification token | Not set |
| `PAYOUT_XENDIT_API_VERSION` | API version header | `2025-09-01` (default) |

---

## 4. Midtrans Gap Analysis

### 4.1 Current Midtrans Stub (`lib/commission/payout/midtrans-provider.ts`)

The stub is **honest and correct** — it does NOT fabricate endpoints:

- `createPayout()` → `{ ok: false, code: "MIDTRANS_NOT_SUPPORTED" }`
- `getPayoutStatus()` → `{ status: "UNKNOWN" }`
- `verifyWebhook()` → `{ ok: false, reason: "Webhook disbursement Midtrans tidak didukung" }`
- `validateDestination()` → format validation only (same as mock)

### 4.2 Midtrans B2C Disbursement Capability

Per `docs/P8D_MIDTRANS_MONEY_RAIL_VERIFICATION.md` (August 26, 2026):

**Midtrans does NOT provide a B2C disbursement API for paying third parties from a merchant account.**

Midtrans "Payout" = merchant withdrawing their own balance (manual via dashboard or Auto-Withdrawal schedule). The only third-party disbursement documented is Reward GoPay (requires per-user authorization token — not suitable for B2B payouts).

### 4.3 Midtrans Environment Variables

| Variable | Purpose | Current State |
|----------|---------|---------------|
| `MIDTRANS_SERVER_KEY` | Midtrans Money-In API key | Set (production) |
| `MIDTRANS_CLIENT_KEY` | Midtrans client key | Unknown |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Public client key | Unknown |
| `NEXT_PUBLIC_MIDTRANS_MERCHANT_ID` | Merchant ID | Unknown |

**NO Midtrans payout/disbursement secrets exist** — this is expected because Midtrans has no B2C payout API.

---

## 5. Safety & Control Infrastructure

### 5.1 Safety Gates (`lib/commission/payout/safety.ts`)

**Real-money payout requires ALL of:**
1. `PAYOUT_REAL_MONEY_ENABLED=true` (currently **OFF**)
2. `PAYOUT_PROVIDER_ENABLED=true` (currently ON)
3. Provider ≠ "mock" (currently "mock" — gate blocks)
4. Kill switch OFF
5. If pilot active: teacher ∈ pilot list

### 5.2 Kill Switch (`lib/commission/payout/kill-switch.ts`)

**Dual layer** — either triggers EMERGENCY_STOP:
1. ENV: `PAYOUT_KILL_SWITCH=true`
2. DB: `SiteSetting("payout_kill_switch")`

Kill switch respected even for mock provider.

### 5.3 Money Safety States (`lib/commission/payout/runtime-config.ts`)

```
DISABLED      — real money off or mock provider (CURRENT STATE)
PILOT         — real money + provider + non-mock + pilot enabled
PRODUCTION    — real money + provider + non-mock + pilot off
EMERGENCY_STOP — kill switch active
```

No automatic transitions to PRODUCTION — only via founder env changes.

### 5.4 First Payout Protection (`lib/commission/payout/first-payout.ts`)

First payout requires:
- Profile VERIFIED
- No active risk case
- Destination not recently changed (cooldown)
- No previous payouts

### 5.5 Risk System (`lib/commission/payout/`)

- **Signals** (`TeacherRiskSignal`): Self-referral attempt, rapid account-to-premium, abnormal refund pattern, rapid destination change, withdrawal velocity
- **Cases** (`TeacherRiskCase`): REVIEW → RESTRICTED → CLEARED
- **Actions** (`TeacherRiskAction`): Append-only audit trail

### 5.6 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Teacher withdrawal | 5 req | 60s |
| Anonymous login | 10 req | 600s |
| Payout webhook | None (idempotent) | — |

### 5.7 Limits

| Limit | Value | Configurable |
|-------|-------|-------------|
| Minimum withdrawal | Rp50,000 | `TEACHER_COMMISSION_MIN_WITHDRAWAL` |
| Maximum withdrawal | Unknown | `PAYOUT_MAXIMUM_AMOUNT` |
| Teacher daily limit | Unknown | `PAYOUT_DAILY_LIMIT` |
| Global daily limit | Unknown | `PAYOUT_GLOBAL_DAILY_LIMIT` |
| Pilot global limit | Unknown | `PAYOUT_PILOT_GLOBAL_LIMIT` |
| Max attempts | Unknown | `PAYOUT_MAX_ATTEMPTS` |
| Reconciliation timeout | Unknown | `PAYOUT_RECONCILIATION_TIMEOUT_MINUTES` |

---

## 6. Commission Engine

### 6.1 Core (`lib/commission/engine.ts`)

- **Append-only ledger**: Every commission entry is immutable once created
- **Idempotency**: `@@unique([transaksiId, teacherId, entryType])` — one positive + one reversal per (transaction × teacher)
- **Rate**: 10% (`floor(grossAmount × 0.10)`)
- **Holding period**: 7 days (configurable via `COMMISSION_HOLDING_PERIOD_DAYS`)
- **Entry types**: COMMISSION (positive), REVERSAL (negative)

### 6.2 Attribution

- **First-valid-wins**: Only one attribution per student
- **Sources**: CLASS_ENROLLMENT, REFERRAL_LINK, MANUAL_ADMIN
- **Founder exclusion**: `isFounder === true` excluded from commission system

### 6.3 Financial Reconciliation

- **Cron**: `GET /api/cron/payout-reconciliation` — daily reconciliation + anomaly detection
- **Anomaly detection**: Mismatch, stale payouts, amount mismatches
- **Audit logging**: All financial events logged to `AdminPaymentAuditLog`

---

## 7. Database Schema

### 7.1 Payout Models (from `prisma/schema.prisma`)

| Model | Purpose | Key Constraints |
|-------|---------|-----------------|
| `TeacherCommission` | Commission ledger entries | `@@unique([transaksiId, teacherId, entryType])` |
| `TeacherWallet` | Teacher wallet balances | `teacherId @unique` (one wallet per teacher) |
| `TeacherCommissionWithdrawal` | Withdrawal requests | Cascade from wallet |
| `TeacherPayoutProfile` | Payout destination | `teacherId @unique` |
| `TeacherPayout` | Payout records | `withdrawalId @unique` (1:1), `idempotencyKey @unique`, `providerReference @unique` |
| `TeacherPayoutEvent` | Webhook events | `providerEventId @unique` (idempotent) |
| `TeacherRiskCase` | Risk review cases | Max one active per teacher |
| `TeacherRiskSignal` | Risk signals | `@@unique([signalType, dedupeKey])` |
| `TeacherRiskAction` | Risk decisions | Append-only audit |

### 7.2 Migration History

- **P7C** (`2026-08-26_p7c_commission_wallet.sql`): Commission + wallet infrastructure
- **P7D** (`2026-08-26_p7d_payout_infrastructure.sql`): Payout provider infrastructure (DestinationType, ProfileVerificationStatus, PayoutStatus enums + 3 tables)

---

## 8. API Routes Inventory

### 8.1 Teacher-Facing

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/teacher/commissions/withdraw` | POST | Submit withdrawal + auto-orchestrate payout |
| `/api/teacher/commissions/payout-profile` | GET/PUT | View/save payout destination |
| `/api/teacher/commissions/withdrawals` | GET | List own withdrawals |
| `/api/teacher/commissions/withdrawals/[id]` | GET | View single withdrawal |
| `/api/teacher/commissions/earnings` | GET | View earnings |
| `/api/teacher/commissions/history` | GET | Commission history |
| `/api/teacher/commissions/distribution` | GET | Commission distribution |
| `/api/teacher/commissions/students` | GET | Student attributions |
| `/api/teacher/commissions/route` | GET | Commission overview |

### 8.2 Admin-Facing

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/teacher-commissions/payouts` | GET | List all payouts |
| `/api/admin/teacher-commissions/payouts/[id]/retry` | POST | Manual retry |
| `/api/admin/teacher-commissions/payouts/[id]/reconcile` | POST | Force reconcile |
| `/api/admin/teacher-commissions/payout-control` | GET/POST | Control center (pilot, kill switch) |
| `/api/admin/teacher-commissions/payout-safety` | GET | Safety state |
| `/api/admin/teacher-commissions/payout-reconciliation` | POST | Manual reconciliation |
| `/api/admin/teacher-commissions/xendit-readiness` | GET/POST | Xendit readiness checklist |
| `/api/admin/teacher-commissions/pre-canary` | GET | Pre-canary checks |
| `/api/admin/teacher-commissions/pre-canary/decision` | POST | Founder decision |
| `/api/admin/teacher-commissions/canary` | GET | Canary status |
| `/api/admin/teacher-commissions/withdrawals` | GET | List all withdrawals |
| `/api/admin/teacher-commissions/withdrawals/[id]` | PATCH | Approve/reject/transfer |
| `/api/admin/teacher-commissions/finance-report` | GET | Financial report |
| `/api/admin/teacher-commissions/backfill` | POST | Backfill attributions |
| `/api/admin/teacher-commissions/reconciliation` | GET | Commission reconciliation |
| `/api/admin/teacher-commissions` | GET | Commission overview |

### 8.3 System

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/payout/webhook` | POST | Provider webhook handler |
| `/api/cron/payout-reconciliation` | GET | Daily reconciliation cron |

---

## 9. Migration Risks & STOP Conditions

### 9.1 CRITICAL: Midtrans Has No B2C Disbursement API

**Impact**: The `midtransPayoutProvider` STUB cannot be upgraded to a real provider without Midtrans offering B2C disbursement.

**Options**:
1. **A) Use Midtrans Auto-Withdrawal**: Merchant-only feature — funds go to merchant's own bank account, not to third parties. NOT suitable for teacher payouts.
2. **B) Use Reward GoPay API**: Only supports GoPay wallets, requires per-user authorization tokens. Limited scope.
3. **C) Find alternative B2C provider**: Other Indonesian payment providers (DANA, OVO, LinkAja, Bank APIs) that support B2C transfers.
4. **D) Manual payout**: Founder processes payouts manually via bank transfer. Not scalable but safe.
5. **E) Defer**: Keep Xendit as-is (but founder says DO NOT re-enable).

### 9.2 Data Preservation

- All Xendit-related tables (`TeacherPayout`, `TeacherPayoutEvent`) must be preserved
- `TeacherPayout.provider` field currently stores "xendit" or "mock" — must remain for historical data
- Webhook handler must continue to process Xendit webhooks for in-flight payouts during migration
- No destructive migration — additive only

### 9.3 Secret Management

| Secret | Current | Midtrans Payout | Notes |
|--------|---------|-----------------|-------|
| `XENDIT_API_KEY` | In use | Keep for in-flight | Do NOT remove until all Xendit payouts settled |
| `XENDIT_WEBHOOK_TOKEN` | In use | Keep for in-flight | Same |
| `MIDTRANS_SERVER_KEY` | In use (Money-In) | Unknown | Need to verify if same key works for payout features |
| Midtrans payout secret | Does not exist | Does not exist | **No Midtrans B2C payout API exists** |

---

## 10. Recommended Migration Phases (Post-Audit)

### Phase 2: Midtrans Capability Verification (BLOCKER)

Before any code changes, verify:
1. Does Midtrans now offer B2C disbursement API? (Check latest docs)
2. If yes: What are the API specs, auth requirements, webhook format?
3. If no: Choose alternative provider from §9.1 options

### Phase 3: Provider Adapter Implementation

If Midtrans B2C exists:
1. Implement `MidtransTransferProvider` (new file, not modify stub)
2. Add Midtrans payout env vars to Vercel
3. Update provider registry
4. Add webhook handler for Midtrans disbursement events

### Phase 4: Migration

1. **Stop**: Disable Xendit payout creation (kill switch or provider flag)
2. **Settle**: Wait for all in-flight Xendit payouts to complete/fail
3. **Switch**: Enable Midtrans provider via env
4. **Canary**: Pilot with 1-2 teachers
5. **Rollout**: Gradual enablement

### Phase 5: Xendit Decommission

1. Archive Xendit adapter (rename to `xendit-provider-archived.ts`)
2. Remove Xendit env vars from Vercel
3. Keep `XENDIT_WEBHOOK_TOKEN` for 30 days (late webhooks)
4. Remove Xendit readiness infrastructure

---

## 11. Files Inventory (Read During Audit)

### Payout Core
- `lib/commission/payout/types.ts` — PayoutProvider interface, CreatePayoutRequest, status types
- `lib/commission/payout/provider.ts` — Provider registry (mock/xendit/midtrans)
- `lib/commission/payout/orchestrator.ts` — Payout state machine, financial invariant, idempotency
- `lib/commission/payout/config.ts` — Provider config, env var readers
- `lib/commission/payout/safety.ts` — Safety gates (real-money enablement, limits)
- `lib/commission/payout/kill-switch.ts` — Kill switch (ENV + DB dual layer)
- `lib/commission/payout/first-payout.ts` — First payout safety gate
- `lib/commission/payout/runtime-config.ts` — Centralized runtime config, 4-state money safety
- `lib/commission/payout/alerts.ts` — Alert conditions (deterministic, actionable)
- `lib/commission/payout/profile.ts` — Payout profile management

### Provider Adapters
- `lib/commission/payout/xendit-provider.ts` — Xendit Payouts v3 adapter (PRIMARY)
- `lib/commission/payout/midtrans-provider.ts` — STUB (MIDTRANS_NOT_SUPPORTED)
- `lib/commission/payout/mock-provider.ts` — Sandbox adapter

### Xendit-Specific
- `lib/commission/payout/xendit-readiness.ts` — Production readiness bridge
- `lib/commission/payout/pre-canary.ts` — Pre-deployment safety checks
- `lib/commission/payout/canary.ts` — Gradual rollout
- `lib/commission/payout/founder-gate.ts` — Founder approval gate
- `lib/commission/payout/founder-decision.ts` — Founder decision tracking
- `lib/commission/payout/pilot.ts` — Pilot management
- `lib/commission/payout/finance-report.ts` — Financial reporting

### Commission Core
- `lib/commission/engine.ts` — Commission engine (append-only ledger, 10%, 7d holding)
- `lib/commission/withdrawals.ts` — Withdrawal management (state machine, idempotent wallet claim)
- `lib/commission/config.ts` — Commission business constants
- `lib/commission/wallet.ts` — Wallet reconciliation (NOT YET READ)
- `lib/commission/audit.ts` — Audit logging (NOT YET READ)
- `lib/commission/events.ts` — Commission event emission (NOT YET READ)

### Database
- `prisma/schema.prisma` — Full schema (9 payout-related models)
- `prisma/migrations/manual/2026-08-26_p7d_payout_infrastructure.sql` — Payout migration

### API Routes
- `app/api/payout/webhook/route.ts` — Webhook handler
- `app/api/cron/payout-reconciliation/route.ts` — Daily reconciliation
- `app/api/teacher/commissions/withdraw/route.ts` — Teacher withdrawal
- `app/api/teacher/commissions/payout-profile/route.ts` — Teacher payout profile
- `app/api/admin/teacher-commissions/payouts/route.ts` — Admin payouts list
- `app/api/admin/teacher-commissions/payout-control/route.ts` — Admin control center
- `app/api/admin/teacher-commissions/payouts/[id]/retry/route.ts` — Admin retry
- `app/api/admin/teacher-commissions/payouts/[id]/reconcile/route.ts` — Admin reconcile
- `app/api/admin/teacher-commissions/xendit-readiness/route.ts` — Xendit readiness
- `app/api/admin/teacher-commissions/withdrawals/[id]/route.ts` — Admin withdrawal action

---

## 12. Audit Limitations

1. **`lib/commission/wallet.ts`** — NOT read (wallet reconciliation details)
2. **`lib/commission/audit.ts`** — NOT read (audit logging implementation)
3. **`lib/commission/events.ts`** — NOT read (event emission details)
4. **`app/api/admin/teacher-commissions/pre-canary/decision/route.ts`** — NOT read
5. **`app/api/admin/teacher-commissions/finance-report/route.ts`** — NOT read
6. **`app/api/admin/teacher-commissions/reconciliation/route.ts`** — NOT read
7. **`app/api/admin/teacher-commissions/backfill/route.ts`** — NOT read

These files contain secondary functionality (audit logging, event emission, reconciliation details) that would need to be read in Phase 2 for complete migration planning.

---

## 13. Verdict

**PHASE 1 AUDIT: ✅ COMPLETE**

**PHASE 2 CAPABILITY CHECK: ⚠️ BLOCKED — Midtrans has no B2C disbursement API**

**RECOMMENDATION**: Before proceeding with any code changes, the founder must decide:
1. Accept that Midtrans cannot do B2C payouts → choose alternative provider from §9.1
2. Verify latest Midtrans docs for any new B2C disbursement capability
3. Defer money-out migration entirely (keep Xendit adapter available but disabled)

**NO CODE CHANGES MADE IN THIS PHASE.**
