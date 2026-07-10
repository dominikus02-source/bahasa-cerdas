/**
 * Curated, hand-verified question bank for the solo games (Menara Cerdas,
 * Benar atau Salah). Each item has exactly ONE unambiguous correct answer with
 * distractors that are clearly wrong, plus a short penjelasan. Written to KBBI /
 * PUEBI conventions. This is merged with Jalur Cerdas lesson questions in the API
 * and served in random order, so every player gets a different mix.
 *
 * Shape matches the game API's normalized question:
 *   { soal, opsi[], jawaban(index), penjelasan }
 */
export interface BankQuestion {
  soal: string;
  opsi: string[];
  jawaban: number;
  penjelasan: string;
  kategori: string;
}

export const QUESTION_BANK: BankQuestion[] = [
  // ---------- KATA BAKU ----------
  { soal: "Manakah penulisan kata baku yang benar?", opsi: ["Apotik", "Apotek", "Aphotek", "Apoteker"], jawaban: 1, penjelasan: "Bentuk baku menurut KBBI adalah 'apotek'.", kategori: "Kata Baku" },
  { soal: "Bentuk baku dari 'ijazah' adalah...", opsi: ["Ijasah", "Ijazah", "Izajah", "Ijazan"], jawaban: 1, penjelasan: "Kata baku yang benar adalah 'ijazah'.", kategori: "Kata Baku" },
  { soal: "Manakah kata baku yang benar?", opsi: ["Risiko", "Resiko", "Rizico", "Resico"], jawaban: 0, penjelasan: "Bentuk baku adalah 'risiko', bukan 'resiko'.", kategori: "Kata Baku" },
  { soal: "Penulisan baku yang benar adalah...", opsi: ["Nasehat", "Nasihat", "Nasehad", "Nasihad"], jawaban: 1, penjelasan: "Kata baku menurut KBBI adalah 'nasihat'.", kategori: "Kata Baku" },
  { soal: "Manakah bentuk baku yang benar?", opsi: ["Aktifitas", "Aktivitas", "Aktipitas", "Aktiviti"], jawaban: 1, penjelasan: "Bentuk baku adalah 'aktivitas' (dari 'aktif' + '-itas').", kategori: "Kata Baku" },
  { soal: "Kata baku yang tepat adalah...", opsi: ["Kualitas", "Kwalitas", "Kualiti", "Kwaliti"], jawaban: 0, penjelasan: "Bentuk baku adalah 'kualitas'.", kategori: "Kata Baku" },
  { soal: "Manakah penulisan yang baku?", opsi: ["Jadwal", "Jadual", "Jadwall", "Jatwal"], jawaban: 0, penjelasan: "Bentuk baku adalah 'jadwal'.", kategori: "Kata Baku" },
  { soal: "Bentuk baku yang benar adalah...", opsi: ["Teknik", "Tehnik", "Tekhnik", "Teknis"], jawaban: 0, penjelasan: "Kata baku adalah 'teknik'.", kategori: "Kata Baku" },
  { soal: "Manakah kata baku yang benar?", opsi: ["Februari", "Pebruari", "Februwari", "Febuari"], jawaban: 0, penjelasan: "Nama bulan yang baku adalah 'Februari'.", kategori: "Kata Baku" },
  { soal: "Penulisan baku yang tepat adalah...", opsi: ["Izin", "Ijin", "Idzin", "Izink"], jawaban: 0, penjelasan: "Bentuk baku adalah 'izin'.", kategori: "Kata Baku" },
  { soal: "Manakah bentuk baku yang benar?", opsi: ["Analisa", "Analisis", "Analisys", "Analitis"], jawaban: 1, penjelasan: "Bentuk baku adalah 'analisis'.", kategori: "Kata Baku" },
  { soal: "Kata baku yang benar adalah...", opsi: ["Praktek", "Praktik", "Prakktik", "Practik"], jawaban: 1, penjelasan: "Bentuk baku adalah 'praktik' (kata kerja/kegiatan).", kategori: "Kata Baku" },
  { soal: "Manakah penulisan baku?", opsi: ["Sistim", "Sistem", "Systeem", "Sistematis"], jawaban: 1, penjelasan: "Bentuk baku adalah 'sistem'.", kategori: "Kata Baku" },
  { soal: "Bentuk baku yang tepat adalah...", opsi: ["Karir", "Karier", "Karrier", "Kariir"], jawaban: 1, penjelasan: "Menurut KBBI, bentuk baku adalah 'karier'.", kategori: "Kata Baku" },
  { soal: "Manakah kata baku yang benar?", opsi: ["Cabai", "Cabe", "Cabay", "Cabhai"], jawaban: 0, penjelasan: "Bentuk baku adalah 'cabai', 'cabe' tidak baku.", kategori: "Kata Baku" },
  { soal: "Penulisan baku yang benar adalah...", opsi: ["Antre", "Antri", "Antree", "Anttre"], jawaban: 0, penjelasan: "Bentuk baku adalah 'antre'.", kategori: "Kata Baku" },
  { soal: "Manakah bentuk baku?", opsi: ["Komplet", "Komplit", "Complit", "Kompleet"], jawaban: 0, penjelasan: "Bentuk baku menurut KBBI adalah 'komplet'.", kategori: "Kata Baku" },
  { soal: "Kata baku yang benar adalah...", opsi: ["Frekuensi", "Frekwensi", "Frequensi", "Frekunsi"], jawaban: 0, penjelasan: "Bentuk baku adalah 'frekuensi'.", kategori: "Kata Baku" },

  // ---------- SINONIM ----------
  { soal: "Sinonim kata 'pandai' adalah...", opsi: ["Bodoh", "Cerdas", "Malas", "Lemah"], jawaban: 1, penjelasan: "'Pandai' bersinonim dengan 'cerdas'.", kategori: "Sinonim" },
  { soal: "Sinonim kata 'indah' adalah...", opsi: ["Buruk", "Elok", "Kotor", "Suram"], jawaban: 1, penjelasan: "'Indah' bersinonim dengan 'elok'.", kategori: "Sinonim" },
  { soal: "Kata yang bersinonim dengan 'gembira' adalah...", opsi: ["Sedih", "Riang", "Marah", "Takut"], jawaban: 1, penjelasan: "'Gembira' bersinonim dengan 'riang'.", kategori: "Sinonim" },
  { soal: "Sinonim kata 'lezat' adalah...", opsi: ["Hambar", "Enak", "Pahit", "Basi"], jawaban: 1, penjelasan: "'Lezat' bersinonim dengan 'enak'.", kategori: "Sinonim" },
  { soal: "Sinonim kata 'cepat' adalah...", opsi: ["Lambat", "Pelan", "Gesit", "Diam"], jawaban: 2, penjelasan: "'Cepat' bersinonim dengan 'gesit'.", kategori: "Sinonim" },
  { soal: "Kata yang bersinonim dengan 'bohong' adalah...", opsi: ["Jujur", "Dusta", "Benar", "Nyata"], jawaban: 1, penjelasan: "'Bohong' bersinonim dengan 'dusta'.", kategori: "Sinonim" },
  { soal: "Sinonim kata 'akhir' adalah...", opsi: ["Awal", "Ujung", "Mula", "Pangkal"], jawaban: 1, penjelasan: "'Akhir' bersinonim dengan 'ujung'.", kategori: "Sinonim" },
  { soal: "Sinonim kata 'sukar' adalah...", opsi: ["Mudah", "Gampang", "Sulit", "Ringan"], jawaban: 2, penjelasan: "'Sukar' bersinonim dengan 'sulit'.", kategori: "Sinonim" },
  { soal: "Kata yang bersinonim dengan 'tampan' adalah...", opsi: ["Jelek", "Rupawan", "Buruk", "Kusam"], jawaban: 1, penjelasan: "'Tampan' bersinonim dengan 'rupawan'.", kategori: "Sinonim" },
  { soal: "Sinonim kata 'pintar' adalah...", opsi: ["Dungu", "Pandai", "Malas", "Lelah"], jawaban: 1, penjelasan: "'Pintar' bersinonim dengan 'pandai'.", kategori: "Sinonim" },
  { soal: "Sinonim kata 'lelah' adalah...", opsi: ["Segar", "Bugar", "Penat", "Kuat"], jawaban: 2, penjelasan: "'Lelah' bersinonim dengan 'penat'.", kategori: "Sinonim" },
  { soal: "Kata yang bersinonim dengan 'besar' adalah...", opsi: ["Kecil", "Mungil", "Akbar", "Sempit"], jawaban: 2, penjelasan: "'Besar' bersinonim dengan 'akbar'.", kategori: "Sinonim" },

  // ---------- ANTONIM ----------
  { soal: "Antonim kata 'tinggi' adalah...", opsi: ["Jangkung", "Rendah", "Panjang", "Besar"], jawaban: 1, penjelasan: "Lawan kata 'tinggi' adalah 'rendah'.", kategori: "Antonim" },
  { soal: "Antonim kata 'terang' adalah...", opsi: ["Benderang", "Gelap", "Cerah", "Silau"], jawaban: 1, penjelasan: "Lawan kata 'terang' adalah 'gelap'.", kategori: "Antonim" },
  { soal: "Lawan kata 'rajin' adalah...", opsi: ["Giat", "Tekun", "Malas", "Ulet"], jawaban: 2, penjelasan: "Lawan kata 'rajin' adalah 'malas'.", kategori: "Antonim" },
  { soal: "Antonim kata 'mahal' adalah...", opsi: ["Murah", "Mewah", "Berharga", "Langka"], jawaban: 0, penjelasan: "Lawan kata 'mahal' adalah 'murah'.", kategori: "Antonim" },
  { soal: "Lawan kata 'tebal' adalah...", opsi: ["Lebar", "Tipis", "Besar", "Padat"], jawaban: 1, penjelasan: "Lawan kata 'tebal' adalah 'tipis'.", kategori: "Antonim" },
  { soal: "Antonim kata 'menang' adalah...", opsi: ["Juara", "Unggul", "Kalah", "Hebat"], jawaban: 2, penjelasan: "Lawan kata 'menang' adalah 'kalah'.", kategori: "Antonim" },
  { soal: "Lawan kata 'ramai' adalah...", opsi: ["Bising", "Riuh", "Sepi", "Padat"], jawaban: 2, penjelasan: "Lawan kata 'ramai' adalah 'sepi'.", kategori: "Antonim" },
  { soal: "Antonim kata 'basah' adalah...", opsi: ["Lembap", "Kering", "Becek", "Berair"], jawaban: 1, penjelasan: "Lawan kata 'basah' adalah 'kering'.", kategori: "Antonim" },
  { soal: "Lawan kata 'berat' adalah...", opsi: ["Ringan", "Padat", "Kuat", "Keras"], jawaban: 0, penjelasan: "Lawan kata 'berat' adalah 'ringan'.", kategori: "Antonim" },
  { soal: "Antonim kata 'maju' adalah...", opsi: ["Berkembang", "Mundur", "Melaju", "Bangkit"], jawaban: 1, penjelasan: "Lawan kata 'maju' adalah 'mundur'.", kategori: "Antonim" },
  { soal: "Lawan kata 'panas' adalah...", opsi: ["Hangat", "Dingin", "Terik", "Gerah"], jawaban: 1, penjelasan: "Lawan kata 'panas' adalah 'dingin'.", kategori: "Antonim" },
  { soal: "Antonim kata 'jauh' adalah...", opsi: ["Dekat", "Panjang", "Lebar", "Tinggi"], jawaban: 0, penjelasan: "Lawan kata 'jauh' adalah 'dekat'.", kategori: "Antonim" },

  // ---------- IMBUHAN & KATA BENTUKAN ----------
  { soal: "Bentuk kata 'me-' + 'sapu' yang benar adalah...", opsi: ["Mensapu", "Menyapu", "Menyapuh", "Mesapu"], jawaban: 1, penjelasan: "'me-' + kata berawalan 's' luluh menjadi 'meny-': menyapu.", kategori: "Imbuhan" },
  { soal: "Bentuk kata 'me-' + 'tulis' yang benar adalah...", opsi: ["Mentulis", "Menulis", "Menyulis", "Metulis"], jawaban: 1, penjelasan: "'me-' + kata berawalan 't' luluh menjadi 'men-': menulis.", kategori: "Imbuhan" },
  { soal: "Bentuk kata 'me-' + 'pukul' yang benar adalah...", opsi: ["Mempukul", "Memukul", "Menpukul", "Mepukul"], jawaban: 1, penjelasan: "'me-' + kata berawalan 'p' luluh menjadi 'mem-': memukul.", kategori: "Imbuhan" },
  { soal: "Bentuk kata 'me-' + 'kira' yang benar adalah...", opsi: ["Mengkira", "Mengira", "Menkira", "Mekira"], jawaban: 1, penjelasan: "'me-' + kata berawalan 'k' luluh menjadi 'meng-': mengira.", kategori: "Imbuhan" },
  { soal: "Kata 'pemberian' dibentuk dari kata dasar...", opsi: ["Beri", "Ber", "Pember", "Rian"], jawaban: 0, penjelasan: "'Pemberian' = pe- + beri + -an, kata dasarnya 'beri'.", kategori: "Imbuhan" },
  { soal: "Imbuhan pada kata 'berlari' adalah...", opsi: ["me-", "ber-", "ter-", "di-"], jawaban: 1, penjelasan: "'Berlari' berimbuhan awalan 'ber-'.", kategori: "Imbuhan" },
  { soal: "Bentuk kata 'me-' + 'cuci' yang benar adalah...", opsi: ["Mencuci", "Menyuci", "Mecuci", "Menncuci"], jawaban: 0, penjelasan: "'me-' + kata berawalan 'c' menjadi 'men-': mencuci (c tidak luluh).", kategori: "Imbuhan" },
  { soal: "Kata 'terindah' menyatakan makna...", opsi: ["Paling indah", "Sedang indah", "Tidak indah", "Agak indah"], jawaban: 0, penjelasan: "Awalan 'ter-' pada 'terindah' bermakna 'paling'.", kategori: "Imbuhan" },
  { soal: "Bentuk kata 'me-' + 'baca' yang benar adalah...", opsi: ["Membaca", "Menbaca", "Mebaca", "Memmaca"], jawaban: 0, penjelasan: "'me-' + kata berawalan 'b' menjadi 'mem-': membaca.", kategori: "Imbuhan" },
  { soal: "Kata 'dimakan' menunjukkan bahwa kata itu berjenis...", opsi: ["Kata aktif", "Kata pasif", "Kata benda", "Kata sifat"], jawaban: 1, penjelasan: "Awalan 'di-' membentuk kata kerja pasif: dimakan.", kategori: "Imbuhan" },

  // ---------- EYD / PUEBI ----------
  { soal: "Penulisan yang benar sesuai PUEBI adalah...", opsi: ["di rumah", "dirumah", "di-rumah", "dirumahkan"], jawaban: 0, penjelasan: "'di' sebagai kata depan (menunjuk tempat) ditulis terpisah: 'di rumah'.", kategori: "Ejaan" },
  { soal: "Penulisan yang tepat adalah...", opsi: ["dimakan", "di makan", "di-makan", "di makan-kan"], jawaban: 0, penjelasan: "'di-' sebagai awalan (kata kerja) ditulis serangkai: 'dimakan'.", kategori: "Ejaan" },
  { soal: "Nama hari seperti 'Senin' ditulis dengan huruf...", opsi: ["Kapital di awal", "Kecil semua", "Kapital semua", "Miring semua"], jawaban: 0, penjelasan: "Nama hari diawali huruf kapital: 'Senin'.", kategori: "Ejaan" },
  { soal: "Penulisan gabungan kata yang benar adalah...", opsi: ["tanggungjawab", "tanggung jawab", "tanggung-jawab", "tanggungjawaban"], jawaban: 1, penjelasan: "'Tanggung jawab' ditulis terpisah karena belum berimbuhan.", kategori: "Ejaan" },
  { soal: "Pemakaian tanda koma yang benar adalah...", opsi: ["Saya membeli buku pensil dan tas.", "Saya membeli buku, pensil, dan tas.", "Saya membeli, buku pensil dan tas.", "Saya, membeli buku pensil dan tas."], jawaban: 1, penjelasan: "Tanda koma memisahkan unsur dalam perincian: 'buku, pensil, dan tas'.", kategori: "Ejaan" },
  { soal: "Setiap unsur nama orang (misal Budi Santoso) ditulis dengan huruf...", opsi: ["Kecil semua", "Kapital di setiap awal kata", "Kapital semua", "Miring"], jawaban: 1, penjelasan: "Setiap unsur nama orang diawali huruf kapital: 'Budi Santoso'.", kategori: "Ejaan" },
  { soal: "Penulisan kata depan 'ke' yang benar adalah...", opsi: ["kesekolah", "ke sekolah", "ke-sekolah", "kesekolahan"], jawaban: 1, penjelasan: "'ke' penunjuk arah/tempat ditulis terpisah: 'ke sekolah'.", kategori: "Ejaan" },
  { soal: "Penulisan angka dan kata yang tepat adalah...", opsi: ["Dia membeli 2 buah apel.", "Dia membeli dua buah apel.", "Dia membeli 2buah apel.", "Dia membeli II buah apel."], jawaban: 1, penjelasan: "Bilangan yang dapat ditulis satu-dua kata ditulis dengan huruf: 'dua buah apel'.", kategori: "Ejaan" },
  { soal: "Kalimat dengan tanda titik yang benar adalah...", opsi: ["Ibu pergi ke pasar,", "Ibu pergi ke pasar.", "Ibu pergi ke pasar?", "Ibu pergi ke pasar!"], jawaban: 1, penjelasan: "Kalimat berita diakhiri tanda titik.", kategori: "Ejaan" },
  { soal: "Pada judul karangan, setiap kata diawali huruf kapital, KECUALI...", opsi: ["Kata benda", "Kata kerja", "Kata tugas seperti 'dan', 'di', 'ke'", "Kata sifat"], jawaban: 2, penjelasan: "Pada judul, kata tugas (dan, di, ke, dari) tidak diawali kapital, kecuali di posisi awal.", kategori: "Ejaan" },

  // ---------- KALIMAT EFEKTIF & PILIHAN KATA ----------
  { soal: "Kalimat yang paling efektif adalah...", opsi: ["Para siswa-siswa berbaris.", "Siswa-siswa berbaris.", "Para siswa berbaris.", "Semua para siswa berbaris."], jawaban: 2, penjelasan: "'Para' sudah bermakna jamak, tak perlu diulang: 'Para siswa berbaris'.", kategori: "Kalimat Efektif" },
  { soal: "Kalimat efektif yang benar adalah...", opsi: ["Dia naik ke atas.", "Dia naik.", "Dia naik ke atas tangga atas.", "Dia naik atas."], jawaban: 1, penjelasan: "'Naik' sudah bermakna 'ke atas', jadi cukup 'Dia naik'.", kategori: "Kalimat Efektif" },
  { soal: "Kalimat yang efektif adalah...", opsi: ["Agar supaya lulus, ia belajar.", "Agar lulus, ia belajar.", "Supaya agar lulus, ia belajar.", "Demi agar lulus, ia belajar."], jawaban: 1, penjelasan: "'Agar' dan 'supaya' bersinonim, cukup pakai satu.", kategori: "Kalimat Efektif" },
  { soal: "Pilihan kata yang tepat: 'Ayah ___ mobil ke kantor.'", opsi: ["mengendarai", "menaiki", "menyetir", "menjalankan"], jawaban: 0, penjelasan: "Kata yang paling tepat untuk mobil adalah 'mengendarai'.", kategori: "Kalimat Efektif" },
  { soal: "Kalimat efektif yang benar adalah...", opsi: ["Banyak siswa-siswa hadir.", "Banyak siswa hadir.", "Banyak para siswa hadir.", "Banyak sekali siswa-siswa hadir."], jawaban: 1, penjelasan: "'Banyak' sudah menunjukkan jamak: 'Banyak siswa hadir'.", kategori: "Kalimat Efektif" },
  { soal: "Kata berimbuhan yang tepat: 'Ibu ___ sayur di dapur.'", opsi: ["masak", "memasak", "dimasak", "termasak"], jawaban: 1, penjelasan: "Subjek 'Ibu' melakukan tindakan aktif: 'memasak'.", kategori: "Kalimat Efektif" },
  { soal: "Kalimat yang baku adalah...", opsi: ["Kepada Bapak Kepala Sekolah waktu dan tempat kami persilakan.", "Bapak Kepala Sekolah kami persilakan.", "Waktu dan tempat kami persilakan.", "Kepada waktu kami persilakan."], jawaban: 1, penjelasan: "Yang dipersilakan adalah orang, bukan 'waktu dan tempat'.", kategori: "Kalimat Efektif" },
  { soal: "Pilihan kata yang tepat: 'Dia ___ hadiah dari ayahnya.'", opsi: ["memberi", "menerima", "mengirim", "menawar"], jawaban: 1, penjelasan: "'Dari ayahnya' menunjukkan ia sebagai penerima: 'menerima'.", kategori: "Kalimat Efektif" },

  // ---------- MAKNA KATA & UNGKAPAN ----------
  { soal: "Makna ungkapan 'buah tangan' adalah...", opsi: ["Hasil kerja", "Oleh-oleh", "Buah segar", "Tangan kanan"], jawaban: 1, penjelasan: "'Buah tangan' berarti oleh-oleh.", kategori: "Ungkapan" },
  { soal: "Makna ungkapan 'kabar burung' adalah...", opsi: ["Kabar gembira", "Kabar burung terbang", "Kabar yang belum pasti", "Kabar duka"], jawaban: 2, penjelasan: "'Kabar burung' berarti kabar/berita yang belum pasti kebenarannya.", kategori: "Ungkapan" },
  { soal: "Makna peribahasa 'besar pasak daripada tiang' adalah...", opsi: ["Rajin menabung", "Pengeluaran lebih besar daripada pemasukan", "Rumah yang kokoh", "Bekerja keras"], jawaban: 1, penjelasan: "Peribahasa ini berarti pengeluaran lebih besar daripada pendapatan.", kategori: "Ungkapan" },
  { soal: "Makna ungkapan 'tangan kanan' adalah...", opsi: ["Orang kidal", "Orang kepercayaan", "Tangan yang kuat", "Anggota tubuh"], jawaban: 1, penjelasan: "'Tangan kanan' berarti orang kepercayaan/andalan.", kategori: "Ungkapan" },
  { soal: "Makna peribahasa 'sedia payung sebelum hujan' adalah...", opsi: ["Membawa payung", "Bersiap sebelum terjadi masalah", "Takut hujan", "Menunggu hujan"], jawaban: 1, penjelasan: "Peribahasa ini berarti bersiap sebelum sesuatu yang buruk terjadi.", kategori: "Ungkapan" },
  { soal: "Makna ungkapan 'naik daun' adalah...", opsi: ["Memanjat pohon", "Sedang populer", "Jatuh miskin", "Merasa sedih"], jawaban: 1, penjelasan: "'Naik daun' berarti sedang terkenal atau populer.", kategori: "Ungkapan" },
  { soal: "Makna ungkapan 'kepala dingin' adalah...", opsi: ["Sakit kepala", "Tenang/sabar", "Marah", "Kedinginan"], jawaban: 1, penjelasan: "'Kepala dingin' berarti tenang dan sabar dalam menghadapi masalah.", kategori: "Ungkapan" },
  { soal: "Makna peribahasa 'air susu dibalas air tuba' adalah...", opsi: ["Kebaikan dibalas kejahatan", "Minum susu", "Saling menolong", "Berbuat baik"], jawaban: 0, penjelasan: "Peribahasa ini berarti kebaikan dibalas dengan keburukan.", kategori: "Ungkapan" },

  // ---------- JENIS KATA ----------
  { soal: "Kata 'cantik' termasuk jenis kata...", opsi: ["Kata benda", "Kata kerja", "Kata sifat", "Kata bilangan"], jawaban: 2, penjelasan: "'Cantik' menyatakan sifat, jadi kata sifat (adjektiva).", kategori: "Jenis Kata" },
  { soal: "Kata 'berlari' termasuk jenis kata...", opsi: ["Kata benda", "Kata kerja", "Kata sifat", "Kata keterangan"], jawaban: 1, penjelasan: "'Berlari' menyatakan perbuatan, jadi kata kerja (verba).", kategori: "Jenis Kata" },
  { soal: "Kata 'meja' termasuk jenis kata...", opsi: ["Kata benda", "Kata kerja", "Kata sifat", "Kata bilangan"], jawaban: 0, penjelasan: "'Meja' menyatakan benda, jadi kata benda (nomina).", kategori: "Jenis Kata" },
  { soal: "Kata 'tiga' termasuk jenis kata...", opsi: ["Kata benda", "Kata bilangan", "Kata sifat", "Kata kerja"], jawaban: 1, penjelasan: "'Tiga' menyatakan jumlah, jadi kata bilangan (numeralia).", kategori: "Jenis Kata" },
  { soal: "Dalam kalimat 'Dia berlari cepat', kata 'cepat' berfungsi sebagai...", opsi: ["Subjek", "Predikat", "Keterangan", "Objek"], jawaban: 2, penjelasan: "'Cepat' menerangkan cara 'berlari', jadi keterangan.", kategori: "Jenis Kata" },
  { soal: "Kata penghubung (konjungsi) terdapat pada kata...", opsi: ["dan", "buku", "lari", "merah"], jawaban: 0, penjelasan: "'Dan' adalah kata penghubung (konjungsi).", kategori: "Jenis Kata" },
  { soal: "Kata ganti orang pertama tunggal adalah...", opsi: ["kamu", "dia", "saya", "mereka"], jawaban: 2, penjelasan: "'Saya' adalah kata ganti orang pertama tunggal.", kategori: "Jenis Kata" },
  { soal: "Kata 'sangat' dalam 'sangat pandai' termasuk...", opsi: ["Kata benda", "Kata keterangan", "Kata kerja", "Kata bilangan"], jawaban: 1, penjelasan: "'Sangat' menerangkan tingkat sifat, jadi kata keterangan.", kategori: "Jenis Kata" },
];
