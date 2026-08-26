# P8F — Pre-Canary Founder Checklist & GO/NO-GO Gate

**Prinsip**: Tests passing ≠ money ready. Tidak ada "hampir siap" —
hanya **GO FOR REAL-MONEY CANARY** atau **NOT YET**.

Checklist kanonik ini dievaluasi otomatis oleh
`evaluatePreCanaryChecklist()` (`/api/admin/teacher-commissions/pre-canary`)
dan tampil di `/admin/teacher-payouts`. Status: PASS / FAIL /
MANUAL_VERIFICATION_REQUIRED / NOT_CONFIGURED. Item provider TANPA bukti
yang bisa diakses kode = MANUAL — tidak pernah dipalsukan PASS.

## Kategori

### A. SYSTEM (auto dari data nyata)
- Invariant Ledger = Wallet (SQL agregat — 0 mismatch)
- Locked = withdrawal in-flight (SQL agregat — 0 mismatch)
- Risk gate P8C aktif
- Kill switch operasional (env + SiteSetting)
- Pilot gate operasional
- Batas payout dikonfigurasi
- Otorisasi admin sehat (founder-gated)

### B. PROVIDER (bukti eksternal — MANUAL kecuali ada bukti)
- Akun Xendit production disetujui
- Capability Payouts v3 diaktifkan (MONEY-OUT)
- Kredensial production tersedia & aman (NOT_CONFIGURED bila env kosong)
- Webhook production terdaftar + token terkonfigurasi
- Cakupan destinasi production dikonfirmasi
- Fee provider dikonfirmasi (kebijakan platform — Founder)

### C. PILOT
- Pilot eksplisit diaktifkan Founder (PAYOUT_PILOT_ENABLED)
- Minimal satu guru pilot (allowlist)
- Guru pilot eligible (GURU, bukan founder)
- Profil payout pilot VERIFIED
- Risk status pilot CLEAR (NORMAL)
- Tidak ada cooldown destinasi pilot
- PAYOUT_PILOT_GLOBAL_LIMIT dikonfigurasi

### D. OPERATIONS
- Incident runbook ditinjau
- Prosedur rekonsiliasi ditinjau
- Prosedur payout pertama (canary) ditinjau
- Penanggung jawab operasional ditetapkan

### E. FINANCE
- Sumber komisi tervalidasi (10% settled, server-side)
- Jumlah withdrawal tervalidasi server-side
- Kebijakan fee dikonfirmasi (fee = biaya platform)
- Laporan finansial harian tersedia
- Laporan rekonsiliasi tersedia
- Masa penahanan dikonfigurasi

## Aturan GO (final)
1. Founder decision record = `APPROVED_FOR_CANARY` (dari
   `POST /api/admin/teacher-commissions/pre-canary/decision` — TIDAK PERNAH
   diinfer dari build/test).
2. Nol item FAIL / NOT_CONFIGURED.
3. Nol item MANUAL_VERIFICATION_REQUIRED yang belum terselesaikan
   (manual dianggap terselesaikan hanya lewat keputusan Founder + prosedur).

Selama P8F: PAYOUT_REAL_MONEY_ENABLED=false, PAYOUT_PROVIDER_ENABLED=false,
PAYOUT_PROVIDER=mock. Aktivasi uang asli = tindakan eksplisit Founder di masa
depan melalui prosedur canary — bukan otomatis.
