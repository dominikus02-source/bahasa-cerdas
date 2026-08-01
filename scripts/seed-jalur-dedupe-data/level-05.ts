import type { UnitSoal } from "./types";

const BS: ["Benar", "Salah"] = ["Benar", "Salah"];

const level05: UnitSoal[] = [
  { level: 5, title: "Kata Dasar", soal: [
    { id: "u25f", tipe: "pilihan_ganda", soal: "Kata dasar dari 'kesedihan' adalah ...", opsi: ["sedih", "sedihan", "kesedih", "ke"], jawaban: 0, penjelasan: "Awalan ke- dan akhiran -an dibuang sehingga tersisa kata dasar 'sedih'." },
    { id: "u25g", tipe: "pilihan_ganda", soal: "Kata dasar dari 'pekerjaan' adalah ...", opsi: ["kerja", "pekerja", "kerjaan", "kerjakan"], jawaban: 0, penjelasan: "Imbuhan pe-...-an ditambah pada kata dasar 'kerja'." },
    { id: "u25h", tipe: "pilihan_ganda", soal: "Kata dasar dari 'ditinggal' adalah ...", opsi: ["tinggal", "diting", "tinggalkan", "ditinggalkan"], jawaban: 0, penjelasan: "Awalan di- dibuang sehingga tersisa kata dasar 'tinggal'." },
    { id: "u25i", tipe: "benar_salah", soal: "Kata dasar dari 'meminum' adalah 'minum'.", opsi: BS, jawaban: "Benar", penjelasan: "Me- + minum menjadi meminum, jadi kata dasarnya adalah 'minum'." },
    { id: "u25j", tipe: "isi_blank", soal: "Kata dasar dari 'bersepeda' adalah ...", jawaban: "sepeda", penjelasan: "Awalan ber- dibuang sehingga tersisa kata dasar 'sepeda'." },
  ]},
  { level: 5, title: "Imbuhan Me-", soal: [
    { id: "u26f", tipe: "pilihan_ganda", soal: "me- + pukul menjadi ...", opsi: ["memukul", "mempukul", "mepukul", "memukulkan"], jawaban: 0, penjelasan: "Huruf p luluh menjadi m sehingga me- + pukul menjadi memukul." },
    { id: "u26g", tipe: "pilihan_ganda", soal: "me- + garuk menjadi ...", opsi: ["mengaruk", "menggaruk", "memgaruk", "megaruk"], jawaban: 1, penjelasan: "Huruf g tidak luluh tetapi mendapat sisipan ng sehingga menjadi menggaruk." },
    { id: "u26h", tipe: "pilihan_ganda", soal: "me- + tusuk menjadi ...", opsi: ["menusuk", "mentusuk", "metusuk", "menyusuk"], jawaban: 0, penjelasan: "Huruf t luluh menjadi n sehingga me- + tusuk menjadi menusuk." },
    { id: "u26i", tipe: "benar_salah", soal: "me- + ambil menjadi 'mengambil'.", opsi: BS, jawaban: "Benar", penjelasan: "Kata berawalan vokal mendapat sisipan ng sehingga menjadi mengambil." },
    { id: "u26j", tipe: "isi_blank", soal: "me- + dengar = ...", jawaban: "mendengar", penjelasan: "Huruf d luluh menjadi n sehingga me- + dengar menjadi mendengar." },
  ]},
  { level: 5, title: "Imbuhan Ber-", soal: [
    { id: "u27f", tipe: "pilihan_ganda", soal: "ber- + lari menjadi ...", opsi: ["berlari", "belari", "melari", "berlarikan"], jawaban: 0, penjelasan: "Awalan ber- langsung melekat pada 'lari' tanpa perubahan huruf." },
    { id: "u27g", tipe: "pilihan_ganda", soal: "ber- + main menjadi ...", opsi: ["bermain", "beremain", "memain", "membermainkan"], jawaban: 0, penjelasan: "Ber- langsung melekat pada 'main' sehingga menjadi bermain." },
    { id: "u27h", tipe: "pilihan_ganda", soal: "Makna ber- pada kata 'bertopi' adalah ...", opsi: ["memakai", "menjadi", "membuat", "saling"], jawaban: 0, penjelasan: "Bertopi berarti memakai topi, jadi ber- bermakna memakai." },
    { id: "u27i", tipe: "benar_salah", soal: "'Bernyanyi' berarti melakukan kegiatan menyanyi.", opsi: BS, jawaban: "Benar", penjelasan: "Ber- + nyanyi menjadi bernyanyi, artinya melakukan kegiatan menyanyi." },
    { id: "u27j", tipe: "isi_blank", soal: "ber- + renang = ...", jawaban: "berenang", penjelasan: "Ber- + renang menjadi berenang, artinya melakukan kegiatan renang." },
  ]},
  { level: 5, title: "Imbuhan Pe- dan Per-", soal: [
    { id: "u28f", tipe: "pilihan_ganda", soal: "pe- + lari menjadi ...", opsi: ["pelari", "pelarian", "berlari", "melari"], jawaban: 0, penjelasan: "Pe- + lari menjadi pelari, yaitu orang yang berlari dalam perlombaan." },
    { id: "u28g", tipe: "pilihan_ganda", soal: "Kata 'perindah' terbentuk dari ...", opsi: ["per- + indah", "pe- + rindah", "per- + rindah", "pe- + indah"], jawaban: 0, penjelasan: "Per- + indah menjadi perindah, artinya membuat menjadi indah." },
    { id: "u28h", tipe: "pilihan_ganda", soal: "Orang yang menyanyi disebut ...", opsi: ["penyanyi", "menyanyikan", "nyanyian", "bernyanyi"], jawaban: 0, penjelasan: "Pe- + nyanyi menjadi penyanyi, yaitu pelaku kegiatan menyanyi." },
    { id: "u28i", tipe: "benar_salah", soal: "pe- + ajar menjadi 'pelajar'.", opsi: BS, jawaban: "Benar", penjelasan: "Pe- + ajar menjadi pelajar, yaitu orang yang belajar." },
    { id: "u28j", tipe: "isi_blank", soal: "per- + cepat = ...", jawaban: "percepat", penjelasan: "Per- + cepat menjadi percepat, artinya membuat menjadi cepat." },
  ]},
  { level: 5, title: "Akhiran -kan dan -i", soal: [
    { id: "u29f", tipe: "pilihan_ganda", soal: "Ibu berkata, \"... buku itu di atas meja!\"", opsi: ["Letakkan", "Letaki", "Meletak", "Berletak"], jawaban: 0, penjelasan: "Kalimat perintah memakai akhiran -kan sehingga menjadi 'Letakkan'." },
    { id: "u29g", tipe: "pilihan_ganda", soal: "Guru ... siswa yang datang terlambat.", opsi: ["menasihati", "menasihatkan", "nasihatkan", "ternasihat"], jawaban: 0, penjelasan: "Akhiran -i pada 'menasihati' berarti memberi nasihat kepada seseorang." },
    { id: "u29h", tipe: "pilihan_ganda", soal: "'Ayah membacakan adik dongeng.' Kata 'membacakan' bermakna ...", opsi: ["membaca untuk adik", "membaca oleh adik", "disuruh adik membaca", "membaca bersama adik"], jawaban: 0, penjelasan: "Akhiran -kan menyatakan tindakan yang dilakukan untuk kepentingan adik." },
    { id: "u29i", tipe: "benar_salah", soal: "'Tuliskan' terbentuk dari kata 'tulis' + akhiran '-kan'.", opsi: BS, jawaban: "Benar", penjelasan: "Tulis + -kan menjadi tuliskan." },
    { id: "u29j", tipe: "isi_blank", soal: "datang + -i = ...", jawaban: "datangi", penjelasan: "Datang + -i menjadi datangi, artinya mendatangi seseorang." },
  ]},
  { level: 5, title: "Latihan Cepat Level 5", soal: [
    { id: "u30f", tipe: "pilihan_ganda", soal: "Kata dasar dari 'penyanyi' adalah ...", opsi: ["nyanyi", "menyanyi", "nyanyian", "penyanyi"], jawaban: 0, penjelasan: "Awalan pe- dibuang sehingga tersisa kata dasar 'nyanyi'." },
    { id: "u30g", tipe: "pilihan_ganda", soal: "me- + sikat menjadi ...", opsi: ["menyikat", "mesikat", "mensikat", "mengsikat"], jawaban: 0, penjelasan: "Huruf s luluh menjadi ny sehingga me- + sikat menjadi menyikat." },
    { id: "u30h", tipe: "pilihan_ganda", soal: "Kata 'menyanyikan' terdiri dari ...", opsi: ["me- + nyanyi + -kan", "ber- + nyanyi + -kan", "nyanyi + me- + kan", "men- + nyanyi + -i"], jawaban: 0, penjelasan: "Me- + nyanyi + -kan menjadi menyanyikan." },
    { id: "u30i", tipe: "benar_salah", soal: "'Pelaut' adalah orang yang bekerja di laut.", opsi: BS, jawaban: "Benar", penjelasan: "Pe- + laut menjadi pelaut, yaitu orang yang bekerja di laut." },
    { id: "u30j", tipe: "isi_blank", soal: "per- + besar = ...", jawaban: "perbesar", penjelasan: "Per- + besar menjadi perbesar, artinya membuat menjadi besar." },
  ]},
];

export default level05;
