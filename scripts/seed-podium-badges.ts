/**
 * Seed badge podium — 6 badge yang diberikan OTOMATIS oleh settlement
 * leaderboard (lib/gamification/podium-rewards.ts), bukan oleh badge engine.
 *
 * Jalankan: npx tsx scripts/seed-podium-badges.ts [--execute]
 * (default dry-run). Idempoten — upsert by code.
 *
 * Badge ini juga disediakan via migration SQL
 * (prisma/migrations/manual/2026-08-09_leaderboard_motivation.sql) sebagai
 * fallback; script ini untuk environment yang menjalankan seed via Prisma.
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
  condition: { type: string; target: number };
  rarity: string;
}

const BADGES: BadgeSeed[] = [
  { code: "weekly-champion", name: "Juara Mingguan", icon: "🥇", description: "Juara 1 kompetisi XP mingguan", condition: { type: "PODIUM", target: 1 }, rarity: "GOLD" },
  { code: "weekly-runner-up", name: "Runner-up Mingguan", icon: "🥈", description: "Juara 2 kompetisi XP mingguan", condition: { type: "PODIUM", target: 1 }, rarity: "SILVER" },
  { code: "weekly-third", name: "Peringkat 3 Mingguan", icon: "🥉", description: "Juara 3 kompetisi XP mingguan", condition: { type: "PODIUM", target: 1 }, rarity: "BRONZE" },
  { code: "season-champion", name: "Juara Season", icon: "🥇", description: "Juara 1 kompetisi season (4 minggu)", condition: { type: "PODIUM", target: 1 }, rarity: "LEGENDARY" },
  { code: "season-runner-up", name: "Runner-up Season", icon: "🥈", description: "Juara 2 kompetisi season (4 minggu)", condition: { type: "PODIUM", target: 1 }, rarity: "GOLD" },
  { code: "season-third", name: "Peringkat 3 Season", icon: "🥉", description: "Juara 3 kompetisi season (4 minggu)", condition: { type: "PODIUM", target: 1 }, rarity: "SILVER" },
];

async function main() {
  const execute = process.argv.includes("--execute");

  console.log("=== BC Arena: Seed Badge Podium ===\n");

  if (!execute) {
    console.log("Mode DRY-RUN (tidak ada perubahan). Tambahkan --execute untuk apply.\n");
  }

  const kode = BADGES.map((b) => b.code);
  const ada = await db.badge.findMany({ where: { code: { in: kode } }, select: { code: true } });
  const peta = new Set(ada.map((b) => b.code));
  const baru = BADGES.filter((b) => !peta.has(b.code));

  console.log(`Badge podium di DB : ${ada.length}/6`);
  console.log(`  akan dibuat       : ${baru.length}${baru.length ? "  (" + baru.map((b) => b.code).join(", ") + ")" : ""}`);

  if (!execute) {
    console.log("\n(dry-run — tidak ada yang ditulis)");
    await db.$disconnect();
    return;
  }

  let dibuat = 0;
  let diperbarui = 0;
  for (const b of BADGES) {
    const data = {
      name: b.name,
      icon: b.icon,
      description: b.description,
      condition: b.condition as object,
      rarity: b.rarity as never,
      isActive: true,
    };
    const existing = await db.badge.findUnique({ where: { code: b.code } });
    if (existing) {
      await db.badge.update({ where: { code: b.code }, data });
      diperbarui++;
    } else {
      await db.badge.create({ data: { code: b.code, ...data } });
      dibuat++;
    }
  }

  console.log(`\nBadge: ${dibuat} dibuat, ${diperbarui} diperbarui`);
  console.log("Selesai ✅");

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
