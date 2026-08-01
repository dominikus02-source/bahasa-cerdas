import type { UnitSoal } from "./types";

const BS: ["Benar", "Salah"] = ["Benar", "Salah"];

const level10: UnitSoal[] = [
  { level: 10, title: "Fakta dan Opini", soal: [
    { id: "u55f", tipe: "pilihan_ganda", soal: "Kalimat FAKTA berikut adalah ...", opsi: ["Terdapat 34 provinsi di Indonesia saat ini.", "Guru kami adalah guru terbaik di seluruh dunia.", "Sepertinya pertandingan itu sangat seru.", "Warna kesukaanku paling indah."], jawaban: 0, penjelasan: "Jumlah provinsi dapat diverifikasi; yang lain adalah penilaian subjektif." },
    { id: "u55g", tipe: "pilihan_ganda", soal: "'Bu Rina menjelaskan bahwa kerajinan dari barang bekas dapat dijual dua kali lipat harga modal. Sari menilai ide itu paling cemerlang.' Pernyataan OPINI dalam teks itu: ...", opsi: ["ide itu paling cemerlang", "kerajinan dijual dua kali lipat harga modal", "Bu Rina menjelaskan di rapat", "bahan yang dipakai barang bekas"], jawaban: 0, penjelasan: "'Paling cemerlang' adalah penilaian pribadi Sari, bukan fakta." },
    { id: "u55h", tipe: "pilihan_ganda", soal: "Kalimat yang termasuk OPINI adalah ...", opsi: ["SD Harapan memiliki 600 siswa.", "Menurutku, lagu ini sangat indah.", "Indonesia merdeka pada tahun 1945.", "Bulan mengelilingi bumi."], jawaban: 1, penjelasan: "Kata 'menurutku' dan 'sangat indah' menunjukkan pendapat pribadi." },
    { id: "u55i", tipe: "benar_salah", soal: "Kalimat 'Permen ini rasanya paling enak di dunia' adalah opini karena menyangkut selera pribadi.", opsi: BS, jawaban: "Benar", penjelasan: "Rasa enak bersifat subjektif sehingga tidak dapat dibuktikan." },
    { id: "u55j", tipe: "isi_blank", soal: "Pernyataan subjektif yang berisi penilaian pribadi disebut ...", jawaban: "opini", penjelasan: "Opini memuat pandangan atau selera pribadi." },
  ]},
  { level: 10, title: "Alasan dan Bukti", soal: [
    { id: "u56f", tipe: "pilihan_ganda", soal: "'Kita harus berangkat pagi agar tidak terlambat ke sekolah. Jika berangkat siang, jalanan sudah macet.' Alasan yang mendukung pendapat itu: ...", opsi: ["jika berangkat siang, jalanan sudah macet", "terlambat sekolah itu hal biasa", "berangkat pagi tidak penting", "macet membuat perjalanan seru"], jawaban: 0, penjelasan: "Kalimat kedua memberikan alasan mengapa harus berangkat pagi." },
    { id: "u56g", tipe: "pilihan_ganda", soal: "Untuk membuktikan bahwa 'siswa yang sarapan lebih fokus di kelas', bukti yang paling meyakinkan adalah ...", opsi: ["data nilai siswa yang rutin sarapan dibandingkan yang tidak", "cerita pengalaman pribadi", "perkataan seorang teman", "iklan susu di televisi"], jawaban: 0, penjelasan: "Data perbandingan dua kelompok lebih kuat daripada kesan pribadi." },
    { id: "u56h", tipe: "pilihan_ganda", soal: "'Sebaiknya kita menanam pohon di sekitar sekolah karena ...' Alasan yang paling sesuai untuk melengkapi kalimat itu: ...", opsi: ["pohon membuat udara lebih sejuk dan teduh", "menanam pohon menghabiskan banyak uang", "pohon membuat lapangan menjadi penuh", "pekerjaan menanam itu melelahkan"], jawaban: 0, penjelasan: "Manfaat sejuk dan teduh adalah alasan yang mendukung usulan menanam pohon." },
    { id: "u56i", tipe: "benar_salah", soal: "Bukti yang baik harus dapat diperiksa atau diuji kebenarannya.", opsi: BS, jawaban: "Benar", penjelasan: "Bukti yang kuat bersifat dapat diverifikasi atau dicek." },
    { id: "u56j", tipe: "isi_blank", soal: "Data, fakta, atau hasil pengamatan yang menguatkan pendapat disebut ...", jawaban: "bukti", penjelasan: "Bukti memperkuat kebenaran sebuah pendapat." },
  ]},
  { level: 10, title: "Sebab dan Akibat", soal: [
    { id: "u57f", tipe: "pilihan_ganda", soal: "'Petani di desa itu gagal panen karena musim kemarau panjang.' SEBAB dari peristiwa itu: ...", opsi: ["musim kemarau panjang", "gagal panen", "harga padi naik", "sawah menjadi subur"], jawaban: 0, penjelasan: "Kata 'karena' menandai sebab, yaitu musim kemarau panjang." },
    { id: "u57g", tipe: "pilihan_ganda", soal: "'Adik menangis karena mainannya diambil kakak.' AKIBAT dari peristiwa itu: ...", opsi: ["adik menangis", "mainan diambil kakak", "kakak bermain bola", "mainan menjadi rusak"], jawaban: 0, penjelasan: "Penyebabnya mainan diambil kakak; akibatnya adik menangis." },
    { id: "u57h", tipe: "pilihan_ganda", soal: "'Karena rajin berlatih setiap hari, Dina ... dalam lomba menulis.' Kata yang tepat untuk melengkapi kalimat itu: ...", opsi: ["berhasil juara", "gagal total", "menyerah di tengah jalan", "batal mengikuti lomba"], jawaban: 0, penjelasan: "Rajin berlatih menghasilkan keberhasilan, yaitu berhasil juara." },
    { id: "u57i", tipe: "benar_salah", soal: "Dalam kalimat 'Saya makan karena lapar', lapar adalah sebab dan makan adalah akibat.", opsi: BS, jawaban: "Benar", penjelasan: "Lapar menyebabkan orang makan." },
    { id: "u57j", tipe: "isi_blank", soal: "'Dia belajar sungguh-sungguh, ... nilainya bagus.' Kata hubung yang tepat: ...", jawaban: "sehingga", penjelasan: "'Sehingga' menandai akibat, yaitu nilai yang bagus." },
  ]},
  { level: 10, title: "Membandingkan Informasi", soal: [
    { id: "u58f", tipe: "pilihan_ganda", soal: "'Waktu istirahat di SD Melati 30 menit, sedangkan di SD Cemara 45 menit.' Simpulan perbandingan yang tepat: ...", opsi: ["waktu istirahat SD Cemara lebih lama", "waktu istirahat SD Melati lebih lama", "waktu istirahat keduanya sama", "tidak ada informasi tentang waktu istirahat"], jawaban: 0, penjelasan: "45 menit lebih lama daripada 30 menit." },
    { id: "u58g", tipe: "pilihan_ganda", soal: "'Teks 1: Sungai itu keruh karena limbah pabrik. Teks 2: Sungai itu keruh karena sampah rumah tangga.' Persamaan kedua teks itu adalah ...", opsi: ["sama-sama membahas pencemaran sungai", "sama-sama menyalahkan hujan", "sama-sama memuji kondisi sungai", "sama-sama membahas danau"], jawaban: 0, penjelasan: "Keduanya membahas sungai yang tercemar; bedanya sumber pencemarnya." },
    { id: "u58h", tipe: "pilihan_ganda", soal: "'Sepeda di Toko Jaya dijual Rp850.000, sedangkan di Toko Makmur Rp800.000.' Pernyataan yang benar: ...", opsi: ["sepeda di Toko Makmur lebih murah", "sepeda di Toko Jaya lebih murah", "harga keduanya sama", "kedua toko tidak menjual sepeda"], jawaban: 0, penjelasan: "Rp800.000 lebih rendah daripada Rp850.000." },
    { id: "u58i", tipe: "benar_salah", soal: "Untuk membandingkan dua berita tentang peristiwa yang sama, kita harus membaca kedua berita itu terlebih dahulu.", opsi: BS, jawaban: "Benar", penjelasan: "Perbandingan hanya dapat dibuat setelah kedua sumber dibaca." },
    { id: "u58j", tipe: "isi_blank", soal: "Mencari persamaan dan ... dari dua hal disebut membandingkan.", jawaban: "perbedaan", penjelasan: "Membandingkan meliputi mencari persamaan dan perbedaan." },
  ]},
  { level: 10, title: "Menilai Pernyataan", soal: [
    { id: "u59f", tipe: "pilihan_ganda", soal: "'Katanya, makan nasi bisa membuat rambut cepat tumbuh.' Penilaian yang paling tepat atas pernyataan itu: ...", opsi: ["perlu diverifikasi dengan sumber yang dapat dipercaya", "pasti benar karena banyak orang yang berkata", "pasti salah total tanpa pengecualian", "benar tanpa perlu dibuktikan"], jawaban: 0, penjelasan: "Klaim kesehatan harus dicek ke sumber terpercaya, bukan sekadar kabar." },
    { id: "u59g", tipe: "pilihan_ganda", soal: "'Cukup minum air putih, tubuh kita sehat tanpa perlu berolahraga.' Penilaian yang tepat atas pernyataan itu: ...", opsi: ["pernyataan itu belum sepenuhnya benar", "pernyataan itu pasti benar", "air putih berbahaya bagi tubuh", "olahraga tidak diperlukan siapa pun"], jawaban: 0, penjelasan: "Kesehatan dipengaruhi banyak faktor sehingga klaim itu perlu diuji dan tidak lengkap." },
    { id: "u59h", tipe: "pilihan_ganda", soal: "Sumber yang paling dapat dipercaya untuk klaim 'harga beras naik' adalah ...", opsi: ["laporan resmi dari lembaga pemerintah", "akun media sosial anonim", "gosip di pasar", "pesan berantai di grup"], jawaban: 0, penjelasan: "Data dari lembaga resmi lebih dapat dipercaya daripada kabar yang tidak jelas." },
    { id: "u59i", tipe: "benar_salah", soal: "Pernyataan yang disertai data dan rujukan resmi lebih layak dipercaya.", opsi: BS, jawaban: "Benar", penjelasan: "Data dan rujukan resmi menambah kredibilitas sebuah pernyataan." },
    { id: "u59j", tipe: "isi_blank", soal: "Sebelum memercayai sebuah kabar, kita perlu memeriksa ... beritanya.", jawaban: "sumber", penjelasan: "Memeriksa sumber membantu menilai kebenaran sebuah berita." },
  ]},
  { level: 10, title: "Latihan Cepat Level 10", soal: [
    { id: "u60f", tipe: "pilihan_ganda", soal: "'Tercatat 200 titik banjir di Kota B selama tahun ini.' Kalimat itu termasuk ...", opsi: ["fakta", "opini", "saran", "perintah"], jawaban: 0, penjelasan: "Angka yang tercatat membuat kalimat itu dapat diverifikasi — fakta." },
    { id: "u60g", tipe: "pilihan_ganda", soal: "'Karena tidak sarapan, Raka merasa pusing di kelas.' SEBAB dari kejadian itu: ...", opsi: ["tidak sarapan", "pusing di kelas", "berangkat pagi", "belajar rajin"], jawaban: 0, penjelasan: "Kata 'karena' menandai sebab, yaitu tidak sarapan." },
    { id: "u60h", tipe: "pilihan_ganda", soal: "'Nilai rata-rata Matematika kelas 6A adalah 82, sedangkan kelas 6B adalah 78.' Simpulan yang tepat: ...", opsi: ["nilai rata-rata kelas 6A lebih tinggi", "nilai rata-rata kelas 6B lebih tinggi", "nilai rata-rata keduanya sama", "keduanya tidak mendapat nilai"], jawaban: 0, penjelasan: "82 lebih besar daripada 78." },
    { id: "u60i", tipe: "benar_salah", soal: "Klaim yang tidak disertai bukti sebaiknya diragukan dahulu.", opsi: BS, jawaban: "Benar", penjelasan: "Tanpa bukti, kebenaran sebuah klaim belum dapat dipastikan." },
    { id: "u60j", tipe: "isi_blank", soal: "'Hujan deras ... banjir di kampung itu.' Kata hubung yang tepat: ...", jawaban: "menyebabkan", penjelasan: "'Menyebabkan' menghubungkan sebab (hujan deras) dan akibat (banjir)." },
  ]},
];

export default level10;
