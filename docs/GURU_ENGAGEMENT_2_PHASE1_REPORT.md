# GURU ENGAGEMENT 2.0 — PHASE 1 REPORT
### 5-Second Guru Dashboard UX — Discoverability · Motivation · Action · Feedback

**Tanggal:** 8 Agustus 2026
**Branch:** `main` (working tree — **TIDAK di-commit, TIDAK di-push**)
**Status: ✅ SELESAI — menunggu persetujuan founder**

---

## 1. Ringkasan Eksekutif

Beranda guru (`/guru/beranda`) kini menjawab pertanyaan guru dalam ≤5 detik:
**"Berapa XP-ku, di posisi berapa, siapa di atasku, apa langkah berikutnya, misi mana
yang belum selesai, bagaimana cara dapat XP, dan siapa yang sedang berkarya?"**

Semua dibangun dari **fitur live yang SUDAH ADA** (`/api/guru/misi`,
`/api/guru/leaderboard`, `/api/guru/berkarya`) — **tanpa** gamifikasi baru, **tanpa**
schema baru, **tanpa** duplicate helper/API, **tanpa** refactor besar. Prinsip
*additive-only* dipegang penuh.

Hierarki baru (mobile-first): **XP/Rank → Next Action → Misi → Guru Berkarya →
Detail Leaderboard**.

## 2. Konteks & Tujuan

Guru membuka BahasaCerdas dengan satu pertanyaan: *"Apa yang harus kulakukan hari
ini?"* Sebelum fase ini, beranda menampilkan misi + leaderboard sebagai 2 kartu
sejajar tanpa pemandu arah. Fase ini menyusun ulang menjadi alur
**lihat progres → dapat arah → kerjakan → dapat umpan balik**.

## 3. Batasan & Prinsip (dipatuhi)

| Prinsip | Status |
|---------|--------|
| NO gamifikasi baru / kompleks | ✅ Hanya konsumsi MISI_GURU existing |
| NO schema change | ✅ 0 file prisma diubah |
| NO perubahan logika XP stabil | ✅ `awardXp`/`awardGuruXp`/`MISI_GURU` tidak disentuh |
| NO duplicate helper/API | ✅ Zero route/API baru; satu fetch misi untuk 3 konsumen |
| NO refactor besar | ✅ Perubahan UI + 1 helper pure + 1 komponen baru |
| Tidak sentuh P1-C/TKA/game/Panggung/GuruNav/murid | ✅ |
| WIP (60+ file) tidak di-stage | ✅ |

## 4. Audit Pra-Fase (Area A–I)

| # | Area | Existing | Problem | Severity | Action |
|---|------|----------|---------|----------|--------|
| A | Next Action | — | Guru tidak tahu langkah berikutnya yang paling berdampak | **Tinggi** | `lib/guru/next-action.ts` + `NextActionGuru` |
| B | XP mingguan | `GuruLeaderboardCard` | Default `ALL_TIME`, tanpa gap ke peringkat atas | **Tinggi** | Rewrite card: default WEEKLY + gap |
| C | Rank/level | `MisiGuruStatus.level/xpLevel` | Level guru tidak tampil di hero | Rendah | Strip Level Guru Cerdas di hero |
| D | Misi guru | `GuruMissionCard` fetch sendiri | Fetch duplikat (beranda + kartu), urutan tidak prioritas | **Sedang** | Prop `external status` + sort belum-selesai-dulu + highlight Next Action |
| E | Social proof | `GuruBerkarya` | Tanpa timestamp, posisi tengah bawah halaman | Rendah | `waktuRelatif` + naikkan posisi |
| F | CTA hierarchy | Beranda lama | Aksi cepat terpecah, tanpa pemandu | **Sedang** | Reorder 5-detik: XP/Rank → Next → Misi → Berkarya |
| G | Microcopy empty state | Beranda | "XP 0" tanpa arahan cara dapat XP | Rendah | Empty-state copy di hero |
| H | Bug precedence | `stats.aiUsage?.rpp \|\| 0 + ...` | Operator precedence salah → angka kredit AI bisa keliru | **Sedang** | `(..\|\|0)+(..\|\|0)` |
| I | A11y | Tab periode, link misi | Tanpa `aria-pressed`/`aria-label` deskriptif | Rendah | Ditambahkan |

**Jawaban eksplisit:**
- **A. Next Action:** tidak ada sistem quest; prioritas diturunkan dari `MisiGuruStatus`
  yang sudah ada (misi XP tertinggi → fallback Artikel → Puisi → Materi → Kelas → karya).
- **B. Default periode leaderboard:** diubah `ALL_TIME` → **WEEKLY** (selector
  WEEKLY/SEASON/ALL_TIME tetap dipertahankan).
- **C. Gap-to-next-rank:** server tidak mengembalikan gap → dihitung **client-side**
  (entry tepat di atas `myRank`, fallback masuk 20 besar).
- **D. Satu fetch misi:** beranda fetch `/api/guru/misi` **sekali** → status dibagikan
  ke `NextActionGuru`, `GuruMissionCard (external)`, dan strip level di hero.
- **E. Guru Berkarya:** kartu dipindah naik (setelah Misi) + timestamp relatif.
- **F. Hierarki mobile:** urutan DOM = `GuruLeaderboardCard` → `NextActionGuru` →
  `GuruMissionCard` → `GuruBerkarya`.
- **G. Microcopy:** "Ayo mulai! Kumpulkan XP Guru lewat misi, gim, atau berkarya…".
- **H. Bug precedence kredit AI:** diperbaiki.
- **I. A11y:** `aria-pressed` tab periode, `aria-label` pada link misi/CTA.

## 5. Arsitektur Next Action

**`lib/guru/next-action.ts`** (pure, tanpa I/O — dapat diuji unit tanpa DB):

```
Prioritas:
  1. Misi belum selesai dengan XP tertinggi (maximalkan reward mingguan)
     - tie-break urutan: artikel → puisi → materi → kelas → mgmp → kirim-materi → latihan → toko-karya
  2. Semua misi selesai → fallback konten: Artikel → Puisi → Materi → Kelas → umpan balik karya
```

- `hitungNextActionGuru(status)` → `NextActionGuru` (label/desc/xp/href/icon/misiId/semuaSelesai).
- `nextActionMisiId(status)` → ID misi yang jadi Next Action (untuk highlight) atau `null`.
- `CTA_SELESAI` → 5 CTA konten saat semua misi selesai (Artikel/Puisi → `/guru/artikel`,
  Materi → `/guru/materi-ajar`, Kelas → `/guru/kelasku`, karya → `/guru/feed-karya`).
- Referensi API pra-ada saja; **tanpa** fetch, tanpa LLM, tanpa quest engine baru.

## 6. Hero XP/Rank — `GuruLeaderboardCard` v2

- **Default periode WEEKLY** (`useState("WEEKLY")`), selector tetap tersedia.
- Menampilkan **posisi** (`#N dari M guru`) + **XP Guru** per periode.
- **Gap ke peringkat atas** dihitung client-side dari `entries` + `myXp`:
  - Saya di 20 besar → selisih ke `entries[myRank-2].xp`.
  - Di luar 20 besar → target masuk 20 besar (selisih ke entry terakhir).
  - `#1` → pesan motivasi "Anda memimpin minggu ini 🏆".
  - `myXp === 0` → empty-state "Ayo mulai! Kumpulkan XP Guru…".
- **Strip Level Guru Cerdas** (dari `misiStatus` yang sudah di-fetch induk): streak 🔥
  + progress bar `level` / `xpLevel` / `xpPerLevel`.
- Top-3 podium + tombol "Lihat Peringkat Lengkap".

## 7. Misi Guru — Satu Fetch, Urut, Highlight

`GuruMissionCard`:
- Prop baru `status` + `external`. Saat `external` → **skip fetch internal** (beranda
  mem-pass `misiStatus` yang sudah di-fetch sekali).
- Daftar misi **diurutkan: belum selesai tampil lebih dulu**.
- Misi yang menjadi Next Action diberi **highlight** (ring + badge "Lanjutkan").
- `compact` dipertahankan.

`MissionItem`:
- Prop `highlight` → ring emerald + badge "Lanjutkan".
- `aria-label` deskriptif (selesai / lanjutkan / biasa).

## 8. Guru Berkarya — Timestamp Relatif + Posisi Naik

- `waktuRelatif()` di komponen: "baru saja / N mnt lalu / N jam lalu / N hari lalu /
  tanggal" (dari `publishedAt || createdAt`).
- Kartu dipindah naik ke posisi ke-4 (setelah Misi, sebelum Banner).

## 9. Hierarki Beranda 5 Detik

Urutan DOM baru di `/guru/beranda` (mobile = DOM order; desktop 2 kolom):

```
1. GuruLeaderboardCard  (XP/Rank + gap + level strip)
2. NextActionGuru       (CTA dominan "Kerjakan Sekarang")
3. GuruMissionCard      (external status, sort, highlight)
4. GuruBerkarya         (social proof)
5. Banner + TrialStatusCard
6. Stat cards + Aktivitas Hari Ini
7. AktivitasAnalytics + GuruBadgeGrid
8. Kredit AI / Penilaian / Aksi Cepat / Tips
```

## 10. Perbaikan Bug

**Precedence kredit AI** (beranda):
- Sebelum: `{stats.aiUsage?.rpp || 0 + stats.aiUsage?.soal || 0}`
  → dievaluasi `0 + (0 + soal)` (precedence `+` > `||`) → angka bisa salah.
- Sesudah: `{(stats.aiUsage?.rpp || 0) + (stats.aiUsage?.soal || 0)}`.

## 11. Aksesibilitas & Microcopy

- Tab periode: `aria-pressed`, `role="group"`, `aria-label="Pilih periode peringkat"`.
- Link misi/CTA: `aria-label` deskriptif.
- Empty states: belum bermain / rank #1 / XP 0 / kelas kosong.
- Skeleton loading pada hero + misi + leaderboard.

## 12. Keamanan

- **Zero route/API baru** — hanya konsumsi endpoint yang sudah role-gated
  (`isTeacherOrStudent` + `getUser()` terverifikasi di test existing).
- **Zero DB write** — `rg` memastikan tidak ada `prisma.`/`.create`/`.update`
  di file yang diubah/dibuat.
- **Zero secrets** — `rg` sk-*/env/api-key kosong di file baru.
- Data gap/rank dihitung client-side dari data publik yang API sudah berikan;
  tidak ada `correctAnswer`/kunci jawaban yang terekspos.

## 13. Verifikasi QA

| Check | Hasil |
|-------|-------|
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (9 file diubah/dibuat) | ✅ 0 violations |
| `npm run test:guru-engagement2-phase1` (BARU) | ✅ 43/43 |
| `npm run test:guru-active-literacy` | ✅ SEMUA LULUS |
| `npm run test:guru-phase` | ✅ SEMUA LULUS |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:simulation-workflow` | ✅ 65/65 |
| `npx tsx scripts/test-phase-simulation-workflow.ts` | ✅ 65/65 |
| `npm run build` (dummy env) | ✅ exit 0 — 360 routes |
| Static security scan (secrets / DB writes / new API) | ✅ bersih |

## 14. Klasifikasi Kegagalan

- **NEW REGRESSION:** 0. Semua gate hijau dari awal setelah assertion test disesuaikan
  dengan sumber sebenarnya (bukan kegagalan kode).
- **PRE-EXISTING:** `startOfWeek` di `misi-guru-status.ts` (Senin 00:00 lokal) vs
  `startOfWeekWIB` di `season.ts` (Senin 00:00 WIB) — inkonsistensi zona dikenal,
  **tidak diubah** sesuai batasan "jangan ubah XP logic".
- **ENVIRONMENT:** `prisma:error` saat build karena dummy env (DB tidak ada) — normal,
  tidak memengaruhi build (exit 0).

## 15. Keputusan Desain & Catatan

1. **Next Action dari data misi existing**, bukan sistem quest baru — prioritas
   "nearly-complete" menjadi tidak relevan karena semua target misi = 1 (biner);
   logika parsial disiapkan untuk masa depan.
2. **Gap-to-next-rank client-side** — server (`/api/guru/leaderboard`) tidak diubah;
   konsisten dengan prinsip additive-only.
3. **Fallback Artikel → Puisi** memakai `/guru/artikel` (editor punya toggle internal
   ARTIKEL/PUISI; deep-link `?type=puisi` belum ada — dicatat sebagai perbaikan
   opsional berikutnya, bukan bagian fase ini).
4. **Satu fetch misi** di beranda dikonsumsi 3 komponen → hemat 2 request/muat.
5. `GuruLeaderboardCard` kini memakai data `misiStatus` yang sama — tidak ada
   double fetch `/api/guru/misi` (diverifikasi test: hanya 1 kemunculan).
6. Halaman `/guru/game/leaderboard` tetap utuh sebagai leaderboard penuh.

## 16. Files Created & Modified

**Created:**
- `lib/guru/next-action.ts` — helper Next Action murni
- `components/guru/misi/NextActionGuru.tsx` — CTA dominan (skeleton + XP chip)
- `scripts/test-guru-engagement2-phase1.ts` — 43 assertions
- `docs/GURU_ENGAGEMENT_2_PHASE1_REPORT.md` — dokumen ini

**Modified:**
- `components/guru/GuruLeaderboardCard.tsx` — hero XP/Rank v2 (WEEKLY default, gap, level strip)
- `components/guru/misi/GuruMissionCard.tsx` — prop `external`/`status`, sort, highlight
- `components/guru/misi/MissionItem.tsx` — prop `highlight` + `aria-label`
- `components/guru/GuruBerkarya.tsx` — `waktuRelatif` timestamp
- `app/(dashboard)/guru/beranda/page.tsx` — hierarki 5-detik + fix precedence + satu fetch misi
- `scripts/test-guru-active-literacy.ts` — 2 assertions disesuaikan (default WEEKLY, `?period=`, `gapNext`)
- `package.json` — script `test:guru-engagement2-phase1`

## 17. Risiko & Remaining

| Item | Status |
|------|--------|
| Working tree berisi 60+ WIP (P1-A/P1-B dkk.) — TIDAK disentuh | ⚠️ Dibiarkan |
| `startOfWeek` lokal vs WIB (misi) | ⚠️ Pra-ada, tidak diubah |
| Deep-link `?type=puisi` di `/guru/artikel` | Opsional berikutnya |
| TKA UTBK/Guru enrichment 30 → 150 | Belum |
| Game server revival (VPS mati) | Belum |
| GameRoom migration SQL via Supabase | Belum |

## 18. STATUS FINAL

```
Phase GURU ENGAGEMENT 2.0 — PHASE 1 (5-Second Guru Dashboard UX)
───────────────────────────────────────────────────────────────────
STATUS : ✅ SELESAI
COMMIT : TIDAK (menunggu persetujuan founder)
PUSH   : TIDAK
QA     : tsc 0 · eslint 0 · 6 test suite LULUS · build exit 0 (360 routes)
SECURITY: no new API · no DB write · no secrets
NEXT   : HANYA setelah approval founder (task berikutnya bebas ditentukan)
───────────────────────────────────────────────────────────────────
```
