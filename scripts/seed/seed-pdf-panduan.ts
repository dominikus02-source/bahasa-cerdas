/**
 * Migrasi Buku Panduan SMP berdasarkan "_ PENETAPAN TOPIK AJAR BAHASA INDONESIA SMP.pdf"
 *
 * Run: npx tsx scripts/seed/seed-pdf-panduan.ts
 */
import { db } from "@/lib/db";
import type { Konten, Soal } from "./types";

/* =============================================
   DATA DARI PDF
   ============================================= */

// Mapping grade → (semester → topics)
// Format: { topik ajar, pic, kd }
const pdfTopics: Record<string, Record<number, { title: string; topik: string; kd: string; pic: string }[]>> = {
  VII: {
    1: [
      { title: "Bab 1: Teks Deskripsi", topik: "DESKRIPSI", kd: "3.1/4.1", pic: "Pak Alex" },
      { title: "Bab 2: Teks Cerita Rakyat (Fabel dan Legenda)", topik: "CERITA_RAKYAT", kd: "3.2/4.2", pic: "Pak Alex" },
      { title: "Bab 3: Teks Laporan Hasil Observasi", topik: "LAPORAN", kd: "3.3/4.3", pic: "Pak Alex" },
      { title: "Bab 4: Teks Puisi Rakyat", topik: "PUISI_RAKYAT", kd: "3.4/4.4", pic: "Pak Alex" },
    ],
    2: [
      { title: "Bab 5: Teks Prosedur", topik: "PROSEDUR", kd: "3.5/4.5", pic: "Pak Alex" },
      { title: "Bab 6: Teks Surat", topik: "SURAT", kd: "3.6/4.6", pic: "Pak Alex" },
      { title: "Bab 7: Teks Cerita Fantasi", topik: "FANTASI", kd: "3.7/4.7", pic: "Pak Alex" },
      { title: "Bab 8: Giat Literasi — Teks Fiksi dan Nonfiksi", topik: "FIKSI_NONFIKSI", kd: "3.8/4.8", pic: "Pak Alex" },
    ],
  },
  VIII: {
    1: [
      { title: "Bab 1: Teks Berita", topik: "BERITA", kd: "3.1/4.1", pic: "Pak Hadi" },
      { title: "Bab 2: Teks Drama", topik: "DRAMA", kd: "3.2/4.2", pic: "Pak Hadi" },
      { title: "Bab 3: Teks Eksplanasi", topik: "EKSPLANASI", kd: "3.3/4.3", pic: "Pak Hadi" },
      { title: "Bab 4: Teks Puisi Baru", topik: "PUISI", kd: "3.4/4.4", pic: "Pak Hadi" },
    ],
    2: [
      { title: "Bab 5: Teks Eksposisi (Artikel Ilmiah Populer)", topik: "EKSPOSISI", kd: "3.5/4.5", pic: "Pak Hadi" },
      { title: "Bab 6: Teks Ulasan — Resensi", topik: "ULASAN", kd: "3.6/4.6", pic: "Pak Hadi" },
      { title: "Bab 7: Teks Pariwara / Iklan / Poster", topik: "IKLAN", kd: "3.7/4.7", pic: "Pak Hadi" },
      { title: "Bab 8: Giat Literasi — Teks Fiksi dan Nonfiksi", topik: "FIKSI_NONFIKSI", kd: "3.8/4.8", pic: "Pak Hadi" },
    ],
  },
  IX: {
    1: [
      { title: "Bab 1: Teks Tanggapan Kritis", topik: "TANGGAPAN", kd: "3.1/4.1", pic: "Pak Alex" },
      { title: "Bab 2: Teks Cerpen", topik: "CERPEN", kd: "3.2/4.2", pic: "Pak Alex" },
      { title: "Bab 3: Teks Pidato Persuasif", topik: "PIDATO", kd: "3.3/4.3", pic: "Pak Alex" },
    ],
    2: [
      { title: "Bab 4: Teks Laporan (Penelitian) Percobaan", topik: "LAPORAN", kd: "3.4/4.4", pic: "Pak Hadi" },
      { title: "Bab 5: Teks Cerita Inspiratif", topik: "CERITA_INSPIRATIF", kd: "3.5/4.5", pic: "Pak Hadi" },
      { title: "Bab 6: Teks Diskusi", topik: "DISKUSI", kd: "3.6/4.6", pic: "Pak Hadi" },
    ],
  },
};

const kdFrameworks = [
  { id: 1, title: "Hakikat Teks" },
  { id: 2, title: "Komposisi Umum Isi Teks" },
  { id: 3, title: "Jenis atau Varian Teks" },
  { id: 4, title: "Pola Umum dan Khusus Struktur Teks" },
  { id: 5, title: "Kaidah dan Fitur Kebahasaan Teks" },
  { id: 6, title: "Pendalaman Kebahasaan" },
  { id: 7, title: "Prosedur Memproduksi Teks" },
];

/* =============================================
   HELPERS
   ============================================= */

function buatKontenDasar(tema: string): Konten {
  return {
    belajar: {
      tujuan: [
        `Memahami hakikat, ciri, dan fungsi ${tema} dalam kehidupan sehari-hari`,
        `Mengidentifikasi pokok-pokok isi dan jenis-jenis ${tema}`,
        `Menganalisis pola struktur dan kaidah kebahasaan ${tema}`,
        `Mendalami fitur kebahasaan utama dalam ${tema}`,
        `Memproduksi ${tema} dengan langkah yang sistematis`,
      ],
      materi: [
        {
          judul: `1. Hakikat ${tema}`,
          isi: [
            `Penjelasan tentang definisi, ciri-ciri umum, dan fungsi ${tema.toLowerCase()} dalam kehidupan sehari-hari.`,
            "",
            `Ciri-ciri ${tema.toLowerCase()}:`,
            "• Ciri pertama yang membedakan dengan teks lain",
            "• Ciri kedua yang mudah dikenali",
            "• Fungsi praktis atau aplikasi teks dalam kehidupan sehari-hari",
          ],
          contoh: [
            `Contoh ${tema.toLowerCase()} yang baik:`,
            `Tuliskan contoh singkat di sini.`,
          ],
        },
        {
          judul: `2. Komposisi Umum Isi ${tema}`,
          isi: [
            `Pokok-pokok isi informasi yang membangun ${tema.toLowerCase()} secara umum.`,
            "",
            "• Pokok isi pertama",
            "• Pokok isi kedua",
            "• Pokok isi ketiga",
          ],
          contoh: [],
        },
        {
          judul: `3. Jenis atau Varian ${tema}`,
          isi: [
            `Penjenisan ${tema.toLowerCase()} berdasarkan kategori atau kriteria pengklasifikasi.`,
            "",
            "• Jenis pertama dan penjelasannya",
            "• Jenis kedua dan penjelasannya",
            "• Jenis ketiga dan penjelasannya",
          ],
          contoh: [],
        },
        {
          judul: `4. Pola Struktur ${tema}`,
          isi: [
            `Pola umum struktur ${tema.toLowerCase()} dan pola khusus mengikuti jenis variannya.`,
            "",
            "• Bagian pertama struktur",
            "• Bagian kedua struktur",
            "• Bagian ketiga struktur",
          ],
          contoh: [],
        },
        {
          judul: `5. Kaidah dan Fitur Kebahasaan ${tema}`,
          isi: [
            `Ragam bahasa dan fitur-fitur bahasa yang lazim digunakan dalam ${tema.toLowerCase()}.`,
            "",
            "• Fitur bahasa pertama dan contohnya",
            "• Fitur bahasa kedua dan contohnya",
            "• Fitur bahasa ketiga dan contohnya",
          ],
          contoh: [],
        },
        {
          judul: `6. Pendalaman Kebahasaan — Fitur Bahasa Utama ${tema}`,
          isi: [
            `Mendalami satu fitur bahasa (jenis kata/kalimat, tanda baca) yang menjadi fitur utama ${tema.toLowerCase()}.`,
            "",
            "• Penjelasan fitur bahasa utama",
            "• Contoh penggunaan dalam kalimat",
            "• Latihan identifikasi",
          ],
          contoh: [],
        },
        {
          judul: `7. Prosedur Memproduksi ${tema}`,
          isi: [
            `Langkah-langkah memproduksi ${tema.toLowerCase()} dari pra produksi hingga pasca produksi.`,
            "",
            "TAHAP PRA-PRODUKSI:",
            "• Langkah 1",
            "• Langkah 2",
            "",
            "TAHAP PRODUKSI:",
            "• Langkah 3",
            "• Langkah 4",
            "",
            "TAHAP PASCA-PRODUKSI:",
            "• Langkah 5",
            "• Langkah 6",
            "",
            "Tips untuk menghasilkan karya terbaik:",
            "• Tip 1",
            "• Tip 2",
          ],
          contoh: [],
        },
      ],
      rangkuman: [
        `Rangkuman 1 tentang ${tema.toLowerCase()}.`,
        `Rangkuman 2 tentang ${tema.toLowerCase()}.`,
        `Rangkuman 3 tentang ${tema.toLowerCase()}.`,
        `Rangkuman 4 tentang ${tema.toLowerCase()}.`,
        `Rangkuman 5 tentang ${tema.toLowerCase()}.`,
        `Rangkuman 6 tentang ${tema.toLowerCase()}.`,
      ],
    },
    latihan: [],
    praktik: {
      petunjuk: `Tulislah ${tema.toLowerCase()} sesuai dengan langkah-langkah yang telah dipelajari. Ikuti struktur dan kaidah kebahasaan yang benar.`,
      tips: [
        `Pahami dulu hakikat ${tema.toLowerCase()} sebelum mulai menulis.`,
        "Buat kerangka tulisan terlebih dahulu.",
        "Perhatikan struktur dan kaidah kebahasaan.",
        "Baca ulang dan perbaiki kesalahan.",
      ],
    },
    kuis: [],
  };
}

/* =============================================
   MAIN MIGRATION
   ============================================= */

async function migrate() {
  const gradeMap: Record<string, number> = { VII: 1, VIII: 3, IX: 5 };

  for (const [grade, sems] of Object.entries(pdfTopics)) {
    for (const [semStr, topics] of Object.entries(sems)) {
      const semester = Number(semStr);
      const levelNum = gradeMap[grade] + (semester === 2 ? 1 : 0);

      // Find existing LearningLevel
      const level = await db.learningLevel.findFirst({
        where: { type: "PANDUAN", level: levelNum },
      });
      if (!level) {
        console.log(`Level not found for ${grade} S${semester} (level ${levelNum})`);
        continue;
      }

      console.log(`\n=== ${level.title} (level ${levelNum}) ===`);

      // Deactivate all existing units first
      await db.learningUnit.updateMany({
        where: { levelId: level.id },
        data: { isActive: false },
      });

      // Create or update each topic
      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        const order = i + 1;

        // Find existing unit by match
        let unit = await db.learningUnit.findFirst({
          where: {
            levelId: level.id,
            OR: [
              { title: topic.title },
              { topik: topic.topik },
              { title: { contains: topic.title.replace("Bab 1: ", "").replace("Bab 2: ", "").replace("Bab 3: ", "").replace("Bab 4: ", "").replace("Bab 5: ", "").replace("Bab 6: ", "").replace("Bab 7: ", "").replace("Bab 8: ", "") } },
            ],
          },
        });

        const konten = buatKontenDasar(topic.title.replace(/^Bab \d+: /, ""));

        if (unit) {
          // Update existing
          await db.learningUnit.update({
            where: { id: unit.id },
            data: {
              title: topic.title,
              topik: topic.topik,
              kd: topic.kd,
              grade,
              semester,
              order,
              isActive: true,
              content: JSON.stringify(konten),
            },
          });
          console.log(`  UPDATED: ${topic.title}`);
        } else {
          // Create new
          await db.learningUnit.create({
            data: {
              levelId: level.id,
              title: topic.title,
              topik: topic.topik,
              kd: topic.kd,
              grade,
              semester,
              order,
              isActive: true,
              content: JSON.stringify(konten),
            },
          });
          console.log(`  CREATED: ${topic.title}`);
        }
      }

      // For levels with fewer topics than existing slots, create enrichment units
      const existingCount = await db.learningUnit.count({
        where: { levelId: level.id, isActive: true },
      });

      if (existingCount < 6) {
        for (let i = existingCount; i < 6; i++) {
          const order = i + 1;
          const title = `Pengayaan ${order - topics.length}: Praktik ${grade} S${semester}`;
          const konten = buatKontenDasar(`Pengayaan ${grade} Semester ${semester}`);

          // Try to find existing enrichment unit
          let enrichUnit = await db.learningUnit.findFirst({
            where: { levelId: level.id, order, isActive: false, title: { contains: "Pengayaan" } },
          });

          if (enrichUnit) {
            await db.learningUnit.update({
              where: { id: enrichUnit.id },
              data: { title, order, isActive: true, content: JSON.stringify(konten) },
            });
          } else {
            await db.learningUnit.create({
              data: {
                levelId: level.id,
                title,
                topik: "PENGAYAAN",
                kd: "-",
                grade,
                semester,
                order,
                isActive: true,
                content: JSON.stringify(konten),
              },
            });
          }
          console.log(`  CREATED: ${title}`);
        }
      }
    }
  }

  console.log("\n✅ Migrasi selesai!");
}

migrate()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
