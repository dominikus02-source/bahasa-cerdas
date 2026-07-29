// Bank soal Kelas 1 — 15 soal per unit, dibagi 3 pelajaran (5 soal masing-masing).
//
// Unit "Dengarkan & Pilih" SENGAJA tidak diisi: unit itu menuntut berkas audio
// dan sampai sekarang belum ada satu pun rekaman. Membuatnya jadi soal bacaan
// akan menipu — judul pelajarannya berbunyi "Dengar Kata". Biarkan kosong
// sampai audionya diproduksi; halaman pelajaran sudah menanganinya dengan jujur.

import type { Soal } from "@/lib/arena-junior/soal"
import { buatPembentuk } from "./bentuk-soal"

const { teks } = buatPembentuk("k1")

export const SOAL_K1: Record<string, Soal[]> = {
  "Huruf & Suku Kata": [
    teks("Gabungkan suku kata ini jadi satu kata", "BU + KU", "BUKU", ["KUBU", "BUBU", "KUKU"]),
    teks("Gabungkan suku kata ini jadi satu kata", "MA + TA", "MATA", ["TAMA", "MAMA", "TATA"]),
    teks("Gabungkan suku kata ini jadi satu kata", "SA + PI", "SAPI", ["PISA", "SASA", "PIPI"]),
    teks("Gabungkan suku kata ini jadi satu kata", "KA + KI", "KAKI", ["KIKA", "KAKA", "KIKI"]),
    teks("Gabungkan suku kata ini jadi satu kata", "RO + TI", "ROTI", ["TIRO", "RORO", "TITI"]),

    teks("Ada berapa suku kata pada kata ini?", "SEPATU", "Tiga", ["Dua", "Empat", "Satu"], "SE-PA-TU ada tiga."),
    teks("Ada berapa suku kata pada kata ini?", "BUKU", "Dua", ["Tiga", "Satu", "Empat"], "BU-KU ada dua."),
    teks("Ada berapa suku kata pada kata ini?", "KELUARGA", "Empat", ["Dua", "Tiga", "Lima"], "KE-LU-AR-GA ada empat."),
    teks("Ada berapa suku kata pada kata ini?", "MEJA", "Dua", ["Tiga", "Empat", "Satu"], "ME-JA ada dua."),
    teks("Ada berapa suku kata pada kata ini?", "SEKOLAH", "Tiga", ["Dua", "Empat", "Lima"], "SE-KO-LAH ada tiga."),

    teks("Suku kata pertama kata ini apa?", "PAYUNG", "PA", ["YUNG", "PAY", "UNG"]),
    teks("Suku kata terakhir kata ini apa?", "SEPEDA", "DA", ["SE", "PE", "PEDA"]),
    teks("Suku kata pertama kata ini apa?", "JENDELA", "JEN", ["DE", "LA", "JE"]),
    teks("Suku kata terakhir kata ini apa?", "KURSI", "SI", ["KUR", "KU", "RSI"]),
    teks("Suku kata pertama kata ini apa?", "BONEKA", "BO", ["NE", "KA", "BON"]),
  ],

  "Kata Sehari-hari": [
    teks("Ibu memasak di mana?", "Di rumah", "Dapur", ["Kamar mandi", "Halaman", "Garasi"]),
    teks("Kita tidur di mana?", "Di rumah", "Kamar", ["Dapur", "Teras", "Gudang"]),
    teks("Kita mandi di mana?", "Di rumah", "Kamar mandi", ["Dapur", "Kamar tidur", "Ruang tamu"]),
    teks("Tamu diterima di mana?", "Di rumah", "Ruang tamu", ["Dapur", "Kamar mandi", "Gudang"]),
    teks("Baju kotor dicuci memakai apa?", "Di rumah", "Sabun", ["Garam", "Gula", "Minyak"]),

    teks("Siapa yang mengajar di kelas?", "Di sekolah", "Guru", ["Sopir", "Petani", "Dokter"]),
    teks("Kita membaca buku di mana?", "Di sekolah", "Perpustakaan", ["Kantin", "Lapangan", "Gudang"]),
    teks("Kita jajan saat istirahat di mana?", "Di sekolah", "Kantin", ["Perpustakaan", "Kelas", "Kamar"]),
    teks("Upacara bendera dilakukan di mana?", "Di sekolah", "Lapangan", ["Kantin", "Kelas", "Dapur"]),
    teks("Apa yang kita bawa ke sekolah untuk menulis?", "Di sekolah", "Alat tulis", ["Bantal", "Panci", "Sapu"]),

    teks("Siapa yang menjual sayur?", "Di pasar", "Pedagang", ["Guru", "Pilot", "Polisi"]),
    teks("Apa yang dipakai untuk membayar belanjaan?", "Di pasar", "Uang", ["Batu", "Daun", "Pensil"]),
    teks("Wortel dan bayam termasuk apa?", "Di pasar", "Sayur", ["Buah", "Daging", "Kue"]),
    teks("Mangga dan jeruk termasuk apa?", "Di pasar", "Buah", ["Sayur", "Ikan", "Roti"]),
    teks("Barang belanjaan dibawa memakai apa?", "Di pasar", "Keranjang", ["Bantal", "Sepatu", "Payung"]),
  ],

  "Kalimat Pendek": [
    teks("Lengkapi kalimat ini", "Adik ___ nasi.", "makan", ["terbang", "menyapu", "membaca"]),
    teks("Lengkapi kalimat ini", "Ibu ___ di dapur.", "memasak", ["berenang", "menulis", "tidur"]),
    teks("Lengkapi kalimat ini", "Ayah ___ koran.", "membaca", ["memakan", "menyanyi", "berlari"]),
    teks("Lengkapi kalimat ini", "Kakak ___ ke sekolah.", "berangkat", ["memasak", "menyapu", "mandi"]),
    teks("Lengkapi kalimat ini", "Burung ___ di langit.", "terbang", ["berenang", "menulis", "makan"]),

    teks("Mana kalimat yang benar?", "Susunan kata", "Saya minum susu.", ["Susu saya minum ke.", "Minum saya di susu.", "Saya susu di minum."]),
    teks("Mana kalimat yang benar?", "Susunan kata", "Kucing itu lucu.", ["Lucu kucing di itu.", "Itu di kucing lucu.", "Kucing lucu ke itu."]),
    teks("Mana kalimat yang benar?", "Susunan kata", "Ayah pergi bekerja.", ["Bekerja ayah di pergi.", "Pergi di ayah bekerja.", "Ayah bekerja ke pergi di."]),
    teks("Mana kalimat yang benar?", "Susunan kata", "Adik bermain bola.", ["Bola adik di bermain.", "Bermain bola ke adik di.", "Adik bola di bermain ke."]),
    teks("Mana kalimat yang benar?", "Susunan kata", "Ibu menyapu lantai.", ["Lantai ibu ke menyapu.", "Menyapu di ibu lantai.", "Ibu lantai ke menyapu di."]),

    teks("Tanda apa yang dipakai di akhir kalimat berita?", "Saya suka membaca__", "Titik (.)", ["Tanda tanya (?)", "Tanda seru (!)", "Koma (,)"]),
    teks("Tanda apa yang dipakai di akhir kalimat tanya?", "Siapa namamu__", "Tanda tanya (?)", ["Titik (.)", "Koma (,)", "Tanda seru (!)"]),
    teks("Huruf pertama pada awal kalimat ditulis bagaimana?", "___ku pergi ke pasar.", "Huruf besar", ["Huruf kecil", "Angka", "Tanda baca"]),
    teks("Nama orang ditulis dengan huruf apa di depannya?", "budi bermain bola", "Huruf besar", ["Huruf kecil", "Angka", "Tanda titik"]),
    teks("Mana penulisan yang benar?", "Awal kalimat", "Ani menyiram bunga.", ["ani menyiram bunga.", "ANI menyiram Bunga", "ani Menyiram bunga"]),
  ],

  "Cerita Mini": [
    teks("Bacalah: \"Pagi ini Ani menyapu halaman. Ia dibantu adiknya.\" Siapa yang menyapu?", "📖", "Ani", ["Ibu", "Ayah", "Guru"]),
    teks("Bacalah: \"Pagi ini Ani menyapu halaman. Ia dibantu adiknya.\" Siapa yang membantu?", "📖", "Adiknya", ["Kakaknya", "Nenek", "Temannya"]),
    teks("Bacalah: \"Pagi ini Ani menyapu halaman.\" Kapan Ani menyapu?", "📖", "Pagi", ["Malam", "Sore", "Siang"]),
    teks("Bacalah: \"Ani menyapu halaman.\" Ani menyapu di mana?", "📖", "Halaman", ["Dapur", "Kamar", "Sekolah"]),
    teks("Bacalah: \"Ani menyapu halaman dengan rajin.\" Ani anak yang bagaimana?", "📖", "Rajin", ["Malas", "Nakal", "Sedih"]),

    teks("Bacalah: \"Kucing Mira bernama Belang. Belang suka minum susu.\" Siapa nama kucingnya?", "🐱", "Belang", ["Mira", "Susu", "Manis"]),
    teks("Bacalah: \"Belang suka minum susu.\" Apa yang disukai Belang?", "🐱", "Susu", ["Nasi", "Roti", "Air"]),
    teks("Bacalah: \"Kucing Mira bernama Belang.\" Siapa pemilik kucing?", "🐱", "Mira", ["Belang", "Ani", "Ibu"]),
    teks("Bacalah: \"Belang tidur di bawah kursi.\" Belang tidur di mana?", "🐱", "Di bawah kursi", ["Di atas meja", "Di dapur", "Di halaman"]),
    teks("Bacalah: \"Mira menyayangi Belang.\" Bagaimana perasaan Mira pada Belang?", "🐱", "Sayang", ["Takut", "Marah", "Benci"]),

    teks("Bacalah: \"Hujan turun deras. Budi memakai payung.\" Mengapa Budi memakai payung?", "🌧️", "Karena hujan", ["Karena panas", "Karena malam", "Karena dingin salju"]),
    teks("Bacalah: \"Hujan turun deras.\" Bagaimana hujannya?", "🌧️", "Deras", ["Rintik", "Berhenti", "Panas"]),
    teks("Bacalah: \"Budi memakai payung lalu pergi ke sekolah.\" Budi pergi ke mana?", "🌧️", "Sekolah", ["Pasar", "Rumah nenek", "Kantor"]),
    teks("Bacalah: \"Budi memakai payung.\" Apa yang dipakai Budi?", "🌧️", "Payung", ["Topi", "Sepatu bot", "Jas hujan"]),
    teks("Bacalah: \"Budi sampai di sekolah tepat waktu.\" Budi datang bagaimana?", "🌧️", "Tepat waktu", ["Terlambat", "Terlalu pagi", "Tidak datang"]),
  ],

  "Susun Kata": [
    teks("Susunan huruf mana yang membentuk kata yang benar?", "K - U - B - U", "BUKU", ["KUBU", "UBKU", "BUUK"]),
    teks("Susunan huruf mana yang membentuk kata yang benar?", "A - J - E - M", "MEJA", ["JEMA", "AJEM", "MAJE"]),
    teks("Susunan huruf mana yang membentuk kata yang benar?", "I - P - S - A", "SAPI", ["PISA", "ASIP", "IPSA"]),
    teks("Susunan huruf mana yang membentuk kata yang benar?", "T - A - M - A", "MATA", ["TAMA", "AMAT", "ATAM"]),
    teks("Susunan huruf mana yang membentuk kata yang benar?", "L - O - B - A", "BOLA", ["LOBA", "ABOL", "OLBA"]),

    teks("Susunan suku kata mana yang benar?", "TU - SE - PA", "SE-PA-TU", ["TU-SE-PA", "PA-TU-SE", "SE-TU-PA"]),
    teks("Susunan suku kata mana yang benar?", "LAH - SE - KO", "SE-KO-LAH", ["LAH-SE-KO", "KO-LAH-SE", "SE-LAH-KO"]),
    teks("Susunan suku kata mana yang benar?", "DA - SE - PE", "SE-PE-DA", ["DA-SE-PE", "PE-DA-SE", "SE-DA-PE"]),
    teks("Susunan suku kata mana yang benar?", "NE - BO - KA", "BO-NE-KA", ["NE-BO-KA", "KA-NE-BO", "BO-KA-NE"]),
    teks("Susunan suku kata mana yang benar?", "LA - JEN - DE", "JEN-DE-LA", ["LA-JEN-DE", "DE-LA-JEN", "JEN-LA-DE"]),

    teks("Susunan kata mana yang jadi kalimat benar?", "bola / Adik / bermain", "Adik bermain bola.", ["Bola bermain adik.", "Bermain adik bola.", "Bola adik bermain."]),
    teks("Susunan kata mana yang jadi kalimat benar?", "nasi / Ibu / memasak", "Ibu memasak nasi.", ["Nasi memasak ibu.", "Memasak nasi ibu.", "Nasi ibu memasak."]),
    teks("Susunan kata mana yang jadi kalimat benar?", "sekolah / ke / Kakak / pergi", "Kakak pergi ke sekolah.", ["Sekolah pergi ke kakak.", "Ke sekolah kakak pergi ke.", "Pergi sekolah kakak ke."]),
    teks("Susunan kata mana yang jadi kalimat benar?", "buku / membaca / Saya", "Saya membaca buku.", ["Buku membaca saya.", "Membaca buku saya di.", "Buku saya di membaca."]),
    teks("Susunan kata mana yang jadi kalimat benar?", "bunga / menyiram / Ani", "Ani menyiram bunga.", ["Bunga menyiram ani.", "Menyiram bunga ani di.", "Bunga ani di menyiram."]),
  ],
}
