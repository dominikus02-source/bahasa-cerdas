# P8D — Midtrans Money Rail: Capability Verification

**Status**: VERIFICATION COMPLETE — **MIDTRANS NOT READY** sebagai B2C disbursement rail untuk Guru Cerdas Sejahtera.

**Sumber**: docs.midtrans.com (llms.txt + halaman resmi, diakses 26 Agustus 2026). Tidak ada asumsi yang dikarang — setiap temuan di bawah merujuk halaman resmi.

---

## 1. Temuan Kunci (Verified)

| # | Temuan | Bukti (docs resmi) |
|---|--------|--------------------|
| 1 | "Payout" Midtrans = **penarikan saldo merchant SENDIRI** ke rekening bank terdaftar milik merchant sendiri. BUKAN rail untuk membayar pihak ketiga. | `docs/fund-withdrawal-information.md`, `docs/how-can-i-have-my-money-in-my-account-payout.md`: "formerly this activity was also called as 'Payout', due to clarity it is now called as 'Withdrawal'" |
| 2 | Penarikan dilakukan via **dashboard MAP (manual)** atau **Auto-Withdrawal schedule** (harian/mingguan/bulanan). Tidak ada API self-serve untuk payout per-penerima. | Halaman yang sama — langkah Manual Withdrawal = klik BALANCE → Withdraw → Confirm |
| 3 | "Create Payout API / Approve Payout API" (SNAP) adalah transfer dana **merchant** — dan SNAP **tidak lagi mengizinkan approval via API** ("every transfer API will directly processed", bank transfer & emoney topup dipisah). Tetap self-withdrawal, bukan B2C. | `reference/overview.md` (SNAP) |
| 4 | Satu-satunya disbursement ke USER pihak ketiga yang terdokumentasi = **Reward GoPay Coins/eMoney** — penerima diidentifikasi dari **Authorization token GoPay** (pengguna harus terhubung lewat GoPay saat bertransaksi dengan merchant). Bukan rail bank-account/e-wallet umum. | `reference/reward-coins-emoney-v2.md` |
| 5 | **Tidak ada halaman API reference** untuk: Create Payout (B2C), Disbursement API, status inquiry disbursement, webhook disbursement, idempotency key disbursement, failure taxonomy disbursement. | Index lengkap `docs.midtrans.com/llms.txt` (API Reference) — tidak ada entri payout/disbursement/transfer B2C |
| 6 | **IRIS tidak muncul di dokumentasi publik** (partner-gated, facilitator marketplace dengan onboarding sub-merchant + KYB per penerima — bukan self-serve B2C bank payout). | Tidak ada di llms.txt sama sekali |

## 2. Requirement GCS vs Capability Midtrans

| Requirement GCS (P7C–P8C) | Midtrans | Status |
|---|---|---|
| Bayar ke rekening bank guru **mana pun** (bukan rekening milik merchant) | Hanya rekening merchant sendiri | ❌ NOT SUPPORTED |
| Bayar ke e-wallet guru (DANA/OVO/ShopeePay/LinkAja) | Hanya GoPay via token auth (per-transaksi linkage) | ❌ NOT SUPPORTED (kecuali GoPay-token) |
| API programmatic createPayout per withdrawal | Tidak ada API B2C payout | ❌ NOT SUPPORTED |
| Idempotency key provider-side | Tidak ada untuk disbursement | ❌ NOT SUPPORTED |
| Status inquiry (getPayoutStatus) | Tidak ada | ❌ NOT SUPPORTED |
| Webhook disbursement (paid/failed) | Tidak ada (webhook = payment only) | ❌ NOT SUPPORTED |
| Failure taxonomy retryable/non-retryable | Tidak ada | ❌ NOT SUPPORTED |
| Sandbox disbursement | Tidak ada | ❌ NOT SUPPORTED |
| Settlement | Same-day sbl 11.00 (self-withdrawal); min Rp10.000; 3 hari hold saldo | ⚠️ UNVERIFIED untuk B2C (tidak berlaku) |
| Fee | Gratis untuk self-withdrawal | ⚠️ (tidak relevan) |

## 3. Kesimpulan

**MIDTRANS NOT READY** untuk rail pembayaran komisi guru. Midtrans kuat di sisi penerimaan pembayaran murid (sudah dipakai production) — tapi tidak memiliki produk API disbursement B2C yang dibutuhkan GCS (puluhan ribu penerima individu). Memaksa implementasi = mengarang endpoint, yang dilarang keras oleh direktif.

**Yang dilakukan di P8D (tanpa mengarang):**
1. Dokumen verifikasi ini — bukti per item.
2. `MidtransDisbursementProvider` **stub jujur** di belakang `PayoutProvider`: contract lengkap, `createPayout` mengembalikan kegagalan deterministik `MIDTRANS_NOT_SUPPORTED` (tidak pernah mengirim uang, tidak pernah memanggil endpoint palsu). Bila `PAYOUT_PROVIDER=midtrans` diset, sistem gagal LANTANG + teraudit — bukan diam.
3. Registry: `mock` (default) · `xendit` (existing) · `midtrans` (stub).
4. Finance report: dimensi provider (aditif, semantik lama dipertahankan).
5. Real money tetap DISABLED.

**Rekomendasi founder**: bila satu-ekosistem tetap diinginkan, jalur realistis =
- rail B2C tetap Xendit Payouts (P7E), ATAU
- Midtrans IRIS hanya bila siap meng-onboard setiap guru sebagai sub-merchant (KYB per guru) — biaya operasional jauh lebih tinggi, perlu kesepakatan komersial terpisah dengan Midtrans.
