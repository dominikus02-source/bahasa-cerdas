"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Star, Trophy, Zap, Lightbulb, Check, X, RefreshCw, Crown, Sparkles } from "lucide-react";

const WORDS_DB = [
  { word: "BUDAYA", clues: ["Kebiasaan turun-temurun", "Warisan leluhur", "Identitas bangsa"], category: "Sosial" },
  { word: "SASTRA", clues: ["Karya tulis bernilai seni", "Novel dan puisi masuk di sini", "Cerminan kehidupan lewat kata"], category: "Seni" },
  { word: "EJAAN", clues: ["Aturan menulis yang benar", "KBBI jadi acuannya", "Tanda baca dan huruf kapital"], category: "Bahasa" },
  { word: "KALIMAT", clues: ["Kumpulan kata bermakna", "Ada subjek dan predikat", "Satuan bahasa terkecil yang utuh"], category: "Bahasa" },
  { word: "PARAGRAF", clues: ["Kumpulan kalimat terkait", "Diawali masuk ke dalam", "Ada ide pokok di dalamnya"], category: "Bahasa" },
  { word: "SINONIM", clues: ["Persamaan kata", "Lawan dari antonim", "Besar = besar sekali"], category: "Bahasa" },
  { word: "ANTONIM", clues: ["Lawan kata", "Besar lawan kecil", "Panas lawan dingin"], category: "Bahasa" },
  { word: "AFIKSASI", clues: ["Proses menambah imbuhan", "Prefiks, sufiks, konfiks", "Me-kan, di-i, ber-an"], category: "Bahasa" },
  { word: "KONJUNGSI", clues: ["Kata penghubung", "Dan, tetapi, karena", "Menyambung dua klausa"], category: "Bahasa" },
  { word: "PREPOSISI", clues: ["Kata depan", "Di, ke, dari, pada", "Menunjukkan tempat atau arah"], category: "Bahasa" },
  { word: "NARASI", clues: ["Karangan berupa cerita", "Alur dan tokoh di dalamnya", "Bisa fiksi atau nonfiksi"], category: "Sastra" },
  { word: "DESKRIPSI", clues: ["Karangan yang menggambarkan", "Melibatkan panca indera", "Pembaca seolah melihat langsung"], category: "Bahasa" },
  { word: "ARGUMENTASI", clues: ["Karangan berisi pendapat", "Ada data dan fakta pendukung", "Tujuannya meyakinkan pembaca"], category: "Bahasa" },
  { word: "PERSUASI", clues: ["Mengajak atau membujuk", "Iklan menggunakan ini", "Tujuannya mempengaruhi orang"], category: "Bahasa" },
  { word: "EKSEMPLIFIKASI", clues: ["Memberikan contoh", "Ilustrasi konkret", "Memperjelas dengan perumpamaan"], category: "Bahasa" },
  { word: "ANALOGI", clues: ["Perbandingan dua hal", "Seperti, bagaikan, laksana", "Mencari kesamaan pola"], category: "Bahasa" },
  { word: "METAFORA", clues: ["Kiasan langsung tanpa pembanding", "Dia bintang kelas", "Raja siang terbit di timur"], category: "Sastra" },
  { word: "HOMONIM", clues: ["Kata sama tulisan beda arti", "Bisa (mampu) dan bisa (racun)", "Tergantung konteks kalimat"], category: "Bahasa" },
  { word: "HOMOFON", clues: ["Lafal sama tulisan beda", "Massa dan masa", "Sama bunyi, beda makna"], category: "Bahasa" },
  { word: "HOMOGRAF", clues: ["Tulisan sama lafal beda", "Apel (buah) dan apel (upacara)", "Ejaan identik, cara baca beda"], category: "Bahasa" },
  { word: "IDIOM", clues: ["Makna tidak bisa ditebak dari kata", "Kambing hitam, angkat kaki", "Ungkapan khas suatu bahasa"], category: "Bahasa" },
  { word: "SIMILE", clues: ["Perbandingan pakai kata pembanding", "Bagai air dengan minyak", "Seperti, bak, laksana"], category: "Sastra" },
  { word: "HIPERBOLA", clues: ["Melebih-lebihkan", "Suaranya menggelegar membelah langit", "Tidak literal, sangat berlebihan"], category: "Sastra" },
  { word: "EUFEMISME", clues: ["Kata halus pengganti kasar", "Meninggal dunia bukan mati", "Agar lebih sopan"], category: "Bahasa" },
  { word: "PLEONASME", clues: ["Kata berlebihan yang sebenarnya tidak perlu", "Naik ke atas, turun ke bawah", "Redudansi dalam kalimat"], category: "Bahasa" },
  { word: "KATA KERJA", clues: ["Menunjukkan tindakan", "Makan, lari, membaca", "Predikat dalam kalimat"], category: "Bahasa" },
  { word: "KATA SIFAT", clues: ["Menjelaskan keadaan", "Indah, besar, cepat", "Bisa didahului sangat atau agak"], category: "Bahasa" },
  { word: "KATA BENDA", clues: ["Menyatakan nama orang, tempat, benda", "Meja, Jakarta, Budi", "Bisa diawali kata si atau sang"], category: "Bahasa" },
  { word: "KATA GANTI", clues: ["Menggantikan kata benda", "Saya, kamu, mereka", "Pronomina dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA SERU", clues: ["Menyatakan emosi spontan", "Wah, aduh, astaga", "Biasanya diakhiri tanda seru"], category: "Bahasa" },
  { word: "KATA SANDANG", clues: ["Artikel dalam bahasa Indonesia", "Si, sang, para, kaum", "Menyertai kata benda"], category: "Bahasa" },
  { word: "KATA BILANGAN", clues: ["Menyatakan jumlah atau urutan", "Satu, kedua, beberapa", "Numeralia dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA DEPAN", clues: ["Letaknya sebelum kata lain", "Di, ke, dari, pada, dalam", "Menunjukkan hubungan spasial"], category: "Bahasa" },
  { word: "KATA SAMBUNG", clues: ["Menghubungkan klausa atau kalimat", "Karena, sehingga, apabila", "Konjungsi dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA TANYA", clues: ["Untuk membuat pertanyaan", "Apa, siapa, di mana, mengapa", "Interogativa dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PERINTAH", clues: ["Menyuruh melakukan sesuatu", "Tutup pintu! Diam!", "Imperatif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA LARANGAN", clues: ["Melarang melakukan sesuatu", "Jangan, dilarang, tidak boleh", "Prohibitif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA AJAKAN", clues: ["Mengajak melakukan sesuatu", "Mari, ayo, yuk", "Invitatif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA HARAPAN", clues: ["Menyatakan keinginan", "Semoga, mudah-mudahan, berharap", "Optatif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENGUAT", clues: ["Menguatkan makna kata lain", "Sangat, amat, benar-benar", "Intensifier dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PELEMAH", clues: ["Melemahkan makna kata lain", "Agak, sedikit, lumayan", "Mitigator dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENEGAS", clues: ["Menegaskan pernyataan", "Memang, sesungguhnya, pasti", "Asertif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENYANGKAL", clues: ["Menyangkal pernyataan", "Tidak, bukan, jangan", "Negatif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENUNJUK", clues: ["Menunjukkan sesuatu", "Ini, itu, sini, sana", "Demonstratif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENANYA", clues: ["Bertanya tentang sesuatu", "Apa, siapa, mana, mengapa", "Interogatif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENYERTA", clues: ["Menyertai kata lain", "Bersama, beserta, dengan", "Komitatif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENYEBAB", clues: ["Menyatakan sebab", "Karena, sebab, gara-gara", "Kausal dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PENYATA", clues: ["Menyatakan akibat", "Sehingga, sampai-sampai, akibatnya", "Konsekutif dalam tata bahasa"], category: "Bahasa" },
  { word: "KATA PERBANDINGAN", clues: ["Membandingkan dua hal", "Seperti, bagaikan, laksana, bak", "Komparatif dalam tata bahasa"], category: "Bahasa" },
  { word: "FABEL", clues: ["Cerita tentang hewan berkarakter manusia", "Kancil dan Buaya", "Pesan moral di dalamnya"], category: "Sastra" },
  { word: "LEGENDA", clues: ["Cerita asal-usul tempat", "Danau Toba, Tangkuban Perahu", "Dianggap benar terjadi"], category: "Sastra" },
  { word: "MITOS", clues: ["Cerita tentang dewa-dewi", "Nyai Roro Kidul", "Kepercayaan masyarakat"], category: "Sastra" },
  { word: "PROSA", clues: ["Karangan bebas tak terikat", "Berbeda dengan puisi", "Novel dan cerpen termasuk ini"], category: "Sastra" },
  { word: "DRAMA", clues: ["Karya seni pertunjukan", "Ada dialog dan acting", "Dimainkan di atas panggung"], category: "Seni" },
  { word: "PUISI", clues: ["Karya sastra yang terikat rima", "Bait dan larik", "Mengungkapkan perasaan penulis"], category: "Sastra" },
  { word: "PANTUN", clues: ["Puisi lama 4 baris", "Bersajak a-b-a-b", "Baris 1-2 sampiran, 3-4 isi"], category: "Sastra" },
  { word: "GURINDAM", clues: ["Puisi lama 2 baris", "Bersajak a-a", "Berisi nasihat atau petuah"], category: "Sastra" },
  { word: "SYAIR", clues: ["Puisi lama 4 baris", "Bersajak a-a-a-a", "Berasal dari tradisi Arab"], category: "Sastra" },
  { word: "BIOGRAFI", clues: ["Riwayat hidup seseorang", "Ditulis oleh orang lain", "Buku tentang perjalanan hidup tokoh"], category: "Sastra" },
  { word: "AUTOBIOGRAFI", clues: ["Riwayat hidup diri sendiri", "Aku menulis tentang aku", "Pengalaman pribadi penulis"], category: "Sastra" },
  { word: "ESAI", clues: ["Karangan pendek tentang suatu hal", "Opini penulis", "Analisis subjektif tapi argumentatif"], category: "Sastra" },
  { word: "RESENSI", clues: ["Ulasan buku atau film", "Penilaian kritis", "Sinopsis plus analisis"], category: "Seni" },
  { word: "EDITORIAL", clues: ["Tajuk rencana di koran", "Opini resmi media", "Pandangan redaksi terhadap isu"], category: "Bahasa" },
  { word: "WACANA", clues: ["Rangkaian kalimat yang koheren", "Komunikasi verbal yang utuh", "Teks lisan atau tulisan"], category: "Bahasa" },
  { word: "TEKS", clues: ["Satuan bahasa yang bermakna", "Tulisan yang memiliki tujuan", "Bisa prosedur, narasi, atau eksposisi"], category: "Bahasa" },
  { word: "WARTA", clues: ["Berita atau kabar", "Informasi terkini", "Laporan peristiwa"], category: "Sosial" },
  { word: "KREDIBEL", clues: ["Dapat dipercaya", "Sumber berita terpercaya", "Memiliki integritas"], category: "Bahasa" },
  { word: "KOMPETENSI", clues: ["Kemampuan atau kecakapan", "Standar kelulusan", "Skill yang harus dikuasai"], category: "Sosial" },
  { word: "KURIKULUM", clues: ["Rencana pembelajaran", "Silabus dan materi ajar", "Panduan pendidikan"], category: "Sosial" },
  { word: "EVALUASI", clues: ["Proses penilaian", "Mengukur pencapaian", "Tes dan ujian"], category: "Sosial" },
  { word: "MOTIVASI", clues: ["Dorongan untuk bertindak", "Semangat belajar", "Alasan melakukan sesuatu"], category: "Sosial" },
  { word: "KREATIF", clues: ["Memiliki daya cipta", "Inovatif dan orisinal", "Menghasilkan ide baru"], category: "Seni" },
  { word: "INOVASI", clues: ["Pembaruan atau perubahan", "Ide baru yang diterapkan", "Memperbaiki yang sudah ada"], category: "Sosial" },
  { word: "KOLABORASI", clues: ["Kerja sama", "Bekerja dalam tim", "Sinergi untuk hasil lebih baik"], category: "Sosial" },
  { word: "PARTISIPASI", clues: ["Keikutsertaan", "Terlibat dalam kegiatan", "Peran aktif dalam kelompok"], category: "Sosial" },
  { word: "KONTRIBUSI", clues: ["Sumbangan atau andil", "Memberi manfaat untuk bersama", "Peran dalam mencapai tujuan"], category: "Sosial" },
  { word: "REFERENSI", clues: ["Sumber acuan atau rujukan", "Buku yang jadi pedoman", "Daftar pustaka"], category: "Bahasa" },
  { word: "DOKUMENTASI", clues: ["Kumpulan dokumen atau arsip", "Rekaman peristiwa", "Catatan resmi kegiatan"], category: "Sosial" },
  { word: "PUBLIKASI", clues: ["Penyebaran informasi ke umum", "Menerbitkan karya", "Membuat sesuatu diketahui publik"], category: "Sosial" },
  { word: "PRESENTASI", clues: ["Penyampaian informasi di depan umum", "Menggunakan slide", "Pidato atau paparan"], category: "Sosial" },
  { word: "DISKUSI", clues: ["Pertukaran pendapat", "Forum untuk berdebat", "Musyawarah mencari solusi"], category: "Sosial" },
  { word: "DEBAT", clues: ["Adu argumen", "Dua pihak saling mempertahankan pendapat", "Ada moderator dan pemenang"], category: "Sosial" },
  { word: "CERAMAH", clues: ["Pidato di depan umum", "Memberi nasihat", "Kultum atau pengajian"], category: "Sosial" },
  { word: "PIDATO", clues: ["Bicara di depan khalayak", "Pernyataan resmi", "Sambutan dalam acara"], category: "Sosial" },
  { word: "WIDYA", clues: ["Pengetahuan atau ilmu", "Berasal dari bahasa Sanskerta", "Identik dengan kebijaksanaan"], category: "Bahasa" },
  { word: "PRAGMATIK", clues: ["Makna bahasa dalam konteks", "Penggunaan bahasa sehari-hari", "Mempelajari maksud pembicara"], category: "Bahasa" },
  { word: "SINTAKSIS", clues: ["Cabang linguistik tentang kalimat", "Struktur frasa dan klausa", "Pola penyusunan kata"], category: "Bahasa" },
  { word: "MORFOLOGI", clues: ["Cabang linguistik tentang kata", "Studi tentang imbuhan", "Pembentukan dan perubahan kata"], category: "Bahasa" },
  { word: "FONOLOGI", clues: ["Cabang linguistik tentang bunyi", "Fonem dan alofon", "Sistem bunyi bahasa"], category: "Bahasa" },
  { word: "SEMANTIK", clues: ["Cabang linguistik tentang makna", "Arti kata dan kalimat", "Interpretasi bahasa"], category: "Bahasa" },
  { word: "KONTEKS", clues: ["Situasi di sekitar teks", "Latar belakang peristiwa", "Pengaruh lingkungan terhadap makna"], category: "Bahasa" },
  { word: "SUBTANSI", clues: ["Inti atau isi pokok", "Bagian paling penting", "Esensi dari suatu hal"], category: "Bahasa" },
  { word: "RELEVAN", clues: ["Ada kaitannya", "Berhubungan dengan topik", "Sesuai dengan konteks"], category: "Bahasa" },
  { word: "VALIDITAS", clues: ["Keabsahan atau kesahihan", "Dapat dipercaya kebenarannya", "Ukuran keandalan data"], category: "Bahasa" },
  { word: "KONSISTEN", clues: ["Tetap dan tidak berubah", "Ajeg dalam pendirian", "Selaras antara ucapan dan perbuatan"], category: "Bahasa" },
  { word: "KOMPREHENSIF", clues: ["Mencakup banyak aspek", "Menyeluruh dan lengkap", "Tidak parsial"], category: "Bahasa" },
  { word: "KLAUSULA", clues: ["Bagian dari kalimat majemuk", "Mengandung subjek dan predikat", "Induk dan anak kalimat"], category: "Bahasa" },
  { word: "DIALOG", clues: ["Percakapan antara dua orang", "Tanya jawab", "Interaksi verbal"], category: "Sastra" },
  { word: "MONOLOG", clues: ["Bicara sendiri", "Pikiran diucapkan keras-keras", "Tokoh bicara tanpa lawan"], category: "Sastra" },
  { word: "PROLOG", clues: ["Bagian pembuka cerita", "Kata pengantar dalam drama", "Pengenalan sebelum cerita dimulai"], category: "Sastra" },
  { word: "EPILOG", clues: ["Bagian penutup cerita", "Kesimpulan akhir drama", "Amanat setelah cerita selesai"], category: "Sastra" },
  { word: "KLIMAKS", clues: ["Puncak ketegangan dalam cerita", "Konflik mencapai titik tertinggi", "Bagian paling menegangkan"], category: "Sastra" },
  { word: "ANTIKLIMAKS", clues: ["Penurunan ketegangan setelah klimaks", "Menuju penyelesaian", "Lawan dari klimaks"], category: "Sastra" },
  { word: "AMANAT", clues: ["Pesan moral cerita", "Nasihat pengarang", "Pelajaran yang bisa dipetik"], category: "Sastra" },
  { word: "LATAR", clues: ["Tempat dan waktu cerita", "Setting dalam karya sastra", "Lingkungan tempat tokoh berada"], category: "Sastra" },
  { word: "SUDUT PANDANG", clues: ["Cara pengarang menceritakan", "Point of view", "Perspektif tokoh"], category: "Sastra" },
  { word: "MAJAS", clues: ["Gaya bahasa kiasan", "Bahasa figuratif", "Metafora, simile, personifikasi"], category: "Sastra" },
  { word: "RIMA", clues: ["Persamaan bunyi dalam puisi", "Bunyi vokal akhir yang sama", "Akhiran yang berirama"], category: "Sastra" },
  { word: "Irama", clues: ["Alunan suara teratur", "Rentak dalam puisi", "Tinggi rendah panjang pendek bunyi"], category: "Sastra" },
  { word: "LAFAL", clues: ["Cara mengucapkan kata", "Pengucapan bunyi bahasa", "Artikulasi dalam berbicara"], category: "Bahasa" },
  { word: "INTONASI", clues: ["Naik turunnya suara", "Tekanan dalam berbicara", "Melodi kalimat"], category: "Bahasa" },
  { word: "JEDA", clues: ["Henti sebentar dalam bicara", "Pemisah antar frasa", "Waktu berhenti saat membaca"], category: "Bahasa" },
  { word: "DIKSI", clues: ["Pilihan kata", "Ketepatan memilih kata", "Kosa kata yang digunakan"], category: "Bahasa" },
  { word: "BAKU", clues: ["Sesuai dengan standar", "Formal dan resmi", "Lawan dari tidak baku"], category: "Bahasa" },
  { word: "MENGARANG", clues: ["Menciptakan karangan", "Menulis cerita", "Menuangkan ide ke dalam tulisan"], category: "Seni" },
  { word: "MENYIMAK", clues: ["Mendengarkan dengan saksama", "Memperhatikan pembicaraan", "Mendengar untuk memahami"], category: "Bahasa" },
  { word: "BERBICARA", clues: ["Mengeluarkan pendapat", "Berkomunikasi lisan", "Menyampaikan gagasan"], category: "Bahasa" },
  { word: "MEMBACA", clues: ["Melihat dan memahami tulisan", "Kegiatan literasi", "Menyerap informasi dari teks"], category: "Bahasa" },
  { word: "MENULIS", clues: ["Menuangkan ide dalam bentuk tulisan", "Berkomunikasi secara tertulis", "Kegiatan produktif berbahasa"], category: "Seni" },
  { word: "WAWANCARA", clues: ["Tanya jawab dengan narasumber", "Mengumpulkan informasi", "Percakapan untuk berita"], category: "Sosial" },
  { word: "DISKUSI", clues: ["Bertukar pikiran tentang suatu hal", "Musyawarah untuk mufakat", "Forum bertukar pendapat"], category: "Sosial" },
  { word: "PRESENTASI", clues: ["Menyampaikan informasi di depan umum", "Pakai slide atau visual", "Paparan di depan audiens"], category: "Sosial" },
  { word: "NEGOSIASI", clues: ["Tawar-menawar mencapai sepakat", "Proses perundingan", "Jual beli butuh ini"], category: "Sosial" },
  { word: "KRITIK", clues: ["Tanggapan disertai alasan", "Bukan sekadar mencela", "Saran perbaikan yang membangun"], category: "Sosial" },
  { word: "APRESIASI", clues: ["Penghargaan terhadap karya", "Mengakui kelebihan", "Respon positif terhadap seni"], category: "Seni" },
  { word: "KREASI", clues: ["Hasil daya cipta", "Karya orisinal", "Produk imajinasi"], category: "Seni" },
  { word: "IMAJINASI", clues: ["Kemampuan membayangkan", "Daya khayal", "Modal utama menulis cerita"], category: "Seni" },
  { word: "SKENARIO", clues: ["Naskah cerita untuk film", "Rangkaian adegan", "Panduan syuting"], category: "Seni" },
  { word: "KARAKTER", clues: ["Watak atau sifat tokoh", "Ciri khas seseorang", "Peran dalam cerita"], category: "Sastra" },
  { word: "KOMEDI", clues: ["Hiburan yang mengundang tawa", "Lawakan dan humor", "Genre cerita lucu"], category: "Seni" },
  { word: "TRAGEDI", clues: ["Cerita sedih atau menyayat hati", "Akhir yang malang", "Drama penuh derita"], category: "Sastra" },
  { word: "SUSPENS", clues: ["Ketegangan dalam cerita", "Membuat penasaran", "Rasa ingin tahu pembaca"], category: "Sastra" },
  { word: "KEJUTAN", clues: ["Hal tak terduga dalam cerita", "Plot twist", "Membalikkan ekspektasi"], category: "Sastra" },
  { word: "PESAN", clues: ["Amanat yang ingin disampaikan", "Nilai moral cerita", "Hal yang bisa dipetik"], category: "Sastra" },
  { word: "KRONOLOGI", clues: ["Urutan waktu peristiwa", "Dari awal hingga akhir", "Runtutan kejadian"], category: "Bahasa" },
  { word: "SISTEMATIS", clues: ["Teratur dan berurutan", "Tidak acak", "Metodis dan rapi"], category: "Bahasa" },
  { word: "RINGKAS", clues: ["Pendek tetapi jelas", "Tidak bertele-tele", "Padat dan efisien"], category: "Bahasa" },
  { word: "PADAT", clues: ["Berisi banyak dalam sedikit ruang", "Tidak longgar", "Informasi yang ringkas"], category: "Bahasa" },
  { word: "LOGIS", clues: ["Masuk akal", "Dapat diterima nalar", "Tidak bertentangan"], category: "Bahasa" },
  { word: "KRITIS", clues: ["Tidak menerima begitu saja", "Menganalisis dengan tajam", "Berpikir mendalam"], category: "Sosial" },
  { word: "KREATIF", clues: ["Memiliki daya cipta", "Inovatif dan orisinal", "Banyak ide baru"], category: "Seni" },
  { word: "INOVASI", clues: ["Pembaruan yang bermanfaat", "Perubahan ke arah lebih baik", "Temuan baru"], category: "Sosial" },
  { word: "EFEKTIF", clues: ["Tepat sasaran", "Berhasil mencapai tujuan", "Tidak mubazir"], category: "Bahasa" },
  { word: "EFISIEN", clues: ["Hemat waktu dan tenaga", "Optimal dalam penggunaan sumber", "Tidak boros"], category: "Bahasa" },
  { word: "RELEVAN", clues: ["Ada hubungan dengan topik", "Tidak melenceng", "Sesuai konteks"], category: "Bahasa" },
  { word: "AKURAT", clues: ["Tepat dan benar", "Sesuai fakta", "Tidak salah"], category: "Bahasa" },
  { word: "OBJEKTIF", clues: ["Berdasarkan fakta", "Tidak memihak", "Netral dan apa adanya"], category: "Sosial" },
  { word: "SUBJEKTIF", clues: ["Berdasarkan pendapat pribadi", "Mengandung perasaan", "Tidak netral"], category: "Sosial" },
  { word: "KONSISTEN", clues: ["Tetap dan tidak berubah", "Ajeg dalam pendirian", "Selaras antara ucapan dan perbuatan"], category: "Sosial" },
  { word: "KOMPETEN", clues: ["Mampu dan cakap", "Ahli di bidangnya", "Memiliki kualifikasi"], category: "Sosial" },
  { word: "INTEGRITAS", clues: ["Kejujuran dan keteguhan", "Konsisten pada prinsip", "Berpegang pada nilai"], category: "Sosial" },
  { word: "PROFESIONAL", clues: ["Bekerja sesuai standar", "Ahli dan bertanggung jawab", "Tidak amatiran"], category: "Sosial" },
  { word: "DEDIKASI", clues: ["Pengabdian penuh", "Totalitas dalam bekerja", "Komitmen tinggi"], category: "Sosial" },
  { word: "KOMITMEN", clues: ["Janji pada diri sendiri", "Tekad yang kuat", "Konsisten menjalankan"], category: "Sosial" },
  { word: "DISIPLIN", clues: ["Tepat waktu dan tertib", "Mematuhi aturan", "Kunci keberhasilan"], category: "Sosial" },
  { word: "TANGGUNG JAWAB", clues: ["Kewajiban yang harus diemban", "Siap menerima konsekuensi", "Ciri orang dewasa"], category: "Sosial" },
  { word: "KERJA SAMA", clues: ["Bekerja bersama-sama", "Gotong royong", "Sinergi tim"], category: "Sosial" },
  { word: "TOLERANSI", clues: ["Menghargai perbedaan", "Sikap saling menghormati", "Bhinneka Tunggal Ika"], category: "Sosial" },
  { word: "GOTONG ROYONG", clues: ["Bekerja bersama untuk tujuan bersama", "Budaya Indonesia", "Saling membantu"], category: "Sosial" },
  { word: "MUSYAWARAH", clues: ["Diskusi untuk mencapai mufakat", "Pengambilan keputusan bersama", "Budaya demokrasi"], category: "Sosial" },
  { word: "DEMOKRASI", clues: ["Pemerintahan dari rakyat", "Kekuasaan di tangan rakyat", "Pemilihan umum"], category: "Sosial" },
  { word: "KEADILAN", clues: ["Sikap yang tidak memihak", "Memberi hak sesuai porsi", "Perlakuan yang sama"], category: "Sosial" },
  { word: "KESETARAAN", clues: ["Kedudukan yang sama", "Tidak ada diskriminasi", "Hak yang seimbang"], category: "Sosial" },
  { word: "KASIH SAYANG", clues: ["Perasaan cinta dan peduli", "Afeksi kepada sesama", "Ibu kepada anak"], category: "Sosial" },
  { word: "EMPATI", clues: ["Merasakan apa yang dirasakan orang lain", "Tenggang rasa", "Peduli sesama"], category: "Sosial" },
  { word: "SOLIDARITAS", clues: ["Rasa setia kawan", "Kebersamaan dalam kelompok", "Saling mendukung"], category: "Sosial" },
  { word: "PATRIOTISME", clues: ["Cinta tanah air", "Semangat membela negara", "Nationalisme"], category: "Sosial" },
  { word: "RELIGIUS", clues: ["Berkaitan dengan agama", "Nilai keagamaan", "Ketaatan beribadah"], category: "Sosial" },
  { word: "HUMANIS", clues: ["Menjunjung nilai kemanusiaan", "Menghargai martabat manusia", "Perikemanusiaan"], category: "Sosial" },
  { word: "ESTETIKA", clues: ["Nilai keindahan", "Ilmu tentang seni", "Apresiasi keindahan"], category: "Seni" },
  { word: "FILOSOFI", clues: ["Pemikiran mendasar", "Pandangan hidup", "Ilmu tentang kebijaksanaan"], category: "Bahasa" },
  { word: "PARADIGMA", clues: ["Cara pandang terhadap sesuatu", "Kerangka berpikir", "Pola pikir dominan"], category: "Bahasa" },
  { word: "PERSPEKTIF", clues: ["Sudut pandang", "Cara melihat masalah", "Poin of view"], category: "Bahasa" },
  { word: "ARGUMEN", clues: ["Alasan yang mendukung pendapat", "Dasar pembelaan", "Logika dalam debat"], category: "Bahasa" },
  { word: "FAKTA", clues: ["Kejadian yang nyata", "Dapat dibuktikan", "Bukan opini"], category: "Bahasa" },
  { word: "OPINI", clues: ["Pendapat pribadi", "Belum tentu benar", "Sudut pandang seseorang"], category: "Bahasa" },
  { word: "DATA", clues: ["Informasi berupa angka atau fakta", "Bahan untuk dianalisis", "Hasil pengamatan"], category: "Bahasa" },
  { word: "BUKTI", clues: ["Hal yang menunjukkan kebenaran", "Alat pembuktian", "Saksi dan barang"], category: "Bahasa" },
  { word: "ANALISIS", clues: ["Penguraian untuk dikaji", "Pemeriksaan mendalam", "Mengupas per bagian"], category: "Bahasa" },
  { word: "KESIMPULAN", clues: ["Ringkasan akhir pembahasan", "Sari pati pembicaraan", "Hasil dari analisis"], category: "Bahasa" },
  { word: "LAPORAN", clues: ["Pertanggungjawaban tertulis", "Dokumen hasil kegiatan", "Tugas akhir pengamatan"], category: "Bahasa" },
  { word: "PROPOSAL", clues: ["Rencana kegiatan tertulis", "Usulan proyek", "Diajukan untuk mendapat izin"], category: "Bahasa" },
  { word: "ANGGARAN", clues: ["Rencana biaya", "Perkiraan pengeluaran", "Budget dalam kegiatan"], category: "Sosial" },
  { word: "JADWAL", clues: ["Pembagian waktu", "Rencana kegiatan harian", "Urutan acara"], category: "Sosial" },
  { word: "RAPAT", clues: ["Pertemuan untuk membahas sesuatu", "Kumpul bersama", "Forum koordinasi"], category: "Sosial" },
  { word: "NOTULEN", clues: ["Catatan hasil rapat", "Dokumentasi pertemuan", "Ringkasan diskusi"], category: "Sosial" },
  { word: "UNDANGAN", clues: ["Permintaan untuk hadir", "Surat ajakan", "Sebutan untuk tamu"], category: "Sosial" },
  { word: "SERTIFIKAT", clues: ["Tanda penghargaan tertulis", "Bukti kelulusan", "Piagam penghargaan"], category: "Sosial" },
  { word: "IJAZAH", clues: ["Surat tanda tamat belajar", "Bukti kelulusan resmi", "Dokumen pendidikan"], category: "Sosial" },
  { word: "BEASISWA", clues: ["Bantuan biaya pendidikan", "Dana prestasi", "Hak siswa berprestasi"], category: "Sosial" },
  { word: "BIMBINGAN", clues: ["Petunjuk dan arahan", "Proses belajar dengan mentor", "Konseling"], category: "Sosial" },
  { word: "KONSELING", clues: ["Pemberian nasihat oleh ahli", "Bimbingan psikologis", "Curhat profesional"], category: "Sosial" },
  { word: "EKSTRAKURIKULER", clues: ["Kegiatan di luar jam pelajaran", "Pramuka, PMR, olahraga", "Pengembangan bakat"], category: "Sosial" },
  { word: "PRAMUKA", clues: ["Kegiatan kepanduan", "Seragam coklat", "Latihan di alam terbuka"], category: "Sosial" },
  { word: "PASKIBRA", clues: ["Pengibar bendera pusaka", "Upacara 17 Agustus", "Baris berbaris"], category: "Sosial" },
  { word: "OSIS", clues: ["Organisasi siswa intra sekolah", "Pengurus siswa", "Wadah aspirasi siswa"], category: "Sosial" },
  { word: "KLUB", clues: ["Kelompok dengan minat sama", "Perkumpulan", "Komunitas hobi"], category: "Sosial" },
  { word: "KOMUNITAS", clues: ["Kelompok masyarakat", "Perkumpulan dengan tujuan sama", "Masyarakat lokal"], category: "Sosial" },
  { word: "RELASI", clues: ["Hubungan antar orang", "Koneksi pertemanan", "Jaringan sosial"], category: "Sosial" },
  { word: "JEJARING", clues: ["Jaringan pertemanan atau koneksi", "Networking", "Saling terhubung"], category: "Sosial" },
  { word: "MEDIA", clues: ["Alat penyampai informasi", "TV, radio, koran", "Sarana komunikasi massa"], category: "Sosial" },
  { word: "PORTAL", clues: ["Gerbang atau pintu masuk", "Situs web utama", "Pintu akses informasi"], category: "Bahasa" },
  { word: "KANAL", clues: ["Saluran informasi", "Channel media", "Jalur komunikasi"], category: "Bahasa" },
  { word: "PLATFORM", clues: ["Wadah atau tempat beraktivitas", "Sistem yang jadi dasar", "Media digital"], category: "Bahasa" },
  { word: "APLIKASI", clues: ["Program komputer untuk tugas tertentu", "Software di HP", "Alat bantu digital"], category: "Sosial" },
  { word: "DIGITAL", clues: ["Berkaitan dengan teknologi digital", "Era internet", "Modern dan paperless"], category: "Sosial" },
  { word: "INTERNET", clues: ["Jaringan global komputer", "Dunia maya", "Sumber informasi online"], category: "Sosial" },
  { word: "SITUS", clues: ["Tempat di internet", "Website", "Halaman web"], category: "Bahasa" },
  { word: "KONTEN", clues: ["Isi dari media", "Materi yang disajikan", "Artikel, video, gambar"], category: "Bahasa" },
  { word: "CERITA", clues: ["Kisah atau narasi", "Tuturan tentang sesuatu", "Dongeng pengantar tidur"], category: "Sastra" },
  { word: "PETUALANGAN", clues: ["Perjalanan penuh tantangan", "Pengalaman seru", "Jelajah alam"], category: "Sastra" },
  { word: "MISTERI", clues: ["Hal yang belum terpecahkan", "Teka-teki", "Penuh rahasia"], category: "Sastra" },
  { word: "HOROR", clues: ["Cerita yang menakutkan", "Menimbulkan rasa takut", "Genre seram"], category: "Sastra" },
  { word: "ROMANTIS", clues: ["Berhubungan dengan cinta", "Penuh kasih mesra", "Genre percintaan"], category: "Sastra" },
  { word: "LIRIK", clues: ["Kata-kata dalam lagu", "Syair yang dinyanyikan", "Teks musik"], category: "Seni" },
  { word: "MELODI", clues: ["Rangkaian nada dalam musik", "Alunan suara merdu", "Inti dari lagu"], category: "Seni" },
  { word: "RITME", clues: ["Irama dalam musik", "Ketukan teratur", "Tempo lagu"], category: "Seni" },
  { word: "WARNA", clues: ["Spektrum cahaya", "Merah, kuning, biru", "Unsur seni rupa"], category: "Seni" },
  { word: "GARIS", clues: ["Goresan pensil yang memanjang", "Unsur dasar seni rupa", "Lurus, lengkung, patah"], category: "Seni" },
  { word: "BENTUK", clues: ["Wujud suatu objek", "Bulat, kotak, segitiga", "Struktur visual"], category: "Seni" },
  { word: "TEKSTUR", clues: ["Permukaan suatu benda", "Kasar, halus, licin", "Diraba dengan tangan"], category: "Seni" },
  { word: "PENCIL", clues: ["Alat tulis dari grafit", "Bisa dihapus", "Biasa untuk sketsa"], category: "Seni" },
  { word: "KUAS", clues: ["Alat untuk melukis", "Bulu halus bertangkai", "Alat aplikasi cat"], category: "Seni" },
  { word: "KANVAS", clues: ["Kain tempat melukis", "Media seni lukis", "Permukaan gambar"], category: "Seni" },
  { word: "PATUNG", clues: ["Karya seni tiga dimensi", "Pahatan dari batu atau kayu", "Seni rupa bentuk"], category: "Seni" },
  { word: "KERAMIK", clues: ["Barang dari tanah liat bakar", "Tembikar dan gerabah", "Seni kriya"], category: "Seni" },
  { word: "BATIK", clues: ["Kain bermotif lilin", "Warisan budaya Indonesia", "Canting dan malam"], category: "Seni" },
  { word: "WAYANG", clues: ["Pertunjukan boneka tradisional", "Kulit atau kayu", "Cerita Mahabharata"], category: "Seni" },
  { word: "ANGKLUNG", clues: ["Alat musik dari bambu", "Getar dan bunyi", "Warisan dunia UNESCO"], category: "Seni" },
  { word: "GAMELAN", clues: ["Alat musik tradisional Jawa", "Saron, bonang, gong", "Pengiring wayang"], category: "Seni" },
  { word: "KOLABORASI", clues: ["Kerja sama antara dua pihak", "Sinergi untuk hasil", "Bersama lebih baik"], category: "Sosial" },
];

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800, 4700, 5700, 6800, 8000, 9300, 10700, 12200, 13800, 15500, 17300, 19200, 21200, 23300, 25500, 27800, 30200, 32700, 35300, 38000, 40800, 43700, 46700, 49800, 53000, 56300, 59700, 63200, 66800, 70500, 74300, 78200, 82200, 86300, 90500, 94800, 99200, 103700, 108300, 113000, 117800];

function getLevel(xp: number) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function getLevelProgress(xp: number) {
  const level = getLevel(xp);
  const current = LEVEL_THRESHOLDS[level - 1] || 0;
  const next = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 10000;
  return { level, progress: ((xp - current) / (next - current)) * 100, current, next };
}

export default function TebakKataGame({ hideBackButton }: { hideBackButton?: boolean }) {
  const [gameState, setGameState] = useState<"menu" | "playing" | "result">("menu");
  const [xp, setXp] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentWord, setCurrentWord] = useState<any>(null);
  const [currentClue, setCurrentClue] = useState(0);
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(10);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [xpSaved, setXpSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tebak-kata-progress");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setXp(data.xp || 0);
        setBestStreak(data.bestStreak || 0);
      } catch {}
    }
  }, []);

  const supabaseIdRef = useRef("")
  useEffect(() => {
    const stored = localStorage.getItem("bc-user")
    if (stored) {
      try { supabaseIdRef.current = JSON.parse(stored).state?.supabaseId || "" } catch {}
    }
  }, [])

  useEffect(() => {
    if (gameState !== "result" || xpSaved || score <= 0) return
    setXpSaved(true)
    fetch("/api/game/xp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, correct: 0, wrong: 0, maxStreak: bestStreak, xpEarned: score, gameType: "TEBAK_KATA", supabaseId: supabaseIdRef.current }),
    }).catch(() => {})
  }, [gameState, xpSaved, score, bestStreak])

  const saveProgress = useCallback((newXp: number, newBestStreak: number) => {
    localStorage.setItem("tebak-kata-progress", JSON.stringify({ xp: newXp, bestStreak: newBestStreak }));
  }, []);

  const startGame = () => {
    setGameState("playing");
    setLives(3);
    setScore(0);
    setStreak(0);
    setRound(0);
    setUsedWords(new Set());
    setHintUsed(false);
    nextWord(new Set());
  };

  const nextWord = (used: Set<string>) => {
    const available = WORDS_DB.filter((w) => !used.has(w.word));
    if (available.length === 0) {
      setUsedWords(new Set());
      const pool = [...WORDS_DB];
      const word = pool[Math.floor(Math.random() * pool.length)];
      setCurrentWord(word);
      setUsedWords(new Set([word.word]));
    } else {
      const word = available[Math.floor(Math.random() * available.length)];
      setCurrentWord(word);
      setUsedWords(new Set([...used, word.word]));
    }
    setCurrentClue(0);
    setGuess("");
    setFeedback(null);
    setHintUsed(false);
  };

  const checkAnswer = () => {
    if (!currentWord || !guess.trim()) return;
    const isCorrect = guess.trim().toUpperCase() === currentWord.word;

    if (isCorrect) {
      const basePoints = 100;
      const clueBonus = currentClue === 0 ? 50 : currentClue === 1 ? 25 : 0;
      const streakBonus = streak * 10;
      const totalPoints = basePoints + clueBonus + streakBonus;
      const newStreak = streak + 1;
      const newBestStreak = Math.max(bestStreak, newStreak);
      const newXp = xp + totalPoints;

      setScore((s) => s + totalPoints);
      setStreak(newStreak);
      setBestStreak(newBestStreak);
      setXp(newXp);
      setFeedback({ correct: true, message: `+${totalPoints}` });
      saveProgress(newXp, newBestStreak);

      setTimeout(() => {
        const newRound = round + 1;
        setRound(newRound);
        if (newRound >= totalRounds) {
          setGameState("result");
        } else {
          nextWord(usedWords);
        }
      }, 1200);
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      setStreak(0);
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 500);

      if (newLives <= 0) {
        setFeedback({ correct: false, message: currentWord.word });
        setTimeout(() => setGameState("result"), 2000);
      } else {
        setFeedback({ correct: false, message: `${newLives} nyawa tersisa` });
        if (currentClue < currentWord.clues.length - 1) {
          setCurrentClue((c) => c + 1);
        }
        setGuess("");
      }
    }
  };

  const useHint = () => {
    if (!currentWord || hintUsed) return;
    setHintUsed(true);
    const masked = currentWord.word.split("").map((l: string, i: number) => (i === 0 || i === currentWord.word.length - 1 ? l : "_")).join(" ");
    setGuess(masked.replace(/ /g, ""));
  };

  const levelInfo = getLevelProgress(xp);

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col">
      {/* iOS-style Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {!hideBackButton && (
            <button onClick={() => setGameState("menu")} className="text-blue-500 font-medium text-sm flex items-center gap-0.5">
              <ArrowLeft size={20} /> Menu
            </button>
          )}
          {hideBackButton && <div />}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <span className="text-amber-700 font-bold text-sm">{score}</span>
            </div>
            <div className="flex items-center gap-0.5">
              {[...Array(3)].map((_, i) => (
                <motion.div key={i} animate={i >= lives ? { scale: [1, 0.8, 1] } : {}}>
                  <Heart size={18} className={i < lives ? "text-red-500 fill-red-500" : "text-gray-300"} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      {gameState === "menu" && (
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center max-w-sm w-full">
            <motion.div animate={{ rotate: [0, -5, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-500/30">
              <Lightbulb size={52} className="text-white" />
            </motion.div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Tebak Kata</h1>
            <p className="text-gray-500 mb-8 text-base">Tebak kata Bahasa Indonesia dari petunjuk</p>

            {/* Stats Card */}
            <div className="bg-white rounded-2xl p-5 mb-8 shadow-sm border border-gray-100">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Crown size={16} className="text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{levelInfo.level}</p>
                  <p className="text-xs text-gray-400">Level</p>
                </div>
                <div className="text-center border-x border-gray-100">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Zap size={16} className="text-violet-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{Math.floor(xp)}</p>
                  <p className="text-xs text-gray-400">XP</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Sparkles size={16} className="text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{bestStreak}</p>
                  <p className="text-xs text-gray-400">Streak</p>
                </div>
              </div>
              {/* XP Progress */}
              <div className="mt-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${levelInfo.progress}%` }} transition={{ duration: 0.8 }} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 text-center">{Math.floor(xp)} / {levelInfo.next} XP</p>
              </div>
            </div>

            <button onClick={startGame} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
              <Zap size={20} /> Mulai Bermain
            </button>
          </motion.div>
        </div>
      )}

      {/* Playing */}
      {gameState === "playing" && currentWord && (
        <div className="flex-1 flex flex-col px-6 py-6 max-w-lg mx-auto w-full">
          {/* Round & Streak */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-gray-400">{round + 1} / {totalRounds}</span>
            {streak > 0 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-full">
                <Zap size={14} className="text-orange-500 fill-orange-500" />
                <span className="text-orange-700 font-bold text-sm">{streak}</span>
              </motion.div>
            )}
          </div>

          {/* Category Badge */}
          <div className="flex justify-center mb-6">
            <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-4 py-1.5 rounded-full">{currentWord.category}</span>
          </div>

          {/* Word Length */}
          <div className="flex items-center justify-center gap-1.5 mb-8">
            {currentWord.word.split("").map((_: string, i: number) => (
              <div key={i} className="w-9 h-11 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm">
                <span className="text-gray-300 text-sm font-medium">{i + 1}</span>
              </div>
            ))}
          </div>

          {/* Clues Card */}
          <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Petunjuk</p>
            <AnimatePresence mode="wait">
              <motion.div key={currentClue} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-2.5">
                {currentWord.clues.slice(0, currentClue + 1).map((clue: string, i: number) => (
                  <motion.p key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`text-sm leading-relaxed ${i === currentClue ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                    <span className="mr-2">{i === currentClue ? "💡" : "✓"}</span>{clue}
                  </motion.p>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Input */}
          <div className="mb-4">
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
              placeholder="Ketik jawaban..."
              className={`w-full bg-white border-2 ${shakeInput ? "border-red-400" : "border-gray-200 focus:border-violet-500"} rounded-2xl px-5 py-4 text-center text-xl font-bold tracking-widest placeholder-gray-300 focus:outline-none transition-all shadow-sm`}
              maxLength={currentWord.word.length + 5}
              autoFocus
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mb-6">
            <button onClick={useHint} disabled={hintUsed} className="flex-1 bg-white border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-30 flex items-center justify-center gap-2 shadow-sm">
              <Lightbulb size={18} /> Petunjuk
            </button>
            <button onClick={checkAnswer} disabled={!guess.trim()} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <Check size={18} /> Tebak
            </button>
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className={`p-4 rounded-2xl text-center ${feedback.correct ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <p className={`text-lg font-bold ${feedback.correct ? "text-green-700" : "text-red-700"}`}>{feedback.message}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Result */}
      {gameState === "result" && (
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-sm w-full">
            <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 1 }} className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/30">
              <Trophy size={52} className="text-white" />
            </motion.div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-1">Selesai!</h2>
            <p className="text-gray-500 mb-6">Skor kamu</p>
            <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600 mb-8">{score}</p>

            <div className="bg-white rounded-2xl p-5 mb-8 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">XP Didapat</span>
                <span className="font-bold text-green-600">+{score}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Best Streak</span>
                <span className="font-bold text-orange-600">{bestStreak}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Level</span>
                <span className="font-bold text-violet-600">{levelInfo.level}</span>
              </div>
            </div>

            <button onClick={startGame} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
              <RefreshCw size={20} /> Main Lagi
            </button>
            <button onClick={() => setGameState("menu")} className="w-full mt-3 bg-white border border-gray-200 text-gray-700 font-semibold py-4 rounded-2xl active:scale-[0.98] transition-transform shadow-sm">
              Kembali ke Menu
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
