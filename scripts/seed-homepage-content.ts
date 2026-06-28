import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const GURU_ID = "cmqxd86to0000wrkfj8ijeoym";

const articles = [
  {
    title: "Cara Efektif Mengajar Puisi di Kelas VII dengan Metode Kreatif",
    slug: "mengajar-puisi-kelas-vii-kreatif",
    excerpt:
      "Pelajari metode kreatif untuk mengajarkan puisi kepada siswa kelas VII agar lebih menarik dan mudah dipahami.",
    content: `Mengajar puisi di kelas VII sering kali menjadi tantangan tersendiri. Siswa pada usia ini masih dalam masa transisi dari pembelajaran tematik ke pembelajaran yang lebih terstruktur. Berikut adalah beberapa metode kreatif yang bisa diterapkan.

1. Metode Membaca Ekspresif
Ajak siswa membaca puisi dengan ekspresi yang sesuai. Guru bisa memberi contoh terlebih dahulu, lalu meminta siswa menirukan. Teknik ini membantu siswa memahami suasana hati dalam puisi.

2. Metode Menulis Puisi Berantai
Bagilah kelas menjadi beberapa kelompok. Setiap siswa menulis satu baris puisi, lalu dilanjutkan oleh teman sekelompoknya. Hasilnya akan menjadi puisi kolaboratif yang unik.

3. Metode Musikalisasi Puisi
Minta siswa memilih puisi yang sudah dipelajari, lalu mengubahnya menjadi lagu dengan iringan musik sederhana. Ini mengaktifkan kecerdasan musikal siswa.

4. Metode Visualisasi
Siswa menggambar ilustrasi berdasarkan puisi yang dibacakan. Ini membantu siswa yang memiliki gaya belajar visual.

PENTING: Pastikan setiap metode tetap berfokus pada pemahaman struktur puisi, diksi, dan pesan yang ingin disampaikan.

Tips: Gunakan puisi-puisi kontemporer karya penyair Indonesia seperti Sapardi Djoko Damono atau WS Rendra agar lebih relevan dengan kehidupan siswa saat ini.`,
    coverImage: null,
    tags: ["pembelajaran", "puisi", "kelas-vii", "metode-mengajar"],
    readCount: 245,
  },
  {
    title: "Panduan Lengkap Menyusun RPP Kurikulum Merdeka untuk Mata Pelajaran Bahasa Indonesia",
    slug: "panduan-rpp-kurikulum-merdeka-bahasa-indonesia",
    excerpt:
      "Panduan langkah demi langkah menyusun RPP Kurikulum Merdeka yang sesuai dengan capaian pembelajaran Bahasa Indonesia.",
    content: `Kurikulum Merdeka memberikan keleluasaan kepada guru untuk merancang pembelajaran yang sesuai dengan kebutuhan siswa. Berikut panduan menyusun RPP Bahasa Indonesia yang efektif.

Langkah 1: Analisis Capaian Pembelajaran
CP adalah kompetensi yang harus dicapai siswa di akhir fase. Untuk Bahasa Indonesia, CP mencakup kemampuan menyimak, membaca, berbicara, dan menulis.

Langkah 2: Tentukan Tujuan Pembelajaran
Turunkan CP menjadi TP yang lebih operasional. Contoh: "Siswa mampu menulis teks deskripsi dengan struktur yang benar dan pilihan kata yang tepat."

Langkah 3: Rancang Kegiatan Pembelajaran
Gunakan model pembelajaran yang variatif:
• Pendahuluan (10 menit): apersepsi, motivasi, penyampaian tujuan
• Inti (60 menit): eksplorasi, diskusi, praktik menulis
• Penutup (10 menit): refleksi, umpan balik, tindak lanjut

Langkah 4: Siapkan Asesmen
Asesmen formatif dilakukan selama proses pembelajaran. Asesmen sumatif di akhir untuk mengukur pencapaian tujuan.

Langkah 5: Pilih Media dan Sumber Belajar
Gunakan teks autentik dari koran, majalah, atau media digital sebagai bahan ajar.

✓ RPP Kurikulum Merdeka lebih sederhana dari KTSP
✓ Fokus pada pembelajaran yang bermakna
✓ Beri ruang untuk diferensiasi sesuai kebutuhan siswa`,
    coverImage: null,
    tags: ["rpp", "kurikulum-merdeka", "panduan", "bahasa-indonesia"],
    readCount: 389,
  },
  {
    title: "5 Strategi Meningkatkan Kemampuan Menulis Teks Argumentasi pada Siswa SMA",
    slug: "strategi-menulis-teks-argumentasi-sma",
    excerpt:
      "Teks argumentasi adalah salah satu materi yang paling menantang. Simak 5 strategi jitu untuk membantu siswa SMA menguasainya.",
    content: `Kemampuan menulis teks argumentasi sangat penting karena melatih siswa berpikir kritis dan menyampaikan pendapat secara terstruktur. Sayangnya, banyak siswa kesulitan dalam menuangkan argumen mereka.

Berikut 5 strategi yang terbukti efektif:

1. Model Teks Argumentasi
Mulailah dengan memberikan contoh teks argumentasi yang baik. Analisis bersama struktur: tesis, argumen pendukung, dan penegasan ulang.

2. Teknik Debate Wall
Tempelkan pernyataan kontroversial di papan tulis. Minta siswa menulis argumen setuju atau tidak setuju di sticky notes, lalu tempelkan di bawah pernyataan.

3. Kerangka Karangan
Ajari siswa membuat kerangka sebelum menulis:
• Tesis: pernyataan posisi penulis
• Argumen 1: alasan pertama + bukti
• Argumen 2: alasan kedua + bukti
• Argumen 3: alasan ketiga + bukti
• Penegasan ulang: simpulan yang menguatkan tesis

4. Peer Review
Tukar tulisan antarteman. Beri panduan review: apakah argumen didukung bukti? Apakah struktur sudah lengkap?

5. Publikasi Karya
Publikasikan tulisan terbaik di mading kelas atau blog sekolah. Ini memberi motivasi eksternal bagi siswa.

• Teks argumentasi berbeda dengan teks persuasi
• Argumentasi mengandalkan logika dan fakta
• Persuasi boleh menggunakan imbauan emosional

Tips: Gunakan isu-isu terkini yang dekat dengan keseharian siswa seperti larangan HP di sekolah atau sistem zonasi PPDB.`,
    coverImage: null,
    tags: ["menulis", "argumentasi", "sma", "strategi-pembelajaran"],
    readCount: 178,
  },
  {
    title: "Memanfaatkan Media Digital untuk Pembelajaran Bahasa Indonesia di Era AI",
    slug: "media-digital-pembelajaran-bahasa-indonesia-ai",
    excerpt:
      "Media digital dan AI membuka peluang baru dalam pembelajaran Bahasa Indonesia. Simak cara memanfaatkannya secara optimal.",
    content: `Perkembangan teknologi digital dan kecerdasan buatan (AI) menghadirkan peluang sekaligus tantangan dalam pembelajaran Bahasa Indonesia. Guru perlu bijak memilih dan menggunakan media yang tepat.

Media Digital yang Efektif:
✓ Aplikasi menulis kolaboratif (Google Docs, Padlet)
✓ Platform kuis interaktif (Quizizz, Kahoot)
✓ Video pembelajaran (YouTube Edu, Ruang Guru)
✓ Media sosial edukatif (Instagram Edu, TikTok Edu)

Pemanfaatan AI untuk Pembelajaran:
• AI dapat membantu siswa memperbaiki tata bahasa
• AI bisa menjadi asisten brainstorming ide tulisan
• AI untuk latihan percakapan bahasa Indonesia formal

PENTING: AI adalah alat bantu, bukan pengganti proses belajar. Siswa harus tetap memahami kaidah bahasa secara mandiri.

Rekomendasi Platform:
1. BahasaCerdas.com — platform lengkap untuk belajar Bahasa Indonesia
2. Quizizz — untuk kuis interaktif
3. Canva — untuk membuat poster dan infografis kebahasaan
4. Wattpad — untuk publikasi cerita karya siswa`,
    coverImage: null,
    tags: ["media-digital", "ai", "pembelajaran", "teknologi"],
    readCount: 312,
  },
  {
    title: "Cara Asyik Belajar Teks Negosiasi Lewat Bermain Peran",
    slug: "belajar-teks-negosiasi-bermain-peran",
    excerpt:
      "Teks negosiasi bisa jadi materi yang membosankan jika hanya teori. Coba metode bermain peran yang seru dan interaktif.",
    content: `Teks negosiasi adalah materi yang sangat dekat dengan kehidupan sehari-hari. Sayangnya, penyajian yang terlalu teoretis membuat siswa kurang antusias. Solusinya: bermain peran (role playing)!

Langkah-langkah Bermain Peran:

1. Buat Skenario
Siapkan 3-4 skenario negosiasi yang relevan:
• Negosiasi antara pembeli dan penjual di pasar
• Negosiasi antara siswa dan guru tentang tenggat tugas
• Negosiasi antara dua teman tentang pembagian tugas kelompok

2. Bagi Peran
• 2-3 siswa sebagai pihak yang bernegosiasi
• 1 siswa sebagai pengamat yang mencatat struktur negosiasi

3. Lakukan Negosiasi
Beri waktu 5-7 menit. Siswa harus mencapai kesepakatan di akhir.

4. Analisis Struktur
Bahas bersama: orientasi, pengajuan, penawaran, persetujuan. Catat kalimat-kalimat kunci yang digunakan.

5. Latihan Menulis
Minta siswa menulis teks negosiasi berdasarkan skenario yang berbeda.

Tips: Rekam penampilan siswa menggunakan HP, lalu putar ulang untuk dianalisis bersama. Ini membuat pembelajaran lebih reflektif.

• Negosiasi bertujuan mencari solusi win-win
• Bahasa yang digunakan harus santun dan persuasif
• Struktur negosiasi bersifat situasional`,
    coverImage: null,
    tags: ["negosiasi", "bermain-peran", "pembelajaran-aktif", "sma"],
    readCount: 134,
  },
  {
    title: "Tips Sukses UKBI: Persiapan dan Strategi Mengerjakan Soal",
    slug: "tips-sukses-ukbi-persiapan-strategi",
    excerpt:
      "Uji Kemahiran Berbahasa Indonesia (UKBI) adalah tolok ukur kemampuan berbahasa. Pelajari tips dan trik meraih skor terbaik.",
    content: `UKBI (Uji Kemahiran Berbahasa Indonesia) adalah standar kemahiran berbahasa Indonesia yang diakui secara nasional. Berikut panduan persiapan lengkapnya.

Sekilas UKBI:
✓ UKBI mengukur 5 seksi: Mendengarkan, Merespons Kaidah, Membaca, Menulis, dan Berbicara
✓ Skor tertinggi: Istimewa (750+)
✓ Predikat: Istimewa – Marginal – Terbatas

Strategi Per Seksi:

1. Mendengarkan
• Konsentrasi penuh, jangan sampai kehilangan fokus
• Catat kata kunci yang didengar
• Biasakan mendengar berbagai aksen dan dialek

2. Merespons Kaidah
• Kuasai EYD V terbaru
• Pelajari pola kalimat efektif
• Perhatikan penggunaan kata baku dan tidak baku

3. Membaca
• Baca pertanyaan terlebih dahulu sebelum membaca teks
• Kelola waktu dengan baik
• Cari ide pokok di setiap paragraf

4. Menulis (tulis tangan)
• Perhatikan kerapian tulisan
• Gunakan ejaan yang benar
• Struktur karangan harus sistematis

5. Berbicara
• Bicara dengan jelas dan percaya diri
• Gunakan kalimat efektif
• Jangan terlalu cepat atau terlalu lambat

PENTING: Latihan rutin adalah kunci sukses UKBI. Gunakan fitur UKBI di BahasaCerdas.com untuk simulasi dan latihan soal.`,
    coverImage: null,
    tags: ["ukbi", "tips", "persiapan-ujian", "kemahiran-berbahasa"],
    readCount: 456,
  },
];

const videos = [
  {
    title: "Belajar Menulis Puisi untuk Pemula",
    description:
      "Video ini membahas teknik dasar menulis puisi, mulai dari menentukan tema, memilih diksi, hingga menyusun bait.",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnailUrl: null,
    duration: 480,
    source: "YOUTUBE" as const,
    category: "WRITING" as const,
    grade: "VII",
    tags: ["puisi", "menulis", "pemula"],
    views: 1250,
  },
  {
    title: "Bedah Buku: Ronggeng Dukuh Paruk Karya Ahmad Tohari",
    description:
      "Bedah novel klasik Indonesia yang mengangkat budaya Banyumas. Cocok untuk materi sastra SMA kelas XII.",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnailUrl: null,
    duration: 720,
    source: "YOUTUBE" as const,
    category: "SASTRA" as const,
    grade: "XII",
    tags: ["sastra", "novel", "ahmad-tohari", "bedah-buku"],
    views: 890,
  },
  {
    title: "Tips Menjawab Soal TKA Bahasa Indonesia dengan Cepat",
    description:
      "Strategi mengerjakan soal Tes Kemampuan Akademik (TKA) Bahasa Indonesia dengan efisien dan akurat.",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnailUrl: null,
    duration: 600,
    source: "YOUTUBE" as const,
    category: "PEMBELAJARAN" as const,
    grade: null,
    tags: ["tka", "utbk", "tips", "bahasa-indonesia"],
    views: 2100,
  },
  {
    title: "Cara Membaca Cepat untuk Memahami Teks Eksplanasi",
    description:
      "Teknik membaca cepat (speed reading) khusus untuk teks eksplanasi. Tingkatkan kecepatan baca tanpa mengurangi pemahaman.",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnailUrl: null,
    duration: 360,
    source: "YOUTUBE" as const,
    category: "READING" as const,
    grade: "XI",
    tags: ["membaca-cepat", "teks-eksplanasi", "speed-reading"],
    views: 567,
  },
  {
    title: "Praktik Baik: Mengajar Teks Prosedur dengan Media Infografis",
    description:
      "Rekaman praktik mengajar teks prosedur menggunakan infografis sebagai media visual. Inspirasi untuk guru Bahasa Indonesia.",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnailUrl: null,
    duration: 900,
    source: "YOUTUBE" as const,
    category: "PEMBELAJARAN" as const,
    grade: "VII",
    tags: ["teks-prosedur", "infografis", "praktik-mengajar"],
    views: 340,
  },
  {
    title: "Webinar: Implementasi Kurikulum Merdeka dalam Pembelajaran Bahasa Indonesia",
    description:
      "Webinar bersama praktisi pendidikan tentang implementasi Kurikulum Merdeka untuk mapel Bahasa Indonesia jenjang SMP dan SMA.",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    thumbnailUrl: null,
    duration: 3600,
    source: "YOUTUBE" as const,
    category: "MEDIA" as const,
    grade: null,
    tags: ["kurikulum-merdeka", "webinar", "implementasi"],
    views: 780,
  },
];

const karyas: {
  title: string;
  description: string;
  type: string;
  grade: string;
  price: number;
  downloads: number;
}[] = [
  {
    title: "RPP Teks Deskripsi Kelas VII Semester 1",
    description:
      "RPP lengkap teks deskripsi untuk kelas VII semester 1. Termasuk LKPD, instrumen penilaian, dan bahan ajar.",
    type: "RPP",
    grade: "VII",
    price: 25000,
    downloads: 120,
  },
  {
    title: "Modul Ajar Teks Narasi Kurikulum Merdeka",
    description:
      "Modul ajar teks narasi berdasarkan capaian pembelajaran Kurikulum Merdeka. Dilengkapi contoh teks dan latihan soal.",
    type: "MODUL",
    grade: "VII",
    price: 35000,
    downloads: 89,
  },
  {
    title: "PPT Materi Puisi Rakyat untuk Kelas VII",
    description:
      "Slide presentasi interaktif tentang puisi rakyat (pantun, syair, gurindam) dengan animasi menarik.",
    type: "PPT",
    grade: "VII",
    price: 20000,
    downloads: 210,
  },
  {
    title: "Bank Soal Teks Argumentasi Kelas XI (50 Soal)",
    description:
      "Kumpulan 50 soal pilihan ganda teks argumentasi lengkap dengan kunci jawaban dan pembahasan.",
    type: "SOAL",
    grade: "XI",
    price: 15000,
    downloads: 67,
  },
  {
    title: "Ebook: Panduan Lengkap UKBI untuk Guru dan Siswa",
    description:
      "Buku digital panduan UKBI yang membahas strategi, tips, dan contoh soal untuk setiap seksi UKBI.",
    type: "EBOOK",
    grade: null,
    price: 45000,
    downloads: 340,
  },
  {
    title: "Video Tutorial Menulis Teks Eksposisi (Paket 5 Video)",
    description:
      "Paket 5 video tutorial menulis teks eksposisi lengkap dari pengertian hingga contoh. Format MP4.",
    type: "VIDEO",
    grade: "X",
    price: 50000,
    downloads: 45,
  },
];

async function main() {
  console.log("Seeding homepage content...\n");

  // Check if any data already exists
  const existingArtikel = await db.artikel.count();
  const existingVideo = await db.video.count();
  const existingKarya = await db.karya.count();

  console.log(`Existing data — Artikel: ${existingArtikel}, Video: ${existingVideo}, Karya: ${existingKarya}`);

  if (existingArtikel > 0 && existingVideo > 0 && existingKarya > 0) {
    console.log("Content already exists, skipping seed.");
    return;
  }

  // Seed Artikel
  if (existingArtikel === 0) {
    console.log("\nSeeding Artikel...");
    for (const a of articles) {
      await db.artikel.create({
        data: {
          ...a,
          isPublished: true,
          authorId: GURU_ID,
        },
      });
      console.log(`  ✓ ${a.title}`);
    }
  }

  // Seed Video
  if (existingVideo === 0) {
    console.log("\nSeeding Video...");
    for (const v of videos) {
      await db.video.create({
        data: {
          ...v,
          isPublished: true,
          creatorId: GURU_ID,
        },
      });
      console.log(`  ✓ ${v.title}`);
    }
  }

  // Seed Karya
  if (existingKarya === 0) {
    console.log("\nSeeding Karya...");
    for (const k of karyas) {
      await db.karya.create({
        data: {
          title: k.title,
          description: k.description,
          type: k.type as any,
          grade: k.grade,
          price: k.price,
          downloads: k.downloads,
          isPublished: true,
          fileUrl: "https://example.com/sample.pdf",
          fileType: "PDF" as any,
          sellerId: GURU_ID,
        },
      });
      console.log(`  ✓ ${k.title}`);
    }
  }

  console.log("\n✓ Seeding complete!");
  console.log(`  Artikel: ${articles.length} created`);
  console.log(`  Video: ${videos.length} created`);
  console.log(`  Karya: ${karyas.length} created`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  db.$disconnect();
  process.exit(1);
});
