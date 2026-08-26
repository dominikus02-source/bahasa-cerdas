# P8G — First Real-Money Canary Execution Playbook

**Status**: DESIGN & OPERATIONAL READINESS. EKSEKUSI DILARANG sampai
P8F = GO FOR REAL-MONEY CANARY. Real money tetap DISABLED.

Canary = eksperimen finansial terkontrol. Sukses ≠ "uang terkirim".
Sukses = 8 kriteria P8G (guru tepat, jumlah tepat, destinasi tepat,
konfirmasi penerimaan, provider sepakat, invariant bersih, rekonsiliasi
bersih, tanpa anomali).

## Kontrak run (dipetakan ke SiteSetting `payout_canary_run` + audit)
canaryRunId · selectedTeacherId · selectedWithdrawalId · intendedGrossAmount ·
intendedDestinationSnapshot (masked) · provider · executionEnvironment ·
founderApprovalReference · startedAt · completedAt · finalStatus.

State: PREPARING → READY → EXECUTING → AWAITING_RECEIPT_CONFIRMATION →
RECONCILING → SUCCESS | FAILED | STOPPED. Run TIDAK menciptakan uang —
ia mereferensikan withdrawal/payout existing.

## Fase eksekusi manusia

**PHASE A — PREPARE**: Founder konfirmasi guru + withdrawal → operator
menjalankan pre-flight (14 check, blocking reason per check) → catat bukti
kesiapan provider → `PREPARE` (→ READY). Satu check gagal = TIDAK DIEKSEKUSI.

**PHASE B — EXECUTE**: Founder `START` (pre-flight diulang) → sistem memakai
orchestrator P7D — tepat SATU payout, tanpa bypass idempotensi, tanpa mutasi
wallet manual.

**PHASE C — OBSERVE**: provider response + webhook + status inquiry.
Timeout/UNKNOWN → JANGAN kirim ulang membabi buta → prosedur rekonsiliasi.

**PHASE D — RECEIPT**: setelah provider PAID → konfirmasi ke guru via kanal
aman, TANPA meminta data perbankan sensitif. Catat hanya:
CONFIRMED_RECEIVED | NOT_YET_RECEIVED | UNABLE_TO_CONFIRM.
Provider PAID ≠ konfirmasi guru.

## STOP conditions (evidence preserved, tanpa resend otomatis)
Amount mismatch · destination mismatch · dugaan duplikat · konflik status
provider/sistem · signature webhook bermasalah · mismatch rekonsiliasi ·
guru belum terima setelah terminal success · risk case muncul saat eksekusi.

## Post-canary review (Founder)
TEKNIS: tanpa duplikat, webhook benar, rekonsiliasi bersih, invariant bersih.
FINANSIAL: jumlah tepat, diterima tepat, fee benar, tanpa pergerakan tak
terjelaskan. PRODUK: proses dipahami guru, komunikasi jelas. OPERASI: runbook
bisa dijalankan, kill switch dipahami. → CANARY_SUCCESS/FAILED/INCONCLUSIVE.

## ABSOLUTELY NO AUTO-SCALE
CANARY_SUCCESS TIDAK otomatis: membuka semua guru, menaikkan limit,
menghapus allowlist, recurring otomatis, payout tambahan. Setiap scale-up =
keputusan Founder terpisah.
