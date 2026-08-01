import type { UnitSoal } from "./types";

const BS: ["Benar", "Salah"] = ["Benar", "Salah"];

const level12: UnitSoal[] = [
  { level: 12, title: "Membaca Teks Panjang", soal: [
    { id: "u67f", tipe: "pilihan_ganda", soal: "Bacalah teks berikut!\n'Minyak bumi berasal dari sisa tumbuhan dan hewan yang tertimbun selama jutaan tahun. Karena prosesnya sangat lama, minyak bumi disebut sumber daya yang tidak dapat diperbarui.'\nPernyataan yang sesuai dengan teks di atas: ...", opsi: ["Minyak bumi terbentuk dari sisa makhluk hidup yang tertimbun sangat lama.", "Minyak bumi dapat terbentuk hanya dalam beberapa hari.", "Minyak bumi termasuk sumber daya yang tidak ada habisnya.", "Minyak bumi dibuat manusia dari air laut."], jawaban: 0, penjelasan: "Teks menyebut minyak bumi berasal dari sisa makhluk hidup yang tertimbun jutaan tahun." },
    { id: "u67g", tipe: "pilihan_ganda", soal: "Cara tercepat menemukan tanggal peristiwa dalam artikel panjang adalah ...", opsi: ["memindai angka dan kata yang berkaitan dengan waktu", "menghafal seluruh isi artikel", "membaca halaman terakhir saja", "menebak secara acak"], jawaban: 0, penjelasan: "Memindai kata bertanggal adalah teknik scanning yang cepat dan tepat." },
    { id: "u67h", tipe: "pilihan_ganda", soal: "Saat membaca teks panjang, menandai kalimat utama setiap paragraf berguna untuk ...", opsi: ["menemukan gagasan utama dengan mudah", "memperlambat waktu membaca", "membuat teks bertambah panjang", "mengurangi pemahaman"], jawaban: 0, penjelasan: "Kalimat utama yang ditandai menjadi peta gagasan teks." },
    { id: "u67i", tipe: "benar_salah", soal: "Menebak arti kata dari konteks kalimat lebih cepat daripada langsung membuka kamus.", opsi: BS, jawaban: "Benar", penjelasan: "Menebak dari konteks hemat waktu, lalu kamus mengonfirmasi." },
    { id: "u67j", tipe: "isi_blank", soal: "Membaca dengan perlahan dan saksama untuk memahami seluruh isi disebut membaca ...", jawaban: "intensif", penjelasan: "Membaca intensif = membaca teliti sampai paham." },
  ]},
  { level: 12, title: "Menyunting Kalimat", soal: [
    { id: "u68f", tipe: "pilihan_ganda", soal: "Ejaan yang benar untuk: 'Rapat dimulai pukul 8.00 wib di ruang guru' adalah ...", opsi: ["Rapat dimulai pukul 08.00 WIB di ruang guru.", "Rapat dimulai pukul 08.00 WIB diruang guru.", "Rapat dimulai pukul 8 wib di ruang guru.", "Rapat dimulai pukul 08.00 wib di ruangguru."], jawaban: 0, penjelasan: "Waktu ditulis dua digit dan singkatan WIB memakai huruf kapital." },
    { id: "u68g", tipe: "pilihan_ganda", soal: "Kalimat yang sudah baku dan benar adalah ...", opsi: ["Mereka membaca buku di perpustakaan sekolah.", "Mereka membca buku di perpustakaan sekolah.", "Mereka membaca buku di pepustakaan sekolah.", "Mereka membaca buku diperpustakaan sekolah."], jawaban: 0, penjelasan: "Pilihan itu ejaan dan penulisannya sudah sesuai kaidah." },
    { id: "u68h", tipe: "pilihan_ganda", soal: "Saat menyunting struktur kalimat, yang diperiksa adalah ...", opsi: ["susunan subjek, predikat, objek, dan keterangan", "jenis tinta yang dipakai", "ketebalan kertas", "merek pulpen"], jawaban: 0, penjelasan: "Menyunting struktur berarti menata S-P-O-K agar runtut." },
    { id: "u68i", tipe: "benar_salah", soal: "'Kakak membeli obat di apotik.' Penulisan 'apotik' sudah sesuai kaidah baku.", opsi: BS, jawaban: "Salah", penjelasan: "Bentuk baku KBBI adalah 'apotek'." },
    { id: "u68j", tipe: "isi_blank", soal: "Suntingan untuk kata 'aktifitas' yang benar adalah ...", jawaban: "aktivitas", penjelasan: "Bentuk baku KBBI adalah 'aktivitas'." },
  ]},
  { level: 12, title: "Menulis Pendapat", soal: [
    { id: "u69f", tipe: "pilihan_ganda", soal: "Kalimat penutup yang tepat untuk tulisan berpendapat bahwa sampah plastik harus dikurangi: ...", opsi: ["Dengan demikian, pengurangan sampah plastik penting demi lingkungan yang sehat.", "Demikian cerita tentang kucing peliharaanku.", "Terima kasih sudah menonton video ini.", "Sampai jumpa di artikel berikutnya."], jawaban: 0, penjelasan: "Simpulan itu menegaskan kembali pendapat di awal tulisan." },
    { id: "u69g", tipe: "pilihan_ganda", soal: "Alasan yang paling kuat untuk mendukung pendapat 'membawa bekal ke sekolah itu baik': ...", opsi: ["Bekal dari rumah lebih sehat dan menghemat uang jajan.", "Karena teman-teman juga membawa bekal.", "Karena kata iklan di televisi begitu.", "Karena membawa bekal terlihat keren."], jawaban: 0, penjelasan: "Alasan itu berdampak nyata pada kesehatan dan keuangan." },
    { id: "u69h", tipe: "pilihan_ganda", soal: "Saat menyampaikan pendapat di depan kelas, sebaiknya kita ...", opsi: ["berbicara dengan jelas dan sopan", "mengejek pendapat yang berbeda", "berteriak agar didengar", "menyerang teman secara pribadi"], jawaban: 0, penjelasan: "Pendapat mudah diterima jika disampaikan dengan jelas dan santun." },
    { id: "u69i", tipe: "benar_salah", soal: "Pendapat tanpa alasan lebih meyakinkan daripada pendapat yang disertai bukti.", opsi: BS, jawaban: "Salah", penjelasan: "Alasan dan bukti justru membuat pendapat lebih meyakinkan." },
    { id: "u69j", tipe: "isi_blank", soal: "Kalimat penutup yang menegaskan kembali pendapat disebut kalimat ...", jawaban: "simpulan", penjelasan: "Simpulan menguatkan pendapat di bagian akhir tulisan." },
  ]},
  { level: 12, title: "Menyusun Argumen Ringan", soal: [
    { id: "u70f", tipe: "pilihan_ganda", soal: "Agar argumen meyakinkan, pendapat harus didukung oleh ...", opsi: ["alasan dan bukti yang kuat", "suara yang keras", "banyaknya teman yang setuju", "slogan yang menarik saja"], jawaban: 0, penjelasan: "Argumen yang kuat selalu ditopang alasan dan bukti." },
    { id: "u70g", tipe: "pilihan_ganda", soal: "Argumen paling kuat untuk usulan 'perpanjang jam buka perpustakaan': ...", opsi: ["Banyak siswa ingin membaca sepulang sekolah, tetapi perpustakaan sudah tutup.", "Perpustakaan itu bangunannya bagus.", "Karena kepala sekolah menyuruh begitu.", "Karena kata teman, perpustakaan itu keren."], jawaban: 0, penjelasan: "Alasan itu menunjukkan kebutuhan nyata yang harus dipenuhi." },
    { id: "u70h", tipe: "pilihan_ganda", soal: "Cara menolak usulan teman secara santun: ...", opsi: ["Maaf, aku belum sependapat karena waktunya berbenturan dengan jadwal latihan.", "Idemu tidak pernah masuk akal.", "Terserah, aku tidak mau dengar.", "Kalau kamu ngotot, kita bermusuhan."], jawaban: 0, penjelasan: "Menolak sambil memberi alasan tanpa menyerang pribadi." },
    { id: "u70i", tipe: "benar_salah", soal: "Argumen yang disertai contoh konkret lebih mudah diterima pendengar.", opsi: BS, jawaban: "Benar", penjelasan: "Contoh konkret membuat argumen lebih mudah dipahami." },
    { id: "u70j", tipe: "isi_blank", soal: "Dia rajin berlatih, ... ia berhasil memenangkan lomba. (konjungsi akibat)", jawaban: "sehingga", penjelasan: "'Sehingga' menyatakan akibat dari berlatih rajin." },
  ]},
  { level: 12, title: "Simulasi Tantangan Akhir", soal: [
    { id: "u71f", tipe: "pilihan_ganda", soal: "Deret kata yang semuanya BAKU adalah ...", opsi: ["jadwal, nasihat, karier, hakikat", "jadual, nasehat, karir, hakekat", "jadwal, nasehat, karier, hakekat", "jadual, nasihat, karir, hakikat"], jawaban: 0, penjelasan: "Keempatnya bentuk baku menurut KBBI." },
    { id: "u71g", tipe: "pilihan_ganda", soal: "Gagasan utama paragraf deduktif terletak di ...", opsi: ["awal paragraf", "tengah paragraf", "akhir paragraf", "bawah halaman"], jawaban: 0, penjelasan: "Paragraf deduktif menempatkan kalimat utama di awal." },
    { id: "u71h", tipe: "pilihan_ganda", soal: "Bentuk yang benar: 'Kakak ... surat untuk sahabatnya di luar kota.'", opsi: ["menulis", "nulis", "memulis", "menuliskannya"], jawaban: 0, penjelasan: "me- + tulis = menulis sesuai kaidah peluluhan." },
    { id: "u71i", tipe: "benar_salah", soal: "'Padi adalah merupakan makanan pokok sebagian besar rakyat Indonesia.' Kalimat tersebut menggunakan kata berlebihan.", opsi: BS, jawaban: "Benar", penjelasan: "'Adalah merupakan' tumpang tindih; cukup salah satu." },
    { id: "u71j", tipe: "isi_blank", soal: "Membuang kata yang tidak perlu membuat kalimat lebih ...", jawaban: "ringkas", penjelasan: "Kalimat yang dipangkas kata berlebihannya menjadi ringkas." },
  ]},
  { level: 12, title: "Final Review Jalur Cerdas", soal: [
    { id: "u72f", tipe: "pilihan_ganda", soal: "Kalimat efektif yang benar adalah ...", opsi: ["Karena hujan deras, pertandingan ditunda.", "Karena hujan deras, maka pertandingan ditunda.", "Dikarenakan karena hujan, pertandingan ditunda.", "Pertandingan ditunda karena, hujan."], jawaban: 0, penjelasan: "'Karena' dan 'maka' tidak boleh dipakai bersamaan dalam satu kalimat." },
    { id: "u72g", tipe: "pilihan_ganda", soal: "Konjungsi yang tepat: 'Ia menabung ... dapat membeli sepeda baru.'", opsi: ["agar", "tetapi", "ketika", "atau"], jawaban: 0, penjelasan: "'Agar' menyatakan tujuan menabung." },
    { id: "u72h", tipe: "pilihan_ganda", soal: "Kalimat yang merupakan FAKTA adalah ...", opsi: ["Stasiun cuaca mencatat suhu udara 23°C tadi pagi di Bogor.", "Sepertinya sore ini akan hujan lebat.", "Film itu pasti sangat seru.", "Mungkin besok cuacanya cerah."], jawaban: 0, penjelasan: "Catatan stasiun cuaca dapat diukur dan dibuktikan, sehingga termasuk fakta." },
    { id: "u72i", tipe: "benar_salah", soal: "'Atlit' dan 'apotik' adalah bentuk baku.", opsi: BS, jawaban: "Salah", penjelasan: "Bentuk bakunya adalah 'atlet' dan 'apotek'." },
    { id: "u72j", tipe: "isi_blank", soal: "Bentuk baku dari kata 'ijin' adalah ...", jawaban: "izin", penjelasan: "KBBI menuliskan bentuk baku 'izin'." },
  ]},
];

export default level12;
