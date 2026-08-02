/**
 * Hapus badge yatim — definisi di DB yang ikonnya BUKAN aset resmi
 * `public/badges/*.webp`, jadi tidak punya artwork BC.
 *
 * Badge yang punya aset resmi tidak akan pernah disentuh, apa pun kodenya.
 *
 *   npm run hapus:badge-yatim            # dry-run
 *   npm run hapus:badge-yatim -- --execute
 */
import { readdirSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { loadScriptEnv, requireDatabaseUrl } from "./_env";

loadScriptEnv();
const db = new PrismaClient({ datasources: { db: { url: requireDatabaseUrl() } } });

const EXECUTE = process.argv.includes("--execute");

async function main() {
  console.log(EXECUTE ? "MODE: TULIS\n" : "MODE: DRY-RUN (pakai --execute untuk menghapus)\n");

  const asetResmi = new Set(
    readdirSync(join(process.cwd(), "public/badges"))
      .filter((f) => f.endsWith(".webp"))
      .map((f) => `/badges/${f}`)
  );
  console.log(`Aset badge resmi tersedia : ${asetResmi.size}`);

  const semua = await db.badge.findMany({ select: { id: true, code: true, name: true, icon: true } });
  const yatim = semua.filter((b) => !asetResmi.has(b.icon));

  console.log(`Badge terdefinisi         : ${semua.length}`);
  console.log(`Tanpa artwork resmi       : ${yatim.length}\n`);

  if (yatim.length === 0) return console.log("Tidak ada yang perlu dihapus.");

  for (const b of yatim) {
    const dimiliki = await db.userBadge.count({ where: { badgeId: b.id } });
    console.log(`  ${b.code.padEnd(22)} "${b.name}"`);
    console.log(`    ikon: ${b.icon || "(kosong)"}   dimiliki: ${dimiliki} murid`);
  }

  const totalDimiliki = await db.userBadge.count({ where: { badgeId: { in: yatim.map((b) => b.id) } } });
  console.log(`\nTotal kepemilikan yang ikut terhapus: ${totalDimiliki} baris`);

  if (!EXECUTE) return console.log("\n(dry-run — tidak ada yang dihapus)");

  // UserBadge dihapus lebih dulu: relasinya bisa saja tanpa cascade.
  await db.userBadge.deleteMany({ where: { badgeId: { in: yatim.map((b) => b.id) } } });
  const hasil = await db.badge.deleteMany({ where: { id: { in: yatim.map((b) => b.id) } } });
  console.log(`\nDihapus: ${hasil.count} badge + ${totalDimiliki} baris kepemilikan.`);
}

main()
  .catch((e) => {
    console.error("GAGAL:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
