/**
 * ⚠️ LEGACY — DO NOT RUN for new UKBI bank production.
 * Original fix script from seed-kompetensi era.
 * Kept for reference only — do not rerun without explicit approval.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const packages = await prisma.paketKompetensi.findMany({
    where: {
      OR: [
        { title: { contains: "Simulasi UKBI - Paket Lengkap" } },
        { title: { contains: "Latihan UKBI - Seksi I Mendengarkan" } },
        { title: { contains: "Latihan UKBI - Seksi II & III" } },
      ],
    },
    select: { id: true, title: true, type: true },
  });

  console.log("Updating packages:");
  
  // Update each package with correct sections
  const updates = [
    {
      title: "Simulasi UKBI - Paket Lengkap",
      sections: [
        { name: "Seksi I: Mendengarkan", seksi: "MENDENGARKAN", timeLimit: 40, count: 8 },
        { name: "Seksi II: Merespons Kaidah", seksi: "MERESPONS_KAIDAH", timeLimit: 30, count: 8 },
        { name: "Seksi III: Membaca", seksi: "MEMBACA", timeLimit: 50, count: 9 },
      ],
      totalQuestions: 25,
      duration: 120,
    },
    {
      title: "Latihan UKBI - Seksi I Mendengarkan",
      sections: [
        { name: "Seksi I: Mendengarkan", seksi: "MENDENGARKAN", timeLimit: 30, count: 10 },
      ],
      totalQuestions: 10,
      duration: 30,
    },
    {
      title: "Latihan UKBI - Seksi II & III",
      sections: [
        { name: "Seksi II: Merespons Kaidah", seksi: "MERESPONS_KAIDAH", timeLimit: 25, count: 10 },
        { name: "Seksi III: Membaca", seksi: "MEMBACA", timeLimit: 40, count: 10 },
      ],
      totalQuestions: 20,
      duration: 65,
    },
  ];

  for (const upd of updates) {
    const pkg = packages.find(p => p.title === upd.title);
    if (pkg) {
      await prisma.paketKompetensi.update({
        where: { id: pkg.id },
        data: {
          sections: upd.sections as any,
          totalQuestions: upd.totalQuestions,
          duration: upd.duration,
        },
      });
      console.log(`Updated: ${pkg.title} (${pkg.id})`);
    } else {
      console.log(`Not found: ${upd.title}`);
    }
  }

  console.log("\nDone!");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
