"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Heart, Star, Trophy, Zap, Lightbulb, Check, RotateCcw, Lock,
  ChevronRight, Play, Volume2, VolumeX, Loader2, Sparkles,
} from "lucide-react";
import { sfx, haptic, isSoundOn, toggleSound, startBGM, stopBGM } from "@/lib/game/sound";

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
  { word: "SUBSTANSI", clues: ["Inti atau isi pokok", "Bagian paling penting", "Esensi dari suatu hal"], category: "Bahasa" },
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
  { word: "IRAMA", clues: ["Alunan suara teratur", "Rentak dalam puisi", "Tinggi rendah panjang pendek bunyi"], category: "Sastra" },
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
  { word: "EFEKTIF", clues: ["Tepat sasaran", "Berhasil mencapai tujuan", "Tidak mubazir"], category: "Bahasa" },
  { word: "EFISIEN", clues: ["Hemat waktu dan tenaga", "Optimal dalam penggunaan sumber", "Tidak boros"], category: "Bahasa" },
  { word: "AKURAT", clues: ["Tepat dan benar", "Sesuai fakta", "Tidak salah"], category: "Bahasa" },
  { word: "OBJEKTIF", clues: ["Berdasarkan fakta", "Tidak memihak", "Netral dan apa adanya"], category: "Sosial" },
  { word: "SUBJEKTIF", clues: ["Berdasarkan pendapat pribadi", "Mengandung perasaan", "Tidak netral"], category: "Sosial" },
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
  { word: "PENSIL", clues: ["Alat tulis dari grafit", "Bisa dihapus", "Biasa untuk sketsa"], category: "Seni" },
  { word: "KUAS", clues: ["Alat untuk melukis", "Bulu halus bertangkai", "Alat aplikasi cat"], category: "Seni" },
  { word: "KANVAS", clues: ["Kain tempat melukis", "Media seni lukis", "Permukaan gambar"], category: "Seni" },
  { word: "PATUNG", clues: ["Karya seni tiga dimensi", "Pahatan dari batu atau kayu", "Seni rupa bentuk"], category: "Seni" },
  { word: "KERAMIK", clues: ["Barang dari tanah liat bakar", "Tembikar dan gerabah", "Seni kriya"], category: "Seni" },
  { word: "BATIK", clues: ["Kain bermotif lilin", "Warisan budaya Indonesia", "Canting dan malam"], category: "Seni" },
  { word: "WAYANG", clues: ["Pertunjukan boneka tradisional", "Kulit atau kayu", "Cerita Mahabharata"], category: "Seni" },
  { word: "ANGKLUNG", clues: ["Alat musik dari bambu", "Getar dan bunyi", "Warisan dunia UNESCO"], category: "Seni" },
  { word: "GAMELAN", clues: ["Alat musik tradisional Jawa", "Saron, bonang, gong", "Pengiring wayang"], category: "Seni" },
  { word: "KOSAKATA", clues: ["Perbendaharaan kata", "Makin banyak makin lancar berbahasa", "Dikuasai lewat rajin membaca"], category: "Bahasa" },
  { word: "IMBUHAN", clues: ["Ditambahkan pada kata dasar", "Me-, ber-, ter-, di-", "Mengubah makna kata"], category: "Bahasa" },
  { word: "LITERASI", clues: ["Kemampuan membaca dan menulis", "Gerakan nasional di sekolah", "Kunci memahami informasi"], category: "Bahasa" },
  { word: "NASKAH", clues: ["Teks tertulis untuk dipentaskan", "Dipegang sutradara dan aktor", "Karangan yang belum diterbitkan"], category: "Sastra" },
  { word: "SAJAK", clues: ["Persamaan bunyi dalam puisi", "Ada di akhir larik", "Karya puisi bebas"], category: "Sastra" },
  { word: "ORASI", clues: ["Pidato di depan umum", "Disampaikan dengan berapi-api", "Sering terdengar saat demonstrasi"], category: "Bahasa" },
  { word: "FRASA", clues: ["Gabungan dua kata atau lebih", "Tidak melampaui batas fungsi", "Contohnya 'meja hijau'"], category: "Bahasa" },
  { word: "MAJALAH", clues: ["Terbitan berkala bergambar", "Berisi artikel beragam", "Dibaca di ruang tunggu"], category: "Media" },
  { word: "SANGGAR", clues: ["Tempat berlatih seni", "Ada sanggar tari dan lukis", "Wadah kreativitas"], category: "Seni" },
  { word: "ANTOLOGI", clues: ["Kumpulan karya sastra", "Berisi puisi atau cerpen banyak penulis", "Buku bunga rampai"], category: "Sastra" },
  { word: "KHAZANAH", clues: ["Kekayaan atau perbendaharaan", "Sering disandingkan dengan budaya", "Harta yang terhimpun"], category: "Bahasa" },
  { word: "KALIGRAFI", clues: ["Seni menulis indah", "Huruf jadi lukisan", "Sering menghiasi dinding"], category: "Seni" },
  { word: "DEKLAMASI", clues: ["Membaca puisi dengan gaya", "Disertai gerak dan mimik", "Lomba favorit saat Bulan Bahasa"], category: "Sastra" },
  { word: "ETIMOLOGI", clues: ["Ilmu asal-usul kata", "Menelusuri sejarah kata", "Cabang linguistik"], category: "Bahasa" },
  { word: "GLOSARIUM", clues: ["Daftar istilah dan artinya", "Ada di bagian belakang buku", "Kamus kecil khusus"], category: "Bahasa" },
  { word: "LOKAKARYA", clues: ["Pertemuan untuk berlatih keterampilan", "Padanan kata workshop", "Pesertanya praktik langsung"], category: "Sosial" },
  { word: "MANUSKRIP", clues: ["Naskah tulisan tangan", "Dokumen kuno berharga", "Tersimpan di perpustakaan nasional"], category: "Sastra" },
  { word: "SIMPOSIUM", clues: ["Pertemuan membahas satu topik", "Menghadirkan beberapa ahli", "Mirip seminar besar"], category: "Sosial" },
  { word: "SASTRAWAN", clues: ["Penulis karya sastra", "Chairil Anwar salah satunya", "Ahli menggubah kata"], category: "Sastra" },
  { word: "KATA BAKU", clues: ["Sesuai kaidah KBBI", "Dipakai dalam tulisan resmi", "Lawan dari kata gaul"], category: "Bahasa" },
  { word: "PERIBAHASA", clues: ["Kalimat kiasan turun-temurun", "Berakit-rakit ke hulu contohnya", "Mengandung nasihat"], category: "Sastra" },
  { word: "PUSTAKAWAN", clues: ["Penjaga dan pengelola perpustakaan", "Ahli menata buku", "Membantu mencari referensi"], category: "Sosial" },
  { word: "ALITERASI", clues: ["Pengulangan bunyi konsonan", "Gaya bunyi dalam puisi", "Membuat larik terdengar merdu"], category: "Sastra" },
  { word: "AMBIGUITAS", clues: ["Makna ganda dalam kalimat", "Membuat pembaca bingung", "Harus dihindari dalam kalimat efektif"], category: "Bahasa" },
  { word: "INFOGRAFIK", clues: ["Informasi dalam bentuk gambar", "Data jadi mudah dipahami", "Sering muncul di media daring"], category: "Media" },
  { word: "PLAGIARISME", clues: ["Menjiplak karya orang lain", "Pelanggaran etika menulis", "Dicegah dengan mencantumkan sumber"], category: "Bahasa" },
  { word: "PERPUSTAKAAN", clues: ["Gudang ilmu di sekolah", "Tempat meminjam buku", "Harus tenang di dalamnya"], category: "Sosial" },
  { word: "ENSIKLOPEDIA", clues: ["Buku rujukan segala ilmu", "Disusun menurut abjad", "Wikipedia versi cetak"], category: "Bahasa" },
  { word: "PALINDROM", clues: ["Kata yang sama dibaca bolak-balik", "Contohnya 'katak'", "Permainan kata unik"], category: "Bahasa" },
  { word: "TRANSLITERASI", clues: ["Alih aksara antar sistem tulisan", "Dari huruf Arab ke Latin misalnya", "Menjaga bunyi tetap sama"], category: "Bahasa" },
];

type Word = (typeof WORDS_DB)[number];
type Screen = "start" | "levels" | "playing" | "result";

type Level = { id: number; name: string; rounds: number; min: number; max: number; color: string };
const LEVELS: Level[] = [
  { id: 1, name: "Pemula", rounds: 6, min: 4, max: 6, color: "#FF6B6B" },
  { id: 2, name: "Siaga", rounds: 7, min: 5, max: 7, color: "#F59E0B" },
  { id: 3, name: "Petarung", rounds: 8, min: 6, max: 8, color: "#10B981" },
  { id: 4, name: "Jawara", rounds: 9, min: 6, max: 9, color: "#38BDF8" },
  { id: 5, name: "Pahlawan", rounds: 10, min: 7, max: 10, color: "#8B5CF6" },
  { id: 6, name: "Legenda", rounds: 11, min: 7, max: 11, color: "#EC4899" },
  { id: 7, name: "Dewa", rounds: 12, min: 8, max: 12, color: "#F43F5E" },
  { id: 8, name: "Naga", rounds: 13, min: 8, max: 13, color: "#14B8A6" },
  { id: 9, name: "Maha Guru", rounds: 15, min: 6, max: 99, color: "#6366F1" },
];

type Saved = { unlocked: number[]; best: Record<number, number>; stars: Record<number, number> };
function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem("tebak-kata-progress");
    if (raw) {
      const d = JSON.parse(raw);
      if (Array.isArray(d.unlocked)) return { unlocked: d.unlocked, best: d.best || {}, stars: d.stars || {} };
    }
  } catch { /* abaikan */ }
  return { unlocked: [1], best: {}, stars: {} };
}
function saveSaved(s: Saved) {
  try { localStorage.setItem("tebak-kata-progress", JSON.stringify(s)); } catch { /* abaikan */ }
}

// Kata yang baru saja muncul diprioritaskan untuk dihindari di sesi
// berikutnya, supaya replay level yang sama tidak terasa mengulang kata yang
// sama persis — bank kata tetap sama, tapi urutan yang muncul terasa lebih segar.
const RECENT_WORDS_KEY = "tebak-kata-recent";
const RECENT_WORDS_LIMIT = 60;
function loadRecentWords(): string[] {
  try { const raw = localStorage.getItem(RECENT_WORDS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function rememberWords(used: string[]) {
  try {
    const prev = loadRecentWords();
    const next = [...used, ...prev].slice(0, RECENT_WORDS_LIMIT);
    localStorage.setItem(RECENT_WORDS_KEY, JSON.stringify(next));
  } catch { /* abaikan */ }
}
/** Utamakan kandidat yang belum baru-baru ini muncul; jika tersisa terlalu sedikit, pakai semua kandidat. */
function preferFresh(candidates: Word[], recent: string[], need: number): Word[] {
  const fresh = candidates.filter((w) => !recent.includes(w.word));
  return fresh.length >= need ? fresh : candidates;
}
function starsFor(score: number, rounds: number): number {
  const perRound = rounds > 0 ? score / rounds : 0;
  if (perRound >= 160) return 3;
  if (perRound >= 100) return 2;
  if (perRound >= 40) return 1;
  return 0;
}

export default function TebakKataGame({ hideBackButton, backHref = "/arena/game" }: { hideBackButton?: boolean; backHref?: string }) {
  const [screen, setScreen] = useState<Screen>("start");
  const [saved, setSaved] = useState<Saved>({ unlocked: [1], best: {}, stars: {} });
  const [soundOn, setSoundOn] = useState(true);
  const [levelId, setLevelId] = useState(1);
  const [pool, setPool] = useState<Word[]>([]);
  const [round, setRound] = useState(0);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [currentClue, setCurrentClue] = useState(0);
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const [result, setResult] = useState<null | { score: number; stars: number; bestStreak: number; xpEarned: number; gameOver: boolean }>(null);
  const xpSentRef = useRef(false);
  const supabaseIdRef = useRef("");

  useEffect(() => {
    setSaved(loadSaved());
    try { setSoundOn(isSoundOn()); } catch { /* abaikan */ }
    const stored = localStorage.getItem("bc-user");
    if (stored) { try { supabaseIdRef.current = JSON.parse(stored).state?.supabaseId || ""; } catch { /* abaikan */ } }
  }, []);
  useEffect(() => () => stopBGM(), []);

  const level = LEVELS.find((l) => l.id === levelId) || LEVELS[0];

  const nextWord = useCallback((currentPool: Word[], usedCount: number) => {
    if (usedCount >= currentPool.length) return null;
    return currentPool[usedCount];
  }, []);

  const startLevel = (id: number) => {
    sfx.start(); setSoundOn(isSoundOn()); startBGM();
    const lv = LEVELS.find((l) => l.id === id) || LEVELS[0];
    let candidates = WORDS_DB.filter((w) => w.word.length >= lv.min && w.word.length <= lv.max);
    if (candidates.length < lv.rounds) candidates = WORDS_DB;
    candidates = preferFresh(candidates, loadRecentWords(), lv.rounds);
    const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, lv.rounds);
    rememberWords(shuffled.map((w) => w.word));

    setLevelId(id);
    setPool(shuffled);
    setRound(0);
    setScore(0);
    setLives(3);
    setStreak(0);
    setBestStreak(0);
    setResult(null);
    setHintUsed(false);
    setFeedback(null);
    setGuess("");
    setCurrentClue(0);
    xpSentRef.current = false;
    setCurrentWord(shuffled[0] || null);
    setScreen("playing");
  };

  const finish = useCallback((finalScore: number, finalBestStreak: number, gameOver: boolean) => {
    stopBGM();
    const stars = starsFor(finalScore, level.rounds);
    const xpEarned = Math.min(Math.floor(finalScore / 40), 60);
    if (!gameOver && finalScore > 0) { sfx.win(); haptic([40, 40, 80]); } else if (gameOver) { sfx.gameover(); haptic(120); }

    setResult({ score: finalScore, stars, bestStreak: finalBestStreak, xpEarned, gameOver });
    setScreen("result");

    setSaved((prev) => {
      const next: Saved = { unlocked: [...prev.unlocked], best: { ...prev.best }, stars: { ...prev.stars } };
      if (!gameOver) {
        if (!next.best[levelId] || finalScore > next.best[levelId]) next.best[levelId] = finalScore;
        if (!next.stars[levelId] || stars > next.stars[levelId]) next.stars[levelId] = stars;
        const nid = levelId + 1;
        if (nid <= LEVELS.length && !next.unlocked.includes(nid)) next.unlocked.push(nid);
      }
      saveSaved(next);
      return next;
    });

    if (!xpSentRef.current && finalScore > 0) {
      xpSentRef.current = true;
      fetch("/api/game/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: finalScore, correct: 0, wrong: 0, maxStreak: finalBestStreak, xpEarned, gameType: "TEBAK_KATA", supabaseId: supabaseIdRef.current }),
      }).catch(() => { /* abaikan */ });
    }
  }, [level.rounds, levelId]);

  const checkAnswer = () => {
    if (!currentWord || !guess.trim() || feedback) return;
    const isCorrect = guess.trim().toUpperCase() === currentWord.word;
    if (isCorrect) { sfx.correct(); haptic(25); } else { sfx.wrong(); haptic([60, 40, 60]); }

    if (isCorrect) {
      const basePoints = 100;
      const clueBonus = currentClue === 0 ? 50 : currentClue === 1 ? 25 : 0;
      const streakBonus = streak * 10;
      const totalPoints = basePoints + clueBonus + streakBonus;
      const newStreak = streak + 1;
      const newScore = score + totalPoints;
      const newBest = Math.max(bestStreak, newStreak);
      setScore(newScore);
      setStreak(newStreak);
      setBestStreak(newBest);
      setFeedback({ correct: true, message: `+${totalPoints}` });

      setTimeout(() => {
        const nextRound = round + 1;
        setRound(nextRound);
        if (nextRound >= pool.length) {
          finish(newScore, newBest, false);
        } else {
          setCurrentWord(pool[nextRound]);
          setCurrentClue(0);
          setGuess("");
          setFeedback(null);
          setHintUsed(false);
        }
      }, 1100);
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      setStreak(0);
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 500);

      if (newLives <= 0) {
        setFeedback({ correct: false, message: currentWord.word });
        setTimeout(() => finish(score, bestStreak, true), 1600);
      } else {
        setFeedback({ correct: false, message: `${newLives} nyawa tersisa` });
        if (currentClue < currentWord.clues.length - 1) setCurrentClue((c) => c + 1);
        setGuess("");
        setTimeout(() => setFeedback(null), 900);
      }
    }
  };

  const useHint = () => {
    if (!currentWord || hintUsed) return;
    setHintUsed(true);
    const masked = currentWord.word.split("").map((l, i) => (i === 0 || i === currentWord.word.length - 1 ? l : "_")).join("");
    setGuess(masked.replace(/_/g, ""));
  };

  const chunky = "border-4 border-[#161B3A] shadow-[6px_6px_0_#161B3A]";
  const btnBase = `inline-flex items-center justify-center gap-2 font-extrabold rounded-2xl ${chunky} transition-transform active:translate-x-1.5 active:translate-y-1.5 active:shadow-none hover:-translate-x-0.5 hover:-translate-y-0.5`;

  /* ---------- START ---------- */
  if (screen === "start") {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] text-[#161B3A]">
        <style>{`@keyframes tk-float1{0%,100%{transform:translate(0,0) rotate(6deg)}50%{transform:translate(16px,-22px) rotate(18deg)}}
        @keyframes tk-float2{0%,100%{transform:translate(0,0) rotate(0)}50%{transform:translate(-18px,16px) rotate(-12deg)}}
        @keyframes tk-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tk-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        .tk-screen{animation:tk-fade .35s ease}
        .tk-logo{animation:tk-pulse 1.4s ease-in-out infinite}`}</style>
        <div className="pointer-events-none fixed top-[8%] left-[3%] w-16 h-16 bg-[#8B5CF6] border-4 border-[#161B3A] rounded-3xl" style={{ animation: "tk-float1 9s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed top-[16%] right-[5%] w-12 h-12 bg-[#38BDF8] border-4 border-[#161B3A] rounded-full" style={{ animation: "tk-float2 10s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed bottom-[14%] left-[2%] w-14 h-14 bg-[#FBBF24] border-4 border-[#161B3A] rounded-2xl" style={{ animation: "tk-float1 11s ease-in-out infinite" }} />
        <div className="pointer-events-none fixed bottom-[10%] right-[4%] w-11 h-11 bg-[#4ADE80] border-4 border-[#161B3A] rounded-[30%_70%_70%_30%]" style={{ animation: "tk-float2 8s ease-in-out infinite" }} />

        <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`tk-logo w-11 h-11 bg-[#8B5CF6] rounded-2xl ${chunky} !shadow-[4px_4px_0_#161B3A] flex items-center justify-center`}>
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-extrabold text-xl leading-none">Tebak Kata</div>
                <div className="text-[11px] font-semibold opacity-60 mt-0.5">Tebak dari petunjuk bertahap</div>
              </div>
            </div>
            <button onClick={() => setSoundOn((m) => { toggleSound(); return !m; })} className={`${btnBase} w-11 h-11 bg-white`} aria-label={soundOn ? "Matikan suara" : "Nyalakan suara"}>
              {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>

          <div className="tk-screen bg-white rounded-3xl p-6 text-center flex-1 flex flex-col items-center justify-center">
            <span className="inline-block px-4 py-1.5 bg-[#FBBF24] border-[3px] border-[#161B3A] rounded-full font-extrabold text-xs shadow-[3px_3px_0_#161B3A] mb-4">9 Level • 3 Nyawa</span>
            <h1 className="font-extrabold text-4xl mb-2">Tebak <span className="text-[#8B5CF6]">Kata!</span></h1>
            <p className="opacity-70 text-sm max-w-sm mb-1">Baca petunjuknya, tebak katanya. Makin cepat menjawab — sebelum petunjuk berikutnya terbuka — makin besar bonusnya!</p>
            <p className="text-xs opacity-50 mb-6">Salah 3 kali, permainan berakhir.</p>

            <div className="grid grid-cols-3 gap-2.5 mb-6 w-full max-w-xs">
              <div className="bg-[#4ADE80] border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#161B3A]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Petunjuk 1</div>
                <div className="font-extrabold text-lg">+150</div>
              </div>
              <div className="bg-[#FBBF24] border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#161B3A]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Rentetan</div>
                <div className="font-extrabold text-lg">Bonus</div>
              </div>
              <div className="bg-[#FF6B6B] text-white border-[3px] border-[#161B3A] rounded-xl p-2 shadow-[3px_3px_0_#161B3A]">
                <div className="text-[10px] font-extrabold uppercase opacity-70">Salah</div>
                <div className="font-extrabold text-lg">-1 ❤️</div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mb-2">
              <button className={`${btnBase} px-6 py-3.5 bg-[#8B5CF6] text-white text-lg`} onClick={() => setScreen("levels")}>
                <Play className="w-5 h-5" /> Pilih Tingkat
              </button>
              <button className={`${btnBase} px-5 py-3.5 bg-white`} onClick={() => startLevel(1)}>
                Langsung Level 1
              </button>
            </div>
          </div>
          <p className="text-center text-[11px] opacity-50 mt-4 pb-4">Kumpulkan ⭐ di setiap level untuk buka level berikutnya!</p>
        </div>
      </div>
    );
  }

  /* ---------- LEVELS ---------- */
  if (screen === "levels") {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] text-[#161B3A]">
        <style>{`.tk-screen{animation:tk-fade .35s ease}@keyframes tk-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <button className={`${btnBase} w-11 h-11 bg-white`} onClick={() => setScreen("start")} aria-label="Kembali">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-extrabold text-2xl">Pilih Tingkat</h2>
            <div className="w-11" />
          </div>
          <div className="tk-screen bg-white rounded-3xl p-5 shadow-[6px_6px_0_#161B3A] border-4 border-[#161B3A]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {LEVELS.map((lv) => {
                const unlocked = saved.unlocked.includes(lv.id);
                const best = saved.best[lv.id] || 0;
                const st = saved.stars[lv.id] || 0;
                return (
                  <button
                    key={lv.id}
                    disabled={!unlocked}
                    onClick={() => unlocked && startLevel(lv.id)}
                    className={`text-left rounded-2xl border-4 border-[#161B3A] p-3.5 transition-transform ${
                      unlocked ? "shadow-[5px_5px_0_#161B3A] hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer" : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-[5px_5px_0_#9CA3AF]"
                    }`}
                    style={unlocked ? { background: lv.color, color: ["#FBBF24", "#F59E0B", "#4ADE80", "#38BDF8"].includes(lv.color) ? "#161B3A" : "#fff" } : undefined}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="font-extrabold text-2xl leading-none">#{lv.id}</span>
                      {unlocked ? <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/15">{lv.max - lv.min <= 3 ? "Pendek" : lv.min >= 8 ? "Panjang" : "Sedang"}</span> : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="font-extrabold text-sm leading-tight mb-0.5">{lv.name}</div>
                    <div className="text-[10px] font-semibold opacity-75 mb-1.5">{lv.rounds} kata</div>
                    {unlocked ? (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <Star key={i} className="w-4 h-4" fill={i <= st ? "currentColor" : "none"} style={{ opacity: i <= st ? 1 : 0.35 }} />
                        ))}
                        {best > 0 && <span className="text-[10px] font-extrabold ml-1.5 opacity-80">{best}</span>}
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold">Selesaikan tingkat sebelumnya</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- PLAYING ---------- */
  if (screen === "playing" && currentWord) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] text-[#161B3A]">
        <style>{`@keyframes tk-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}`}</style>
        <div className="relative max-w-lg mx-auto px-5 pt-4 pb-8 min-h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <button className={`${btnBase} w-10 h-10 bg-white`} onClick={() => { stopBGM(); setScreen("levels"); }} aria-label="Keluar">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border-2 border-[#161B3A]">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-bold">{score}</span>
              </div>
              <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border-2 border-[#161B3A]">
                {[...Array(3)].map((_, i) => (
                  <Heart key={i} className={`w-4 h-4 ${i < lives ? "text-rose-500 fill-rose-500" : "text-gray-300"}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold opacity-50">{round + 1} / {pool.length}</span>
            {streak > 0 && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 border border-orange-300">
                <Zap className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                <span className="text-orange-700 font-bold text-xs">{streak}</span>
              </div>
            )}
          </div>

          <div className="flex justify-center mb-5">
            <span className="px-4 py-1.5 rounded-full font-extrabold text-xs border-[3px] border-[#161B3A] shadow-[3px_3px_0_#161B3A]" style={{ background: level.color, color: ["#FBBF24", "#F59E0B", "#4ADE80", "#38BDF8"].includes(level.color) ? "#161B3A" : "#fff" }}>
              {currentWord.category}
            </span>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-6 flex-wrap">
            {currentWord.word.split("").map((_, i) => (
              <div key={i} className="w-9 h-11 rounded-xl bg-white border-[3px] border-[#161B3A] shadow-[2px_2px_0_#161B3A] flex items-center justify-center">
                <span className="text-[#161B3A]/25 text-sm font-extrabold">{i + 1}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-5 mb-5 border-4 border-[#161B3A] shadow-[5px_5px_0_#161B3A]">
            <p className="text-xs font-extrabold uppercase tracking-wider opacity-50 mb-3">Petunjuk</p>
            <AnimatePresence mode="wait">
              <motion.div key={currentClue} initial={{ x: 16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -16, opacity: 0 }} className="space-y-2.5">
                {currentWord.clues.slice(0, currentClue + 1).map((clue, i) => (
                  <p key={i} className={`text-sm leading-relaxed flex items-start gap-2 ${i === currentClue ? "font-bold" : "opacity-40"}`}>
                    {i === currentClue ? <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> : <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                    {clue}
                  </p>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          <motion.div animate={shakeInput ? { x: [0, -10, 10, -7, 7, 0] } : {}} transition={{ duration: 0.4 }} className="mb-4">
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value.toUpperCase().replace(/[^A-Z ]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
              placeholder="Ketik jawaban..."
              className="w-full bg-white border-4 border-[#161B3A] rounded-2xl px-5 py-4 text-center text-xl font-extrabold tracking-widest placeholder-[#161B3A]/25 focus:outline-none shadow-[4px_4px_0_#161B3A]"
              maxLength={currentWord.word.length + 5}
              autoFocus
            />
          </motion.div>

          <div className="flex gap-3 mb-5">
            <button onClick={useHint} disabled={hintUsed} className={`${btnBase} flex-1 py-3.5 bg-white disabled:opacity-30`}>
              <Lightbulb className="w-4 h-4" /> Petunjuk
            </button>
            <button onClick={checkAnswer} disabled={!guess.trim()} className={`${btnBase} flex-1 py-3.5 bg-[#8B5CF6] text-white disabled:opacity-40`}>
              <Check className="w-4 h-4" /> Tebak
            </button>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }} className={`p-4 rounded-2xl text-center border-[3px] border-[#161B3A] shadow-[3px_3px_0_#161B3A] ${feedback.correct ? "bg-emerald-100" : "bg-rose-100"}`}>
                <p className={`text-lg font-extrabold ${feedback.correct ? "text-emerald-700" : "text-rose-700"}`}>{feedback.message}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  /* ---------- RESULT ---------- */
  if (screen === "result" && result) {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] text-[#161B3A]">
        <style>{`@keyframes tk-pop{0%{transform:scale(0) rotate(-30deg)}60%{transform:scale(1.3) rotate(8deg)}100%{transform:scale(1) rotate(0)}}.tk-star{animation:tk-pop .5s ease}`}</style>
        <div className="relative max-w-xl mx-auto px-4 py-5 min-h-full flex flex-col items-center justify-center text-center">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180 }} className={`w-24 h-24 rounded-[28px] bg-gradient-to-br ${result.gameOver ? "from-rose-400 to-red-600" : result.stars >= 2 ? "from-violet-400 to-purple-600" : "from-amber-400 to-orange-600"} flex items-center justify-center shadow-2xl mb-5`}>
            {result.gameOver ? <X className="w-12 h-12 text-white" /> : <Trophy className="w-12 h-12 text-white" />}
          </motion.div>
          <h1 className="text-2xl font-extrabold mb-1">{result.gameOver ? "Nyawa Habis!" : result.stars === 3 ? "Sempurna!" : "Level Selesai!"}</h1>
          <p className="text-sm opacity-60 mb-6">{result.gameOver ? "Jangan menyerah, coba lagi!" : "Kerja bagus! Kejar skor lebih tinggi?"}</p>

          <div className="flex justify-center gap-1.5 mb-4">
            {[1, 2, 3].map((i) => (
              <Star key={i} className={`w-12 h-12 ${i <= result.stars ? "tk-star" : ""}`} style={{ animationDelay: `${i * 0.15}s` }} fill={i <= result.stars ? "#FBBF24" : "none"} stroke={i <= result.stars ? "#F59E0B" : "#D1D5DB"} strokeWidth={2} />
            ))}
          </div>

          <div className="inline-block bg-[#161B3A] text-white rounded-2xl px-7 py-3 mb-4 shadow-[5px_5px_0_#8B5CF6]">
            <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">Skor Akhir</div>
            <div className="font-extrabold text-4xl leading-none">{result.score}</div>
          </div>

          <div className="flex justify-center gap-3 mb-5 text-sm">
            <div className="bg-white border-[3px] border-[#161B3A] rounded-xl px-3 py-1.5 shadow-[2px_2px_0_#161B3A]">
              <Zap className="w-4 h-4 inline mr-1 text-amber-500" /> Rentetan maks <b>{result.bestStreak}</b>
            </div>
          </div>

          {result.xpEarned > 0 && (
            <div className="mb-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/20 text-amber-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> +{result.xpEarned} XP
            </div>
          )}

          <div className="w-full max-w-xs flex flex-col gap-2.5">
            <button onClick={() => startLevel(levelId)} className={`${btnBase} w-full py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white`}>
              <RotateCcw className="w-4 h-4" /> Ulangi Level
            </button>
            {!result.gameOver && levelId < LEVELS.length && (
              <button onClick={() => startLevel(levelId + 1)} className={`${btnBase} w-full py-3.5 bg-[#FF6B6B] text-white`}>
                Level Berikutnya <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setScreen("levels")} className={`${btnBase} w-full py-3.5 bg-[#FBBF24]`}>
              Pilih Tingkat
            </button>
            {!hideBackButton && (
              <a href={backHref} className={`${btnBase} w-full py-3.5 bg-white/80 text-center`}>
                Kembali ke Arena
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-b from-[#FFF6E0] to-[#FFE2C7] text-[#161B3A]">
      <Loader2 className="w-10 h-10 animate-spin" />
    </div>
  );
}
