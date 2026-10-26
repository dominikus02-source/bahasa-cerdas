# Akses Founder (Okt 2026)

Keputusan CEO (26 Okt 2026). Founder = `User.isFounder = true`; role tetap
(GURU/MURID/…). Founder aktif: dominikus.02@gmail.com (super founder),
alexsurya1968@gmail.com, srphysics04@gmail.com, solehahmadnugraha@yahoo.com,
wwidharyanto@gmail.com. hdsastra47@gmail.com (Washadi) **bukan** founder — akun
tetap ada, tanpa akses admin/founder.

## 1. Pengaman admin

| Bagian | Berkas |
|---|---|
| Pembungkus route admin | `lib/admin/guard.ts` (`withAdmin`) |
| Aturan konfirmasi ketik | `lib/admin/confirm.ts` |
| Log audit | `lib/admin/audit.ts`, tabel `AdminAuditLog` |
| Super founder | `lib/auth/super-founder.ts` |
| Aksi uang atas milik sendiri | `lib/admin/self-action.ts` |
| UI konfirmasi | `components/admin/TypedConfirm.tsx` |
| Halaman founder & log | `app/(dashboard)/admin/founder/page.tsx` |

### `withAdmin(handler, { route, method, bearerEnv? })`
1. `bearerEnv` (opsional): token mesin dibandingkan *timing-safe*; lolos tanpa sesi.
2. Tanpa sesi → 401. Bukan founder dan bukan ADMIN → 403.
3. GET langsung jalan (tidak dicatat).
4. Metode lain: jika `requiresTypedConfirm(method, path)` dan header
   `x-admin-confirm` ≠ `KONFIRMASI` → **428 `CONFIRM_REQUIRED`**.
5. Handler jalan, lalu satu baris `AdminAuditLog` ditulis: pelaku, metode, path,
   status, target user, ip, user-agent, metadata (params, query, input).
   Error → dicatat status 500 lalu dilempar ulang. Gagal menulis log tidak
   menggagalkan aksi.

Metadata disaring: kunci yang mirip rahasia/PII (password, token, key, url,
signature, cookie, otp, pin, rekening/nomor, phone, file, content, html…)
**tidak disimpan**, hanya namanya di `_redactedKeys`. String dipotong 200 karakter.

Aksi yang wajib konfirmasi ketik: status penarikan (dua jenis), retry/reconcile
payout, kontrol/safety/canary/backfill payout, keputusan pre-canary, aktivasi
manual pembayaran, perbaikan payment-health/rekonsiliasi, keputusan teacher-risk,
aksi massal user (maks 200), impor bank soal, tambah/cabut founder.

### Route baru
- `GET /api/admin/founders` — daftar founder + `canManage` (super founder).
- `POST /api/admin/make-founder` `{ email }` — super founder saja.
- `POST /api/admin/revoke-founder` `{ email }` — super founder saja; super founder
  tidak bisa dicabut; akun tidak dihapus.
- `GET /api/admin/audit-log?page=&q=` — 30 baris/halaman.

### Konflik kepentingan
Founder GURU tetap dapat komisi. Karena itu founder **tidak bisa** menyetujui
penarikan, penarikan komisi, atau retry payout miliknya sendiri
(403 `SELF_ACTION_BLOCKED`). Minta founder lain.

### Menambah route admin baru
Ekspor lewat `withAdmin`:
```ts
async function adminPOST(req: Request) { … }
export const POST = withAdmin(adminPOST, { route: "/api/admin/contoh", method: "POST" });
```
Jika aksinya menyangkut uang atau massal, tambahkan aturan di `lib/admin/confirm.ts`
dan kirim `adminConfirmHeaders()` dari UI setelah `useTypedConfirm()`.
`npm run test:founder-access` gagal jika ada route admin yang tidak dibungkus.
