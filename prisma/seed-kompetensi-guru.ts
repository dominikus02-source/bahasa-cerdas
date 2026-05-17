import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log(" Creating UKBI & TKA GURU packages...");

  // Check if packages exist
  const existingPackages = await prisma.paketKompetensi.count({ 
    where: { type: { in: ["UKBI_GURU_SIMULASI", "UKBI_GURU_LATIHAN", "TKA_GURU_SIMULASI", "TKA_GURU_LATIHAN"] } } 
  });

  if (existingPackages === 0) {
    // UKBI Guru Simulasi
    await prisma.paketKompetensi.create({
      data: {
        title: "Simulasi UKBI Guru",
        description: "Simulasi UKBI untuk Guru Bahasa Indonesia. Menguji kemampuan berbahasa Indonesia dalam konteks profesional keguruan.",
        type: "UKBI_GURU_SIMULASI",
        mode: "SIMULASI",
        duration: 90,
        passingScore: 500,
        passingGrade: "MADYA",
        totalQuestions: 15,
        isActive: true,
        isPremium: false,
        attemptLimit: -1,
        sections: [
          { name: "Mendengarkan (Konteks Pedagogik)", seksi: "MENDENGARKAN", timeLimit: 30, count: 5 },
          { name: "Merespons Kaidah", seksi: "MERESPONS_KAIDAH", timeLimit: 30, count: 5 },
          { name: "Membaca (Konteks Profesional)", seksi: "MEMBACA", timeLimit: 30, count: 5 },
        ],
      },
    });

    // UKBI Guru Latihan
    await prisma.paketKompetensi.create({
      data: {
        title: "Latihan UKBI Guru - Kaidah Bahasa",
        description: "Latihan soal kaidah bahasa Indonesia yang tepat untuk konteks penulisan akademik dan profesional guru.",
        type: "UKBI_GURU_LATIHAN",
        mode: "LATIHAN",
        duration: 45,
        passingScore: 0,
        passingGrade: "-",
        totalQuestions: 10,
        isActive: true,
        isPremium: false,
        attemptLimit: -1,
        sections: [
          { name: "Merespons Kaidah Bahasa", seksi: "MERESPONS_KAIDAH", timeLimit: 45, count: 10 },
        ],
      },
    });

    // TKA Guru Simulasi
    await prisma.paketKompetensi.create({
      data: {
        title: "Simulasi TKA Guru",
        description: "Simulasi TKA (Tes Kompetensi Akademik) untuk Guru. Menguji kompetensi pedagogik dan profesional sesuai standar BSNP.",
        type: "TKA_GURU_SIMULASI",
        mode: "SIMULASI",
        duration: 120,
        passingScore: 65,
        passingGrade: "B",
        totalQuestions: 15,
        isActive: true,
        isPremium: false,
        attemptLimit: -1,
        sections: [
          { name: "Pedagogik", kompetensi: "PEDAGOGIK", timeLimit: 60, count: 8 },
          { name: "Profesional", kompetensi: "PROFESIONAL", timeLimit: 60, count: 7 },
        ],
      },
    });

    // TKA Guru Latihan
    await prisma.paketKompetensi.create({
      data: {
        title: "Latihan TKA Guru - Pedagogik",
        description: "Latihan soal Pedagogik untuk persiapan UKG dan sertifikasi guru.",
        type: "TKA_GURU_LATIHAN",
        mode: "LATIHAN",
        duration: 60,
        passingScore: 0,
        passingGrade: "-",
        totalQuestions: 10,
        isActive: true,
        isPremium: false,
        attemptLimit: -1,
        sections: [
          { name: "Pedagogik", kompetensi: "PEDAGOGIK", timeLimit: 60, count: 10 },
        ],
      },
    });

    console.log("✅ Added 4 packages for GURU (UKBI + TKA Simulasi & Latihan)");
  } else {
    console.log(" Packages already exist, skipping...");
  }

  console.log("\n Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());