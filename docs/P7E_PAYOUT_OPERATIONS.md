# P7E — Payout Operations Runbook (Guru Cerdas Sejahtera)

Runbook operasional untuk production money rail. **Real money TETAP DISABLED**
sampai Founder Gate terpisah. Semua prosedur di bawah diasumsikan dijalankan
oleh founder/admin dengan akses Supabase SQL Editor, Vercel env, dan dashboard
provider.

## 1. Status keamanan saat ini

| Komponen | Default | Arti |
|---|---|---|
| `PAYOUT_PROVIDER` | `mock` | Sandbox — tidak mengirim uang |
| `PAYOUT_REAL_MONEY_ENABLED` | `false` | Uang asli off |
| `PAYOUT_PROVIDER_ENABLED` | `false` | Provider production off |
| `PAYOUT_KILL_SWITCH` (env) | tidak diset | - |
| SiteSetting `payout_kill_switch` | tidak diset | Toggle admin via API |
| `PAYOUT_PILOT_ENABLED` | tidak diset | Pilot off |

## 2. Mengaktifkan sandbox (sudah aktif)

`PAYOUT_PROVIDER=mock` → semua alur P7C/P7D/P7E berjalan dengan mock
(createPayout instan/manual, webhook HMAC via `PAYOUT_WEBHOOK_SECRET`).

## 3. Mengaktifkan production (WAJIB Founder Gate dulu)

1. Provider dipilih (rekomendasi: Xendit Payouts v3), akun KYB aktif.
2. Set env di Vercel:
   - `XENDIT_API_KEY` (secret, server-side)
   - `XENDIT_WEBHOOK_TOKEN` (secret)
   - `PAYOUT_PROVIDER=xendit`
   - `PAYOUT_PROVIDER_ENABLED=true`
   - `PAYOUT_REAL_MONEY_ENABLED=true` ← TERAKHIR, setelah validasi sandbox
3. **Pilot dulu** (`PAYOUT_PILOT_ENABLED=true`,
   `PAYOUT_PILOT_TEACHER_IDS=<id guru founder/associate>`).
4. Daftarkan URL webhook provider → `https://www.bahasacerdas.com/api/payout/webhook`.
5. Verifikasi: `GET /api/admin/teacher-commissions/payout-safety`.

## 4. Menonaktifkan production (rollback)

- Stop baru: `POST /api/admin/teacher-commissions/payout-safety`
  `{ action: "ENABLE_KILL_SWITCH" }` — hanya menghentikan pengiriman BARU;
  data withdrawal/wallet/ledger TIDAK dihapus.
- Penuh: `PAYOUT_REAL_MONEY_ENABLED=false` + `PAYOUT_PROVIDER_ENABLED=false`
  di Vercel, redeploy.

## 5. Rotasi secret

1. Rotate key di dashboard provider.
2. Update env Vercel (`XENDIT_API_KEY` / `XENDIT_WEBHOOK_TOKEN` /
   `PAYOUT_WEBHOOK_SECRET`).
3. Redeploy. Webhook lama ditolak (token tidak cocok) → diganti URL bila perlu.

## 6. Provider outage

1. `ENABLE_KILL_SWITCH` via admin API.
2. Pantau `GET /api/admin/teacher-commissions/payout-reconciliation` — payout
   PROCESSING akan menjadi `RECONCILIATION_REQUIRED` setelah timeout
   (`PAYOUT_RECONCILIATION_TIMEOUT_MINUTES`, default 60).
3. Setelah outage pulih: rekonsiliasi otomatis via cron
   (`/api/cron/payout-reconciliation`, tiap jam) atau manual
   `POST /api/admin/teacher-commissions/payouts/[id]/reconcile`.
4. `DISABLE_KILL_SWITCH` bila aman.

## 7. Payout macet (stuck)

1. Cek state: `GET /api/admin/teacher-commissions/payouts?status=PROCESSING`.
2. `POST .../payouts/[id]/reconcile` — lookup provider; outcome diterapkan
   (PAID/FAILED/RETRYABLE/RECONCILIATION_REQUIRED).
3. Retry (bila retryable & attempt < `PAYOUT_MAX_ATTEMPTS`):
   `POST .../payouts/[id]/retry` — lookup provider dulu; idempotency key sama.

## 8. Duplicate webhook

Otomatis aman: `TeacherPayoutEvent.providerEventId @unique` → event kedua
no-op (HTTP 200 `idempotent`). Tidak ada aksi.

## 9. Payout mismatch (amount/provider)

1. Amount mismatch saat submit → payout `RECONCILIATION_REQUIRED` +
   `PAYOUT_MISMATCH` audit; TIDAK ditandai PAID.
2. Investigasi `GET /api/admin/teacher-commissions/payouts/[status]` dan
   AdminPaymentAuditLog (`PAYOUT_MISMATCH`).
3. Resolusi manual + audit via admin endpoints.

## 10. Payout gagal definitif

- Dana otomatis kembali (locked → available), withdrawal REJECTED, audit
  `PAYOUT_FAILED`. Guru dapat menarik ulang setelah memperbaiki destinasi.
- Tidak pernah dibuat withdrawal baru otomatis.

## 11. Rekonsiliasi

- Cron tiap jam: `reconcilePendingTeacherPayouts()` + `detectPayoutAnomalies()`.
- Harian (Finance): `GET /api/admin/teacher-commissions/finance-report?date=YYYY-MM-DD`
  (withdrawals, requested, processing, paid, failed, retryable, reconciliation
  issues, provider fees, net payout).
- Wallet: `GET /api/admin/teacher-commissions/reconciliation` (invariant
  Ledger = Wallet). Mismatch → lapor + audit, TIDAK repair diam-diam.

## 12. Emergency kill switch

- Cepat: `POST /api/admin/teacher-commissions/payout-safety`
  `{ action: "ENABLE_KILL_SWITCH" }`.
- Sangat cepat: set env `PAYOUT_KILL_SWITCH=true` + redeploy (env dihormati
  bahkan bila DB down).

## 13. Pilot rollout

1. `PAYOUT_PILOT_ENABLED=true`, `PAYOUT_PILOT_TEACHER_IDS=<csv>`.
2. Guru non-pilot mendapat error deterministik `PAYOUT_PILOT_BLOCKED`.
3. Setelah stabil → nonaktifkan pilot (`PAYOUT_PILOT_ENABLED=false`) setelah
   Founder Gate.

## 14. Fee provider

- Fee TERCATAT TERPISAH di `TeacherPayout.providerFee` + `netTransfer`.
- Fee TIDAK mengurangi komisi guru (10% dari transaksi premium tetap utuh).
- Fee dibiayai platform sampai Founder memutuskan kebijakan lain.

## 15. Checklist Founder Gate (sebelum real money)

- [ ] Provider dipilih + KYB selesai
- [ ] Terms komersial & fee disetujui
- [ ] Limit payout disetujui (`PAYOUT_MAX_AMOUNT`, `PAYOUT_DAILY_LIMIT`,
      `PAYOUT_GLOBAL_DAILY_LIMIT`)
- [ ] Sandbox real-provider divalidasi end-to-end
- [ ] KYC/KYB guru + kepemilikan rekening (Xendit failure_code
      ACCOUNT_NAME_MISMATCH sebagai lapis otoritatif)
- [ ] Webhook URL + secret dirotasi dan diuji
- [ ] Finance ownership & proses rekonsiliasi harian
- [ ] Emergency kill switch teruji
