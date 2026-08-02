# LEARNING LOOP REPORT — Sprint 5 (Aug 1, 2026)

Learning Loop Engine menghubungkan semua fitur BahasaCerdas ke satu putaran
belajar yang tidak putus: **Belajar → Berlatih → Berkarya → Berinteraksi →
Berkompetisi → Umpan Balik → Belajar Lagi.** Setiap aktivitas selesai, user
selalu tahu langkah berikutnya (PlayerCTA) dan sistem mencatat progress skill.

## Prinsip

1. **Additive-only** — 6 tabel baru + 3 enum. Tidak ada satu pun tabel/kolom
   lama yang diubah. Gamification Engine Phase 1–2 (XP/koin/badge/achievement/
   leaderboard) TIDAK disentuh — hanya dikonsumsi.
2. **Server tidak percaya angka klien** — semua pencatatan via server-side
   (`recordActivity` dipanggil di route feature), endpoint publik read-only.
3. **Best-effort** — kegagalan logging tidak pernah menggagalkan aksi utama.
4. **Rule-based, gratis** — rekomendasi & insight mentor berbasis aturan, tanpa
   panggilan LLM (tanpa quota/rate limit).

## Schema Baru (prisma/schema.prisma)

| Model | Fungsi |
|-------|--------|
| `LearningSkill` | Level 1–100 per skill (READING/WRITING/LISTENING/SPEAKING/GRAMMAR/VOCABULARY/LITERATURE), computed dari skill XP. |
| `PlayerActivity` | Log granular aktivitas (type/subtype/skill/skillDelta/xp/coin/meta/reference). |
| `LearningJourney` | Timeline belajar per hari (dayKey WIB). |
| `LearningRecommendation` | Rekomendasi aktif (maks 3, TTL 7 hari). |
| `PlayerCTA` | Satu "Aksi Berikutnya" per user (di-upsert). |
| `LearningInsight` | Insight mentor harian (cache per userId+dayKey). |

Enum baru: `LearningSkillType`, `ActivityType` (17 nilai), `RecommendationType`.
Migration: `prisma/migrations/manual/2026-08-01_learning_loop.sql` (idempoten,
jalankan di Supabase SQL Editor).

## Engine (`lib/learning-loop/`)

| File | API |
|------|-----|
| `skills.ts` | `SKILL_LABELS`, `SKILL_ICONS`, `skillLevelFromXp`, `detectUnitSkill(title)`, `applySkillGains`, `getSkillProfile` |
| `activity.ts` | `recordActivity(input)` (tx: PlayerActivity + LearningSkill + LearningJourney, lalu segarkan CTA), `getRecentActivity` |
| `journey.ts` | `dayKeyWIB`, `addJourneyEntry`, `getJourney` |
| `recommend.ts` | `SKILL_ACTION_MAP` (7 skill → aksi), `generateRecommendations`, `getActiveRecommendations` |
| `next-action.ts` | `refreshNextAction` (Jalur Cerdas berjalan → skill terlemah → fallback tulis karya), `getNextAction` |
| `session.ts` | `generateDailyInsights` (rule-based mentor), `getSessionSummary` |

## API Baru

| Route | Fungsi |
|-------|--------|
| `POST /api/learning-loop/activity` | Pencatatan aktivitas (role-gated, validasi enum). |
| `GET /api/player/next-action` | CTA terbaik saat ini. |
| `GET /api/player/skills` | Profil 7 skill. |
| `GET /api/player/journey` | Timeline belajar (cursor-less, limit). |
| `GET /api/player/session` | Ringkasan sesi (mentor + statistik hari ini). |

## UI Baru (`components/arena/player/`)

- `NextActionCard` — kartu CTA "Berikutnya" (mengarah ke aksi terbaik).
- `MentorCard` — sapa "Mentor BC" + insight harian + statistik.
- `SkillRadar` — baris 7 skill, skill terlemah disorot.
- Dipasang di **beranda Arena** (`app/arena/page.tsx`).

## Wire ke Flow (dead end ditutup)

| Flow | Perubahan |
|------|-----------|
| Jalur Cerdas lesson selesai | `progress` route catat aktivitas+skill+rekomendasi+CTA, kembalikan `nextUnitId`; layar complete tampil tombol **"Lanjut ke unit berikutnya"**. |
| Jalur Cerdas 100% | Kotak "Siap untuk UKBI!" kini punya tombol **"Coba Simulasi UKBI"** + "Lihat Profil Pemain". |
| Publikasi Karya | `POST /api/siswa/karya` catat aktivitas KARYA + skill WRITING + segarkan CTA (umpan balik quest/misi). |
| Hasil UKBI/TKA | **Bug diperbaiki**: path dokumen hasil untuk guru (`certHref`). Rekomendasi kini menunjuk bagian terlemah + tautan Jalur Cerdas. |
| Hasil kuis murid | Kartu "Lanjutkan Belajar" (Jalur Cerdas + Tulis Karya). |
| Tugas selesai | Tombol "Lanjutkan Belajar". |
| Misi Harian | Setiap cara dapat koin kini menaut ke fitur terkait. |
| League | Footer CTA "Naikkan peringkatmu!" (Main Game / Latihan). |
| Misi harian dinamis | `lib/coins.ts` mempersonalisasi pilihan quest dari `PlayerActivity` 7 hari (prefer menulis jika belum ada karya minggu ini). |

## Verifikasi

| Check | Hasil |
|-------|-------|
| `npx prisma validate` | ✅ Valid |
| `npx prisma generate` | ✅ Client regenerasi (model baru tersedia) |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS (engine Phase 1 tak terganggu) |
| `npm run build` (dummy env) | ✅ **336 routes, 0 errors** (naik dari 331) |

## Cara Pakai di Fitur Baru

```ts
import { recordActivity } from "@/lib/learning-loop/activity";
import { refreshNextAction } from "@/lib/learning-loop/next-action";

// Di route feature, best-effort setelah aksi sukses:
recordActivity({
  userId, type: "LESSON", subtype: "KUIS_SELESAI",
  skill: "GRAMMAR", skillDelta: 5, xp: 20, coin: 5,
  meta: { quizId }, reference: "quiz-<id>-selesai",
  journey: { title: "Kuis selesai", icon: "zap" },
}).catch(() => {});
refreshNextAction(userId).catch(() => {});
```

## Remaining (di luar scope)

1. UKBI Guru → 150 (menulis 8 + berbicara 7 constructed response).
2. TKA UTBK/Guru enrichment 30 → 150.
3. Game server revival (VPS mati) → pasang `recordActivity` di layar game end.
4. GameRoom migration SQL via Supabase dashboard.
