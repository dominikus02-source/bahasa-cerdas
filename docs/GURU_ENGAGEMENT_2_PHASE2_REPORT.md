# GURU ENGAGEMENT 2.0 — PHASE 2 REPORT
### Real-time / Latest Guru Works & Social Motivation — Feed "Guru Berkarya" sebagai aktivitas literasi sosial

## 1. Ringkasan Eksekutif
Phase 2 mengubah section "Guru Berkarya" di `/guru/beranda` dari katalog karya statis menjadi **lingkaran aktivitas literasi sosial**: guru melihat karya paling baru dari guru lain (urutan `publishedAt DESC`), merasa "guru lain sedang bergerak", dan mendapat ajakan menulis Artikel/Puisi sendiri → XP literasi → ranking guru.

**Yang diubah:**
1. **`components/guru/GuruBerkarya.tsx`** — UI live-activity: judul "🔥 Guru Berkarya", subtitle "Guru lain sedang berkarya. Giliran Anda?", badge **🔥 BARU** untuk karya ≤24 jam, timestamp relatif versi lengkap (`baru saja / N menit lalu / N jam lalu / kemarin / N hari lalu / tanggal`), kartu kompak, empty state, dan **CTA motivasional** dengan microcopy berdasar `misiStatus` + tombol **Buat Artikel** / **Buat Puisi** (chip `+50 XP` riil dari `GURU_XP_NILAI`).
2. **`app/(dashboard)/guru/artikel/page.tsx`** — dukungan deep-link `?type=puisi` agar CTA Puisi langsung memilih tab Puisi di editor (tanpa klik manual).
3. **`app/(dashboard)/guru/beranda/page.tsx`** — `misiStatus` (yang sudah di-fetch untuk Misi/Next Action) di-passing ke `GuruBerkarya` → **nol fetch tambahan**.
4. **`scripts/test-guru-engagement2-phase2.ts`** (baru, 31 tes) + script npm `test:guru-engagement2-phase2`.

**Sorting `publishedAt DESC` dan filter `isPublished: true` sudah benar sejak awal di `/api/guru/berkarya` — Phase 2 tidak mengubah API (diverifikasi via tes), fokus pada UI + motivasi + wiring.**

## 2. Konteks & Tujuan
- Guru membuka BahasaCerdas untuk **melihat progress diri + kelas** dan **terinspirasi berkarya** (Artikel/Puisi) yang menambah XP literasi & peringkat guru.
- Phase 1 (commit `fef1d13`) membangun hierarki beranda 5 detik (XP/Rank → Next Action → Misi → Guru Berkarya) dan timestamp relatif dasar.
- Phase 2 melengkapi lapisan **sosial-motivasional**: feed "live" yang menunjukkan guru lain sedang berkarya sekarang.

## 3. Batasan & Prinsip (dipatuhi)
- **Reuse existing infra saja**: `GuruBerkarya`, `/api/guru/berkarya`, Artikel, Puisi, `publishedAt`, author, XP literasi. **TIDAK ada** tabel/feed-engine/social-network/follow/chat baru.
- **Tidak menyentuh XP engine** (`lib/gamification/teacher-xp.ts`), **Leaderboard engine** (`/api/guru/leaderboard`, `GuruLeaderboardCard`), **P1-C School Identity**, dan fitur murid.
- **Satu fetch karya + satu fetch misi** (keduanya sudah ada) — tidak ada fetch baru, tidak ada polling.
- **Tidak menampilkan timestamp palsu**: fallback hanya ke `createdAt` (data nyata), tidak pernah mengarang.
- **No commit / no push** untuk Phase 2 (berbeda dari Phase 1).

## 4. Audit Pra-Fase (Phase 0) — Temuan
| # | Pertanyaan | Hasil |
|---|-----------|-------|
| Q1 | API feed sudah `publishedAt DESC`? | ✅ Ya — `orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }]` |
| Q2 | Draft tersaring? | ✅ Ya — `isPublished: true` + author `role GURU/ADMIN` atau `isFounder` |
| Q3 | Artikel terbit tampil? | ✅ Ya — via tabel `Artikel` |
| Q4 | Puisi terbit tampil? | ✅ Ya — `articleType === "PUISI"` (badge "Puisi") |
| Q5 | Penulis tersedia? | ✅ Ya — `author{id, fullName, avatar, profile{school}}` |
| Q6 | Karya sendiri dikecualikan? | ✅ Ya — `excludeMe` default 1 (`authorId: { not: user.id }`) |
| Q7 | Ada limit/paginasi? | ✅ Ya — `take: limit` (default 8, maks 20) |
| Q8 | N+1? | ✅ Tidak — satu query dengan `select` |

**Bug laten ditemukan & diperbaiki**: `GuruBerkarya` lama mengecek `(a.articleType || "").toUpperCase() === "POETRY"` padahal nilai API adalah `"PUISI"` → badge/ikon puisi tidak pernah tampil. Diperbaiki menjadi `"PUISI"`.

## 5. Arsitektur Feed "Live" Guru Berkarya
```
/guru/beranda (server, 1 fetch /api/guru/misi)
  └─ <GuruBerkarya misiStatus={misiStatus} />   (client, 1 fetch /api/guru/berkarya?limit=6)
        ├─ Header: 🔥 Guru Berkarya · "Guru lain sedang berkarya. Giliran Anda?"
        ├─ Grid karya terbaru (publishedAt DESC dari server)
        │    └─ badge BARU (≤24 jam) + jenis (Puisi/Artikel) + waktu relatif + penulis + sekolah + views
        ├─ Empty state (belum ada karya): ajakan jadi guru pertama + CTA Artikel/Puisi
        └─ CTA footer: microcopy berdasarkan misi artikel (selesai/belum) + tombol Buat Artikel/Puisi (+50 XP)
```

## 6. Latest Works — Urutan & Filter
- Tidak ada perubahan API: `/api/guru/berkarya` sudah `publishedAt DESC`, `isPublished: true`, author guru, `excludeMe` default, `take: limit`.
- Tes memastikan urutan & filter tetap: `test:guru-engagement2-phase2` (tes #1–2).

## 7. Indikator BARU & Timestamp Relatif
- `adalahBaru(iso)` → `Date.now() - t < 24*60*60*1000` → badge **🔥 BARU** (oranye, lucide `Flame`).
- `waktuRelatif(iso)` versi lengkap:
  - <60 detik → `baru saja`
  - <60 menit → `N menit lalu`
  - <24 jam → `N jam lalu`
  - 24–47 jam → `kemarin`
  - 2–6 hari → `N hari lalu`
  - ≥7 hari → `tanggal` (`Intl.DateTimeFormat id-ID`)
- Call site tetap `waktuRelatif(a.publishedAt || a.createdAt)` (kompatibel tes Phase 1; `createdAt` hanya fallback data nyata).

## 8. Motivational CTA (social loop)
- Menerima `misiStatus` dari beranda (fetch `/api/guru/misi` yang sudah ada) → membaca misi `id: "artikel"`:
  - **Belum selesai** → "Belum berkarya minggu ini? Yuk buat satu." + subcopy "Misi mingguan Artikel/Puisi memberi +50 XP untuk karya pertama Anda."
  - **Selesai** → "Karya Anda sudah ikut menginspirasi guru lain. 🔥" + subcopy "Tulis satu lagi supaya misi mingguan & XP Anda terus naik."
- Tombol: **Buat Artikel** → `/guru/artikel` · **Buat Puisi** → `/guru/artikel?type=puisi` · masing-masing chip `+50 XP` (nilai riil `GURU_XP_NILAI.GURU_ARTIKEL` / `GURU_XP_NILAI.GURU_PUISI`).
- **Tanpa angka diarang**: CTA tidak mengarang `#N` ranking — hanya berdasar `misiStatus` (data nyata).

## 9. Personal Competition — Ringan & Non-intrusif
- Sesuai batasan, tidak ada query leaderboard baru di `GuruBerkarya`. Posisi mingguan guru sudah tampil di `GuruLeaderboardCard` (`GuruLeaderboardCard` default WEEKLY, `#myRank`, XP per periode) di atas section ini — hierarki beranda Phase 1 tetap.
- Microcopy CTA mengarahkan pengguna ke tindakan menambah XP (misi Artikel/Puisi), yang secara alami menaikkan posisi mingguan.

## 10. Empty State
- Saat `items.length === 0` (setelah load selesai): kartu dashed berisi **"Belum ada karya terbaru."** + **"Jadilah guru pertama yang berkarya hari ini."** + tombol Buat Artikel / Buat Puisi.
- Tidak ada empty state global palsu saat hanya ada Puisi — grid menampilkan apa pun yang ada (guard parsial).
- Skeleton tetap tampil saat fetch belum selesai (tidak flash empty).

## 11. Work Types — Artikel & Puisi
- Keduanya lewat tabel `Artikel` (`articleType`): `ARTIKEL` → badge sky "Artikel" + ikon `BookOpen`; `PUISI` → badge purple "Puisi" + ikon `Feather`.
- Perbaikan bug `POETRY` → `PUISI` (bagian 4) membuat tipe Puisi benar-benar tampil.

## 12. Performance
- **Total request beranda tetap sama**: 1× `/api/guru/misi` (server) + 1× `/api/guru/berkarya?limit=6` (client). `misiStatus` di-passing, bukan di-fetch ulang.
- **Tanpa polling**: tidak ada `setInterval`/`setTimeout`/`refetch` di `GuruBerkarya` (dijamin tes).
- `take: limit` (6) membatasi payload; satu query `select` tanpa N+1.

## 13. Keamanan
- `GuruBerkarya` hanya konsumsi API yang role-gated (`getUser()` + `isTeacherOrStudent`, 403 bila bukan guru/founder).
- Feed hanya menampilkan karya **terbit** dari penulis **GURU/ADMIN/founder**, karya sendiri dikecualikan default.
- Tidak ada endpoint/secret baru; tidak ada data jawaban/rahasia yang bocor.
- Deep-link `?type=puisi` hanya memilih tab di editor; validasi jenis tetap di server pada save.

## 14. Aksesibilitas & Mobile
- Mobile-first: grid 1 kolom di `sm` ke bawah, 2 kolom di `sm+`; tombol "Lihat Semua Karya" versi full-width khusus mobile di bawah grid.
- Link karya: `target="_blank"` + kontras badge konsisten; tombol CTA cukup besar untuk sentuhan.
- Empty state & CTA terpusat (text-center), readable di semua layar.

## 15. Verifikasi QA
| Check | Hasil |
|-------|-------|
| `npm run test:guru-engagement2-phase2` (BARU) | ✅ 31/31 |
| `npm run test:guru-engagement2-phase1` (regresi) | ✅ SEMUA TES LULUS |
| `npm run test:guru-active-literacy` (regresi) | ✅ SEMUA TES LULUS |
| `npm run test:guru-phase` | ✅ SEMUA LULUS |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:simulation-workflow` | ✅ All tests passed |
| `npx tsx scripts/test-phase-simulation-workflow.ts` | ✅ All tests passed |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (GuruBerkarya, beranda, artikel, test) | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ exit 0 (360 routes) |

## 16. Klasifikasi Kegagalan
Tidak ada kegagalan yang baru diperkenalkan. Semua gate lulus tanpa regresi.
- `prisma:error` saat build lokal adalah **environment** (dummy DB tanpa koneksi saat data collection) — sudah didokumentasikan di AGENTS.md, build tetap exit 0.

## 17. Keputusan Desain & Catatan
1. **Badge "🔥 BARU"** dipilih sebagai indikator "live" (bukan animasi/polling) agar hemat request dan tetap terasa real-time.
2. **Timestamp relatif lengkap** (`kemarin`, `N hari lalu`) memperkuat kesan aktivitas nyata tanpa membebani server.
3. **Microcopy memakai `misiStatus` nyata** — tidak ada klaim "Anda #N" yang diarang; pesan menyesuaikan status misi Artikel/Puisi yang sesungguhnya.
4. **Fix bug `POETRY`→`PUISI`** diperbolehkan karena merupakan koreksi rendering (nilai API memang `PUISI`), bukan perubahan API.
5. **Deep-link `?type=puisi`** additive: tanpa query, perilaku editor identik (default Artikel); dengan query, tab Puisi terpilih.
6. CTA artikel & puisi menuju `/guru/artikel` yang sama — konsisten dengan `CTA_SELESAI` Phase 1.

## 18. Files Created & Modified
| File | Aksi |
|------|------|
| `components/guru/GuruBerkarya.tsx` | **Diubah** — UI live-activity, badge BARU, waktu relatif lengkap, empty state, CTA motivasional, prop `misiStatus`, fix `POETRY`→`PUISI` |
| `app/(dashboard)/guru/artikel/page.tsx` | **Diubah** — deep-link `?type=puisi` (useEffect + URLSearchParams) |
| `app/(dashboard)/guru/beranda/page.tsx` | **Diubah** — `<GuruBerkarya misiStatus={misiStatus} />` |
| `scripts/test-guru-engagement2-phase2.ts` | **Baru** — 31 tes statis |
| `package.json` | **Diubah** — script `test:guru-engagement2-phase2` |
| `docs/GURU_ENGAGEMENT_2_PHASE2_REPORT.md` | **Baru** — dokumen ini |

## 19. Risiko & Remaining
1. Feed menampilkan hingga 6–8 karya terbaru (bukan stream tak terbatas) — disengaja agar ringan; "Lihat Semua Karya" → `/guru/artikel`.
2. Indikator BARU dihitung client-side dari `publishedAt` — tidak ada sinkronisasi server (tidak perlu; status relatif waktu berubah alami).
3. Pekerjaan P1-A/P1-B (60+ file WIP) tidak disentuh; **Phase 2 TIDAK di-commit / di-push**.
4. Remaining global tidak berubah: TKA UTBK/Guru enrichment 30→150, game server revival, GameRoom migration, badge-score kosmetik.

---

## STATUS FINAL

```
LATEST WORKS (publishedAt DESC)      ✅ PASS (sudah benar, diverifikasi tes)
ARTICLE PUBLISHED                    ✅ PASS
POETRY PUBLISHED                     ✅ PASS (+fix POETRY→PUISI)
PUBLISHED FILTER (isPublished)       ✅ PASS
NEW INDICATOR (🔥 BARU ≤24 jam)       ✅ PASS
RELATIVE TIMESTAMP                   ✅ PASS (baru saja/menit/jam/kemarin/hari)
MOTIVATIONAL CTA (misiStatus-based)  ✅ PASS (Artikel/Puisi +50 XP riil)
XP INTEGRATION                       ✅ PASS (GURU_ARTIKEL/PUISI 50, engine tak diubah)
RANK INTEGRATION (ringan, non-darat) ✅ PASS (LeaderboardCard WEEKLY tetap)
MOBILE                               ✅ PASS (grid responsif, tombol full-width)
PERFORMANCE                          ✅ PASS (0 fetch tambahan, tanpa polling)
SECURITY                             ✅ PASS (role-gated, published-only, tanpa secret baru)

TESTS        test:guru-engagement2-phase2 31/31 · phase1 pass · active-literacy pass
             guru-phase pass · gamification-engine pass · simulation-workflow pass
BUILD        exit 0 · 360 routes (dummy env)
FILES CHANGED  GuruBerkarya.tsx · artikel/page.tsx · beranda/page.tsx ·
               test-guru-engagement2-phase2.ts (baru) · package.json ·
               GURU_ENGAGEMENT_2_PHASE2_REPORT.md (baru)
STATUS       COMPLETE — no commit, no push, no next phase, P1-C untouched
```
