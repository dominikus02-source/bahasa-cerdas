# Leaderboard Motivation Layer — Kompetisi Mingguan, Season, & Hall of Fame

Status: **SELESAI** — live sebelum Senin 10 Agustus 2026 00:00 WIB.
Prinsip: **Additive-only** — XP total/level/rank TIDAK pernah di-reset, `weeklyXP`
reset hanya lazy (mengubah arti view, bukan data), tidak ada engine XP kedua,
tidak ada XP untuk buka halaman/spam. Tanpa commit/push/deploy (menunggu
instruksi terpisah).

---

## 1. Kompetisi 3 Level

| Level | Kunci | Rentang | Ordering | Peserta |
|-------|-------|---------|----------|---------|
| A. Mingguan | `weekKey` `"2026-W31"` | Senin 00:00 WIB – Minggu 23:59:59.999 WIB | `weeklyXP` DESC, tie-break `totalXP` DESC | `role === "MURID"` |
| B. Season | `seasonPeriodKey` `"2026-S1"` | 4 minggu (W1–W4, W5–W8, …) | `seasonXP` DESC, tie-break `totalXP` DESC | `role === "MURID"` |
| C. Hall of Fame | `LeaderboardPeriodResult` | Permanen (record pemenang) | — | record per periode |

### Kunci periode (`lib/gamification/season.ts`)
- `mondayWibOfIsoWeek(year, week)` — Senin 00:00 WIB dari ISO week (mengikuti
  aturan "minggu yang memuat Kamis pertama / 4 Januari"). Konsisten dengan
  `weekKey` yang sudah dipakai leaderboard (W01 dapat memuat 29–31 Desember
  tahun sebelumnya, benar secara ISO).
- `weekKey(date?)` → `"2026-W01"` s.d. `"2026-W53"` (zero-padded).
- `weekRange(key)` → `{ startsAt, endsAt }` (startsAt Senin 00:00 WIB,
  endsAt Minggu 23:59:59.999 WIB). Kompetisi baru dimulai otomatis: klien
  hanya membaca `weekKey()` saat ini — **tidak ada XP yang dihapus**.
- `seasonPeriodKey(date?)` → `"2026-S01"` s.d. `"2026-S13"` (13 = sisa minggu
  di akhir tahun; `S01`/`S02` dst zero-padded).
- `seasonRange(key)` → rentang 4 minggu; `previousWeekKey`, `previousSeasonKey`,
  `nextWeekKey`, `weekLabel`, `seasonLabel`, `mondayWibOfIsoWeek` (export).
- Label Hall of Fame: `"Agustus 2026 — Minggu 1"` / `"2026 — Season 2"`.

## 2. Reward Podium (idempotent, tanpa XP loop)

`lib/gamification/podium-rewards.ts` — `settleLeaderboardIfDue()`,
`settlePeriod(type, key)`, `grantPodiumRewards(...)`, `getHallOfFame(limit)`.

| Podium | XP (total) | Coin | Badge |
|--------|-----------|------|-------|
| 🥇 | +300 | +300 | `weekly-champion` |
| 🥈 | +200 | +200 | `weekly-runner-up` |
| 🥉 | +100 | +100 | `weekly-third` |
| 🥇 Season | +500 | +500 | `season-champion` |
| 🥈 Season | +350 | +350 | `season-runner-up` |
| 🥉 Season | +250 | +250 | `season-third` |

- Reward **hanya menambah XP total** (`User.xp` + `PlayerProfile.totalXP`)
  + `XpLedger`/`XPTransaction` source `"PODIUM"` + level/rank resmi (via
  `applyXp`/`rankFromLevel`). **Tidak menyentuh** `weeklyXP`/`seasonXP` —
  tidak ada loop XP mingguan/season.
- Standings periode dihitung dari `XPTransaction.groupBy` (append-only, bukan
  field yang lazy-reset); source `"PODIUM"` sengaja **dikecualikan** dari
  standings agar reward tidak mempengaruhi periode berjalan.
- Settlement **lazy tanpa cron**: dipanggil pada akses `getWeeklyCompetition`
  dan `GET /api/player/leaderboard`. Memo Redis `bca:lb-settle:{type}:{key}`
  TTL 3600 + backstop DB (count `LeaderboardPeriodResult` untuk key tsb) +
  transaksi idempotent (P2002 di-catch). Aman dipanggil berulang.

## 3. Hall of Fame

- Tabel `LeaderboardPeriodResult` (migration `2026-08-09_leaderboard_motivation.sql`):
  `id`, `userId`, `periodType` (`WEEKLY`/`SEASON`), `periodKey`, `rank`, `score`,
  `name` (snapshot), `badgeCode`, `settledAt`; `@@unique([periodType, periodKey, rank])`
  + index `(periodType, periodKey)`.
- `getHallOfFame(limit)` → entri terbaru (label via `mondayWibOfIsoWeek`),
  dipakai preview di `CompetitionHero` dan tab penuh di `/arena/league`.

## 4. Motivasi Personal & Anti-Dead Leaderboard

`lib/gamification/motivation.ts` — `getWeeklyCompetition(userId)`:
- Payload `WeeklyCompetitionPayload` (lihat file) — `weekKey/label`,
  `seasonKey/label`, `weekInSeason` (1–4), `periodStartsAt/EndsAt`,
  `seasonEndsAt`, `now` (baseline server), `totalParticipants`,
  `top` (dari `getLeaderboard` WEEKLY), `my`, `above`, `below`, `gapToNext`,
  `groups` (XP transparency), `hallOfFame`.
- Anti-dead: top 3 + posisi user + 1 di atas + 1 di bawah + total peserta + gap XP.
- Ranking deterministik: count strictly-above via
  `weeklyXP > my OR (weeklyXP = my AND totalXP > my)`, rank = count+1.
- `podiumStatusMessage({ rank, total, weeklyXp, gapToNext })` — pesan motivasi
  pure Bahasa Indonesia (juara 1 / posisi 2 / podium / belum XP / top 10 / umum).
- Normalisasi lazy-reset: `weeklyXPWeekKey === wk ? weeklyXP : 0`.

`app/api/arena/competition/route.ts` — role-gated (`getUser()`), murid melihat
kompetisinya, guru/founder mendapat versi tanpa `my`.

## 5. Countdown WIB (hydration-safe)

`components/arena/player/WeeklyCountdown.tsx` — client component:
- Menerima `endsAt` (ISO absolut dari server) + `baseline` (`now` server).
- Saat render awal (SSR) menghitung sisa = `endsAt - baseline` → hasil identik
  server dan klien (deterministik, `suppressHydrationWarning`).
- Setelah mount baru pakai `Date.now()` dengan interval 1 detik.
- Format `2 hari 6 jam 4 menit`, fallback "—" bila habis. WIB ditentukan
  server (`weekRange`/`seasonRange` ber-offset UTC+7), bukan klien.

## 6. XP Transparency

`lib/gamification/xp-transparency.ts` — `getWeeklyXpBreakdown(userId)`:
- Agregasi read-only `XPTransaction` (sumber `"PODIUM"` dikecualikan) minggu ini.
- Kelompok: 📚 BELAJAR / 🎮 BERMAIN / ✍️ BERKARYA / 🔥 KONSISTENSI
  (+ LAINNYA untuk source tak dikenal). `share` % dihitung client dari total.
- Hanya membedah angka; tidak mengubah nilai XP apa pun.

## 7. Keamanan & Integritas

- **Faucet XP publik dikunci**: `POST /api/player/xp` hanya `ADMIN`/`isFounder`
  + `reference` wajib. `awardXp` tetap satu-satunya pintu internal.
- `weeklyXP` hanya bisa bertambah via `awardXp` (progres kunci minggu dicek);
  `PlayerProfile.totalXP` = cermin `User.xp`, tidak pernah di-reset.
- Cache key leaderboard & league-mini ber-period (mengandung `weekKey`;
  `periodKeyFor()` di `lib/gamification/leaderboard.ts`, `CACHE_VERSION "v3"`).

## 8. UI

- `components/arena/player/CompetitionHero.tsx` — hero kompetisi di
  `/arena/league`: header gradien (label minggu, week 1–4, countdown),
  kartu "Peringkatmu", podium top 3, above/below, total peserta + countdown
  season, XP transparency bars, Hall of Fame preview, CTA.
- `components/arena/player/WeeklyCountdown.tsx` — countdown hydration-safe.
- `app/arena/league/league-tabs.tsx` — tab ketiga "🏅 Hall of Fame".
- `app/arena/league-mini.tsx` — chip "Peringkatmu #N" + "Sisa <countdown>".
- `app/arena/page.tsx` — kartu "Kompetisi Minggu Ini" (peringkat/XP/sisa/gap/CTA).

## 9. Verifikasi

| Check | Hasil |
|-------|-------|
| `npm run test:leaderboard-motivation` | ✅ SEMUA LULUS |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:guru-phase` | ✅ SEMUA LULUS |
| `npm run test:simulation-workflow` | ✅ 55/55 |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (8 file baru/diubah) | ✅ 0 errors (3 warning `<img>` — konsisten konvensi arena) |
| `npm run build` (dummy env) | ✅ 362 routes, exit 0 |
| `npx prisma validate` / `generate` | ✅ Valid |

Catatan QA: 3 kegagalan awal pada `scripts/test-leaderboard-motivation.ts`
adalah ekspektasi test, bukan bug kode — `seasonPeriodKey` mengembalikan kunci
zero-padded (`"2026-S01"`, bukan `"2026-S1"`) dan assertion static `weeklyXP`
mencocokkan komentar file. Test diperbaiki (assert `"2026-S01"`,
`!/weeklyXP:|seasonXP:/`), kode tidak berubah.

## 10. Deployment Checklist

1. Jalankan `prisma/migrations/manual/2026-08-09_leaderboard_motivation.sql`
   di Supabase SQL Editor (PRODUCTION + PREVIEW) — membuat tabel
   `LeaderboardPeriodResult` + 6 badge podium.
2. (Opsional) `npm run seed:podium-badges -- --execute` bila ingin bypass SQL.
3. Deploy ke Vercel; verifikasi `/arena/league` + beranda Arena.
4. Kompetisi mingguan otomatis hidup dari Senin 00:00 WIB tanpa data reset.

## Remaining (di luar fase ini)
1. TKA UTBK/Guru enrichment 30 → 150
2. Game server revival (VPS mati)
3. GameRoom migration SQL via Supabase dashboard
4. UI game solo: badge-score client vs server masih beda (kosmetik)
