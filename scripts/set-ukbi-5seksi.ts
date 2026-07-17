/**
 * Aktifkan simulasi UKBI 5 seksi (Kaidah, Membaca, Mendengarkan, Menulis, Berbicara)
 * untuk SEMUA paket UKBI. Menulis & Berbicara (konstruktif) dinilai AI otomatis.
 *
 * Idempoten. Track tanpa stok konstruktif (mis. SMA/Guru) tetap aman — seksi
 * kosong resolve 0 soal & ke-skip di rute GET.
 *
 * Jalankan (baca DATABASE_URL dari .env yang kamu buat):
 *   DATABASE_URL="$(grep '^DATABASE_URL=' .env | sed -E 's/^DATABASE_URL=//; s/^\"//; s/\"$//')" npx tsx scripts/set-ukbi-5seksi.ts
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const UKBI_TYPES = ["UKBI_SD", "UKBI_SMP", "UKBI_SMA", "UKBI_GURU_SIMULASI", "UKBI_SIMULASI", "UKBI"];

function tingkatFromType(type: string): string {
  if (type.includes("SD")) return "SD";
  if (type.includes("SMP")) return "SMP";
  if (type.includes("SMA")) return "SMA";
  if (type.includes("GURU")) return "GURU";
  return "SD";
}

function buildSections(duration: number) {
  return [
    { name: "Seksi I: Merespons Kaidah", count: 10, seksi: "MERESPONS_KAIDAH", timeLimit: Math.round(duration * 0.25) },
    { name: "Seksi II: Membaca", count: 15, seksi: "MEMBACA", timeLimit: Math.round(duration * 0.35) },
    { name: "Seksi III: Mendengarkan", count: 5, seksi: "MENDENGARKAN", timeLimit: Math.round(duration * 0.15) },
    { name: "Seksi IV: Menulis", count: 2, seksi: "MENULIS", timeLimit: Math.round(duration * 0.15) },
    { name: "Seksi V: Berbicara", count: 2, seksi: "BERBICARA", timeLimit: Math.round(duration * 0.10) },
  ];
}

async function main() {
  const pakets = await db.paketKompetensi.findMany({
    where: { type: { in: UKBI_TYPES as any } },
    select: { id: true, title: true, type: true, duration: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Paket UKBI: ${pakets.length}\n`);

  for (const p of pakets) {
    const duration = p.duration && p.duration > 0 ? p.duration : 75;
    const sections = buildSections(duration);
    const totalQ = sections.reduce((s, x) => s + x.count, 0);
    await db.paketKompetensi.update({
      where: { id: p.id },
      data: { sections: sections as any, sectionsData: sections as any, totalQuestions: totalQ, isActive: true },
    });

    // Cek stok konstruktif untuk track ini.
    const tingkat = tingkatFromType(p.type);
    const menulis = await db.uKBIQuestion.count({ where: { seksi: "MENULIS" as any, tingkat: tingkat as any, isActive: true } });
    const berbicara = await db.uKBIQuestion.count({ where: { seksi: "BERBICARA" as any, tingkat: tingkat as any, isActive: true } });
    const flag = menulis > 0 && berbicara > 0 ? "🟢 full 4-skills" : "🟡 MCQ (konstruktif kosong)";
    console.log(`  ✅ ${p.title} [${tingkat}] → 5 seksi | Menulis=${menulis} Berbicara=${berbicara} ${flag}`);
  }

  console.log("\nSelesai. Ingat: bump cache sudah v2 — deploy branch fix biar cache fresh.");
  await db.$disconnect();
  process.exit(0);
}

main().catch((e) => { console.error("❌ Gagal:", String(e).slice(0, 300)); process.exit(1); });
