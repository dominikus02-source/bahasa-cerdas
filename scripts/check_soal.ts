import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const mendengarkn = await prisma.uKBIQuestion.count({ where: { seksi: "MENDENGARKAN", isActive: true } });
  const merespons = await prisma.uKBIQuestion.count({ where: { seksi: "MERESPONS_KAIDAH", isActive: true } });
  const membaca = await prisma.uKBIQuestion.count({ where: { seksi: "MEMBACA", isActive: true } });
  const total = await prisma.uKBIQuestion.count({ where: { isActive: true } });
  
  console.log(`Soal UKBI tersedia:`);
  console.log(`- MENDENGARKAN: ${mendengarkn}`);
  console.log(`- MERESPONS_KAIDAH: ${merespons}`);
  console.log(`- MEMBACA: ${membaca}`);
  console.log(`- TOTAL: ${total}`);
  
  // Check paket sections
  const pakets = await prisma.paketKompetensi.findMany({
    where: {
      OR: [
        { title: { contains: "Simulasi UKBI - Paket Lengkap" } },
        { title: { contains: "Latihan UKBI - Seksi I" } },
        { title: { contains: "Latihan UKBI - Seksi II" } },
      ],
    },
    select: { id: true, title: true, type: true, sections: true },
  });
  
  console.log(`\nPaket yang diupdate:`);
  pakets.forEach((p: any) => {
    console.log(`- ${p.title}`);
    console.log(`  sections: ${JSON.stringify(p.sections)}`);
  });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
