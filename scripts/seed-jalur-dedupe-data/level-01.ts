import type { UnitSoal } from "./types";

const BS: ["Benar", "Salah"] = ["Benar", "Salah"];

const level01: UnitSoal[] = [
  { level: 1, title: "Mengenal Bunyi dan Huruf", soal: [
    { id: "u01f", tipe: "pilihan_ganda", soal: "Huruf pertama pada kata 'telur' adalah ...", opsi: ["t", "l", "e", "r"], jawaban: 0, penjelasan: "Kata 'telur' diawali huruf t." },
    { id: "u01g", tipe: "pilihan_ganda", soal: "Bunyi apa yang kamu dengar di awal kata 'topi'?", opsi: ["t", "o", "p", "i"], jawaban: 0, penjelasan: "Kata 'topi' diawali bunyi t." },
    { id: "u01h", tipe: "pilihan_ganda", soal: "Kata 'lampu' dan 'lidah' sama-sama diawali bunyi ...", opsi: ["l", "p", "u", "a"], jawaban: 0, penjelasan: "Baik 'lampu' maupun 'lidah' diawali bunyi l." },
    { id: "u01i", tipe: "benar_salah", soal: "Kata 'kuda' diawali dengan huruf k.", opsi: BS, jawaban: "Benar", penjelasan: "k-u-d-a diawali huruf k." },
    { id: "u01j", tipe: "isi_blank", soal: "Huruf terakhir pada kata 'roti' adalah ...", jawaban: "i", penjelasan: "r-o-t-i diakhiri huruf i." },
  ]},
  { level: 1, title: "Huruf Vokal dan Konsonan", soal: [
    { id: "u02f", tipe: "pilihan_ganda", soal: "Manakah yang merupakan huruf konsonan?", opsi: ["a", "b", "i", "o"], jawaban: 1, penjelasan: "Huruf b adalah konsonan; a, i, o adalah vokal." },
    { id: "u02g", tipe: "pilihan_ganda", soal: "Pada kata 'laut', huruf vokalnya adalah ...", opsi: ["l dan t", "a dan u", "l dan a", "t dan u"], jawaban: 1, penjelasan: "Vokal pada 'laut' adalah a dan u; l dan t konsonan." },
    { id: "u02h", tipe: "pilihan_ganda", soal: "Huruf vokal pada kata 'soto' adalah ...", opsi: ["o dan o", "s dan t", "t dan o", "s dan o"], jawaban: 0, penjelasan: "Kedua huruf 'o' pada 'soto' adalah vokal." },
    { id: "u02i", tipe: "benar_salah", soal: "Huruf 't' pada kata 'topi' adalah huruf konsonan.", opsi: BS, jawaban: "Benar", penjelasan: "Konsonan pada 'topi' adalah t dan p." },
    { id: "u02j", tipe: "isi_blank", soal: "Pada kata 'kamu', huruf vokalnya adalah a dan ...", jawaban: "u", penjelasan: "k-a-m-u: vokalnya a dan u; k dan m konsonan." },
  ]},
  { level: 1, title: "Suku Kata Sederhana", soal: [
    { id: "u03f", tipe: "pilihan_ganda", soal: "Kata 'mo-bil' terdiri dari berapa suku kata?", opsi: ["1", "2", "3", "4"], jawaban: 1, penjelasan: "mo-bil ada 2 suku kata." },
    { id: "u03g", tipe: "pilihan_ganda", soal: "Pemenggalan suku kata yang tepat untuk 'kertas' adalah ...", opsi: ["ker-tas", "ke-rtas", "kert-as", "ke-r-tas"], jawaban: 0, penjelasan: "Kata 'kertas' dipenggal ker-tas." },
    { id: "u03h", tipe: "pilihan_ganda", soal: "Kata yang terdiri dari DUA suku kata adalah ...", opsi: ["kuda", "kelapa", "sekolah", "kereta"], jawaban: 0, penjelasan: "ku-da ada 2 suku kata; kelapa, sekolah, dan kereta lebih banyak." },
    { id: "u03i", tipe: "benar_salah", soal: "Kata 'lo-bang' terdiri dari dua suku kata.", opsi: BS, jawaban: "Benar", penjelasan: "lo-bang memang 2 suku kata." },
    { id: "u03j", tipe: "isi_blank", soal: "Suku kata kedua dari kata 'belajar' adalah ...", jawaban: "la", penjelasan: "be-la-jar: suku kedua adalah 'la'." },
  ]},
  { level: 1, title: "Membaca Kata Pendek", soal: [
    { id: "u04f", tipe: "pilihan_ganda", soal: "Huruf k-a-t-a dibaca ...", opsi: ["kata", "taka", "akta", "tak"], jawaban: 0, penjelasan: "k-a-t-a membentuk kata 'kata'." },
    { id: "u04g", tipe: "pilihan_ganda", soal: "Huruf m-e-j-a dibaca ...", opsi: ["maja", "meja", "jema", "maje"], jawaban: 1, penjelasan: "m-e-j-a dibaca 'meja'." },
    { id: "u04h", tipe: "pilihan_ganda", soal: "Kata 'pintu' ditulis dengan urutan huruf ...", opsi: ["p-i-n-t-u", "p-i-t-n-u", "p-u-n-t-i", "t-u-n-p-i"], jawaban: 0, penjelasan: "Urutan huruf kata 'pintu' adalah p, i, n, t, u." },
    { id: "u04i", tipe: "benar_salah", soal: "Huruf s-a-p-u dibaca 'sapu'.", opsi: BS, jawaban: "Benar", penjelasan: "s-a-p-u membentuk kata 'sapu'." },
    { id: "u04j", tipe: "isi_blank", soal: "b-u-k-a dibaca ...", jawaban: "buka", penjelasan: "b-u-k-a membentuk kata 'buka'." },
  ]},
  { level: 1, title: "Mendengar dan Memilih Kata", soal: [
    { id: "u05f", tipe: "pilihan_ganda", soal: "Kata yang bunyinya mirip dengan 'tali' adalah ...", opsi: ["tari", "sapu", "meja", "kursi"], jawaban: 0, penjelasan: "'Tari' dan 'tali' hanya berbeda satu bunyi." },
    { id: "u05g", tipe: "pilihan_ganda", soal: "Bunyi awal kata 'rumah' sama dengan bunyi awal kata ...", opsi: ["roti", "susu", "padi", "topi"], jawaban: 0, penjelasan: "'Rumah' dan 'roti' sama-sama diawali bunyi r." },
    { id: "u05h", tipe: "pilihan_ganda", soal: "Bunyi akhir kata 'peri' sama dengan bunyi akhir kata ...", opsi: ["kunci", "sapi", "buku", "mata"], jawaban: 0, penjelasan: "'Peri' dan 'kunci' sama-sama berakhir bunyi -i." },
    { id: "u05i", tipe: "benar_salah", soal: "Kata 'masak' dan 'masuk' bunyinya mirip tetapi artinya berbeda.", opsi: BS, jawaban: "Benar", penjelasan: "Hanya berbeda satu huruf: a dan u." },
    { id: "u05j", tipe: "isi_blank", soal: "Lengkapi: te-le-pon dibaca ...", jawaban: "telepon", penjelasan: "Suku te + le + pon = telepon." },
  ]},
  { level: 1, title: "Latihan Cepat Level 1", soal: [
    { id: "u06f", tipe: "pilihan_ganda", soal: "Huruf kedua pada kata 'padi' adalah ...", opsi: ["p", "a", "d", "i"], jawaban: 1, penjelasan: "p-a-d-i: huruf kedua adalah a." },
    { id: "u06g", tipe: "pilihan_ganda", soal: "Manakah yang semua hurufnya vokal?", opsi: ["aai", "bku", "pst", "lma"], jawaban: 0, penjelasan: "a, a, i semuanya vokal; yang lain mengandung konsonan." },
    { id: "u06h", tipe: "pilihan_ganda", soal: "Kata 'ba-ha-sa' terdiri dari berapa suku kata?", opsi: ["2", "3", "4", "5"], jawaban: 1, penjelasan: "ba-ha-sa ada 3 suku kata." },
    { id: "u06i", tipe: "benar_salah", soal: "Kata 'gelas' diawali dengan huruf g.", opsi: BS, jawaban: "Benar", penjelasan: "g-e-l-a-s diawali huruf g." },
    { id: "u06j", tipe: "isi_blank", soal: "d-a-u-n dibaca ...", jawaban: "daun", penjelasan: "d-a-u-n membentuk kata 'daun'." },
  ]},
];

export default level01;
