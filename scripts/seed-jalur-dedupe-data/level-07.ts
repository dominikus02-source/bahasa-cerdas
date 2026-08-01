import type { UnitSoal } from "./types";

const BS: ["Benar", "Salah"] = ["Benar", "Salah"];

const level07: UnitSoal[] = [
  // ═══════════════ LEVEL 7 — Kata Penghubung ═══════════════
  { level: 7, title: "Kata Depan di, ke, dari", soal: [
    { id: "u37f", tipe: "pilihan_ganda", soal: "Penggunaan kata depan yang benar adalah ...", opsi: ["Paman bekerja di Jakarta.", "Paman bekerja ke Jakarta.", "Paman bekerja dari Jakarta.", "Paman bekerja pada dari Jakarta."], jawaban: 0, penjelasan: "Tempat berada memakai 'di' — ditulis terpisah." },
    { id: "u37g", tipe: "pilihan_ganda", soal: "'Kami pergi ... pantai pada liburan lalu.' Kata depan yang tepat: ...", opsi: ["di", "ke", "dari", "di dekat"], jawaban: 1, penjelasan: "Arah tujuan memakai 'ke'." },
    { id: "u37h", tipe: "pilihan_ganda", soal: "Kata depan 'di' yang benar ditulis terpisah adalah ...", opsi: ["di sana", "di beli", "dirumah", "diatas"], jawaban: 0, penjelasan: "'Di sana' kata depan + keterangan tempat; 'di beli' seharusnya 'dibeli' (imbuhan), 'dirumah' dan 'diatas' seharusnya terpisah." },
    { id: "u37i", tipe: "benar_salah", soal: "Kalimat 'Kado ini dari ayah' menggunakan kata depan yang benar.", opsi: BS, jawaban: "Benar", penjelasan: "'Dari' menyatakan asal dan ditulis terpisah." },
    { id: "u37j", tipe: "isi_blank", soal: "'Dia berjalan ... pasar tadi pagi.' Kata depan arah yang tepat: ...", jawaban: "ke", penjelasan: "Tujuan bergerak memakai 'ke'." },
  ]},
  { level: 7, title: "Konjungsi dan, tetapi, karena", soal: [
    { id: "u38f", tipe: "pilihan_ganda", soal: "'Hari ini cuaca cerah, ... kemarin hujan sepanjang hari.' Konjungsi yang tepat: ...", opsi: ["dan", "tetapi", "karena", "lalu"], jawaban: 1, penjelasan: "Dua keadaan berlawanan dihubungkan 'tetapi'." },
    { id: "u38g", tipe: "pilihan_ganda", soal: "'Ibu membeli sayur ... buah di pasar.' Konjungsi penambahan yang tepat: ...", opsi: ["dan", "tetapi", "karena", "sehingga"], jawaban: 0, penjelasan: "'Dan' menggabungkan dua benda yang sejalan." },
    { id: "u38h", tipe: "pilihan_ganda", soal: "'Aku tidak masuk sekolah ... sedang demam.' Konjungsi sebab yang tepat: ...", opsi: ["tetapi", "dan", "karena", "sehingga"], jawaban: 2, penjelasan: "'Karena' menyatakan alasan tidak masuk sekolah." },
    { id: "u38i", tipe: "benar_salah", soal: "Kalimat 'Meskipun hujan, kami tetap berlatih' memakai konjungsi yang menyatakan pertentangan.", opsi: BS, jawaban: "Benar", penjelasan: "'Meskipun' menyatakan pertentangan: hujan vs tetap berlatih." },
    { id: "u38j", tipe: "isi_blank", soal: "'Ayah membaca koran ... ibu menyiram bunga.' Konjungsi penambahan yang tepat: ...", jawaban: "dan", penjelasan: "Dua kegiatan sejajar digabung dengan 'dan'." },
  ]},
  { level: 7, title: "Urutan Waktu", soal: [
    { id: "u39f", tipe: "pilihan_ganda", soal: "Urutan kegiatan yang logis: (1) Mandi (2) Bangun tidur (3) Berangkat sekolah.", opsi: ["2-1-3", "1-2-3", "3-1-2", "2-3-1"], jawaban: 0, penjelasan: "Bangun dulu, lalu mandi, kemudian berangkat." },
    { id: "u39g", tipe: "pilihan_ganda", soal: "Kata 'sebelum' pada kalimat 'Sebelum berangkat sekolah, aku sarapan' menunjukkan hubungan ...", opsi: ["tempat", "waktu", "syarat", "pilihan"], jawaban: 1, penjelasan: "'Sebelum' menghubungkan dua peristiwa menurut waktu." },
    { id: "u39h", tipe: "pilihan_ganda", soal: "'... menyapu lantai, para siswa membersihkan meja guru.' Penanda urutan waktu yang tepat: ...", opsi: ["Sesudah", "Karena", "Meskipun", "Supaya"], jawaban: 0, penjelasan: "'Sesudah menyapu' menandai urutan: menyapu dulu, lalu membersihkan meja." },
    { id: "u39i", tipe: "benar_salah", soal: "Kata 'pertama-tama' menandai langkah awal dalam urutan.", opsi: BS, jawaban: "Benar", penjelasan: "'Pertama-tama' memperkenalkan langkah yang paling awal." },
    { id: "u39j", tipe: "isi_blank", soal: "'Adik mengerjakan PR ... mandi.' (kegiatan yang lebih dahulu) Kata penanda waktu yang tepat: ...", jawaban: "sebelum", penjelasan: "Mengerjakan PR terjadi lebih dulu daripada mandi, jadi 'sebelum'." },
  ]},
  { level: 7, title: "Sebab Akibat", soal: [
    { id: "u40f", tipe: "pilihan_ganda", soal: "Pada kalimat 'Karena jarang berolahraga, badan Rina mudah lelah', AKIBAT yang terjadi adalah ...", opsi: ["jarang berolahraga", "badan Rina mudah lelah", "Rina", "sering berolahraga"], jawaban: 1, penjelasan: "Sebabnya jarang berolahraga; akibatnya badan mudah lelah." },
    { id: "u40g", tipe: "pilihan_ganda", soal: "'... makanan tidak ditutup, lalat berkerumun di meja.' Konjungsi sebab di awal kalimat: ...", opsi: ["Maka", "Karena", "Tetapi", "Sehingga"], jawaban: 1, penjelasan: "'Karena' di awal menandai sebab (makanan tidak ditutup)." },
    { id: "u40h", tipe: "pilihan_ganda", soal: "Setelah hujan turun sangat deras sepanjang malam, akibat yang paling logis adalah ...", opsi: ["Jalanan tergenang air.", "Matahari bersinar terang.", "Burung berkicau riang.", "Debu beterbangan."], jawaban: 0, penjelasan: "Hujan deras semalaman membuat jalanan tergenang." },
    { id: "u40i", tipe: "benar_salah", soal: "Kata 'maka' pada kalimat 'Aku bangun kesiangan, maka aku bergegas ke sekolah' menandai akibat.", opsi: BS, jawaban: "Benar", penjelasan: "'Maka' menghubungkan sebab (bangun kesiangan) dengan akibatnya." },
    { id: "u40j", tipe: "isi_blank", soal: "'Karena tidak mengerjakan tugas, Doni ... oleh guru.' (kata: dim...) Jawaban: ...", jawaban: "dimarahi", penjelasan: "Akibat tidak mengerjakan tugas adalah dimarahi guru." },
  ]},
  { level: 7, title: "Menggabungkan Kalimat", soal: [
    { id: "u41f", tipe: "pilihan_ganda", soal: "Gabungan terbaik untuk 'Lina pandai matematika' dan 'Lina lemah dalam olahraga' adalah ...", opsi: ["Lina pandai matematika tetapi lemah dalam olahraga.", "Lina pandai matematika dan lemah dalam olahraga.", "Lina pandai matematika karena lemah dalam olahraga.", "Lina pandai olahraga dan lemah dalam matematika."], jawaban: 0, penjelasan: "Dua hal berlawanan digabung dengan 'tetapi'." },
    { id: "u41g", tipe: "pilihan_ganda", soal: "Gabungan tepat untuk 'Aku menyiram tanaman' dan 'Tanaman itu tumbuh subur' adalah ...", opsi: ["Aku menyiram tanaman sehingga tanaman itu tumbuh subur.", "Aku menyiram tanaman tetapi tanaman itu tumbuh subur.", "Aku menyiram tanaman atau tanaman itu tumbuh subur.", "Karena tanaman tumbuh subur, aku menyiramnya."], jawaban: 0, penjelasan: "Menyiram → tumbuh subur; akibat dihubungkan 'sehingga'." },
    { id: "u41h", tipe: "pilihan_ganda", soal: "Kalimat gabungan yang paling tepat dan benar adalah ...", opsi: ["Dia tidak datang karena sakit.", "Dia tidak datang tetapi sakit.", "Dia tidak datang dan sakit.", "Dia tidak datang, sakit."], jawaban: 0, penjelasan: "Sebab (sakit) menjelaskan 'tidak datang' dengan 'karena'." },
    { id: "u41i", tipe: "benar_salah", soal: "Dua kalimat pendek selalu lebih baik daripada satu kalimat gabungan.", opsi: BS, jawaban: "Salah", penjelasan: "Kalimat gabungan yang tepat membuat tulisan runtut dan tidak boros." },
    { id: "u41j", tipe: "isi_blank", soal: "'Budi rajin menabung ... ia dapat membeli sepeda baru.' Konjungsi akibat yang tepat: ...", jawaban: "sehingga", penjelasan: "'Sehingga' menandai hasil dari menabung." },
  ]},
  { level: 7, title: "Latihan Cepat Level 7", soal: [
    { id: "u42f", tipe: "pilihan_ganda", soal: "'Rak buku itu terbuat ... kayu jati.' Kata depan yang tepat: ...", opsi: ["di", "ke", "dari", "pada"], jawaban: 2, penjelasan: "Bahan pembuatan memakai 'dari'." },
    { id: "u42g", tipe: "pilihan_ganda", soal: "'Dia membuka pintu ... menyalakan lampu.' Konjungsi urutan yang tepat: ...", opsi: ["karena", "tetapi", "lalu", "atau"], jawaban: 2, penjelasan: "'Lalu' menandai peristiwa berikutnya." },
    { id: "u42h", tipe: "pilihan_ganda", soal: "Pada kalimat 'Karena rajin menabung, ia bisa membeli sepeda', yang menjadi AKIBAT adalah ...", opsi: ["rajin menabung", "bisa membeli sepeda", "ia", "menabung"], jawaban: 1, penjelasan: "Sebabnya rajin menabung; akibatnya bisa membeli sepeda." },
    { id: "u42i", tipe: "benar_salah", soal: "'Di-' pada kata 'ditulis' adalah imbuhan sehingga ditulis serangkai.", opsi: BS, jawaban: "Benar", penjelasan: "'Ditulis' kata kerja pasif — imbuhan 'di-' melekat pada kata dasar." },
    { id: "u42j", tipe: "isi_blank", soal: "'Mereka tidak jadi piknik ... hujan turun deras.' Konjungsi sebab yang tepat: ...", jawaban: "karena", penjelasan: "'Karena' menyatakan alasan piknik batal." },
  ]},
];

export default level07;
