import type { UnitSoal } from "./types";

const BS: ["Benar", "Salah"] = ["Benar", "Salah"];

const level04: UnitSoal[] = [
  // ═══════════════ LEVEL 4 — Makna Kata (SD kelas menengah) ═══════════════
  { level: 4, title: "Sinonim", soal: [
    { id: "u19f", tipe: "pilihan_ganda", soal: "Sinonim kata 'sukar' adalah ...", opsi: ["mudah", "sulit", "ringan", "lebar"], jawaban: 1, penjelasan: "Sukar = sulit; lawannya mudah." },
    { id: "u19g", tipe: "pilihan_ganda", soal: "Kata yang bersinonim dengan 'rajin' adalah ...", opsi: ["malas", "tekun", "lambat", "nakal"], jawaban: 1, penjelasan: "Rajin = tekun = giat." },
    { id: "u19h", tipe: "pilihan_ganda", soal: "'Adik terkejut mendengar suara itu.' Sinonim 'terkejut' adalah ...", opsi: ["tertidur", "kaget", "marah", "tertawa"], jawaban: 1, penjelasan: "Terkejut = kaget." },
    { id: "u19i", tipe: "benar_salah", soal: "Kata 'tampan' dan 'ganteng' adalah kata yang bersinonim.", opsi: BS, jawaban: "Benar", penjelasan: "Keduanya menyatakan paras laki-laki yang rupawan." },
    { id: "u19j", tipe: "isi_blank", soal: "Sinonim kata 'haus' adalah da...", jawaban: "dahaga", penjelasan: "Haus = dahaga." },
  ]},
  { level: 4, title: "Antonim", soal: [
    { id: "u20f", tipe: "pilihan_ganda", soal: "Antonim kata 'panjang' adalah ...", opsi: ["jauh", "pendek", "lebar", "besar"], jawaban: 1, penjelasan: "Lawan panjang adalah pendek." },
    { id: "u20g", tipe: "pilihan_ganda", soal: "Lawan kata 'naik' adalah ...", opsi: ["terbang", "turun", "jalan", "melompat"], jawaban: 1, penjelasan: "Naik >< turun." },
    { id: "u20h", tipe: "pilihan_ganda", soal: "Pasangan antonim yang TEPAT adalah ...", opsi: ["menangis–tertawa", "menangis–sedih", "sedih–duka", "tertawa–gembira"], jawaban: 0, penjelasan: "Menangis >< tertawa; pasangan lain justru bersinonim." },
    { id: "u20i", tipe: "benar_salah", soal: "Antonim kata 'kotor' adalah 'bersih'.", opsi: BS, jawaban: "Benar", penjelasan: "Kotor >< bersih." },
    { id: "u20j", tipe: "isi_blank", soal: "Antonim kata 'hemat' adalah ...", jawaban: "boros", penjelasan: "Hemat >< boros." },
  ]},
  { level: 4, title: "Homonim Sederhana", soal: [
    { id: "u21f", tipe: "pilihan_ganda", soal: "Kata 'mata' pada 'mata pisau' berarti ...", opsi: ["organ penglihatan", "bagian tajam pada pisau", "mata uang", "mata pelajaran"], jawaban: 1, penjelasan: "'Mata pisau' adalah bagian tajam pisau — homonim dari 'mata' organ tubuh." },
    { id: "u21g", tipe: "pilihan_ganda", soal: "Kalimat yang memakai 'paku' sebagai tumbuhan adalah ...", opsi: ["Pasanglah paku itu di dinding.", "Paku di tepi kolam itu berdaun hijau.", "Paku besi itu sudah berkarat.", "Ambilkan palu dan paku itu."], jawaban: 1, penjelasan: "Paku (pakis) di tepi kolam adalah tumbuhan; kalimat lain memakai paku besi." },
    { id: "u21h", tipe: "pilihan_ganda", soal: "Kata 'kunci' pada 'kunci jawaban' berarti ...", opsi: ["alat pembuka pintu", "jawaban yang benar dari suatu soal", "tempat menggantung kunci", "lubang kunci"], jawaban: 1, penjelasan: "'Kunci jawaban' berarti jawaban benar — homonim dengan alat pembuka pintu." },
    { id: "u21i", tipe: "benar_salah", soal: "Kata 'halaman' bisa berarti pekarangan rumah dan bisa berarti bagian dari buku.", opsi: BS, jawaban: "Benar", penjelasan: "Halaman rumah = pekarangan; halaman buku = lembaran berisi tulisan." },
    { id: "u21j", tipe: "isi_blank", soal: "Pada 'Saya tahu jawabannya', kata 'tahu' berarti pa...", jawaban: "paham", penjelasan: "'Tahu' di sini berarti paham/mengerti, homonim dengan tahu (makanan dari kedelai)." },
  ]},
  { level: 4, title: "Makna Denotatif dan Konotatif", soal: [
    { id: "u22f", tipe: "pilihan_ganda", soal: "'Sari dijuluki bunga desa.' Kata 'bunga desa' bermakna ...", opsi: ["bunga yang tumbuh di desa", "gadis tercantik di desa", "toko bunga di desa", "bunga hias di desa"], jawaban: 1, penjelasan: "'Bunga desa' berkonotasi gadis tercantik di desa." },
    { id: "u22g", tipe: "pilihan_ganda", soal: "Kalimat yang memakai makna KONOTATIF adalah ...", opsi: ["Budi menendang bola di lapangan.", "Dia menjadi bintang lapangan.", "Matahari bersinar terang.", "Adik minum air putih."], jawaban: 1, penjelasan: "'Bintang lapangan' berarti pemain terbaik — makna kiasan/konotatif." },
    { id: "u22h", tipe: "pilihan_ganda", soal: "'Ia jadi kambing hitam atas kejadian itu.' Kata 'kambing hitam' bermakna ...", opsi: ["kambing berwarna hitam", "orang yang disalahkan", "hewan peliharaan", "penjual kambing"], jawaban: 1, penjelasan: "'Kambing hitam' = orang yang disalahkan (makna konotatif)." },
    { id: "u22i", tipe: "benar_salah", soal: "Kalimat 'Adik menanam bunga di taman' memakai makna denotatif.", opsi: BS, jawaban: "Benar", penjelasan: "Bunga di sini bermakna sebenarnya, bukan kiasan." },
    { id: "u22j", tipe: "isi_blank", soal: "Orang yang sombong dan merasa paling hebat disebut ... kepala.", jawaban: "besar", penjelasan: "'Besar kepala' = sombong (makna konotatif)." },
  ]},
  { level: 4, title: "Kosakata dalam Konteks", soal: [
    { id: "u23f", tipe: "pilihan_ganda", soal: "'Petani ... padi di sawah pada musim hujan.' Kata paling tepat: ...", opsi: ["menanam", "menjual", "memasak", "membaca"], jawaban: 0, penjelasan: "Petani menanam padi di sawah." },
    { id: "u23g", tipe: "pilihan_ganda", soal: "'Angin ... membuat daun-daun berguguran.' Kata paling tepat: ...", opsi: ["berhenti", "bertiup", "memasak", "menari"], jawaban: 1, penjelasan: "Angin bertiup sehingga daun-daun berguguran." },
    { id: "u23h", tipe: "pilihan_ganda", soal: "'Adik ... karena mainan kesayangannya hilang.' Kata paling tepat: ...", opsi: ["tertawa", "menangis", "bernyanyi", "tertidur"], jawaban: 1, penjelasan: "Kehilangan mainan kesayangan membuat adik menangis." },
    { id: "u23i", tipe: "benar_salah", soal: "Kalimat 'Guru itu membimbing siswanya dengan sabar' memakai kata yang tepat untuk konteksnya.", opsi: BS, jawaban: "Benar", penjelasan: "'Membimbing' adalah kata yang tepat untuk peran guru terhadap siswa." },
    { id: "u23j", tipe: "isi_blank", soal: "Sebelum berangkat, Ibu ... pintu rumah. Kata kerja yang tepat: me- + kunci = ...", jawaban: "mengunci", penjelasan: "me- + kunci → mengunci (k luluh)." },
  ]},
  { level: 4, title: "Latihan Cepat Level 4", soal: [
    { id: "u24f", tipe: "pilihan_ganda", soal: "Sinonim kata 'tampan' adalah ...", opsi: ["jelek", "ganteng", "pendek", "tua"], jawaban: 1, penjelasan: "Tampan = ganteng." },
    { id: "u24g", tipe: "pilihan_ganda", soal: "Antonim kata 'rapi' adalah ...", opsi: ["bersih", "berantakan", "indah", "teratur"], jawaban: 1, penjelasan: "Rapi >< berantakan." },
    { id: "u24h", tipe: "pilihan_ganda", soal: "'Kepala sekolah' memakai kata 'kepala' yang berarti ...", opsi: ["bagian tubuh manusia", "pemimpin suatu lembaga", "bagian atas benda", "bagian kaki"], jawaban: 1, penjelasan: "'Kepala sekolah' = pemimpin sekolah, homonim dari 'kepala' bagian tubuh." },
    { id: "u24i", tipe: "benar_salah", soal: "Kalimat 'Rumah itu dijual dengan harga murah' memakai makna denotatif.", opsi: BS, jawaban: "Benar", penjelasan: "'Murah' di sini bermakna sebenarnya, yaitu harga yang tidak tinggi." },
    { id: "u24j", tipe: "isi_blank", soal: "Kasir ... total belanja pembeli dengan cermat. Kata kerja yang tepat: me- + hitung = ...", jawaban: "menghitung", penjelasan: "me- + hitung → menghitung." },
  ]},
];

export default level04;
