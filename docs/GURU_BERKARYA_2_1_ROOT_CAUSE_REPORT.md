# Root Cause Report — Feed "Guru Berkarya" Tampil Kosong

**Fase:** Guru Berkarya 2.1 (Social Interaction) — post-commit `bb46996`
**Tanggal audit:** Aug 8, 2026
**Sifat:** Audit root cause + fix minimal. **Tidak ada commit/push/deploy.**

---

## 1. Gejala (Symptom)

- Halaman `/guru/beranda` menampilkan widget `GuruBerkarya` dengan teks **"Belum ada karya terbaru."** (empty state), padahal guru-guru punya artikel/puisi yang sudah diterbitkan (`isPublished = true`).
- Feed `/api/guru/berkarya` seolah mengembalikan array kosong.

## 2. Root Cause

**Query feed 2.1 menambahkan relasi/agregasi sosial (`likes`, `comments`, `_count`) langsung ke query utama `db.artikel.findMany`, padahal tabel `ArtikelLike` / `ArtikelComment` BELUM ada di database.**

Alur kerusakan:

1. Commit `bb46996` mengubah `GET /api/guru/berkarya` sehingga `findMany` memakai `select: { likes: { where: { userId } }, _count: { likes, comments } }`.
2. Migrasi manual `prisma/migrations/manual/2026-08-08_guru_berkarya_social.sql` (yang menciptakan kedua tabel) **belum di-apply** di Supabase — dokumentasi fase 2.1 sendiri mencatatnya.
3. Prisma meng-compile query menyentuh tabel yang tidak ada → Prisma melempar `P2021`/`relation does not exist`.
4. Route membungkus semuanya dalam satu `try/catch` → respons `500 Internal error`.
5. `GuruBerkarya.tsx` menangkap error di `.catch(() => setItems([]))` → `items = []`.
6. Komponen merender empty state **"Belum ada karya terbaru."** — menyamar sebagai "feed kosong", padahal itu error tersembunyi.

Regresi ini hanya ada di 2.1: route 2.0 (commit `fdf875a`) tidak menyentuh tabel sosial di query feed, sehingga feed bekerja normal.

## 3. Bukti (Evidence)

- `git show fdf875a` → route 2.0 memakai `select` dasar (Artikel/User/Profile) **tanpa** `likes`/`_count`.
- `git diff bb46996` → route 2.1 menambah `select: { likes: { where: { userId: user.id }, take: 1 }, _count: { likes: true, comments: true } }`.
- `prisma/schema.prisma`: model `ArtikelLike` (baris ±1499) dan `ArtikelComment` (baris ±1513) terdefinisi.
- `prisma/migrations/manual/2026-08-08_guru_berkarya_social.sql`: berisi `CREATE TABLE IF NOT EXISTS "ArtikelLike"` / `"ArtikelComment"` — **tidak tercatat di-apply** (belum ada bukti tabel di DB).
- `components/guru/GuruBerkarya.tsx` (sebelum fix): `.catch(() => setItems([]))` → error dikonversi menjadi empty feed.
- Catatan: environment lokal tidak memiliki akses DB yang dapat dibaca (`.env.local` berisi placeholder `[SENSITIVE]`), sehingga **tidak ada klaim "data ada/tidak ada"** di laporan ini; kesimpulan didasarkan pada trace kode statis.

## 4. Flow yang Terkena

```
/guru/beranda
  └─ <GuruBerkarya misiStatus>
       └─ GET /api/guru/berkarya?limit=6
            └─ db.artikel.findMany({ select: { likes, _count } })  ← menyentuh tabel sosial
                 └─ tabel belum ada → P2021
                      └─ catch → 500
                           └─ UI catch → items=[] → "Belum ada karya terbaru."  (SALAH)
```

## 5. Perbaikan (Fix)

### 5.1 `app/api/guru/berkarya/route.ts`
- **Query dasar feed** hanya menyentuh `Artikel` / `User` / `Profile` (tabel yang selalu ada):
  - `where.isPublished: true` + `author: { OR: [{ role: "GURU" }, { role: "ADMIN" }, { isFounder: true }] }`
  - `orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }]`, `take: limit`
- **Enrichment sosial dipindah** ke `Promise.all` atas 3 query terpisah (`artikelLike.groupBy`, `artikelComment.groupBy`, `artikelLike.findMany` by `userId`) yang **dibungkus `try/catch`**:
  - Jika tabel sosial belum ada → count jatuh ke `0`, status like `false`, **item feed tidak hilang**.
  - Tanpa N+1 (semua agregasi `groupBy` / satu query per user).
- Response shape **tetap stabil**: `{ data, currentUserId, meta }`, tiap item punya `likeCount` / `commentCount` / `likedByCurrentUser`.

### 5.2 `components/guru/GuruBerkarya.tsx`
- **Error API ≠ empty feed.** State `error` + `reloadKey` ditambahkan:
  - `.catch(() => setError(true))` → merender kartu **"Gagal memuat karya guru."** dengan tombol **"Muat Ulang"** (men-trigger `reloadKey`).
  - Empty state **"Belum ada karya terbaru."** hanya muncul ketika API **berhasil** mengembalikan `data` kosong (benar-benar belum ada karya).

## 6. File yang Diubah

| File | Perubahan |
|------|-----------|
| `app/api/guru/berkarya/route.ts` | Query dasar terpisah dari enrichment sosial; enrichment best-effort (`try/catch` + `groupBy`); shape respons tidak berubah. |
| `components/guru/GuruBerkarya.tsx` | State `error` + `reloadKey`; kartu error dengan tombol Muat Ulang; empty state hanya untuk data kosong sungguhan. |
| `scripts/test-guru-berkarya-social.ts` | TEST 32–34 disesuaikan ke struktur best-effort (groupBy + findMany + `?? 0`); TEST 48–57 baru (root-cause feed resiliency & error≠empty); total 57 asersi. |

## 7. Tes

- `npm run test:guru-berkarya-social` → **57/57 PASS** (termasuk 10 tes root-cause baru: query dasar tidak menyentuh tabel sosial, isPublished+author OR, tanpa filter type/tanggal, badge BARU ≤24 jam, "kemarin" >24 jam, PUISI terbaca, enrichment best-effort tidak menghapus item, error≠empty).
- `npm run test:guru-phase` → **SEMUA LULUS**
- `npm run test:gamification-engine` → **SEMUA LULUS**
- `npm run test:simulation-workflow` → **65/65**

## 8. QA

| Check | Hasil |
|-------|-------|
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (route, komponen, test) | ✅ 0 errors (1 warning `<img>` — konvensi arena existing) |
| `npm run build` (dummy env) | ✅ 360 pages, compiled successfully, 0 errors |
| `git diff` | ✅ Hanya 3 file yang diubah |

## 9. Regression Check

- **Regresi 2.0:** karya sendiri tetap tampil (badge "✨ Karya Anda", `isOwn`) — tanpa pengecualian karya sendiri; tidak ada token `excludeMe` di route. `ShareButton` tetap ada. Urutan `publishedAt DESC` dipertahankan. ✅
- **Aturan 2.1:** like idempoten, validasi komentar, moderasi ADMIN/founder, tanpa XP/koin/notifikasi untuk like/komentar, feed tanpa N+1 dan tanpa eager-fetch komentar — semua tes lintas fase tetap lulus. ✅
- **Kontrak API:** `data` / `currentUserId` / `meta` serta field sosial tetap sama; tidak ada perubahan yang memaksa konsumen lain menyesuaikan. ✅
- **Additive-only:** tidak ada model/migrasi baru yang dibuat di sesi ini; tidak ada perubahan schema, XP engine, leaderboard, sistem sosial murid, atau file pre-existing yang tidak berkaitan.

## 10. Perilaku Akhir (Final Behavior)

- **Own works visible:** karya guru yang sedang melihat selalu muncul di feed.
- **Sorting:** `publishedAt DESC` (karya terbaru dulu).
- **Badge 24H:** hanya label tampilan (`adalahBaru` ≤24 jam, `waktuRelatif` → "kemarin"/"N hari lalu"), bukan filter.
- **Type:** ARTIKEL **dan** PUISI tampil (tanpa filter type).
- **Like/comment/share:** dipertahankan; count riil ketika tabel sosial ada, jatuh aman ke 0 tanpa crash ketika belum ada.
- **XP:** tidak berubah.
- **P1-C:** tidak tersentuh.
- **Database writes:** **0** (sesi ini murni baca + edit kode; tidak ada `--apply`/migrasi/seed dijalankan).

## 11. Tindakan yang Disarankan (untuk penyelesaian penuh, di luar lingkup audit ini)

1. Jalankan `prisma/migrations/manual/2026-08-08_guru_berkarya_social.sql` di Supabase SQL Editor (PRODUCTION + PREVIEW) → like/komentar guru aktif penuh (count riil muncul).
2. Setelah itu jalankan `npx prisma generate` di deployment.
3. Verifikasi visual `/guru/beranda` → feed menampilkan karya guru yang sudah terbit.

---

**STATUS — GURU BERKARYA ROOT CAUSE**
- ROOT CAUSE: `FOUND` — query feed 2.1 menambah relasi/`_count` tabel sosial `ArtikelLike`/`ArtikelComment` yang belum ada di DB (migrasi manual belum di-apply) → Prisma `P2021` → route 500 → UI menelan error jadi empty feed.
- EVIDENCE: diff `bb46996` (select likes/_count) vs `fdf875a` (tanpa); schema punya model; migrasi manual ada tapi belum di-apply; komponen `.catch(()=>setItems([]))`.
- FIX: `route.ts` query dasar hanya Artikel/User/Profile + enrichment sosial best-effort (`try/catch` + `groupBy`, tanpa N+1); `GuruBerkarya.tsx` state `error`+`reloadKey`, kartu "Gagal memuat" ≠ empty feed; test 57 asersi (10 baru root-cause).
- OWN WORKS: VISIBLE (tanpa pengecualian karya sendiri, badge "✨ Karya Anda").
- SORT: `publishedAt DESC`.
- 24H BADGE: DISPLAY ONLY (`adalahBaru` ≤24 jam).
- TYPE: ARTIKEL + PUISI (tanpa filter).
- LIKE/COMMENT/SHARE: PRESERVED (count riil, fallback aman 0).
- XP: UNCHANGED.
- P1-C: UNTOUCHED.
- DATABASE WRITES: 0.
- QA: `test:guru-berkarya-social` 57/57 · `test:guru-phase` PASS · `test:gamification-engine` PASS · `test:simulation-workflow` 65/65 · `tsc` 0 · ESLint 0 · build 360 pages.
- COMMIT: NO · PUSH: NO · DEPLOY: NO.
