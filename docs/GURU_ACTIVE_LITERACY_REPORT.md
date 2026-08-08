# GURU ACTIVE & LITERACY COMPETITION — Report

> Fase: Misi Guru yang Bisa Dikerjakan, Kompetisi Guru, XP Literasi Pertama Kali Terbit, Feed Guru Berkarya
> Tanggal: 8 Agustus 2026
> Mode: ADDITIVE ONLY (engine gamifikasi/XP tidak diubah, hanya dikonsumsi) — TIDAK ada commit/push (menunggu persetujuan founder)

## Tujuan
Menjadikan Dasbor Guru sebagai "alasan membuka BahasaCerdas setiap hari":
1. Kartu misi guru tidak memotong teks label/deskripsi (line-clamp, bukan truncate).
2. Peringkat Guru mendukung 3 periode (Semua Waktu / Minggu Ini / Season WIB).
3. Kartu posisi "Kompetisi Guru" di beranda (posisi, XP mingguan, top-3, gap).
4. Feed "Guru Berkarya" (Artikel + Puisi) di beranda.
5. Menerbitkan Artikel/Puisi/Materi/Membuat Kelas → XP Guru + aktivitas learning-loop + notifikasi → misi selesai, bukan angka dekoratif.

## Perubahan

### 1. Misi (UI) — MissionItem
| File | Perubahan |
|------|-----------|
| `components/guru/misi/MissionItem.tsx` | `truncate` → `line-clamp-2` + `leading-snug` pada label & deskripsi; chip XP `whitespace-nowrap` (tidak terpotong di layar sempit) |

### 2. Peringkat Guru Multi-Periode
| File | Perubahan |
|------|-----------|
| `lib/gamification/teacher-xp.ts` | `TeacherLeaderboardPeriod = "ALL_TIME" \| "WEEKLY" \| "SEASON"`, `seasonStartWIB()`, `getTeacherLeaderboard({ period })` — filter `where.createdAt` dari `startOfWeekWIB`/`seasonStartWIB`; kembalikan `myXp` + `participants` |
| `app/api/guru/leaderboard/route.ts` | `?period=` (validasi enum, default `ALL_TIME` — backward compatible) |
| `app/(dashboard)/guru/game/leaderboard/page.tsx` | Tab periode (Semua Waktu / Minggu Ini / Season) → `load(period)`; empty state menyebut semua sumber XP |

### 3. Kartu Kompetisi Guru
| File | Perubahan |
|------|-----------|
| `components/guru/GuruLeaderboardCard.tsx` | BARU — fetch `/api/guru/leaderboard?period=WEEKLY`, posisi `#rank` dari `participants` guru, XP mingguan, top-3 (medal), gap ke 3 besar ("Butuh N XP lagi untuk masuk 3 besar"), link ke halaman peringkat |

### 4. Feed Guru Berkarya
| File | Perubahan |
|------|-----------|
| `app/api/guru/berkarya/route.ts` | BARU — GET feed karya terbit (role GURU/ADMIN/founder, `excludeMe` default, limit max 20, artikelType/publishedAt/cover/readCount/school) |
| `components/guru/GuruBerkarya.tsx` | BARU — grid kartu Artikel/Puisi (badge jenis, SafeMediaImage, ringkasan, sekolah) |

### 5. XP Literasi (pertama kali terbit — anti-spam)
| File | Perubahan |
|------|-----------|
| `lib/guru/literasi-xp.ts` | BARU — `awardGuruLiterasiPublish`: `awardGuruXp` + `recordActivity` (ARTICLE, skill WRITING) + `notifyGuruMurid` (TEACHER_WORK_PUBLISHED); batas panjang konten (ARTIKEL ≥40, PUISI ≥20); idempoten via reference `artikel-publish-<id>`/`puisi-publish-<id>` |
| `lib/gamification/teacher-xp.ts` | `GURU_XP_SOURCES` 7 → **11** (tambah `GURU_ARTIKEL: 50`, `GURU_PUISI: 50`, `GURU_MATERI: 40`, `GURU_KELAS: 20`) |
| `app/api/guru/artikel/route.ts` | `articleType` (ARTIKEL/PUISI), `publishedAt` saat terbit, `authorName`/`authorRole`; XP hanya pada transisi draft→terbit (guard `existing.isPublished !== true` — edit/republish tanpa XP ulang); GET expose `articleType`/`publishedAt` |
| `app/(dashboard)/guru/artikel/page.tsx` | Toggle Artikel/Puisi, badge jenis di daftar, empty-state baru |
| `app/api/guru/materi/route.ts` | XP `GURU_MATERI` saat `isPublished` (reference `materi-publish-<id>`) |
| `app/api/group/route.ts` | XP `GURU_KELAS` saat buat kelas (reference `kelas-create-<id>`) |

### 6. Integrasi Dashboard
| File | Perubahan |
|------|-----------|
| `app/(dashboard)/guru/beranda/page.tsx` | Layout: baris atas = `GuruMissionCard (compact)` + `GuruLeaderboardCard`; `BannerProgramGuruCerdas` full-width di bawah; `GuruBerkarya` setelah "Aktivitas Hari Ini"; grid `AktivitasAnalytics` + `GuruBadgeGrid` di bawah |

### 7. Tests
| File | Perubahan |
|------|-----------|
| `scripts/test-guru-active-literacy.ts` | BARU — 57 asersi statis (sumber XP, nilai XP selaras misi, leaderboard periode, MissionItem tanpa truncate, kartu posisi, feed berkarya, wiring literasi, anti-spam, materi/kelas, integrasi beranda, otorisasi) |
| `scripts/test-guru-phase.ts` | Koreksi asersi jumlah sumber 7 → 11 (ikut perubahan engine) |
| `package.json` | `test:guru-active-literacy` |

## Verifikasi
| Check | Hasil |
|-------|-------|
| `npm run test:guru-active-literacy` | ✅ 57/57 |
| `npm run test:guru-phase` | ✅ SEMUA LULUS |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS (regresi engine tidak berubah) |
| `npm run test:simulation-workflow` | ✅ All passed |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (15 file) | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ 360 routes (naik dari 359), exit 0 |

## Prinsip yang Dipertahankan
- **XP guru TETAP lewat `awardXp`/`awardGuruXp`** — engine gamifikasi Phase 1–2 TIDAK dimodifikasi, hanya dikonsumsi. Tidak ada `addXp` baru.
- **Idempotensi**: reference unik per karya/materi/kelas → retry/double-submit tidak menggandakan XP.
- **Anti-spam**: XP hanya pada terbit pertama, panjang konten minimal, guru tidak bisa "menerbitkan ulang" untuk farming.
- **Best-effort wiring** (`.catch(() => {})`) — kegagalan logging/XP tidak menggagalkan aksi utama (terbit artikel, buat kelas).
- **Tanpa migrasi schema** — puisi = `Artikel.articleType: "POETRY"`; `ActivityType.ARTICLE` sudah ada.
- **Bahasa Indonesia** penuh pada semua label baru.

## Remaining (di luar scope fase ini)
1. TKA UTBK/Guru enrichment 30 → 150
2. Game server revival (VPS mati)
3. GameRoom migration SQL via Supabase dashboard
4. UI game solo: badge-score client vs server masih beda (kosmetik)
5. **Approval founder** untuk commit/push fase ini (laporan di docs/GURU_ACTIVE_LITERACY_REPORT.md)
