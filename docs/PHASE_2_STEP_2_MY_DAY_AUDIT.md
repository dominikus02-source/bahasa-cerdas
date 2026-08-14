# PHASE 2 STEP 2A — MY DAY / LEARNING COMPANION AUDIT

> Audit-only. Tidak ada implementasi, tidak ada commit. Basis: commit `cd2e521`.

# Executive Summary
Student Home (`/murid/beranda`) saat ini adalah **dasbor fitur**, bukan learning companion. Learning Loop sudah terhubung sebagian (CTA "Lanjutkan Perjalananmu" nyata, rule-based, dari `/api/player/session`), tetapi: (1) SkillRadar/MentorCard/NextActionCard ada di repo tapi **tidak dirender di mana pun** (komponen mati), (2) premium **nol** kehadiran di beranda murid, (3) tiga CTA emas saling bersaing, (4) 1 fetch duplikat. Satu masalah data serius: **session API melempar ketika tabel learning-loop belum dimigrasikan**, dan ContinueLearningCard diam-diam fallback (tidak ada error state).

# Actual Student Entry Flow
| Langkah | File | Perilaku |
|---------|------|----------|
| LOGIN | `app/auth/callback/route.ts` | redirect ke `next` (login page default) |
| AUTH | `lib/supabase/server.ts` (`getUser`) | sesi Supabase SSR |
| ROLE | `app/(dashboard)/murid/layout.tsx:20-35` | non-murid/guru/founder → `/guru/beranda`; MURID belum `onboarded` → `/onboarding` (`app/(auth)/onboarding/page.tsx` ADA ✓); guru boleh pratinjau shell murid |
| STUDENT HOME | `app/(dashboard)/murid/beranda/page.tsx` | client component; 9 seksi |
| DATA FETCH | komponen per-seksi fetch sendiri | lihat tabel Current Student Home |
| RENDER | per-seksi skeleton | lihat Loading/Empty/Error |

# Current Student Home
| Section | File | Data | API | CTA | Premium | Status |
|---------|------|------|-----|-----|---------|--------|
| Hero profil | `components/student-home/StudentHomeHero.tsx` | PlayerProfile + user | `/api/player/profile`, `/api/user/me` | "Lihat Profil" | tidak ada | ACTIVE (error state ada) |
| Lanjutkan Perjalananmu | `ContinueLearningCard.tsx` | SessionSummary | `/api/player/session` | "Lanjut Belajar" (gold, DOMINAN) | tidak ada | ACTIVE — real nextAction + insight mentor[0]; error → **fallback diam-diam** ke CTA Jalur Cerdas |
| AI BC | `AIBCHomeCard.tsx` | statis | — | "Tanya AI BC" (gold) | tidak ada | ACTIVE — statis |
| Perjalanan Belajar | `LearningJourneySection.tsx` | journey + summary | `/api/player/journey?limit=3`, `/api/murid/dashboard/summary` | 4 link (Jalur Cerdas/Latihan/Simulasi/Tugas) | tidak ada | ACTIVE — journey hanya teks "Aktivitas terakhir" |
| Ruang Belajar | `RuangBelajarSection.tsx` | statis | — | Buka Kelas, Buka Tugas, Materi | tidak ada | ACTIVE — statis |
| Simulasi & Ujian | `SimulasiUjianSection.tsx` | statis | — | 4× "Mulai" | tidak ada | ACTIVE — statis (gate kuota di API kompetensi, server-side) |
| Karya Terbaru | `RecentWorksSection.tsx` | karya feed | `/api/siswa/karya?limit=4` | "Semua Karya" | tidak ada | ACTIVE — empty state ada |
| Arena | `ArenaHomeSection.tsx` | statis | — | "Masuk Arena" (gold) | tidak ada | ACTIVE — murni motivasi, tanpa data XP/rank |
| Kabar Kelas | `SecondaryLearningInfo.tsx` | pengumuman+materi+tugas | `/api/murid/dashboard/summary` (DUPLIKAT fetch) | "Semua", "Tugas" | tidak ada | ACTIVE — empty state ada |
| Heartbeat | `beranda/page.tsx:16-31` | sesi | `/api/user/heartbeat` tiap 5 mnt | — | — | ACTIVE |

# Active Components
StudentHomeHero, ContinueLearningCard, AIBCHomeCard, LearningJourneySection, RuangBelajarSection, SimulasiUjianSection, RecentWorksSection, ArenaHomeSection, SecondaryLearningInfo — semua dirender langsung oleh `murid/beranda/page.tsx`.

# Inactive / Unused Components
| Component | Lokasi | Status |
|-----------|--------|--------|
| `SkillRadar` | `components/arena/player/SkillRadar.tsx` | **MATI** — tidak diimpor halaman mana pun |
| `MentorCard` | `components/arena/player/MentorCard.tsx` | **MATI** — tidak dirender |
| `NextActionCard` | `components/arena/player/NextActionCard.tsx` | **MATI** — tidak dirender (beranda memakai logic `/api/player/session` langsung, bukan komponen ini) |
| `PlayerProvider/PlayerOverlay` | arena-client | TIDAK aktif di shell murid (`app/(dashboard)` tanpa PlayerProvider — polling/reward popup hanya di Arena) |
| `/api/player/next-action` | API | tersedia tapi TIDAK dipanggil beranda (CTA via session.nextAction) |
| `/api/player/skills` | API | tersedia tapi TIDAK dipanggil beranda |
| `MentorCard`/`SkillRadar` di `/arena/player` | player-dashboard.tsx | player-dashboard render RankCard/StreakCard/Quest/Badge/Achievement/Leaderboard/LearningFeedback — TANPA SkillRadar/MentorCard |

# Learning Loop Integration
- **A. API dipanggil beranda**: `/api/player/session` (ContinueLearningCard), `/api/player/journey?limit=3` (LearningJourneySection).
- **B. Tersedia tapi tidak dipakai beranda**: `/api/player/next-action`, `/api/player/skills`, `/api/learning-loop/activity` (server-side saja).
- **C. Komponen konsumen**: ContinueLearningCard (session), LearningJourneySection (journey).
- **D. Personalisasi**: YA — `getNextAction()` rule-based: (1) progress Jalur Cerdas belum selesai ≤30 hari → "Lanjutkan Belajar"; (2) skill terlemah via SKILL_ACTION_MAP; (3) default "Bagikan Karyamu". Insight mentor rule-based (sapaan, konsistensi, skill terlemah, variasi) — deterministik, tanpa LLM ✓.
- **E. Tanpa riwayat**: new student → default CTA "Bagikan Karyamu" → fallback UI "Mulai Belajar di Jalur Cerdas". Aman tapi generic.
- **F. Setelah selesai aktivitas**: `progress` route memanggil `recordActivity` + `refreshNextAction` → CTA diperbarui. Loop TERTUTUP untuk Jalur Cerdas; fitur lain (karya/simulasi) juga memanggil refresh (best-effort).
- **⚠️ Kritis**: tabel learning-loop butuh migration manual `2026-08-01_learning_loop.sql` (dijalankan manual). Jika tabel belum ada, `/api/player/session` error → ContinueLearningCard **fallback diam-diam** ke CTA statis — pengalaman personal hilang tanpa indikasi.

# SkillRadar Integration
- Dirender? **TIDAK** — komponen mati. Data 7 skill (`/api/player/skills`) real (dari LearningSkill XP), tapi tidak tampil di beranda maupun player zone.
- Murid baru: skill kosong → seharusnya "Belum cukup data".
- Dihitung server-side ✓; manipulasi klien tidak mungkin (read-only).
- Klasifikasi: **RED** — ada tapi tidak tersambung.

# Mentor Integration
- "Mentor" saat ini = **rule-based** `generateDailyInsights()` di `lib/learning-loop/session.ts` — sapaan + insight konsistensi/skill/variasi, cache harian (LearningInsight). **Tanpa LLM** ✓.
- Dirender: HANYA `insights[0]` di ContinueLearningCard ("Saran mentor: …"). Tidak ada kartu mentor penuh.
- Personalized ✓ (aktivitas hari ini + skill terlemah). Premium-aware ✗ (tidak ada pembeda). Klasifikasi: **YELLOW** — rule-based nyata tapi permukaan UI minimal.

# Arena Integration
- Beranda: ArenaHomeSection = kartu statis (ikon + CTA "Masuk Arena"), TANPA data XP/rank/streak/next-reward. Data XP/streak ada di Hero (chips) dari `/api/player/profile` ✓.
- Arena sebagai layer terpisah: `/arena` punya quest, leaderboard, competition, player zone — tapi beranda TIDAK menjembatani "120 XP lagi menuju X".
- Klasifikasi: **YELLOW** — motivasi ada (chips), narasi "menuju rank berikutnya" tidak ada di beranda.

# Premium Integration
- Beranda murid: **NOL** kehadiran premium. Tidak ada badge plan, tidak ada kartu upgrade, tidak ada pembeda visual FREE/PRO.
- Server-side: gate kuota simulasi (`app/api/kompetensi/[paketId]` → `consumeUsageGuarded` SIMULATION_MONTHLY_LIMIT 3/10) ✓ canonical premium-economy.
- Jawaban audit: **TIDAK** — Student Home tidak membuat Premium terasa berharga. Premium murid secara produk belum punya fitur eksklusif yang terlihat.

# New Student Journey (FREE BARU)
Login → `/onboarding` (belum onboarded) → `/murid/beranda`: Hero (streak 0, koin 0) → ContinueLearningCard fallback statis "Mulai Belajar di Jalur Cerdas" (karena belum ada riwayat; bila tabel learning-loop ada, CTA default "Bagikan Karyamu") → grid AI BC + 4 link belajar → Ruang Belajar → 4 kartu simulasi → karya kosong (empty state + CTA tulis) → Arena statis → Kabar Kelas kosong.
Friction: tidak ada penjelasan "mulai dari mana" yang personal; CTA emas ≥2 bersaing; simulasi UKBI langsung tersedia tanpa konteks.

# Returning Student Journey (FREE)
Beranda: Hero real (streak/koin/XP) → ContinueLearningCard personal (nextAction + insight) → belajar → kembali beranda → CTA diperbarui (refreshNextAction di progress route) ✓ loop tertutup untuk Jalur Cerdas.
Friction: tidak ada ringkasan "hari ini kamu meningkatkan X"; skill radar tidak terlihat; setelah simulasi, CTA "lanjutkan" tidak menonjol.

# Premium Student Journey
IDENTIK dengan free — tidak ada perbedaan visual/fitur di beranda. Satu-satunya pembeda: kuota simulasi 10/bulan (tak terlihat) + (guru) kredit AI. Murid premium tidak merasakan "lebih personal".

# Cognitive Load
- CTA emas (dominan) di beranda: **3** — "Lanjut Belajar", "Tanya AI BC", "Masuk Arena".
- Kartu/aksi kompetitor: ~15 kartu + 4 link Perjalanan + 2 tombol Ruang Belajar + 4 tombol simulasi + 2 link Kabar Kelas + 6 nav sidebar + 5 bottom nav + floating AI.
- Jawaban "What should I do now?": **PARTIAL** — ContinueLearningCard menjawab, tetapi terkubur di bawah kompetisi visual (AI BC & Arena sama-sama emas, plus 4 kartu simulasi "Mulai").

# Mobile
- Layout: grid `grid-cols-1` mobile ✓; bottom nav 5 tab ✓; CTA `py-3` touch-friendly ✓; `text-[10px]/[11px]` kecil (readability lemah); `px-btn-gold` CTA bisa terlalu sempit di layar kecil.
- Overflow: tidak terdeteksi dari kode (mx-auto max-w-[1200px] + truncate/line-clamp). **BROWSER VERIFICATION = NOT AVAILABLE** — tidak ada tooling browser yang bisa saya jalankan; klaim produksi mobile tidak bisa diverifikasi.

# Performance
- Total API call beranda: 7 distinct (`heartbeat`, `player/profile`, `user/me`, `player/session`, `player/journey`, `dashboard/summary` **×2 = duplikat**, `siswa/karya`).
- Tidak ada N+1 server-side yang terlihat (query terbatas). Tidak ada polling berlebih (heartbeat 5 mnt, wajar). Duplikat summary = pemborosan kecil.
- Rekomendasi: gabungkan `dashboard/summary` menjadi 1 fetch (atau naikkan ke server component), dan satukan `player/profile` + `user/me` bila kontrak stabil.

# Loading / Empty / Error
| Section | LOADING | EMPTY | ERROR | SUCCESS |
|---------|---------|-------|-------|---------|
| Hero | skeleton ✓ | — | "Gagal memuat profil" ✓ | ✓ |
| ContinueLearning | skeleton ✓ | — | **fallback diam-diam** (tidak ada state error/retry) | ✓ |
| AI BC | — (statis) | — | — | ✓ |
| Perjalanan | — | teks tetap (tanpa aktivitas terakhir) | catch → entries [] (diam) | ✓ |
| Simulasi | — | — | — | ✓ (statis) |
| Karya | — | empty state ✓ | catch → [] | ✓ |
| Kabar Kelas | — | empty ✓ | catch → null | ✓ |

# Accessibility
- Section `aria-label` ✓; Link/button semantik ✓; fokus default browser (tanpa visible focus custom); ukuran teks 10-11px di banyak label = kontras/readability lemah; icon dekoratif tanpa `aria-hidden` di beberapa tempat; chips streak/koin memakai `title` (hover-only, screen reader kurang).

# My Day Gap Analysis
| Kebutuhan | Status |
|-----------|--------|
| 1. Apa yang harus kulakukan sekarang? | PARTIAL — CTA personal ada tapi bersaing |
| 2. Kenapa harus melakukannya? | PARTIAL — insight mentor 1 kalimat (fallback diam saat gagal) |
| 3. Berapa lama? | MISSING — tidak ada estimasi waktu |
| 4. Apa yang akan kutingkatkan? | MISSING — skill tidak ditampilkan |
| 5. Apa yang sudah kucapai? | PARTIAL — chips XP/streak tanpa narasi |
| 6. Apa berikutnya setelah selesai? | PARTIAL — loop CTA tertutup untuk Jalur Cerdas saja |

# Product Experience Score (0 missing / 1 weak / 2 adequate / 3 strong)
| Dimensi | Skor | Alasan |
|---------|------|--------|
| 1. Personal | 2 | nextAction + insight personal ada, tapi skill/konteks tak terlihat |
| 2. Clear | 1 | 3 CTA emas + ~15 kartu; hierarki tidak menjawab satu pertanyaan |
| 3. Intelligent | 2 | rule-based insight nyata, tanpa "AI" palsu — tapi permukaannya 1 kalimat |
| 4. Encouraging | 2 | sapaan mentor + streak, tapi tidak ada "meningkat apa" |
| 5. Progress-aware | 2 | XP/streak/koin + journey, tanpa skill/radar |
| 6. Action-oriented | 2 | CTA personal ✓ tapi tenggelam dalam kompetisi |
| 7. Premium-worthy | 0 | premium tidak terlihat sama sekali di beranda |

# Priority Matrix
**P0 (blokir belajar / perilaku salah):**
1. ContinueLearningCard fallback diam-diam saat `/api/player/session` gagal (tabel belum dimigrasikan) — tambahkan error/retry state + pastikan migration learning-loop diterapkan di semua environment (dokumentasi).

**P1 (kualitas learning companion):**
2. Satu CTA dominan: turunkan AI BC & Arena dari emas; buat hierarchy "Mulai Sekarang" tunggal.
3. Tampilkan "kenapa": insight mentor penuh (bukan 1 kalimat) + skill terlemah di CTA.
4. SkillRadar (komponen existing mati) dipasang — data `/api/player/skills` real; empty state "Belum cukup data. Mulai satu latihan…".
5. Arena motivasi berdata: "X XP lagi menuju rank berikutnya" (pakai `getLevelProgress`/`nextRankOf` existing).
6. Premium presence ringan: badge plan/status dari `/api/player/premium/status` + nilai "analisis lebih mendalam" tanpa paywall agresif.
7. Hapus duplicate fetch `dashboard/summary`.

**P2 (polish):**
8. Estimasi waktu per CTA (bila data ada). 9. Ringkasan "hari ini kamu meningkatkan X" di akhir sesi. 10. Accessibility teks 10-11px → 12px minimum, visible focus. 11. Browser verification mobile.

---

# CURRENT MY DAY STATUS
**RED** (menuju YELLOW) — fondasi ada & sebagian terhubung, tetapi beranda = dasbor fitur; skill/mentor mati; premium tak terlihat.

1. **Learning companion?** TIDAK — lebih dekat ke dasbor fitur dengan satu CTA personal.
2. **Tahu langkah berikutnya?** YA (rule-based, dari Learning Loop) — tapi mudah tenggelam dan diam-diam generic saat API gagal.
3. **Menjelaskan kenapa?** PARTIAL — 1 kalimat insight, tanpa skill/konteks visual.
4. **Progres bermakna?** PARTIAL — XP/streak/koin, tanpa skill.
5. **Learning ↔ Arena terhubung?** PARTIAL — chips data di Hero, tapi Arena = kartu statis tanpa narasi progres.
6. **Premium berbeda secara bermakna?** TIDAK — nol kehadiran di beranda murid.
7. **Perubahan minimum menuju excellent:** (a) CTA dominan tunggal + error state jujur, (b) pasang SkillRadar + insight penuh (komponen sudah ada), (c) Arena motivasi berdata, (d) badge premium + nilai, (e) hapus fetch duplikat.

# STEP 2 IMPLEMENTATION PLAN
- **P0**: error/retry ContinueLearningCard; verifikasi migration learning-loop di semua env (dokumentasi saja — bukan implementasi baru).
- **P1**: restruktur beranda (1 CTA dominan); pasang SkillRadar & insight mentor; Arena motivasi berdata; premium badge ringan; konsolidasi fetch.
- **P2**: estimasi waktu; ringkasan pencapaian harian; a11y; browser verification.

---

## IMPLEMENTATION STATUS (Step 2B — SELESAI)

| Gap audit | Tindakan 2B | Status |
|-----------|-------------|--------|
| P0 session fallback diam-diam | ContinueLearningCard: states loading/error/empty eksplisit + retry "Coba Lagi"; error ≠ personalisasi palsu | ✅ |
| 3 CTA emas bersaing | Satu CTA emas hanya di ContinueLearningCard; AI BC & Arena → ghost | ✅ |
| SkillRadar/MentorCard mati | Diintegrasikan ke beranda (SkillRadar seksi skill; MentorCard via data prop tanpa fetch duplikat) | ✅ |
| Arena statis | ArenaHomeSection kini berdata nyata: "X XP lagi menuju rank" | ✅ |
| Premium nol | PremiumValueCard (status canonical server): PRO badge + trial label; free = satu baris nilai | ✅ |
| Fetch duplikat summary/profile | home-data.tsx — satu context fetch untuk profile/me/summary | ✅ |
| SkillRadar error diam | error state + retry | ✅ |
