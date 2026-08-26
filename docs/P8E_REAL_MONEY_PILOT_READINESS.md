# P8E — Real-Money Pilot Readiness: Forensic Audit

**Status**: AUDIT + CONTROL PLANE. Real money TETAP DISABLED.
**Tanggal**: 26 Agustus 2026

---

## A. Existing Safety Controls (sudah ada & terverifikasi)

| Layer | Kontrol | Lokasi |
|---|---|---|
| P7C | Ledger immutable append-only; reversal = entry negatif terpisah | `lib/commission/engine.ts` |
| P7C | Unique key `[transaksiId, teacherId, entryType]` — anti double-commission | `prisma/schema.prisma` |
| P7C | Wallet terpisah dari `User.saldo`; upsert hanya via `upsertWalletTx` | `lib/commission/wallet.ts` |
| P7C | Withdrawal lock atomik (`updateMany WHERE available >= amount`) | `lib/commission/withdrawals.ts` |
| P7C | Rekonsiliasi wallet + invariant Ledger=Wallet (read-only, no silent repair) | `lib/commission/wallet.ts` |
| P7D | State machine payout (REQUESTED→…→PAID/FAILED/RETRYABLE/RECONCILIATION_REQUIRED) | `lib/commission/payout/orchestrator.ts` |
| P7D | Idempotensi: withdrawalId @unique, idempotencyKey deterministik, providerReference @unique | schema |
| P7D | Webhook: verifikasi signature, event unique, amount check, transition guard | `app/api/payout/webhook/route.ts` |
| P7D | Retry bounded + lookup provider dulu; UNKNOWN → RECONCILIATION_REQUIRED | orchestrator |
| P7E | Safety gate 4 kondisi (real money + provider + kill switch + pilot) | `lib/commission/payout/safety.ts` |
| P7E | Limits: MIN/MAX/DAILY/GLOBAL configurable server-side | safety.ts |
| P7E | Kill switch ganda: env + SiteSetting (admin toggle audited) | `lib/commission/payout/kill-switch.ts` |
| P7E | Amount protection (response vs internal) + fee accounting terpisah | orchestrator |
| P7E | Provider abstraction + Xendit adapter (credential-gated) | payout/* |
| P8C | Risk gate (REVIEW→hold, RESTRICTED→block) sebelum provider submit | `lib/guru/risk/signals.ts` + orchestrator |
| P8C | Destination cooldown (configurable) | rules.ts + orchestrator + withdraw pre-check |
| P8C | Admin review queue wajib reason + audit; tanpa BAN | `app/api/admin/teacher-risk/*` |

## B. Missing Controls (gap yang diisi P8E)

1. **Konfigurasi terpusat** — env checks tersebar; belum ada satu `getPayoutRuntimeConfig()`.
2. **Four-state money safety** — belum ada derivasi eksplisit DISABLED/PILOT/PRODUCTION/EMERGENCY_STOP.
3. **Pilot exposure limit** — belum ada `PAYOUT_PILOT_GLOBAL_LIMIT` (langit-langit total selama pilot).
4. **First-payout protection** — belum ada gate khusus payout PERTAMA guru (profil verified, tanpa case risk, tanpa perubahan destinasi baru-baru ini).
5. **Founder Gate** — belum ada daftar prasyarat produksi yang bisa diaudit (auto + manual).
6. **Admin control center** — belum ada satu permukaan untuk state, exposure, pilot manage, kill switch.
7. **Incident runbook + canary procedure** — belum terdokumentasi.

## C. Existing Financial Invariants

1. **Ledger = Wallet**: `lifetimeEarned − totalReversed = available + pending + locked + lifetimeWithdrawn` (P7C).
2. **Locked = withdrawal in-flight**: `SUM(withdrawal PENDING/APPROVED) = wallet.locked` (P7C reconcile).
3. **AVAILABLE→LOCKED→WITHDRAWN** (sukses) / **AVAILABLE→LOCKED→AVAILABLE** (gagal) — atomik per claim (P7D).
4. **Satu withdrawal = satu logical payout** (withdrawalId @unique).
5. **No PAID→AVAILABLE tanpa event reversal sah** — tidak ada jalur kode.

## D. Existing Production Risks

| Risiko | Mitigasi status |
|---|---|
| Provider outage saat submit | UNKNOWN → RECONCILIATION_REQUIRED (aman) |
| Webhook hilang/dup | status inquiry + event unique (aman) |
| Admin salah keputusan | reason wajib + audit (aman) |
| Guru ubah rekening setelah withdraw | snapshot destinasi di withdrawal/payout (aman) |
| Fraud/abuse | P8C rules + review (aman untuk pilot kecil) |
| Xendit credentials belum ada | adapter gagal deterministik XENDIT_API_KEY_MISSING (aman) |
| Penerima tidak lolos KYB | failure_code ACCOUNT_NAME_MISMATCH non-retryable (terpeta) |

## E. P8E Implementation Plan

1. `getPayoutRuntimeConfig()` — konfigurasi terpusat.
2. `getMoneySafetyState()` — four-state derivasi deterministik.
3. Pilot: effective ids (env ∪ SiteSetting) + pause + `PAYOUT_PILOT_GLOBAL_LIMIT` + error `PAYOUT_PILOT_LIMIT_REACHED`.
4. First-payout gate (withdraw pre-check + orchestrator).
5. Founder Gate 17 checks (auto dari system state + MANUAL flag).
6. Admin control center `/admin/teacher-payouts` + `/api/admin/teacher-commissions/payout-control`.
7. Alert conditions (evaluasi on-demand dari data nyata).
8. Observability events PAYOUT_*_BLOCKED.
9. Incident runbook + canary procedure (dokumen).
10. Dry-run simulation test + security audit statis + regresi penuh.

**Money flow model (final):**
```
MURID → MIDTRANS (money-in) → Transaksi SUCCESS → 10% komisi → Ledger → Wallet
→ Withdrawal (lock) → P7E limits → P8C risk gate → cooldown → first-payout gate
→ P7E safety gate → XENDIT (money-out) → BANK/E-WALLET
```
Setiap transisi: source of truth + authorization + idempotency + audit + reconciliation.
