# GURU BERKARYA 2.1 — Social Interaction Report (Like + Komentar Artikel Guru)

**Tanggal:** 8 Agustus 2026
**Status:** COMPLETE (LIKE: IMPLEMENTED | COMMENT: IMPLEMENTED | SHARE: TETAP)
**Scope:** Like + komentar untuk Artikel/Puisi guru di feed Guru Berkarya. Additive-only — XP/Leaderboard/Rank/Badge/Mission engine, P1-C School Identity, dan infrastruktur sosial murid (`StudentKarya*`) TIDAK disentuh.

---

## 1. Goal

Melengkapi feed Guru Berkarya (fase 2.0 — COMPLETE) dengan interaksi sosial guru:
- **Like** — guru bisa menyukai / membatalkan suka Artikel & Puisi guru lain (dan karyanya sendiri).
- **Komentar** — guru bisa menulis, melihat, dan menghapus komentar (pemilik atau moderasi).
- **Counts riil** — feed menampilkan jumlah like/komentar + status "sudah disukai" tanpa N+1 dan tanpa angka karangan.
- **Regresi wajib** — karya sendiri tetap tampil (`✨ Karya Anda`), Share tetap ada, tanpa full page reload.

---

## 2. Scope

**Dalam scope:**
- Model `ArtikelLike` + `ArtikelComment` (+ relasi balik di `Artikel` dan `User`) — additive-only, tanpa migrate data.
- API: `POST`/`DELETE /api/guru/berkarya/[id]/like`, `GET`/`POST /api/guru/berkarya/[id]/comments`, `DELETE /api/guru/berkarya/[id]/comments/[commentId]`.
- Feed `GET /api/guru/berkarya` diperluas: `likeCount`, `commentCount`, `likedByCurrentUser`.
- UI: footer sosial per kartu (❤️ 💬 ↗) + panel komentar modal lazy-load.

**Di luar scope (tidak disentuh):**
- XP engine (`awardXp`, `awardGuruXp`, `GURU_XP_NILAI`, `lib/guru/literasi-xp.ts`) — **tidak ada XP untuk like/komentar**.
- Leaderboard guru, Rank/Level/Badge/Mission engine.
- Infrastruktur sosial murid (`StudentKaryaLike`, `StudentKaryaComment`, route `api/siswa/karya/*`) — hanya dipakai sebagai referensi arsitektur.
- P1-C School Identity (`Profile.schoolId`, `lib/school/*`, migrasi `2026-08-08_school_identity.sql`).
- Editor publikasi guru (`app/api/guru/artikel`), detail artikel publik, notifikasi.

---

## 3. Data Model (additive-only)

```prisma
model ArtikelLike {
  id        String   @id @default(cuid())
  artikelId String
  userId    String
  createdAt DateTime @default(now())
  artikel Artikel @relation(fields: [artikelId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([artikelId, userId])
  @@index([artikelId])
  @@index([userId])
}

model ArtikelComment {
  id        String   @id @default(cuid())
  artikelId String
  userId    String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  artikel Artikel @relation(fields: [artikelId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([artikelId])
  @@index([artikelId, createdAt])
  @@index([userId])
}
```

- **Tidak ada kolom denormalisasi** (`likesCount` di `Artikel` TIDAK ditambahkan) — count dihitung dari tabel.
- **Tidak ada threading** (`parentId`) — komentar datar sesuai keputusan no-overengineering.
- **Cascade delete** mengikuti konvensi `StudentKarya*`: menghapus artikel → like/komentar ikut terhapus.
- Pola compound unique `@@unique([artikelId, userId])` meniru `StudentKaryaLike` → mencegah like ganda di level DB.

---

## 4. Migration Safety

File: `prisma/migrations/manual/2026-08-08_guru_berkarya_social.sql` (idempoten).

- `CREATE TABLE IF NOT EXISTS` untuk `ArtikelLike` + `ArtikelComment` — aman dijalankan ulang.
- `CREATE UNIQUE INDEX IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` untuk constraint + index.
- FK ditambahkan lewat `DO $$ ... IF NOT EXISTS (pg_constraint)` agar tidak error saat diulang.
- **TIDAK ada** `ALTER TABLE` pada tabel existing (`Artikel`/`Profile`/`User`), **TIDAK ada** `DROP`, **TIDAK menyentuh** `StudentKarya*`.
- **BELUM diterapkan ke produksi** — jalankan manual di Supabase SQL Editor (PRODUCTION + PREVIEW) sebelum fitur aktif.

---

## 5. API Layer

| Route | Handler | Perilaku |
|-------|---------|----------|
| `POST /api/guru/berkarya/[id]/like` | like | Idempoten: sudah disukai → `{success, liked:true, likeCount}` tanpa membuat ganda; belum → create + count. Artikel harus terbit & milik GURU/ADMIN/founder (404 jika tidak). |
| `DELETE /api/guru/berkarya/[id]/like` | unlike | Idempoten: tidak ada like → `{success, liked:false, likeCount}` tetap 200; ada → hapus like milik sendiri (`where: { id: existing.id }`) + count. |
| `GET /api/guru/berkarya/[id]/comments` | daftar | Komentar asc by `createdAt`, `isOwner` per user, `displayName` via `getDisplayName(user,"guru")`. |
| `POST /api/guru/berkarya/[id]/comments` | tulis | `commentSchema.safeParse({konten})` (min 1, max 1000, trim) → `sanitize()` → create + count. 201. |
| `DELETE /api/guru/berkarya/[id]/comments/[commentId]` | hapus | Pemilik komentar ATAU moderasi (ADMIN/founder). Komentar harus milik artikel `[id]` (400 jika tidak). 403 untuk orang lain. |

- Semua route: `getUser()` (401) + `isTeacherOrStudent` (403), mengikuti konvensi `getUser`/`requireAuth`/`requireRole`.
- Like/unlike memakai **batched `$transaction`** (bukan interactive) — pola yang sama seperti route like murid agar tidak menahan pooled connection pada Supabase pooler.
- **Tidak ada XP/koin/notifikasi** di seluruh route ini (lihat §10).

---

## 6. Counts (riil, tanpa N+1)

`GET /api/guru/berkarya` kini memakai:
- `_count: { select: { likes: true, comments: true } }` → jumlah like/komentar per artikel dalam **satu query** (tanpa query terpisah per kartu).
- Filtered relation `likes: { where: { userId }, take: 1 }` → status "sudah disukai user ini".

Kemudian di-map menjadi shape stabil untuk UI:

```ts
const data = rows.map(({ likes, _count, ...rest }) => ({
  ...rest,
  likeCount: _count.likes,
  commentCount: _count.comments,
  likedByCurrentUser: likes.length > 0,
}));
```

- Field ini **selalu ada** di respons (angka riil dari DB, tidak pernah di-fabricate/hardcode).
- UI menginisialisasi status like dari `likedByCurrentUser`/`likeCount` dan memperbaruinya dari respons server setelah aksi.

---

## 7. UI Layer

- **`components/guru/GuruBerkarya.tsx`** (dimodifikasi):
  - Footer per kartu menjadi aksi sosial: `❤️ {likeCount}` (toggle like), `💬 {commentCount}` (buka panel), dan `ShareButton` (tetap).
  - `toggleLike()` — **optimistic**: status local diperbarui dulu (setLikes sebelum fetch), lalu POST/DELETE; rollback ke nilai lama jika gagal. **Tanpa reload halaman / router.refresh.**
  - Panel komentar dirender sebagai modal saat `activeCommentsId` diset.
  - `updateCommentCount()` sinkronkan badge 💬 setelah komentar baru/hapus.
- **`components/guru/GuruBerkaryaComments.tsx`** (baru):
  - Modal ringan (drawer di mobile, centered di desktop) — `role="dialog"`, `aria-modal`.
  - **Lazy-load**: fetch komentar hanya saat panel dibuka; tanpa polling.
  - Form komentar: validasi `trim()` + `maxLength={1000}`, tombol kirim disabled saat kosong/mengirim.
  - Hapus komentar milik sendiri (tombol Hapus hanya muncul untuk `isOwner`).
  - Empty state: *"Belum ada komentar. Jadilah guru pertama yang memberi apresiasi."*
  - Typography puisi di kartu (serif) tidak diubah.

---

## 8. Social UX

- **Like instan tanpa reload**: state local diupdate segera; server mengembalikan `{liked, likeCount}` untuk rekonsiliasi.
- **Unlike** lewat tombol yang sama (icon ❤️ terisi saat liked, `aria-pressed`).
- **Komentar**: daftar lama-atas, avatar + displayName guru, waktu relatif id-ID, tombol Hapus (pemilik).
- **Empty states**: feed kosong (2.0, tetap), komentar kosong (baru), panel loading (spinner).
- **Waktu**: `waktuRelatif` (baru saja/menit/jam/kemarin/hari/tanggal) — konsisten dengan 2.0.
- **Aksesibilitas**: tombol ikon punya `aria-label`, dialog `aria-modal`, input komentar `placeholder` jelas.

---

## 9. Own Karya Regression (wajib)

- `excludeMe` **tidak pernah muncul kembali** — current user tetap melihat karyanya sendiri.
- Badge `✨ Karya Anda` tetap dirender saat `author.id === currentUserId`.
- Guru **boleh** like/komentar karyanya sendiri (tidak ada larangan baru) — konsisten dengan sistem murid.
- Tidak ada logika baru yang mengecualikan `authorId` diri.

---

## 10. XP Rule (kritis)

**TIDAK ada XP untuk like/komentar.** Verifikasi statis di suite (TEST 24–26):
- Route like/komentar **tidak memanggil** `awardXp` / `awardGuruXp` / `awardCoins` / `notifyGuruMurid` / `db.notifikasi`.
- `GURU_XP_NILAI` tidak mendapat sumber baru (`GURU_KARYA_LIKE`/`GURU_ARTIKEL_LIKE`/dst.) — hanya `GURU_ARTIKEL` & `GURU_PUISI` (kreasi).
- XP guru tetap hanya dari kreasi (engine existing); murid TIDAK terpengaruh.

---

## 11. Leaderboard

- Leaderboard guru (XP `GURU_*`) **tidak berubah** — tidak ada sumber XP baru → peringkat tidak terpengaruh.
- `lib/gamification/teacher-xp.ts` tidak dimodifikasi.
- Suit `test:guru-phase` dan `test:gamification-engine` tetap hijau membuktikan engine tidak berubah.

---

## 12. Security

- **Auth**: `getUser()` pada semua route; 401 tanpa user; 403 untuk non-guru/founder (`isTeacherOrStudent`).
- **Artikel hanya yang terbit** milik GURU/ADMIN/founder — draft/tak-terbit/artikel non-guru = 404 (bukan bocor eksistensi).
- **Komentar di-sanitize** (`sanitize` dari `lib/validations`, konvensi existing) + React merender sebagai teks (escape otomatis).
- **Length/empty guard**: `commentSchema` (min 1 setelah trim, max 1000).
- **Ownership delete**: pemilik komentar atau moderasi; 403 untuk milik orang lain (guru biasa).
- **Idempotensi like** di level aplikasi (cek existing) + level DB (`@@unique([artikelId,userId])`).
- **Tidak ada** `schoolId`/authorization berbasis sekolah; tidak ada data `correctAnswer`/`jawaban` di seluruh jalur ini.

---

## 13. Performance

- Feed: **1 query** dengan `_count` + filtered relation → tanpa N+1.
- Komentar: di-fetch **lazy** hanya saat panel dibuka (bukan eager dari feed).
- Like/unlike: batched `$transaction` (2 statement, 1 roundtrip) — pola yang menghindari `connection_limit` pooler.
- Tanpa polling (`setInterval`/`setTimeout` absen di komponen), tanpa re-fetch feed setelah aksi.
- Bounded: feed tetap `take: limit` (frontend 6, server default 8 / maks 20).

---

## 14. Share

- **Tetap IMPLEMENTED** — `ShareButton` (native `navigator.share` → fallback Salin Link / WhatsApp / Email) dipertahankan di footer.
- Share tidak ditambah/mengurangi XP apa pun.

---

## 15. Testing & QA

### Suite baru
| Suite | Asersi | Hasil |
|-------|--------|-------|
| `test:guru-berkarya-social` (BARU) | 47 | ✅ SEMUA LULUS |

Kelompok asersi: Auth 401/403 · idempotensi like (POST/DELETE) · count riil · validasi komentar (min/max/sanitize) · ownership + moderasi delete · **tanpa XP/koin** · migrasi additive-only · feed `_count` tanpa N+1 · lazy komentar · **tanpa polling/reload** · regresi 2.0 (karya sendiri, Share, urutan feed).

### Regression suites (semua tetap hijau, tanpa mengubah asersi)
| Suite | Hasil |
|-------|-------|
| `test:guru-berkarya2-social-feed` | ✅ SEMUA LULUS (37) |
| `test:guru-active-literacy` | ✅ SEMUA LULUS |
| `test:guru-engagement2-phase2` | ✅ SEMUA LULUS |
| `test:guru-phase` | ✅ SEMUA LULUS |
| `test:gamification-engine` | ✅ SEMUA LULUS |
| `test:simulation-workflow` | ✅ 65/65 |

### Gates
| Check | Hasil |
|-------|-------|
| `npx prisma validate` | ✅ Valid |
| `npx prisma generate` | ✅ Generated (v5.22.0) |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (3 API + 2 UI) | ✅ 0 errors (2 warning `<img>` — konsisten konvensi arena) |
| `npm run build` (dummy env) | ✅ exit 0, 360 routes, `prisma:error` hanya karena dummy DB tidak terjangkau (normal) |

> Catatan: tidak ada asersi test existing yang diubah/diendahkan — fase ini murni menambah; perilaku lama terbukti tetap hijau.

---

## 16. Acceptance Criteria (status tiap kriteria)

| Kriteria | Status |
|----------|--------|
| Like POST idempoten, unlike DELETE idempoten, return state+count | ✅ TEST 7–12 |
| Unlike hanya menghapus like milik sendiri | ✅ TEST 10 |
| Komentar divalidasi: trim, tolak kosong, max length, sanitize | ✅ TEST 13–16 |
| Hanya owner atau moderasi bisa hapus komentar | ✅ TEST 20–22 |
| Hapus komentar milik artikel lain → 400 | ✅ TEST 23 |
| Unauthed/non-guru ditolak di semua route | ✅ TEST 1–5 |
| Feed bawa likeCount/commentCount/likedByCurrentUser riil tanpa N+1 | ✅ TEST 32–35 |
| Komentar lazy-load, tanpa polling | ✅ TEST 39, 42 |
| Like instan tanpa full reload | ✅ TEST 38 |
| Tanpa XP untuk like/komentar; leaderboard & GURU_XP_NILAI tak berubah | ✅ TEST 24–26 |
| Migrasi additive-only, tidak menyentuh StudentKarya*/Artikel/Profile | ✅ TEST 27–31 |
| Regresi 2.0: karya sendiri tampil, Share tetap, urutan feed tetap | ✅ TEST 44–47 |
| Feed & editor tidak mengekspos correctAnswer/jawaban | ✅ TEST 47 |

---

## 17. File Scope

### Baru
| File | Isi |
|------|-----|
| `app/api/guru/berkarya/[id]/like/route.ts` | POST like + DELETE unlike (idempoten, batched tx) |
| `app/api/guru/berkarya/[id]/comments/route.ts` | GET list + POST tulis komentar |
| `app/api/guru/berkarya/[id]/comments/[commentId]/route.ts` | DELETE komentar (owner/moderasi) |
| `components/guru/GuruBerkaryaComments.tsx` | Panel komentar modal (lazy, empty state, hapus punya sendiri) |
| `scripts/test-guru-berkarya-social.ts` | 47 asersi statis |
| `prisma/migrations/manual/2026-08-08_guru_berkarya_social.sql` | Migrasi idempoten (BELUM di-apply) |
| `docs/GURU_BERKARYA_2_1_SOCIAL_INTERACTION_REPORT.md` | Ini |

### Diubah
| File | Perubahan |
|------|-----------|
| `prisma/schema.prisma` | +`ArtikelLike`, +`ArtikelComment`, relasi balik di `Artikel` & `User` |
| `app/api/guru/berkarya/route.ts` | +`_count` (likes/comments) + filtered `likes` → `likeCount`/`commentCount`/`likedByCurrentUser` |
| `components/guru/GuruBerkarya.tsx` | Footer sosial (❤️ 💬 Share), toggleLike optimistic, panel komentar |
| `package.json` | +`test:guru-berkarya-social` |

**Tidak disentuh:** XP engine, leaderboard, Rank/Badge/Mission, P1-C (`lib/school/*`), `StudentKarya*`, editor artikel, `lib/gamification/teacher-xp.ts`, file test existing.

---

## 18. No Overengineering

Sengaja TIDAK dibangun (sesuai spec): followers, sistem notifikasi, messaging, reaction selain Like, komentar threaded (`parentId`), komentar ranking, moderasi AI, social XP, recommendation engine, denormalisasi count, kolom baru di `Artikel`.

---

## STATUS

- **STATUS: COMPLETE**
- **LIKE: IMPLEMENTED** (POST/DELETE idempoten, toggle optimistic, count riil)
- **COMMENT: IMPLEMENTED** (GET/POST/DELETE, validasi + sanitize, owner/moderasi delete)
- **SHARE: TETAP IMPLEMENTED** (reuse `ShareButton`)
- **XP RULE DIPATUHI**: tidak ada XP/koin/notifikasi untuk like/komentar — XP tetap hanya dari kreasi guru
- **REGRESI 2.0 AMAN**: karya sendiri tetap tampil (`✨ Karya Anda`), Share tetap, urutan feed tetap
- **MIGRASI BELUM DI-APPLY**: jalankan `prisma/migrations/manual/2026-08-08_guru_berkarya_social.sql` di Supabase SQL Editor (PRODUCTION + PREVIEW) + `npx prisma generate` sebelum fitur aktif
- **COMMIT/PUSH/DEPLOY: TIDAK dilakukan** (menunggu instruksi)
