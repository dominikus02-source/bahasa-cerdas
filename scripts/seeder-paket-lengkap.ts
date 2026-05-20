import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Additional UKBI questions for variety
const ADDITIONAL_UKBI_SMP = [
  { seksi: "MENDENGARKAN", text: "Perhatikan pengumuman berikut! 'Kegiatan ekstrakurikuler pramuka akan dilaksanakan setiap hari Sabtu pukul 14.00 di lapangan sekolah. Semua anggota wajib membawa tongkat dan tali temali.'", passage: "Apa yang wajib dibawa anggota pramuka?", type: "PILIHAN_GANDA", options: [{id:"A",text:"Seragam olahraga"},{id:"B",text:"Tongkat dan tali temali"},{id:"C",text:"Buku pelajaran"},{id:"D",text:"Alat musik"}], correctAnswer: "B", explanation: "Pengumuman menyebutkan 'wajib membawa tongkat dan tali temali.'", difficulty: "EASY", cognitive: "PEMAHAMAN", domain: "SOSIAL", keywords: ["pramuka", "ekstrakurikuler"], tingkat: "SMP", isVerified: true },
  { seksi: "MENDENGARKAN", text: "Perhatikan dialog berikut! Guru: 'Anak-anak, minggu depan kita akan study tour ke Museum Fatahillah.' Murid: 'Wah, asyik! Kami boleh foto-foto, Bu?' Guru: 'Tentu, tapi jangan menyentuh koleksi museum.'", passage: "Apa larangan saat study tour?", type: "PILIHAN_GANDA", options: [{id:"A",text:"Tidak boleh foto"},{id:"B",text:"Menyentuh koleksi museum"},{id:"C",text:"Bawa bekal"},{id:"D",text:"Pakai seragam"}], correctAnswer: "B", explanation: "Guru melarang 'jangan menyentuh koleksi museum.'", difficulty: "MEDIUM", cognitive: "PEMAHAMAN", domain: "AKADEMIK", keywords: ["study tour", "museum", "tata tertib"], tingkat: "SMP", isVerified: true },
  { seksi: "MERESPONS_KAIDAH", text: "Perhatikan kalimat berikut! 'Demi menghindari agar supaya tidak terjadi kesalahan, maka kami mohon perhatian Bapak/Ibu sekalian.' Perbaikan kalimat tersebut yang tepat adalah?", type: "PILIHAN_GANDA", options: [{id:"A",text:"'Demi menghindari kesalahan, kami mohon perhatian Bapak/Ibu sekalian.' (hapus 'agar supaya' dan 'maka')"},{id:"B",text:"'Demi agar supaya tidak terjadi kesalahan, maka kami mohon perhatian.'"},{id:"C",text:"'Agar supaya demi menghindari kesalahan, maka kami mohon.'"},{id:"D",text:"Tidak perlu diperbaiki"}], correctAnswer: "A", explanation: "Kata 'demi', 'agar supaya', dan 'maka' merupakan pemborosan (ketiganya bermakna tujuan). Cukup gunakan salah satu.", difficulty: "HARD", cognitive: "EVALUASI", domain: "AKADEMIK", keywords: ["pemborosan", "konjungsi", "efektif"], tingkat: "SMP", isVerified: true },
  { seksi: "MERESPONS_KAIDAH", text: "Perhatikan kalimat berikut! 'Buku itu adalah milik saya sendiri pribadi.' Perbaikan yang tepat adalah?", type: "PILIHAN_GANDA", options: [{id:"A",text:"'Buku itu milik saya pribadi.' (hapus 'adalah' dan 'sendiri')"},{id:"B",text:"'Buku itu adalah milik saya.'"},{id:"C",text:"'Buku itu milik sendiri pribadi saya.'"},{id:"D",text:"Tidak perlu diperbaiki"}], correctAnswer: "A", explanation: "Kata 'adalah' tidak diperlukan, 'sendiri' dan 'pribadi' bermakna sama — gunakan salah satu.", difficulty: "MEDIUM", cognitive: "EVALUASI", domain: "AKADEMIK", keywords: ["kalimat efektif", "pemborosan"], tingkat: "SMP", isVerified: true },
  { seksi: "MEMBACA", text: "Bacalah teks berikut! 'Terumbu karang merupakan ekosistem laut yang sangat penting. Selain menjadi habitat berbagai biota laut, terumbu karang juga melindungi pantai dari abrasi. Sayangnya, banyak terumbu karang yang rusak akibat penangkapan ikan dengan bahan peledak dan pencemaran laut.'", passage: "Apa penyebab kerusakan terumbu karang?", type: "PILIHAN_GANDA", options: [{id:"A",text:"Habitat biota laut"},{id:"B",text:"Penangkapan ikan dengan bahan peledak dan pencemaran laut"},{id:"C",text:"Abrasi pantai"},{id:"D",text:"Perlindungan pantai"}], correctAnswer: "B", explanation: "Teks menyebutkan penyebab kerusakan: 'penangkapan ikan dengan bahan peledak dan pencemaran laut.'", difficulty: "MEDIUM", cognitive: "PEMAHAMAN", domain: "SOSIAL", passageType: "eksposisi", wordCount: 50, keywords: ["terumbu karang", "ekosistem", "pencemaran"], tingkat: "SMP", isVerified: true },
  { seksi: "MEMBACA", text: "Bacalah teks berikut! 'Gempa bumi terjadi ketika lempeng bumi bergeser secara tiba-tiba. Getaran gempa merambat ke segala arah. Kekuatan gempa diukur menggunakan skala Richter. Semakin besar magnitudo, semakin besar kerusakan yang ditimbulkan.'", passage: "Apa yang menyebabkan gempa bumi?", type: "PILIHAN_GANDA", options: [{id:"A",text:"Gunung meletus"},{id:"B",text:"Lempeng bumi bergeser secara tiba-tiba"},{id:"C",text:"Angin topan"},{id:"D",text:"Pasang surut air laut"}], correctAnswer: "B", explanation: "Teks menyebutkan 'gempa bumi terjadi ketika lempeng bumi bergeser secara tiba-tiba.'", difficulty: "EASY", cognitive: "PEMAHAMAN", domain: "AKADEMIK", passageType: "informasi", wordCount: 45, keywords: ["gempa bumi", "lempeng bumi", "magnitudo"], tingkat: "SMP", isVerified: true },
];

const ADDITIONAL_UKBI_SMA = [
  { seksi: "MENDENGARKAN", text: "Perhatikan monolog berikut! 'Blockchain merupakan teknologi pencatatan digital yang transparan dan tidak dapat diubah. Teknologi ini tidak hanya digunakan untuk cryptocurrency, tetapi juga untuk sistem voting elektronik, sertifikasi digital, dan manajemen rantai pasok. Keunggulan utama blockchain adalah keamanan data dan transparansi transaksi.'", passage: "Apa keunggulan utama teknologi blockchain?", type: "PILIHAN_GANDA", options: [{id:"A",text:"Hanya untuk cryptocurrency"},{id:"B",text:"Keamanan data dan transparansi transaksi"},{id:"C",text:"Biaya murah"},{id:"D",text:"Kecepatan transaksi"}], correctAnswer: "B", explanation: "Monolog menyebutkan 'Keunggulan utama blockchain adalah keamanan data dan transparansi transaksi.'", difficulty: "MEDIUM", cognitive: "PEMAHAMAN", domain: "VOKASIONAL", keywords: ["blockchain", "teknologi", "keamanan"], tingkat: "SMA", isVerified: true },
  { seksi: "MENDENGARKAN", text: "Perhatikan dialog berikut! Investor: 'Mengapa saya harus berinvestasi di startup Anda?' Founder: 'Kami memiliki teknologi proprietary yang melindungi hak cipta konten digital. Target pasar kami adalah 50 juta pengguna aktif di Asia Tenggara. Kami telah memperoleh pendapatan 2 miliar di tahun pertama.'", passage: "Apa yang ditawarkan founder kepada investor?", type: "PILIHAN_GANDA", options: [{id:"A",text:"Saham perusahaan"},{id:"B",text:"Teknologi proprietary untuk perlindungan hak cipta konten digital"},{id:"C",text:"Kantor baru"},{id:"D",text:"Tim manajemen"}], correctAnswer: "B", explanation: "Founder menyebutkan 'teknologi proprietary yang melindungi hak cipta konten digital' sebagai keunggulan.", difficulty: "MEDIUM", cognitive: "ANALISIS", domain: "VOKASIONAL", keywords: ["investasi", "startup", "teknologi"], tingkat: "SMA", isVerified: true },
  { seksi: "MERESPONS_KAIDAH", text: "Perhatikan kalimat berikut! 'Para pemangku kebijakan diharapkan dapat mengakomodir aspirasi dari seluruh stakeholder yang terkait.' Perbaikan yang tepat adalah?", type: "PILIHAN_GANDA", options: [{id:"A",text:"'mengakomodir' → 'mengakomodasi' (kata serapan baku)"},{id:"B",text:"'stakeholder' → 'pemangku kepentingan'"},{id:"C",text:"Kedua A dan B benar"},{id:"D",text:"Tidak perlu diperbaiki"}], correctAnswer: "C", explanation: "'Mengakomodasi' adalah bentuk baku (bukan mengakomodir). 'Stakeholder' sebaiknya diterjemahkan menjadi 'pemangku kepentingan' atau 'pihak terkait'.", difficulty: "HARD", cognitive: "EVALUASI", domain: "VOKASIONAL", keywords: ["kata baku", "serapan", "istilah asing"], tingkat: "SMA", isVerified: true },
  { seksi: "MERESPONS_KAIDAH", text: "Perhatikan kalimat berikut! 'Kami mohon maaf atas ketidaknyamanan yang ditimbulkan dan untuk selanjutnya akan kami perbaiki.' Struktur kalimat tersebut bermasalah karena...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Makna 'ketidaknyamanan yang ditimbulkan' ambigu — siapa yang menimbulkan?"},{id:"B",text:"Kata 'untuk selanjutnya' seharusnya 'ke depannya'"},{id:"C",text:"Kedua A dan B benar"},{id:"D",text:"Tidak ada masalah"}], correctAnswer: "C", explanation: "Kalimat pasif 'ditimbulkan' tidak jelas subjeknya (oleh siapa?). 'Untuk selanjutnya' kurang baku, sebaiknya 'ke depannya'.", difficulty: "HARD", cognitive: "EVALUASI", domain: "VOKASIONAL", keywords: ["kalimat efektif", "ambigu", "kata baku"], tingkat: "SMA", isVerified: true },
  { seksi: "MEMBACA", text: "Bacalah teks berikut! 'Fintech lending atau pinjaman online telah berkembang pesat di Indonesia. OJK mencatat penyaluran pinjaman fintech mencapai Rp 60 triliun pada 2025. Namun, maraknya pinjaman online ilegal meresahkan masyarakat. Banyak korban yang terjebak bunga tinggi dan praktik penagihan tidak etis. OJK gencar melakukan edukasi literasi keuangan dan menutup fintech ilegal.'", passage: "Apa langkah OJK mengatasi pinjol ilegal?", type: "PILIHAN_GANDA", options: [{id:"A",text:"Membiarkan fintech ilegal beroperasi"},{id:"B",text:"Edukasi literasi keuangan dan menutup fintech ilegal"},{id:"C",text:"Melarang semua fintech"},{id:"D",text:"Menaikkan bunga pinjaman"}], correctAnswer: "B", explanation: "Teks menyebutkan 'OJK gencar melakukan edukasi literasi keuangan dan menutup fintech ilegal.'", difficulty: "MEDIUM", cognitive: "PEMAHAMAN", domain: "VOKASIONAL", passageType: "berita", wordCount: 55, keywords: ["fintech", "OJK", "literasi keuangan"], tingkat: "SMA", isVerified: true },
  { seksi: "MEMBACA", text: "Bacalah teks berikut! 'Startup rintisan di bidang edtech semakin menjamur pasca pandemi. Berdasarkan data terbaru, pasar edtech di Indonesia diproyeksikan tumbuh 25% per tahun. Model bisnis yang paling diminati adalah platform kursus online, aplikasi bimbingan belajar, dan sistem manajemen sekolah. Para investor melihat potensi besar di sektor ini karena penetrasi internet yang terus meningkat.'", passage: "Apa model bisnis edtech yang paling diminati?", type: "PILIHAN_GANDA", options: [{id:"A",text:"Hanya aplikasi bimbingan belajar"},{id:"B",text:"Platform kursus online, aplikasi bimbel, dan sistem manajemen sekolah"},{id:"C",text:"Sistem manajemen sekolah saja"},{id:"D",text:"Media sosial pendidikan"}], correctAnswer: "B", explanation: "Teks menyebutkan 'Model bisnis yang paling diminati adalah platform kursus online, aplikasi bimbingan belajar, dan sistem manajemen sekolah.'", difficulty: "MEDIUM", cognitive: "PEMAHAMAN", domain: "VOKASIONAL", passageType: "ekonomi", wordCount: 60, keywords: ["edtech", "startup", "investasi"], tingkat: "SMA", isVerified: true },
];

const ADDITIONAL_TKA_SMP = [
  { kompetensi: "LITERASI_MEMBACA", subKompetensi: "Fakta dan Opini", text: "Bacalah teks berikut!\n\n'Menurut para ahli, membaca 15 menit setiap hari dapat meningkatkan kosakata anak secara signifikan. Program literasi sekolah terbukti efektif. Saya yakin jika setiap sekolah menerapkan program ini, kualitas pendidikan Indonesia akan meningkat drastis.'\n\nKalimat opini dalam teks tersebut adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"'Membaca 15 menit setiap hari dapat meningkatkan kosakata anak'"},{id:"B",text:"'Saya yakin jika setiap sekolah menerapkan program ini, kualitas pendidikan akan meningkat drastis'"},{id:"C",text:"'Program literasi sekolah terbukti efektif'"},{id:"D",text:"'Menurut para ahli, membaca 15 menit meningkatkan kosakata'" }], correctAnswer: "B", explanation: "Kalimat 'Saya yakin...' merupakan opini pribadi penulis, bukan fakta yang dapat diverifikasi.", difficulty: "MEDIUM", weight: 1.0, year: 2026, source: "TKA SMP 2026", tingkat: "SMP", isVerified: true },
  { kompetensi: "TATA_BAHASA", subKompetensi: "Kata Serapan", text: "Penulisan kata serapan yang benar di bawah ini adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Aktifitas, obyektif, system"},{id:"B",text:"Aktivitas, objektif, sistem"},{id:"C",text:"Aktifitas, objektif, sistem"},{id:"D",text:"Aktivitas, obyektif, system"}], correctAnswer: "B", explanation: "Bentuk baku: aktivitas (bukan aktifitas), objektif (bukan obyektif), sistem (bukan system).", difficulty: "MEDIUM", weight: 1.0, year: 2026, source: "TKA SMP 2026", tingkat: "SMP", isVerified: true },
  { kompetensi: "SASTRA", subKompetensi: "Drama", text: "Dalam struktur naskah drama, bagian yang berisi percakapan antar tokoh disebut...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Prolog"},{id:"B",text:"Dialog"},{id:"C",text:"Monolog"},{id:"D",text:"Epilog"}], correctAnswer: "B", explanation: "Dialog adalah percakapan antara dua tokoh atau lebih dalam drama.", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SMP 2026", tingkat: "SMP", isVerified: true },
  { kompetensi: "LITERASI_MEMBACA", subKompetensi: "Membaca Cepat", text: "Bacalah teks berikut!\n\n'Raja Purnawarman adalah raja Kerajaan Tarumanegara yang berkuasa pada abad ke-5. Beliau terkenal karena keberhasilannya menggali sungai sepanjang 6.112 meter yang disebut Sungai Gomati. Prasasti yang ditemukan di Tugu dan Ciaruteun menjadi bukti sejarah keberadaan kerajaan ini.'\n\nPanjang Sungai Gomati yang digali Raja Purnawarman adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"5.000 meter"},{id:"B",text:"6.112 meter"},{id:"C",text:"7.000 meter"},{id:"D",text:"8.000 meter"}], correctAnswer: "B", explanation: "Teks menyebutkan 'sungai sepanjang 6.112 meter yang disebut Sungai Gomati.'", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SMP 2026", tingkat: "SMP", isVerified: true },
];

const ADDITIONAL_TKA_SMA = [
  { kompetensi: "LITERASI_MEMBACA", subKompetensi: "Kritik Sastra", text: "Bacalah kutipan resensi berikut!\n\n'Novel ini berhasil menggambarkan pergulatan batin tokoh utama dengan bahasa yang puitis namun tetap mudah dipahami. Sayangnya, alur cerita terasa lambat di beberapa bagian tengah, sehingga pembaca mungkin kehilangan minat sebelum mencapai klimaks. Meskipun demikian, pengembangan karakter yang kuat membuat novel ini layak diapresiasi.'\n\nKalimat yang menunjukkan kelemahan novel adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"'Novel ini berhasil menggambarkan pergulatan batin tokoh utama'"},{id:"B",text:"'Alur cerita terasa lambat di beberapa bagian tengah'"},{id:"C",text:"'Pengembangan karakter yang kuat'"},{id:"D",text:"'Bahasa yang puitis namun mudah dipahami'"}], correctAnswer: "B", explanation: "Kelemahan novel disebutkan pada 'alur cerita terasa lambat di beberapa bagian tengah.'", difficulty: "MEDIUM", weight: 1.0, year: 2026, source: "TKA SMA 2026", tingkat: "SMA", isVerified: true },
  { kompetensi: "MENULIS", subKompetensi: "Teks Editorial", text: "Teks editorial memiliki ciri utama...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Berisi fakta tanpa opini penulis"},{id:"B",text:"Berisi opini redaksi terhadap isu aktual yang dilengkapi argumen dan solusi"},{id:"C",text:"Berisi petunjuk teknis melakukan sesuatu"},{id:"D",text:"Berisi urutan peristiwa secara kronologis"}], correctAnswer: "B", explanation: "Teks editorial adalah opini redaksi terhadap isu hangat, dilengkapi argumen, bukti, dan solusi.", difficulty: "MEDIUM", weight: 1.0, year: 2026, source: "TKA SMA 2026", tingkat: "SMA", isVerified: true },
  { kompetensi: "TATA_BAHASA", subKompetensi: "Pemajemukan", text: "Kata majemuk yang penulisannya harus dirangkaikan adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Kerja sama"},{id:"B",text:"Tanggung jawab"},{id:"C",text:"Kacamata"},{id:"D",text:"Tanda tangan"}], correctAnswer: "C", explanation: "'Kacamata' sudah dianggap bentuk padu dan ditulis serangkai. Kata majemuk lainnya ditulis terpisah: kerja sama, tanggung jawab, tanda tangan.", difficulty: "HARD", weight: 1.5, year: 2026, source: "TKA SMA 2026", tingkat: "SMA", isVerified: true },
  { kompetensi: "SASTRA", subKompetensi: "Nilai dalam Cerpen", text: "Bacalah kutipan cerpen berikut!\n\n'Meski rumahnya hancur diterjang banjir bandang, Pak Karta tidak menyerah. Dengan sisa tenaga, ia membangun kembali rumahnya dari puing-puing. Seluruh warga bergotong royong membantunya. Senyum Pak Karta kembali merekah saat atap rumahnya selesai dipasang.'\n\nNilai sosial yang terkandung dalam kutipan tersebut adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Ketekunan dan gotong royong"},{id:"B",text:"Kekayaan dan kemewahan"},{id:"C",text:"Kekuasaan dan jabatan"},{id:"D",text:"Pendidikan dan ilmu pengetahuan"}], correctAnswer: "A", explanation: "Nilai sosial tergambar dari kegigihan Pak Karta (ketekunan) dan bantuan warga (gotong royong).", difficulty: "MEDIUM", weight: 1.0, year: 2026, source: "TKA SMA 2026", tingkat: "SMA", isVerified: true },
];

async function deleteBrokenPackages() {
  const brokenTitles = [
    "Simulasi UKBI - Paket Lengkap",
    "Latihan UKBI - Seksi I Mendengarkan",
    "Latihan UKBI - Seksi II & III",
  ];
  for (const title of brokenTitles) {
    const pkg = await prisma.paketKompetensi.findFirst({ where: { title } });
    if (pkg) {
      // Delete related progress and test sessions first
      await prisma.progresKompetensi.deleteMany({ where: { paketId: pkg.id } });
      await prisma.testSession.deleteMany({ where: { paketId: pkg.id } });
      await prisma.kompetensiCertificate.deleteMany({ where: { paketId: pkg.id } });
      await prisma.paketKompetensi.delete({ where: { id: pkg.id } });
      console.log(`Deleted: "${title}"`);
    } else {
      console.log(`Not found: "${title}"`);
    }
  }
}

async function seedAdditionalQuestions() {
  // UKBI SMP additional
  let added = 0;
  for (const q of ADDITIONAL_UKBI_SMP) {
    const exists = await prisma.uKBIQuestion.findFirst({ where: { text: q.text, tingkat: "SMP" } });
    if (!exists) { await prisma.uKBIQuestion.create({ data: q as any }); added++; }
  }
  console.log(`Additional UKBI SMP: ${added} added`);

  // UKBI SMA additional
  added = 0;
  for (const q of ADDITIONAL_UKBI_SMA) {
    const exists = await prisma.uKBIQuestion.findFirst({ where: { text: q.text, tingkat: "SMA" } });
    if (!exists) { await prisma.uKBIQuestion.create({ data: q as any }); added++; }
  }
  console.log(`Additional UKBI SMA: ${added} added`);

  // TKA SMP additional
  added = 0;
  for (const q of ADDITIONAL_TKA_SMP) {
    const exists = await prisma.tKAQuestion.findFirst({ where: { text: q.text, tingkat: "SMP" } });
    if (!exists) { await prisma.tKAQuestion.create({ data: q as any }); added++; }
  }
  console.log(`Additional TKA SMP: ${added} added`);

  // TKA SMA additional
  added = 0;
  for (const q of ADDITIONAL_TKA_SMA) {
    const exists = await prisma.tKAQuestion.findFirst({ where: { text: q.text, tingkat: "SMA" } });
    if (!exists) { await prisma.tKAQuestion.create({ data: q as any }); added++; }
  }
  console.log(`Additional TKA SMA: ${added} added`);
}

async function createNewPackages() {
  const createPackage = async (data: any) => {
    const exists = await prisma.paketKompetensi.findFirst({ where: { title: data.title } });
    if (!exists) {
      await prisma.paketKompetensi.create({ data });
      console.log(`Created: "${data.title}" (${data.type})`);
    } else {
      console.log(`Exists: "${data.title}"`);
    }
  };

  // === FOR MURID (shows in murid/ukbi) ===

  // 1. Simulasi UKBI - Paket Lengkap (SMP) — 25 soal covering 3 seksi
  await createPackage({
    title: "Simulasi UKBI - Paket Lengkap",
    description: "Paket simulasi UKBI lengkap untuk siswa SMP. Meliputi Seksi Mendengarkan, Merespons Kaidah, dan Membaca dengan total 25 soal.",
    type: "UKBI_SMP",
    mode: "SIMULASI",
    duration: 90,
    passingScore: 482,
    passingGrade: "MADYA",
    totalQuestions: 25,
    isActive: true,
    isPremium: false,
    attemptLimit: -1,
    sections: [
      { name: "Seksi I: Mendengarkan", seksi: "MENDENGARKAN", timeLimit: 25, count: 8 },
      { name: "Seksi II: Merespons Kaidah", seksi: "MERESPONS_KAIDAH", timeLimit: 25, count: 8 },
      { name: "Seksi III: Membaca", seksi: "MEMBACA", timeLimit: 40, count: 9 },
    ],
  });

  // 2. Latihan UKBI - Seksi I Mendengarkan (SMP)
  await createPackage({
    title: "Latihan UKBI - Seksi I Mendengarkan",
    description: "Latihan soal Seksi I UKBI fokus pada kemampuan mendengarkan dan memahami informasi lisan. Cocok untuk persiapan ujian.",
    type: "UKBI_LATIHAN_SMP",
    mode: "LATIHAN",
    duration: 25,
    passingScore: 0,
    passingGrade: "-",
    totalQuestions: 8,
    isActive: true,
    isPremium: false,
    attemptLimit: -1,
    sections: [
      { name: "Seksi I: Mendengarkan", seksi: "MENDENGARKAN", timeLimit: 25, count: 8 },
    ],
  });

  // 3. Latihan UKBI - Seksi II & III (SMP) — kaidah + membaca
  await createPackage({
    title: "Latihan UKBI - Seksi II & III",
    description: "Latihan soal UKBI Seksi II (Merespons Kaidah) dan III (Membaca). Tingkatkan pemahaman tata bahasa dan kemampuan membaca kritis.",
    type: "UKBI_LATIHAN_SMP",
    mode: "LATIHAN",
    duration: 50,
    passingScore: 0,
    passingGrade: "-",
    totalQuestions: 17,
    isActive: true,
    isPremium: false,
    attemptLimit: -1,
    sections: [
      { name: "Seksi II: Merespons Kaidah", seksi: "MERESPONS_KAIDAH", timeLimit: 25, count: 8 },
      { name: "Seksi III: Membaca", seksi: "MEMBACA", timeLimit: 25, count: 9 },
    ],
  });

  // 4. Additional UKBI latihan packages for SMA
  await createPackage({
    title: "Latihan UKBI - Seksi II Merespons Kaidah (SMA)",
    description: "Latihan soal Merespons Kaidah tingkat SMA. Pelajari kaidah kebahasaan, kalimat efektif, dan ejaan yang benar.",
    type: "UKBI_LATIHAN_SMA",
    mode: "LATIHAN",
    duration: 30,
    passingScore: 0,
    passingGrade: "-",
    totalQuestions: 8,
    isActive: true,
    isPremium: false,
    attemptLimit: -1,
    sections: [
      { name: "Seksi II: Merespons Kaidah", seksi: "MERESPONS_KAIDAH", timeLimit: 30, count: 8 },
    ],
  });

  await createPackage({
    title: "Latihan UKBI - Seksi III Membaca (SMA)",
    description: "Latihan soal Membaca tingkat SMA. Asah kemampuan memahami, menganalisis, dan mengevaluasi teks akademik.",
    type: "UKBI_LATIHAN_SMA",
    mode: "LATIHAN",
    duration: 30,
    passingScore: 0,
    passingGrade: "-",
    totalQuestions: 9,
    isActive: true,
    isPremium: false,
    attemptLimit: -1,
    sections: [
      { name: "Seksi III: Membaca", seksi: "MEMBACA", timeLimit: 30, count: 9 },
    ],
  });

  await createPackage({
    title: "Latihan UKBI - Seksi I Mendengarkan (SMA)",
    description: "Latihan soal Mendengarkan tingkat SMA untuk menguji kemampuan memahami informasi lisan konteks akademik dan profesional.",
    type: "UKBI_LATIHAN_SMA",
    mode: "LATIHAN",
    duration: 25,
    passingScore: 0,
    passingGrade: "-",
    totalQuestions: 8,
    isActive: true,
    isPremium: false,
    attemptLimit: -1,
    sections: [
      { name: "Seksi I: Mendengarkan", seksi: "MENDENGARKAN", timeLimit: 25, count: 8 },
    ],
  });

  // 5. Latihan TKA per kompetensi
  await createPackage({
    title: "Latihan TKA - Tata Bahasa (SMP)",
    description: "Latihan soal Tata Bahasa Indonesia untuk SMP. Meliputi kalimat efektif, kata baku, konjungsi, imbuhan, dan ejaan.",
    type: "TKA_SMP",
    mode: "LATIHAN",
    duration: 30,
    passingScore: 0,
    passingGrade: "-",
    totalQuestions: 8,
    isActive: true,
    isPremium: false,
    attemptLimit: -1,
    sections: [
      { name: "Tata Bahasa", kompetensi: "TATA_BAHASA", timeLimit: 30, count: 8 },
    ],
  });

  await createPackage({
    title: "Latihan TKA - Sastra (SMP)",
    description: "Latihan soal Sastra Indonesia untuk SMP. Pelajari puisi, cerpen, drama, majas, dan unsur intrinsik karya sastra.",
    type: "TKA_SMP",
    mode: "LATIHAN",
    duration: 25,
    passingScore: 0,
    passingGrade: "-",
    totalQuestions: 7,
    isActive: true,
    isPremium: false,
    attemptLimit: -1,
    sections: [
      { name: "Sastra", kompetensi: "SASTRA", timeLimit: 25, count: 7 },
    ],
  });

  await createPackage({
    title: "Latihan TKA - Menulis (SMA)",
    description: "Latihan soal Keterampilan Menulis untuk SMA. Meliputi teks eksposisi, argumentasi, editorial, dan penyuntingan.",
    type: "TKA_SMA",
    mode: "LATIHAN",
    duration: 30,
    passingScore: 0,
    passingGrade: "-",
    totalQuestions: 4,
    isActive: true,
    isPremium: false,
    attemptLimit: -1,
    sections: [
      { name: "Menulis", kompetensi: "MENULIS", timeLimit: 30, count: 4 },
    ],
  });

  await createPackage({
    title: "Latihan TKA - Sastra (SMA)",
    description: "Latihan soal Sastra Indonesia untuk SMA. Analisis puisi, prosa, drama, dan kritik sastra secara mendalam.",
    type: "TKA_SMA",
    mode: "LATIHAN",
    duration: 30,
    passingScore: 0,
    passingGrade: "-",
    totalQuestions: 5,
    isActive: true,
    isPremium: false,
    attemptLimit: -1,
    sections: [
      { name: "Sastra", kompetensi: "SASTRA", timeLimit: 30, count: 5 },
    ],
  });

  // 6. SD latihan packages (for completeness)
  await createPackage({
    title: "Latihan UKBI - Mendengarkan (SD)",
    description: "Latihan soal Mendengarkan untuk SD. Cocok untuk melatih konsentrasi dan pemahaman informasi sederhana.",
    type: "UKBI_LATIHAN_SD",
    mode: "LATIHAN",
    duration: 20,
    passingScore: 0,
    passingGrade: "-",
    totalQuestions: 8,
    isActive: true,
    isPremium: false,
    attemptLimit: -1,
    sections: [
      { name: "Mendengarkan", seksi: "MENDENGARKAN", timeLimit: 20, count: 8 },
    ],
  });

  await createPackage({
    title: "Latihan TKA - Tata Bahasa & Sastra (SD)",
    description: "Latihan soal Tata Bahasa dan Sastra untuk SD. Pelajari kata baku, kalimat efektif, dan dongeng.",
    type: "TKA_SD",
    mode: "LATIHAN",
    duration: 30,
    passingScore: 0,
    passingGrade: "-",
    totalQuestions: 10,
    isActive: true,
    isPremium: false,
    attemptLimit: -1,
    sections: [
      { name: "Tata Bahasa", kompetensi: "TATA_BAHASA", timeLimit: 15, count: 5 },
      { name: "Sastra", kompetensi: "SASTRA", timeLimit: 15, count: 5 },
    ],
  });

  console.log("✅ All packages created/verified");
}

// Also update existing SMU/SMA packages' section names for consistency
async function updateExistingPackageNames() {
  // Update "Simulasi UKBI - SMP" duration and section names
  const ukbiSmp = await prisma.paketKompetensi.findFirst({ where: { title: "Simulasi UKBI - SMP" } });
  if (ukbiSmp) {
    await prisma.paketKompetensi.update({
      where: { id: ukbiSmp.id },
      data: {
        duration: 90,
        sections: [
          { name: "Seksi I: Mendengarkan", seksi: "MENDENGARKAN", timeLimit: 25, count: 8 },
          { name: "Seksi II: Merespons Kaidah", seksi: "MERESPONS_KAIDAH", timeLimit: 25, count: 8 },
          { name: "Seksi III: Membaca", seksi: "MEMBACA", timeLimit: 40, count: 9 },
        ],
      } as any,
    });
    console.log("Updated: Simulasi UKBI - SMP (duration 90 min, 25 questions)");
  }

  const ukbiSma = await prisma.paketKompetensi.findFirst({ where: { title: "Simulasi UKBI - SMA" } });
  if (ukbiSma) {
    await prisma.paketKompetensi.update({
      where: { id: ukbiSma.id },
      data: {
        duration: 90,
        sections: [
          { name: "Seksi I: Mendengarkan", seksi: "MENDENGARKAN", timeLimit: 25, count: 8 },
          { name: "Seksi II: Merespons Kaidah", seksi: "MERESPONS_KAIDAH", timeLimit: 25, count: 8 },
          { name: "Seksi III: Membaca", seksi: "MEMBACA", timeLimit: 40, count: 9 },
        ],
      } as any,
    });
    console.log("Updated: Simulasi UKBI - SMA (duration 90 min, 25 questions)");
  }
}

async function main() {
  console.log("=== PAKET LENGKAP FIX + SEEDER ===\n");

  console.log("Step 1: Delete broken packages...");
  await deleteBrokenPackages();

  console.log("\nStep 2: Seed additional questions...");
  await seedAdditionalQuestions();

  console.log("\nStep 3: Create new replacement packages...");
  await createNewPackages();

  console.log("\nStep 4: Update existing package consistency...");
  await updateExistingPackageNames();

  console.log("\n=== DONE ===");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
