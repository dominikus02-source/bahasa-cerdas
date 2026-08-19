# MURID HOME 3.0 — ARCHITECTURE AUDIT

> Status: AUDIT + IMPLEMENTATION (UI composition additive) — Aug 19, 2026
> Keputusan: **DO NOT create new engine / API / DB.** Arsitektur existing sudah cukup; hanya komposisi UI yang disempurnakan.

## CURRENT HOME

`app/(dashboard)/murid/beranda/page.tsx` (client, `HomeDataProvider`) — urutan render:
1. `StudentHomeHero` (sapaan, RankChip, XP bar compact, avatar)
2. `ContinueLearningCard` — **Aksi Hari Ini (sudah = Next Best Action)**
3. `DailyMissionCard` (quest harian)
4. Grid 2 kolom: `SkillRadar` (7 skill) | (`ArenaHomeSection` + `PremiumValueCard`)
5. Grid 2 kolom: `AIBCHomeCard` | `LearningJourneySection`
6. `RuangBelajarSection` → `SimulasiUjianSection` → `RecentWorksSection` → `SecondaryLearningInfo`

## CURRENT DATA SOURCES

| Data | Sumber | Dipakai oleh |
|------|--------|--------------|
| Profil + rank + XP + streak | `GET /api/player/profile` (home-data) | Hero, ArenaHomeSection |
| Next Best Action + reason + mentor | preview `adaptive-practice` + `diagnostic` (merged di home-data, ADAPTIVE menang) | ContinueLearningCard + MentorCard |
| 7 skill (LearnerSkillState, trend, accuracy) | `myDay.learnerState` dari preview (tanpa fetch tambahan) | SkillRadar |
| Journey harian | `GET /api/player/journey?limit=3` (self-fetch) | LearningJourneySection |
| Tugas/pengumuman/materi | `GET /api/murid/dashboard/summary` (home-data) | Journey badge, SecondaryLearningInfo |
| Quest harian | `GET /api/player/quests` (self-fetch + claim) | DailyMissionCard |
| Karya murid | `GET /api/siswa/karya?limit=4` (self-fetch) | RecentWorksSection |
| Premium/kuota | `GET /api/player/premium/status` (home-data) | PremiumValueCard |

## LEARNING LOOP (lib/learning-loop/)

`skills.ts` (7 skill + level dari XP), `activity.ts` (`recordActivity` transaksional + journey + refresh CTA), `journey.ts` (dayKey WIB), `recommend.ts` (SKILL_ACTION_MAP, LearningRecommendation max 3), `next-action.ts` (`refreshNextAction`/`getNextAction` → PlayerCTA), `session.ts` (mentor rule-based `generateDailyInsights`), `evidence.ts` (LearningEvidence), `client-events.ts`. Semua best-effort try/catch.

## NEXT ACTION

**Existing** — dua lapisan:
1. `player/next-action` (PlayerCTA, priority 90 = Jalur Cerdas jika unit aktif; fallback skill terlemah) — `NextActionCard` (`components/arena/player/NextActionCard.tsx`) **orphaned** (0 penggunaan).
2. Assessment Engine 2.0 preview (ADAPTIVE_PROFILE → personalization + reasoning) — sudah dominan di carte "Aksi Hari Ini".

Keduanya tidak digabung — tidak perlu dicebut; bagian UI home memakai lapisan 2 (lebih personal), lapisan 1 tetap sebagai CTA lintas-halaman.

## RECOMMENDATION ENGINE

**Existing** — `lib/learning-loop/recommend.ts` (rule-based, tanpa LLM) + `lib/diagnostic/personalization.ts` (target skill dari profil berbukti, confidence ladder). Tidak membuat engine baru.

## SKILL DATA

`LearnerSkillState[]` (7 skill: label, attemptCount, accuracy, trend IMPROVING/STABLE/DECLINING/INSUFFICIENT_DATA, confidence, masteryState) — tersedia **langsung di `myDay.learnerState`**, tanpa fetch tambahan.

## ACTIVITY DATA

`PlayerActivity` (log granular) + `XPTransaction` + `CoinTransaction` — via `/api/player/xp/history`, `/api/player/coin/history`, `/api/player/notifications`.

## JOURNEY DATA

`LearningJourney[]` per hari (WIB) via `/api/player/journey`.

## EXISTING CTA

`px-btn-gold` (satu-satunya di home: ContinueLearningCard — di-lock test), `px-btn-ghost` (AIBCHomeCard, ArenaHomeSection), link-links sekunder di tiap section.

## REUSABLE COMPONENTS

`ContinueLearningCard` (NBA), `SkillRadar`, `MentorCard`, `NextActionCard` (orphaned), `XpProgressBar`, `RankChip`, `StreakCard`, `DailyMissionCard`, `LearningJourneySection`, semua px-* token (player-theme).

## DUPLICATION RISKS

1. SkillRadar (myDay.learnerState) vs `/api/player/skills` — jangan fetch dua sumber skill.
2. home-data single-source: jangan buat fetch preview/adaptive/diagnostic di luar home-data.
3. NextActionCard (lapisan 1) vs ContinueLearningCard (lapisan 2) — potensi dua "aksi" di satu layar; dipakai beda konteks.
4. Journey static items vs grid section lain — tidak menambah item.

## MISSING DATA

1. **Posisi Jalur Cerdas (Level X, Unit Y dari Z)** — tidak ada endpoint existing (hanya `[unitId]`). Gap dicatat; tidak membangun API baru (spesifikasi: hanya pakai jika ada).
2. Refresh push CTA setelah action selesai — tersedia via `refreshMyDay()` (re-fetch); tidak ada push realtime (best-effort cukup).

## RECOMMENDED ARCHITECTURE

Tetap: satu provider + 4 fetch utama. Penyempurnaan:
1. **Dominasi NBA** — kartu adaptive menampilkan skill target (bar akurasi) + "Kenapa?" jelas, semua dari data preview existing.
2. **Urutan LEARNING → PROGRESS → JOURNEY → MOTIVASI → DISCOVERY** — pindahkan Misi Harian (motivasi) ke setelah grid perjalanan.
3. Tanpa API/DB baru.

## NEW API REQUIRED: **NO**
## NEW DATABASE REQUIRED: **NO**