# KUIS TTS 1.1 — REAL USER QA & GAMEPLAY FEEL AUDIT

Build: `9942a94`
Phase: TTS 1.0 (gameplay audit) → **TTS 1.1 (real user QA)** — bukan feature development.

---

## HASIL AUDIT (format wajib §39)

```
KUIS TTS 1.1 — REAL USER QA

Build:
9942a94

User Journey:
PASS — Arena → Game Hub → Kuis TTS → Mulai → Puzzle → Jawab → Benar/Salah → Selesai → Reward → Main Lagi. Tidak ada dead end; semua transisi punya CTA jelas.

First 5 Seconds:
PASS — Layar awal: identitas game jelas ("Teka-Teki Silang", "Isi Kotak yang Tepat!"), CTA tunggal "Main Sekarang". Kartu info duplikat (3 Bintang / XP & Koin / Nyawa / Bonus) DIHAPUS — sekarang 3 kartu statistik pemain (Tier / Rentetan / Nyawa) + CTA. Murid tahu: ini game apa, apa yang dilakukan, tombol apa yang ditekan. Durasi & hadiah terlihat di langkah berikutnya (setup).

Gameplay:
PASS — Puzzle jadi focal point: HUD 5 tile (Nyawa/Level/Rentetan/Terisi/Waktu) + bar sisa waktu + progres ketepatan + petunjuk aktif + grid. Tanpa XP/koin/rank/leaderboard selama bermain (§17).

Grid:
PASS — Sel cukup besar (28–38px, 22–30px utk grid besar), selected cell kuning, active word kuning muda, nomor clue kecil terlihat, blocked cell navy gelap. Grid besar pakai scroll horizontal TERKURUNG di dalam wrapper puzzle (bukan scroll halaman) — sesuai §7.

Clue:
PASS — Clue aktif dominan (bar petunjuk + nomor + arah panah); daftar Mendatar/Menurun menandai clue aktif (bg kuning muda), lainnya muted. Murid selalu tahu sedang menjawab nomor berapa.

Input:
PASS — Normalisasi: uppercase otomatis, non-A-Z dibuang, whitespace aman (huruf tunggal per sel), backspace & panah keyboard jalan, fokus berpindah logis per kata. Casing tidak pernah jadi false negative.

Feedback:
PASS — Benar: maskot merayakan (bubble "Keren!/Betul!/Hebat!") + sfx + beruntun bertambah. Salah: sel merah + shake halus + bubble "Belum tepat — coba lagi." (BARU §13) + nyawa -1. Cepat, tanpa modal panjang.

Timer:
PASS — Sebelumnya tampil 3× (chip header + HUD Waktu + bar sisa waktu) → duplikasi. Sekarang 2×: HUD tile "Waktu" + bar "Sisa waktu" (chip header DIHAPUS §15). Warning hanya saat ≤20 detik (merah). Timeout mengunci game & langsung ke result (XP sekali).

Result:
PASS — Result = reward + next action: bintang, Ketepatan %, +XP/+Koin, chip bonus (Petunjuk, Waktu, Bonus rentetan BARU, Bonus nyawa BARU, Beruntun terbaik), CTA [Main Lagi] primary + [Kembali ke Gim] secondary. Strip statistik Tier/Rentetan/Nyawa DIHAPUS (§19) — banner "Level Terbuka!" tetap sebagai momen reward.

Replay:
PASS — Puzzle prosedural ber-seed + anti-ulang kata (seen list) → main berulang tidak identik (diverifikasi test:tts-generator 78/78 + determinisme generator). Main Lagi = sesi baru (grid/score/timer/reset, xpSentRef false → XP sekali per sesi; server cap skor).

Exit:
PASS — Ada progress → modal "Keluar dari permainan?" (Tetap Main / Keluar). Keluar sekarang → /arena/game (§21, sebelumnya ke pilih level). Tanpa progress → langsung ke pilih level (tanpa modal). Header X di start/hearts → /arena/game. Back konsisten.

Light Mode:
PASS — Game = overlay fullscreen dengan palet terang khas family game (Kuis Tempur, Benar Salah, Irama Kata, Lari Kata — semua memakai bg #FFF6E0→#FFE2C7 yang sama). Bukan dark surface; kontras tinggi. Sesuai §25: theme switch tidak tersedia di gameplay shell, cukup audit konsistensi — konsisten dengan semua sibling game (DNA Kuis Tempur, keputusan fase v3).

Dark Mode:
PASS — Sama seperti Light: identitas terang game family, tidak ada glow berlebihan, semua teks #161B3A di atas permukaan terang — terbaca di kedua mode global karena overlay menutup penuh.

Mobile:
PASS — 375/390/430/768: HUD 5 tile tetap muat (grid 5 kolom), grid puzzle scroll horizontal terkungkung, tombol aksi ≥44px, keyboard mobile tidak menutupi petunjuk aktif (inputMode text, sel 1 huruf, fokus berpindah). Catatan: sel grid 22–38px di bawah 44px — bawaan puzzle crossword, dikompensasi scroll + touch.

Accessibility:
PASS — aria-label tiap sel (Baris/kolom/petunjuk), aria-label tombol (Keluar dari permainan, Matikan/Nyalakan suara, Kembali), keyboard penuh (panah/backspace), prefers-reduced-motion (TTS 1.0) tetap, kontras tinggi. Tidak ada regresi aksesibilitas 1.0.

Performance:
PASS — Tanpa re-render berlebihan: timer interval hanya saat screen=game & dimatikan saat selesai; grid re-render murni state kecil; fetch XP hanya SEKALI per sesi (xpSentRef) setelah selesai; tidak ada fetch per ketikan.

Visual Scores (1–5):
Game identity: 5 — Grid3x3 logo + judul + tagline + 3 maskot.
Instruction clarity: 4 — deskripsi singkat + 3 kartu statistik.
Grid prominence: 5 — grid = elemen terbesar di tengah layar.
Clue clarity: 5 — active clue dominant (nomor + arah + teks).
Input clarity: 4 — sel kuning saat dipilih, aktif kata kuning muda.
Feedback: 4 — cheer maskot + bubble lembut saat salah.
Timer: 4 — 2 tampilan konsisten (HUD + bar), warning merah ≤20s.
Score: 4 — Terisi + % tepat + bar progres (skor final di result).
Result: 5 — reward moment: bintang, XP/Koin, bonus chip.
CTA: 5 — Main Lagi primary, Kembali ke Gim secondary, tanpa button berlebih.
Mobile: 4 — grid scroll terkungkung, HUD muat.
Light mode: 5 — terang, bersih, premium.
Dark mode: 5 — konsisten dengan DNA game family.

Game Feel Scores (1–5):
Fun: 4 — maskot + beruntun + nyawa memberi rasa game.
Speed: 4 — 3 tap ke main (Main Sekarang → level → Mulai), feedback <1 detik.
Clarity: 5 — satu tujuan per layar.
Satisfaction: 4 — cheer kata benar + selebrasi 100% (konfeti + win sfx).
Replayability: 4 — puzzle beda tiap main (seed + anti-ulang), mode Hari Ini/Acak, 12 level, target "satu ronde lagi".
Learning value: 5 — kosakata KBBI, 11 tema + Ujian Akhir, ejaan baku.

Issues Found:
CRITICAL: (tidak ada)
HIGH: (tidak ada setelah perbaikan)
MEDIUM:
- Timer duplikat 3× saat gameplay (chip header + HUD + bar) → chip header DIHAPUS (kini 2×).
- Result screen = 2 blok bertumpuk (strip statistik Tier/Rentetan/Nyawa + kartu reward) → statistik profil bersaing dengan reward & mendorong CTA ke bawah fold → strip DIHAPUS, bonus rentetan/nyawa jadi chip di kartu reward.
- Durasi 6 pilihan (1/2/3/5/7/10) → target §5 maks 3 → [3, 5, 10] (default tetap 5).
- Modal Keluar → pilih level (bukan keluar penuh) → §21 → /arena/game.
LOW:
- Sel grid 22–38px < 44px touch target — bawaan crossword (dikompensasi; bukan regresi).
- Banner "Waktu habis! Lihat hasil di bawah." di layar game praktis tak pernah tampil (timeout langsung pindah ke result) — kode mati tak berbahaya, dibiarkan.
- Theme: game = palet terang tetap (DNA family) — keputusan desain, bukan residual dark.

Changes Made:
- components/game/TTSpage.tsx — TIME_OPTIONS [3,5,10]; hapus chip timer di header game; modal Keluar → /arena/game; hapus strip statistik result (sisakan banner unlock); +chip "Bonus rentetan +N XP" & "Bonus nyawa +1"; fireMessage + bubble "Belum tepat — coba lagi." saat salah; hapus 4 kartu info duplikat di layar awal; doc header v3.2.
- scripts/test-arena-web.ts — +7 asersi KUIS TTS 1.1 (87 → 94).

Removed:
- Chip timer header (duplikat ke-3 saat gameplay).
- Strip statistik pemain di result (Tier/Rentetan/Nyawa).
- 4 kartu info layar awal (3 Bintang / XP & Koin / Nyawa / Bonus) — redundan dengan kartu statistik & deskripsi.
- 3 pilihan durasi (1, 2, 7 menit).

Moved:
- Bonus rentetan & bonus nyawa: dari strip statistik → chip reward di kartu hasil (transparan).

Theme fixes:
- Tidak ada perubahan palet (game = identitas terang family, konsisten antar game).

Navigation fixes:
- Modal Keluar → /arena/game (bukan pilih level) — konsisten dengan header X & CTA Kembali ke Gim.

Mobile fixes:
- Tidak perlu: HUD 5 tile & grid sudah responsive (scroll terkungkung); hanya verifikasi.

Performance fixes:
- Timer chip header dihapus → satu sumber render waktu ekstra dihapus; tanpa fetch baru.

Verification:
test:arena-web: 94/94 (87 → 94, +7 asersi, 0 asersi dihapus)
TTS tests: test:tts-generator 78/78
TypeScript: npx tsc --noEmit → 0 errors
ESLint: 0 errors (TTSpage.tsx, test-arena-web.ts)
git diff --check: bersih
no-emoji: 0 regresi

Protected zones:
prisma/, gamification engine, app/api, lib/game/sound, engines, bottom-nav (MuridMobileNav), APK, coins — 0 diff (hanya TTSpage.tsx + test-arena-web.ts yang berubah)

Database:
READ ONLY — 0 write, 0 migrasi, 0 query baru

Final verdict:
PASS

Commit:
NOT CREATED
```

---

## Ringkasan

- **Durasi**: 6 → 3 pilihan (3/5/10 menit) — keputusan <2 detik (§5).
- **Timer**: 3× → 2× tampilan (HUD Waktu + bar sisa waktu), chip header dihapus (§15).
- **Keluar**: modal konfirmasi → `/arena/game` (keluar penuh, §21).
- **Result**: reward murni — strip statistik dihapus, bonus rentetan & nyawa jadi chip transparan (§19).
- **Feedback salah**: bubble maskot "Belum tepat — coba lagi." — lembut, bukan hukuman (§13).
- **Layar awal**: kartu info duplikat dihapus — 5 detik pertama lebih jelas (§4).

Menunggu review — **belum di-commit**.
