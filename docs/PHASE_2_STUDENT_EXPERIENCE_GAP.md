# PHASE 2 STUDENT EXPERIENCE GAP

Tujuan: memetakan apa yang SUDAH ada vs belum tersambung untuk "BC knows me" (Premium Phase 2). BUKAN implementasi.

## 1. What Already Exists
- **Learning Loop** (`lib/learning-loop/`): LearningSkill (7 skill), PlayerActivity, LearningJourney, LearningRecommendation (rule-based, maks 3, TTL 7 hari), PlayerCTA (next action), LearningInsight (mentor harian rule-based) + API `/api/player/{next-action,skills,journey,session}` + komponen NextActionCard, MentorCard, SkillRadar (terpasang di beranda Arena).
- **Gamification**: XP/Rank/Level/Streak/Koin/Badge/Achievement/Leaderboard/Quest (player zone).
- **Premium Economy**: FREE/PRO/FOUNDER + entitlement matrix + usage quota (SIMULATION enforced; AI via kredit AiCreditLedger).
- **AI BC**: konteks pengguna (profil, skill terlemah, kelas) masuk ke chat (guru) + murid.
- **Simulasi UKBI/TKA**: randomization + anti-repeat + snapshot + Dokumen Hasil Latihan.

## 2. What Is Disconnected
1. **Beranda murid (`/murid/beranda`)** belum menampilkan: NextActionCard, MentorCard, SkillRadar — semuanya hanya di Arena (`/arena` + player zone). Loop belajar mati di pintu utama murid.
2. **AI BC murid** tidak membaca skill terlemah sebagai rekomendasi prompt (konteks guru lebih kaya dari murid).
3. **Premium status** tidak tampil di beranda murid (badge/kartu upgrade tidak ada — hanya guru).
4. **Skill Radar** tidak dipakai hasil simulasi UKBI/TKA (section scores ada, tapi tidak di-map ke 7 LearningSkill).
5. **Missions/Quests** belum menyatu dengan Next Action (quest harian statis vs CTA dinamis).

## 3. What Is Duplicated
- `resolveUserAiPlan` (AI gateway) vs `resolvePlan` (premium-economy) — DUA resolver plan. Keduanya sah untuk domain berbeda (kredit AI vs entitlement fitur), tapi UI premium murid harus memilih SATU kanonik → rekomendasi: `lib/premium-economy` untuk semua gating fitur, `resolveUserAiPlan` tetap untuk kredit generator AI saja (didokumentasikan).

## 4. What Should Become the Primary CTA
**"Lanjutkan Belajar"** — NextAction dari Learning Loop (skill terlemah → aksi spesifik). Semua reward/result screen harus berujung ke CTA ini (Jalur Cerdas, hasil UKBI/TKA, selesai tugas, hasil gim).

## 5. What Should Be Hidden
- Skill Radar/Mentor di HANYA Arena (duplikasi di dua tempat tidak boleh; pilih satu permukaan primer = beranda murid, Arena tetap boleh menampilkan versi ringkas).

## 6. What Should Be Premium
| Fitur | FREE | PRO (Premium Murid) |
|-------|------|---------------------|
| Jalur Cerdas inti | ✓ | ✓ |
| Simulasi UKBI/TKA | 3/bulan (sudah) | 10/bulan (sudah di matrix) |
| Mentor harian (insight rule-based) | ✓ ringkas | ✓ penuh + riwayat |
| Skill Radar detail & rekomendasi | ✓ ringkas | ✓ analisis per-skill + rencana mingguan |
| AI BC | ✓ | ✓ (kredit AI tetap via ledger) |
| Adaptive Practice Engine | — | (Phase 2 — BUKAN fase ini) |

## 7. What Should Remain Free
Semua mekanik belajar inti (Jalur Cerdas, karya, gim solo, arena), XP/rank/badge/streak, obrolan kelas, tugas guru. Premium murid = kedalaman personalisasi, bukan paywall fitur belajar dasar.
