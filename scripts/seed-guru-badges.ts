/**
 * Seed badge GURU — Guru Literasi, Guru Inspiratif, Guru Kreatif, dst.
 *
 * Jalankan: npx tsx scripts/seed-guru-badges.ts [--execute]
 * (default dry-run, upsert-only — tidak menghapus badge lama).
 *
 * Kondisi badge guru (lihat lib/gamification/badge-engine.ts):
 *   MURID_KARYA      — total karya seluruh muridnya
 *   MURID_LIKE       — total like karya seluruh muridnya
 *   MURID_FEATURED   — total karya murid yang dipilih (Editor Choice)
 *   TUGAS_DIKIRIM    — total penugasan/asesmen yang dikirim ke kelas
 *   PENGUMUMUM_DIBUAT — total pengumuman yang dibuat
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

const GURU_BADGES: BadgeSeed[] = [
  // ── Literasi (karya murid) ──
  { code: "guru-literasi", name: "Guru Literasi", icon: "/badges/karya-10.webp", description: "Murid-muridmu menerbitkan 25 karya", condition: { type: "MURID_KARYA", target: 25 }, rarity: "BRONZE" },
  { code: "guru-inspiratif", name: "Guru Inspiratif", icon: "/badges/karya-50.webp", description: "Murid-muridmu menerbitkan 100 karya", condition: { type: "MURID_KARYA", target: 100 }, rarity: "SILVER" },
  { code: "guru-literasi-legend", name: "Guru Legenda Literasi", icon: "/badges/lvl-50.webp", description: "Murid-muridmu menerbitkan 500 karya", condition: { type: "MURID_KARYA", target: 500 }, rarity: "GOLD" },

  // ── Kreativitas (karya pilihan) ──
  { code: "guru-kreatif", name: "Guru Kreatif", icon: "/badges/season-1000.webp", description: "5 karya muridmu menjadi Editor Choice", condition: { type: "MURID_FEATURED", target: 5 }, rarity: "SILVER" },
  { code: "guru-kreatif-master", name: "Guru Kreatif Master", icon: "/badges/lvl-100.webp", description: "25 karya muridmu menjadi Editor Choice", condition: { type: "MURID_FEATURED", target: 25 }, rarity: "GOLD" },

  // ── Apresiasi (like karya murid) ──
  { code: "guru-motivator", name: "Guru Motivator", icon: "/badges/coin-500.webp", description: "Karya muridmu dikumpulkan 200 like", condition: { type: "MURID_LIKE", target: 200 }, rarity: "SILVER" },
  { code: "guru-inspirator", name: "Guru Inspirator", icon: "/badges/coin-10000.webp", description: "Karya muridmu dikumpulkan 2.000 like", condition: { type: "MURID_LIKE", target: 2000 }, rarity: "GOLD" },

  // ── Aktivitas mengajar ──
  { code: "guru-penggerak", name: "Guru Penggerak", icon: "/badges/streak-7.webp", description: "Kirim 50 penugasan ke kelas", condition: { type: "TUGAS_DIKIRIM", target: 50 }, rarity: "SILVER" },
  { code: "guru-mentor", name: "Guru Mentor", icon: "/badges/streak-30.webp", description: "Kirim 200 penugasan ke kelas", condition: { type: "TUGAS_DIKIRIM", target: 200 }, rarity: "GOLD" },
  { code: "guru-dedikasi", name: "Guru Dedikasi", icon: "/badges/weekly-200.webp", description: "Buat 20 pengumuman kelas", condition: { type: "PENGUMUMAN_DIBUAT", target: 20 }, rarity: "BRONZE" },
];

async function main() {
  const execute = process.argv.includes("--execute");
  console.log("Seed badge guru (Guru Literasi, Inspiratif, Kreatif, dst.)");
  console.log(execute ? "Mode EXECUTE — menulis ke DB.\n" : "Mode DRY-RUN (tidak ada perubahan). Tambahkan --execute untuk apply.\n");

  const existing = await db.badge.findMany({ where: { code: { in: GURU_BADGES.map((b) => b.code) } }, select: { code: true } });
  const existingCodes = new Set(existing.map((b) => b.code));

  for (const b of GURU_BADGES) {
    const data = {
      name: b.name,
      icon: b.icon,
      description: b.description,
      condition: b.condition as object,
      rarity: b.rarity as "BRONZE" | "SILVER" | "GOLD" | "LEGENDARY",
      isActive: true,
    };
    if (existingCodes.has(b.code)) {
      console.log(`  ↻ ${b.code} — sudah ada${execute ? " (diperbarui)" : " (lewat)"}`);
      if (execute) await db.badge.update({ where: { code: b.code }, data });
    } else {
      console.log(`  + ${b.code} — ${b.name} (${b.rarity})${execute ? "" : " [dry-run]"}`);
      if (execute) await db.badge.create({ data: { code: b.code, ...data } });
    }
  }

  console.log(`\nSelesai. ${GURU_BADGES.length} badge guru di-${execute ? "tulis" : "lihat"}.`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
