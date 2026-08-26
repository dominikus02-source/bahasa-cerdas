# P8E — Payout Incident Response Runbook

Real money TETAP DISABLED sampai Founder Gate. Runbook ini berlaku saat pilot
aktif (allowlist) dan seterusnya.

## Kontrol cepat

| Tindakan | Cara |
|---|---|
| STOP semua pengiriman baru | `POST /api/admin/teacher-commissions/payout-safety {action:"ENABLE_KILL_SWITCH"}` — hanya menghentikan BARU; data/ledger/wallet utuh |
| Pause pilot | `POST /api/admin/teacher-commissions/payout-control {action:"PILOT_PAUSE", reason}` |
| Lihat state | `/admin/teacher-payouts` (state, exposure, alerts, founder gate) |

## SCENARIO A — Provider API unavailable
1. `ENABLE_KILL_SWITCH` (stop submission baru).
2. Payout existing tetap: status inquiry gagal → `UNKNOWN` → `RECONCILIATION_REQUIRED` (dana terkunci).
3. Setelah provider pulih: cron `payout-reconciliation` (tiap jam) merekonsiliasi otomatis; atau manual `POST /api/admin/teacher-commissions/payouts/[id]/reconcile`.
4. `DISABLE_KILL_SWITCH` bila aman.

## SCENARIO B — Webhook unavailable
1. Tidak perlu stop penuh — status inquiry (getPayoutStatus) adalah jalur cadangan.
2. Jalankan rekonsiliasi: `GET /api/admin/teacher-commissions/payout-reconciliation?run=true`.
3. Pantau `PAYOUT_STALE_PROCESSING` di alerts.

## SCENARIO C — Duplicate payout suspicion
1. `ENABLE_KILL_SWITCH` + `PILOT_PAUSE`.
2. Hentikan retry: biarkan cron berjalan (retry sudah bounded + lookup dulu).
3. Provider status inquiry per payout mencurigakan → `reconcile`.
4. Verifikasi `TeacherPayout.idempotencyKey` unique — duplikasi dicegah db-level; bila ada baris ganda → investigasi manual + audit.

## SCENARIO D — Amount mismatch
1. Sistem sudah HARD STOP otomatis (`AMOUNT_MISMATCH` → `RECONCILIATION_REQUIRED`, tidak pernah PAID).
2. Audit `AdminPaymentAuditLog` action `PAYOUT_MISMATCH`.
3. Bandingkan internal amount vs provider response di `/admin/teacher-commissions/payouts`.
4. Resolusi manual oleh finance + audit.

## SCENARIO E — Teacher reports wrong destination
1. Stop payout BARU guru tsb: `PILOT_REMOVE_TEACHER` / risk restrict via `/admin/teacher-risk`.
2. Payout sudah submit: destinasi = snapshot (immutable) — rekonsiliasi provider.
3. Buka risk case + review (P8C).

## SCENARIO F — Global financial mismatch (Ledger ≠ Wallet)
1. **GLOBAL KILL SWITCH** segera.
2. `GET /api/admin/teacher-commissions/reconciliation` — identifikasi guru + field mismatch.
3. JANGAN repair diam-diam — buat audit + investigasi finance.
4. Founder notification (proses internal).

## Alert conditions (dihitung on-demand di /admin/teacher-payouts)
PAYOUT_RECONCILIATION_MISMATCH · TEACHER_DAILY_LIMIT_REACHED ·
GLOBAL_DAILY_LIMIT_REACHED · PAYOUT_PILOT_LIMIT_REACHED ·
AMOUNT_MISMATCH_DETECTED
