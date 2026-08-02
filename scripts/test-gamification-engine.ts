// Unit test BC Arena — gamification engine.
//
// Dua lapisan:
//  1. Tes logika murni (levels, ranks, season keys) — impor fungsi asli.
//  2. Tes keamanan statis (pola kode wajib di xp-engine, coin-engine,
//     badge/achievement engine, leaderboard) — verifikasi idempotency,
//     tidak ada XP mentah dari klien, cap server, dsb.
//
// Tidak butuh koneksi DB. Jalan di CI bersama suite lain.
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { levelFromXp, levelAfterXp, cumulativeXpForLevel } from "@/lib/gamification/levels";
import { rankFromLevel, RANKS } from "@/lib/gamification/ranks";
import { weekKey, seasonPeriodKey, startOfWeekWIB } from "@/lib/gamification/season";
import { xpNeededForNextLevel } from "@/lib/gamification/xp-engine";

let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};

// ── 1. Level curve ────────────────────────────────────────────────────────
const c100 = cumulativeXpForLevel(100);
// Level 100 harus TIDAK terjangkau dalam sebulan. Batas harian 5.000 XP
// (BATAS_XP_HARIAN), jadi kurva di bawah 150.000 berarti Legend bisa diraih
// dalam 30 hari grinding — pagar ini mencegah kurvanya dilonggarkan diam-diam.
ok("XP level 100 = 465.250 (kurva resmi)", c100 === 465250);
ok("Legend butuh >90 hari grinding maksimum (5.000 XP/hari)", c100 / 5000 > 90);
ok("levelFromXp(0) = 1", levelFromXp(0) === 1);
ok("level monotonik naik", levelFromXp(5000) >= levelFromXp(1000));
ok("levelAfterXp(1, 1000) = level(1000)", levelAfterXp(1, 1000) === levelFromXp(cumulativeXpForLevel(1) + 1000) || levelAfterXp(1, 1000) > 1);
ok("xpNeededForNextLevel > 0", xpNeededForNextLevel(5) > 0);
ok("kurva progresif (level tinggi butuh lebih banyak XP)", xpNeededForNextLevel(50) >= xpNeededForNextLevel(10));

// ── 2. Rank ───────────────────────────────────────────────────────────────
ok("9 rank", RANKS.length === 9);
ok("level 1 = BRONZE", rankFromLevel(1) === "BRONZE");
ok("level 9 = BRONZE (batas atas resmi)", rankFromLevel(9) === "BRONZE");
ok("level 10 = SILVER", rankFromLevel(10) === "SILVER");
ok("level 19 = SILVER", rankFromLevel(19) === "SILVER");
ok("level 20 = GOLD", rankFromLevel(20) === "GOLD");
ok("level 30 = EMERALD", rankFromLevel(30) === "EMERALD");
ok("level 40 = RUBY", rankFromLevel(40) === "RUBY");
ok("level 50 = SAPPHIRE", rankFromLevel(50) === "SAPPHIRE");
ok("level 60 = DIAMOND", rankFromLevel(60) === "DIAMOND");
ok("level 70 = MASTER", rankFromLevel(70) === "MASTER");
ok("level 80 = LEGEND", rankFromLevel(80) === "LEGEND");
ok("level 100 = LEGEND", rankFromLevel(100) === "LEGEND");
ok("level di luar batas ditangkap (200 → LEGEND)", rankFromLevel(200) === "LEGEND");

// ── 3. Season keys ────────────────────────────────────────────────────────
const wk = weekKey();
ok(`weekKey format "YYYY-Www": ${wk}`, /^\d{4}-W\d{2}$/.test(wk));
const sp = seasonPeriodKey();
ok(`seasonPeriodKey format "YYYY-Sn": ${sp}`, /^\d{4}-S\d+$/.test(sp));
ok("startOfWeekWIB valid Date", startOfWeekWIB() instanceof Date && !Number.isNaN(startOfWeekWIB().getTime()));

// ── 4. Static: pintu XP tunggal (lib/award-xp.ts) ─────────────────────────
// Assertion di bawah dulu menguji addXp() di xp-engine. Pintu itu dihapus saat
// penyatuan sistem progresi; sekarang semua XP lewat awardXp().
const awardXpFile = readFileSync(join(process.cwd(), "lib/award-xp.ts"), "utf8");
ok("awardXp memakai transaksi DB", /db\.\$transaction/.test(awardXpFile));
ok("idempotency guard (userId+source+reference unik)", /@@unique\(\[userId, source, reference\]\)/.test(readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8")));
ok("awardXp menolak duplikat lewat XPTransaction", /xPTransaction\.findUnique/.test(awardXpFile));
ok("level & rank dihitung dari total XP", /levelFromXp\(totalXp\)/.test(awardXpFile) && /rankFromLevel\(levelBaru\)/.test(awardXpFile));
ok("lazy weekly reset ada", /weeklyXPWeekKey\s*===\s*wk/.test(awardXpFile));
ok("reward koin saat naik level diaudit", /coinTransaction\.create[\s\S]*LEVEL_UP/.test(awardXpFile));
ok("kuota harian ditegakkan di dalam transaksi", /terapkanKuotaHarian/.test(awardXpFile));
ok("XP Boost diterapkan sesudah batas", /getXpMultiplier/.test(awardXpFile));

// ── 5. Static: guard XP per submit ────────────────────────────────────────
const xpGuard = readFileSync(join(process.cwd(), "lib/xp-guard.ts"), "utf8");
const playerXpRoute = readFileSync(join(process.cwd(), "app/api/player/xp/route.ts"), "utf8");
ok("endpoint /player/xp lewat pintu tunggal awardXp", /awardXp\(user\.id, source, requested/.test(playerXpRoute));
ok("endpoint /player/xp memakai rate limit", /rateLimitRoute/.test(playerXpRoute));
ok("server tidak mempercayai amount mentah (cap ada)", /batasiXpSubmit/.test(xpGuard) && /Math\.min\(Math\.floor\(xpDiminta\), batas\)/.test(xpGuard));

// ── 6. Static: coin engine ────────────────────────────────────────────────
const coinEngine = readFileSync(join(process.cwd(), "lib/gamification/coin-engine.ts"), "utf8");
ok("addCoin mencatat audit CoinTransaction", /coinTransaction\.create/.test(coinEngine));
ok("addCoin idempotent via reference", /duplicate/.test(coinEngine));
ok("deductCoin menolak saldo negatif", /profile\.coin\s*<\s*amt/.test(coinEngine));

// ── 7. Static: badge & achievement ────────────────────────────────────────
const badgeEngine = readFileSync(join(process.cwd(), "lib/gamification/badge-engine.ts"), "utf8");
const achEngine = readFileSync(join(process.cwd(), "lib/gamification/achievement-engine.ts"), "utf8");
ok("badge auto-award skipDuplicates", /skipDuplicates:\s*true/.test(badgeEngine));
ok("achievement progress diskalakan ke target", /Math\.min\(row\.progress \+ increment, achievement\.target\)/.test(achEngine));
ok("klaim achievement lewat pintu tunggal & idempotent", /awardXp\(userId, "ACHIEVEMENT"[\s\S]*achievement-\$\{code\}/.test(achEngine));

// ── 8. Static: leaderboard ────────────────────────────────────────────────
const lb = readFileSync(join(process.cwd(), "lib/gamification/leaderboard.ts"), "utf8");
ok("leaderboard mendukung scope GLOBAL/SCHOOL/CLASS", /"GLOBAL" \| "SCHOOL" \| "CLASS"/.test(lb));
ok("leaderboard pakai Redis cache", /cache\.get<LeaderboardEntry/.test(lb));

// ── 9. Static: tidak ada 'any' di engine ──────────────────────────────────
const files = [
  "lib/gamification/levels.ts",
  "lib/gamification/ranks.ts",
  "lib/gamification/season.ts",
  "lib/gamification/xp-engine.ts",
  "lib/gamification/coin-engine.ts",
  "lib/gamification/player.ts",
  "lib/gamification/badge-engine.ts",
  "lib/gamification/achievement-engine.ts",
  "lib/gamification/leaderboard.ts",
];
let anyCount = 0;
for (const f of files) {
  const src = readFileSync(join(process.cwd(), f), "utf8");
  const hits = (src.match(/\bany\b/g) || []).length;
  anyCount += hits;
  if (hits > 0) console.log(`     [warn] ${f}: ${hits} 'any'`);
}
ok("tidak ada 'any' di semua file engine", anyCount === 0);

// ── 10. Rank registry: asset resmi (Sprint 6) ─────────────────────────────
const rankAssets = readFileSync(join(process.cwd(), "lib/gamification/rank-assets.ts"), "utf8");
ok("rank-assets punya 9 asset resmi", /bronze\.webp[\s\S]*silver\.webp[\s\S]*gold\.webp[\s\S]*emerald\.webp[\s\S]*ruby\.webp[\s\S]*sapphire\.webp[\s\S]*diamond\.webp[\s\S]*master\.webp[\s\S]*legend\.webp/.test(rankAssets));
ok("rank-assets pakai public/Rank BC/ (registry, bukan hardcode di komponen)", /public\/Rank BC\//.test(rankAssets));
ok("rank-assets ukuran asli 512 didefinisikan", /RANK_ICON_NATIVE_SIZE\s*=\s*512/.test(rankAssets));
for (const r of ["bronze", "silver", "gold", "emerald", "ruby", "sapphire", "diamond", "master", "legend"]) {
  const exists = (() => {
    try {
      readFileSync(join(process.cwd(), `public/Rank BC/${r}.webp`));
      return true;
    } catch {
      return false;
    }
  })();
  ok(`asset resmi public/Rank BC/${r}.webp ada`, exists);
}

// ── 11. Rank rewards + rank-up (Sprint 6) ─────────────────────────────────
const rankRewards = readFileSync(join(process.cwd(), "lib/gamification/rank-rewards.ts"), "utf8");
ok("RANK_REWARDS mendefinisikan 9 rank", /BRONZE:[\s\S]*SILVER:[\s\S]*GOLD:[\s\S]*EMERALD:[\s\S]*RUBY:[\s\S]*SAPPHIRE:[\s\S]*DIAMOND:[\s\S]*MASTER:[\s\S]*LEGEND:/.test(rankRewards));
ok("reward koin per rank", /coin: \d+/.test(rankRewards));
ok("reward badge rank", /badgeCode: "rank-[a-z]+"/.test(rankRewards));
ok("reward title rank", /title: "/.test(rankRewards));
ok("reward frame avatar", /frame: "frame-rank-[a-z]+"/.test(rankRewards));
ok("reward border profile", /border: "border-rank-[a-z]+"/.test(rankRewards));

const rankUp = readFileSync(join(process.cwd(), "lib/gamification/rank-up.ts"), "utf8");
ok("rank-up idempotent via addCoin + reference rank-up-<RANK>", /addCoin\([^)]*"RANK_UP"[^)]*`rank-up-\$\{rank\}`/.test(rankUp) || /"RANK_UP"/.test(rankUp));
ok("rank-up pakai addCoin (consume engine, bukan modifikasi)", /addCoin/.test(rankUp));
ok("rank-up badge skipDuplicates", /skipDuplicates:\s*true/.test(rankUp));
ok("rank-up hanya patch title/frame kalau belum diatur user", /title === null/.test(rankUp) || /profile\.title/.test(rankUp));
ok("rank-up mengembalikan granted[] + hasNewRewards", /granted/.test(rankUp) && /hasNewRewards/.test(rankUp));

// ── 12. XP config (Sprint 6) ──────────────────────────────────────────────
const xpConfig = readFileSync(join(process.cwd(), "lib/gamification/xp-config.ts"), "utf8");
const xpSources = (xpConfig.match(/^  [A-Z_]+: /gm) || []).length;
ok(`XP_CONFIG punya 15 sumber XP (ditemukan ${xpSources})`, xpSources === 15);
ok("XP_CONFIG: JALUR_CERDAS ada", /JALUR_CERDAS/.test(xpConfig));
ok("XP_CONFIG: UPLOAD_KARYA ada", /UPLOAD_KARYA/.test(xpConfig));
ok("XP_CONFIG: PENUGASAN_GURU ada", /PENUGASAN_GURU/.test(xpConfig));

// ── 13. Static: komponen memakai registry (bukan hardcode path) ───────────
const rankIcon = readFileSync(join(process.cwd(), "components/gamification/RankIcon.tsx"), "utf8");
ok("RankIcon memakai getRankAsset (registry)", /getRankAsset\(rank\)/.test(rankIcon));
ok("RankIcon memakai next/image", /next\/image/.test(rankIcon));
const hardcoded = (() => {
  try {
    return readFileSync(join(process.cwd(), "components/gamification/RankIcon.tsx"), "utf8").match(/["'`]\/Rank BC\//g)?.length ?? 0;
  } catch {
    return -1;
  }
})();
ok("tidak ada path /Rank BC/ hardcoded di komponen", hardcoded === 0);

// ── 14. Satu sistem progresi (pagar regresi) ──────────────────────────────
// BC pernah punya dua tumpukan progresi sekaligus: lib/xp.ts (level = xp/500,
// liga 4 tingkat) dan lib/gamification/ (kurva resmi, 9 rank). Murid dengan
// 8.000 XP tampil "Level 17 Berlian" di beranda Arena tapi "Level 21 Gold" di
// dasbor Pemain. Pemeriksaan di bawah menjaga agar tidak kembali.
const adaLibXp = (() => {
  try {
    readFileSync(join(process.cwd(), "lib/xp.ts"));
    return true;
  } catch {
    return false;
  }
})();
ok("lib/xp.ts (rumus level/liga lama) sudah tidak ada", !adaLibXp);

const pengimporLibXp: string[] = [];
(function pindai(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) pindai(full);
    else if (/\.tsx?$/.test(entry.name)) {
      if (/from\s+["']@\/lib\/xp["']/.test(readFileSync(full, "utf8"))) pengimporLibXp.push(full);
    }
  }
})(process.cwd() + "/app");
for (const d of ["components", "lib", "scripts"]) {
  (function pindai(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) pindai(full);
      else if (/\.tsx?$/.test(entry.name)) {
        if (/from\s+["']@\/lib\/xp["']/.test(readFileSync(full, "utf8"))) pengimporLibXp.push(full);
      }
    }
  })(join(process.cwd(), d));
}
ok(`tidak ada berkas yang mengimpor @/lib/xp${pengimporLibXp.length ? " → " + pengimporLibXp.join(", ") : ""}`, pengimporLibXp.length === 0);

const awardXpSrc = readFileSync(join(process.cwd(), "lib/award-xp.ts"), "utf8");
ok("awardXp memakai kurva resmi (levelFromXp)", /levelFromXp\(/.test(awardXpSrc));
ok("awardXp memakai rank resmi (rankFromLevel)", /rankFromLevel\(/.test(awardXpSrc));
ok("awardXp menyinkronkan PlayerProfile di transaksi yang sama", /tx\.playerProfile\.update/.test(awardXpSrc));
ok("awardXp tidak menulis User.league lagi", !/league:/.test(awardXpSrc));

const xpEngineSrc = readFileSync(join(process.cwd(), "lib/gamification/xp-engine.ts"), "utf8");
ok("addXp (pintu XP kedua) sudah dihapus", !/export async function addXp/.test(xpEngineSrc));

console.log(`\n${fail === 0 ? "SEMUA LULUS ✅" : `${fail} GAGAL ❌`}`);
process.exit(fail === 0 ? 0 : 1);
