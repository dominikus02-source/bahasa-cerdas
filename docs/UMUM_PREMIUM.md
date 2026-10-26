# Premium Umum (UMUM Premium)

Status: di balik flag `ENABLE_UMUM_PREMIUM` (default **mati**). Stacked di atas PR #185 (`feat/umum-ready`).

## Keputusan founder (final)

| Topik | Keputusan |
|---|---|
| Paket | `UMUM_PREMIUM_MONTHLY` Rp79.000 / 30 hari · `UMUM_PREMIUM_YEARLY` Rp849.000 / 365 hari · **tanpa kredit AI** |
| Pembayaran | Midtrans Snap **sekali bayar**. Tidak ada perpanjangan / tagihan otomatis; berhenti kapan saja (tidak membayar lagi). Halaman menyatakan ini secara eksplisit. |
| Uji coba | **Ditawarkan, tidak pernah otomatis**. "Coba gratis 1 bulan" di `/umum/premium` + tawaran lunak di `/umum` (hanya tautan). Sekali per akun **dan** per orang. Batal kapan saja; tidak dikonversi; habis → Gratis. Bayar saat uji coba → sisa hari uji coba **ditambahkan**. |
| TOKO KARYA | Jelajah & beli gratis untuk semua. Jual = Premium, **belum dibangun** (lihat bawah). |
| JUMPA | Premium Umum = Guru Premium (25/120, ruang tak terbatas, 1080p, blur; webinar 200/180 1×/minggu). PR ini hanya memetakan tier. |
| AKU SASTRAWAN | Draf tetap bisa dibaca & diekspor setelah premium habis (gerbang TULIS, bukan GET). |

## Sumber kebenaran

- `lib/billing/plans.ts` — paket, `isUmumPlanId`, `getUmumPlans`, `transactionTypeForPlan` (allowlist eksplisit GURU→`PREMIUM_UPGRADE`, MURID→`MURID_PREMIUM`, UMUM→`UMUM_PREMIUM`). Halaman `/umum/premium` membaca harga dari sini (tidak di-hardcode).
- `lib/account/identity.ts` — `resolveIdentity`: UMUM bayar → `UMUM_PREMIUM/ACTIVE`; UMUM `trialPlan=UMUM_PREMIUM_TRIAL` aktif → `UMUM_PREMIUM/TRIALING`. Peran lain tidak pernah mendapat `UMUM_PREMIUM`.
- `lib/umum/premium.ts` — `hasUmumPremium(user)`, `umumPremiumState(user)`, `umumPremiumRequired()` (403 standar `UMUM_PREMIUM_REQUIRED` + `upgradeUrl`). **Tidak** bergantung pada flag: hak yang sudah dibayar tidak hilang bila flag dimatikan.
- `lib/umum/premium-flag.ts` — `isUmumPremiumEnabled()` (`ENABLE_UMUM_PREMIUM=true|1`).
- `lib/umum/trial.ts` — klaim/batal uji coba.

## Flag `ENABLE_UMUM_PREMIUM`

- Mati: checkout paket UMUM → 403 `CHECKOUT_FORBIDDEN_ROLE` "Premium Umum belum dibuka." **sebelum** DB/Midtrans dan sebelum bypass founder. Klaim uji coba → `TRIAL_DISABLED`. Halaman menampilkan "Segera dibuka".
- Webhook, reconcile & manual-activate **mengabaikan** flag (pembayaran yang sudah terjadi tetap diproses).

## Checkout (`POST /api/billing/checkout`)

- UMUM hanya boleh paket UMUM; GURU/MURID/INVESTOR membeli paket UMUM → 403; UMUM membeli paket guru/murid → 403. Ditambah pengaman `plan.targetRole !== user.role` → 403.
- Kupon: paket UMUM hanya menerima kupon **khusus UMUM** (`untukRole="UMUM"` atau `planId=UMUM_PREMIUM_*`). Kupon `"*"`/guru/murid ditolak. Kupon UMUM tidak berlaku untuk paket guru/murid. (Belum ada UI admin kupon; kupon dibuat lewat DB/skrip.)
- Resume: pesanan UMUM `PENDING` ≤ 15 menit dengan paket + nominal + kupon sama dilanjutkan (token Snap disimpan di metadata), bukan dibuat ulang.
- Metadata transaksi: `planId`, `durationDays`, `aiCreditsMonthly: 0`, kupon.

## Webhook (`lib/payments/midtrans-notification.ts`)

- `UMUM_PREMIUM` **tidak pernah** ditebak dari nominal: fallback `getPlanFromAmount` tidak mengenal 79.000/849.000.
- Nominal Midtrans ≠ nominal lokal → 400, tetap PENDING.
- Metadata hilang / `planId` bukan UMUM / akun bukan UMUM → transaksi `SUCCESS` + `needsManualReview: true` (`manualReviewReason`), premium **tidak** diaktifkan. Founder mengaktifkan lewat `POST /api/admin/payments/manual-activate` dengan `planId` UMUM eksplisit (klaim optimistik, tidak dobel).
- Aktif: `isPremium=true`, `premiumPlan="PRO"` (kolom lama), `premiumUntil` ditumpuk + sisa uji coba; uji coba ditutup. **Tanpa** ledger kredit AI, **tanpa** komisi guru. Cache `/api/user/me` (v1 & v2) dibersihkan.
- Efek samping yang perlu diketahui: karena `isPremium=true`, batas laju AI yang memakai `isPremium` ikut naik untuk UMUM berbayar (uji coba tidak).
- Reconcile, status, riwayat, laporan admin & premium report mengenali `UMUM_PREMIUM`.

## Uji coba (`/api/umum/trial`)

- `GET` status · `POST` klaim · `DELETE` batal.
- Klaim atomik dalam `$transaction`: `TrialClaim.create` (unik) + `updateMany` bersyarat (`role=UMUM`, `trialStartedAt=null`); pemeriksaan awal menolak founder, peran lain, dan akun yang sedang berbayar. Kolom yang dipakai ulang: `trialStartedAt`, `trialEndsAt` (+30 hari), `trialPlan='UMUM_PREMIUM_TRIAL'`, `trialCreditsTotal=null` (tanpa kredit).
- Tabel `TrialClaim` (migrasi `20261026000000_trial_claim`): HMAC-SHA256 (`TRIAL_CLAIM_HASH_SECRET`, ada nilai bawaan) atas email ternormalisasi (huruf kecil; Gmail: titik & `+tag` dibuang, `googlemail.com`→`gmail.com`) dan hash id Google (`sub`), unik per `kind`. **Tanpa FK** ke User → bertahan setelah akun dihapus. Berlaku untuk akun email/sandi juga (tidak khusus Google).
- IP: hanya sinyal lunak (hash prefiks /24 atau /48). ≥3 klaim dari prefiks sama dalam 24 jam → `flagged`, **tidak** diblokir.
- Batal → `trialEndsAt=now` (kembali Gratis, tidak bisa klaim ulang). Habis → Gratis otomatis (dihitung `resolveIdentity`; tidak ada cron, tidak ada tagihan).

## Hubungan dengan JUMPA UMUM (`feat/jumpa-umum`, pekerja lain)

- PR ini: `tierForPlan("UMUM_PREMIUM") → "PREMIUM"` (`lib/jumpa/entitlement.ts`) dan `hasUmumPremium()`.
- `feat/jumpa-umum` menambah `JUMPA_UMUM_TIERS` (UMUM_FREE 10/45, 3/hari, 720p; UMUM_PREMIUM 25/120, tak terbatas, 1080p) dengan `JUMPA_UMUM_PREMIUM_ENABLED = false`, dan memblokir webinar untuk UMUM.
- Setelah keduanya merge: ganti `JUMPA_UMUM_PREMIUM_ENABLED` agar dihitung dari hak (mis. tier dari `tierForPlan(resolveIdentity(user).plan)` / `hasUmumPremium(user)`), lalu buka webinar UMUM Premium 200/180 1×/minggu di PR JUMPA. Tumpang tindih file hanya `package.json` & `prisma/schema.prisma` (bagian berbeda).

## Panduan untuk AKU SASTRAWAN (PR #183)

PR ini tidak menyentuh #183. Di #183:

```ts
import { hasUmumPremium, umumPremiumRequired } from "@/lib/umum/premium";
// POST/PUT/PATCH (buat, simpan, terbitkan): gerbang
if (user.role === "UMUM" && !hasUmumPremium(user)) return umumPremiumRequired();
// GET (baca/daftar/ekspor): JANGAN digerbang — draf tetap milik user setelah premium habis.
```

UI cukup menampilkan tautan ke `/umum/premium` saat menerima `UMUM_PREMIUM_REQUIRED`.

## TOKO KARYA — jual (belum dibangun)

- Sekarang: `POST /api/karya` tetap 403 untuk semua akun UMUM (termasuk Premium) dengan `code: "UMUM_SELL_NOT_AVAILABLE"` dan `upgradeUrl`. `POST /api/marketplace` tetap khusus GURU/ADMIN/founder. Kait UI "Jual karya (Premium)" ada di `/umum/premium#jual-karya` dan `/umum/koleksi`.
- Desain bila dibangun: buka `POST /api/karya` & `/api/marketplace` untuk `role===UMUM && hasUmumPremium(user)`; profil payout (rekening + verifikasi, memakai ulang `TeacherPayoutProfile` atau model baru), antrean moderasi sebelum terbit, split 85/15 yang sama ke `User.saldo`, penarikan saldo, pajak/syarat kreator. Saat premium habis: listing di-unpublish sementara, saldo tetap bisa ditarik, pembeli tetap bisa mengunduh.
- Ukuran: **±500+ baris** + alur payout/moderasi/komisi → PR terpisah.

## Tindak lanjut

- Refund (`refund`/`chargeback`) belum mencabut Premium Umum.
- Payment-health / data-quality & MRR eksekutif belum menghitung `UMUM_PREMIUM`.
- Webinar JUMPA untuk UMUM Premium (PR JUMPA).
- UI admin kupon (untukRole `UMUM`).
- TOKO KARYA jual (PR terpisah).

## Uji

- `npm run test:umum-premium` (CI, tanpa DB): paket, identitas, matriks checkout × flag, resume, kupon, webhook (duplikat, nominal salah, metadata hilang, peran salah, bonus uji coba, regresi guru/murid), uji coba (sekali, hapus+daftar ulang, Google sub, batal, kedaluwarsa, IP lunak, flag mati, peran), manual-activate.
- `npm run test:role-umum`, `npx tsx scripts/test-umum-ready.ts`.
