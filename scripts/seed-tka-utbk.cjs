const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const questions = [
    { text: "Bacalah teks berikut dengan saksama:\n\n\"Pendidikan tidak hanya sekadar transfer ilmu pengetahuan dari guru kepada siswa. Lebih dari itu, pendidikan merupakan proses pembentukan karakter dan pengembangan potensi diri.\"\n\nIde pokok paragraf tersebut adalah...", options: ["Transfer ilmu", "Pembentukan karakter", "Kurikulum", "Peran guru"], correctAnswer: "1", kompetensi: "MEMBACA" },
    { text: "\"Hutan hujan tropis merupakan paru-paru dunia. Sayangnya, luas hutan hujan tropis semakin berkurang akibat deforestasi.\"\n\nPernyataan yang tepat berdasarkan teks adalah...", options: ["Deforestasi tidak berdampak", "Hutan hujan penting bagi iklim", "Perubahan iklim teratasi", "Hutan tidak perlu dilindungi"], correctAnswer: "1", kompetensi: "MEMBACA" },
    { text: "\"Gempa bumi terjadi akibat pelepasan energi di dalam bumi secara tiba-tiba. ... gempa bumi sering terjadi di daerah pertemuan lempeng tektonik.\"\n\nKonjungsi yang tepat untuk melengkapi kalimat rumpang tersebut adalah...", options: ["Namun", "Oleh karena itu", "Sebab", "Meskipun"], correctAnswer: "1", kompetensi: "KEBAHASAAN" },
    { text: "\"Sang mahasiswa baru itu tampak antusias mengikuti kegiatan orientasi.\"\n\nKata \"antusias\" berarti...", options: ["Bersemangat", "Bingung", "Malas", "Terpaksa"], correctAnswer: "0", kompetensi: "KOSAKATA" },
    { text: "\"Teknologi digital telah mengubah cara manusia berkomunikasi. Namun kemudahan ini juga membawa tantangan baru, seperti penyebaran informasi palsu.\"\n\nDampak negatif dari kemajuan teknologi adalah...", options: ["Komunikasi lebih cepat", "Informasi palsu mudah menyebar", "Surat tidak digunakan", "Pesan sampai dalam detik"], correctAnswer: "1", kompetensi: "MEMBACA" },
    { text: "\"Kebijakan baru pemerintah concerning pendidikan mendapat kritik.\" Kata tidak baku dalam kalimat tersebut adalah...", options: ["Kebijakan", "Concerning", "Pendidikan", "Masyarakat"], correctAnswer: "1", kompetensi: "KEBAHASAAN" },
    { text: "Bacalah teks berikut!\n(1) Sampah plastik menjadi masalah serius. (2) Setiap tahun, jutaan ton sampah plastik berakhir di lautan. (3) Hal ini mengancam ekosistem laut. (4) Pemerintah perlu mengambil langkah konkret.\n\nKalimat utama paragraf tersebut ditunjukkan nomor...", options: ["(1)", "(2)", "(3)", "(4)"], correctAnswer: "0", kompetensi: "MEMBACA" },
    { text: "Majas personifikasi terdapat dalam kalimat...", options: ["Angin berbisik di malam hari", "Buku itu sangat tebal", "Dia berlari kencang", "Matahari bersinar"], correctAnswer: "0", kompetensi: "SASTRA" },
    { text: "\"Pemerintah meluncurkan program Perpustakaan Digital untuk meningkatkan literasi nasional.\"\n\nTujuan program tersebut adalah...", options: ["Menjual buku digital", "Meningkatkan literasi", "Membuat aplikasi", "Mencetak buku"], correctAnswer: "1", kompetensi: "MEMBACA" },
    { text: "Kalimat efektif berikut yang tepat adalah...", options: ["Kepada semua siswa diharap datang tepat waktu", "Semua siswa diharapkan datang tepat waktu", "Untuk semua siswa diharap datang", "Bagi siswa harus datang"], correctAnswer: "1", kompetensi: "KEBAHASAAN" },
    { text: "\"Remaja masa kini tumbuh di era digital. Mereka akrab dengan media sosial sejak dini. Interaksi tatap muka semakin berkurang.\"\n\nKesimpulan yang tepat adalah...", options: ["Remaja tidak perlu bersosialisasi", "Era digital mengubah perilaku remaja", "Media sosial tidak penting", "Tatap muka lebih baik"], correctAnswer: "1", kompetensi: "MEMBACA" },
    { text: "\"Dokter melakukan diagnosis terhadap pasien.\" Istilah \"diagnosis\" berarti...", options: ["Pengobatan", "Penentuan jenis penyakit", "Pembedahan", "Pemeriksaan fisik"], correctAnswer: "1", kompetensi: "KOSAKATA" },
    { text: "\"Indonesia memiliki kekayaan budaya dari Sabang sampai Merauke. Keberagaman ini adalah aset berharga yang harus dijaga.\"\n\nPesan utama penulis adalah...", options: ["Indonesia banyak suku", "Kekayaan budaya harus dijaga", "Bahasa daerah perlu dipelajari", "Sabang ke Merauke jauh"], correctAnswer: "1", kompetensi: "MEMBACA" },
    { text: "Penulisan kata depan \"di\" yang tepat adalah...", options: ["dirumah", "di rumah", "Disana", "Kesana"], correctAnswer: "1", kompetensi: "KEBAHASAAN" },
    { text: "\"Vaksinasi melatih sistem kekebalan tubuh untuk melawan virus. Semakin banyak masyarakat divaksinasi, semakin kuat perlindungan kelompok.\"\n\nPernyataan yang sesuai dengan teks adalah...", options: ["Vaksinasi melemahkan imun", "Vaksinasi meningkatkan kekebalan", "Vaksinasi hanya untuk anak", "Vaksinasi tidak efektif"], correctAnswer: "1", kompetensi: "MEMBACA" },
    { text: "\"Cara membuat telur rebus: (1) Rebus air hingga mendidih. (2) Masukkan telur. (3) Tunggu 8-10 menit.\"\n\nTeks tersebut termasuk jenis teks...", options: ["Eksposisi", "Prosedur", "Narasi", "Deskripsi"], correctAnswer: "1", kompetensi: "MEMBACA" },
    { text: "\"Implikasi dari kebijakan baru belum dapat diprediksi.\" Sinonim kata \"implikasi\" adalah...", options: ["Penyebab", "Akibat", "Tujuan", "Manfaat"], correctAnswer: "1", kompetensi: "KOSAKATA" },
    { text: "\"Banyak siswa mengikuti kegiatan ekstrakurikuler.\" Subjek kalimat tersebut adalah...", options: ["Siswa", "Kegiatan", "Ekstrakurikuler", "Sekolah"], correctAnswer: "0", kompetensi: "KEBAHASAAN" },
    { text: "\"Kemacetan lalu lintas menjadi masalah utama transportasi umum. Kurangnya integrasi antar moda juga menjadi kendala.\"\n\nMasalah utama menurut teks adalah...", options: ["Tiket mahal", "Kemacetan lalu lintas", "Kurang penumpang", "Jalur terbatas"], correctAnswer: "1", kompetensi: "MEMBACA" },
    { text: "\"Krisis air bersih dapat memicu konflik sosial.\" Kata \"krisis\" bermakna...", options: ["Keadaan normal", "Keadaan berbahaya", "Kelimpahan", "Keberhasilan"], correctAnswer: "1", kompetensi: "KOSAKATA" },
    { text: "Kalimat poster yang tepat untuk mengajak menjaga kebersihan adalah...", options: ["Buang sampah di sungai", "Jagalah kebersihan!", "Sampah adalah masalah", "Bersih tidak penting"], correctAnswer: "1", kompetensi: "MENULIS" },
    { text: "\"Pemanasan global menyebabkan es di kutub mencair. Akibatnya permukaan air laut naik.\"\n\nHubungan sebab-akibat dalam teks adalah...", options: ["Global warming sebabkan es mencair", "Beruang kehilangan habitat", "Air laut naik", "Semua benar"], correctAnswer: "0", kompetensi: "MEMBACA" },
    { text: "Penulisan judul karangan yang benar adalah...", options: ["Pentingnya Pendidikan Karakter", "Pentingnya pendidikan karakter", "pentingnya Pendidikan Karakter", "Pentingnya Pendidikan karakter"], correctAnswer: "0", kompetensi: "KEBAHASAAN" },
    { text: "\"Penguasaan bahasa asing penting, namun jangan melupakan bahasa Indonesia.\"\n\nSikap yang tepat adalah...", options: ["Hanya belajar asing", "Melupakan Indonesia", "Seimbangkan asing dan Indonesia", "Tolak bahasa asing"], correctAnswer: "2", kompetensi: "MEMBACA" },
    { text: "Kata baku dari \"kwalitas\" adalah...", options: ["Kualitas", "Qualitas", "Kwalitas", "Kualitet"], correctAnswer: "0", kompetensi: "KEBAHASAAN" },
    { text: "\"Penemuan vaksin menyelamatkan jutaan nyawa. Namun masih banyak yang meragukan keamanannya.\"\n\nMasalah yang diangkat dalam teks adalah...", options: ["Penemuan vaksin", "Keraguan terhadap vaksin", "Sejarah kedokteran", "Penyakit mematikan"], correctAnswer: "1", kompetensi: "MEMBACA" },
    { text: "\"Prediksi cuaca menunjukkan potensi hujan deras.\" Kata \"prediksi\" berarti...", options: ["Laporan", "Ramalan", "Analisis", "Kesimpulan"], correctAnswer: "1", kompetensi: "KOSAKATA" },
    { text: "\"Kegiatan itu diikuti oleh para pemuda, para remaja, dan para warga.\"\n\nPerbaikan kalimat efektif adalah...", options: ["Dihadiri para pemuda, remaja, warga", "Diikuti pemuda, remaja, dan warga", "Dihadiri pemuda dan remaja", "Diikuti pemuda dan warga"], correctAnswer: "1", kompetensi: "KEBAHASAAN" },
    { text: "\"Generasi Z tumbuh bersama internet. Mereka kreatif dan adaptif terhadap perubahan.\"\n\nKarakter positif Generasi Z adalah...", options: ["Pemalas", "Tidak sabaran", "Kreatif dan adaptif", "Individualis"], correctAnswer: "2", kompetensi: "MEMBACA" },
    { text: "\"Pendidikan karakter harus ditanamkan sejak usia dini melalui keteladanan dan pembiasaan.\"\n\nKalimat tersebut merupakan gagasan...", options: ["Pendapat ahli", "Fakta", "Opini", "Kesimpulan"], correctAnswer: "2", kompetensi: "MEMBACA" },
  ];

  let added = 0;
  for (const q of questions) {
    try {
      await p.tKAQuestion.create({
        data: { ...q, type: "PILIHAN_GANDA", difficulty: "MEDIUM", subKompetensi: "", isActive: true, isVerified: true }
      });
      added++;
    } catch(e) { console.log('error:', q.text.slice(0,20), e.message.slice(0,30)); }
  }
  console.log('Added:', added, 'TKA UTBK questions');
  const total = await p.tKAQuestion.count();
  console.log('Total TKA:', total);
}
main().catch(e => console.log('Fatal:', e.message));
main().catch(e=>console.log(e)).finally(()=>process.exit(0));
main().catch(e=>console.log(e)).finally(()=>{process.exit(0)});
