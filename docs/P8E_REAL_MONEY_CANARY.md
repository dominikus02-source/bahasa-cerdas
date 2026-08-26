# P8E — First Real-Money Canary Procedure (DESIGN ONLY — JANGAN DIJALANKAN)

**Status**: prosedur dirancang. EKSEKUSI DILARANG tanpa persetujuan Founder
dan sampai SEMUA item Founder Gate hijau/manual selesai.

## Prasyarat
- `PAYOUT_PROVIDER=xendit` + `PAYOUT_PROVIDER_ENABLED=true` + `PAYOUT_REAL_MONEY_ENABLED=true`
  (hanya setelah Founder Gate) — selama P8E ketiganya TETAP false/mock.
- Kill switch off, pilot on, tepat 1 guru allowlist.
- Profil payout guru pilot = VERIFIED.

## Urutan canary
1. Founder menyetujui pilot (tercatat di env + audit).
2. Pilih 1 guru tepercaya (anggota tim/associate).
3. Verifikasi identitas + profil payout guru (manual, oleh founder).
4. Verifikasi destinasi (rekening milik guru).
5. Pastikan komisi kecil tersedia (mis. satu transaksi Premium settle).
6. Guru mengajukan withdrawal minimum (Rp50.000).
7. System: risk gate → limits → first-payout gate → submit Xendit.
8. Amati webhook / status inquiry hingga SUCCEEDED.
9. Verifikasi penerimaan di rekening guru (bukti dari guru).
10. Verifikasi wallet (locked→lifetimeWithdrawn), ledger, finance report,
    audit log — semuanya dari backend, bukan klaim.
11. Founder sign-off tertulis.

## Larangan
- TIDAK ada bulk payout sebelum canary lulus.
- TIDAK ada kredensial di kode/log/klien.
- TIDAK ada bypass risk/kill switch.
- Real money tidak boleh aktif otomatis dari build/test mana pun —
  hanya tindakan eksplisit Founder.
