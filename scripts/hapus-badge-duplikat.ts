/**
 * Hapus badge duplikat hasil pemindahan lencana.
 *
 * Saat lencana dipindah ke tabel Badge, kriterianya tidak dicek terhadap badge
 * yang sudah ada. Akibatnya lahir pasangan dengan syarat SAMA PERSIS tapi nama
 * berbeda — mis. "Rajin 3 Hari" (streak-3) dan "Mulai Panas" (len-streak-3),
 * keduanya STREAK 3 dengan ikon yang sama. Murid melihat badge kembar.
 *
 * Yang dipertahankan: badge ASLI (kode tanpa awalan `len-`). Yang dihapus:
 * pasangan `len-*` dengan (type, target, source) identik. Kepemilikan murid
 * dipindahkan lebih dulu ke badge asli supaya tidak ada yang kehilangan.
 *
 *   npm run hapus:badge-duplikat            # dry-run
 *   npm run hapus:badge-duplikat -- --execute
 */
import { PrismaClient } from "@prisma/client";
import { loadScriptEnv, requireDatabaseUrl } from "./_env";

loadScriptEnv();
const db = new PrismaClient({ datasources: { db: { url: requireDatabaseUrl() } } });

const EXECUTE = process.argv.includes("--execute");

type Kondisi = { type?: string; target?: number; source?: string };
const kunci = (c: Kondisi) => `${c.type}|${c.target}|${c.source ?? ""}`;

async function main() {
  console.log(EXECUTE ? "MODE: TULIS\n" : "MODE: DRY-RUN (pakai --execute untuk menghapus)\n");

  const semua = await db.badge.findMany({ select: { id: true, code: true, name: true, condition: true } });
  const asli = semua.filter((b) => !b.code.startsWith("len-"));
  const pindahan = semua.filter((b) => b.code.startsWith("len-"));

  const petaAsli = new Map<string, (typeof asli)[number]>();
  for (const b of asli) petaAsli.set(kunci(b.condition as Kondisi), b);

  const duplikat: { buang: (typeof asli)[number]; simpan: (typeof asli)[number] }[] = [];
  for (const p of pindahan) {
    const cocok = petaAsli.get(kunci(p.condition as Kondisi));
    if (cocok) duplikat.push({ buang: p, simpan: cocok });
  }

  console.log(`Badge total       : ${semua.length}`);
  console.log(`Duplikat kriteria : ${duplikat.length}\n`);
  if (duplikat.length === 0) return console.log("Tidak ada duplikat.");

  let totalPindah = 0;
  for (const d of duplikat) {
    const dimiliki = await db.userBadge.count({ where: { badgeId: d.buang.id } });
    totalPindah += dimiliki;
    const k = d.buang.condition as Kondisi;
    console.log(`  buang "${d.buang.name}" (${d.buang.code})`);
    console.log(`    simpan "${d.simpan.name}" (${d.simpan.code})  syarat ${k.type} ${k.target}  dimiliki ${dimiliki} murid`);
  }
  console.log(`\nKepemilikan yang dipindahkan ke badge asli: ${totalPindah} baris`);

  if (!EXECUTE) return console.log("\n(dry-run — tidak ada yang dihapus)");

  for (const d of duplikat) {
    const punya = await db.userBadge.findMany({ where: { badgeId: d.buang.id }, select: { userId: true } });
    if (punya.length > 0) {
      // Pindahkan dulu supaya murid tidak kehilangan badge yang sudah diraih.
      await db.userBadge.createMany({
        data: punya.map((u) => ({ userId: u.userId, badgeId: d.simpan.id })),
        skipDuplicates: true,
      });
      await db.userBadge.deleteMany({ where: { badgeId: d.buang.id } });
    }
    await db.badge.delete({ where: { id: d.buang.id } });
  }
  console.log(`\nDihapus ${duplikat.length} badge duplikat; ${totalPindah} kepemilikan dipindahkan.`);
}

main()
  .catch((e) => {
    console.error("GAGAL:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
