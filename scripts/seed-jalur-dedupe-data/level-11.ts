import type { UnitSoal } from "./types";

const BS: ["Benar", "Salah"] = ["Benar", "Salah"];

const level11: UnitSoal[] = [
  { level: 11, title: "Menulis Kalimat Pendek", soal: [
    { id: "u61f", tipe: "pilihan_ganda", soal: "Kalimat yang paling ringkas dan tetap jelas adalah ...", opsi: ["Para siswa sedang melakukan kegiatan membersihkan kelas.", "Siswa membersihkan kelas.", "Para siswa melakukan aktivitas pembersihan kelas secara bersama-sama.", "Kegiatan pembersihan kelas sedang dilakukan oleh siswa-siswa."], jawaban: 1, penjelasan: "'Siswa membersihkan kelas' — S-P-O lengkap tanpa kata berlebihan." },
    { id: "u61g", tipe: "pilihan_ganda", soal: "Ubah menjadi ringkas: 'Kami melakukan kegiatan berlatih di lapangan.' Perbaikan terbaik: ...", opsi: ["Kami berlatih di lapangan.", "Kami melakukan latihan di lapangan.", "Kami melakukan kegiatan berlatih di lapangan.", "Di lapangan kami melakukan kegiatan berlatih."], jawaban: 0, penjelasan: "'Berlatih' sudah mencakup 'melakukan kegiatan latihan'." },
    { id: "u61h", tipe: "pilihan_ganda", soal: "Menulis kalimat pendek terutama berguna untuk ...", opsi: ["membuat pesan cepat dipahami", "menambah jumlah kata", "membuat pembaca bingung", "memenuhi halaman buku"], jawaban: 0, penjelasan: "Kalimat pendek dan jelas mempercepat pemahaman pembaca." },
    { id: "u61i", tipe: "benar_salah", soal: "Menghapus kata yang tidak perlu membuat kalimat menjadi lebih jelas.", opsi: BS, jawaban: "Benar", penjelasan: "Membuang kata berlebihan membuat kalimat padat dan jelas." },
    { id: "u61j", tipe: "isi_blank", soal: "Ringkas: 'melakukan aktivitas menulis' = me...", jawaban: "menulis", penjelasan: "Satu kata sudah cukup: menulis." },
  ]},
  { level: 11, title: "Membuat Ringkasan", soal: [
    { id: "u62f", tipe: "pilihan_ganda", soal: "Bacalah teks berikut!\n'Kopi dijual dalam beberapa bentuk, seperti biji utuh, bubuk, dan instan. Biji utuh paling awet karena minyaknya tidak cepat hilang.'\nGagasan pokok teks di atas adalah ...", opsi: ["Kopi instan rasanya paling enak.", "Biji kopi utuh adalah bentuk kopi yang paling awet.", "Semua kopi berasal dari luar negeri.", "Minum kopi menghilangkan kantuk."], jawaban: 1, penjelasan: "Kalimat kedua menyatakan inti: biji utuh paling awet." },
    { id: "u62g", tipe: "pilihan_ganda", soal: "Bacalah teks berikut!\n'Badak bercula satu hidup di Taman Nasional Ujung Kulon. Jumlahnya kurang dari seratus ekor sehingga hewan ini tergolong langka.'\nRingkasan yang paling tepat: ...", opsi: ["Badak bercula satu yang langka hidup di Ujung Kulon.", "Ujung Kulon terletak dekat kota besar.", "Badak bercula satu gemar makan rumput laut.", "Populasi badak terus bertambah dengan cepat."], jawaban: 0, penjelasan: "Ringkasan menggabungkan gagasan pokok tanpa menambah informasi baru." },
    { id: "u62h", tipe: "pilihan_ganda", soal: "Bagian yang BOLEH dibuang saat membuat ringkasan adalah ...", opsi: ["gagasan pokok", "inti informasi", "contoh yang tidak penting", "hubungan sebab-akibat"], jawaban: 2, penjelasan: "Contoh yang tidak penting bukan bagian inti, jadi boleh dihilangkan." },
    { id: "u62i", tipe: "benar_salah", soal: "Ringkasan ditulis dengan kata-kata sendiri tanpa mengubah makna asli.", opsi: BS, jawaban: "Benar", penjelasan: "Ringkasan memakai bahasa sendiri tetapi tetap setia pada makna." },
    { id: "u62j", tipe: "isi_blank", soal: "Kegiatan memendekkan teks dengan tetap mempertahankan gagasan pokok disebut ...", jawaban: "ringkasan", penjelasan: "Ringkasan = pemendekan teks yang menjaga gagasan pokok." },
  ]},
  { level: 11, title: "Memilih Judul", soal: [
    { id: "u63f", tipe: "pilihan_ganda", soal: "Bacalah teks berikut!\n'Gunung Bromo terkenal dengan panorama matahari terbitnya. Banyak wisatawan berangkat pukul tiga pagi agar tidak ketinggalan pemandangan itu.'\nJudul yang paling cocok untuk teks di atas: ...", opsi: ["Keindahan Matahari Terbit di Gunung Bromo", "Cara Mendaki Gunung yang Aman", "Asal Usul Nama Gunung", "Harga Tiket Masuk yang Murah"], jawaban: 0, penjelasan: "Judul itu mencerminkan isi teks tentang panorama matahari terbit." },
    { id: "u63g", tipe: "pilihan_ganda", soal: "Ciri judul yang baik adalah ...", opsi: ["singkat, menarik, dan mencerminkan isi", "panjang dan bertele-tele", "memakai banyak istilah asing", "tidak berhubungan dengan isi"], jawaban: 0, penjelasan: "Judul yang baik mewakili isi secara singkat dan menarik." },
    { id: "u63h", tipe: "pilihan_ganda", soal: "Teks berisi langkah-langkah membuat layang-layang dari bambu dan kertas paling cocok berjudul ...", opsi: ["Cara Membuat Layang-Layang", "Sejarah Layang-Layang di Dunia", "Bermain Layang-Layang di Pantai", "Angin Kencang Melanda Kota"], jawaban: 0, penjelasan: "Isinya langkah pembuatan, sehingga judul tentang cara membuat paling tepat." },
    { id: "u63i", tipe: "benar_salah", soal: "Judul yang baik harus memuat seluruh isi tulisan secara rinci.", opsi: BS, jawaban: "Salah", penjelasan: "Judul cukup memancing minat dan mewakili inti, tidak harus terperinci." },
    { id: "u63j", tipe: "isi_blank", soal: "Huruf pertama setiap kata dalam judul ditulis ... kecuali kata tugas seperti 'ke' dan 'di'.", jawaban: "kapital", penjelasan: "Judul memakai huruf kapital di awal kata, kecuali kata tugas." },
  ]},
  { level: 11, title: "Menghapus Kata Berlebihan", soal: [
    { id: "u64f", tipe: "pilihan_ganda", soal: "'Hadirin sangat bertepuk tangan sekali.' Kata yang sebaiknya dihapus: ...", opsi: ["sangat", "hadirin", "bertepuk", "tangan"], jawaban: 0, penjelasan: "'Sangat ... sekali' berlebihan; cukup salah satu." },
    { id: "u64g", tipe: "pilihan_ganda", soal: "'Mereka saling tolong-menolong di pasar.' Perbaikan yang paling tepat: ...", opsi: ["Mereka tolong-menolong di pasar.", "Mereka saling tolong-menolong-menolong di pasar.", "Mereka saling tolong di pasar.", "Mereka saling menolong-menolong di pasar."], jawaban: 0, penjelasan: "'Tolong-menolong' sudah bermakna saling, jadi 'saling' tidak perlu." },
    { id: "u64h", tipe: "pilihan_ganda", soal: "'Guru adalah merupakan seorang pembimbing.' Kata yang membuat kalimat berlebihan: ...", opsi: ["merupakan", "seorang", "pembimbing", "guru"], jawaban: 0, penjelasan: "'Adalah merupakan' tumpang tindih; cukup 'adalah' atau 'merupakan'." },
    { id: "u64i", tipe: "benar_salah", soal: "'Para siswa-siswa membersihkan kelas.' Kalimat itu menggunakan kata berlebihan.", opsi: BS, jawaban: "Benar", penjelasan: "'Para' sudah jamak, 'siswa-siswa' juga jamak — pilih salah satu." },
    { id: "u64j", tipe: "isi_blank", soal: "Hematkan 'saling berlomba-lomba' cukup ditulis ...", jawaban: "berlomba-lomba", penjelasan: "'Berlomba-lomba' sudah menyiratkan kebersamaan, 'saling' tidak perlu." },
  ]},
  { level: 11, title: "Menulis Pesan yang Jelas", soal: [
    { id: "u65f", tipe: "pilihan_ganda", soal: "Pesan paling jelas untuk memberi tahu ibu bahwa kamu pulang telat: ...", opsi: ["Ma, hari ini aku pulang pukul lima sore karena ada latihan pramuka. — Dimas", "Ma, aku telat. Nanti.", "Ma besok pulang.", "Telat ma"], jawaban: 0, penjelasan: "Pesan itu lengkap: siapa, kapan, mengapa, dan nama pengirim." },
    { id: "u65g", tipe: "pilihan_ganda", soal: "Informasi yang WAJIB ada dalam pesan pemberitahuan kegiatan kelas adalah ...", opsi: ["hari, tanggal, dan tempat kegiatan", "merek sepatu pengirim", "lirik lagu kesukaan", "jumlah anggota keluarga"], jawaban: 0, penjelasan: "Penerima butuh tahu kapan dan di mana kegiatan berlangsung." },
    { id: "u65h", tipe: "pilihan_ganda", soal: "Pesan santun kepada teman sekelas: ...", opsi: ["Rina, tolong bawa buku paket ini ke kelas ya. — Sari", "LAKUKAN SEKARANG JUGA!!!", "kamu disuruh bawa buku itu", "dah bawa aja masa iya gak"], jawaban: 0, penjelasan: "Kalimat itu santun, jelas, dan menyertakan nama pengirim." },
    { id: "u65i", tipe: "benar_salah", soal: "Menulis pesan dengan huruf kapital semua membuatnya terkesan marah.", opsi: BS, jawaban: "Benar", penjelasan: "Huruf kapital semua dalam pesan lazim dianggap berteriak atau marah." },
    { id: "u65j", tipe: "isi_blank", soal: "Pesan perlu mencantumkan nama ... agar penerima tahu siapa yang mengirim.", jawaban: "pengirim", penjelasan: "Nama pengirim membuat pesan jelas asal-usulnya." },
  ]},
  { level: 11, title: "Latihan Cepat Level 11", soal: [
    { id: "u66f", tipe: "pilihan_ganda", soal: "Kalimat yang paling ringkas dan tetap jelas: ...", opsi: ["Ani mengerjakan tugas dengan cepat.", "Ani mengerjakan tugas dengan sangat cepat sekali.", "Ani melakukan aktivitas mengerjakan tugas dengan cara yang sangat cepat.", "Dengan sangat cepat sekali tugas dikerjakan oleh Ani."], jawaban: 0, penjelasan: "Pilihan itu padat, jelas, dan tanpa 'sangat ... sekali' yang berlebihan." },
    { id: "u66g", tipe: "pilihan_ganda", soal: "Judul yang paling tepat untuk teks berisi manfaat minum air putih: ...", opsi: ["Manfaat Minum Air Putih bagi Tubuh", "Air Sungai Mulai Tercemar", "Cara Membuat Es Teh Manis", "Cuaca Panas Melanda Kota"], jawaban: 0, penjelasan: "Judul itu sesuai dengan isi teks tentang manfaat air putih." },
    { id: "u66h", tipe: "pilihan_ganda", soal: "'Para hadirin semuanya dimohon berdiri.' Perbaikan yang paling ringkas: ...", opsi: ["Hadirin dimohon berdiri.", "Para hadirin semuanya berdiri.", "Hadirin dimohon semua untuk berdiri.", "Semua hadirin dimohon semua untuk berdiri."], jawaban: 0, penjelasan: "'Para' dan 'semuanya' berlebihan karena 'hadirin' sudah jamak." },
    { id: "u66i", tipe: "benar_salah", soal: "Ringkasan boleh dibuat lebih panjang daripada teks aslinya.", opsi: BS, jawaban: "Salah", penjelasan: "Ringkasan justru harus lebih pendek dari teks aslinya." },
    { id: "u66j", tipe: "isi_blank", soal: "Sebelum mengirim pesan, sebaiknya kita ... ulang agar tidak ada kata yang keliru.", jawaban: "periksa", penjelasan: "Memeriksa ulang pesan mencegah salah paham." },
  ]},
];

export default level11;
