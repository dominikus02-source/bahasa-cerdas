import type { UnitSoal } from "./types";

const BS: ["Benar", "Salah"] = ["Benar", "Salah"];

const level02: UnitSoal[] = [
  { level: 2, title: "Huruf Kapital", soal: [
    { id: "u07f", tipe: "pilihan_ganda", soal: "Penulisan nama kota yang benar adalah ...", opsi: ["surabaya", "Surabaya", "SURABAYA", "suraBayA"], jawaban: 1, penjelasan: "Nama kota diawali huruf kapital: Surabaya." },
    { id: "u07g", tipe: "pilihan_ganda", soal: "Nama hari yang ditulis dengan benar adalah ...", opsi: ["senin", "selasa", "Rabu", "kamis"], jawaban: 2, penjelasan: "Nama hari diawali huruf kapital: Rabu." },
    { id: "u07h", tipe: "pilihan_ganda", soal: "Kalimat dengan huruf kapital yang benar adalah ...", opsi: ["Andi dan budi bermain.", "Andi dan Budi bermain.", "andi dan Budi bermain.", "Andi Dan Budi bermain."], jawaban: 1, penjelasan: "Awal kalimat dan nama orang (Budi) memakai huruf kapital." },
    { id: "u07i", tipe: "benar_salah", soal: "Nama kota seperti 'Bandung' diawali huruf kapital.", opsi: BS, jawaban: "Benar", penjelasan: "Nama kota selalu diawali huruf kapital." },
    { id: "u07j", tipe: "isi_blank", soal: "Perbaiki: 'dia suka membaca.' → '... suka membaca.'", jawaban: "Dia", penjelasan: "Awal kalimat memakai huruf kapital: Dia." },
  ]},
  { level: 2, title: "Tanda Titik", soal: [
    { id: "u08f", tipe: "pilihan_ganda", soal: "Kalimat yang memakai tanda titik dengan benar adalah ...", opsi: ["Budi makan", "Budi makan.", "Budi makan?", "Budi makan!"], jawaban: 1, penjelasan: "Kalimat berita diakhiri tanda titik: 'Budi makan.'" },
    { id: "u08g", tipe: "pilihan_ganda", soal: "Penulisan singkatan gelar yang benar adalah ...", opsi: ["S.Pd", "S.Pd.", "S, Pd", "SPd"], jawaban: 1, penjelasan: "Setiap huruf pada singkatan gelar diikuti titik: S.Pd." },
    { id: "u08h", tipe: "pilihan_ganda", soal: "Kalimat berita yang benar adalah ...", opsi: ["Kucing itu putih.", "Kucing itu putih", "kucing itu tidur", "Kucing itu putih!"], jawaban: 0, penjelasan: "Kalimat berita dimulai kapital dan diakhiri titik." },
    { id: "u08i", tipe: "benar_salah", soal: "Kalimat tanya diakhiri dengan tanda titik.", opsi: BS, jawaban: "Salah", penjelasan: "Kalimat tanya diakhiri tanda tanya, bukan titik." },
    { id: "u08j", tipe: "isi_blank", soal: "Lengkapi: 'Aku pergi ke pasar(...)' Tanda baca akhir yang tepat adalah tanda ...", jawaban: "titik", penjelasan: "Kalimat berita diakhiri tanda titik." },
  ]},
  { level: 2, title: "Tanda Koma", soal: [
    { id: "u09f", tipe: "pilihan_ganda", soal: "Kalimat yang memakai koma dengan benar adalah ...", opsi: ["Dia membeli pensil, buku, dan penghapus.", "Dia membeli pensil buku, dan penghapus.", "Dia, membeli pensil buku dan penghapus.", "Dia membeli, pensil buku dan penghapus."], jawaban: 0, penjelasan: "Koma memisahkan perincian: pensil, buku, dan penghapus." },
    { id: "u09g", tipe: "pilihan_ganda", soal: "Koma dipakai untuk memisahkan ...", opsi: ["dua kalimat lengkap", "unsur dalam perincian", "huruf kapital", "akhir kalimat tanya"], jawaban: 1, penjelasan: "Salah satu fungsi koma adalah memisahkan unsur perincian." },
    { id: "u09h", tipe: "pilihan_ganda", soal: "Kalimat yang memakai koma dengan SALAH adalah ...", opsi: ["Ayah, ibu, dan kakak pergi ke pasar.", "Kucing, dan anjing itu bermain.", "Kami membaca, menulis, dan menggambar.", "Apel, jeruk, dan anggur segar rasanya."], jawaban: 1, penjelasan: "Dua unsur cukup dihubungkan 'dan' tanpa koma." },
    { id: "u09i", tipe: "benar_salah", soal: "Koma dipakai setelah sapaan 'Halo' di awal kalimat.", opsi: BS, jawaban: "Benar", penjelasan: "Sapaan di awal kalimat diikuti koma: 'Halo, ...'" },
    { id: "u09j", tipe: "isi_blank", soal: "Lengkapi: 'Halo(...) selamat pagi.'", jawaban: ",", penjelasan: "Setelah sapaan 'Halo' dipakai koma." },
  ]},
  { level: 2, title: "Tanda Tanya dan Seru", soal: [
    { id: "u10f", tipe: "pilihan_ganda", soal: "Kalimat yang harus diakhiri tanda seru adalah ...", opsi: ["Siapa yang datang", "Wah, hebat sekali", "Mereka sedang makan", "Kapan pulangnya"], jawaban: 1, penjelasan: "'Wah, hebat sekali!' adalah seruan kekaguman." },
    { id: "u10g", tipe: "pilihan_ganda", soal: "Kalimat tanya yang benar adalah ...", opsi: ["Mau pergi ke mana?", "Mau pergi ke mana", "Mau pergi ke mana!", "Mau pergi ke mana."], jawaban: 0, penjelasan: "Kalimat tanya diakhiri tanda tanya." },
    { id: "u10h", tipe: "pilihan_ganda", soal: "Kata tanya untuk menanyakan TEMPAT adalah ...", opsi: ["siapa", "di mana", "berapa", "kapan"], jawaban: 1, penjelasan: "'Di mana' dipakai untuk menanyakan tempat." },
    { id: "u10i", tipe: "benar_salah", soal: "Kalimat 'Ayo, cepat kemari!' memakai tanda seru.", opsi: BS, jawaban: "Benar", penjelasan: "Ajakan bersemangat diakhiri tanda seru." },
    { id: "u10j", tipe: "isi_blank", soal: "'Betapa senangnya hatiku(...)' Tanda baca yang tepat adalah tanda ...", jawaban: "seru", penjelasan: "Seruan perasaan diakhiri tanda seru." },
  ]},
  { level: 2, title: "Menulis Kata dengan Tepat", soal: [
    { id: "u11f", tipe: "pilihan_ganda", soal: "Penulisan yang benar untuk kata depan tempat adalah ...", opsi: ["di rumah", "dirumah", "di-rumah", "rumah di"], jawaban: 0, penjelasan: "'di' sebagai kata depan tempat ditulis terpisah: di rumah." },
    { id: "u11g", tipe: "pilihan_ganda", soal: "Penulisan kata kerja pasif yang benar adalah ...", opsi: ["di makan", "dimakan", "di-makan", "dimakankan"], jawaban: 1, penjelasan: "'di-' sebagai awalan kata kerja ditulis serangkai: dimakan." },
    { id: "u11h", tipe: "pilihan_ganda", soal: "Penulisan kata depan 'ke' yang benar adalah ...", opsi: ["ke toko", "ketoko", "ke-toko", "toko ke"], jawaban: 0, penjelasan: "'ke' sebagai kata depan tempat ditulis terpisah: ke toko." },
    { id: "u11i", tipe: "benar_salah", soal: "Kata 'ke' sebagai kata depan tempat ditulis terpisah dari kata berikutnya.", opsi: BS, jawaban: "Benar", penjelasan: "Contohnya: ke pasar, ke toko, ke sekolah." },
    { id: "u11j", tipe: "isi_blank", soal: "Pilih penulisan yang benar: 'Nasi ... oleh adik.' (dimakan/di makan)", jawaban: "dimakan", penjelasan: "'di-' awalan ditulis serangkai: dimakan." },
  ]},
  { level: 2, title: "Latihan Cepat Level 2", soal: [
    { id: "u12f", tipe: "pilihan_ganda", soal: "Penulisan nama orang yang benar adalah ...", opsi: ["dewi lestari", "Dewi lestari", "Dewi Lestari", "DEWI lestari"], jawaban: 2, penjelasan: "Setiap kata pada nama orang diawali huruf kapital." },
    { id: "u12g", tipe: "pilihan_ganda", soal: "Kalimat yang benar adalah ...", opsi: ["Adik belajar di rumah.", "Adik belajar di rumah", "Adik belajar di rumah?", "adik tidur di rumah"], jawaban: 0, penjelasan: "Kapital di awal, 'di rumah' terpisah, dan diakhiri titik." },
    { id: "u12h", tipe: "pilihan_ganda", soal: "Kalimat tanya yang benar adalah ...", opsi: ["Apa warna bajumu?", "Apa warna bajumu", "Apa warna bajumu.", "Apa warna bajumu!"], jawaban: 0, penjelasan: "Kalimat tanya diakhiri tanda tanya." },
    { id: "u12i", tipe: "benar_salah", soal: "Penulisan 'Kami pergi ke pasar' sudah benar.", opsi: BS, jawaban: "Benar", penjelasan: "Kapital di awal kalimat dan 'ke pasar' ditulis terpisah." },
    { id: "u12j", tipe: "isi_blank", soal: "Perbaiki: 'Ibu membeli apel, jeruk dan anggur.' Sebelum kata 'dan' seharusnya ada tanda ...", jawaban: "koma", penjelasan: "Perincian tiga unsur dipisahkan koma, termasuk sebelum 'dan': apel, jeruk, dan anggur." },
  ]},
];

export default level02;
