import type { UnitSoal } from "./types";

const BS: ["Benar", "Salah"] = ["Benar", "Salah"];

const level03: UnitSoal[] = [
  // ═══════════════ LEVEL 3 — Kata Baku (SD kelas menengah) ═══════════════
  { level: 3, title: "Kata Baku dan Tidak Baku", soal: [
    { id: "u13f", tipe: "pilihan_ganda", soal: "Kata baku dari 'jadual' adalah ...", opsi: ["jadwal", "jadual", "jaduwal", "jadweil"], jawaban: 0, penjelasan: "KBBI mencatat bentuk baku 'jadwal', bukan 'jadual'." },
    { id: "u13g", tipe: "pilihan_ganda", soal: "Manakah yang merupakan kata baku?", opsi: ["kwalitas", "kualitas", "kwalitet", "kwality"], jawaban: 1, penjelasan: "Bentuk baku menurut KBBI: kualitas." },
    { id: "u13h", tipe: "pilihan_ganda", soal: "Bentuk baku dari 'hutang' adalah ...", opsi: ["hutang", "utang", "huttang", "uttang"], jawaban: 1, penjelasan: "Bentuk baku adalah 'utang', bukan 'hutang'." },
    { id: "u13i", tipe: "benar_salah", soal: "Kata 'isteri' adalah bentuk baku, sedangkan 'istri' tidak baku.", opsi: BS, jawaban: "Salah", penjelasan: "Kebalikannya: yang baku adalah 'istri', sedangkan 'isteri' tidak baku." },
    { id: "u13j", tipe: "isi_blank", soal: "Bentuk baku dari 'nomer' adalah ...", jawaban: "nomor", penjelasan: "KBBI mencatat bentuk baku 'nomor', bukan 'nomer'." },
  ]},
  { level: 3, title: "Kata Serapan Umum", soal: [
    { id: "u14f", tipe: "pilihan_ganda", soal: "Bentuk baku dari 'karir' adalah ...", opsi: ["karier", "karir", "karierr", "karirr"], jawaban: 0, penjelasan: "KBBI mencatat bentuk baku 'karier' (dari career)." },
    { id: "u14g", tipe: "pilihan_ganda", soal: "Kata serapan yang penulisannya benar adalah ...", opsi: ["raport", "rapor", "rapport", "raportt"], jawaban: 1, penjelasan: "Bentuk baku: rapor (diserap dari bahasa Belanda rapport)." },
    { id: "u14h", tipe: "pilihan_ganda", soal: "Kata serapan dari 'score' yang ditulis baku adalah ...", opsi: ["skor", "score", "skore", "sekor"], jawaban: 0, penjelasan: "'Score' diserap menjadi bentuk baku 'skor'." },
    { id: "u14i", tipe: "benar_salah", soal: "Kata 'kamera' adalah kata serapan yang sudah baku.", opsi: BS, jawaban: "Benar", penjelasan: "'Kamera' (dari camera) adalah bentuk serapan yang baku." },
    { id: "u14j", tipe: "isi_blank", soal: "Bentuk baku dari 'komplek' adalah ...", jawaban: "kompleks", penjelasan: "KBBI mencatat bentuk baku 'kompleks', bukan 'komplek'." },
  ]},
  { level: 3, title: "Kesalahan Kata Sehari-hari", soal: [
    { id: "u15f", tipe: "pilihan_ganda", soal: "Kata yang sering salah tulis, bentuk BENAR adalah ...", opsi: ["cabe", "cabai", "cabey", "cabbai"], jawaban: 1, penjelasan: "Bentuk baku: cabai, bukan 'cabe'." },
    { id: "u15g", tipe: "pilihan_ganda", soal: "Pilih bentuk yang benar: ...", opsi: ["napas", "nafas", "naphas", "nefas"], jawaban: 0, penjelasan: "KBBI mencatat bentuk baku 'napas'." },
    { id: "u15h", tipe: "pilihan_ganda", soal: "Bentuk baku dari 'mesjid' adalah ...", opsi: ["masjid", "mesjid", "mesjied", "maesjid"], jawaban: 0, penjelasan: "Bentuk baku menurut KBBI: masjid." },
    { id: "u15i", tipe: "benar_salah", soal: "Kata 'kedaluwarsa' adalah bentuk baku.", opsi: BS, jawaban: "Benar", penjelasan: "KBBI mencatat 'kedaluwarsa' (bukan 'kadaluarsa')." },
    { id: "u15j", tipe: "isi_blank", soal: "Bentuk baku dari 'ijasah' adalah ...", jawaban: "ijazah", penjelasan: "KBBI mencatat bentuk baku 'ijazah'." },
  ]},
  { level: 3, title: "Memilih Kata yang Tepat", soal: [
    { id: "u16f", tipe: "pilihan_ganda", soal: "'Sapi itu sedang ... rumput di padang.' Kata paling tepat: ...", opsi: ["meminum", "memakan", "membaca", "memandang"], jawaban: 1, penjelasan: "Sapi memakan rumput di padang." },
    { id: "u16g", tipe: "pilihan_ganda", soal: "'Para penonton ... tepuk tangan saat artis tampil.' Kata paling tepat: ...", opsi: ["bertepuk", "berbisik", "melukis", "mencuci"], jawaban: 0, penjelasan: "Penonton bertepuk tangan untuk merayakan penampilan artis." },
    { id: "u16h", tipe: "pilihan_ganda", soal: "'Ibu ... sayur dan buah di pasar.' Kata paling tepat: ...", opsi: ["menjual", "membeli", "menanam", "menggambar"], jawaban: 1, penjelasan: "Orang yang pergi ke pasar untuk mendapat barang berarti membeli." },
    { id: "u16i", tipe: "benar_salah", soal: "Kalimat 'Burung terbang menggunakan sayap' memakai kata yang tepat.", opsi: BS, jawaban: "Benar", penjelasan: "Burung terbang dengan sayapnya — kata 'terbang' dan 'sayap' cocok dipakai bersama." },
    { id: "u16j", tipe: "isi_blank", soal: "'Matahari ... dari ufuk timur setiap pagi.' Kata yang tepat: te...", jawaban: "terbit", penjelasan: "Matahari terbit = muncul di pagi hari." },
  ]},
  { level: 3, title: "Perbaiki Kata dalam Kalimat", soal: [
    { id: "u17f", tipe: "pilihan_ganda", soal: "Kalimat 'Ia mengkonsumsi obat itu' memakai kata tidak baku. Bentuk yang benar: ...", opsi: ["mengonsumsi", "mengkonsumsi", "mengkonumsi", "mengonsumsikan"], jawaban: 0, penjelasan: "me- + konsumsi → mengonsumsi (k luluh)." },
    { id: "u17g", tipe: "pilihan_ganda", soal: "Kalimat 'Kami mensukseskan acara itu' perlu diperbaiki menjadi ...", opsi: ["menyukseskan", "mensukseskan", "menyuksekskan", "mensuksekskan"], jawaban: 0, penjelasan: "me- + sukses → menyukseskan (s luluh)." },
    { id: "u17h", tipe: "pilihan_ganda", soal: "Perbaikan kata 'menelpon' yang baku adalah ...", opsi: ["menelepon", "menelpon", "menelphone", "menelephone"], jawaban: 0, penjelasan: "Bentuk baku: menelepon (dari telepon)." },
    { id: "u17i", tipe: "benar_salah", soal: "Kalimat 'Mereka berunding tentang rencana itu' sudah memakai kata yang baku.", opsi: BS, jawaban: "Benar", penjelasan: "'Berunding' adalah bentuk baku yang berarti membicarakan bersama." },
    { id: "u17j", tipe: "isi_blank", soal: "Dalam kalimat 'Para siswa ... tugas itu', kata kerja yang benar adalah me- + kerja + -kan = ...", jawaban: "mengerjakan", penjelasan: "me- + kerja + -kan → mengerjakan (k luluh)." },
  ]},
  { level: 3, title: "Latihan Cepat Level 3", soal: [
    { id: "u18f", tipe: "pilihan_ganda", soal: "Deret kata yang SEMUANYA baku adalah ...", opsi: ["karier, rapor, utang", "karir, rapor, utang", "karier, raport, utang", "karir, raport, hutang"], jawaban: 0, penjelasan: "Karier, rapor, dan utang adalah bentuk-bentuk baku." },
    { id: "u18g", tipe: "pilihan_ganda", soal: "Bentuk baku dari 'komplek' adalah ...", opsi: ["kompleks", "komplek", "complex", "komplex"], jawaban: 0, penjelasan: "KBBI mencatat bentuk baku 'kompleks'." },
    { id: "u18h", tipe: "pilihan_ganda", soal: "'Dokter ... obat kepada pasiennya.' Kata paling tepat: ...", opsi: ["memberi", "membeli", "menjual", "memakan"], jawaban: 0, penjelasan: "Dokter memberi obat kepada pasiennya." },
    { id: "u18i", tipe: "benar_salah", soal: "Kalimat 'Kami sudah meneliti kasus itu' memakai kata kerja yang baku.", opsi: BS, jawaban: "Benar", penjelasan: "'Meneliti' adalah bentuk baku (me- + teliti, t luluh)." },
    { id: "u18j", tipe: "isi_blank", soal: "Bentuk baku dari 'cabe' adalah ...", jawaban: "cabai", penjelasan: "KBBI mencatat bentuk baku 'cabai', bukan 'cabe'." },
  ]},
];

export default level03;
