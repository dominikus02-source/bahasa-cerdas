// Unit test LEADERBOARD MOTIVATION LAYER (BC Arena).
//
// Lapisan 1 — logika murni (season range, podium rewards, status message,
//             XP source grouping) — impor fungsi asli, TANPA DB.
// Lapisan 2 — keamanan statis (pola kode wajib) — memastikan:
//   • reward podium TIDAK menulis weeklyXP/seasonXP (no XP loop),
//   • settlement idempotent (unique per type+key+user) + memo + backstop DB,
//   • standings periode dari XPTransaction & sumber PODIUM dikeluarkan,
//   • leaderboard papan periode lazy-reset (weeklyXPWeekKey / seasonPeriodKey),
//   • cache key ber-period (tidak ada cache kedaluwarsa melintasi reset),
//   • faucet XP publik dikunci (hanya ADMIN/founder + reference wajib),
//   • XP total / level / rank TIDAK pernah di-reset.
//
// Tidak butuh koneksi DB. Jalan di CI bersama suite lain.
import { readFileSync } from "fs";
import { join } from "path";
import { weekKey, seasonPeriodKey, weekRange, seasonRange, previousWeekKey, previousSeasonKey, mondayWibOfIsoWeek, weekLabel, seasonLabel } from "@/lib/gamification/season";
import { podiumRewardFor, previousPeriodKey, isPeriodClosed } from "@/lib/gamification/podium-rewards";
import { podiumStatusMessage } from "@/lib/gamification/motivation";
import { XP_GROUPS, xpGroupOfSource } from "@/lib/gamification/xp-transparency";

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};

// ── 1. Rentang periode (pure) ───────────────────────────────────────────────
// Konsistensi weekKey ↔ weekRange: rentang minggu "W31" memuat semua tanggal
// yang weekKey()-nya W31, dan 1ms setelah endsAt sudah jadi minggu berikutnya.
const rW31 = weekRange("2026-W31");
ok("weekRange W31 mulai Senin (mondayWibOfIsoWeek)", rW31.startsAt.getTime() === mondayWibOfIsoWeek(2026, 31).getTime());
ok("weekRange W31 = 7 hari penuh (Senin 00:00 WIB → Minggu 23:59:59.999 WIB)", rW31.endsAt.getTime() === rW31.startsAt.getTime() + 7 * 86400000 - 1);
ok("weekKey(startsAt W31) = 2026-W31", weekKey(rW31.startsAt) === "2026-W31");
ok("weekKey(endsAt W31) = 2026-W31 (Minggu 23:59:59.999 masih dalam minggu)", weekKey(rW31.endsAt) === "2026-W31");
ok("weekKey(endsAt + 1ms) = minggu berikutnya", weekKey(new Date(rW31.endsAt.getTime() + 1)) === "2026-W32");

// Menyeberangi tahun: minggu ke-1 tahun berikutnya punya minggu sebelumnya
// di tahun sebelumnya.
const rW01_2026 = weekRange("2026-W01");
ok("previousWeekKey(W01-2026) ada (tidak crash menyeberang tahun)", previousWeekKey("2026-W01").length > 0);
ok("previousWeekKey(konsisten) = weekKey(startsAt - 1ms)", previousWeekKey("2026-W31") === weekKey(new Date(rW31.startsAt.getTime() - 1)));

// Season 4 minggu: S1 = minggu 1..4, 1ms setelah W4 tutup masuk S2.
const s1 = seasonRange("2026-S1");
ok("seasonRange S1 = 4 minggu penuh", s1.endsAt.getTime() === s1.startsAt.getTime() + 28 * 86400000 - 1);
ok("seasonPeriodKey(S1.startsAt) = 2026-S01", seasonPeriodKey(s1.startsAt) === "2026-S01");
ok("seasonPeriodKey(S1.endsAt) = 2026-S01 (masih season)", seasonPeriodKey(s1.endsAt) === "2026-S01");
ok("seasonPeriodKey(S1.endsAt + 1ms) = season berikutnya", seasonPeriodKey(new Date(s1.endsAt.getTime() + 1)) === "2026-S02");
ok("previousSeasonKey(S1) = season terakhir tahun lalu", seasonPeriodKey(new Date(s1.startsAt.getTime() - 1)) === previousSeasonKey("2026-S1"));
ok("weekLabel W31 = Minggu ke-31 2026", weekLabel("2026-W31") === "Minggu ke-31 2026");
ok("seasonLabel S2 = Season 2 2026", seasonLabel("2026-S2") === "Season 2 2026");

// ── 2. isPeriodClosed (pure) ────────────────────────────────────────────────
const nowFixed = new Date("2026-08-09T10:00:00+07:00"); // Minggu pagi WIB
const wkNow = weekKey(nowFixed);
ok("minggu berjalan belum tutup", !isPeriodClosed("WEEKLY", wkNow, nowFixed));
ok("minggu sebelumnya sudah tutup", isPeriodClosed("WEEKLY", previousWeekKey(wkNow), nowFixed));
ok("season berjalan belum tutup", !isPeriodClosed("SEASON", seasonPeriodKey(nowFixed), nowFixed));
ok("season sebelumnya sudah tutup", isPeriodClosed("SEASON", previousSeasonKey(seasonPeriodKey(nowFixed)), nowFixed));
ok("tepat di akhir minggu (23:59:59.999) belum tutup", !isPeriodClosed("WEEKLY", wkNow, weekRange(wkNow).endsAt));

// ── 3. Reward podium (pure) ─────────────────────────────────────────────────
ok("weekly #1 = 300 XP / 300 koin / weekly-champion", podiumRewardFor("WEEKLY", 1)?.xp === 300 && podiumRewardFor("WEEKLY", 1)?.coin === 300 && podiumRewardFor("WEEKLY", 1)?.badge === "weekly-champion");
ok("weekly #2 = 200 XP / 200 koin / weekly-runner-up", podiumRewardFor("WEEKLY", 2)?.xp === 200 && podiumRewardFor("WEEKLY", 2)?.badge === "weekly-runner-up");
ok("weekly #3 = 100 XP / 100 koin / weekly-third", podiumRewardFor("WEEKLY", 3)?.xp === 100 && podiumRewardFor("WEEKLY", 3)?.coin === 100 && podiumRewardFor("WEEKLY", 3)?.badge === "weekly-third");
ok("season #1 = 500 XP / 500 koin / season-champion", podiumRewardFor("SEASON", 1)?.xp === 500 && podiumRewardFor("SEASON", 1)?.coin === 500 && podiumRewardFor("SEASON", 1)?.badge === "season-champion");
ok("season #2 = 350 XP / 350 koin", podiumRewardFor("SEASON", 2)?.xp === 350 && podiumRewardFor("SEASON", 2)?.coin === 350);
ok("season #3 = 250 XP / 250 koin", podiumRewardFor("SEASON", 3)?.xp === 250 && podiumRewardFor("SEASON", 3)?.coin === 250);
ok("rank 4 → tanpa reward (hanya top 3)", podiumRewardFor("WEEKLY", 4) === null && podiumRewardFor("SEASON", 4) === null);
ok("previousPeriodKey WEEKLY → previousWeekKey", previousPeriodKey("WEEKLY", "2026-W31") === previousWeekKey("2026-W31"));
ok("previousPeriodKey SEASON → previousSeasonKey", previousPeriodKey("SEASON", "2026-S2") === previousSeasonKey("2026-S2"));

// ── 4. Status message (pure) ────────────────────────────────────────────────
ok("juara 1 → 'Pertahankan!'", /Pertahankan!/.test(podiumStatusMessage({ rank: 1, total: 500, weeklyXp: 1200, gapToNext: 0 })));
ok("posisi 2 → gap ke puncak", /ke puncak/.test(podiumStatusMessage({ rank: 2, total: 500, weeklyXp: 900, gapToNext: 300 })));
ok("posisi 3 → selisih dari juara 2", /Selisih/.test(podiumStatusMessage({ rank: 3, total: 500, weeklyXp: 700, gapToNext: 200 })));
ok("0 XP → ajakan mulai", /Belum mengumpulkan XP/.test(podiumStatusMessage({ rank: 300, total: 500, weeklyXp: 0, gapToNext: 0 })));
ok("top 10 → butuh N XP naik", /Top 10!/.test(podiumStatusMessage({ rank: 7, total: 500, weeklyXp: 400, gapToNext: 50 })));
ok("diluar 10 → peringkat dari total", /Peringkat #42 dari 500 peserta/.test(podiumStatusMessage({ rank: 42, total: 500, weeklyXp: 100, gapToNext: 25 })));

// ── 5. XP source transparency (pure) ────────────────────────────────────────
ok("4 kelompok + LAINNYA", XP_GROUPS.length === 4 && xpGroupOfSource("UNKNOWN_SOURCE_XYZ") === "LAINNYA");
ok("BELAJAR: JALUR_CERDAS/UKBI/TKA/PENUGASAN", xpGroupOfSource("JALUR_CERDAS") === "BELAJAR" && xpGroupOfSource("UKBI") === "BELAJAR" && xpGroupOfSource("TKA") === "BELAJAR" && xpGroupOfSource("PENUGASAN_GURU") === "BELAJAR");
ok("BERMAIN: GAME/KATASTRA/QUIZ", xpGroupOfSource("GAME") === "BERMAIN" && xpGroupOfSource("KATASTRA") === "BERMAIN" && xpGroupOfSource("QUIZ") === "BERMAIN");
ok("BERKARYA: UPLOAD_KARYA/LIKE/KOMENTAR", xpGroupOfSource("UPLOAD_KARYA") === "BERKARYA" && xpGroupOfSource("LIKE") === "BERKARYA" && xpGroupOfSource("KOMENTAR") === "BERKARYA");
ok("KONSISTENSI: DAILY_QUEST/PODIUM/ACHIEVEMENT", xpGroupOfSource("DAILY_QUEST") === "KONSISTENSI" && xpGroupOfSource("PODIUM") === "KONSISTENSI" && xpGroupOfSource("ACHIEVEMENT") === "KONSISTENSI");

// ── 6. Static: settlement podium (no XP loop, idempotent) ──────────────────
const podium = readFileSync(join(process.cwd(), "lib/gamification/podium-rewards.ts"), "utf8");
ok("settleWinner transaksional (db.$transaction)", /db\.\$transaction/.test(podium));
ok("idempotent via unique periodType_periodKey_userId", /periodType_periodKey_userId/.test(podium));
ok("memo Redis bca:lb-settle:{type}:{key}", /bca:lb-settle:\$\{type\}:\$\{key\}/.test(podium));
ok("backstop DB: count LeaderboardPeriodResult sebelum settle", /leaderboardPeriodResult\.count/.test(podium));
ok("standings dari XPTransaction (append-only, bukan field reset)", /xPTransaction\.groupBy/.test(podium));
ok("standings EXCLUDE sumber PODIUM (no XP loop)", /source:\s*\{\s*not:\s*"PODIUM"\s*\}/.test(podium));
ok("standings hanya role MURID", /role:\s*"MURID"/.test(podium));
ok("settlement tidak menulis weeklyXP/seasonXP (reward hanya XP total)", !/weeklyXP:/.test(podium) && !/seasonXP:/.test(podium));
ok("XP total naik via user.update xp", /user\.update[\s\S]*data:\s*\{\s*xp:\s*totalXp/.test(podium));
ok("level & rank resmi dihitung dari total XP", /levelFromXp\(/ .test(podium) && /rankFromLevel\(levelBaru\)/.test(podium));
ok("badge podium skipDuplicates", /skipDuplicates:\s*true/.test(podium));
ok("koin podium reference unik per periode+rank", /reason:\s*"BCA_PODIUM"/.test(podium));
ok("balapan konkuren aman (P2002 di-catch)", /P2002/.test(podium));
ok("settle lazy: minggu lalu + season lalu", /settleOne\("WEEKLY", previousWeekKey/.test(podium) && /settleOne\("SEASON", previousSeasonKey/.test(podium));
ok("Hall of Fame baca leaderboardPeriodResult + label via mondayWibOfIsoWeek", /leaderboardPeriodResult\.findMany/.test(podium) && /mondayWibOfIsoWeek/.test(podium));

// ── 7. Static: competition payload (motivation.ts) ──────────────────────────
const mot = readFileSync(join(process.cwd(), "lib/gamification/motivation.ts"), "utf8");
ok("payload memanggil settlement lazy best-effort", /settleLeaderboardIfDue\(\)\.catch/.test(mot));
ok("nilai saya dinormalisasi lazy reset (weeklyXPWeekKey === wk)", /weeklyXPWeekKey === wk \? my\.weeklyXP : 0/.test(mot));
ok("rank dihitung deterministic (weeklyXP DESC, tie totalXP DESC)", /weeklyXP:\s*\{\s*gt:\s*myWeekly\s*\}[\s\S]*totalXP:\s*\{\s*gt:\s*myTotal/.test(mot) || /weeklyXP:\s*myWeekly,\s*totalXP:\s*\{\s*gt:\s*myTotal/.test(mot));
ok("tetangga di atas (weeklyXP terkecil > saya) + gap", /weeklyXP:\s*\{\s*gt:\s*myWeekly\s*\}/.test(mot) && /gapToNext/.test(mot));
ok("tetangga di bawah (weeklyXP terbesar < saya)", /weeklyXP:\s*\{\s*lt:\s*myWeekly\s*\}/.test(mot));
ok("payload konsumsi getLeaderboard WEEKLY + breakdown + Hall of Fame", /getLeaderboard\(\{[\s\S]*period:\s*"WEEKLY"/.test(mot) && /getWeeklyXpBreakdown/.test(mot) && /getHallOfFame/.test(mot));
ok("countdown hydration-safe: kirim periodEndsAt absolute + now", /periodEndsAt: range\.endsAt\.toISOString\(\)/.test(mot) && /now: now\.toISOString\(\)/.test(mot));
ok("total peserta dari weeklyXP > 0 & kunci minggu cocok", /weeklyXPWeekKey:\s*wk[\s\S]*weeklyXP:\s*\{\s*gt:\s*0\s*\}/.test(mot));

// ── 8. Static: leaderboard period-aware + cache ber-period ─────────────────
const lb = readFileSync(join(process.cwd(), "lib/gamification/leaderboard.ts"), "utf8");
ok("leaderboard filter lazy reset (weeklyXPWeekKey === wk)", /weeklyXPWeekKey === wk/.test(lb));
ok("leaderboard filter lazy reset season (seasonPeriodKey === sk)", /seasonPeriodKey === sk/.test(lb));
ok("cache key leaderboard memuat periodKey (tidak kedaluwarsa lintas reset)", /periodKeyFor\(\$\{params\.period\}\]/.test(lb) || /bca:lb:\$\{CACHE_VERSION\}:[\s\S]*periodKeyFor/.test(lb));
ok("CACHE_VERSION v3 (dinaikkan saat perilaku berubah)", /CACHE_VERSION\s*=\s*"v3"/.test(lb));

// ── 9. Static: cache arena page ber-period ─────────────────────────────────
const arenaPage = readFileSync(join(process.cwd(), "app/arena/page.tsx"), "utf8");
ok("cache mini widget ber-period (league-mini:weekly:${weekKey()})", /league-mini:weekly:\$\{weekKey\(\)\}/.test(arenaPage));
ok("beranda Arena menampilkan Kompetisi Minggu Ini", /Kompetisi Minggu Ini/.test(arenaPage));
ok("beranda Arena memakai getWeeklyCompetition", /getWeeklyCompetition/.test(arenaPage));

// ── 10. Static: faucet XP publik dikunci ───────────────────────────────────
const xpRoute = readFileSync(join(process.cwd(), "app/api/player/xp/route.ts"), "utf8");
ok("POST /api/player/xp dibatasi ADMIN/founder (bukan murid/guru)", /user\.isFounder\s*&&\s*user\.role\s*===\s*"ADMIN"/.test(xpRoute) || /!user\.isFounder\s*&&\s*user\.role\s*!==\s*"ADMIN"/.test(xpRoute) || /user\.role\s*!==\s*"ADMIN"\s*&&\s*!user\.isFounder/.test(xpRoute));
ok("reference wajib untuk POST /api/player/xp", /reference/.test(xpRoute));
ok("faucet tetap lewat pintu tunggal awardXp", /awardXp\(user\.id/.test(xpRoute));

// ── 11. Static: XP total/level/rank tidak pernah di-reset ──────────────────
const awardXp = readFileSync(join(process.cwd(), "lib/award-xp.ts"), "utf8");
ok("lazy reset hanya untuk weekly/season XP", /weeklyXPWeekKey\s*===\s*wk/.test(awardXp) && /seasonPeriodKey\s*===\s*sp/.test(awardXp));
ok("PlayerProfile.totalXP = cermin User.xp (tidak pernah di-reset)", /totalXP:\s*totalXp/.test(awardXp));
ok("User.xp ditambah (bukan direset)", /data:\s*\{\s*xp:\s*totalXp/.test(awardXp));

// ── 12. Static: UI components (hydration-safe) ─────────────────────────────
const countdown = readFileSync(join(process.cwd(), "components/arena/player/WeeklyCountdown.tsx"), "utf8");
ok("countdown client memakai baseline server (hydrate deterministik)", /suppressHydrationWarning/.test(countdown) && /useEffect/.test(countdown) && /elapsedMs/.test(countdown));
const hero = readFileSync(join(process.cwd(), "components/arena/player/CompetitionHero.tsx"), "utf8");
ok("hero kompetisi memakai WeeklyCountdown (bukan hitungan klien)", /WeeklyCountdown/.test(hero));
ok("hero anti-dead: top 3 + posisi saya + tetangga + total peserta + gap", /top\.length/.test(hero) && /above/.test(hero) && /below/.test(hero) && /totalParticipants/.test(hero) && /gapToNext/.test(hero));

// ── 13. Static: route /api/arena/competition role-gated ────────────────────
const compRoute = readFileSync(join(process.cwd(), "app/api/arena/competition/route.ts"), "utf8");
ok("route kompetisi memakai getUser", /getUser\(\)/.test(compRoute));
ok("route kompetisi memanggil getWeeklyCompetition", /getWeeklyCompetition/.test(compRoute));

console.log(`\n${fail === 0 ? "SEMUA LULUS ✅" : `${fail} GAGAL ❌`}`);
process.exit(fail === 0 ? 0 : 1);
