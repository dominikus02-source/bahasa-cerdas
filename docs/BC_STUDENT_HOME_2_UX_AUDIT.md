# BC STUDENT HOME 2.0 — FINAL PRODUCT & UX AUDIT

> Status: AUDIT ONLY — tidak ada file yang dimodifikasi, tidak ada commit/push
> Sumber inspeksi: 8 komponen `components/student-home/`, `app/(dashboard)/murid/beranda/page.tsx`,
> pembanding: `app/arena/page.tsx`, `app/arena/player/player-dashboard.tsx`, `app/(dashboard)/murid/profile/page.tsx`,
> `app/arena/feed/page.tsx`, `components/dashboard/MuridMobileNav.tsx`

---

## 1. EXECUTIVE VERDICT

**NEEDS REVISION (UX simplification pass) sebelum commit.**

Arsitektur dasarnya sudah benar arah (dark premium scoped, hero → learning context, reuse API
existing, heartbeat dipertahankan, tanpa mock/schema change — semua layak dipertahankan).
Tapi halaman sekarang **over-load**: ±30+ target klik dan ±9 statistik, dan **ArenaHomeSection
membawa hampir seluruh UI Arena ke Home** (bertentangan dengan AUDIT 5), **QuickActions 100%
duplikat link section lain** (AUDIT 9), dan **AI BC berada di bawah fold di mobile** padahal
prioritas strategis #1 (AUDIT 3). Perbaikan yang dibutuhkan dominan **pengurangan**, bukan
penambahan — risiko rendah, satu putaran polish.

**Verdict per section (detail di §3):**
| Section | Verdict |
|---|---|
| StudentHomeHero | A KEEP (trim kartu Pencapaian) |
| ContinueLearningCard | A KEEP (trim ghost secondary) |
| AIBCHomeCard | G NEEDS REDESIGN (posisi + copy + affordance chat) |
| LearningJourneySection | A KEEP (label "Latihan" → "Berlatih"; samakan route tugas) |
| ArenaHomeSection | C MOVE TO ARENA (+B SIMPLIFY jadi gateway) |
| RecentWorksSection | A KEEP (CTA utama sebaiknya "Tulis Karya") |
| QuickActions | F REMOVE (100% duplikat) |
| SecondaryLearningInfo | B SIMPLIFY (kompres, hapus tombol dobel) |
| Page shell (theme/heartbeat/grid) | A KEEP |

---

## 2. CURRENT INFORMATION HIERARCHY (sebagaimana diimplementasi)

```
1. Hero            — identitas + RankChip + 3 chip (streak/koin/XP minggu) + XP bar
                     + kartu "Pencapaian" (lencana/a.pencapaian) + CTA "Lihat Profil"
2. ContinueLearning — nextAction + ghost "Jelajahi Jalur Cerdas" + "Hari ini: N aktivitas"
3. AI BC            — CTA "Tanya AI BC" + 4 chip topik
4. Journey          — 4 kartu (Jalur Cerdas/Latihan/Simulasi/Tugas) + aktivitas terakhir
5. Arena            — CTA "Masuk Arena" + 4 stat tile + 3 misi (progress bar) + 4 lencana
                     + 3 tombol (Kuis Tempur/Liga/Misi & Peringkat) + link "Lihat semua misi"
6. Karya            — 4 karya + CTA "Semua Karya"
7. QuickActions     — 6 kartu tautan
8. Kabar Kelas      — pengumuman 3 + materi 3 + avatar murid aktif 6 + CTA "Tugas Saya" + catatan tugas
```

**Jawaban 5-detik:**
1. Siapa saya? ✅ hero (nama + rank)
2. Apa yang sedang saya kerjakan? ⚠️ Continue card (jika nextAction terisi) — ok
3. Apa berikutnya? ⚠️ continue + sekaligus 14 tombol lagi = ambigu
4. Di mana AI BC? ❌ di bawah fold di mobile (setelah hero + continue ≈ 700px)
5. Perkembangan saya? ⚠️ tersebar: hero (XP/koin/streak) + Arena (XP minggu/season/posisi) = dobel
6. Yang menyenangkan? ✅ Arena/Karya jelas

---

## 3. SECTION-BY-SECTION AUDIT

### 3.1 StudentHomeHero — KEEP (A) + 1 trim
- ✅ Identitas jelas; RankChip + title; CTA "Lihat Profil" jelas.
- ✅ XP ringkas (bar + 1 chip) — tidak menjadikan hero dashboard statistik.
- ⚠️ **Kartu "Pencacapaian" (badge + achievement counts) = duplikat `/arena/player`** (BadgeGrid)
  dan `/murid/profile` (strip lencana + teaser). Per RULE profil/arena, ini **activity hub info**.
  Rekomendasi: hapus kartu, sisakan CTA "Lihat Profil". (Kembalikan nanti sebagai rewards/rings premium.)
- ⚠️ 3 chip (streak + koin + XP minggu) + XP bar — streak layak dipertahankan (pembentuk habit),
  koin chip meh (langsung ke Toko Koin tidak ada CTA). Pertahankan streak; koin bisa turun ke chip
  "Toko Koin" kecil atau biarkan (biaya rendah).
- ⚠️ Mobile: hero ≈ 480–540px (1.2–1.3 viewport) karena stacking — lihat §6.

### 3.2 ContinueLearningCard — KEEP (A)
- ✅ CTA emas "Lanjut Belajar" = **satu-satunya primary action** yang jelas — pertahankan persis.
- ✅ Fallback ke Jalur Cerdas aman (tanpa nextAction tetap berguna).
- ⚠️ Ghost "Jelajahi Jalur Cerdas" redundan (Journey item #1 + QuickActions + fallback dialog).
  Cabut → tinggal 1 tombol, kognitif turun.
- ⚠️ "Hari ini: N aktivitas · X XP" = statistik dobel (hero + Arena). Pertahankan hanya jika
  Continue dipindah ke atas Arena; idealnya pindah ke insight mentor (1 baris, tidak 2 data).
- ✅ Insight "Saran mentor" bagus (semangat Learning Loop) — sejalan dengan /arena MentorCard;
  jangan gandakan fancy UI-nya di Home.

### 3.3 AIBCHomeCard — NEEDS REDESIGN (G) — komponen terlemah vs prioritas strategis
- **Visibility: ❌ mobile** — posisi ke-3, mulai ±720px (2× scroll). Desktop terlihat, mobile tidak.
- **CTA:** satu tombol emas "Tanya AI BC" — ok tapi generik; tidak ada affordance "chat" (input kosong).
- **Copy:** "Teman belajar yang selalu siap membantumu." → terlalu umum; tidak ada contoh konteks
  ("bingung kata baku? tanya di sini"). Belum terasa "personal learning companion".
- **Visual hierarchy:** gradient 3-warna + badget bot **bagus**, tapi header section (H2 "AI BC · Teman
  belajarmu") kecil vs kartu lain.
- **Contextual learning:** 4 chip topik (Arti kata/Tata bahasa/Sinonim/Latihan UKBI) sudah arah benar.
- **Temuan sistemik:** **AI BC TIDAK ada di sidebar** (6 item BC IA: Beranda/Profil/Arena/Karya/Obrolan/
  Pengaturan) → **satu-satunya pintu masuk adalah kartu ini** → harus unmistakable.
- Rekomendasi (bukan implementasi): posisi tetap #2 (mobile) setelah Hero / berdampingan Journey
  (desktop), headline aksi nyata ("Tanya apa saja tentang Bahasa Indonesia"), affordance chat-input
  visual, copy contoh ("Coba: 'jelaskan kata baku'"), badge "Gratis".

### 3.4 LearningJourneySection — KEEP (A) + 2 label fix
- ✅ Empat pilar belajar (Jalur Cerdas/Berlatih/Simulasi/Tugas) = konteks belajar yang benar.
- ⚠️ **Label "Latihan" → href `/arena/game`** — label menipu (hub gim ≠ latihan). Ganti label
  "Main & Latihan" atau ganti href ke halaman latihan riil.
- ⚠️ **Inkonsistensi route tugas:** Journey "Tugas" → `/murid/tugasku`, Secondary "Tugas Saya" &
  "Tugas" → `/arena/tugas`. Dua halaman tugas berbeda, satu label. Pilih satu canonical.
- ✅ Subtitle dinamis "N belum dikerjakan" — bagus, jaga.

### 3.5 ArenaHomeSection — MOVE TO ARENA (C) + SIMPLIFY (B) — **paling over-weight**
- ❌ Membawa: 4 stat tile (XP minggu/XP season/posisi global/misi) + **full quest bars data**
  (duplikat DailyQuestCard `/arena/player`) + **preview lencana** (duplikat BadgeGrid) +
  **posisi global** (duplikat LeaderboardPanel) + 3 tombol.
- ❌ **Duplikat dalam satu halaman:** "XP Minggu Ini" muncul di hero chip **dan** stat tile Arena.
- ✅ Yang benar per AUDIT 5: Home hanya perlu "Masuk Arena" + 1–2 highlight.
- Rekomendasi: kolaps jadi **satu kartu strip**: "Masuk Arena" (gold) + 1 highlight dinamis
  (misi termudah / posisi global #N) + chip "Lencana +N". Quest bars, stat tiles, preview badge,
  tombol Kuis Tempur/Liga/Misi → semua sudah ada di `/arena`, `/arena/player`, `/arena/league`,
  `/arena/game/kuis-tempur`, `/arena/misi`.

### 3.6 RecentWorksSection — KEEP (A)
- ✅ 4 karya = highlight social yang sehat, data dari API, badge jenis + likes/komentar ringkas.
- ⚠️ CTA "Semua Karya" → yang **memotivasi** justru "Tulis Karya" (Tulis ada di feed). Jadikan
  "Tulis Karya" primary + "Semua Karya" secondary (atau satu saja).

### 3.7 QuickActions — REMOVE (F)
- ❌ 6 kartu **100% duplikat tautan yang sudah ada di halaman ini**:
  Tulis Karya (=Karya section & feed), Jalur Cerdas (=Journey+Continue), Main Game (/arena/game =
  Journey "Latihan" + Arena section), Simulasi UKBI (=Journey), Liga (=Arena tombol), Profil Saya
  (=hero CTA). Tidak ada satu pun informasi/ruang baru.
- Rekomendasi: hapus section ini sepenuhnya. Jika nanti ingin "quick actions", isi hanya dengan
  link yang belum ada (mis. Toko Koin, Notifikasi) — bukan duplikat.

### 3.8 SecondaryLearningInfo — SIMPLIFY (B)
- ✅ Pengumuman + Materi = konteks kelas yang tetap bernilai (dulu section utama beranda lama).
- ⚠️ Avatars murid aktif (6) = **social**, bukan learning — RULE: Karya/Obrolan adalah rumahnya.
  Kompres jadi 1 baris "N murid aktif" (tanpa avatar atau 3 avatar).
- ⚠️ **3 tombol dobel:** "Tugas" (link), "Tugas Saya" (button), catatan tugas — tiga affordance
  untuk satu tujuan. Sisakan satu.
- Rekomendasi: 2 kartu ringkas (Pengumuman 2 item + Materi 2 item) + 1 baris status tugas.
  Pertahankan keberadaan fitur (jangan hapus info), hanya kompres.

### 3.9 Page shell — KEEP (A)
- ✅ `.px-theme` scoped, max-w-1200, import CSS di halaman, heartbeat 300s+5s — semua benar.

---

## 4. DUPLICATION AUDIT (Home vs Profile vs Arena vs Arena/Player)

| Data point | Home | /murid/profile | /arena (hub) | /arena/player | Temuan |
|---|---|---|---|---|---|
| Avatar + nama | hero | ProfileHero | header hero | PlayerHeader | wajar (konteks berbeda), jangan didetilkan di Home |
| Rank chip | hero | ProfileHero + StatusBar | header | PlayerHeader | wajar di hero; cukup 1× |
| Level + XP progress | hero (bar) | StatusBar | progress bar | PlayerHeader | **dobel di Home saja sudah 2×** → pertahankan di hero, hapus dari ArenaHomeSection (stat) |
| Streak | hero chip | StatusBar | tile Rentetan | StreakCard | wajar di hero (habit); jangan tambah lagi |
| Koin | hero chip | StatusBar | tile Koin | StatChip Koin | bernilai di hero; tanpa CTA toko = dead-end kecil |
| XP minggu ini | **hero chip + stat Arena** | — | league card | WeeklyChampionCard | **duplikat dalam 1 halaman** → hapus stat di ArenaHomeSection |
| XP season | stat Arena | — | — | (season panel) | hapus dari Home (activity hub) |
| Pos. leaderboard | stat Arena | — | league card | LeaderboardPanel | hapus dari Home; highlight 1 angka cukup |
| Quest harian | **3 quest bars** | — | link misi | DailyQuestCard | duplikat penuh → hapus dari Home |
| Lencana | count hero + **4 preview** | strip + teaser | — | BadgeGrid | preview 4 = duplikat → hapus, cukup "Lencana N" chip |
| Next action | Continue card | — | NextActionCard | — | konsep sama di 2 tempat; Home = "ruang belajar" jadi benar punya — jaga Continue, hapus yang lain |
| Insight mentor | footer Continue | — | MentorCard | — | duplikat nilai info; satu baris di Home cukup |
| Karya terbaru | 4 items | karyaCount | — | — | highlight wajar (discovery); jangan perbanyak |

**Inti:** Home tidak boleh menjadi "profile kedua" atau "arena kedua" — sekarang **5 elemen
(stat tiles, quest bars, badge preview, posisi global, XP season)** = arena kedua.

---

## 5. AI BC AUDIT (target: "personal learning companion", bukan "fitur tambahan")

| Dimensi | Skor | Catatan |
|---|---|---|
| Visibility | ❌ 3/10 | Menang di desktop; **bawah fold di mobile** (±720px). Sidebar tidak memuat AI BC (IA 6 item) → kartu ini satu-satunya pintu. |
| CTA | 6/10 | Tombol emas jelas, tapi generik; tidak ada affordance chat (input/tape animasi). |
| Copywriting | 4/10 | "Teman belajar yang selalu siap" — umum; tanpa contoh konteks. Target: "Tanya apa saja — dijawab seperti teman yang paham Bahasa Indonesia." |
| Visual hierarchy | 7/10 | Gradient bot badge bagus; headline kecil, section terlihat "add-on". |
| Contextual | 6/10 | 4 chip topik mengarah benar; belum dipersonalisasi (mis. dari soal terakhir/unit aktif). |
| Mobile | 4/10 | Posisi ke-3; CTA tombol penuh ok, chips wrap ok. |
| Desktop | 7/10 | Terlihat; kartu 2-kolom (icon+copy / CTA+chips) oke. |

**Keputusan:** komponen perlu **G — redesign** sebelum dianggap "companion": (a) pindah ke
posisi #2 mobile / sejajar Journey desktop, (b) headline aksi + contoh pertanyaan, (c) affordance
chat (input visual non-fungsional boleh, atau tombol "Tanya sekarang"), (d) badge "Gratis".
API tidak diubah.

---

## 6. RESPONSIVE AUDIT (statis — struktur)

| Viewport | Temuan |
|---|---|
| 390px | ✅ stack natural, no horizontal overflow (truncate/line-clamp di semua kartu). ❌ Hero 480–540px (1.2–1.3 vp) karena stack avatar→chips→XP→achievement→CTA — kompres (hapus kartu Pencacapaian, chip 1 baris). ❌ AI di fold ke-2. ⚠️ Arena section = 2× viewport hampir — pasti collapse setelah simplify. tombol `py-3` ≥ 44px ✅. |
| 768px | ✅ journey 2-kolom, karya 2-kolom, QA 3-kolom, secondary 2-kolom, arena stats 4-bar. → cukup. |
| 1024px | ✅ lg breakpoint aktif: hero 2-kolom (+280px kanan), arena 5-col grid. Karya masih 2-kolom (xl baru 4) — wajar. |
| 1440px | ✅ container 1200px optimal, karya 4-col, QA 6-col. ⚠️ 8 section bertumpuk vertikal = halaman sangat panjang; peluang: pasang Journey & AI BC berdampingan (2-col) di lg untuk memendekkan — struktur nanti, bukan sekarang. |

Dark/light: hanya kesiapan struktur dinilai — semuanya CSS var `--px-*` + `.px-card` dll, siap
toggle di masa depan tanpa refactor (tidak diimplementasikan sekarang, sesuai instruksi).

---

## 7. PREMIUM READINESS (lokasi yang cocok — belum diimplementasi)

| Lokasi | Slot premium | Jenis |
|---|---|---|
| Hero avatar + ring | **frame avatar** (`equippedFrame` sudah ada di data!) + showcase | COSMETICS |
| Hero title | **gelar premium** (rank-up title) | COSMETICS |
| Hero chip streak | **streak freeze** indicator + CTA | ACCESS/CONVENIENCE |
| Hero chip koin / Arena strip | pintu **Toko Koin** (`/arena/toko-koin` sudah ada) | ACCESS |
| Hero XP bar | **advanced stats** (detail breakdown link) | CONVENIENCE |
| Continue card | "Freeze rentetan" CTA + premium next-action (skip waiting) | CONVENIENCE |
| AI BC card | **entitlement badge** (kuota AI murid) | ACCESS |
| Journey | **simulation entitlement** (paket UKBI/TKA Pro, lebih banyak simulasi) | ENTITLEMENT |
| Arena strip | **exclusive arena cosmetics** (selubung/badge showcase) | COSMETICS |
| Karya cards | frame pada thumbnail karya | COSMETICS |

**Kepatuhan RULE:** tidak ada satupun slot di atas menyentuh XP/score/leaderboard — semua
access + convenience + cosmetics + personalization. **Jangan pernah** menaruh XP boost/koin
dobel di Home (merusak leaderboard) — Home menampilkan, arena yang memberi.

---

## 8. COGNITIVE-LOAD SCORE

Perhitungan konseptual (kondisi sekarang):

| Metrik | Jumlah |
|---|---|
| Primary CTA | 1 (Lanjut Belajar) ✅ |
| Secondary CTA (button) | ±12 (Lihat Profil, Jelajahi JC, Tanya AI, Masuk Arena, Kuis Tempur, Liga, Misi&Peringkat, Semua Karya, Semua, Tugas, Tugas Saya, ...) ❌ |
| Card sebelum first scroll | 2 (mobile) / 3 (desktop) |
| Statistik tampil | ±9 (3 chip + XP bar + 4 tile + "Hari ini") ❌ |
| Navigational choices | ±30 target klik ❌ |
| Section | 8 ❌ (target 5–6) |

**Skor kognitif: 4/10** — "harus klik yang mana?" muncul di: Arena section (5 tawaran),
QuickActions (6 kartu duplikat), Secondary (3 tawaran tugas).
**Setelah simplifikasi rekomendasi (target): 7/10** — 1 primary, 2–3 secondary
(Lihat Profil, Tanya AI, Masuk Arena), ±15 klik total, 6 section, ±5 statistik.

---

## 9. RECOMMENDED FINAL ORDERING

```
1. Hero            (identitas ringkas + XP + CTA Profil)
2. Continue         (primary action — "Lanjut Belajar")
3. AI BC            (mobile #3 / desktop sejajar Journey 2-col) ← prioritas strategis
4. Journey          (4 pilar belajar)
   [desktop: AI + Journey berdampingan]
5. Karya            (4 karya highlights — discovery)
6. Arena Gateway    (1 kartu strip: Masuk Arena + 1 highlight + chip Lencana)
7. Kabar Kelas      (kompak: pengumuman + materi + status tugas)
(QuickActions: dihapus)
```

Urutan ini memenuhi: **Continue → Journey → AI** (AUDIT 4) sekaligus AI tetap atas di mobile
(AUDIT 3), Arena hanya gateway (AUDIT 5), Home tetap learning (AUDIT 6).

---

## 10. EXACT CHANGES RECOMMENDED BEFORE COMMIT

> Semua bersifat **pengurangan/kompresi**, tidak menyentuh API/schema/engine.

1. **Hero:** hapus kartu "Pencapaian" (badge/achievement counts) → sisakan CTA "Lihat Profil";
   kompres chip jadi 1 baris (3 chip kecil cukup di mobile). (Status: hapus 1 blok ±15 baris)
2. **ContinueLearningCard:** hapus ghost "Jelajahi Jalur Cerdas"; hapus baris "Hari ini: N aktivitas ·
   X XP" bila mengganggu (atau pertahankan — biaya rendah).
3. **AIBCHomeCard (redesign):** pindah blok render ke posisi #3 mobile; desktop grid 2-kolom
   dengan Journey; headline → "Tanya apa saja tentang Bahasa Indonesia"; tambah chip contoh
   ("Coba: jelaskan kosakata baku"); badge "Gratis". Tanpa API baru.
4. **LearningJourneySection:** label "Latihan" → "Berlatih & Main" (atau ganti href ke halaman
   latihan riil); pilih satu canonical route tugas (`/arena/tugas` vs `/murid/tugasku`) untuk
   Journey + Secondary.
5. **ArenaHomeSection → kolaps:** 1 kartu gateway: gold "Masuk Arena" + 1 highlight dinamis
   (posisi global #N atau misi pertama + progress) + chip "Lencana N". Hapus 4 stat tile,
   quest bars, badge preview, 3 tombol (semua hidup di `/arena*`).
6. **RecentWorksSection:** CTA utama "Tulis Karya" + secondary "Semua Karya".
7. **QuickActions:** HAPUS section (10 baris render).
8. **SecondaryLearningInfo:** kompres ke 2 kartu (Pengumuman 2 + Materi 2), 1 baris status tugas,
   avatar murid aktif → 3 max + "N murid aktif", satu affordance tugas.
9. **Page:** urutan render disesuaikan §9; tidak ada perubahan lain (heartbeat/theme/container tetap).
10. **Test:** update `scripts/test-student-home.ts` (hapus assertion QuickActions/Arena stat;
    tambah assertion urutan AI #3 & Arena gateway). `test:student-consolidation` tidak tersentuh.

Estimasi diff: −120 baris, +60 baris (terutama copy/posisi).

---

## 11. THINGS THAT MUST NOT BE TOUCHED

- `app/api/*` — semua read-only (player/profile/session/quests/badges/journey, murid/dashboard/
  summary, siswa/karya, siswa/aktif, user/me, user/heartbeat) **tetap seperti sekarang**.
- `lib/gamification/*`, `lib/award-xp.ts`, `lib/coins.ts`, `lib/premium*`, `lib/ai-gateway/*`,
  `lib/billing/*`, `prisma/*` — engine & data, tanpa perubahan.
- `app/arena/player-theme.css` — read-only; komponen memakai class yang ada.
- `app/arena/layout.tsx`, `app/(dashboard)/murid/layout.tsx`, `components/dashboard/MuridMobileNav.tsx`
  (IA sidebar 6 item per spesifikasi — AI BC diangkat lewat kartu Home, bukan sidebar).
- `app/arena/page.tsx` (hub), `/arena/player/*`, `/murid/profile/*`, `/arena/feed/*` — pembanding, jangan diubah.
- `next.config.ts`, `vercel.json`, schema, migration, env.

---

## 12. FINAL RECOMMENDATION

**NEEDS REVISION sebelum commit** — namun bedanya kecil dan aman:

- Teknis: ✅ GREEN (test 36/36, tsc 0, eslint 0, regression 5 suite PASS, build 363 routes).
- UX: ❌ 4 perbaikan wajib sebelum commit:
  1. ArenaHomeSection → gateway (AUDIT 5);
  2. QuickActions dihapus (AUDIT 9/duplication);
  3. AI BC naik ke posisi #3 mobile + copy companion (AUDIT 3);
  4. Secondary dikompres + hapus dobel affordance.
- Setelah 4 poin itu: **READY TO COMMIT** (satu putaran, ±1 jam, tanpa API baru, tanpa schema).
- Opsi: jika ingin rilis cepat, commit kondisi sekarang lalu polish di fase berikut —
  risiko UX-nya: halaman terasa berat/administratif, mengalahkan tujuan "Learning Home".