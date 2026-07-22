/**
 * Seed Soal Tambahan Jalur Cerdas — menambah 5 soal BARU per unit (72 unit).
 *
 * Latar: keenam unit dalam satu level selama ini memutar ulang pool soal yang
 * sama (mis. seluruh L1 memakai fon1–fon7 dengan urutan berbeda), sehingga
 * murid menjawab soal yang sama berulang kali, dan beberapa unit berisi soal
 * yang tidak sesuai judulnya (unit "Tanda Koma" berisi soal huruf kapital).
 * Seed ini memberi tiap unit soal yang benar-benar tentang topiknya.
 *
 * Aturan:
 * - ADD-ONLY: menambah ke content.questions, tidak pernah menghapus/mengubah
 *   soal lama. Idempoten — id yang sudah ada dilewati.
 * - Dry-run secara default. Jalankan dengan --execute untuk menulis.
 * - Lookup unit berdasarkan (judul, level) — sama seperti seed-materi.
 *
 * Komposisi per unit: 3 pilihan_ganda + 1 benar_salah + 1 isi_blank.
 * Nada bahasa mengikuti pita level: L1–4 SD kelas rendah (kalimat pendek,
 * konkret), L5–8 menengah, L9–12 tinggi (teks & penalaran).
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

// DATABASE_URL diambil dari .env.local (pnpm dev tidak selalu memuatnya).
function makeDb(): PrismaClient {
  if (process.env.DATABASE_URL) return new PrismaClient();
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL tidak ditemukan di env maupun .env.local");
  const url = line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "") + "?pgbouncer=true&connection_limit=3";
  return new PrismaClient({ datasources: { db: { url } } });
}

type Soal =
  | { id: string; tipe: "pilihan_ganda"; soal: string; opsi: string[]; jawaban: number; penjelasan: string }
  | { id: string; tipe: "benar_salah"; soal: string; opsi: ["Benar", "Salah"]; jawaban: "Benar" | "Salah"; penjelasan: string }
  | { id: string; tipe: "isi_blank"; soal: string; jawaban: string; penjelasan: string };

interface UnitSoal {
  level: number;
  title: string;
  soal: Soal[];
}

const BS: ["Benar", "Salah"] = ["Benar", "Salah"];

export const TAMBAHAN: UnitSoal[] = [
  // ═══════════════ LEVEL 1 — Bunyi & Huruf (SD kelas rendah) ═══════════════
  { level: 1, title: "Mengenal Bunyi dan Huruf", soal: [
    { id: "u01a", tipe: "pilihan_ganda", soal: "Huruf pertama pada kata 'ayam' adalah ...", opsi: ["a", "y", "m", "u"], jawaban: 0, penjelasan: "Kata 'ayam' diawali huruf a." },
    { id: "u01b", tipe: "pilihan_ganda", soal: "Kata 'ibu' terdiri dari berapa huruf?", opsi: ["2", "3", "4", "5"], jawaban: 1, penjelasan: "i-b-u ada 3 huruf." },
    { id: "u01c", tipe: "pilihan_ganda", soal: "Bunyi awal kata 'sapi' sama dengan bunyi awal kata ...", opsi: ["susu", "topi", "roti", "kaki"], jawaban: 0, penjelasan: "'Sapi' dan 'susu' sama-sama diawali bunyi s." },
    { id: "u01d", tipe: "benar_salah", soal: "Kata 'mata' diawali dengan huruf m.", opsi: BS, jawaban: "Benar", penjelasan: "m-a-t-a diawali huruf m." },
    { id: "u01e", tipe: "isi_blank", soal: "Huruf terakhir pada kata 'buku' adalah ...", jawaban: "u", penjelasan: "b-u-k-u diakhiri huruf u." },
  ]},
  { level: 1, title: "Huruf Vokal dan Konsonan", soal: [
    { id: "u02a", tipe: "pilihan_ganda", soal: "Pada kata 'meja', huruf vokalnya adalah ...", opsi: ["m dan j", "e dan a", "m dan e", "j dan a"], jawaban: 1, penjelasan: "Vokal pada 'meja' adalah e dan a; m dan j konsonan." },
    { id: "u02b", tipe: "pilihan_ganda", soal: "Kata berikut yang SEMUA hurufnya konsonan dan vokal berselang-seling adalah ...", opsi: ["batu", "truk", "es", "nyamuk"], jawaban: 0, penjelasan: "b-a-t-u: konsonan-vokal-konsonan-vokal." },
    { id: "u02c", tipe: "pilihan_ganda", soal: "Berapa jumlah huruf konsonan pada kata 'kelas'?", opsi: ["2", "3", "4", "5"], jawaban: 1, penjelasan: "Konsonan pada 'kelas': k, l, s — ada 3." },
    { id: "u02d", tipe: "benar_salah", soal: "Huruf 'e' pada kata 'enam' adalah huruf vokal.", opsi: BS, jawaban: "Benar", penjelasan: "a, i, u, e, o adalah vokal." },
    { id: "u02e", tipe: "isi_blank", soal: "Pada kata 'nasi', huruf konsonannya adalah n dan ...", jawaban: "s", penjelasan: "Konsonan 'nasi' adalah n dan s; a dan i vokal." },
  ]},
  { level: 1, title: "Suku Kata Sederhana", soal: [
    { id: "u03a", tipe: "pilihan_ganda", soal: "Kata 'ru-mah' terdiri dari berapa suku kata?", opsi: ["1", "2", "3", "4"], jawaban: 1, penjelasan: "ru-mah ada 2 suku kata." },
    { id: "u03b", tipe: "pilihan_ganda", soal: "Pemenggalan suku kata yang tepat untuk 'sepeda' adalah ...", opsi: ["sep-eda", "se-pe-da", "s-epeda", "sepe-da"], jawaban: 1, penjelasan: "'Sepeda' dipenggal se-pe-da (3 suku kata)." },
    { id: "u03c", tipe: "pilihan_ganda", soal: "Kata yang terdiri dari TIGA suku kata adalah ...", opsi: ["bola", "kelapa", "es", "buku"], jawaban: 1, penjelasan: "ke-la-pa = 3 suku kata; bola dan buku 2; es 1." },
    { id: "u03d", tipe: "benar_salah", soal: "Kata 'ma-ta-ha-ri' terdiri dari empat suku kata.", opsi: BS, jawaban: "Benar", penjelasan: "ma-ta-ha-ri memang 4 suku kata." },
    { id: "u03e", tipe: "isi_blank", soal: "Suku kata pertama dari kata 'pisang' adalah ...", jawaban: "pi", penjelasan: "pi-sang: suku pertama 'pi'." },
  ]},
  { level: 1, title: "Membaca Kata Pendek", soal: [
    { id: "u04a", tipe: "pilihan_ganda", soal: "Huruf b-o-l-a jika dibaca menjadi ...", opsi: ["labo", "bola", "loba", "balo"], jawaban: 1, penjelasan: "b-o-l-a dibaca 'bola'." },
    { id: "u04b", tipe: "pilihan_ganda", soal: "Gambar kucing paling cocok dengan kata ...", opsi: ["kucing", "kacang", "kunci", "kancing"], jawaban: 0, penjelasan: "Hewan berkaki empat yang mengeong adalah kucing." },
    { id: "u04c", tipe: "pilihan_ganda", soal: "Kata yang paling pendek di bawah ini adalah ...", opsi: ["sekolah", "es", "sepatu", "sarapan"], jawaban: 1, penjelasan: "'Es' hanya 2 huruf." },
    { id: "u04d", tipe: "benar_salah", soal: "Huruf s-u-s-u dibaca 'susu'.", opsi: BS, jawaban: "Benar", penjelasan: "Rangkaian s-u-s-u dibaca 'susu'." },
    { id: "u04e", tipe: "isi_blank", soal: "d-a-d-u dibaca ...", jawaban: "dadu", penjelasan: "Huruf d-a-d-u membentuk kata 'dadu'." },
  ]},
  { level: 1, title: "Mendengar dan Memilih Kata", soal: [
    { id: "u05a", tipe: "pilihan_ganda", soal: "Kata yang bunyinya paling mirip dengan 'pagi' adalah ...", opsi: ["padi", "sore", "malam", "siang"], jawaban: 0, penjelasan: "'Pagi' dan 'padi' hanya berbeda satu bunyi." },
    { id: "u05b", tipe: "pilihan_ganda", soal: "Pasangan kata yang bunyinya BERBEDA jauh adalah ...", opsi: ["baju–batu", "kuda–kura", "meja–sapu", "tari–topi"], jawaban: 2, penjelasan: "'Meja' dan 'sapu' tidak memiliki kemiripan bunyi." },
    { id: "u05c", tipe: "pilihan_ganda", soal: "Bunyi akhir kata 'jalan' sama dengan bunyi akhir kata ...", opsi: ["makan", "buku", "sapi", "mata"], jawaban: 0, penjelasan: "'Jalan' dan 'makan' sama-sama berakhir bunyi -an." },
    { id: "u05d", tipe: "benar_salah", soal: "Kata 'paku' dan 'palu' bunyinya mirip tetapi artinya berbeda.", opsi: BS, jawaban: "Benar", penjelasan: "Beda satu huruf: k dan l — artinya jauh berbeda." },
    { id: "u05e", tipe: "isi_blank", soal: "Lengkapi: sa-yur dibaca ...", jawaban: "sayur", penjelasan: "Suku sa + yur = sayur." },
  ]},
  { level: 1, title: "Latihan Cepat Level 1", soal: [
    { id: "u06a", tipe: "pilihan_ganda", soal: "Manakah yang merupakan huruf vokal?", opsi: ["k", "o", "t", "r"], jawaban: 1, penjelasan: "o termasuk lima vokal a, i, u, e, o." },
    { id: "u06b", tipe: "pilihan_ganda", soal: "Kata 'se-ko-lah' terdiri dari berapa suku kata?", opsi: ["2", "3", "4", "5"], jawaban: 1, penjelasan: "se-ko-lah = 3 suku kata." },
    { id: "u06c", tipe: "pilihan_ganda", soal: "Huruf pertama kata 'gajah' adalah ...", opsi: ["j", "g", "h", "a"], jawaban: 1, penjelasan: "'Gajah' diawali huruf g." },
    { id: "u06d", tipe: "benar_salah", soal: "Semua huruf pada kata 'aiueo' adalah vokal.", opsi: BS, jawaban: "Benar", penjelasan: "a, i, u, e, o adalah kelima vokal." },
    { id: "u06e", tipe: "isi_blank", soal: "Jumlah huruf vokal dalam abjad Indonesia adalah ... buah.", jawaban: "5", penjelasan: "Vokal: a, i, u, e, o — lima buah." },
  ]},

  // ═══════════════ LEVEL 2 — Ejaan & Tanda Baca dasar ═══════════════
  { level: 2, title: "Huruf Kapital", soal: [
    { id: "u07a", tipe: "pilihan_ganda", soal: "Penulisan nama orang yang benar adalah ...", opsi: ["siti aminah", "Siti Aminah", "SITI aminah", "siti Aminah"], jawaban: 1, penjelasan: "Setiap kata pada nama orang diawali huruf kapital." },
    { id: "u07b", tipe: "pilihan_ganda", soal: "Kalimat yang penulisannya benar adalah ...", opsi: ["kami pergi ke bandung.", "Kami pergi ke bandung.", "Kami pergi ke Bandung.", "kami pergi ke Bandung."], jawaban: 2, penjelasan: "Awal kalimat dan nama kota memakai huruf kapital." },
    { id: "u07c", tipe: "pilihan_ganda", soal: "Huruf kapital TIDAK dipakai untuk ...", opsi: ["awal kalimat", "nama hari", "nama buah di tengah kalimat", "nama orang"], jawaban: 2, penjelasan: "Nama buah bukan nama diri, tidak perlu kapital di tengah kalimat." },
    { id: "u07d", tipe: "benar_salah", soal: "Nama bulan seperti Januari ditulis dengan huruf kapital.", opsi: BS, jawaban: "Benar", penjelasan: "Nama bulan dan hari diawali huruf kapital." },
    { id: "u07e", tipe: "isi_blank", soal: "Perbaiki huruf pertama: '... hari ini cerah.' (kata: cuaca)", jawaban: "Cuaca", penjelasan: "Awal kalimat memakai huruf kapital: Cuaca." },
  ]},
  { level: 2, title: "Tanda Titik", soal: [
    { id: "u08a", tipe: "pilihan_ganda", soal: "Tanda titik dipakai pada akhir ...", opsi: ["kalimat tanya", "kalimat berita", "kalimat seru", "judul buku"], jawaban: 1, penjelasan: "Kalimat berita diakhiri tanda titik." },
    { id: "u08b", tipe: "pilihan_ganda", soal: "Kalimat yang memakai tanda titik dengan benar adalah ...", opsi: ["Adik sedang tidur.", "Adik sedang tidur?", "Adik sedang tidur!", "Adik. sedang tidur"], jawaban: 0, penjelasan: "Kalimat berita biasa diakhiri titik." },
    { id: "u08c", tipe: "pilihan_ganda", soal: "Singkatan nama orang memakai tanda ...", opsi: ["koma", "titik", "tanya", "seru"], jawaban: 1, penjelasan: "Contoh: Muh. Yamin — titik setelah singkatan." },
    { id: "u08d", tipe: "benar_salah", soal: "Kalimat 'Ibu memasak nasi goreng' harus diakhiri tanda titik.", opsi: BS, jawaban: "Benar", penjelasan: "Itu kalimat berita, diakhiri titik." },
    { id: "u08e", tipe: "isi_blank", soal: "Tanda baca di akhir kalimat berita adalah tanda ...", jawaban: "titik", penjelasan: "Kalimat berita diakhiri tanda titik (.)." },
  ]},
  { level: 2, title: "Tanda Koma", soal: [
    { id: "u09a", tipe: "pilihan_ganda", soal: "Penggunaan koma yang tepat pada perincian adalah ...", opsi: ["Ibu membeli apel jeruk, dan pisang", "Ibu membeli apel, jeruk, dan pisang.", "Ibu membeli, apel jeruk dan pisang.", "Ibu, membeli apel jeruk dan pisang."], jawaban: 1, penjelasan: "Koma memisahkan unsur perincian: apel, jeruk, dan pisang." },
    { id: "u09b", tipe: "pilihan_ganda", soal: "Koma dipakai setelah kata ... di awal kalimat.", opsi: ["dan", "Oleh karena itu", "yang", "di"], jawaban: 1, penjelasan: "Ungkapan penghubung antarkalimat seperti 'Oleh karena itu,' diikuti koma." },
    { id: "u09c", tipe: "pilihan_ganda", soal: "Kalimat dengan koma yang BENAR adalah ...", opsi: ["Jika hujan, kami tidak jadi pergi.", "Jika, hujan kami tidak jadi pergi.", "Jika hujan kami, tidak jadi pergi.", "Jika hujan kami tidak, jadi pergi."], jawaban: 0, penjelasan: "Koma dipakai setelah anak kalimat yang mendahului induk kalimat." },
    { id: "u09d", tipe: "benar_salah", soal: "Koma dipakai untuk memisahkan unsur-unsur dalam perincian.", opsi: BS, jawaban: "Benar", penjelasan: "Itulah salah satu fungsi utama tanda koma." },
    { id: "u09e", tipe: "isi_blank", soal: "Lengkapi tanda baca: 'Ayah membeli beras(...) gula, dan teh.'", jawaban: ",", penjelasan: "Perincian dipisahkan koma: beras, gula, dan teh." },
  ]},
  { level: 2, title: "Tanda Tanya dan Seru", soal: [
    { id: "u10a", tipe: "pilihan_ganda", soal: "Kalimat yang harus diakhiri tanda tanya adalah ...", opsi: ["Tutup pintunya", "Di mana rumahmu", "Aduh, sakit sekali", "Hari ini hujan"], jawaban: 1, penjelasan: "'Di mana rumahmu?' adalah kalimat tanya." },
    { id: "u10b", tipe: "pilihan_ganda", soal: "Tanda seru cocok untuk kalimat ...", opsi: ["Siapa namamu", "Tolong ambilkan buku itu sekarang", "Kucing itu tidur", "Berapa harganya"], jawaban: 1, penjelasan: "Perintah/seruan diakhiri tanda seru: 'Tolong ambilkan buku itu sekarang!'" },
    { id: "u10c", tipe: "pilihan_ganda", soal: "Kata tanya untuk menanyakan WAKTU adalah ...", opsi: ["siapa", "kapan", "di mana", "berapa"], jawaban: 1, penjelasan: "'Kapan' menanyakan waktu." },
    { id: "u10d", tipe: "benar_salah", soal: "Kalimat 'Wah, indah sekali pemandangan ini!' memakai tanda seru.", opsi: BS, jawaban: "Benar", penjelasan: "Kalimat seruan kekaguman diakhiri tanda seru." },
    { id: "u10e", tipe: "isi_blank", soal: "'Mengapa kamu terlambat(...)' — tanda baca yang tepat adalah tanda ...", jawaban: "tanya", penjelasan: "Kalimat diawali kata tanya 'mengapa' → tanda tanya." },
  ]},
  { level: 2, title: "Menulis Kata dengan Tepat", soal: [
    { id: "u11a", tipe: "pilihan_ganda", soal: "Penulisan yang benar adalah ...", opsi: ["di sekolah", "disekolah", "di-sekolah", "diSekolah"], jawaban: 0, penjelasan: "'di' sebagai kata depan (tempat) ditulis terpisah." },
    { id: "u11b", tipe: "pilihan_ganda", soal: "Penulisan kata berimbuhan yang benar adalah ...", opsi: ["di baca", "dibaca", "di-baca", "dibaca-baca di"], jawaban: 1, penjelasan: "'di-' sebagai awalan kata kerja ditulis serangkai: dibaca." },
    { id: "u11c", tipe: "pilihan_ganda", soal: "Manakah penulisan yang salah?", opsi: ["ke pasar", "kemari", "ke kanan", "kepasar"], jawaban: 3, penjelasan: "'ke' kata depan ditulis terpisah: ke pasar." },
    { id: "u11d", tipe: "benar_salah", soal: "Kata 'ditulis' pada 'Surat itu ditulis ayah' ditulis serangkai.", opsi: BS, jawaban: "Benar", penjelasan: "'di-' awalan pada kata kerja pasif ditulis serangkai." },
    { id: "u11e", tipe: "isi_blank", soal: "Pilih penulisan benar untuk tempat: 'Buku itu ada ... atas meja.' (di/di-)", jawaban: "di", penjelasan: "Menunjukkan tempat → 'di' terpisah: di atas meja." },
  ]},
  { level: 2, title: "Latihan Cepat Level 2", soal: [
    { id: "u12a", tipe: "pilihan_ganda", soal: "Kalimat dengan ejaan yang benar seluruhnya adalah ...", opsi: ["rina pergi ke Jakarta.", "Rina pergi ke jakarta.", "Rina pergi ke Jakarta.", "rina pergi ke jakarta."], jawaban: 2, penjelasan: "Kapital di awal kalimat dan pada nama kota." },
    { id: "u12b", tipe: "pilihan_ganda", soal: "'Ayo kita berangkat(...)' Tanda baca yang paling tepat adalah ...", opsi: ["titik", "koma", "tanda seru", "tanda tanya"], jawaban: 2, penjelasan: "Ajakan bersemangat diakhiri tanda seru." },
    { id: "u12c", tipe: "pilihan_ganda", soal: "Perincian yang benar: 'Warna bendera kita adalah ...'", opsi: ["merah dan, putih", "merah, dan putih", "merah dan putih", "merah; dan putih"], jawaban: 2, penjelasan: "Dua unsur cukup dihubungkan 'dan' tanpa koma." },
    { id: "u12d", tipe: "benar_salah", soal: "Nama hari seperti 'senin' boleh ditulis dengan huruf kecil.", opsi: BS, jawaban: "Salah", penjelasan: "Nama hari diawali kapital: Senin." },
    { id: "u12e", tipe: "isi_blank", soal: "'Apakah kamu sudah makan' perlu diakhiri tanda ...", jawaban: "tanya", penjelasan: "Kalimat tanya diakhiri tanda tanya (?)." },
  ]},

  // ═══════════════ LEVEL 3 — Kata Baku ═══════════════
  { level: 3, title: "Kata Baku dan Tidak Baku", soal: [
    { id: "u13a", tipe: "pilihan_ganda", soal: "Kata baku dari 'apotik' adalah ...", opsi: ["apotek", "apotix", "aphotek", "apotiek"], jawaban: 0, penjelasan: "Bentuk baku menurut KBBI: apotek." },
    { id: "u13b", tipe: "pilihan_ganda", soal: "Manakah yang merupakan kata baku?", opsi: ["ijin", "izin", "idzin", "ijinn"], jawaban: 1, penjelasan: "Bentuk baku: izin." },
    { id: "u13c", tipe: "pilihan_ganda", soal: "Pasangan baku–tidak baku yang benar adalah ...", opsi: ["nasehat–nasihat", "nasihat–nasehat", "nasehat–nasehat", "nasihat–nasihat"], jawaban: 1, penjelasan: "'Nasihat' baku; 'nasehat' tidak baku." },
    { id: "u13d", tipe: "benar_salah", soal: "Kata 'foto' adalah bentuk baku, sedangkan 'photo' tidak baku.", opsi: BS, jawaban: "Benar", penjelasan: "Serapan baku ditulis 'foto'." },
    { id: "u13e", tipe: "isi_blank", soal: "Kata baku dari 'obyek' adalah ...", jawaban: "objek", penjelasan: "KBBI mencatat bentuk baku 'objek'." },
  ]},
  { level: 3, title: "Kata Serapan Umum", soal: [
    { id: "u14a", tipe: "pilihan_ganda", soal: "Kata serapan yang penulisannya benar adalah ...", opsi: ["sistim", "sistem", "systim", "sistemm"], jawaban: 1, penjelasan: "Dari 'system' diserap menjadi 'sistem'." },
    { id: "u14b", tipe: "pilihan_ganda", soal: "'Aktivitas' diserap dari kata bahasa Inggris ...", opsi: ["active", "activity", "act", "action"], jawaban: 1, penjelasan: "'Activity' → aktivitas (bukan 'aktifitas')." },
    { id: "u14c", tipe: "pilihan_ganda", soal: "Bentuk serapan yang BAKU adalah ...", opsi: ["praktek", "praktik", "practek", "practik"], jawaban: 1, penjelasan: "Bentuk baku: praktik." },
    { id: "u14d", tipe: "benar_salah", soal: "'Teknologi' adalah kata serapan yang baku.", opsi: BS, jawaban: "Benar", penjelasan: "Dari 'technology' → teknologi (baku)." },
    { id: "u14e", tipe: "isi_blank", soal: "Bentuk baku dari 'analisa' adalah ...", jawaban: "analisis", penjelasan: "KBBI: analisis (dari 'analysis')." },
  ]},
  { level: 3, title: "Kesalahan Kata Sehari-hari", soal: [
    { id: "u15a", tipe: "pilihan_ganda", soal: "Kata yang sering salah tulis: bentuk BENAR adalah ...", opsi: ["silahkan", "silakan", "sillakan", "silaqan"], jawaban: 1, penjelasan: "Bentuk baku: silakan (tanpa h)." },
    { id: "u15b", tipe: "pilihan_ganda", soal: "Pilih bentuk yang benar: ...", opsi: ["mempengaruhi", "memengaruhi", "mem-pengaruhi", "menpengaruhi"], jawaban: 1, penjelasan: "me- + pengaruh → memengaruhi (p luluh)." },
    { id: "u15c", tipe: "pilihan_ganda", soal: "Bentuk baku yang benar adalah ...", opsi: ["resiko", "risiko", "reziko", "risico"], jawaban: 1, penjelasan: "KBBI: risiko." },
    { id: "u15d", tipe: "benar_salah", soal: "'Sekedar' adalah bentuk baku dari kata tersebut.", opsi: BS, jawaban: "Salah", penjelasan: "Bentuk baku: sekadar." },
    { id: "u15e", tipe: "isi_blank", soal: "Bentuk baku dari 'himbau' adalah ...", jawaban: "imbau", penjelasan: "KBBI: imbau, mengimbau." },
  ]},
  { level: 3, title: "Memilih Kata yang Tepat", soal: [
    { id: "u16a", tipe: "pilihan_ganda", soal: "'Harga bahan pokok ... karena stok menipis.' Kata paling tepat: ...", opsi: ["naik", "terbang", "memanjat", "melompat"], jawaban: 0, penjelasan: "Untuk harga, kata tepatnya 'naik'." },
    { id: "u16b", tipe: "pilihan_ganda", soal: "'Para siswa ... upacara dengan tertib.' Kata paling tepat: ...", opsi: ["melihat", "mengikuti", "membawa", "menonton"], jawaban: 1, penjelasan: "Upacara 'diikuti', bukan ditonton." },
    { id: "u16c", tipe: "pilihan_ganda", soal: "Kata yang paling santun untuk mengganti 'mati' bagi manusia adalah ...", opsi: ["tewas", "meninggal", "binasa", "lenyap"], jawaban: 1, penjelasan: "'Meninggal' adalah pilihan kata yang santun." },
    { id: "u16d", tipe: "benar_salah", soal: "Kalimat 'Kakak meminum obat' memakai kata kerja yang tepat.", opsi: BS, jawaban: "Benar", penjelasan: "Obat 'diminum' — kata kerjanya tepat." },
    { id: "u16e", tipe: "isi_blank", soal: "'Adik ... sepeda ke sekolah.' Kata kerja yang tepat: me- + kayuh = ...", jawaban: "mengayuh", penjelasan: "me- + kayuh → mengayuh (k luluh)." },
  ]},
  { level: 3, title: "Perbaiki Kata dalam Kalimat", soal: [
    { id: "u17a", tipe: "pilihan_ganda", soal: "'Dia merubah jadwal latihan.' Perbaikan kata bercetak salah adalah ...", opsi: ["merobah", "mengubah", "merubahkan", "berubah"], jawaban: 1, penjelasan: "Bentuk baku: mengubah (dari 'ubah')." },
    { id: "u17b", tipe: "pilihan_ganda", soal: "'Kami mengkontrak rumah itu.' Bentuk yang benar adalah ...", opsi: ["mengontrak", "mengkontrakkan", "menkontrak", "mengontrakan"], jawaban: 0, penjelasan: "me- + kontrak → mengontrak (k luluh)." },
    { id: "u17c", tipe: "pilihan_ganda", soal: "'Ia berkata jikalau dia akan datang.' Kata yang tepat mengganti 'jikalau' adalah ...", opsi: ["bahwa", "karena", "sehingga", "agar"], jawaban: 0, penjelasan: "Melaporkan ucapan memakai 'bahwa', bukan 'jikalau'." },
    { id: "u17d", tipe: "benar_salah", soal: "Kalimat 'Mereka saling tolong-menolong' sudah hemat kata.", opsi: BS, jawaban: "Salah", penjelasan: "'Saling' dan 'tolong-menolong' bermakna sama — pilih salah satu." },
    { id: "u17e", tipe: "isi_blank", soal: "Perbaiki: 'Ayah menyicil motor.' Bentuk baku me- + cicil = ...", jawaban: "mencicil", penjelasan: "c tidak luluh: mencicil." },
  ]},
  { level: 3, title: "Latihan Cepat Level 3", soal: [
    { id: "u18a", tipe: "pilihan_ganda", soal: "Deret kata yang SEMUANYA baku adalah ...", opsi: ["izin, apotek, praktik", "ijin, apotek, praktik", "izin, apotik, praktek", "ijin, apotik, praktek"], jawaban: 0, penjelasan: "Izin, apotek, praktik — semuanya baku." },
    { id: "u18b", tipe: "pilihan_ganda", soal: "Kata tidak baku pada kalimat 'Dokter memberi nasehat pada pasien' adalah ...", opsi: ["dokter", "memberi", "nasehat", "pasien"], jawaban: 2, penjelasan: "Baku: nasihat." },
    { id: "u18c", tipe: "pilihan_ganda", soal: "Bentuk baku dari 'nggak' dalam tulisan resmi adalah ...", opsi: ["tak", "tidak", "ndak", "enggak"], jawaban: 1, penjelasan: "Ragam resmi memakai 'tidak'." },
    { id: "u18d", tipe: "benar_salah", soal: "'Februari' adalah penulisan bulan yang baku.", opsi: BS, jawaban: "Benar", penjelasan: "Baku: Februari (bukan Pebruari)." },
    { id: "u18e", tipe: "isi_blank", soal: "Bentuk baku dari 'jaman' adalah ...", jawaban: "zaman", penjelasan: "KBBI: zaman." },
  ]},
];

export const TAMBAHAN_2: UnitSoal[] = [
  // ═══════════════ LEVEL 4 — Makna Kata ═══════════════
  { level: 4, title: "Sinonim", soal: [
    { id: "u19a", tipe: "pilihan_ganda", soal: "Sinonim kata 'pandai' adalah ...", opsi: ["malas", "cerdas", "lambat", "ramah"], jawaban: 1, penjelasan: "Pandai = cerdas = pintar." },
    { id: "u19b", tipe: "pilihan_ganda", soal: "Kata yang bersinonim dengan 'gembira' adalah ...", opsi: ["senang", "sedih", "marah", "takut"], jawaban: 0, penjelasan: "Gembira sepadan dengan senang, riang." },
    { id: "u19c", tipe: "pilihan_ganda", soal: "'Rumah itu sangat besar.' Sinonim 'besar' adalah ...", opsi: ["mungil", "luas", "sempit", "rendah"], jawaban: 1, penjelasan: "Untuk rumah, 'besar' sepadan dengan 'luas'." },
    { id: "u19d", tipe: "benar_salah", soal: "'Indah' dan 'cantik' adalah kata yang bersinonim.", opsi: BS, jawaban: "Benar", penjelasan: "Keduanya menyatakan keelokan." },
    { id: "u19e", tipe: "isi_blank", soal: "Sinonim kata 'lekas' adalah ce...", jawaban: "cepat", penjelasan: "Lekas = cepat = segera." },
  ]},
  { level: 4, title: "Antonim", soal: [
    { id: "u20a", tipe: "pilihan_ganda", soal: "Antonim kata 'terang' adalah ...", opsi: ["benderang", "gelap", "silau", "cerah"], jawaban: 1, penjelasan: "Lawan terang adalah gelap." },
    { id: "u20b", tipe: "pilihan_ganda", soal: "Lawan kata 'rajin' adalah ...", opsi: ["tekun", "giat", "malas", "pintar"], jawaban: 2, penjelasan: "Rajin >< malas." },
    { id: "u20c", tipe: "pilihan_ganda", soal: "Pasangan antonim yang TEPAT adalah ...", opsi: ["tinggi–jangkung", "mahal–murah", "cantik–elok", "cepat–lekas"], jawaban: 1, penjelasan: "Mahal >< murah; pasangan lain justru sinonim." },
    { id: "u20d", tipe: "benar_salah", soal: "'Membeli' adalah antonim dari 'menjual'.", opsi: BS, jawaban: "Benar", penjelasan: "Keduanya kegiatan yang berlawanan arah." },
    { id: "u20e", tipe: "isi_blank", soal: "Antonim 'datang' adalah pe...", jawaban: "pergi", penjelasan: "Datang >< pergi." },
  ]},
  { level: 4, title: "Homonim Sederhana", soal: [
    { id: "u21a", tipe: "pilihan_ganda", soal: "Kata 'bisa' pada 'Ular itu punya bisa' bermakna ...", opsi: ["mampu", "racun", "boleh", "pandai"], jawaban: 1, penjelasan: "'Bisa' di sini berarti racun ular." },
    { id: "u21b", tipe: "pilihan_ganda", soal: "'Bulan' yang bermakna benda langit ada pada kalimat ...", opsi: ["Bulan depan kami ujian.", "Bulan purnama tampak indah.", "Sudah dua bulan ia pergi.", "Gajinya dibayar tiap bulan."], jawaban: 1, penjelasan: "Bulan purnama = benda langit; lainnya satuan waktu." },
    { id: "u21c", tipe: "pilihan_ganda", soal: "Kata 'kali' pada 'Anak-anak bermain di tepi kali' berarti ...", opsi: ["perkalian", "sungai", "kesempatan", "jumlah"], jawaban: 1, penjelasan: "'Kali' di sini bermakna sungai." },
    { id: "u21d", tipe: "benar_salah", soal: "Kata 'genting' bisa berarti atap dan bisa berarti gawat.", opsi: BS, jawaban: "Benar", penjelasan: "Genting: (1) penutup atap, (2) keadaan gawat." },
    { id: "u21e", tipe: "isi_blank", soal: "'Rapat' bisa berarti pertemuan, bisa juga berarti tidak ...", jawaban: "renggang", penjelasan: "Rapat = pertemuan; rapat = sangat dekat/tidak renggang." },
  ]},
  { level: 4, title: "Makna Denotatif dan Konotatif", soal: [
    { id: "u22a", tipe: "pilihan_ganda", soal: "'Tangan kanan' pada 'Dia tangan kanan direktur' bermakna ...", opsi: ["tangan sebelah kanan", "orang kepercayaan", "karyawan baru", "penjaga kantor"], jawaban: 1, penjelasan: "Konotasi 'tangan kanan' = orang kepercayaan." },
    { id: "u22b", tipe: "pilihan_ganda", soal: "Kalimat yang memakai makna DENOTATIF adalah ...", opsi: ["Ia jadi kambing hitam.", "Harga itu mencekik leher.", "Adik minum susu sapi.", "Dia besar kepala setelah menang."], jawaban: 2, penjelasan: "'Minum susu sapi' bermakna sebenarnya." },
    { id: "u22c", tipe: "pilihan_ganda", soal: "'Kutu buku' berkonotasi ...", opsi: ["serangga di buku", "orang yang gemar membaca", "buku yang rusak", "penjual buku"], jawaban: 1, penjelasan: "Kutu buku = sangat suka membaca." },
    { id: "u22d", tipe: "benar_salah", soal: "'Gulung tikar' pada 'Tokonya gulung tikar' berarti bangkrut.", opsi: BS, jawaban: "Benar", penjelasan: "Konotasi gulung tikar = bangkrut." },
    { id: "u22e", tipe: "isi_blank", soal: "'Buah tangan' bermakna oleh-...", jawaban: "oleh", penjelasan: "Buah tangan = oleh-oleh." },
  ]},
  { level: 4, title: "Kosakata dalam Konteks", soal: [
    { id: "u23a", tipe: "pilihan_ganda", soal: "'Penonton ... ketika penyanyi naik panggung.' Kata paling tepat: ...", opsi: ["bersorak", "berbisik", "tertidur", "membaca"], jawaban: 0, penjelasan: "Konteks kemeriahan → bersorak." },
    { id: "u23b", tipe: "pilihan_ganda", soal: "'Air sungai itu ... setelah hujan deras.' Kata paling tepat: ...", opsi: ["surut", "meluap", "kering", "jernih"], jawaban: 1, penjelasan: "Hujan deras membuat sungai meluap." },
    { id: "u23c", tipe: "pilihan_ganda", soal: "'Ibu menyimpan perhiasan di tempat yang ...' Kata paling tepat: ...", opsi: ["terbuka", "aman", "ramai", "basah"], jawaban: 1, penjelasan: "Perhiasan disimpan di tempat aman." },
    { id: "u23d", tipe: "benar_salah", soal: "Kata 'deras' cocok dipakai untuk hujan.", opsi: BS, jawaban: "Benar", penjelasan: "Kolokasi umum: hujan deras." },
    { id: "u23e", tipe: "isi_blank", soal: "'Lampu itu ... karena listrik padam.' Kata yang tepat: pa...", jawaban: "padam", penjelasan: "Lampu padam saat listrik mati." },
  ]},
  { level: 4, title: "Latihan Cepat Level 4", soal: [
    { id: "u24a", tipe: "pilihan_ganda", soal: "Sinonim 'jujur' adalah ...", opsi: ["curang", "lurus hati", "sombong", "kikir"], jawaban: 1, penjelasan: "Jujur = lurus hati." },
    { id: "u24b", tipe: "pilihan_ganda", soal: "Antonim 'ramai' adalah ...", opsi: ["riuh", "sepi", "bising", "padat"], jawaban: 1, penjelasan: "Ramai >< sepi." },
    { id: "u24c", tipe: "pilihan_ganda", soal: "'Bunga bank' memakai makna ...", opsi: ["denotatif", "konotatif", "harfiah", "lugas"], jawaban: 1, penjelasan: "'Bunga' di sini bukan tumbuhan — makna kias/konotatif (imbal jasa)." },
    { id: "u24d", tipe: "benar_salah", soal: "'Besar' dan 'raksasa' bisa dipakai sebagai sinonim dalam konteks ukuran.", opsi: BS, jawaban: "Benar", penjelasan: "Keduanya menyatakan ukuran sangat besar." },
    { id: "u24e", tipe: "isi_blank", soal: "Antonim 'untung' adalah ...", jawaban: "rugi", penjelasan: "Untung >< rugi." },
  ]},

  // ═══════════════ LEVEL 5 — Imbuhan ═══════════════
  { level: 5, title: "Kata Dasar", soal: [
    { id: "u25a", tipe: "pilihan_ganda", soal: "Kata dasar dari 'pertandingan' adalah ...", opsi: ["tanding", "pertanding", "tandingan", "bertanding"], jawaban: 0, penjelasan: "per-...-an + tanding." },
    { id: "u25b", tipe: "pilihan_ganda", soal: "Kata dasar 'kehujanan' adalah ...", opsi: ["kehujan", "hujan", "hujanan", "ujan"], jawaban: 1, penjelasan: "ke-...-an + hujan." },
    { id: "u25c", tipe: "pilihan_ganda", soal: "Manakah yang merupakan kata dasar (tanpa imbuhan)?", opsi: ["menulis", "tulisan", "tulis", "penulis"], jawaban: 2, penjelasan: "'Tulis' bentuk dasarnya." },
    { id: "u25d", tipe: "benar_salah", soal: "Kata dasar dari 'memasak' adalah 'masak'.", opsi: BS, jawaban: "Benar", penjelasan: "me- + masak → memasak." },
    { id: "u25e", tipe: "isi_blank", soal: "Kata dasar dari 'berlarian' adalah ...", jawaban: "lari", penjelasan: "ber-...-an + lari." },
  ]},
  { level: 5, title: "Imbuhan Me-", soal: [
    { id: "u26a", tipe: "pilihan_ganda", soal: "me- + sapu menjadi ...", opsi: ["mesapu", "menyapu", "mensapu", "memsapu"], jawaban: 1, penjelasan: "s luluh menjadi ny: menyapu." },
    { id: "u26b", tipe: "pilihan_ganda", soal: "me- + tulis menjadi ...", opsi: ["metulis", "mentulis", "menulis", "menyulis"], jawaban: 2, penjelasan: "t luluh menjadi n: menulis." },
    { id: "u26c", tipe: "pilihan_ganda", soal: "Bentuk me- yang TIDAK meluluhkan huruf awal adalah ...", opsi: ["me- + baca", "me- + kirim", "me- + pukul", "me- + susun"], jawaban: 0, penjelasan: "b tidak luluh: membaca; k, p, s luluh." },
    { id: "u26d", tipe: "benar_salah", soal: "me- + cuci menjadi 'mencuci'.", opsi: BS, jawaban: "Benar", penjelasan: "c tidak luluh, mendapat sisipan n: mencuci." },
    { id: "u26e", tipe: "isi_blank", soal: "me- + goreng = ...", jawaban: "menggoreng", penjelasan: "g mendapat sisipan ng: menggoreng." },
  ]},
  { level: 5, title: "Imbuhan Ber-", soal: [
    { id: "u27a", tipe: "pilihan_ganda", soal: "ber- + ajar menjadi ...", opsi: ["berajar", "belajar", "berlajar", "beajar"], jawaban: 1, penjelasan: "Bentuk khusus: belajar." },
    { id: "u27b", tipe: "pilihan_ganda", soal: "ber- + kerja menjadi ...", opsi: ["berkerja", "bekerja", "berkeja", "berkerjaan"], jawaban: 1, penjelasan: "r pada 'ber-' hilang: bekerja." },
    { id: "u27c", tipe: "pilihan_ganda", soal: "Makna ber- pada 'bersepeda' adalah ...", opsi: ["memiliki", "menggunakan/mengendarai", "menjadi", "saling"], jawaban: 1, penjelasan: "Bersepeda = mengendarai sepeda." },
    { id: "u27d", tipe: "benar_salah", soal: "'Beranak' berarti mempunyai anak.", opsi: BS, jawaban: "Benar", penjelasan: "ber- bermakna memiliki." },
    { id: "u27e", tipe: "isi_blank", soal: "ber- + baju = ...", jawaban: "berbaju", penjelasan: "Bermakna memakai baju." },
  ]},
  { level: 5, title: "Imbuhan Pe- dan Per-", soal: [
    { id: "u28a", tipe: "pilihan_ganda", soal: "Orang yang menulis disebut ...", opsi: ["tertulis", "penulis", "tulisan", "menulis"], jawaban: 1, penjelasan: "pe- pembentuk pelaku: penulis." },
    { id: "u28b", tipe: "pilihan_ganda", soal: "pe- + lukis menjadi ...", opsi: ["pelukis", "penlukis", "pemlukis", "pelukisan"], jawaban: 0, penjelasan: "l tidak berubah: pelukis." },
    { id: "u28c", tipe: "pilihan_ganda", soal: "Kata 'pedagang' bermakna ...", opsi: ["barang dagangan", "orang yang berdagang", "tempat berdagang", "hasil berdagang"], jawaban: 1, penjelasan: "pe- menyatakan pelaku." },
    { id: "u28d", tipe: "benar_salah", soal: "pe- + karang (mengarang) menjadi 'pengarang'.", opsi: BS, jawaban: "Benar", penjelasan: "k luluh: pengarang." },
    { id: "u28e", tipe: "isi_blank", soal: "Orang yang memancing disebut pe...", jawaban: "pemancing", penjelasan: "pe- + pancing → pemancing (p luluh)." },
  ]},
  { level: 5, title: "Akhiran -kan dan -i", soal: [
    { id: "u29a", tipe: "pilihan_ganda", soal: "'Tolong ... pintu itu!' Bentuk yang tepat: ...", opsi: ["bukakan", "bukai", "membuka", "terbuka"], jawaban: 0, penjelasan: "-kan menyatakan melakukan untuk orang lain: bukakan." },
    { id: "u29b", tipe: "pilihan_ganda", soal: "'Petani ... sawahnya setiap pagi.' Bentuk tepat: ...", opsi: ["mengairkan", "mengairi", "berair", "airkan"], jawaban: 1, penjelasan: "-i menyatakan memberi pada tempat: mengairi sawah." },
    { id: "u29c", tipe: "pilihan_ganda", soal: "Perbedaan 'menanami' dan 'menanamkan': 'menanami' diikuti ...", opsi: ["benda yang ditanam", "tempat yang ditanami", "alat menanam", "waktu menanam"], jawaban: 1, penjelasan: "Menanami kebun (tempat); menanamkan padi (benda)." },
    { id: "u29d", tipe: "benar_salah", soal: "'Ibu membelikan adik sepatu' berarti ibu membeli sepatu UNTUK adik.", opsi: BS, jawaban: "Benar", penjelasan: "-kan bermakna melakukan untuk orang lain." },
    { id: "u29e", tipe: "isi_blank", soal: "'Andi ... surat itu ke dalam amplop.' (masuk + -kan, dengan me-)", jawaban: "memasukkan", penjelasan: "me- + masuk + -kan → memasukkan (dua k)." },
  ]},
  { level: 5, title: "Latihan Cepat Level 5", soal: [
    { id: "u30a", tipe: "pilihan_ganda", soal: "me- + pukul = ...", opsi: ["memukul", "mempukul", "memukulkan", "mepukul"], jawaban: 0, penjelasan: "p luluh: memukul." },
    { id: "u30b", tipe: "pilihan_ganda", soal: "Kata berimbuhan pada 'Adik bermain di halaman' adalah ...", opsi: ["adik", "bermain", "di", "halaman"], jawaban: 1, penjelasan: "ber- + main = bermain." },
    { id: "u30c", tipe: "pilihan_ganda", soal: "Kata dasar 'penggaris' adalah ...", opsi: ["gars", "garis", "penggar", "aris"], jawaban: 1, penjelasan: "pe- + garis → penggaris." },
    { id: "u30d", tipe: "benar_salah", soal: "me- + kejar menjadi 'mengkejar'.", opsi: BS, jawaban: "Salah", penjelasan: "k luluh: mengejar." },
    { id: "u30e", tipe: "isi_blank", soal: "ber- + cita-cita = ...", jawaban: "bercita-cita", penjelasan: "ber- langsung melekat: bercita-cita." },
  ]},

  // ═══════════════ LEVEL 6 — Kalimat ═══════════════
  { level: 6, title: "Subjek dan Predikat", soal: [
    { id: "u31a", tipe: "pilihan_ganda", soal: "Subjek kalimat 'Kucing itu tidur di sofa' adalah ...", opsi: ["tidur", "di sofa", "Kucing itu", "sofa"], jawaban: 2, penjelasan: "Yang melakukan/dibicarakan: kucing itu." },
    { id: "u31b", tipe: "pilihan_ganda", soal: "Predikat kalimat 'Ayah membaca koran' adalah ...", opsi: ["Ayah", "membaca", "koran", "Ayah membaca"], jawaban: 1, penjelasan: "Predikat = tindakan: membaca." },
    { id: "u31c", tipe: "pilihan_ganda", soal: "Kalimat yang TIDAK memiliki subjek jelas adalah ...", opsi: ["Rina menyanyi.", "Dilarang merokok di sini.", "Burung itu terbang.", "Kami belajar."], jawaban: 1, penjelasan: "'Dilarang merokok di sini' tak menyebut pelaku." },
    { id: "u31d", tipe: "benar_salah", soal: "Dalam 'Adik menangis', 'menangis' adalah predikat.", opsi: BS, jawaban: "Benar", penjelasan: "Menangis = tindakan subjek." },
    { id: "u31e", tipe: "isi_blank", soal: "S dan P adalah singkatan dari Subjek dan ...", jawaban: "Predikat", penjelasan: "Unsur inti kalimat: Subjek + Predikat." },
  ]},
  { level: 6, title: "Objek dan Keterangan", soal: [
    { id: "u32a", tipe: "pilihan_ganda", soal: "Objek kalimat 'Ibu memasak rendang di dapur' adalah ...", opsi: ["Ibu", "memasak", "rendang", "di dapur"], jawaban: 2, penjelasan: "Yang dikenai tindakan: rendang." },
    { id: "u32b", tipe: "pilihan_ganda", soal: "'Di dapur' pada kalimat tersebut adalah keterangan ...", opsi: ["waktu", "tempat", "cara", "alat"], jawaban: 1, penjelasan: "'Di dapur' menunjukkan tempat." },
    { id: "u32c", tipe: "pilihan_ganda", soal: "Keterangan WAKTU terdapat pada kalimat ...", opsi: ["Dia menulis dengan pensil.", "Kami berangkat pukul enam.", "Mereka bermain di taman.", "Ia berjalan dengan cepat."], jawaban: 1, penjelasan: "'Pukul enam' = keterangan waktu." },
    { id: "u32d", tipe: "benar_salah", soal: "Kalimat 'Adik menendang bola' memiliki objek.", opsi: BS, jawaban: "Benar", penjelasan: "Objeknya 'bola'." },
    { id: "u32e", tipe: "isi_blank", soal: "'Ayah bekerja ... kantor.' Kata depan penunjuk tempat: ...", jawaban: "di", penjelasan: "Keterangan tempat memakai 'di'." },
  ]},
  { level: 6, title: "Kalimat Efektif", soal: [
    { id: "u33a", tipe: "pilihan_ganda", soal: "Kalimat yang paling efektif adalah ...", opsi: ["Para siswa-siswa berkumpul.", "Semua siswa berkumpul.", "Para semua siswa berkumpul.", "Siswa-siswa semua pada berkumpul."], jawaban: 1, penjelasan: "Tidak ada pengulangan makna: 'Semua siswa berkumpul.'" },
    { id: "u33b", tipe: "pilihan_ganda", soal: "Ciri kalimat efektif adalah ...", opsi: ["panjang dan berbunga-bunga", "hemat kata dan jelas maknanya", "memakai banyak istilah asing", "selalu diawali keterangan"], jawaban: 1, penjelasan: "Efektif = hemat, logis, jelas." },
    { id: "u33c", tipe: "pilihan_ganda", soal: "Perbaikan efektif untuk 'Ia naik ke atas panggung' adalah ...", opsi: ["Ia naik ke atas atas panggung.", "Ia naik panggung ke atas.", "Ia naik ke panggung.", "Ke atas panggung ia naik naik."], jawaban: 2, penjelasan: "'Naik' sudah mengandung arah ke atas." },
    { id: "u33d", tipe: "benar_salah", soal: "'Kami saling bersalaman' adalah kalimat yang hemat kata.", opsi: BS, jawaban: "Salah", penjelasan: "'Bersalaman' sudah bermakna saling; cukup 'Kami bersalaman.'" },
    { id: "u33e", tipe: "isi_blank", soal: "Hematkan: 'mundur ke belakang' cukup ditulis ...", jawaban: "mundur", penjelasan: "'Mundur' sudah berarti bergerak ke belakang." },
  ]},
  { level: 6, title: "Kalimat Tidak Efektif", soal: [
    { id: "u34a", tipe: "pilihan_ganda", soal: "Kalimat TIDAK efektif di bawah ini adalah ...", opsi: ["Rapat dihadiri semua guru.", "Banyak para hadirin yang hadir.", "Kelas dibersihkan setiap pagi.", "Buku itu tebal."], jawaban: 1, penjelasan: "'Banyak', 'para', dan 'hadirin' tumpang tindih makna." },
    { id: "u34b", tipe: "pilihan_ganda", soal: "Kesalahan kalimat 'Kepada para siswa harap berkumpul' adalah ...", opsi: ["tidak punya predikat", "subjek didahului kata depan", "objek ganda", "tidak ada keterangan"], jawaban: 1, penjelasan: "'Kepada' membuat subjek tidak jelas — hapus 'kepada'." },
    { id: "u34c", tipe: "pilihan_ganda", soal: "'Waktu dan tempat kami persilakan.' Kalimat ini salah karena ...", opsi: ["terlalu pendek", "yang dipersilakan seharusnya orang", "tidak ada objek", "memakai kata asing"], jawaban: 1, penjelasan: "Waktu dan tempat tidak bisa dipersilakan; persilakan pembicaranya." },
    { id: "u34d", tipe: "benar_salah", soal: "'Sangat indah sekali' adalah pemborosan kata.", opsi: BS, jawaban: "Benar", penjelasan: "'Sangat' dan 'sekali' dobel — pilih satu." },
    { id: "u34e", tipe: "isi_blank", soal: "Perbaiki: 'demi untuk ibu' cukup ditulis 'demi ...' atau 'untuk ibu'.", jawaban: "ibu", penjelasan: "'Demi' dan 'untuk' tidak dipakai bersamaan." },
  ]},
  { level: 6, title: "Memperbaiki Kalimat", soal: [
    { id: "u35a", tipe: "pilihan_ganda", soal: "Perbaikan terbaik untuk 'Anak-anak itu saling pukul-memukul' adalah ...", opsi: ["Anak-anak itu pukul-memukul.", "Anak-anak itu saling memukul.", "Anak-anak itu saling pukul-pukulan saling.", "Saling anak-anak itu memukul."], jawaban: 1, penjelasan: "Pilih 'saling memukul' ATAU 'pukul-memukul', jangan keduanya." },
    { id: "u35b", tipe: "pilihan_ganda", soal: "Susunan paling baik: 'buku – meja – di – ada – itu – atas'", opsi: ["Buku itu ada di atas meja.", "Meja itu ada di atas buku.", "Di atas buku ada meja itu.", "Ada itu buku meja di atas."], jawaban: 0, penjelasan: "S-P-Ket: Buku itu ada di atas meja." },
    { id: "u35c", tipe: "pilihan_ganda", soal: "'Bagi yang membawa HP harap dimatikan.' Yang seharusnya dimatikan adalah ...", opsi: ["yang membawa", "HP-nya", "pembawanya", "kalimatnya"], jawaban: 1, penjelasan: "Perbaikan: 'HP harap dimatikan' — bukan orangnya." },
    { id: "u35d", tipe: "benar_salah", soal: "'Ibu pergi pasar' sudah merupakan kalimat yang lengkap dan baku.", opsi: BS, jawaban: "Salah", penjelasan: "Perlu kata depan: 'Ibu pergi ke pasar.'" },
    { id: "u35e", tipe: "isi_blank", soal: "Lengkapi agar baku: 'Adik lebih tinggi ... kakak.'", jawaban: "daripada", penjelasan: "Perbandingan memakai 'daripada'." },
  ]},
  { level: 6, title: "Latihan Cepat Level 6", soal: [
    { id: "u36a", tipe: "pilihan_ganda", soal: "Pola kalimat 'Ani membeli buku' adalah ...", opsi: ["S-P", "S-P-O", "S-P-K", "P-S-O"], jawaban: 1, penjelasan: "Ani (S) membeli (P) buku (O)." },
    { id: "u36b", tipe: "pilihan_ganda", soal: "Kalimat efektif yang benar adalah ...", opsi: ["Mereka akan segera akan datang.", "Mereka akan segera datang.", "Mereka segera akan segera datang.", "Akan mereka datang segera akan."], jawaban: 1, penjelasan: "Satu 'akan' cukup." },
    { id: "u36c", tipe: "pilihan_ganda", soal: "Unsur yang WAJIB ada dalam kalimat adalah ...", opsi: ["objek dan keterangan", "subjek dan predikat", "keterangan dan pelengkap", "objek dan pelengkap"], jawaban: 1, penjelasan: "Minimal S dan P." },
    { id: "u36d", tipe: "benar_salah", soal: "'Di taman bermain anak-anak' adalah kalimat lengkap.", opsi: BS, jawaban: "Salah", penjelasan: "Tidak jelas predikatnya — belum kalimat lengkap." },
    { id: "u36e", tipe: "isi_blank", soal: "'Petani menanam padi di sawah.' Objeknya adalah ...", jawaban: "padi", penjelasan: "Yang dikenai tindakan menanam: padi." },
  ]},
];

export const TAMBAHAN_3: UnitSoal[] = [
  // ═══════════════ LEVEL 7 — Kata Depan & Konjungsi ═══════════════
  { level: 7, title: "Kata Depan di, ke, dari", soal: [
    { id: "u37a", tipe: "pilihan_ganda", soal: "Penggunaan kata depan yang benar adalah ...", opsi: ["Ia datang di Surabaya kemarin.", "Ia datang dari Surabaya kemarin.", "Ia datang ke dari Surabaya.", "Ia dari datang Surabaya."], jawaban: 1, penjelasan: "Menyatakan asal memakai 'dari'." },
    { id: "u37b", tipe: "pilihan_ganda", soal: "'Kami berjalan ... sekolah ... rumah nenek.' Pasangan tepat: ...", opsi: ["di – ke", "dari – ke", "ke – dari", "di – dari"], jawaban: 1, penjelasan: "Asal 'dari sekolah', tujuan 'ke rumah nenek'." },
    { id: "u37c", tipe: "pilihan_ganda", soal: "Kata depan 'di' TIDAK tepat pada ...", opsi: ["di rumah", "di sekolah", "di tulis", "di pasar"], jawaban: 2, penjelasan: "'Ditulis' adalah kata kerja pasif — 'di-' serangkai." },
    { id: "u37d", tipe: "benar_salah", soal: "'Ke mana' pada kalimat tanya ditulis terpisah.", opsi: BS, jawaban: "Benar", penjelasan: "'Ke mana' (arah) ditulis dua kata." },
    { id: "u37e", tipe: "isi_blank", soal: "'Buah ini berasal ... Malang.' Kata depan yang tepat: ...", jawaban: "dari", penjelasan: "Asal memakai 'dari'." },
  ]},
  { level: 7, title: "Konjungsi dan, tetapi, karena", soal: [
    { id: "u38a", tipe: "pilihan_ganda", soal: "'Adik rajin, ... kakak pemalas.' Konjungsi paling tepat: ...", opsi: ["dan", "tetapi", "karena", "sehingga"], jawaban: 1, penjelasan: "Pertentangan memakai 'tetapi'." },
    { id: "u38b", tipe: "pilihan_ganda", soal: "'Jalanan licin ... semalam hujan deras.' Konjungsi tepat: ...", opsi: ["tetapi", "atau", "karena", "melainkan"], jawaban: 2, penjelasan: "Hubungan sebab memakai 'karena'." },
    { id: "u38c", tipe: "pilihan_ganda", soal: "Konjungsi 'dan' berfungsi menyatakan ...", opsi: ["pertentangan", "penambahan", "sebab", "pilihan"], jawaban: 1, penjelasan: "'Dan' menambahkan/menggabungkan." },
    { id: "u38d", tipe: "benar_salah", soal: "Kalimat 'Saya suka teh atau kopi' memakai konjungsi pilihan.", opsi: BS, jawaban: "Benar", penjelasan: "'Atau' menyatakan pilihan." },
    { id: "u38e", tipe: "isi_blank", soal: "'Dia pandai ... rendah hati.' Konjungsi penambahan: ...", jawaban: "dan", penjelasan: "Dua sifat dijumlahkan dengan 'dan'." },
  ]},
  { level: 7, title: "Urutan Waktu", soal: [
    { id: "u39a", tipe: "pilihan_ganda", soal: "Kata penanda urutan waktu adalah ...", opsi: ["kemudian", "karena", "walaupun", "supaya"], jawaban: 0, penjelasan: "'Kemudian' menandai urutan peristiwa." },
    { id: "u39b", tipe: "pilihan_ganda", soal: "'... itu, kami makan bersama.' Penanda waktu tepat: ...", opsi: ["Setelah", "Karena", "Meskipun", "Agar"], jawaban: 0, penjelasan: "'Setelah itu' menandai peristiwa berikutnya." },
    { id: "u39c", tipe: "pilihan_ganda", soal: "Urutan yang logis: (1) menguleni adonan (2) menyiapkan bahan (3) memanggang. Urutan benar: ...", opsi: ["1-2-3", "2-1-3", "3-2-1", "2-3-1"], jawaban: 1, penjelasan: "Siapkan bahan → uleni → panggang." },
    { id: "u39d", tipe: "benar_salah", soal: "Kata 'sebelum' dan 'sesudah' adalah penanda urutan waktu.", opsi: BS, jawaban: "Benar", penjelasan: "Keduanya menghubungkan waktu kejadian." },
    { id: "u39e", tipe: "isi_blank", soal: "'Pertama, kedua, ...' Lanjutan urutan yang lazim adalah ke...", jawaban: "ketiga", penjelasan: "Urutan: pertama, kedua, ketiga." },
  ]},
  { level: 7, title: "Sebab Akibat", soal: [
    { id: "u40a", tipe: "pilihan_ganda", soal: "'Banjir melanda desa ... hujan turun tiga hari.' Konjungsi sebab: ...", opsi: ["sehingga", "karena", "tetapi", "lalu"], jawaban: 1, penjelasan: "Sebab mendahului: karena hujan → banjir." },
    { id: "u40b", tipe: "pilihan_ganda", soal: "'Ia belajar giat ... lulus ujian.' Konjungsi akibat/hasil: ...", opsi: ["sehingga", "karena", "sebab", "akibat"], jawaban: 0, penjelasan: "'Sehingga' menandai akibat." },
    { id: "u40c", tipe: "pilihan_ganda", soal: "SEBAB pada 'Karena lupa sarapan, Andi lemas di kelas' adalah ...", opsi: ["Andi lemas", "lupa sarapan", "di kelas", "Andi"], jawaban: 1, penjelasan: "Sebabnya lupa sarapan; akibatnya lemas." },
    { id: "u40d", tipe: "benar_salah", soal: "'Akibatnya' dipakai untuk mengawali kalimat yang menyatakan hasil.", opsi: BS, jawaban: "Benar", penjelasan: "'Akibatnya, ...' menandai akibat dari kalimat sebelumnya." },
    { id: "u40e", tipe: "isi_blank", soal: "'Lantai licin, ... banyak yang terpeleset.' (konjungsi akibat) se...", jawaban: "sehingga", penjelasan: "Akibat ditandai 'sehingga'." },
  ]},
  { level: 7, title: "Menggabungkan Kalimat", soal: [
    { id: "u41a", tipe: "pilihan_ganda", soal: "Gabungan terbaik: 'Rani rajin membaca.' + 'Rani pandai bercerita.'", opsi: ["Rani rajin membaca dan pandai bercerita.", "Rani rajin membaca tetapi Rani pandai bercerita.", "Rani rajin membaca karena pandai bercerita.", "Rani pandai membaca dan rajin bercerita."], jawaban: 0, penjelasan: "Subjek sama → gabung dengan 'dan', subjek tak diulang." },
    { id: "u41b", tipe: "pilihan_ganda", soal: "Gabungan tepat: 'Hari hujan.' + 'Kami tetap berangkat.'", opsi: ["Hari hujan dan kami tetap berangkat.", "Walaupun hari hujan, kami tetap berangkat.", "Hari hujan karena kami tetap berangkat.", "Kami berangkat maka hari hujan."], jawaban: 1, penjelasan: "Pertentangan → 'walaupun'." },
    { id: "u41c", tipe: "pilihan_ganda", soal: "Konjungsi untuk menggabungkan sebab-akibat adalah ...", opsi: ["atau", "sehingga", "padahal", "melainkan"], jawaban: 1, penjelasan: "Sebab → akibat dihubungkan 'sehingga'." },
    { id: "u41d", tipe: "benar_salah", soal: "Dua kalimat dengan subjek sama sebaiknya digabung tanpa mengulang subjek.", opsi: BS, jawaban: "Benar", penjelasan: "Mengulang subjek membuat kalimat boros." },
    { id: "u41e", tipe: "isi_blank", soal: "'Adik menangis ... mainannya rusak.' (konjungsi sebab) ka...", jawaban: "karena", penjelasan: "Sebab: mainan rusak." },
  ]},
  { level: 7, title: "Latihan Cepat Level 7", soal: [
    { id: "u42a", tipe: "pilihan_ganda", soal: "'Buku itu kubeli ... toko dekat stasiun.' Kata depan tepat: ...", opsi: ["ke", "dari", "di", "pada"], jawaban: 2, penjelasan: "Tempat membeli: di toko." },
    { id: "u42b", tipe: "pilihan_ganda", soal: "Konjungsi pertentangan terdapat pada ...", opsi: ["Ia kaya tetapi sederhana.", "Ia kaya dan sederhana.", "Ia kaya karena sederhana.", "Ia kaya atau sederhana."], jawaban: 0, penjelasan: "'Tetapi' menandai pertentangan." },
    { id: "u42c", tipe: "pilihan_ganda", soal: "'Cuci tangan ... makan!' Penanda urutan tepat: ...", opsi: ["sesudah", "sebelum", "ketika", "sambil"], jawaban: 1, penjelasan: "Kebiasaan sehat: cuci tangan sebelum makan." },
    { id: "u42d", tipe: "benar_salah", soal: "'Ke sekolah' pada 'Kami berjalan ke sekolah' ditulis terpisah.", opsi: BS, jawaban: "Benar", penjelasan: "'Ke' kata depan arah — terpisah." },
    { id: "u42e", tipe: "isi_blank", soal: "'Dia tidak datang ... sakit.' (sebab) ...", jawaban: "karena", penjelasan: "Alasan tidak datang: sakit." },
  ]},

  // ═══════════════ LEVEL 8 — Paragraf ═══════════════
  { level: 8, title: "Kalimat Utama", soal: [
    { id: "u43a", tipe: "pilihan_ganda", soal: "Kalimat utama biasanya berisi ...", opsi: ["contoh-contoh", "gagasan pokok paragraf", "data angka", "kutipan tokoh"], jawaban: 1, penjelasan: "Kalimat utama memuat gagasan pokok." },
    { id: "u43b", tipe: "pilihan_ganda", soal: "'Sungai di kota itu tercemar. Airnya hitam. Ikan-ikan mati. Baunya menyengat.' Kalimat utamanya: ...", opsi: ["Airnya hitam.", "Ikan-ikan mati.", "Sungai di kota itu tercemar.", "Baunya menyengat."], jawaban: 2, penjelasan: "Kalimat pertama memayungi ketiga rincian." },
    { id: "u43c", tipe: "pilihan_ganda", soal: "Letak kalimat utama paling umum adalah di ...", opsi: ["awal paragraf", "tengah paragraf", "luar paragraf", "judul"], jawaban: 0, penjelasan: "Umumnya di awal (deduktif), bisa juga di akhir." },
    { id: "u43d", tipe: "benar_salah", soal: "Satu paragraf sebaiknya memiliki satu kalimat utama.", opsi: BS, jawaban: "Benar", penjelasan: "Satu paragraf = satu gagasan pokok." },
    { id: "u43e", tipe: "isi_blank", soal: "Paragraf dengan kalimat utama di AWAL disebut paragraf de...", jawaban: "deduktif", penjelasan: "Deduktif: umum → khusus." },
  ]},
  { level: 8, title: "Gagasan Utama", soal: [
    { id: "u44a", tipe: "pilihan_ganda", soal: "Gagasan utama adalah ...", opsi: ["kalimat pertama paragraf", "ide pokok yang dibahas paragraf", "kata yang sering muncul", "judul bacaan"], jawaban: 1, penjelasan: "Gagasan utama = inti yang dibicarakan." },
    { id: "u44b", tipe: "pilihan_ganda", soal: "'Olahraga membuat badan sehat. Jantung kuat. Otot lentur. Pikiran segar.' Gagasan utamanya: ...", opsi: ["manfaat olahraga bagi kesehatan", "cara melatih otot", "penyakit jantung", "olahraga itu mahal"], jawaban: 0, penjelasan: "Semua kalimat menunjuk manfaat olahraga." },
    { id: "u44c", tipe: "pilihan_ganda", soal: "Cara menemukan gagasan utama adalah ...", opsi: ["menghitung jumlah kata", "mencari kalimat utama lalu meringkas intinya", "membaca judul saja", "melihat gambar"], jawaban: 1, penjelasan: "Temukan kalimat utama, ambil intinya." },
    { id: "u44d", tipe: "benar_salah", soal: "Gagasan utama selalu ditulis persis sama dengan kalimat utama.", opsi: BS, jawaban: "Salah", penjelasan: "Gagasan utama adalah INTI-nya, boleh dirumuskan ulang." },
    { id: "u44e", tipe: "isi_blank", soal: "Gagasan utama disebut juga ide ...", jawaban: "pokok", penjelasan: "Ide pokok = gagasan utama." },
  ]},
  { level: 8, title: "Gagasan Pendukung", soal: [
    { id: "u45a", tipe: "pilihan_ganda", soal: "Fungsi gagasan pendukung adalah ...", opsi: ["mengganti gagasan utama", "memperjelas gagasan utama", "menutup paragraf", "membuka bacaan"], jawaban: 1, penjelasan: "Pendukung merinci/menjelaskan gagasan utama." },
    { id: "u45b", tipe: "pilihan_ganda", soal: "'Pasar itu ramai. Pedagang berteriak menawarkan dagangan. Pembeli menawar harga.' Gagasan PENDUKUNG-nya: ...", opsi: ["Pasar itu ramai", "Pedagang berteriak dan pembeli menawar", "Pasar itu sepi", "Harga naik"], jawaban: 1, penjelasan: "Rincian keramaian: pedagang berteriak, pembeli menawar." },
    { id: "u45c", tipe: "pilihan_ganda", soal: "Gagasan pendukung biasanya berupa ...", opsi: ["contoh, rincian, atau alasan", "judul dan subjudul", "kesimpulan akhir", "daftar pustaka"], jawaban: 0, penjelasan: "Bentuknya contoh, data, rincian, alasan." },
    { id: "u45d", tipe: "benar_salah", soal: "Satu paragraf boleh memiliki beberapa gagasan pendukung.", opsi: BS, jawaban: "Benar", penjelasan: "Pendukung boleh banyak; gagasan utama satu." },
    { id: "u45e", tipe: "isi_blank", soal: "Kalimat yang memuat gagasan pendukung disebut kalimat pen...", jawaban: "penjelas", penjelasan: "Kalimat penjelas mendukung kalimat utama." },
  ]},
  { level: 8, title: "Urutan Paragraf", soal: [
    { id: "u46a", tipe: "pilihan_ganda", soal: "Urutan logis: (1) Akhirnya kue matang. (2) Ibu menyiapkan bahan. (3) Adonan dipanggang. Urutan benar: ...", opsi: ["1-2-3", "2-3-1", "3-1-2", "2-1-3"], jawaban: 1, penjelasan: "Siapkan → panggang → matang." },
    { id: "u46b", tipe: "pilihan_ganda", soal: "Paragraf yang baik memiliki kalimat-kalimat yang ...", opsi: ["saling berkaitan", "berdiri sendiri-sendiri", "bertentangan", "sama persis"], jawaban: 0, penjelasan: "Antar kalimat harus padu (koheren)." },
    { id: "u46c", tipe: "pilihan_ganda", soal: "Kata yang membantu keruntutan antarkalimat adalah ...", opsi: ["selanjutnya", "kucing", "meja", "merah"], jawaban: 0, penjelasan: "'Selanjutnya' penghubung antarkalimat." },
    { id: "u46d", tipe: "benar_salah", soal: "Paragraf cerita biasanya disusun menurut urutan waktu.", opsi: BS, jawaban: "Benar", penjelasan: "Narasi mengikuti kronologi." },
    { id: "u46e", tipe: "isi_blank", soal: "Keterpaduan antarkalimat dalam paragraf disebut ko...", jawaban: "koherensi", penjelasan: "Koherensi = kepaduan makna." },
  ]},
  { level: 8, title: "Menyusun Paragraf Pendek", soal: [
    { id: "u47a", tipe: "pilihan_ganda", soal: "Langkah PERTAMA menyusun paragraf adalah ...", opsi: ["menulis kalimat penjelas", "menentukan gagasan utama", "membuat judul panjang", "menghitung kata"], jawaban: 1, penjelasan: "Mulai dari gagasan utama." },
    { id: "u47b", tipe: "pilihan_ganda", soal: "Kalimat pembuka paragraf tentang 'manfaat menabung' yang paling tepat: ...", opsi: ["Menabung memiliki banyak manfaat.", "Harga bakso naik.", "Adik suka bermain bola.", "Sekolah libur besok."], jawaban: 0, penjelasan: "Langsung menyatakan gagasan utamanya." },
    { id: "u47c", tipe: "pilihan_ganda", soal: "Kalimat yang TIDAK padu dalam paragraf tentang banjir adalah ...", opsi: ["Hujan deras menyebabkan banjir.", "Sampah menyumbat selokan.", "Kakak suka menyanyi dangdut.", "Air menggenangi jalan."], jawaban: 2, penjelasan: "Menyanyi dangdut tak berkaitan dengan banjir." },
    { id: "u47d", tipe: "benar_salah", soal: "Paragraf yang baik cukup terdiri dari gagasan utama tanpa penjelas.", opsi: BS, jawaban: "Salah", penjelasan: "Perlu kalimat penjelas agar utuh." },
    { id: "u47e", tipe: "isi_blank", soal: "Paragraf umumnya diawali penulisan yang menjorok ke ...", jawaban: "dalam", penjelasan: "Baris pertama paragraf menjorok ke dalam." },
  ]},
  { level: 8, title: "Latihan Cepat Level 8", soal: [
    { id: "u48a", tipe: "pilihan_ganda", soal: "Inti sebuah paragraf disebut ...", opsi: ["gagasan utama", "kalimat penjelas", "tanda baca", "catatan kaki"], jawaban: 0, penjelasan: "Gagasan utama = inti paragraf." },
    { id: "u48b", tipe: "pilihan_ganda", soal: "Kalimat utama di AKHIR paragraf disebut paragraf ...", opsi: ["deduktif", "induktif", "campuran", "naratif"], jawaban: 1, penjelasan: "Induktif: khusus → umum." },
    { id: "u48c", tipe: "pilihan_ganda", soal: "'Selain itu' berfungsi untuk ...", opsi: ["menambah informasi", "menyatakan sebab", "mengakhiri cerita", "menyatakan waktu"], jawaban: 0, penjelasan: "Menambahkan poin baru yang sejalan." },
    { id: "u48d", tipe: "benar_salah", soal: "Kalimat penjelas boleh bertentangan dengan gagasan utama.", opsi: BS, jawaban: "Salah", penjelasan: "Penjelas harus mendukung, bukan bertentangan." },
    { id: "u48e", tipe: "isi_blank", soal: "Paragraf deduktif meletakkan kalimat utama di ...", jawaban: "awal", penjelasan: "Deduktif = kalimat utama di awal." },
  ]},

  // ═══════════════ LEVEL 9 — Membaca Pemahaman ═══════════════
  { level: 9, title: "Informasi Tersurat", soal: [
    { id: "u49a", tipe: "pilihan_ganda", soal: "'Pasar Minggu buka pukul 05.00 dan tutup pukul 17.00.' Informasi tersurat: ...", opsi: ["pasar selalu ramai", "pasar buka 12 jam", "pasar buka pukul 05.00", "pedagangnya banyak"], jawaban: 2, penjelasan: "Jam buka tertulis langsung; pilihan lain simpulan." },
    { id: "u49b", tipe: "pilihan_ganda", soal: "Informasi tersurat adalah informasi yang ...", opsi: ["tertulis langsung dalam teks", "harus ditebak pembaca", "ada di judul saja", "disampaikan lisan"], jawaban: 0, penjelasan: "Tersurat = tertulis secara eksplisit." },
    { id: "u49c", tipe: "pilihan_ganda", soal: "'Andi lahir di Medan pada 3 Mei 2013.' Yang TIDAK tersurat: ...", opsi: ["tempat lahir Andi", "tanggal lahir Andi", "umur Andi sekarang", "nama anak itu"], jawaban: 2, penjelasan: "Umur harus dihitung — tidak tertulis." },
    { id: "u49d", tipe: "benar_salah", soal: "Menjawab pertanyaan tersurat cukup dengan mencari kalimatnya di teks.", opsi: BS, jawaban: "Benar", penjelasan: "Jawabannya tertera langsung." },
    { id: "u49e", tipe: "isi_blank", soal: "Informasi yang tertulis langsung disebut informasi ter...", jawaban: "tersurat", penjelasan: "Tersurat = eksplisit." },
  ]},
  { level: 9, title: "Informasi Tersirat", soal: [
    { id: "u50a", tipe: "pilihan_ganda", soal: "'Rina memakai payung dan jas hujan.' Simpulan tersirat: ...", opsi: ["hari sedang panas", "kemungkinan hari hujan", "Rina mau berenang", "payungnya baru"], jawaban: 1, penjelasan: "Payung + jas hujan → tersirat hujan." },
    { id: "u50b", tipe: "pilihan_ganda", soal: "'Budi menguap berkali-kali dan matanya sayu.' Tersirat bahwa Budi ...", opsi: ["mengantuk", "lapar", "gembira", "kedinginan"], jawaban: 0, penjelasan: "Menguap + mata sayu → mengantuk." },
    { id: "u50c", tipe: "pilihan_ganda", soal: "Informasi tersirat ditemukan dengan cara ...", opsi: ["membaca judul", "menyimpulkan dari petunjuk dalam teks", "menghafal teks", "melihat jumlah paragraf"], jawaban: 1, penjelasan: "Disimpulkan dari petunjuk, tidak tertulis langsung." },
    { id: "u50d", tipe: "benar_salah", soal: "'Piring-piring kotor menumpuk di dapur' menyiratkan belum dicuci.", opsi: BS, jawaban: "Benar", penjelasan: "Menumpuk & kotor → belum dicuci." },
    { id: "u50e", tipe: "isi_blank", soal: "Informasi yang harus disimpulkan pembaca disebut informasi ter...", jawaban: "tersirat", penjelasan: "Tersirat = implisit." },
  ]},
  { level: 9, title: "Menjawab Pertanyaan Teks", soal: [
    { id: "u51a", tipe: "pilihan_ganda", soal: "Pertanyaan 'mengapa' menanyakan ...", opsi: ["tempat", "alasan/sebab", "waktu", "pelaku"], jawaban: 1, penjelasan: "'Mengapa' → alasan." },
    { id: "u51b", tipe: "pilihan_ganda", soal: "'Bagaimana cara membuat layang-layang?' Jawaban yang tepat berupa ...", opsi: ["nama pembuatnya", "langkah-langkah membuatnya", "harga layang-layang", "warna layang-layang"], jawaban: 1, penjelasan: "'Bagaimana' → proses/cara." },
    { id: "u51c", tipe: "pilihan_ganda", soal: "'Kapan Indonesia merdeka?' Kata tanya ini meminta jawaban berupa ...", opsi: ["nama tokoh", "alasan", "waktu", "tempat"], jawaban: 2, penjelasan: "'Kapan' → waktu: 17 Agustus 1945." },
    { id: "u51d", tipe: "benar_salah", soal: "Jawaban pertanyaan 'siapa' berupa nama orang atau pelaku.", opsi: BS, jawaban: "Benar", penjelasan: "'Siapa' menanyakan orang." },
    { id: "u51e", tipe: "isi_blank", soal: "Kata tanya untuk menanyakan TEMPAT adalah di ...", jawaban: "mana", penjelasan: "'Di mana' → tempat." },
  ]},
  { level: 9, title: "Menemukan Tujuan Teks", soal: [
    { id: "u52a", tipe: "pilihan_ganda", soal: "Teks berisi langkah-langkah bertujuan untuk ...", opsi: ["menghibur", "memberi petunjuk melakukan sesuatu", "mengkritik", "mengeluh"], jawaban: 1, penjelasan: "Teks prosedur memandu pembaca." },
    { id: "u52b", tipe: "pilihan_ganda", soal: "'Ayo hemat listrik mulai hari ini!' Tujuan kalimat itu: ...", opsi: ["melaporkan", "mengajak", "menanyakan", "mendata"], jawaban: 1, penjelasan: "Kalimat persuasif — mengajak." },
    { id: "u52c", tipe: "pilihan_ganda", soal: "Teks yang menceritakan pengalaman lucu bertujuan ...", opsi: ["menghibur pembaca", "memberi perintah", "menjual barang", "meminta maaf"], jawaban: 0, penjelasan: "Cerita lucu untuk hiburan." },
    { id: "u52d", tipe: "benar_salah", soal: "Iklan bertujuan memengaruhi pembaca agar membeli atau memakai sesuatu.", opsi: BS, jawaban: "Benar", penjelasan: "Iklan bersifat persuasif." },
    { id: "u52e", tipe: "isi_blank", soal: "Teks yang bertujuan mengajak disebut teks per...", jawaban: "persuasif", penjelasan: "Persuasif = membujuk/mengajak." },
  ]},
  { level: 9, title: "Menyimpulkan Isi Teks", soal: [
    { id: "u53a", tipe: "pilihan_ganda", soal: "Simpulan yang baik dibuat berdasarkan ...", opsi: ["pendapat pribadi tanpa dasar", "keseluruhan isi teks", "satu kata pertama", "gambar sampul"], jawaban: 1, penjelasan: "Simpulan merangkum keseluruhan isi." },
    { id: "u53b", tipe: "pilihan_ganda", soal: "'Daun mulai menguning. Sawah retak-retak. Sumur mengering.' Simpulan paling tepat: ...", opsi: ["musim hujan tiba", "sedang musim kemarau panjang", "panen berlimpah", "banjir melanda"], jawaban: 1, penjelasan: "Semua tanda menunjuk kekeringan/kemarau." },
    { id: "u53c", tipe: "pilihan_ganda", soal: "Kalimat simpulan biasanya diawali kata ...", opsi: ["jadi", "ketika", "di", "yang"], jawaban: 0, penjelasan: "'Jadi, ...' lazim mengawali simpulan." },
    { id: "u53d", tipe: "benar_salah", soal: "Simpulan boleh bertentangan dengan isi teks.", opsi: BS, jawaban: "Salah", penjelasan: "Simpulan harus sesuai isi teks." },
    { id: "u53e", tipe: "isi_blank", soal: "Merangkum inti bacaan menjadi pernyataan akhir disebut me...", jawaban: "menyimpulkan", penjelasan: "Itulah kegiatan menyimpulkan." },
  ]},
  { level: 9, title: "Latihan Cepat Level 9", soal: [
    { id: "u54a", tipe: "pilihan_ganda", soal: "Informasi 'harga tiket Rp10.000' dalam pengumuman bersifat ...", opsi: ["tersirat", "tersurat", "tersembunyi", "kiasan"], jawaban: 1, penjelasan: "Tertulis langsung = tersurat." },
    { id: "u54b", tipe: "pilihan_ganda", soal: "'Lantai basah dan ada ember serta pel.' Tersirat bahwa ...", opsi: ["lantai baru dipel", "sedang hujan di dalam", "ember bocor", "rumah kosong"], jawaban: 0, penjelasan: "Petunjuk mengarah ke lantai baru dipel." },
    { id: "u54c", tipe: "pilihan_ganda", soal: "Pertanyaan yang jawabannya ADA di teks disebut pertanyaan ...", opsi: ["tersurat", "khayalan", "pancingan", "retoris"], jawaban: 0, penjelasan: "Jawaban tertulis → tersurat." },
    { id: "u54d", tipe: "benar_salah", soal: "Tujuan teks laporan adalah menyampaikan informasi apa adanya.", opsi: BS, jawaban: "Benar", penjelasan: "Laporan bersifat informatif-objektif." },
    { id: "u54e", tipe: "isi_blank", soal: "'Jadi, menabung itu penting.' Kalimat ini merupakan ...", jawaban: "simpulan", penjelasan: "Diawali 'jadi' dan merangkum isi." },
  ]},
];

export const TAMBAHAN_4: UnitSoal[] = [
  // ═══════════════ LEVEL 10 — Fakta, Opini & Nalar ═══════════════
  { level: 10, title: "Fakta dan Opini", soal: [
    { id: "u55a", tipe: "pilihan_ganda", soal: "Kalimat FAKTA adalah ...", opsi: ["Bakso buatan Bu Sri paling enak sedunia.", "Indonesia terdiri atas ribuan pulau.", "Sepertinya besok akan hujan.", "Film itu sangat membosankan."], jawaban: 1, penjelasan: "Dapat dibuktikan kebenarannya — fakta." },
    { id: "u55b", tipe: "pilihan_ganda", soal: "Ciri kalimat OPINI adalah ...", opsi: ["berisi data yang bisa diuji", "mengandung penilaian pribadi", "memuat angka statistik resmi", "dikutip dari kamus"], jawaban: 1, penjelasan: "Opini = pendapat/penilaian subjektif." },
    { id: "u55c", tipe: "pilihan_ganda", soal: "Kata yang sering menandai OPINI adalah ...", opsi: ["menurut saya", "berdasarkan sensus", "tercatat pada", "sebanyak 100"], jawaban: 0, penjelasan: "'Menurut saya' menandai pendapat." },
    { id: "u55d", tipe: "benar_salah", soal: "'Air mendidih pada suhu 100°C di tekanan normal' adalah fakta.", opsi: BS, jawaban: "Benar", penjelasan: "Dapat diuji secara ilmiah." },
    { id: "u55e", tipe: "isi_blank", soal: "Pernyataan yang kebenarannya bisa dibuktikan disebut ...", jawaban: "fakta", penjelasan: "Fakta dapat diverifikasi." },
  ]},
  { level: 10, title: "Alasan dan Bukti", soal: [
    { id: "u56a", tipe: "pilihan_ganda", soal: "Pendapat menjadi kuat apabila disertai ...", opsi: ["suara keras", "bukti dan alasan yang masuk akal", "kata-kata panjang", "gambar lucu"], jawaban: 1, penjelasan: "Argumen kuat = pendapat + bukti + alasan." },
    { id: "u56b", tipe: "pilihan_ganda", soal: "'Sekolah perlu kantin sehat KARENA banyak siswa jajan sembarangan.' Bagian setelah KARENA adalah ...", opsi: ["pendapat", "alasan", "judul", "kesimpulan"], jawaban: 1, penjelasan: "Alasan yang mendukung pendapat." },
    { id: "u56c", tipe: "pilihan_ganda", soal: "Bukti paling kuat untuk 'membaca meningkatkan kosakata' adalah ...", opsi: ["kata teman sebangku", "hasil penelitian yang membandingkan dua kelompok", "perasaan penulis", "iklan buku"], jawaban: 1, penjelasan: "Penelitian > kesan pribadi." },
    { id: "u56d", tipe: "benar_salah", soal: "'Pokoknya aku benar!' adalah contoh argumen yang baik.", opsi: BS, jawaban: "Salah", penjelasan: "Tanpa alasan/bukti — bukan argumen baik." },
    { id: "u56e", tipe: "isi_blank", soal: "Pendapat + ... + bukti = argumen yang kuat. (kata: al...)", jawaban: "alasan", penjelasan: "Alasan menjembatani pendapat dan bukti." },
  ]},
  { level: 10, title: "Sebab dan Akibat", soal: [
    { id: "u57a", tipe: "pilihan_ganda", soal: "'Karena membuang sampah ke sungai, warga kebanjiran.' AKIBATNYA adalah ...", opsi: ["membuang sampah", "warga kebanjiran", "sungai", "warga"], jawaban: 1, penjelasan: "Akibat: kebanjiran." },
    { id: "u57b", tipe: "pilihan_ganda", soal: "Pasangan sebab→akibat yang LOGIS adalah ...", opsi: ["belajar rajin → nilai membaik", "makan bakso → bisa terbang", "tidur cepat → jadi kaya raya", "minum air → pandai melukis"], jawaban: 0, penjelasan: "Hubungan yang masuk akal." },
    { id: "u57c", tipe: "pilihan_ganda", soal: "Satu akibat bisa memiliki ...", opsi: ["hanya satu sebab", "lebih dari satu sebab", "sebab dari masa depan", "tanpa sebab"], jawaban: 1, penjelasan: "Banjir mis. disebabkan hujan + sampah + resapan hilang." },
    { id: "u57d", tipe: "benar_salah", soal: "Dua hal yang terjadi berurutan PASTI berhubungan sebab-akibat.", opsi: BS, jawaban: "Salah", penjelasan: "Urutan waktu ≠ hubungan sebab-akibat." },
    { id: "u57e", tipe: "isi_blank", soal: "'Akibat begadang, Dodi ... di kelas.' (kata: mengan...)", jawaban: "mengantuk", penjelasan: "Begadang → mengantuk." },
  ]},
  { level: 10, title: "Membandingkan Informasi", soal: [
    { id: "u58a", tipe: "pilihan_ganda", soal: "Toko A: buku Rp15.000. Toko B: buku sama Rp12.000. Simpulan perbandingan: ...", opsi: ["Toko A lebih murah", "Toko B lebih murah", "harganya sama", "keduanya gratis"], jawaban: 1, penjelasan: "12.000 < 15.000." },
    { id: "u58b", tipe: "pilihan_ganda", soal: "Kata yang lazim untuk membandingkan adalah ...", opsi: ["lebih ... daripada ...", "karena ... maka ...", "ketika ... lalu ...", "agar ... supaya ..."], jawaban: 0, penjelasan: "Perbandingan: lebih X daripada Y." },
    { id: "u58c", tipe: "pilihan_ganda", soal: "Dua teks tentang banjir: Teks 1 menyalahkan hujan; Teks 2 menyoroti sampah. Perbedaannya pada ...", opsi: ["topik", "sudut pandang penyebab", "bahasa daerah", "jumlah kata"], jawaban: 1, penjelasan: "Topik sama, sudut pandang beda." },
    { id: "u58d", tipe: "benar_salah", soal: "Membandingkan berarti mencari persamaan DAN perbedaan.", opsi: BS, jawaban: "Benar", penjelasan: "Keduanya bagian dari membandingkan." },
    { id: "u58e", tipe: "isi_blank", soal: "'Kereta lebih cepat ... bus.' Kata pembanding: ...", jawaban: "daripada", penjelasan: "lebih ... daripada ..." },
  ]},
  { level: 10, title: "Menilai Pernyataan", soal: [
    { id: "u59a", tipe: "pilihan_ganda", soal: "'Minum es menyebabkan flu.' Penilaian paling tepat: ...", opsi: ["pasti benar", "perlu diuji — flu disebabkan virus", "benar karena kata nenek", "benar jika esnya banyak"], jawaban: 1, penjelasan: "Flu disebabkan virus; klaim itu keliru kaprah." },
    { id: "u59b", tipe: "pilihan_ganda", soal: "Sebelum memercayai kabar di grup chat, sebaiknya ...", opsi: ["langsung sebarkan", "periksa sumber resminya", "tambahkan bumbu cerita", "hapus semua chat"], jawaban: 1, penjelasan: "Verifikasi dulu — lawan hoaks." },
    { id: "u59c", tipe: "pilihan_ganda", soal: "Sumber yang paling dapat dipercaya untuk data penduduk adalah ...", opsi: ["BPS (Badan Pusat Statistik)", "status media sosial", "kata orang di pasar", "tebak-tebakan"], jawaban: 0, penjelasan: "Lembaga resmi > kabar angin." },
    { id: "u59d", tipe: "benar_salah", soal: "Judul berita yang bombastis selalu berisi kebenaran.", opsi: BS, jawaban: "Salah", penjelasan: "Judul clickbait sering menyesatkan." },
    { id: "u59e", tipe: "isi_blank", soal: "Berita bohong disebut ho...", jawaban: "hoaks", penjelasan: "Hoaks = kabar bohong." },
  ]},
  { level: 10, title: "Latihan Cepat Level 10", soal: [
    { id: "u60a", tipe: "pilihan_ganda", soal: "'Menurutku film itu jelek.' Kalimat ini termasuk ...", opsi: ["fakta", "opini", "data", "definisi"], jawaban: 1, penjelasan: "Penilaian pribadi = opini." },
    { id: "u60b", tipe: "pilihan_ganda", soal: "'Gempa berkekuatan 5,6 SR terjadi pukul 14.20.' Ini termasuk ...", opsi: ["opini", "fakta", "saran", "harapan"], jawaban: 1, penjelasan: "Terukur dan tercatat = fakta." },
    { id: "u60c", tipe: "pilihan_ganda", soal: "Agar pendapat diterima, sertakan ...", opsi: ["ancaman", "alasan dan bukti", "suara paling keras", "kata kasar"], jawaban: 1, penjelasan: "Argumen sehat: alasan + bukti." },
    { id: "u60d", tipe: "benar_salah", soal: "Membaca dua sumber membuat penilaian kita lebih adil.", opsi: BS, jawaban: "Benar", penjelasan: "Beragam sumber = sudut pandang seimbang." },
    { id: "u60e", tipe: "isi_blank", soal: "Lawan dari fakta adalah ...", jawaban: "opini", penjelasan: "Fakta objektif; opini subjektif." },
  ]},

  // ═══════════════ LEVEL 11 — Menulis Ringkas ═══════════════
  { level: 11, title: "Menulis Kalimat Pendek", soal: [
    { id: "u61a", tipe: "pilihan_ganda", soal: "Kalimat paling ringkas dan tetap jelas adalah ...", opsi: ["Dia melakukan kegiatan berlari.", "Dia berlari.", "Dia melakukan aktivitas gerakan lari.", "Kegiatan berlari dilakukan oleh dia."], jawaban: 1, penjelasan: "'Dia berlari' — padat dan jelas." },
    { id: "u61b", tipe: "pilihan_ganda", soal: "Ubah menjadi ringkas: 'Mengalami kenaikan' = ...", opsi: ["naik", "menaiki", "kenaikan naik", "dinaik-naikkan"], jawaban: 0, penjelasan: "'Mengalami kenaikan' cukup 'naik'." },
    { id: "u61c", tipe: "pilihan_ganda", soal: "Kalimat pendek yang efektif tetap harus memiliki ...", opsi: ["subjek dan predikat", "minimal 15 kata", "tiga keterangan", "kata asing"], jawaban: 0, penjelasan: "Pendek boleh, S-P wajib." },
    { id: "u61d", tipe: "benar_salah", soal: "Kalimat panjang selalu lebih baik daripada kalimat pendek.", opsi: BS, jawaban: "Salah", penjelasan: "Yang terbaik adalah yang jelas — sering kali pendek." },
    { id: "u61e", tipe: "isi_blank", soal: "Ringkas: 'memberikan pertolongan' = me...", jawaban: "menolong", penjelasan: "Satu kata: menolong." },
  ]},
  { level: 11, title: "Membuat Ringkasan", soal: [
    { id: "u62a", tipe: "pilihan_ganda", soal: "Langkah pertama membuat ringkasan adalah ...", opsi: ["menyalin semua kalimat", "membaca teks sampai paham", "menghapus judul", "menambah opini pribadi"], jawaban: 1, penjelasan: "Pahami dulu, baru ringkas." },
    { id: "u62b", tipe: "pilihan_ganda", soal: "Yang dipertahankan dalam ringkasan adalah ...", opsi: ["semua contoh", "gagasan-gagasan pokok", "semua angka", "kata sambutan"], jawaban: 1, penjelasan: "Ringkasan = gagasan pokok saja." },
    { id: "u62c", tipe: "pilihan_ganda", soal: "Ringkasan yang baik ...", opsi: ["mengubah maksud penulis", "jauh lebih pendek dan setia pada isi", "lebih panjang dari asli", "berisi pendapat peringkas"], jawaban: 1, penjelasan: "Pendek tapi setia isi." },
    { id: "u62d", tipe: "benar_salah", soal: "Menambahkan pendapat pribadi ke dalam ringkasan diperbolehkan.", opsi: BS, jawaban: "Salah", penjelasan: "Ringkasan tidak memuat opini peringkas." },
    { id: "u62e", tipe: "isi_blank", soal: "Ringkasan disusun berdasarkan gagasan ...", jawaban: "pokok", penjelasan: "Dari gagasan pokok tiap paragraf." },
  ]},
  { level: 11, title: "Memilih Judul", soal: [
    { id: "u63a", tipe: "pilihan_ganda", soal: "Judul yang baik harus ...", opsi: ["mencerminkan isi", "sepanjang mungkin", "tidak berhubungan dengan isi", "memuat semua nama tokoh"], jawaban: 0, penjelasan: "Judul = wajah isi." },
    { id: "u63b", tipe: "pilihan_ganda", soal: "Teks tentang cara merawat kucing paling cocok berjudul ...", opsi: ["Kucing Tetangga Galak", "Tips Merawat Kucing di Rumah", "Harga Pasir Naik", "Kucingku Hilang"], jawaban: 1, penjelasan: "Sesuai isi: cara merawat." },
    { id: "u63c", tipe: "pilihan_ganda", soal: "Penulisan judul yang benar adalah ...", opsi: ["Berlibur ke pantai selatan", "Berlibur Ke Pantai Selatan", "Berlibur ke Pantai Selatan", "berlibur ke pantai selatan"], jawaban: 2, penjelasan: "Kata tugas seperti 'ke' tidak dikapitalkan di judul." },
    { id: "u63d", tipe: "benar_salah", soal: "Judul boleh berupa pertanyaan.", opsi: BS, jawaban: "Benar", penjelasan: "Mis. 'Mengapa Langit Biru?' — sah." },
    { id: "u63e", tipe: "isi_blank", soal: "Judul ditulis di bagian ... tulisan.", jawaban: "atas", penjelasan: "Judul di bagian atas/awal." },
  ]},
  { level: 11, title: "Menghapus Kata Berlebihan", soal: [
    { id: "u64a", tipe: "pilihan_ganda", soal: "Kata berlebihan pada 'Ia masuk ke dalam kelas' adalah ...", opsi: ["ia", "masuk", "ke dalam", "kelas"], jawaban: 2, penjelasan: "'Masuk' sudah berarti ke dalam: 'Ia masuk kelas.'" },
    { id: "u64b", tipe: "pilihan_ganda", soal: "Bentuk hemat dari 'para bapak-bapak' adalah ...", opsi: ["para bapak", "bapak-bapak para", "para para bapak", "bapak-bapaknya para"], jawaban: 0, penjelasan: "'Para' sudah jamak — 'para bapak' atau 'bapak-bapak'." },
    { id: "u64c", tipe: "pilihan_ganda", soal: "'Sejak dari pagi ia menunggu.' Perbaikan: ...", opsi: ["Sejak pagi ia menunggu.", "Dari sejak pagi ia menunggu.", "Sejak dari tadi pagi ia menunggu.", "Ia menunggu sejak dari."], jawaban: 0, penjelasan: "'Sejak' dan 'dari' dobel — pilih satu." },
    { id: "u64d", tipe: "benar_salah", soal: "'Naik ke atas' adalah bentuk yang hemat.", opsi: BS, jawaban: "Salah", penjelasan: "'Naik' sudah ke atas." },
    { id: "u64e", tipe: "isi_blank", soal: "Hematkan: 'agar supaya' cukup ditulis ...", jawaban: "agar", penjelasan: "'Agar' atau 'supaya' — jangan keduanya." },
  ]},
  { level: 11, title: "Menulis Pesan yang Jelas", soal: [
    { id: "u65a", tipe: "pilihan_ganda", soal: "Pesan singkat yang paling jelas untuk izin tidak masuk: ...", opsi: ["Bu, saya besok.", "Bu, saya izin tidak masuk besok karena demam. — Raka 6B", "besok ga bisa pokoknya", "Saya sakit kayaknya mungkin."], jawaban: 1, penjelasan: "Lengkap: siapa, kapan, mengapa." },
    { id: "u65b", tipe: "pilihan_ganda", soal: "Unsur penting pesan izin adalah ...", opsi: ["nama, keperluan, waktu", "warna kesukaan", "lagu favorit", "merek HP"], jawaban: 0, penjelasan: "Identitas + maksud + waktu." },
    { id: "u65c", tipe: "pilihan_ganda", soal: "Bahasa pesan kepada guru sebaiknya ...", opsi: ["gaul dan singkat-singkat", "santun dan jelas", "penuh singkatan", "huruf besar semua"], jawaban: 1, penjelasan: "Kepada guru: santun, jelas." },
    { id: "u65d", tipe: "benar_salah", soal: "Menyebut nama pengirim di akhir pesan memudahkan penerima.", opsi: BS, jawaban: "Benar", penjelasan: "Penerima langsung tahu pengirimnya." },
    { id: "u65e", tipe: "isi_blank", soal: "Pesan yang baik itu singkat, jelas, dan ...", jawaban: "santun", penjelasan: "Singkat, jelas, santun." },
  ]},
  { level: 11, title: "Latihan Cepat Level 11", soal: [
    { id: "u66a", tipe: "pilihan_ganda", soal: "Ringkasan berbeda dari teks asli dalam hal ...", opsi: ["panjangnya", "bahasanya harus Inggris", "isinya boleh melenceng", "hurufnya"], jawaban: 0, penjelasan: "Jauh lebih pendek, isi tetap setia." },
    { id: "u66b", tipe: "pilihan_ganda", soal: "Kalimat paling hemat: ...", opsi: ["Banyak siswa-siswa hadir.", "Banyak siswa hadir.", "Para banyak siswa hadir.", "Siswa banyak-banyak hadir."], jawaban: 1, penjelasan: "'Banyak' tak perlu bentuk ulang." },
    { id: "u66c", tipe: "pilihan_ganda", soal: "Judul untuk laporan pengamatan pertumbuhan kecambah: ...", opsi: ["Kecambah dan Kehidupanku", "Laporan Pengamatan Pertumbuhan Kecambah", "Aku Suka Sayur", "Kacang Hijau Mahal"], jawaban: 1, penjelasan: "Sesuai isi laporan." },
    { id: "u66d", tipe: "benar_salah", soal: "'Sangat baik sekali' adalah bentuk yang hemat.", opsi: BS, jawaban: "Salah", penjelasan: "'Sangat' dan 'sekali' dobel." },
    { id: "u66e", tipe: "isi_blank", soal: "Sebelum meringkas, kita harus ... teks dengan cermat.", jawaban: "membaca", penjelasan: "Membaca sampai paham dulu." },
  ]},

  // ═══════════════ LEVEL 12 — Mahir ═══════════════
  { level: 12, title: "Membaca Teks Panjang", soal: [
    { id: "u67a", tipe: "pilihan_ganda", soal: "Strategi membaca teks panjang yang efektif adalah ...", opsi: ["membaca kata demi kata sambil dieja", "membaca sekilas dulu untuk gambaran umum, lalu membaca teliti", "membaca dari halaman terakhir saja", "menghafal semua kalimat"], jawaban: 1, penjelasan: "Skimming dulu, lalu membaca intensif." },
    { id: "u67b", tipe: "pilihan_ganda", soal: "Membaca cepat untuk menemukan informasi tertentu disebut ...", opsi: ["scanning", "mengeja", "menyalin", "menghafal"], jawaban: 0, penjelasan: "Scanning = memindai info spesifik." },
    { id: "u67c", tipe: "pilihan_ganda", soal: "Saat menemukan kata sulit dalam teks, langkah terbaik adalah ...", opsi: ["berhenti membaca selamanya", "menebak dari konteks lalu cek KBBI", "melewati seluruh halaman", "mengganti bukunya"], jawaban: 1, penjelasan: "Konteks + kamus." },
    { id: "u67d", tipe: "benar_salah", soal: "Membuat catatan kecil membantu memahami teks panjang.", opsi: BS, jawaban: "Benar", penjelasan: "Mencatat gagasan pokok membantu ingatan." },
    { id: "u67e", tipe: "isi_blank", soal: "Membaca sekilas untuk gambaran umum disebut sk...", jawaban: "skimming", penjelasan: "Skimming = baca sekilas." },
  ]},
  { level: 12, title: "Menyunting Kalimat", soal: [
    { id: "u68a", tipe: "pilihan_ganda", soal: "Suntingan terbaik untuk 'para hadirin sekalian yang terhormat' adalah ...", opsi: ["hadirin yang terhormat", "para hadirin sekalian", "sekalian para hadirin", "para sekalian hadirin terhormat"], jawaban: 0, penjelasan: "'Hadirin' sudah jamak; buang 'para' dan 'sekalian'." },
    { id: "u68b", tipe: "pilihan_ganda", soal: "Kalimat yang TIDAK perlu disunting adalah ...", opsi: ["Ia sangat rajin sekali.", "Kami saling bantu-membantu.", "Buku itu sangat bermanfaat.", "Naik ke atas podium dia."], jawaban: 2, penjelasan: "Sudah efektif dan baku." },
    { id: "u68c", tipe: "pilihan_ganda", soal: "Yang diperiksa saat menyunting ejaan adalah ...", opsi: ["huruf kapital, tanda baca, penulisan kata", "warna tinta", "jenis kertas", "tebal buku"], jawaban: 0, penjelasan: "Ejaan: kapital, tanda baca, kata." },
    { id: "u68d", tipe: "benar_salah", soal: "Menyunting berarti memperbaiki tulisan agar lebih baik.", opsi: BS, jawaban: "Benar", penjelasan: "Itulah hakikat menyunting." },
    { id: "u68e", tipe: "isi_blank", soal: "Sunting: 'dia punya banyak sekali teman-teman' → 'Dia punya banyak ...'", jawaban: "teman", penjelasan: "'Banyak' + bentuk tunggal: banyak teman." },
  ]},
  { level: 12, title: "Menulis Pendapat", soal: [
    { id: "u69a", tipe: "pilihan_ganda", soal: "Struktur tulisan pendapat yang baik adalah ...", opsi: ["pendapat → alasan → contoh/bukti → simpulan", "contoh → judul → nama", "simpulan → simpulan → simpulan", "alasan tanpa pendapat"], jawaban: 0, penjelasan: "Urutan argumen yang runtut." },
    { id: "u69b", tipe: "pilihan_ganda", soal: "Kalimat pembuka pendapat yang tepat: ...", opsi: ["Saya berpendapat bahwa jam istirahat perlu ditambah.", "Ikan lele hidup di air.", "Kemarin saya makan soto.", "Berapa harga sepatu itu?"], jawaban: 0, penjelasan: "Langsung menyatakan posisi." },
    { id: "u69c", tipe: "pilihan_ganda", soal: "Saat pendapat kita dikritik, sikap terbaik adalah ...", opsi: ["marah dan menyerang balik", "mendengarkan dan menanggapi dengan alasan", "menghapus semua tulisan", "diam selamanya"], jawaban: 1, penjelasan: "Tanggapi kritik dengan argumen, bukan emosi." },
    { id: "u69d", tipe: "benar_salah", soal: "Pendapat yang baik disampaikan dengan bahasa santun.", opsi: BS, jawaban: "Benar", penjelasan: "Santun membuat pendapat mudah diterima." },
    { id: "u69e", tipe: "isi_blank", soal: "Tulisan yang berisi pendapat disebut teks o...", jawaban: "opini", penjelasan: "Teks opini berisi pendapat penulis." },
  ]},
  { level: 12, title: "Menyusun Argumen Ringan", soal: [
    { id: "u70a", tipe: "pilihan_ganda", soal: "Pernyataan + 'karena' + alasan + contoh adalah pola ...", opsi: ["argumen", "pantun", "teka-teki", "berita duka"], jawaban: 0, penjelasan: "Pola dasar argumen." },
    { id: "u70b", tipe: "pilihan_ganda", soal: "Argumen paling meyakinkan untuk 'perlu piket kelas': ...", opsi: ["karena kata ketua kelas", "karena kelas bersih membuat belajar nyaman, terbukti kelas kotor bikin sesak", "karena pokoknya harus", "karena kelas lain juga"], jawaban: 1, penjelasan: "Ada alasan + bukti pengalaman." },
    { id: "u70c", tipe: "pilihan_ganda", soal: "Menanggapi pendapat teman yang berbeda sebaiknya diawali ...", opsi: ["'Pendapatmu menarik, tetapi menurutku ...'", "'Kamu salah total!'", "'Diam kamu!'", "'Aku tidak peduli.'"], jawaban: 0, penjelasan: "Hargai dulu, lalu ajukan pandangan." },
    { id: "u70d", tipe: "benar_salah", soal: "Menyerang pribadi lawan bicara adalah cara berargumen yang benar.", opsi: BS, jawaban: "Salah", penjelasan: "Serang gagasannya, bukan orangnya." },
    { id: "u70e", tipe: "isi_blank", soal: "Kata penghubung yang lazim mengawali alasan adalah ...", jawaban: "karena", penjelasan: "'... karena ...' menandai alasan." },
  ]},
  { level: 12, title: "Simulasi Tantangan Akhir", soal: [
    { id: "u71a", tipe: "pilihan_ganda", soal: "'Meski hujan deras, panitia memutuskan acara tetap berlangsung karena tenda telah terpasang.' Inti kalimatnya: ...", opsi: ["hujan sangat deras", "acara tetap berlangsung", "tenda mahal", "panitia kecewa"], jawaban: 1, penjelasan: "Inti: keputusan acara tetap jalan." },
    { id: "u71b", tipe: "pilihan_ganda", soal: "Deret kata BAKU semuanya benar pada ...", opsi: ["risiko, izin, praktik, zaman", "resiko, ijin, praktek, jaman", "risiko, ijin, praktik, jaman", "resiko, izin, praktek, zaman"], jawaban: 0, penjelasan: "Empat-empatnya bentuk baku KBBI." },
    { id: "u71c", tipe: "pilihan_ganda", soal: "'Tanaman itu mati ... jarang disiram.' Konjungsi tepat: ...", opsi: ["agar", "karena", "walaupun", "kemudian"], jawaban: 1, penjelasan: "Sebab kematian tanaman." },
    { id: "u71d", tipe: "benar_salah", soal: "'Rapat akan dilaksanakan pada hari Senin.' Penulisan 'Senin' sudah benar.", opsi: BS, jawaban: "Benar", penjelasan: "Nama hari berhuruf kapital." },
    { id: "u71e", tipe: "isi_blank", soal: "Gabungkan dengan konjungsi pertentangan: 'Dia lelah. Dia terus berlatih.' → 'Dia terus berlatih ... lelah.'", jawaban: "walaupun", penjelasan: "Pertentangan: walaupun/meskipun." },
  ]},
  { level: 12, title: "Final Review Jalur Cerdas", soal: [
    { id: "u72a", tipe: "pilihan_ganda", soal: "Urutan unsur kalimat 'Kemarin adik membeli buku di toko' yang berpola K-S-P-O-K: unsur 'di toko' adalah ...", opsi: ["subjek", "predikat", "objek", "keterangan tempat"], jawaban: 3, penjelasan: "'Di toko' menerangkan tempat." },
    { id: "u72b", tipe: "pilihan_ganda", soal: "Gagasan utama paragraf induktif terletak di ...", opsi: ["awal", "akhir", "judul", "luar teks"], jawaban: 1, penjelasan: "Induktif: kalimat utama di akhir." },
    { id: "u72c", tipe: "pilihan_ganda", soal: "'Sepertinya besok cerah' vs 'BMKG mencatat suhu 31°C kemarin'. Keduanya berturut-turut adalah ...", opsi: ["fakta – opini", "opini – fakta", "fakta – fakta", "opini – opini"], jawaban: 1, penjelasan: "'Sepertinya' = opini; catatan BMKG = fakta." },
    { id: "u72d", tipe: "benar_salah", soal: "me- + panggang menjadi 'memanggang'.", opsi: BS, jawaban: "Benar", penjelasan: "p luluh menjadi m." },
    { id: "u72e", tipe: "isi_blank", soal: "Bentuk baku dari 'kwalitas' adalah ...", jawaban: "kualitas", penjelasan: "KBBI: kualitas." },
  ]},
];

// ─────────────────────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────────────────────
const SEMUA: UnitSoal[] = [...TAMBAHAN, ...TAMBAHAN_2, ...TAMBAHAN_3, ...TAMBAHAN_4];

function validate(): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const u of SEMUA) {
    if (u.soal.length !== 5) errs.push(`${u.title}: ${u.soal.length} soal (harus 5)`);
    for (const q of u.soal) {
      if (ids.has(q.id)) errs.push(`id ganda: ${q.id}`);
      ids.add(q.id);
      if (!q.soal || !q.penjelasan) errs.push(`${q.id}: soal/penjelasan kosong`);
      if (q.tipe === "pilihan_ganda") {
        if (!Array.isArray(q.opsi) || q.opsi.length < 3) errs.push(`${q.id}: opsi < 3`);
        if (typeof q.jawaban !== "number" || q.jawaban < 0 || q.jawaban >= q.opsi.length)
          errs.push(`${q.id}: jawaban di luar rentang opsi`);
        // Perbandingan case-SENSITIVE: soal tentang huruf kapital memang punya
        // opsi yang hanya berbeda kapitalisasi — itu intinya soal, bukan cacat.
        if (new Set(q.opsi.map(o => o.trim())).size !== q.opsi.length)
          errs.push(`${q.id}: opsi duplikat persis`);
      }
      if (q.tipe === "benar_salah" && q.jawaban !== "Benar" && q.jawaban !== "Salah")
        errs.push(`${q.id}: jawaban benar_salah tidak valid`);
      if (q.tipe === "isi_blank" && (typeof q.jawaban !== "string" || !q.jawaban.trim()))
        errs.push(`${q.id}: jawaban isi_blank kosong`);
    }
  }
  return errs;
}

async function main() {
  const execute = process.argv.includes("--execute");
  const errs = validate();
  if (errs.length) {
    console.error(`❌ ${errs.length} masalah struktur:`);
    errs.forEach(e => console.error("   " + e));
    process.exit(1);
  }
  console.log(`✅ struktur valid: ${SEMUA.length} unit, ${SEMUA.length * 5} soal, id unik semua`);

  const db = makeDb();
  let matched = 0, added = 0, skipped = 0, missing = 0;
  try {
    for (const u of SEMUA) {
      const unit = await db.learningUnit.findFirst({
        where: { title: u.title, isActive: true, level: { type: "JALUR", level: u.level } },
        select: { id: true, content: true },
      });
      if (!unit) { missing++; console.warn(`⚠️  tidak ketemu: L${u.level} "${u.title}"`); continue; }
      matched++;

      let content: any = {};
      try { content = JSON.parse(unit.content || "{}"); } catch { content = {}; }
      const existing: any[] = Array.isArray(content.questions) ? content.questions : [];
      const existingIds = new Set(existing.map((q: any) => q.id));

      const fresh = u.soal.filter(q => !existingIds.has(q.id));
      skipped += u.soal.length - fresh.length;
      if (fresh.length === 0) continue;

      if (execute) {
        content.questions = [...existing, ...fresh];
        await db.learningUnit.update({
          where: { id: unit.id },
          data: { content: JSON.stringify(content) },
        });
      }
      added += fresh.length;
      console.log(`${execute ? "✍️ " : "🔎 "}L${u.level} "${u.title}": +${fresh.length} soal (total jadi ${existing.length + fresh.length})`);
    }
  } finally {
    await db.$disconnect();
  }

  console.log(`\n${execute ? "SELESAI" : "DRY-RUN (tidak menulis — jalankan dengan --execute)"}`);
  console.log(`unit cocok=${matched}  soal ditambah=${added}  dilewati(sudah ada)=${skipped}  unit tak ketemu=${missing}`);
  if (missing > 0) process.exit(1);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
