// Bank soal TK (Pra-Baca) — 6 unit × 15 soal.
//
// Tiap unit punya 15 soal; pelajaran ke-1 memakai soal 1-5, ke-2 soal 6-10,
// ke-3 soal 11-15. Jadi tiga pelajaran dalam satu unit tidak pernah sama.
//
// Kaidah penulisan untuk usia 4-6 tahun:
//  - kata harus akrab di keseharian anak Indonesia
//  - maksimal 4 pilihan, kata pendek
//  - perintah satu kalimat, kalimat aktif
//  - pengecoh tidak menjebak (beda jelas, bukan beda satu huruf yang sepele)

import type { Soal } from "@/lib/arena-junior/soal"
import { buatPembentuk } from "./bentuk-soal"

const { teks, gambar, kata } = buatPembentuk("tk")

export const SOAL_TK: Record<string, Soal[]> = {
  "Mengenal Huruf": [
    teks("Huruf apa ini?", "A", "A", ["B", "C", "D"], "Ini huruf A, seperti pada kata AYAM."),
    teks("Huruf apa ini?", "I", "I", ["L", "T", "J"], "Ini huruf I, seperti pada kata IBU."),
    teks("Huruf apa ini?", "U", "U", ["V", "O", "N"], "Ini huruf U, seperti pada kata UBI."),
    teks("Huruf apa ini?", "E", "E", ["F", "B", "H"], "Ini huruf E, seperti pada kata EMAS."),
    teks("Huruf apa ini?", "O", "O", ["Q", "C", "D"], "Ini huruf O, seperti pada kata OBAT."),

    teks("Huruf apa ini?", "B", "B", ["D", "P", "R"], "Ini huruf B, seperti pada kata BOLA."),
    teks("Huruf apa ini?", "C", "C", ["G", "O", "S"], "Ini huruf C, seperti pada kata CANGKIR."),
    teks("Huruf apa ini?", "M", "M", ["N", "W", "H"], "Ini huruf M, seperti pada kata MATA."),
    teks("Huruf apa ini?", "K", "K", ["X", "R", "Y"], "Ini huruf K, seperti pada kata KAKI."),
    teks("Huruf apa ini?", "S", "S", ["Z", "C", "G"], "Ini huruf S, seperti pada kata SAPU."),

    teks("Pilih huruf yang sama dengan ini", "T", "T", ["I", "F", "L"], "Bentuk T punya garis lurus di atas."),
    teks("Pilih huruf yang sama dengan ini", "P", "P", ["B", "R", "D"], "Huruf P punya satu perut di atas saja."),
    teks("Pilih huruf yang sama dengan ini", "N", "N", ["M", "H", "Z"], "Huruf N punya dua kaki dan satu garis miring."),
    teks("Pilih huruf yang sama dengan ini", "G", "G", ["C", "O", "Q"], "Huruf G seperti C yang punya ekor."),
    teks("Pilih huruf yang sama dengan ini", "R", "R", ["P", "B", "K"], "Huruf R seperti P yang punya kaki."),
  ],

  "Bunyi Awal": [
    teks("Kata KUCING diawali huruf apa?", "KUCING", "K", ["G", "C", "T"], "KU-CING, bunyi pertamanya /k/."),
    teks("Kata BOLA diawali huruf apa?", "BOLA", "B", ["D", "P", "L"], "BO-LA, bunyi pertamanya /b/."),
    teks("Kata IBU diawali huruf apa?", "IBU", "I", ["U", "B", "A"], "I-BU, bunyi pertamanya /i/."),
    teks("Kata MEJA diawali huruf apa?", "MEJA", "M", ["N", "J", "E"], "ME-JA, bunyi pertamanya /m/."),
    teks("Kata SAPI diawali huruf apa?", "SAPI", "S", ["P", "C", "A"], "SA-PI, bunyi pertamanya /s/."),

    teks("Kata AYAM diawali huruf apa?", "AYAM", "A", ["Y", "M", "E"], "A-YAM, bunyi pertamanya /a/."),
    teks("Kata GAJAH diawali huruf apa?", "GAJAH", "G", ["J", "H", "C"], "GA-JAH, bunyi pertamanya /g/."),
    teks("Kata TOPI diawali huruf apa?", "TOPI", "T", ["P", "I", "D"], "TO-PI, bunyi pertamanya /t/."),
    teks("Kata RUMAH diawali huruf apa?", "RUMAH", "R", ["M", "H", "U"], "RU-MAH, bunyi pertamanya /r/."),
    teks("Kata NASI diawali huruf apa?", "NASI", "N", ["M", "S", "I"], "NA-SI, bunyi pertamanya /n/."),

    teks("Kata BEBEK diakhiri huruf apa?", "BEBEK", "K", ["B", "E", "T"], "BE-BEK, bunyi terakhirnya /k/."),
    teks("Kata BUKU diakhiri huruf apa?", "BUKU", "U", ["K", "B", "O"], "BU-KU, bunyi terakhirnya /u/."),
    teks("Kata PENSIL diakhiri huruf apa?", "PENSIL", "L", ["N", "S", "I"], "PEN-SIL, bunyi terakhirnya /l/."),
    teks("Kata KAKI diakhiri huruf apa?", "KAKI", "I", ["K", "A", "E"], "KA-KI, bunyi terakhirnya /i/."),
    teks("Kata TANGAN diakhiri huruf apa?", "TANGAN", "N", ["G", "A", "M"], "TA-NGAN, bunyi terakhirnya /n/."),
  ],

  "Kata Benda": [
    teks("Benda apa yang dipakai untuk tidur?", "Di kamar", "Kasur", ["Piring", "Sepatu", "Sapu"]),
    teks("Benda apa yang dipakai untuk makan nasi?", "Di meja makan", "Piring", ["Bantal", "Sisir", "Payung"]),
    teks("Benda apa yang dipakai untuk menyapu lantai?", "Di rumah", "Sapu", ["Gelas", "Topi", "Kasur"]),
    teks("Benda apa yang dipakai untuk minum?", "Di dapur", "Gelas", ["Sepatu", "Bantal", "Sapu"]),
    teks("Benda apa yang dipakai untuk duduk?", "Di ruang tamu", "Kursi", ["Piring", "Sisir", "Payung"]),

    teks("Benda apa yang dipakai untuk menulis?", "Di sekolah", "Pensil", ["Sendok", "Bantal", "Panci"]),
    teks("Benda apa yang dipakai untuk membaca?", "Di sekolah", "Buku", ["Ember", "Sepatu", "Sapu"]),
    teks("Benda apa yang dipakai untuk membawa buku?", "Di sekolah", "Tas", ["Gelas", "Kasur", "Piring"]),
    teks("Benda apa yang dipakai guru untuk menulis di depan?", "Di kelas", "Papan tulis", ["Kompor", "Bantal", "Sisir"]),
    teks("Benda apa yang dipakai untuk menghapus tulisan pensil?", "Di kelas", "Penghapus", ["Sendok", "Payung", "Ember"]),

    teks("Benda apa yang dipakai saat hujan?", "Di luar rumah", "Payung", ["Kipas", "Bantal", "Piring"]),
    teks("Benda apa yang dipakai di kaki?", "Saat pergi", "Sepatu", ["Topi", "Gelas", "Buku"]),
    teks("Benda apa yang dipakai di kepala?", "Saat panas", "Topi", ["Sepatu", "Sendok", "Sapu"]),
    teks("Benda apa yang dipakai untuk menyisir rambut?", "Di kamar", "Sisir", ["Panci", "Buku", "Payung"]),
    teks("Benda apa yang dipakai untuk menyimpan air?", "Di kamar mandi", "Ember", ["Pensil", "Topi", "Kasur"]),
  ],

  "Warna & Bentuk": [
    teks("Apa warna daun yang segar?", "🍃", "Hijau", ["Merah", "Hitam", "Ungu"]),
    teks("Apa warna matahari di siang hari?", "☀️", "Kuning", ["Biru", "Cokelat", "Merah"]),
    teks("Apa warna langit saat cerah?", "🌤️", "Biru", ["Hijau", "Merah", "Hitam"]),
    teks("Apa warna buah tomat matang?", "🍅", "Merah", ["Biru", "Putih", "Hijau"]),
    teks("Apa warna susu?", "🥛", "Putih", ["Hitam", "Ungu", "Oranye"]),

    teks("Bentuk apa yang bulat seperti bola?", "⚪", "Lingkaran", ["Segitiga", "Persegi", "Bintang"]),
    teks("Bentuk apa yang punya tiga sisi?", "🔺", "Segitiga", ["Lingkaran", "Persegi", "Bulan"]),
    teks("Bentuk apa yang keempat sisinya sama panjang?", "🟦", "Persegi", ["Segitiga", "Lingkaran", "Hati"]),
    teks("Roda sepeda berbentuk apa?", "🚲", "Lingkaran", ["Persegi", "Segitiga", "Bintang"]),
    teks("Atap rumah biasanya berbentuk apa?", "🏠", "Segitiga", ["Lingkaran", "Persegi", "Bintang"]),

    teks("Pisang berwarna apa?", "🍌", "Kuning", ["Biru", "Ungu", "Hitam"]),
    teks("Jeruk berwarna apa?", "🍊", "Oranye", ["Hijau tua", "Biru", "Putih"]),
    teks("Semangka di dalamnya berwarna apa?", "🍉", "Merah", ["Biru", "Cokelat", "Putih"]),
    teks("Jendela biasanya berbentuk apa?", "🪟", "Persegi", ["Segitiga", "Lingkaran", "Bintang"]),
    teks("Jam dinding biasanya berbentuk apa?", "🕐", "Lingkaran", ["Segitiga", "Hati", "Bintang"]),
  ],

  "Keluarga & Tubuh": [
    teks("Siapa yang melahirkan kita?", "👩", "Ibu", ["Ayah", "Kakek", "Paman"]),
    teks("Siapa suami dari ibu?", "👨", "Ayah", ["Bibi", "Nenek", "Kakak"]),
    teks("Siapa ayah dari ayah kita?", "👴", "Kakek", ["Adik", "Ibu", "Paman"]),
    teks("Siapa ibu dari ibu kita?", "👵", "Nenek", ["Kakak", "Ayah", "Bibi"]),
    teks("Siapa saudara yang lebih kecil dari kita?", "🧒", "Adik", ["Kakek", "Nenek", "Ayah"]),

    teks("Bagian tubuh apa yang dipakai untuk melihat?", "👀", "Mata", ["Kaki", "Telinga", "Hidung"]),
    teks("Bagian tubuh apa yang dipakai untuk mendengar?", "👂", "Telinga", ["Mata", "Tangan", "Mulut"]),
    teks("Bagian tubuh apa yang dipakai untuk mencium bau?", "👃", "Hidung", ["Mata", "Kaki", "Telinga"]),
    teks("Bagian tubuh apa yang dipakai untuk berjalan?", "🦶", "Kaki", ["Mata", "Hidung", "Telinga"]),
    teks("Bagian tubuh apa yang dipakai untuk memegang?", "✋", "Tangan", ["Telinga", "Hidung", "Kaki"]),

    teks("Ada berapa mata kita?", "👀", "Dua", ["Satu", "Tiga", "Lima"]),
    teks("Berapa jari di satu tangan?", "✋", "Lima", ["Tiga", "Empat", "Sepuluh"]),
    teks("Bagian tubuh apa yang dipakai untuk berbicara?", "👄", "Mulut", ["Mata", "Kaki", "Telinga"]),
    teks("Rambut tumbuh di bagian apa?", "🧑", "Kepala", ["Kaki", "Tangan", "Perut"]),
    teks("Kita mengunyah makanan dengan apa?", "🦷", "Gigi", ["Mata", "Telinga", "Kaki"]),
  ],

  "Hewan & Alam": [
    gambar("Mana gambar KUCING?", "kucing", ["gajah", "bebek", "sapi"], "Kucing suka mengeong."),
    gambar("Mana gambar GAJAH?", "gajah", ["kelinci", "kodok", "anjing"], "Gajah punya belalai panjang."),
    gambar("Mana gambar BEBEK?", "bebek", ["singa", "sapi", "monyet"], "Bebek berbunyi kwek-kwek."),
    gambar("Mana gambar SAPI?", "sapi", ["kucing", "kodok", "zebra"], "Sapi menghasilkan susu."),
    gambar("Mana gambar KELINCI?", "kelinci", ["anjing", "gajah", "singa"], "Kelinci punya telinga panjang."),

    kata("Gambar apa ini?", "anjing", ["Kucing", "Bebek", "Sapi"], "Anjing berbunyi guk-guk."),
    kata("Gambar apa ini?", "monyet", ["Zebra", "Kodok", "Bebek"], "Monyet suka memanjat pohon."),
    kata("Gambar apa ini?", "singa", ["Kelinci", "Sapi", "Kucing"], "Singa berbunyi mengaum."),
    kata("Gambar apa ini?", "kodok", ["Gajah", "Anjing", "Zebra"], "Kodok melompat-lompat."),
    kata("Gambar apa ini?", "zebra", ["Sapi", "Monyet", "Kelinci"], "Zebra bergaris hitam putih."),

    gambar("Mana hewan yang bisa terbang?", "bebek", ["sapi", "gajah", "kodok"], "Bebek punya sayap."),
    gambar("Mana hewan yang paling besar?", "gajah", ["kelinci", "kucing", "kodok"], "Gajah hewan darat terbesar."),
    gambar("Mana hewan yang suka melompat?", "kodok", ["sapi", "gajah", "zebra"], "Kodok melompat dengan kaki belakangnya."),
    kata("Gambar apa ini?", "buah-naga", ["Semangka", "Mangga", "Melon"], "Buah naga kulitnya merah muda."),
    kata("Gambar apa ini?", "semangka", ["Jeruk", "Pepaya", "Pir"], "Semangka besar dan berair."),
  ],
}
