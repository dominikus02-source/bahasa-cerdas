# PHASE 2 · STEP 5.2 — Rilis Teka-Teki Silang (Generator Prosedural + Bank Kata KBBI)

**Tanggal:** Aug 17, 2026 · **Status:** NOT COMMITTED — menunggu Founder Review (pola fase shell)

---

## 1. Latar Belakang (Audit)

`components/game/TTSpage.tsx` (915 baris) sudah menjadi game lengkap sejak lama, tetapi **belum pernah dirilis**:

| Temuan | Detail |
|---|---|
| **Orphan** | `TTSpage.tsx` tidak di-import di mana pun — tidak ada route `app/arena/game/teka-teki-silang/`, tidak ada kartu di `GAMES` hub Arena Gim (`app/arena/game/page.tsx`). |
| **Soal statis** | 10 puzzle ditulis tangan (grid & kata tetap). Main ulang level yang sama = persis sama → cepat terasa "pengulangan". |
| **DNA menyimpang** | Mengirim `score: pct` (0–100) ke `/api/game/xp` padahal XP server = `skor/10` → maksimal 10 XP per ronde. Tidak pakai `lib/game/sound.ts` (semua game rilis memakainya). Tidak ada streak/combo. |

## 2. Keputusan Desain

1. **Generator crossword prosedural ber-seed** (`lib/game/tts/`):
   - `seed.ts`: `hashString` (xmur3) + `mulberry32` + `dailySeed(level, date)` / `randomSeed()`.
   - `generator.ts`: `buildPuzzle({ level, seed, avoidAnswers })` → deterministik per seed (seed sama → puzzle sama; berbeda → beda). Packing serakah: kata terpanjang mendatar di kiri atas, lalu kata dengan **afinitas huruf** tertinggi terhadap kata terpasang, dicoba di semua titik perpotongan (mendatar/menurun).
   - **Aturan grid standar teka-teki silang**: huruf tidak bentrok; kata tidak boleh memanjang tanpa sengaja (sel ujung bukan milik kata searah); sel sisi (atas/bawah untuk kata mendatar, kiri/kanan untuk menurun) hanya boleh terisi bila sel kata itu dipotong kata lain.
   - Retry hingga 7× dengan acakan berbeda; fallback relaksasi bila < `minWords`. Fuzz 600/600 bersih (0 out-of-bounds, rata-rata 7.3 kata/puzzle).
2. **Bank kata ~200 entri, kurasi KBBI/PUEBI** (`word-bank.ts`), 9 tema + campuran untuk level 10:
   Keluarga Inti · Kelas Kata · Ejaan Baku · Sinonim · Antonim · Unsur Sastra · Imbuhan · EYD Lanjut · Majas & Gaya Bahasa.
   Aturan: jawaban A–Z saja, 3–14 huruf, tanpa spasi/tanda baca; ≥ 16 kata per tema (cukup untuk variasi antar main); tanpa duplikat lintas tema; spot-check ejaan baku diuji (karier, risiko, nasihat, izin, cabai, antre, konkret, hakikat, jumat, rapor, atlet, metode).
3. **Mode soal (anti-ulang)**:
   - **Hari Ini** — seed = `dailySeed(level)` → puzzle sama untuk semua pemain, ganti tiap hari (mirip "Wordle").
   - **Acak** — seed acak tiap main + tombol "Soal Lain" untuk me-refresh.
   - **Anti-ulang antar main** — kata yang muncul disimpan (`tts-seen-v2`, cap 60, sisakan 30 terakhir) dan dihindari main berikutnya selama bank masih cukup (≥ 2× target); bank habis → fallback jujur.
4. **Leveling dipertahankan**: 10 level, unlock berurutan, 1–3 bintang, best %, XP/koin localStorage, bonus kecepatan +20%.
5. **Skor server diperbaiki** (DNA `/api/game/xp`): `score = sel benar × 10 + bonus tuntas (200) + bonus beruntun (×5)`, cap `TEKA_TEKI_SILANG: 1500` di `MAX_SCORE_PER_GAME`. XP server kini wajar (≈ sel benar XP, maks 120/submit oleh `awardXp`).
6. **DNA game lain**:
   - Sound: `sfx` dari `lib/game/sound.ts` (correct/climb/wrong/win/gameover/tap/start) + tombol suara (persist `bc_game_sound`).
   - **Kata Beruntun (combo)**: setiap kata selesai benar menaikkan combo; salah/petunjuk/bersihkan mereset; chip 🔥 di HUD + bonus XP + ditampilkan di layar hasil.
   - Progress bar akurasi di bawah HUD; grid responsif (sel mengecil di level besar, font menyesuaikan).
7. **Rilis**: route `app/arena/game/teka-teki-silang/page.tsx` (pola Irama Kata) + kartu hub (icon `Grid3x3`, badge "Baru", +75 XP, Solo, ~5 mnt).

## 3. Files

| File | Aksi |
|------|------|
| `lib/game/tts/types.ts` | BARU — tipe bersama (kompatibel struktural dgn TTSpage) |
| `lib/game/tts/seed.ts` | BARU — xmur3 + mulberry32 + dailySeed/randomSeed |
| `lib/game/tts/word-bank.ts` | BARU — ~200 kata kurasi KBBI, 9 tema + campuran |
| `lib/game/tts/levels.ts` | BARU — band grid, target/minWords, metadata level |
| `lib/game/tts/generator.ts` | BARU — generator crossword prosedural ber-seed |
| `components/game/TTSpage.tsx` | UPGRADE — puzzle dari generator, mode Hari Ini/Acak, anti-ulang, combo, sound, skor server nyata, progress bar, grid responsif |
| `app/arena/game/teka-teki-silang/page.tsx` | BARU — route rilis |
| `app/arena/game/page.tsx` | +kartu hub (Grid3x3, badge Baru) |
| `app/api/game/xp/route.ts` | +cap TEKA_TEKI_SILANG 1500 |
| `scripts/test-tts-generator.ts` | BARU — 54 checks |
| `scripts/test-arena-web.ts` | allowed-routes app/api + `app/api/game/xp/route.ts` (pengaman fase) |
| `package.json` | +`test:tts-generator` |

## 4. Verifikasi

| Check | Hasil |
|-------|-------|
| `npm run test:tts-generator` (BARU) | ✅ 54/54 + fuzz 600/600 (0 bad, avg 7.3 kata/puzzle) |
| `npm run test:arena-web` | ✅ 56/56 |
| `npm run test:game-question-quality` | ✅ 29/29 |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (file diubah) | ✅ 0 errors (2 warning `<img>` lama di page.tsx, tak tersentuh) |
| `git diff --check` | ✅ bersih |
| Protected zones (prisma/, gamification, learning-loop, engines, apk, coins, award-xp, adaptive, learner-state, diagnostic, app-api/player) | ✅ 0 diff |
| DB | ✅ READ ONLY — 0 write, 0 migrasi |

## 5. Catatan

- `test:no-emoji-icons` gagal **sebelum fase ini** (emoji lama di `chat-client.tsx`, `league-tabs.tsx`, `reward-popup.tsx`, dll. — bukan file fase ini); tidak disentuh.
- `package-lock.json` di-revert setelah `npm install` lokal (noise field `libc` opsional, bukan bagian fase).
- Catatan fase ini tidak bisa di-append ke `AGENTS.md` karena keterbatasan alat patch pada file berukuran 252 KB (bagian akhir file tidak terjangkau patcher); laporan lengkap ada di dokumen ini.

## 6. Git status (NO COMMIT)

```
M app/api/game/xp/route.ts
M app/arena/game/page.tsx
M components/game/TTSpage.tsx
M package.json
M scripts/test-arena-web.ts
?? app/arena/game/teka-teki-silang/
?? lib/game/tts/
?? scripts/test-tts-generator.ts
```

---

# LAMPIRAN — STEP 5.2.1: TTS v3 — DNA Kuis Tempur (Aug 17, 2026)

## Goal (permintaan founder)

TTS bukan sekadar game teka-teki biasa: **simple tapi tampilan modern & adiktif**,
**leveling lengkap**, **pilihan kata banyak**, **sistem nyawa yang ok**, dan
**DNA tampilan yang sama dengan gim lain** — **full screen seperti Kuis Tempur**.

## Yang Diubah (v3)

### 1. DNA tampilan Kuis Tempur (fullscreen)
- Container lebar `max-w-[1280px]` saat bermain (kondisional: layar lain tetap `max-w-2xl`).
- **HUD 5 tile** ala Kuis Tempur: **Nyawa** (tile gelap ❤ n/5) · **Level** · **Rentetan** (oranye saat >1) · **Terisi** (n/total) · **Waktu** (violet, merah saat ≤20 dtk).
- **Bar sisa waktu** dengan label "Sisa waktu" + progress bar (persis pola Kuis Tempur), plus bar ketepatan (sel benar/total) + chip beruntun/akurasi.
- Gaya chunky terang konsisten (`#FFF6E0→#FFE2C7`, border & shadow `#161B3A`) — sudah DNA Arena.

### 2. Sistem nyawa (pola Duolingo) — `lib/game/tts/economy.ts` (BARU, murni)
- Maks 5 nyawa; **-1 tiap jawaban salah** saat "Cek Jawaban" (`sfx.wrong` + haptic).
- **Regen 1 nyawa / 10 menit** (`HEART_REGEN_MS`), tersimpan `{hearts, updatedAt}` — pemain yang lama pergi otomatis penuh saat kembali.
- **+1 nyawa bonus** saat selesai sempurna (100%).
- **Gate screen "Nyawa Habis!"** saat 0: countdown nyawa berikutnya (tick 1 dtk), tombol main aktif kembali saat ≥1.

### 3. Leveling lengkap
- **12 level**: 11 tema (bank kata ~30/tema) + **Ujian Akhir** campuran semua tema (grid 11–16×11–17, 10 kata).
- **Tier pemain** dari XP lokal (Pemula Kata → Pengeja → Perangkai Kata → Maestro Kata → Legenda Bahasa) dengan progress bar di layar start & hasil.
- **Rentetan harian** (`tts-streak-v2`): main tiap hari berturut → streak; bonus XP `+2/hari` cap 7 hari dihitung saat finish.
- **Selebrasi unlock**: banner "Level N Terbuka!" dengan judul/subjudul tema baru di layar hasil saat level pertama kali dibuka (plus confetti yang sudah ada).

### 4. Pilihan kata banyak
- Bank kata diperluas: **9 → 11 tema, ~320 entri kurasi KBBI** (tema baru: **Ungkapan & Idiom**, **Kata Serapan**; ~90 kata baru tersebar di tema lama).
- Generator prosedural + anti-ulang (`tts-seen-v2`) tetap: kombinasi berbeda tiap main.

### 5. Konten/label konsisten
- Hub Arena: desc "10 level" → "12 level". Header komentar TTS di-update.

## Verifikasi (semua lulus)

| Check | Hasil |
|-------|-------|
| `npm run test:tts-generator` (diperluas: +ekonomi nyawa/tier/streak) | ✅ 77/77 |
| `npm run test:arena-web` | ✅ 56/56 |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (file diubah) | ✅ 0 errors, 0 warnings |
| `git diff --check` | ✅ bersih |
| Protected zones | ✅ 0 diff |
| DB | ✅ READ ONLY — 0 write, 0 migrasi |

## Catatan

- Menyentuh komponen di bawah baris ~1000 TTSpage tidak mungkin lewat patcher
  (batas jangkauan alat) — solusi: blok selebrasi/statistik hasil dirender sebagai
  saudara dari kartu hasil (di atasnya), bukan di dalam kartu.
- `test:no-emoji-icons` tetap gagal karena file pra-fase (chat-client, league-tabs,
  reward-popup) — bukan regresi fase ini.

---

# LAMPIRAN — STEP 5.2.2: Rebalance Ekonomi TTS (Aug 17, 2026)

## Goal (permintaan founder)

"Naikkan XP tier/nyawa supaya lebih seimbang" — XP per main terasa terlalu kecil
(cap L12 = 144), tier terlalu cepat diraih, dan sistem nyawa perlu bantalan +
recovery yang lebih nyaman untuk sesi main singkat.

## Perubahan Angka

| Aspek | Sebelum | Sesudah | Alasan |
|-------|---------|---------|--------|
| XP base per main | `levelId × 8` | `levelId × 12` | Hadiah sepadan dengan usaha 5 menit |
| Penalti petunjuk | -4 | -5 | Petunjuk tetap berbiaya, tapi tidak dominan |
| Bonus beruntun | +2/kata | +3/kata | Rentetan terasa lebih bernilai |
| Cap XP per main | `levelId × 12` (L12 = 144) | `levelId × 20` (L12 = 240) | Naik ~67%; masih di bawah server cap 1500 |
| **Nyawa maks** | 5 | **6** | Bantalan lebih besar sebelum kehabisan |
| **Regen nyawa** | 1 / 10 mnt | **1 / 8 mnt** (full ~48 mnt) | Recovery lebih cepat untuk main singkat |
| Bonus sempurna | +1 nyawa | +1 nyawa (tetap) | Loop hadiah konsistensi dipertahankan |
| **Tier** | 0 / 150 / 400 / 800 / 1400 | **0 / 250 / 600 / 1200 / 2000** | Diselaraskan dgn XP v3: Pengeja ≈ 1–2 main L12, Legenda ≈ 8–10 main L12 |
| **Bonus rentetan** | +2/hari, cap 7 (+14) | **+3/hari, cap 10 (+30)** | Dorong main tiap hari (retensi) |

## File Diubah

- `lib/game/tts/economy.ts` — HEARTS_MAX 5→6, HEART_REGEN_MS 10→8 mnt, PLAYER_TIERS,
  streakXpBonus (+3 cap 10), komentar.
- `components/game/TTSpage.tsx` — calcXP (base 12, hint -5, combo +3, cap ×20);
  teks nyawa "8 mnt" di layar start; **gate screen "Nyawa Habis!" dipasang ulang**
  (sebelumnya gagal terpasang karena di luar jangkauan patcher — kini di region
  terlihat, teks regen dinamis dari HEART_REGEN_MS).
- `scripts/test-tts-generator.ts` — test ekonomi disesuaikan (cap 6, regen 8 mnt,
  tier 250/600/1200/2000, streak +3 cap 10, +test proporsi tier↔XP).

## Verifikasi

| Check | Hasil |
|-------|-------|
| `npm run test:tts-generator` | ✅ 78/78 |
| `npm run test:arena-web` | ✅ 56/56 |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (file diubah) | ✅ 0 errors |
| `git diff --check` / protected zones | ✅ bersih / 0 diff |
