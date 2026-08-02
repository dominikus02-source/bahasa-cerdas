/**
 * Seed data BC Arena — Badge + Achievement definitions.
 *
 * Jalankan: npx tsx scripts/seed-gamification-data.ts [--execute]
 * (default dry-run).
 *
 * Badge: kondisi JSON { type, target, source? } — lihat lib/gamification/badge-engine.ts
 * Achievement: target aksi, reward XP + koin saat diklaim.
 */
import { PrismaClient } from "@prisma/client";
import { loadScriptEnv, requireDatabaseUrl } from "./_env";

loadScriptEnv();
const db = new PrismaClient({ datasources: { db: { url: requireDatabaseUrl() } } });

interface BadgeSeed {
  code: string;
  name: string;
  icon: string;
  description: string;
  condition: { type: string; target: number; source?: string };
  rarity: string;
}

const BADGES: BadgeSeed[] = [
  // ── Total XP ──
  { code: "xp-100", name: "Perintis XP", icon: "/badges/xp-100.webp", description: "Kumpulkan 100 XP total", condition: { type: "TOTAL_XP", target: 100 }, rarity: "BRONZE" },
  { code: "xp-1000", name: "Pemburu XP", icon: "/badges/xp-1000.webp", description: "Kumpulkan 1.000 XP total", condition: { type: "TOTAL_XP", target: 1000 }, rarity: "BRONZE" },
  { code: "xp-5000", name: "Kolektor XP", icon: "/badges/xp-5000.webp", description: "Kumpulkan 5.000 XP total", condition: { type: "TOTAL_XP", target: 5000 }, rarity: "SILVER" },
  { code: "xp-10000", name: "Master XP", icon: "/badges/xp-10000.webp", description: "Kumpulkan 10.000 XP total", condition: { type: "TOTAL_XP", target: 10000 }, rarity: "GOLD" },
  { code: "xp-25000", name: "Legenda XP", icon: "/badges/xp-25000.webp", description: "Kumpulkan 25.000 XP total", condition: { type: "TOTAL_XP", target: 25000 }, rarity: "LEGENDARY" },
  // USULAN: aset "hall-of-fame" ikut disediakan di sheet badge tapi belum punya
  // kode. Ambangnya dipilih di atas Legenda XP supaya jadi badge pamungkas —
  // ganti angkanya kalau desainmu berbeda.
  { code: "hall-of-fame", name: "Hall of Fame", icon: "/badges/hall-of-fame.webp", description: "Kumpulkan 50.000 XP total", condition: { type: "TOTAL_XP", target: 50000 }, rarity: "LEGENDARY" },

  // ── Level ──
  { code: "lvl-5", name: "Naik Kelas", icon: "/badges/lvl-5.webp", description: "Capai level 5", condition: { type: "LEVEL", target: 5 }, rarity: "BRONZE" },
  { code: "lvl-10", name: "Bintang 10", icon: "/badges/lvl-10.webp", description: "Capai level 10", condition: { type: "LEVEL", target: 10 }, rarity: "SILVER" },
  { code: "lvl-25", name: "Sarjana Cerdas", icon: "/badges/lvl-25.webp", description: "Capai level 25", condition: { type: "LEVEL", target: 25 }, rarity: "GOLD" },
  { code: "lvl-50", name: "Guru Arena", icon: "/badges/lvl-50.webp", description: "Capai level 50", condition: { type: "LEVEL", target: 50 }, rarity: "GOLD" },
  { code: "lvl-100", name: "Legenda BC", icon: "/badges/lvl-100.webp", description: "Capai level 100", condition: { type: "LEVEL", target: 100 }, rarity: "LEGENDARY" },

  // ── Streak ──
  { code: "streak-3", name: "Rajin 3 Hari", icon: "/badges/streak-3.webp", description: "Aktif 3 hari berturut-turut", condition: { type: "STREAK", target: 3 }, rarity: "BRONZE" },
  { code: "streak-7", name: "Seminggu Penuh", icon: "/badges/streak-7.webp", description: "Aktif 7 hari berturut-turut", condition: { type: "STREAK", target: 7 }, rarity: "SILVER" },
  { code: "streak-30", name: "Bulan Tanpa Putus", icon: "/badges/streak-30.webp", description: "Aktif 30 hari berturut-turut", condition: { type: "STREAK", target: 30 }, rarity: "GOLD" },
  { code: "streak-100", name: "Raksasa Konsisten", icon: "/badges/streak-100.webp", description: "Aktif 100 hari berturut-turut", condition: { type: "STREAK", target: 100 }, rarity: "LEGENDARY" },

  // ── Weekly / Season XP ──
  { code: "weekly-200", name: "Top Minggu Ini", icon: "/badges/weekly-200.webp", description: "Kumpulkan 200 XP dalam satu minggu", condition: { type: "WEEKLY_XP", target: 200 }, rarity: "SILVER" },
  { code: "weekly-1000", name: "Penguasa Minggu", icon: "/badges/weekly-1000.webp", description: "Kumpulkan 1.000 XP dalam satu minggu", condition: { type: "WEEKLY_XP", target: 1000 }, rarity: "GOLD" },
  { code: "season-1000", name: "Kontributor Season", icon: "/badges/season-1000.webp", description: "Kumpulkan 1.000 XP dalam satu season", condition: { type: "SEASON_XP", target: 1000 }, rarity: "SILVER" },
  { code: "season-5000", name: "Juara Season", icon: "/badges/season-5000.webp", description: "Kumpulkan 5.000 XP dalam satu season", condition: { type: "SEASON_XP", target: 5000 }, rarity: "LEGENDARY" },

  // ── Koin ──
  { code: "coin-500", name: "Menabung Koin", icon: "/badges/coin-500.webp", description: "Punya 500 koin saldo", condition: { type: "COIN_BALANCE", target: 500 }, rarity: "BRONZE" },
  { code: "coin-2000", name: "Juragan Koin", icon: "/badges/coin-2000.webp", description: "Punya 2.000 koin saldo", condition: { type: "COIN_BALANCE", target: 2000 }, rarity: "SILVER" },
  { code: "coin-10000", name: "Konglomerat Cerdas", icon: "/badges/coin-10000.webp", description: "Punya 10.000 koin saldo", condition: { type: "COIN_BALANCE", target: 10000 }, rarity: "GOLD" },

  // ── Karya ──
  { code: "karya-1", name: "Pertama Menulis", icon: "/badges/karya-1.webp", description: "Buat 1 karya", condition: { type: "TOTAL_KARYA", target: 1 }, rarity: "BRONZE" },
  { code: "karya-10", name: "Penulis Aktif", icon: "/badges/karya-10.webp", description: "Buat 10 karya", condition: { type: "TOTAL_KARYA", target: 10 }, rarity: "SILVER" },
  { code: "karya-50", name: "Sastrawan Cerdas", icon: "/badges/karya-50.webp", description: "Buat 50 karya", condition: { type: "TOTAL_KARYA", target: 50 }, rarity: "GOLD" },

  // ── Per sumber ──
  { code: "sumber-jalur-500", name: "Penjelajah Jalur", icon: "/badges/sumber-jalur-500.webp", description: "Kumpulkan 500 XP dari Jalur Cerdas", condition: { type: "XP_SOURCE_TOTAL", target: 500, source: "JALUR_CERDAS" }, rarity: "SILVER" },
  { code: "sumber-ukbi-500", name: "Kampiun UKBI", icon: "/badges/sumber-ukbi-500.webp", description: "Kumpulkan 500 XP dari UKBI", condition: { type: "XP_SOURCE_TOTAL", target: 500, source: "UKBI" }, rarity: "GOLD" },
  { code: "sumber-tka-500", name: "Ahli TKA", icon: "/badges/sumber-tka-500.webp", description: "Kumpulkan 500 XP dari TKA", condition: { type: "XP_SOURCE_TOTAL", target: 500, source: "TKA" }, rarity: "GOLD" },
];

interface AchievementSeed {
  code: string;
  name: string;
  icon: string;
  description: string;
  target: number;
  rewardXP: number;
  rewardCoins: number;
}

const ACHIEVEMENTS: AchievementSeed[] = [
  { code: "ach-belajar-1", name: "Langkah Pertama", icon: "🚀", description: "Selesaikan 1 unit belajar", target: 1, rewardXP: 50, rewardCoins: 10 },
  { code: "ach-belajar-10", name: "Pembelajar Aktif", icon: "📚", description: "Selesaikan 10 unit belajar", target: 10, rewardXP: 300, rewardCoins: 50 },
  { code: "ach-belajar-50", name: "Pustakawan Cerdas", icon: "🏛️", description: "Selesaikan 50 unit belajar", target: 50, rewardXP: 1500, rewardCoins: 200 },
  { code: "ach-kuis-10", name: "Kuiszer", icon: "❓", description: "Jawab 10 soal kuis", target: 10, rewardXP: 100, rewardCoins: 20 },
  { code: "ach-kuis-100", name: "Jawara Kuis", icon: "🎯", description: "Jawab 100 soal kuis", target: 100, rewardXP: 800, rewardCoins: 100 },
  { code: "ach-karya-1", name: "Penulis Pemula", icon: "✏️", description: "Buat 1 karya", target: 1, rewardXP: 50, rewardCoins: 10 },
  { code: "ach-karya-5", name: "Penulis Produktif", icon: "📖", description: "Buat 5 karya", target: 5, rewardXP: 400, rewardCoins: 75 },
  { code: "ach-ukbi-1", name: "Pejuang UKBI", icon: "🎙️", description: "Selesaikan 1 simulasi UKBI", target: 1, rewardXP: 200, rewardCoins: 30 },
  { code: "ach-tka-1", name: "Pejuang TKA", icon: "🧮", description: "Selesaikan 1 simulasi TKA", target: 1, rewardXP: 200, rewardCoins: 30 },
  { code: "ach-game-5", name: "Petualang Arena", icon: "🕹️", description: "Main 5 kali permainan", target: 5, rewardXP: 300, rewardCoins: 40 },
  { code: "ach-streak-7", name: "Semangat 7 Hari", icon: "🌟", description: "Aktif 7 hari berturut-turut", target: 7, rewardXP: 400, rewardCoins: 60 },
  { code: "ach-login-30", name: "Warga Setia", icon: "🔁", description: "Login 30 hari", target: 30, rewardXP: 1000, rewardCoins: 150 },
];

async function main() {
  const execute = process.argv.includes("--execute");

  console.log("=== BC Arena: Seed Badge & Achievement ===\n");

  if (!execute) {
    console.log("Mode DRY-RUN (tidak ada perubahan). Tambahkan --execute untuk apply.\n");
  }

  console.log(`Badge: ${BADGES.length} definisi`);
  console.log(`Achievement: ${ACHIEVEMENTS.length} definisi\n`);

  if (!execute) {
    await db.$disconnect();
    return;
  }

  let badgeCreated = 0;
  let badgeUpdated = 0;
  for (const b of BADGES) {
    const existing = await db.badge.findUnique({ where: { code: b.code } });
    const data = {
      name: b.name,
      icon: b.icon,
      description: b.description,
      condition: b.condition as object,
      rarity: b.rarity as never,
      isActive: true,
    };
    if (existing) {
      await db.badge.update({ where: { code: b.code }, data });
      badgeUpdated++;
    } else {
      await db.badge.create({ data: { code: b.code, ...data } });
      badgeCreated++;
    }
  }

  let achCreated = 0;
  let achUpdated = 0;
  for (const a of ACHIEVEMENTS) {
    const existing = await db.achievement.findUnique({ where: { code: a.code } });
    const data = {
      name: a.name,
      icon: a.icon,
      description: a.description,
      target: a.target,
      rewardXP: a.rewardXP,
      rewardCoins: a.rewardCoins,
      isActive: true,
    };
    if (existing) {
      await db.achievement.update({ where: { code: a.code }, data });
      achUpdated++;
    } else {
      await db.achievement.create({ data: { code: a.code, ...data } });
      achCreated++;
    }
  }

  console.log(`Badge: ${badgeCreated} dibuat, ${badgeUpdated} diperbarui`);
  console.log(`Achievement: ${achCreated} dibuat, ${achUpdated} diperbarui`);
  console.log("\nSelesai ✅");

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
