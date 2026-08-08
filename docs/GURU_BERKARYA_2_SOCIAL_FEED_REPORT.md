# GURU BERKARYA 2.0 — Social Feed Report

**Tanggal:** 8 Agustus 2026
**Status:** COMPLETE (LIKE: BLOCKED-gap | COMMENT: BLOCKED-gap | SHARE: IMPLEMENTED)
**Scope:** Fix root cause feed + redesign `GuruBerkarya` menjadi mini social feed guru. Additive-only — XP/Leaderboard/Rank/Badge/Mission engine tidak disentuh.

---

## 1. Root Cause (kasus founder: karya guru tidak muncul)

Kasus: Guru membuat artikel → terbit → **tidak muncul** di Guru Berkarya; yang terlihat hanya karya satu guru.

Akar masalah ditemukan di `app/api/guru/berkarya/route.ts`:

```ts
// SEBELUM (bug)
const excludeMe = url.searchParams.get("excludeMe") !== "0"; // default = 1
if (excludeMe) where.authorId = { not: user.id };            // kecuali diri sendiri
```

- `/api/guru/berkarya` **secara default mengecualikan `authorId === user.id`**.
- Komponen `GuruBerkarya` memanggil `/api/guru/berkarya?limit=6` **tanpa `excludeMe=0`** → karya guru yang sedang melihat **tidak pernah tampil**.
- Feed menampilkan karya guru *lain* yang baru-baru ini terbit — jika yang menulis baru hanya guru tersebut (atau guru lain sudah lama tidak menulis), feed terlihat "hanya berisi karya satu guru".

### Perbaikan (`app/api/guru/berkarya/route.ts`)
- Parameter `excludeMe` **dihapus**; current user **selalu tampil** di feed.
- Response kini mengembalikan `currentUserId` (penanda "Karya Anda" di UI) dan `meta: { xpArtikel, xpPuisi }` dari `GURU_XP_NILAI` (agar UI tidak hardcode angka).

---

## 2. Perilaku Feed

### Sebelum
- Mengecualikan karya sendiri (default `excludeMe=1`).
- Response `{ data }` saja — tanpa penanda user saat ini / nilai XP.
- Kartu grid 2 kolom, subtitle "Guru lain sedang berkarya".

### Sesudah
- Semua karya **terbit** guru (role GURU/ADMIN/founder) **termasuk karya sendiri**, diurutkan **publishedAt DESC** (karya terbaru pertama).
- Response `{ data, currentUserId, meta }` — backward-compatible (`data` tetap).
- Kartu diubah menjadi **stack 1 kolom bergaya social feed** (author → sekolah → waktu → badge jenis → judul → kutipan → aksi).

### Aturan yang dipatuhi
1. **Hanya ARTIKEL + PUISI** — `articleType` "PUISI" ditandai; jenis lain tidak diatur khusus (feed API hanya menanyakan kolom yang sudah ada, tidak ada jenis Materi/Soal di tabel Artikel).
2. **publishedAt DESC** sebagai urutan utama — **tanpa sorting popularitas** (views/likes/XP tidak mempengaruhi urutan).
3. **Current user wajib tampil** dengan badge `✨ Karya Anda` (dipasangkan `author.id === currentUserId` dari API).
4. **Tanpa one-author lock** — `take: limit` (frontend 6, server default 8 maks 20); kebaruan lebih diutamakan daripada memaksa variasi penulis.
5. **Draft tidak pernah tampil** — `where.isPublished: true`. Alur publikasi (`isPublished`/`publishedAt`) tidak diubah.
6. **Tanpa AI/personalization** — feed murni rule-based.

---

## 3. Tampilan Kartu (Artikel vs Puisi)

| Elemen | Artikel | Puisi |
|--------|---------|-------|
| Badge jenis | `bg-sky-100 text-sky-700` "Artikel" | `bg-purple-100 text-purple-700` "Puisi" |
| Kutipan | `excerpt` (line-clamp-2) | `excerpt` (baris awal puisi) — `whitespace-pre-line italic font-serif text-purple-700/80 line-clamp-4` |
| Cover | coverImage via `SafeMediaImage` | Sama (jika ada), fallback gradient Feather |
| Info | Nama penulis + sekolah + waktu relatif | Sama |
| Aksi | `N dibaca` + `ShareButton` | Sama |

Kutipan puisi diambil dari `excerpt` (= 200 karakter awal `content` secara default) — **tidak mengambil body artikel penuh** ke klien.

---

## 4. Like / Comment / Share

| Aksi | Keputusan | Alasan |
|------|-----------|--------|
| **Share** | ✅ **IMPLEMENTED** (reuse `components/shared/ShareButton.tsx`) | Infra sudah ada: `navigator.share` → fallback menu (Salin Link / WhatsApp / Email); `url="/artikel/${slug}"` menuju detail publik `app/artikel/[slug]/page.tsx`. |
| **Like** | ⛔ **BLOCKED (gap documented)** | **Tidak ada infrastruktur like untuk tabel `Artikel`.** Schema hanya punya `StudentKaryaLike` (murid). Tidak ada API like artikel. Per task: *"Jika belum ada infrastruktur yang sesuai: STOP dan dokumentasikan gap. Jangan membuat schema besar tanpa approval."* |
| **Comment** | ⛔ **BLOCKED (gap documented)** | Sama — hanya `StudentKaryaComment` (murid). Tidak ada mekanisme komentar untuk Artikel. |

> **Rekomendasi fase berikutnya (butuh approval founder):** buat model `ArtikelLike` + `ArtikelComment` (+ enum/interaction API) sebagai fase terpisah. Feed sudah diarsitekturkan agar aksi seperti/komentar mudah ditambahkan (action row per kartu). Ini juga membuka jalan ke "Karya Guru Pilihan" (popularity-based) yang **sengaja TIDAK dibangun di fase ini**.

---

## 5. Cache Audit

- `/api/guru/berkarya` = route handler dinamis (`getUser()` membaca cookies) → **tanpa cache**.
- Client fetch memakai `cache: "no-store"` → karya baru muncul **seketika** saat halaman dimuat ulang.
- Tidak ada `unstable_cache`/Redis di jalur feed.
- Satu-satunya cache: `revalidate = 600` pada halaman publik `app/artikel/[slug]/page.tsx` (detail artikel) — **tidak mempengaruhi feed**.
- **Kesimpulan:** tidak ada perubahan cache yang diperlukan.

---

## 6. Performa & Keamanan

**Performa**
- Feed dibatasi `take: limit` (frontend 6, server default 8 / maks 20) — bounded.
- `select` hanya kolom ringan (id, title, slug, excerpt, articleType, coverImage, readCount, timestamps, author minimal). **Tidak ada `content: true`** → body artikel tidak diunduh ke feed.
- Satu query `findMany` (tanpa N+1); cover image via `SafeMediaImage` (lazy loading).

**Keamanan**
- Role-gated `getUser()` + `isTeacherOrStudent` (403 untuk non-guru/founder).
- Hanya `isPublished: true` — draft/unpublished tidak bocor.
- Penulis dibatasi role GURU/ADMIN/founder.
- Tidak ada jawaban/`correctAnswer`/konten penuh yang diekspos.

---

## 7. UX & Aksesibilitas

- **"Karya Anda" badge**: `✨ Karya Anda` (emerald) di samping nama penulis saat `author.id === currentUserId` — memenuhi kasus founder (karya saya muncul + jelas milik saya).
- **Badge BARU**: 🔥 Baru untuk karya dengan `publishedAt` (bukan `createdAt`) ≤ 24 jam.
- **Waktu relatif**: baru saja / menit / jam / kemarin / hari (id-ID).
- **Empty state**: "Belum ada karya terbaru. / Jadilah guru pertama yang berkarya hari ini." + CTA Buat Artikel / Buat Puisi (deep-link `?type=puisi`).
- **Footer motivasi**: "✨ Karya Anda bisa menginspirasi guru lain." + XP riil dari `meta` API (tanpa hardcode).
- **A11y**: judul/tombol memakai teks semantik; avatar punya `alt`; kontras badge teruji; kartu dapat di-keyboard (`Link`).
- **Tanpa polling**: fetch sekali saat mount, `cache: no-store`.

---

## 8. Test

| Suite | Hasil |
|-------|-------|
| `test:guru-berkarya2-social-feed` (BARU — 37 asersi, termasuk regression acceptance) | ✅ SEMUA LULUS |
| `test:guru-active-literacy` (1 asersi diupdate: `excludeMe` → include self + `currentUserId`) | ✅ SEMUA LULUS |
| `test:guru-engagement2-phase2` (1 asersi diupdate: XP hardcode → dinamis via `meta`) | ✅ SEMUA LULUS |
| `test:guru-phase` | ✅ SEMUA LULUS |
| `test:gamification-engine` | ✅ SEMUA LULUS |
| `test:simulation-workflow` | ✅ 65/65 |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (5 file diubah) | ✅ 0 errors (1 warning `<img>` avatar — konsisten konvensi arena) |
| `npm run build` (dummy env) | ✅ exit 0, compiled, `/api/guru/berkarya` terdaftar |

> **Catatan update test:** dua asersi lama mencerminkan perilaku lama yang memang diubah task ini:
> - `test-guru-active-literacy.ts:66` menegaskan `excludeMe` (mengecualikan diri) → kini menegaskan sebaliknya (karya sendiri tampil + `currentUserId`).
> - `test-guru-engagement2-phase2.ts:81` menegaskan literal `+50 XP` → kini menegaskan XP dinamis dari `meta.xpArtikel` (persis aturan "jangan hardcode").
> Ini update berbasis spec, bukan sekadar agar lolos.

---

## 9. Regression Acceptance (Skenario Founder — Real World)

Rantai kode yang membuktikan skenario **"Guru A membuat artikel → terbit → kembali ke dashboard → karyanya muncul di Guru Berkarya → ditandai Karya Anda"** (diuji statis di suite baru, RA-1..RA-6):

1. **Publikasi**: `POST /api/guru/artikel` menandai `isPublished: true` + `publishedAt` → karya masuk kandidat feed.
2. **Feed tidak menyaring diri**: tidak ada `authorId: { not: user.id }` → artikel Guru A masuk.
3. **Urutan**: `publishedAt DESC` → karya baru Guru A ada di atas.
4. **UI**: `author.id === currentUserId` → badge `✨ Karya Anda`.

Verifikasi manual yang disarankan (setelah deploy):
1. Login guru (mis. `guru@demo.com`) → Buka `/guru/artikel` → tulis artikel singkat → **Terbitkan**.
2. Kembali ke `/guru/beranda` → kartu karya baru muncul di **atas** feed Guru Berkarya dengan badge `✨ Karya Anda`.
3. Klik kartu → terbuka `/artikel/{slug}`; klik **Bagikan** → menu share muncul.

---

## 10. Files Changed

| File | Perubahan |
|------|-----------|
| `app/api/guru/berkarya/route.ts` | Hapus `excludeMe` (self selalu tampil); +`currentUserId`, +`meta` (xpArtikel/xpPuisi dari `GURU_XP_NILAI`) |
| `components/guru/GuruBerkarya.tsx` | Rewrite social feed (Karya Anda, BARU via publishedAt, ShareButton, puisi serif, footer XP riil, empty state) |
| `scripts/test-guru-berkarya2-social-feed.ts` | BARU — 37 asersi (31 tes + 6 regression acceptance) |
| `package.json` | +`test:guru-berkarya2-social-feed` |
| `scripts/test-guru-active-literacy.ts` | Asersi `excludeMe` → include-self (spec-driven) |
| `scripts/test-guru-engagement2-phase2.ts` | Asersi `+50 XP` → dinamis via `meta` (spec-driven) |
| `docs/GURU_BERKARYA_2_SOCIAL_FEED_REPORT.md` | Ini |

**Tidak disentuh:** XP engine, leaderboard, rank/badge/mission, schema Prisma (0 migration), P1-C, file WIP lain, alur publikasi.

---

## 11. Remaining / Limitations

1. **Like/Komentar guru Artikel = BLOCKED** (gap infra, butuh approval untuk schema `ArtikelLike`/`ArtikelComment`).
2. **"Karya Guru Pilihan"** (popularity section) sengaja belum dibangun — arsitektur aksi kartu sudah siap untuk fase berikutnya.
3. Feed dibatasi 6 kartu (frontend); "Lihat Semua Karya" menuju `/guru/artikel` (halaman kelola milik sendiri — belum ada halaman "semua karya guru" publik; di luar scope).
4. `revalidate = 600` pada halaman detail artikel berarti perubahan konten artikel publik baru terlihat maksimal 10 menit kemudian (feed tidak terpengaruh).
5. Suara/badge-score game solo (kosmetik) tetap status existing — tidak bagian dari fase ini.

---

## STATUS

- **STATUS: COMPLETE**
- **LIKE: BLOCKED** (tidak ada infrastruktur like Artikel — gap terdokumentasi, butuh schema baru + approval)
- **COMMENT: BLOCKED** (tidak ada infrastruktur komentar Artikel — gap terdokumentasi, butuh schema baru + approval)
- **SHARE: IMPLEMENTED** (reuse `ShareButton` → native share / Salin Link / WhatsApp / Email)
- **ROOT CAUSE FIXED**: current user's karya sekarang selalu muncul + ditandai "Karya Anda"
- **COMMIT/PUSH: TIDAK dilakukan** (menunggu instruksi) — P1-C tidak disentuh
