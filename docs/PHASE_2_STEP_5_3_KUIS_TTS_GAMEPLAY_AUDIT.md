# PHASE 2 · STEP 5.3 — KUIS TTS 1.0 — Gameplay & Game Loop Audit (+ Misi Page Konsep Arena)

**Tanggal:** Aug 17, 2026 · **Status:** NOT COMMITTED — menunggu Founder Review (pola fase shell)

---

## 0. Ringkasan

Dua tugas founder:

1. **`/arena/misi` tampil tidak maksimal** → disamakan dengan konsep header halaman Arena lain (icon chip + eyebrow + judul + subjudul) dan box "Cara Dapat Koin" dibuat theme-aware penuh di dark mode.
2. **KUIS TTS 1.0** — audit menyeluruh gameplay & game loop TTS. Tidak ada perubahan engine/XP/DB. Semua perubahan bersifat additive di layer UX game.

---

## 1. Audit Awal

```text
KUIS TTS 1.0 AUDIT

Route:              app/arena/game/teka-teki-silang/page.tsx (wrapper fullscreen)
Entry point:        Game Hub → registry gim → route TTS
Gameplay component: components/game/TTSpage.tsx (v3.1, ~1309 baris)
Question source:    lib/game/tts/generator.ts — generator crossword prosedural ber-seed
                    (xmur3 + mulberry32; dailySeed(level, date) / randomSeed; bank kata KBBI)
Answer validation:  server-side (jawaban dicocokkan ke correctAnswer; klien tanpa answer key)
Score:              skor dikirim ke /api/game/xp, dicap server (MAX_SCORE_PER_GAME)
Timer:              timeBudget per sesi (1–10 menit), tab-switch tidak memberi exploit
XP:                engine existing (/api/game/xp) — idempoten (reference unik + kuota harian + rate-limit)
Result:            layar result dengan skor, benar/salah, XP didapat
Retry:             Main Lagi → setup baru (session baru, jawaban lama tidak terbawa)
Back:              tombol keluar di komponen; wrapper tanpa X duplikat
Theme:             TTS punya identitas visual sendiri (crossword arcade) — bukan zona
                    px-theme; kontras & reduced-motion sudah diverifikasi
Mobile:            grid responsif, cell cukup besar, tanpa horizontal overflow page
API:               /api/game/xp (0 diff fase ini)
Database:          READ ONLY

CRITICAL:  (tidak ada)
HIGH:      Keluar saat bermain menghancurkan progress tanpa konfirmasi (§23)
HIGH:      Result screen CTA tidak jelas hierarki — "Ulangi"/"Pilih Level" tanpa
           "Main Lagi"/"Kembali ke Gim" (§15), dan CTA "Pilih Level" tidak kembali
           ke Game Hub
MEDIUM:    Wrapper route punya tombol X kedua (duplikat dengan header game) yang
           bisa menutup permainan tanpa konfirmasi
MEDIUM:    Sel grid tidak punya aria-label (aksesibilitas §35)
MEDIUM:    Animasi tidak hormati prefers-reduced-motion (§28)
LOW:       Header layar start/hearts tidak punya jalan keluar ke Game Hub (hanya
           kembali ke levels)

Recommended changes: (semua diimplementasikan — lihat §3)
```

---

## 2. Arsitektur (setelah fase ini)

```
ARENA → GAME HUB → KUIS TTS (route fullscreen)
  → start (intro singkat: atur durasi) → levels (12 level berjenjang)
  → setup (durasi 1–10 mnt) → game (grid + clue + timer)
  → cek jawaban → feedback (benar/salah, combo) → result
  → MAIN LAGI (setup baru) | KEMBALI KE GIM (→ /arena/game)
```

- XP dikirim **sekali per sesi** (`xpSentRef`) ke `/api/game/xp`; server cap skor + reference unik + kuota harian + rate-limit — anti-cheat **tidak diubah**.
- Randomisasi: `dailySeed(level, date)` = puzzle sama sepanjang hari per level (fair untuk semua), `randomSeed()` untuk latihan bebas — puzzle selalu valid (generator deterministik + validasi).
- Tidak ada API/DB baru.

---

## 3. Perubahan

| File | Perubahan |
|---|---|
| `components/game/TTSpage.tsx` | **Exit confirmation** — tombol keluar saat `screen === "game"` cek `adaProgress` (sel terisi / combo / waktu terpakai): ada progress → modal "Keluar dari permainan?" (Tetap Main / Keluar), tanpa progress → langsung ke levels. **Result CTA hierarki**: sempurna → "Level Berikutnya" (primary), belum sempurna → "Main Lagi" (primary), plus "Kembali ke Gim" → `/arena/game` (secondary, menggantikan "Pilih Level"). **Header start/hearts**: tombol X → `/arena/game` (keluar dari gim). **A11y**: tiap sel grid `aria-label="Baris r, kolom c, petunjuk n"`, tombol keluar `aria-label="Keluar dari permainan"`. **Reduced motion**: `@media (prefers-reduced-motion: reduce)` mematikan semua animasi TTS. |
| `app/arena/game/teka-teki-silang/page.tsx` | Wrapper dirapikan — **hapus X duplikat** (sebelumnya ada tombol keluar sendiri di wrapper; sekarang exit dikelola di dalam komponen dengan konfirmasi). Komentar menjelaskan alasan. |
| `app/arena/misi/page.tsx` | **Header konsep Arena 2.0**: icon chip (Target) + eyebrow "Arena BahasaCerdas" + judul "Misi" + subjudul koin/XP. **Box "Cara Dapat Koin" theme-aware**: `dark:border-amber-500/20 dark:from-amber-500/10 dark:bg-amber-500/15` + chip ikon `dark:bg-amber-500/15` dst. |
| `scripts/test-arena-web.ts` | +11 asersi (seksi 13 Misi, seksi 14 KUIS TTS 1.0): 76 → **87 checks**. |

---

## 4. Gameplay / UX / Scoring / XP / Randomisasi / Validasi

- **Gameplay loop**: ENTER → intro (durasi) → LEVELS → SETUP → PLAY → CLUE → SOLVE → FEEDBACK → RESULT → XP → MAIN LAGI / KEMBALI KE GIM — tidak ada dead end.
- **Scoring**: tidak diubah (engine existing: akurasi + penalti petunjuk + bonus kecepatan + bonus sempurna; skor dicap server).
- **XP**: engine existing, idempoten — tidak ada `awardXp` baru di komponen game.
- **Randomisasi**: generator prosedural ber-seed (sesi baru ≠ sesi sebelumnya untuk level yang sama pada hari berbeda / latihan bebas).
- **Puzzle validity**: generator deterministik + validasi (78 check `test:tts-generator` lulus).

---

## 5. Theme / Mobile / Navigation / Anti-cheat / Performance

- **Theme**: TTS memakai identitas visual arcade-nya sendiri (bukan zona px-theme); verifikasi kontras & reduced-motion.
- **Mobile**: grid responsif tanpa overflow; touch target ≥ 44px; keyboard virtual tidak menutup clue (layout scrollable).
- **Navigation**: keluar → konfirmasi bila progress; "Kembali ke Gim" → `/arena/game` (bukan `/`, bukan dashboard); fallback logis.
- **Anti-cheat**: tidak diubah — server-authoritative (`/api/game/xp`: cap skor, reference unik, kuota harian, rate-limit; XP sekali per sesi).
- **Performance**: tidak ada request baru per input; timer di-ref dengan interval tunggal.

---

## 6. Verifikasi

| Check | Hasil |
|---|---|
| `test:arena-web` | ✅ **87/87** (76 → 87, +11 asersi baru; tidak ada asersi lama dihapus) |
| `test:tts-generator` | ✅ 78/78 |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (4 file diubah) | ✅ 0 violations |
| `test:no-emoji` | ✅ 0 regresi (2 kegagalan = file pra-fase: league-tabs, player reward/streak; "kartu belajar Arena" sudah gagal sejak Arena 2.0 karena home di-rewrite — bukan perubahan fase ini) |
| `git diff --check` | ✅ bersih |
| Protected zones (prisma/, gamification, learning-loop, engines, apk, coins, award-xp, app/api/, bottom-nav, player-context) | ✅ 0 diff |
| DB | READ ONLY |

---

## 7. Protected Zones & Database

- **0 diff**: `prisma/`, `lib/gamification/`, `lib/learning-loop/`, `engines/`, `lib/apk.ts`, `lib/xp.ts`, `lib/coins.ts`, `lib/award-xp.ts`, `app/api/`, `app/arena/bottom-nav.tsx`, `components/arena/player/player-context.tsx`.
- **Database**: READ ONLY — 0 write, 0 migrasi.

---

## 8. Kesimpulan

**Final verdict: PASS**

Game loop TTS sekarang: masuk → paham → main → selesai → feedback → XP → result → main lagi / kembali ke Game Hub — cepat, jelas, dan tanpa dead end. Misi page tampil dengan konsep Arena yang konsisten.

**Commit: NOT CREATED** — menunggu Founder Review.
