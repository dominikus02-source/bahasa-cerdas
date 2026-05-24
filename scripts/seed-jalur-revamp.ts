// @ts-nocheck
import { db } from "../lib/db"

type Soal = { id: number; soal: string; opsi: string[]; jawaban: number; penjelasan: string }
type Konten = {
  belajar: { tujuan: string[]; materi: { judul: string; isi: string[]; contoh: string[]; catatan?: string }[]; rangkuman: string[] }
  latihan: Soal[]
  praktik: { petunjuk: string; tips: string[]; contoh?: string }
  kuis: Soal[]
}

function makeSoal(arr: [string, string[], number, string][]): Soal[] {
  return arr.map(([soal, opsi, jawaban, penjelasan], i) => ({ id: i + 1, soal, opsi, jawaban, penjelasan }))
}

const data: Record<string, Konten> = {}
function add(t: string, k: Konten) { data[t] = k }

add("Ejaan & Huruf Kapital", {
  belajar: {
    tujuan: ["Memahami aturan ejaan bahasa Indonesia", "Menguasai penggunaan huruf kapital", "Menerapkan aturan penulisan huruf"],
    materi: [
      { judul: "Apa itu Ejaan?", isi: ["Ejaan adalah aturan penulisan kata, huruf, dan tanda baca dalam bahasa Indonesia.", "EYD V (Ejaan yang Disempurnakan) adalah pedoman resmi terbaru (2022).", "Tujuan ejaan: membuat tulisan seragam, jelas, dan mudah dipahami."], contoh: ["Baku: aktivitas (bukan aktifitas)", "Baku: jadwal (bukan jadual)"], catatan: "Cek kata baku di KBBI daring jika ragu." },
      { judul: "Huruf Kapital", isi: ["Awal kalimat: Hari ini cuaca cerah.", "Nama orang: Andi, Kartini, Ki Hajar Dewantara.", "Nama tempat: Pulau Bali, Gunung Merapi, Jalan Sudirman.", "Nama bangsa, bahasa, tahun: bangsa Indonesia, bahasa Jawa, tahun Hijriah.", "Judul: Novel Laskar Pelangi", "Sapaan: Surat Bapak sudah saya terima."], contoh: ["Hari Kemerdekaan 17 Agustus — kapital di awal kata utama", "Suku Sunda — kapital nama suku"] },
      { judul: "Penulisan Kata", isi: ["Kata ulang: anak-anak, buku-buku, berlari-lari.", "Kata depan di, ke, dari: dipisah jika menunjukkan tempat (di rumah, ke pasar).", "Awalan di- sebagai kata kerja: digabung (dimakan, ditulis).", "Partikel -lah, -kah, -tah: digabung (bacalah, apakah)."], contoh: ["Benar: di sekolah (tempat) — dipisah", "Benar: dimasak (kata kerja pasif) — digabung"] },
    ],
    rangkuman: ["EYD adalah pedoman ejaan resmi bahasa Indonesia.", "Huruf kapital: nama, awal kalimat, judul, sapaan.", "di tempat dipisah, di kata kerja digabung.", "Kata ulang pakai tanda hubung."]
  },
  latihan: makeSoal([
    ["Penulisan yang sesuai EYD...", ["Aktifitas", "Aktivitas", "Aktipitas", "Aktif"], 1, "Bentuk baku: aktivitas."],
    ["Penulisan judul yang benar...", ["negara Kesatuan RI", "Negara Kesatuan RI", "Negara kesatuan RI", "negara kesatuan RI"], 1, "Judul: kata utama pakai kapital."],
    ["di sebagai kata depan tempat ditulis...", ["Digabung", "Dipisah", "Dihubung", "Dimiringkan"], 1, "di tempat = dipisah."],
    ["Penulisan di beli yang benar...", ["Di beli", "Dibeli", "di-beli", "diBeli"], 1, "Kata kerja pasif = digabung."],
    ["Penulisan kata ulang yang benar...", ["Anak-anak", "Anakanak", "Anak anak", "Anak-anak"], 0, "Kata ulang pakai tanda hubung."],
    ["Partikel lah pada bacalah ditulis...", ["Terpisah", "Serangkai", "Pakai spasi", "Pakai titik"], 1, "Partikel -lah digabung."],
    ["Penulisan yang benar...", ["Pulau jawa", "Pulau Jawa", "pulau Jawa", "pulau jawa"], 1, "Nama tempat: Pulau dan Jawa kapital."],
    ["Penulisan di Jalan Merdeka...", ["Benar", "Salah", "Salah (Jalan tidak kapital)", "Benar semua"], 0, "di dipisah (tempat), Jalan kapital (nama jalan)."],
    ["Bentuk baku cendikiawan...", ["Cendikiawan", "Cendekiawan", "Cendikia", "Cendekia"], 1, "Baku: cendekiawan."],
    ["Kata ibukota penulisan baku...", ["Ibukota", "Ibu kota", "Ibu-kota", "Ibukota"], 1, "Baku: ibu kota (dua kata)."],
  ]),
  praktik: {
    petunjuk: "Perbaiki ejaan dan huruf kapital dalam paragraf berikut:\n\nsaya dan teman2 pergi ke curug Cilember. kami berangkat jam 7 pagi dari jakarta. di sana kami bermain air dan foto2. aktifitas ini sangat menyenangkan.",
    tips: ["Kapital di awal kalimat", "Nama kota pakai kapital", "di tempat dipisah", "Ganti 2 dengan kata ulang", "Ganti aktifitas dengan bentuk baku"],
    contoh: "Saya dan teman-teman pergi ke Curug Cilember. Kami berangkat jam 7 pagi dari Jakarta. Di sana kami bermain air dan foto-foto. Aktivitas ini sangat menyenangkan."
  },
  kuis: makeSoal([
    ["EYD singkatan dari...", ["Ejaan Yang Disempurnakan", "Ejaan Bahasa Indonesia", "Ejaan dan Tulisan", "Ejaan Yuridis"], 0, "EYD = Ejaan yang Disempurnakan."],
    ["Penulisan dimaksud ...", ["Dipisah (di maksud)", "Digabung (dimaksud)", "Pakai spasi", "Pakai hubung"], 1, "dimaksud = kata kerja pasif, digabung."],
    ["Penulisan yang SALAH...", ["Karier", "Karir", "Kreativitas", "Frekuensi"], 1, "Baku: karier, bukan karir."],
    ["Ke pada ke rumah ditulis...", ["Digabung", "Dipisah", "Dimiringkan", "Dihubung"], 1, "ke tempat = dipisah."],
    ["Bentuk baku dipersilahkan...", ["Tetap", "Dipersilakan", "Dipersonilakan", "Dipresilakan"], 1, "Baku: dipersilakan."],
  ]),
})

add("Tanda Baca Dasar", {
  belajar: {
    tujuan: ["Menguasai fungsi tanda titik, koma, tanya, seru", "Menggunakan tanda baca dengan tepat", "Membedakan fungsi setiap tanda baca"],
    materi: [
      { judul: "Tanda Titik (.)", isi: ["Akhir kalimat pernyataan: Saya suka membaca.", "Di belakang singkatan: dll., dsb., s.d., Yth.", "Pemisah angka ribuan: 1.000.000.", "TIDAK dipakai di akhir judul, subjudul, atau kepala surat."], contoh: ["Lomba diadakan pada 17 Agustus 2024.", "Buku cetak, alat tulis, dll. harus dibawa."] },
      { judul: "Tanda Koma (,)", isi: ["Pemisah unsur dalam perincian: apel, jeruk, dan mangga.", "Sebelum kata penghubung: tetapi, melainkan, sedangkan.", "Pemisah anak kalimat yang mendahului induk: Karena sakit, dia tidak masuk.", "Di sekitar nama orang untuk sapaan: Selamat pagi, Bu."], contoh: ["Dia pintar, rajin, dan baik hati.", "Meskipun hujan, ia tetap berangkat."] },
      { judul: "Tanda Tanya (?) dan Seru (!)", isi: ["Tanda tanya: di akhir kalimat tanya: Siapa namamu?", "Apa, siapa, mengapa, bagaimana, kapan, di mana — kata tanya.", "Tanda seru: kalimat perintah atau seruan: Ayo belajar!", "Aduh!, Wah!, Hei! — kata seru."], contoh: ["Tanya: Kamu sudah makan?", "Seru: Jangan buang sampah sembarangan!"] },
    ],
    rangkuman: ["Titik: akhir kalimat, singkatan, ribuan.", "Koma: perincian, sebelum tetapi, pemisah anak kalimat.", "Tanya: akhir kalimat tanya.", "Seru: perintah dan seruan."]
  },
  latihan: makeSoal([
    ["Siapa namamu tanda baca yang tepat...", [".", "?", "!", ","], 1, "Kalimat tanya pakai tanda tanya."],
    ["Tanda titik dipakai untuk...", ["Akhir kalimat tanya", "Akhir kalimat pernyataan", "Akhir kalimat seru", "Sebelum perincian"], 1, "Titik = akhir kalimat pernyataan."],
    ["Tanda koma pada Karena sakit, dia tidak masuk...", ["Pemisah anak kalimat", "Perincian", "Sapaan", "Singkatan"], 0, "Koma setelah anak kalimat yang mendahului induk."],
    ["Penulisan yang benar...", ["Jam 12:30 WIB", "Jam 12.30 WIB", "Jam 12;30 WIB", "Jam 12-30 WIB"], 0, "Tanda titik dua pemisah jam:menit."],
    ["Aduh sakit sekali tanda baca yang tepat di akhir...", [".", "?", "!", ","], 2, "Ungkapan seru pakai tanda seru."],
    ["Penulisan singkatan dll yang benar...", ["d l l", "dll", "dll.", "d,l,l"], 2, "Singkatan dan lain-lain = dll., dengan titik."],
    ["Fungsi tanda tanya...", ["Menyatakan perintah", "Menyatakan pertanyaan", "Menyatakan seruan", "Menyatakan perincian"], 1, "Tanya = pertanyaan."],
    ["Bahan: tepung, telur, gula tanda titik dua...", ["Salah (harus titik)", "Benar (sebelum perincian)", "Harus koma", "Tidak perlu tanda"], 1, "Titik dua sebelum perincian."],
    ["Penulisan gelar yang tepat...", ["S. Pd", "S.Pd.", "S.pd", "s.pd"], 1, "Gelar: S.Pd. — singkatan dengan titik."],
    ["Koma sebelum kata...", ["dan", "tetapi", "atau", "serta"], 1, "Koma sebelum tetapi, melainkan, sedangkan."],
  ]),
  praktik: {
    petunjuk: "Tambahkan tanda baca (titik, koma, tanya, seru) yang hilang:\n\npada hari Minggu aku dan keluarga pergi ke pantai Anyer kami membawa bekal nasi goreng buah buahan dan minuman ibu berkata ayo mandi di pantai kami bermain ombak sampai sore hari",
    tips: ["Titik di akhir kalimat", "Koma dalam perincian", "Tanda petik untuk kutipan langsung", "Tanda seru setelah ajakan"],
    contoh: "Pada hari Minggu, aku dan keluarga pergi ke Pantai Anyer. Kami membawa bekal: nasi goreng, buah-buahan, dan minuman. Ibu berkata, Ayo mandi di pantai! Kami bermain ombak sampai sore hari."
  },
  kuis: makeSoal([
    ["Penulisan yang benar...", ["Di Jalan Merdeka", "Di Jalan Merdeka", "di jalan merdeka", "Di jalan merdeka"], 1, "Di dipisah, Jalan kapital."],
    ["Tanda seru dipakai untuk...", ["Pertanyaan", "Perintah/seruan", "Pernyataan", "Perincian"], 1, "Seru = perintah."],
    ["Satu dua tiga penulisan benar dengan koma...", ["Satu, dua, tiga", "Satu dua tiga", "Satu, dua, dan, tiga", "satu dua tiga"], 0, "Perincian dipisah koma."],
    ["Tanda tanya diletakkan di...", ["Awal kalimat", "Akhir kalimat tanya", "Tengah kalimat", "Sebelum kata tanya"], 1, "Tanda tanya di akhir kalimat tanya."],
    ["Wah indah sekali tanda baca akhir...", [".", "?", "!", ","], 2, "Kekaguman pakai tanda seru."],
  ]),
})

add("Kata Baku & Kalimat Efektif", {
  belajar: {
    tujuan: ["Membedakan kata baku dan tidak baku", "Memahami ciri kalimat efektif", "Menyusun kalimat efektif"],
    materi: [
      { judul: "Kata Baku", isi: ["Kata baku sesuai kaidah resmi (KBBI).", "Kata tidak baku menyimpang dari kaidah, dipakai dalam situasi santai.", "Kata baku untuk: surat resmi, artikel, pidato, laporan, ujian."], contoh: ["Baku - Tidak Baku:", "aktivitas - aktifitas", "apotek - apotik", "detail - detil", "izin - ijin", "karier - karir", "nasihat - nasehat"] },
      { judul: "Ciri Kalimat Efektif", isi: ["Kesepadanan: subjek + predikat jelas. Adik bermain.", "Keparalelan: bentuk sama dalam perincian.", "Kehematan: tidak boros kata. Para siswa (bukan para siswa-siswa).", "Kecermatan: tidak ambigu.", "Kepaduan: logis dan runtut."], contoh: ["Tidak efektif: Bagi semua siswa-siswa harap berkumpul.", "Efektif: Semua siswa harap berkumpul."] },
    ],
    rangkuman: ["Kata baku sesuai KBBI, formal.", "Kalimat efektif: padan, paralel, hemat, cermat, padu.", "Hindari pemborosan kata."]
  },
  latihan: makeSoal([
    ["Kata baku dari apotik...", ["Apotek", "Apotik (tetap)", "Apotik (baku)", "Apotek (baku)"], 3, "Baku: apotek."],
    ["Kalimat tidak efektif...", ["Adik bermain bola.", "Para siswa-siswa berkumpul.", "Ibu memasak di dapur.", "Ayah membaca koran."], 1, "Para sudah jamak, tak perlu siswa-siswa."],
    ["Kata baku dari nasehat...", ["Nasehat (baku)", "Nasihat", "Naschat", "Nasehah"], 1, "Baku: nasihat."],
    ["Membaca, menulis, berhitung termasuk ciri...", ["Kehematan", "Keparalelan", "Kepaduan", "Kecermatan"], 1, "Bentuk imbuhan harus paralel."],
    ["Kata baku dari detil...", ["Detil (tetap)", "Detail", "Detil (baku)", "Detail (baku)"], 3, "Baku: detail."],
    ["Kalimat ambigu...", ["Dia pergi ke sekolah.", "Ibu membeli buku cerita anak baru.", "Ayah bekerja.", "Kami makan."], 1, "Ambigu: buku baru atau cerita anak baru?"],
    ["Kata baku dari ijasah...", ["Ijasah (baku)", "Ijazah", "Ijazah (baku)", "Ijasah"], 2, "Baku: ijazah."],
    ["Bagi semua hadirin harap berdiri. Perbaikan...", ["Semua hadirin berdiri.", "Bagi hadirin berdiri.", "Untuk hadirin berdiri.", "Hadirin dimohon berdiri."], 3, "Lebih efektif dan sopan."],
    ["Kata baku dari izin...", ["Ijin", "Izin (baku)", "Idzin", "Izin"], 1, "Baku: izin."],
    ["Karena dia sakit, maka ia tidak masuk. Perbaikan...", ["Karena sakit, ia tidak masuk.", "Dia sakit maka tidak masuk.", "Karena dia sakit, ia tidak masuk.", "Sakit, maka tidak masuk."], 0, "Hemat: karena dan maka tidak perlu bersama."],
  ]),
  praktik: {
    petunjuk: "Perbaiki 5 kesalahan dalam paragraf berikut:\n\nPara siswa-siswi diwajibkan untuk membawa buku-buku cetak dan juga alat tulis. Aktifitas belajar mengajar akan dimulai tepat pada jam 7 pagi. Bagi yang telat datang akan dikenakan sangsi berupa bersih-bersih kelas.",
    tips: ["Hilangkan para jika sudah jamak", "Ganti aktifitas menjadi aktivitas", "Ganti sangsi menjadi sanksi", "Hilangkan dan juga cukup dan"],
    contoh: "Siswa diwajibkan membawa buku cetak dan alat tulis. Aktivitas belajar mengajar dimulai pukul 7 pagi. Yang terlambat akan dikenai sanksi berupa membersihkan kelas."
  },
  kuis: makeSoal([
    ["Kata baku dari kreatifitas...", ["Kreatifitas (baku)", "Kreativitas", "Kreatipitas", "Kreatif"], 1, "Baku: kreativitas."],
    ["Kata baku dari kwitansi...", ["Kwitansi (baku)", "Kuitansi", "Kwitans (baku)", "Kuitansi (baku)"], 1, "Kw menjadi ku: kuitansi."],
    ["Penulisan baku resiko...", ["Resiko (baku)", "Risiko", "Resiko", "Resiko (baku)"], 1, "Baku: risiko."],
    ["Kata baku dari tehnik...", ["Tehnik (baku)", "Teknik", "Tehnik", "Tekhnik"], 1, "Baku: teknik."],
    ["Penulisan baku sistim...", ["Sistim (baku)", "Sistem", "Sistim", "Sisteme"], 1, "Baku: sistem."],
  ]),
})

add("Diksi & Makna Kata", {
  belajar: {
    tujuan: ["Memahami diksi (pilihan kata)", "Membedakan denotasi dan konotasi", "Mengenal sinonim, antonim, polisemi"],
    materi: [
      { judul: "Apa itu Diksi?", isi: ["Diksi adalah pilihan kata yang tepat sesuai konteks.", "Diksi baik: tepat makna, sesuai situasi, efektif.", "Pertimbangan: siapa pembaca, formal/santai, tujuan."], contoh: ["Tepat: meninggal dunia (formal) vs pulang (santai)"] },
      { judul: "Denotasi & Konotasi", isi: ["Denotasi: makna sebenarnya, sesuai kamus.", "Konotasi: makna kiasan, bernilai rasa.", "bunga denotasi = kembang; konotasi = gadis cantik."], contoh: ["Denotasi: Rambutnya panjang.", "Konotasi: Dia bintang kelas. (bintang = terpintar)", "Denotasi: Kambing itu makan rumput.", "Konotasi: Dia kambing hitam. (kambing hitam = tertuduh)"] },
      { judul: "Sinonim & Antonim", isi: ["Sinonim: makna mirip. besar = raya, pintar = cerdas.", "Antonim: berlawanan. besar x kecil, panjang x pendek.", "Polisemi: satu kata banyak makna. kepala = tubuh, pemimpin, bagian."], contoh: ["Sinonim: cerdas, pintar, pandai", "Antonim: kaya x miskin, rajin x malas"] },
    ],
    rangkuman: ["Diksi = pilihan kata tepat.", "Denotasi = makna sebenarnya. Konotasi = kiasan.", "Sinonim = mirip. Antonim = berlawanan. Polisemi = multi makna."]
  },
  latihan: makeSoal([
    ["Bunga desa bermakna konotasi...", ["Bunga di desa", "Gadis cantik di desa", "Tanaman hias", "Tumbuhan liar"], 1, "Bunga desa = gadis tercantik."],
    ["Sinonim pintar...", ["Bodoh", "Cerdas", "Malas", "Cepat"], 1, "Sinonim pintar = cerdas."],
    ["Antonim rajin...", ["Tekun", "Malas", "Giat", "Sungguh-sungguh"], 1, "Antonim rajin = malas."],
    ["Kalimat denotasi...", ["Dia bintang kelas.", "Rambutnya panjang.", "Hatinya berbatu.", "Dia kutu buku."], 1, "Rambutnya panjang = makna sebenarnya."],
    ["Polisemi kata kepala...", ["Hanya bagian tubuh", "Bagian tubuh dan pemimpin", "Hanya pemimpin", "Hanya organisasi"], 1, "Kepala = tubuh, pemimpin, organisasi."],
    ["Sinonim indah...", ["Jelek", "Elok", "Bodoh", "Kecil"], 1, "Sinonim indah = elok."],
    ["Antonim luas...", ["Lebar", "Sempit", "Panjang", "Besar"], 1, "Antonim luas = sempit."],
    ["Jalan dalam jalan keluar bermakna...", ["Aspal", "Solusi", "Trotoar", "Rute"], 1, "Jalan keluar = solusi (kiasan)."],
    ["Kata tepat formal: meninggal...", ["Mati", "Meninggal dunia", "Pulang", "Pergi"], 1, "Formal: meninggal dunia."],
    ["Konotasi negatif serigala...", ["Hewan hutan", "Orang buas/kejam", "Binatang buas", "Hewan karnivora"], 1, "Serigala = buas, kejam (kiasan)."],
  ]),
  praktik: {
    petunjuk: "Buat 5 kalimat dengan kata tangan. 2 denotasi, 2 konotasi, 1 kiasan.",
    tips: ["Denotasi: anggota tubuh", "Konotasi: tangan kanan = asisten", "Kiasan: panjang tangan = suka mencuri"],
    contoh: "Denotasi: Tanganku sakit karena menulis.\nKonotasi: Dia tangan kanan pak direktur.\nKiasan: Jangan panjang tangan.\nDenotasi: Dia melambaikan tangan.\nKonotasi: Pemerintah bertangan besi."
  },
  kuis: makeSoal([
    ["Kambing hitam bermakna...", ["Kambing hitam", "Orang dipersalahkan", "Hewan ternak", "Kurban"], 1, "Kambing hitam = tertuduh."],
    ["Denotasi mawar...", ["Gadis cantik", "Bunga mawar", "Cinta", "Keindahan"], 1, "Denotasi = jenis bunga."],
    ["Antonim maju...", ["Mundur", "Cepat", "Depan", "Lanjut"], 0, "Antonim maju = mundur."],
    ["Sinonim berani...", ["Takut", "Gagah", "Penakut", "Loyo"], 1, "Sinonim berani = gagah."],
    ["Kata buah dalam buah hati...", ["Buah-buahan", "Anak (kesayangan)", "Apel", "Mangga"], 1, "Buah hati = anak."],
  ]),
})

add("Kalimat Sederhana", {
  belajar: {
    tujuan: ["Memahami struktur kalimat sederhana", "Mengenal subjek, predikat, objek", "Menyusun kalimat S-P dan S-P-O"],
    materi: [
      { judul: "Apa itu Kalimat?", isi: ["Kalimat adalah kumpulan kata yang mengandung pikiran lengkap.", "Minimal terdiri dari subjek (S) dan predikat (P).", "Ciri: diawali huruf kapital, diakhiri titik/tanya/seru."], contoh: ["Adik tidur. (S=Adik, P=tidur)", "Ibu memasak. (S=Ibu, P=memasak)"] },
      { judul: "Subjek & Predikat", isi: ["Subjek: pelaku (kata benda, nama orang).", "Predikat: tindakan atau keadaan (kata kerja, kata sifat).", "Subjek menjawab siapa/apa. Predikat menjawab sedang apa."], contoh: ["S = Ayah, P = sedang membaca.", "S = Bunga itu, P = indah."] },
      { judul: "Objek & Keterangan", isi: ["Objek: sasaran tindakan (setelah kata kerja transitif).", "Keterangan: info tambahan (tempat, waktu, cara).", "Pola S-P-O: Ayah membeli koran.", "Pola S-P-O-K: Ibu memasak nasi di dapur."], contoh: ["S-P-O: Adik memakan kue.", "S-P-K: Kami belajar di kelas."] },
    ],
    rangkuman: ["Kalimat = S + P (+ O + K).", "S = pelaku, P = tindakan.", "O = sasaran, K = info tambahan."]
  },
  latihan: makeSoal([
    ["Ayah membaca koran. S = ...", ["Membaca", "Ayah", "Koran", "Ayah membaca"], 1, "S = Ayah (pelaku)."],
    ["Pola Ibu memasak nasi di dapur...", ["S-P", "S-P-O", "S-P-O-K", "S-P-K"], 2, "S=Ibu, P=memasak, O=nasi, K=di dapur."],
    ["Predikat dalam Dia sangat pintar...", ["Dia", "Sangat", "Pintar", "Sangat pintar"], 2, "P = pintar (kata sifat)."],
    ["Kalimat lengkap minimal memiliki...", ["Subjek saja", "Subjek + Predikat", "Objek saja", "Keterangan saja"], 1, "Minimal S + P."],
    ["Buku itu baru. Pola...", ["S-P", "S-P-O", "S-P-Pel", "S-P-K"], 0, "S=Buku itu, P=baru."],
    ["Andi menendang bola. O = ...", ["Andi", "Menendang", "Bola", "Andi menendang"], 2, "O = bola (sasaran)."],
    ["Kami belajar. Pola...", ["S-P-O", "S-P", "S-P-K", "S-O"], 1, "S=Kami, P=belajar."],
    ["Mereka bermain di lapangan. Pola...", ["S-P-O", "S-P-K", "S-O-K", "P-S-K"], 1, "S=Mereka, P=bermain, K=di lapangan."],
    ["Ibu guru apakah kalimat?...", ["Ya (S-P)", "Bukan (hanya frasa, tanpa predikat)", "Ya (S-O)", "Bukan (tidak lengkap)"], 1, "Ibu guru = frasa, bukan kalimat."],
    ["Dia pergi ke sekolah. Pola...", ["S-P-O", "S-P-K", "S-O-K", "P-S-K"], 1, "S=Dia, P=pergi, K=ke sekolah."],
  ]),
  praktik: {
    petunjuk: "Buat 5 kalimat tentang aktivitas sehari-hari. 2 S-P, 2 S-P-O, 1 S-P-O-K.",
    tips: ["Gunakan subjek: Saya, Ayah, Ibu", "Predikat: kata kerja aktif", "Tambahkan objek & keterangan"],
    contoh: "1. (S-P) Aku belajar.\n2. (S-P) Ayah bekerja.\n3. (S-P-O) Ibu memasak nasi.\n4. (S-P-O) Adik membaca komik.\n5. (S-P-O-K) Kami bermain bola di lapangan."
  },
  kuis: makeSoal([
    ["Dia pergi ke sekolah. Pola...", ["S-P-O", "S-P-K", "S-O-K", "P-S-K"], 1, "S=Dia, P=pergi, K=ke sekolah."],
    ["Adik menangis. Kalimat ini...", ["Tidak lengkap", "Lengkap S-P", "Hanya predikat", "Hanya subjek"], 1, "S=Adik, P=menangis — lengkap."],
    ["Kata adalah berfungsi sebagai...", ["Subjek", "Predikat", "Objek", "Keterangan"], 1, "Adalah = predikat."],
    ["Objek dalam Kucing mengejar tikus...", ["Kucing", "Mengejar", "Tikus", "Kucing mengejar"], 2, "O = tikus (dikejar)."],
    ["Mereka sedang makan. P = ...", ["Mereka", "Sedang", "Makan", "Sedang makan"], 2, "P = makan."],
  ]),
})

// Level 2
add("Imbuhan Prefiks", {
  belajar: {
    tujuan: ["Memahami awalan meN-, ber-, di-, ter-", "Menggunakan aturan perubahan bentuk", "Membedakan makna setiap awalan"],
    materi: [
      { judul: "Awalan meN-", isi: ["Menunjukkan tindakan aktif.", "Bentuk berubah: me- (l,m,n,r,w,y), mem- (b,f,p), men- (c,d,j,t,z), meng- (a,i,u,e,o,g,h,k), meny- (s).", "Huruf luluh: k, t, s, p."], contoh: ["me- + lompat = melompat", "mem- + baca = membaca", "men- + dengar = mendengar", "meng- + ambil = mengambil", "meny- + sapu = menyapu"] },
      { judul: "Awalan ber- dan di-", isi: ["ber-: memiliki (bersepeda), melakukan (bermain), dalam keadaan (berbahaya).", "di-: pasif, dikenai tindakan. Nasi dimakan adik.", "di- tidak meluluhkan huruf."], contoh: ["ber- + main = bermain", "ber- + sepeda = bersepeda", "di- + tulis = ditulis"] },
      { judul: "Awalan ter-", isi: ["Tidak sengaja: terjatuh.", "Paling (superlatif): tertinggi, terbaik.", "Dapat di-: terangkat, terbaca."], contoh: ["Tidak sengaja: Piring terjatuh.", "Paling: Dia terpandai di kelas.", "Dapat: Tulisan terbaca."] },
    ],
    rangkuman: ["meN- = aktif, bentuk sesuai huruf awal.", "ber- = memiliki/melakukan, tetap.", "di- = pasif.", "ter- = tak sengaja/paling/dapat."]
  },
  latihan: makeSoal([
    ["meN- + tulis = ...", ["Menulis", "Nulis", "Menulisi", "Tertulis"], 0, "meN- + tulis = menulis (t luluh)."],
    ["ber- + renang = ...", ["Berenang", "Berrenang", "Renang", "Berenangan"], 0, "ber- + renang = berenang."],
    ["Dimakan menggunakan awalan...", ["meN-", "di-", "ter-", "ber-"], 1, "di- = pasif."],
    ["Terjatuh bermakna...", ["Sengaja jatuh", "Tidak sengaja jatuh", "Akan jatuh", "Jatuh berulang"], 1, "ter- = tak sengaja."],
    ["Menggoreng berasal dari...", ["meN- + goreng", "meng- + goreng", "meN- + gorengan", "goreng + meN-"], 0, "g = meng-, meN- + goreng = menggoreng."],
    ["Bermain bermakna...", ["Sedang main", "Melakukan aktivitas main", "Paling main", "Tertimpa main"], 1, "ber- = melakukan."],
    ["Awalan di- tidak meluluhkan. Contoh...", ["Ditulis", "Dimasak", "Disapu", "Benar semua"], 3, "di- tidak meluluhkan."],
    ["Terindah bermakna...", ["Tidak sengaja", "Paling indah", "Dapat diindahkan", "Indah sekali"], 1, "ter- = paling."],
    ["meN- + sapu = ...", ["Menyapu", "Menyapu (s luluh)", "Mensapu", "Mengsapu"], 1, "s = meny-, luluh."],
    ["Dibaca artinya...", ["Membaca", "Dikenai tindakan baca", "Sedang baca", "Sudah baca"], 1, "di- = dikenai tindakan."],
  ]),
  praktik: {
    petunjuk: "Bentuk kata berimbuhan dari: ajar, tulis, sikat, renang, tinggi. Buat kalimat dengan 2 imbuhan berbeda per kata.",
    tips: ["Gunakan meN- dan di-", "Perhatikan huruf luluh", "Gunakan ter- untuk paling"],
    contoh: "ajar = mengajar (Ayah mengajar), belajar (Adik belajar), terajar (sudah terajar)"
  },
  kuis: makeSoal([
    ["Mendaki meN- + ...", ["Daki", "Daki (baku)", "Pendaki", "Dakian"], 0, "meN- + daki = mendaki."],
    ["Terbawa bermakna...", ["Sengaja", "Tidak sengaja terbawa", "Akan bawa", "Paling bawa"], 1, "terbawa = tak sengaja."],
    ["ber- pada berbahaya...", ["Memiliki", "Melakukan", "Dalam keadaan", "Paling"], 2, "berbahaya = dalam keadaan bahaya."],
    ["Menyapu meN- + ...", ["Sapu", "Nyapu", "Penyapu", "Sapuan"], 0, "meN- + sapu = menyapu (s luluh)."],
    ["Dibeli menggunakan...", ["meN-", "di-", "ter-", "ber-"], 1, "di- + beli = pasif."],
  ]),
})

add("Imbuhan Sufiks & Konfiks", {
  belajar: {
    tujuan: ["Memahami akhiran -an, -kan, -i", "Mengenal konfiks peN-an, ke-an, per-an", "Membedakan makna"],
    materi: [
      { judul: "Akhiran (Sufiks)", isi: ["-an: hasil (masakan), kumpulan (sayuran), alat (timbangan).", "-kan: perintah untuk orang lain (kerjakan!).", "-i: memberi atau berulang (tanami, pukuli).", "-wan/-wati: orang yang bergerak di bidang (karyawan, wartawati)."], contoh: ["-an: Masakan ibu enak.", "-wan: Dia seorang seniman."] },
      { judul: "Konfiks peN-an", isi: ["Proses: Pendaftaran dibuka.", "Tempat: Pemberhentian bus.", "Hasil: Penulisan buku ini butuh waktu."], contoh: ["Proses: Pembelajaran berlangsung seru.", "Tempat: Pemukiman kumuh."] },
      { judul: "Konfiks ke-an dan per-an", isi: ["ke-an: keadaan (kebersihan, keindahan).", "ke-an: terlalu (kebesaran = terlalu besar).", "per-an: tempat (pertokoan, perkantoran).", "per-an: hal tentang (persahabatan)."], contoh: ["ke-an: Kebersihan lingkungan penting.", "per-an: Pertokoan buka 24 jam."] },
    ],
    rangkuman: ["-an = hasil, -kan = perintah, -i = berulang.", "peN-an = proses/tempat/hasil.", "ke-an = keadaan/terlalu.", "per-an = tempat/hal tentang."]
  },
  latihan: makeSoal([
    ["Masakan berarti...", ["Alat masak", "Hasil memasak", "Tempat masak", "Proses masak"], 1, "Masakan = hasil memasak."],
    ["Konfiks peN-an pada pelatihan...", ["Alat", "Proses", "Hasil", "Tempat"], 1, "peN-an = proses."],
    ["Kebersihan konfiks...", ["peN-an", "ke-an", "per-an", "ber-an"], 1, "ke-an = keadaan."],
    ["Timbangan akhiran -an berarti...", ["Hasil", "Alat", "Kumpulan", "Tempat"], 1, "-an = alat."],
    ["Selesaikan! termasuk...", ["Pemberitahuan", "Perintah", "Pertanyaan", "Seruan"], 1, "-kan = perintah."],
    ["Pertokoan konfiks per-an berarti...", ["Keadaan", "Tempat", "Proses", "Hasil"], 1, "per-an = tempat."],
    ["Persahabatan konfiks per-an berarti...", ["Tempat", "Hal tentang", "Proses", "Alat"], 1, "persahabatan = hal tentang sahabat."],
    ["Wartawati akhiran -wati berarti...", ["Laki-laki", "Perempuan yang...", "Alat", "Tempat"], 1, "-wati = perempuan."],
    ["Pendidikan berasal dari...", ["pen- + didik + -an", "peN- + ajar + -an", "pen- + ajar", "per- + didik"], 0, "pen- + didik + -an = pendidikan."],
    ["Kebesaran ke-an berarti...", ["Keadaan besar", "Terlalu besar", "Sangat besar", "Besar sekali"], 1, "ke-an = terlalu."],
  ]),
  praktik: {
    petunjuk: "Buat 5 kalimat menggunakan: kebersihan, pelatihan, pertokoan, pendidikan, persahabatan.",
    tips: ["kebersihan = keadaan bersih", "pelatihan = proses latihan", "pertokoan = tempat toko", "pendidikan = hal tentang didik"],
    contoh: "1. Kebersihan kelas tanggung jawab kita.\n2. Pelatihan menulis diadakan Sabtu.\n3. Pertokoan buka 24 jam.\n4. Pendidikan hak setiap warga.\n5. Persahabatan mereka bertahan 10 tahun."
  },
  kuis: makeSoal([
    ["Pembelajaran konfiks...", ["peN-an", "ke-an", "per-an", "ber-an"], 0, "pembelajaran = peN-an."],
    ["Akhiran -i pada tanami...", ["Perintah", "Berulang/beri", "Hasil", "Alat"], 1, "-i = berulang."],
    ["Pemukiman berarti...", ["Keadaan", "Tempat tinggal", "Proses", "Alat"], 1, "peN-an = tempat."],
    ["per-an perikanan...", ["Tempat", "Hal tentang ikan", "Proses", "Alat"], 1, "perikanan = hal tentang ikan."],
    ["Kecantikan ke-an...", ["Tempat", "Keadaan cantik", "Terlalu cantik", "Alat"], 1, "ke-an = keadaan."],
  ]),
})

add("Kalimat Aktif & Pasif", {
  belajar: {
    tujuan: ["Membedakan kalimat aktif dan pasif", "Mengubah aktif ke pasif", "Menggunakan kata kerja tepat"],
    materi: [
      { judul: "Kalimat Aktif", isi: ["Subjek melakukan tindakan (pelaku).", "Predikat: verba berawalan meN- atau ber-.", "Pola: S (pelaku) + P (meN-/ber-) + O."], contoh: ["Ibu memasak nasi. (S=Ibu, P=memasak, O=nasi)", "Adik bermain bola."] },
      { judul: "Kalimat Pasif", isi: ["Subjek dikenai tindakan.", "Predikat: verba berawalan di- atau ter-.", "Pola: S (sasaran) + di-P + oleh + pelaku."], contoh: ["Nasi dimasak Ibu.", "Koran dibaca Ayah."] },
      { judul: "Cara Mengubah", isi: ["1) Objek jadi subjek baru.", "2) Ubah meN- jadi di-.", "3) Subjek asli jadi oleh + pelaku.", "Tanpa objek tidak bisa dipasifkan."], contoh: ["Aktif: Ayah membaca koran.", "Pasif: Koran dibaca (oleh) Ayah."] },
    ],
    rangkuman: ["Aktif: S pelaku + meN- + O.", "Pasif: S sasaran + di- + oleh.", "Ubah: O jadi S, meN- jadi di-."]
  },
  latihan: makeSoal([
    ["Ayah membaca koran termasuk...", ["Aktif", "Pasif", "Imperatif", "Tanya"], 0, "Pelaku (Ayah) melakukan aksi."],
    ["Pasif dari Ibu memasak nasi...", ["Nasi dimasak Ibu", "Ibu dimasak nasi", "Nasi memasak Ibu", "Ibu memasak"], 0, "O=nasi jadi S, memasak jadi dimasak."],
    ["Kue dibuat oleh Rina termasuk...", ["Aktif", "Pasif", "Imperatif", "Tanya"], 1, "Kue (sasaran) + dibuat (di-)."],
    ["Ciri kalimat aktif predikat...", ["berawalan di-", "berawalan meN-/ber-", "berakhiran -an", "berawalan ter-"], 1, "Aktif = meN- atau ber-."],
    ["Pasif dari Dia menulis puisi...", ["Puisi ditulis dia", "Dia ditulis puisi", "Puisi menulis dia", "Dia menulis"], 0, "O=puisi jadi S, menulis jadi ditulis."],
    ["Buku dibaca Andi subjek kalimat...", ["Andi", "Buku", "Dibaca", "Andi (pelaku)"], 1, "S = buku (sasaran)."],
    ["Rumah dibangun kakek tahun 2000. Ubah ke aktif...", ["Kakek membangun rumah tahun 2000.", "Rumah itu kakek membangun.", "Kakek dibangun rumah.", "Rumah dibangun kakek."], 0, "Kakek (pelaku) + membangun (meN-)."],
    ["Dia berlari. Bisakah dipasifkan?...", ["Bisa", "Tidak bisa (tak ada objek)", "Bisa (Dia dilari)", "Bisa (Berlari dilari)"], 1, "Intransitif (tanpa O) tidak bisa."],
    ["Aktif transitif memiliki...", ["Objek", "Tanpa objek", "Hanya S-P", "Keterangan"], 0, "Transitif = punya objek."],
    ["Pasif tanpa oleh...", ["Koran dibaca.", "Koran dibaca Ayah.", "Ayah membaca koran.", "Koran membaca."], 0, "Pasif tanpa pelaku."],
  ]),
  praktik: {
    petunjuk: "Ubah 5 kalimat aktif ke pasif:\n1) Andi membeli buku.\n2) Ibu mencuci piring.\n3) Adik memakan kue.\n4) Kakek menanam pohon.\n5) Rina menyanyikan lagu.",
    tips: ["O jadi S baru", "Ubah meN- jadi di-", "S asli jadi oleh + S"],
    contoh: "1) Buku dibeli (oleh) Andi.\n2) Piring dicuci (oleh) Ibu.\n3) Kue dimakan (oleh) Adik.\n4) Pohon ditanam (oleh) Kakek.\n5) Lagu dinyanyikan (oleh) Rina."
  },
  kuis: makeSoal([
    ["Pasif dari Kucing mengejar tikus...", ["Tikus dikejar kucing", "Tikus mengejar kucing", "Kucing dikejar tikus", "Tikus dikejar"], 0, "O=tikus jadi S, mengejar jadi dikejar."],
    ["Aktif dari Lampu dipasang ayah...", ["Ayah memasang lampu", "Lampu memasang ayah", "Ayah dipasang lampu", "Lampu dipasang"], 0, "Ayah (pelaku) + memasang (meN-)."],
    ["Ciri kalimat pasif...", ["Subjek pelaku", "Subjek sasaran", "Predikat meN-", "Objek jelas"], 1, "Pasif = S sasaran, di-."],
    ["Makanan dimasak. Kalimat ini...", ["Aktif", "Pasif tanpa pelaku", "Pasif dengan pelaku", "Imperatif"], 1, "di- pasif, tanpa pelaku."],
    ["Aktif transitif harus memiliki...", ["Subjek", "Predikat", "Objek", "Keterangan"], 2, "Transitif = butuh objek."],
  ]),
})

add("Kalimat Luas dengan Keterangan", {
  belajar: {
    tujuan: ["Memperluas kalimat dengan keterangan", "Mengenal jenis keterangan", "Menyusun kalimat variatif"],
    materi: [
      { judul: "Apa itu Kalimat Luas?", isi: ["Kalimat tunggal yang diperluas dengan keterangan.", "Keterangan membuat kalimat lebih informatif."], contoh: ["Sempit: Adik tidur.", "Luas: Adik tidur di kamar setelah pulang sekolah."] },
      { judul: "Jenis Keterangan", isi: ["Tempat: di, ke, dari (di rumah, ke pasar).", "Waktu: pada, sejak, setiap (pagi hari, sejak kemarin).", "Cara: dengan, secara (dengan cepat).", "Tujuan: untuk, agar (untuk belajar).", "Sebab: karena, sebab (karena sakit).", "Alat: dengan (dengan pensil)."], contoh: ["K tempat: Ayah bekerja di kantor.", "K waktu: Ibu memasak setiap pagi.", "K cara: Dia berjalan dengan cepat."] },
    ],
    rangkuman: ["Kalimat luas = S-P-O + K.", "Jenis K: tempat, waktu, cara, tujuan, sebab, alat.", "K di awal pakai koma."]
  },
  latihan: makeSoal([
    ["Ibu memasak di dapur. Keterangan...", ["Waktu", "Tempat", "Cara", "Alat"], 1, "di dapur = tempat."],
    ["Dia belajar dengan giat. Keterangan...", ["Tempat", "Waktu", "Cara", "Tujuan"], 2, "dengan giat = cara."],
    ["Setiap hari, Ibu ke pasar. Keterangan di...", ["Awal kalimat", "Akhir kalimat", "Tengah", "Tidak ada"], 0, "Setiap hari di awal, dipisah koma."],
    ["Mereka pergi ke pantai. Keterangan...", ["Tempat", "Waktu", "Cara", "Alat"], 0, "ke pantai = tempat."],
    ["Keterangan tujuan menggunakan...", ["karena", "dengan", "agar", "di"], 2, "Agar = tujuan."],
    ["Karena sakit, dia tidak masuk. Keterangan...", ["Tempat", "Waktu", "Sebab", "Cara"], 2, "Karena sakit = sebab."],
    ["Dengan pensil, Adik menggambar. Keterangan...", ["Waktu", "Tempat", "Alat", "Tujuan"], 2, "Dengan pensil = alat."],
    ["Penulisan benar jika K di awal...", ["Di sekolah aku belajar.", "Di sekolah, aku belajar.", "di sekolah aku belajar.", "Di Sekolah aku belajar."], 1, "Koma setelah K di awal."],
    ["Dia pergi ke sekolah naik sepeda. Keterangan cara...", ["ke sekolah", "naik sepeda", "Dia", "pergi"], 1, "naik sepeda = cara."],
    ["Luaskan: Adik bermain. = ...", ["Adik bermain di halaman.", "Adik bermain.", "Adik dan kakak.", "Bermain adik."], 0, "Ditambah K tempat."],
  ]),
  praktik: {
    petunjuk: "Kembangkan 3 kalimat dengan minimal 2 keterangan:\n1) Anak itu bermain.\n2) Guru mengajar.\n3) Kami berlibur.",
    tips: ["Tambahkan K tempat (di...)", "Tambahkan K waktu (setiap...)", "Tambahkan K cara (dengan...)"],
    contoh: "1) Anak itu bermain di taman setiap sore dengan riang.\n2) Guru mengajar di kelas setiap hari dengan sabar.\n3) Kami berlibur ke Pantai Kuta pada liburan lalu."
  },
  kuis: makeSoal([
    ["Untuk meraih mimpi, dia belajar keras. Keterangan...", ["Tempat", "Cara", "Waktu", "Tujuan"], 3, "Untuk meraih mimpi = tujuan."],
    ["Luasan: Mereka berdiskusi + K cara...", ["Mereka berdiskusi.", "Mereka berdiskusi dengan seru.", "Mereka di kelas.", "Mereka berdiskusi kemarin."], 1, "dengan seru = cara."],
    ["Dua keterangan: Dia belajar...", ["Dia belajar.", "Dia belajar di kamar setiap malam.", "Dia belajar.", "Belajar."], 1, "K tempat + K waktu."],
    ["Keterangan waktu yang tepat...", ["di rumah", "setiap hari", "dengan giat", "karena sakit"], 1, "setiap hari = waktu."],
    ["Ayah membaca koran + K waktu...", ["Ayah membaca koran.", "Ayah membaca koran setiap pagi.", "Ayah membaca.", "Ayah di kantor."], 1, "Ditambah setiap pagi."],
  ]),
})

add("Sinonim, Antonim, Polisemi", {
  belajar: {
    tujuan: ["Memahami sinonim dan antonim", "Mengenal polisemi", "Memperkaya kosakata"],
    materi: [
      { judul: "Sinonim", isi: ["Kata dengan makna mirip atau sama.", "Pintar, cerdas, pandai, brilian.", "Tidak selalu bisa saling menggantikan (Jalan Raya bukan Jalan Besar)."], contoh: ["Indah = elok, cantik, permai", "Besar = raksasa, agung, megah"] },
      { judul: "Antonim", isi: ["Kata berlawanan makna.", "Kaya x miskin, tinggi x rendah, rajin x malas.", "Mutlak (hidup x mati) atau gradasi (kaya x miskin)."], contoh: ["Panas x dingin", "Cepat x lambat", "Terang x gelap"] },
      { judul: "Polisemi", isi: ["Satu kata banyak makna terkait.", "Kepala = 1) tubuh, 2) pemimpin (kepala sekolah), 3) bagian (kepala jarum).", "Tahun = periode 365 hari, masa (tahun ajaran)."], contoh: ["Mata = 1) indra, 2) sumber (mata air), 3) bagian (mata pisau)"] },
    ],
    rangkuman: ["Sinonim = mirip.", "Antonim = berlawanan.", "Polisemi = satu kata banyak makna."]
  },
  latihan: makeSoal([
    ["Sinonim cerdas...", ["Bodoh", "Pandai", "Malas", "Cepat"], 1, "Sinonim cerdas = pandai."],
    ["Antonim rajin...", ["Tekun", "Malas", "Giat", "Sungguh-sungguh"], 1, "Antonim rajin = malas."],
    ["Polisemi kata kepala - kepala sekolah...", ["Bagian tubuh", "Pemimpin", "Organisasi", "Anggota"], 1, "Kepala sekolah = pimpinan."],
    ["Sinonim indah...", ["Jelek", "Elok", "Bodoh", "Kecil"], 1, "Sinonim indah = elok."],
    ["Antonim luas...", ["Lebar", "Sempit", "Panjang", "Besar"], 1, "Antonim luas = sempit."],
    ["Bunga desa - kata bunga di sini...", ["Denotasi (kembang)", "Konotasi (gadis)", "Polisemi", "Sinonim"], 1, "Bunga desa = gadis cantik (kiasan)."],
    ["Sinonim berani...", ["Takut", "Gagah", "Penakut", "Loyo"], 1, "Sinonim berani = gagah."],
    ["Mata air - mata berarti...", ["Indra", "Sumber", "Perhatian", "Bagian"], 1, "Mata air = sumber air."],
    ["BUKAN antonim...", ["Panas x dingin", "Cantik x elok", "Tinggi x rendah", "Cepat x lambat"], 1, "Cantik x elok = sinonim."],
    ["Sinonim pandai...", ["Bodoh", "Cerdas", "Malas", "Lambat"], 1, "Pandai = cerdas."],
  ]),
  praktik: {
    petunjuk: "Buat 5 kalimat dengan kata tahun: 2 denotasi, 1 polisemi, 2 konteks berbeda.",
    tips: ["Denotasi: periode 365 hari", "Polisemi: tahun ajaran", "Konteks: tahun baru"],
    contoh: "1. (Denotasi) Tahun 2024 adalah tahun kabisat.\n2. (Denotasi) Umurku 15 tahun.\n3. (Polisemi) Tahun ajaran baru dimulai Juli.\n4. Tahun baru Imlek dirayakan meriah.\n5. Tahun-tahun emas masa remaja."
  },
  kuis: makeSoal([
    ["Sinonim pandai...", ["Bodoh", "Cerdas", "Malas", "Lambat"], 1, "Pandai = cerdas."],
    ["Antonim kaya...", ["Miskin", "Harta", "Berlimpah", "Mewah"], 0, "Antonim kaya = miskin."],
    ["Tahun dalam tahun ajaran termasuk...", ["Denotasi", "Polisemi", "Antonim", "Sinonim"], 1, "Polisemi."],
    ["Homonim vs polisemi...", ["Makna tidak berhubungan", "Makna masih berhubungan", "Sama", "Kata berbeda"], 0, "Homonim: makna tak berhubungan."],
    ["Sinonim besar...", ["Kecil", "Agung", "Kurus", "Ringan"], 1, "Sinonim besar = agung."],
  ]),
})

// Level 3
add("Kalimat Majemuk Setara", {
  belajar: {
    tujuan: ["Memahami kalimat majemuk setara", "Mengenal konjungsi setara", "Menyusun kalimat majemuk setara"],
    materi: [
      { judul: "Apa itu Majemuk Setara?", isi: ["Gabungan dua kalimat tunggal atau lebih yang setara.", "Kedudukan klausa sama (tidak ada yang bergantung).", "Konjungsi: dan, atau, tetapi, lalu, sedangkan."], contoh: ["Ayah membaca koran dan ibu memasak. — dua klausa setara."] },
      { judul: "Jenis Hubungan", isi: ["Penambahan: dan, serta, lagi pula.", "Pilihan: atau.", "Pertentangan: tetapi, namun, sedangkan.", "Urutan: lalu, kemudian."], contoh: ["Penambahan: Adik bernyanyi dan menari.", "Pilihan: Belajar atau bermain?", "Pertentangan: Dia rajin tetapi nilainya jelek."] },
    ],
    rangkuman: ["Majemuk setara = dua klausa setara.", "Konjungsi: dan, atau, tetapi, lalu.", "Kedudukan klausa sama."]
  },
  latihan: makeSoal([
    ["Ayah membaca koran dan ibu memasak. Konjungsi...", ["Penambahan", "Pilihan", "Pertentangan", "Urutan"], 0, "Dan = penambahan."],
    ["Konjungsi tetapi menyatakan...", ["Penambahan", "Pilihan", "Pertentangan", "Urutan"], 2, "Tetapi = pertentangan."],
    ["Dia pandai. Dia malas. Gabung...", ["Dia pandai dan malas.", "Dia pandai tetapi malas.", "Dia pandai atau malas.", "Dia pandai lalu malas."], 1, "Pertentangan: tetapi."],
    ["Makan dulu. Baru pergi. Konjungsi...", ["dan", "atau", "lalu", "tetapi"], 2, "Urutan: lalu."],
    ["Majemuk setara memiliki klausa...", ["Bergantung", "Setara", "Lebih tinggi", "Lebih rendah"], 1, "Setara = sederajat."],
    ["Kamu mau es krim atau kue? Konjungsi...", ["Penambahan", "Pilihan", "Pertentangan", "Urutan"], 1, "Atau = pilihan."],
    ["Dia tidak hanya pintar tetapi juga rendah hati. Konjungsi...", ["Setara penegas", "Pertentangan", "Penambahan", "Pilihan"], 0, "Tidak hanya... tetapi juga = penegas."],
    ["Gabung: Hujan deras. Kami tetap berangkat.", ["Hujan deras dan kami tetap berangkat.", "Hujan deras tetapi kami tetap berangkat.", "Hujan deras atau kami tetap berangkat."], 1, "Pertentangan: tetapi."],
    ["Saya suka kopi. Adik suka susu. Konjungsi...", ["tetapi", "dan", "atau", "lalu"], 1, "Penambahan: dan."],
    ["Mula-mula siapkan. Kemudian campur. Konjungsi...", ["Penambahan", "Pilihan", "Urutan", "Pertentangan"], 2, "Kemudian = urutan."],
  ]),
  praktik: {
    petunjuk: "Gabung dengan konjungsi tepat:\n1) Ibu pergi ke pasar. Ayah pergi ke kantor. (dan)\n2) Hari hujan. Kami tetap bermain. (tetapi)\n3) Dia belajar. Dia menonton TV. (atau)\n4) Makan malam selesai. Kami cuci piring. (lalu)",
    contoh: "1) Ibu pergi ke pasar dan Ayah pergi ke kantor.\n2) Hari hujan tetapi kami tetap bermain.\n3) Dia belajar atau menonton TV.\n4) Makan malam selesai lalu kami cuci piring."
  },
  kuis: makeSoal([
    ["Dan, serta, lagi pula termasuk konjungsi...", ["Penambahan", "Pilihan", "Pertentangan", "Urutan"], 0, "Penambahan."],
    ["Namun sama dengan...", ["Dan", "Atau", "Tetapi", "Lalu"], 2, "Namun = tetapi."],
    ["Atau menyatakan...", ["Penambahan", "Pilihan", "Pertentangan", "Urutan"], 1, "Atau = pilihan."],
    ["Tiga klausa: Ibu memasak, Ayah membaca, Kakak menulis...", ["1", "2", "3", "4"], 2, "Tiga klausa."],
    ["Sedangkan menyatakan...", ["Penambahan", "Pertentangan", "Pilihan", "Urutan"], 1, "Sedangkan = pertentangan."],
  ]),
})

add("Kalimat Majemuk Bertingkat", {
  belajar: {
    tujuan: ["Memahami kalimat majemuk bertingkat", "Mengenal konjungsi bertingkat", "Menyusun induk dan anak kalimat"],
    materi: [
      { judul: "Apa itu Majemuk Bertingkat?", isi: ["Gabungan klausa tidak setara: induk + anak kalimat.", "Induk: klausa utama (dapat berdiri sendiri).", "Anak: klausa pendukung (bergantung pada induk).", "Konjungsi: karena, jika, meskipun, sehingga, bahwa, agar."], contoh: ["Dia tidak masuk karena sakit. — induk (dia tidak masuk), anak (karena sakit)."] },
      { judul: "Jenis Hubungan", isi: ["Sebab: karena, sebab.", "Akibat: sehingga, akibatnya.", "Syarat: jika, apabila, seandainya.", "Konsesif: meskipun, walaupun.", "Tujuan: agar, supaya.", "Penjelas: bahwa."], contoh: ["Sebab: Dia menangis karena terjatuh.", "Syarat: Jika belajar, kamu naik kelas.", "Konsesif: Meskipun hujan, ia tetap berangkat.", "Penjelas: Aku tahu bahwa dia jujur."] },
    ],
    rangkuman: ["Bertingkat = induk + anak kalimat.", "Konjungsi: karena, sehingga, jika, meskipun, agar, bahwa.", "Anak kalimat tidak bisa berdiri sendiri."]
  },
  latihan: makeSoal([
    ["Dia tidak masuk karena sakit. Induk...", ["Karena sakit", "Dia tidak masuk", "Sakit", "Dia sakit"], 1, "Induk = dia tidak masuk."],
    ["Konjungsi jika menyatakan...", ["Sebab", "Akibat", "Syarat", "Konsesif"], 2, "Jika = syarat."],
    ["Meskipun capek, ia tetap olahraga. Konjungsi...", ["Sebab", "Akibat", "Syarat", "Konsesif"], 3, "Meskipun = konsesif."],
    ["Induk dalam Aku tahu bahwa dia benar...", ["Aku tahu", "Bahwa dia benar", "Dia benar", "Tahu bahwa"], 0, "Induk = Aku tahu."],
    ["Konjungsi sehingga menyatakan...", ["Sebab", "Akibat", "Syarat", "Tujuan"], 1, "Sehingga = akibat."],
    ["Anak kalimat Karena sakit pada Karena sakit, dia tidak masuk...", ["Induk", "Anak kalimat", "Setara", "Objek"], 1, "Anak kalimat (sebab)."],
    ["Agar menyatakan...", ["Sebab", "Akibat", "Syarat", "Tujuan"], 3, "Agar = tujuan."],
    ["Gabung: Dia rajin. Nilainya bagus.", ["karena", "sehingga", "jika", "meskipun"], 1, "Akibat: sehingga."],
    ["Jika hujan, kita diam di rumah. Anak kalimat...", ["Jika hujan", "Kita diam", "Di rumah", "Kita diam di rumah"], 0, "Anak kalimat syarat."],
    ["Bahwa termasuk konjungsi...", ["Sebab", "Akibat", "Penjelas", "Syarat"], 2, "Bahwa = penjelas."],
  ]),
  praktik: {
    petunjuk: "Gabung dengan konjungsi bertingkat:\n1) Saya belajar. Saya ingin pintar. (agar)\n2) Cuaca buruk. Penerbangan ditunda. (sehingga)\n3) Hujan deras. Petani tetap ke sawah. (meskipun)\n4) Ada ujian. Saya harus belajar. (karena)",
    contoh: "1) Saya belajar agar saya pintar.\n2) Cuaca buruk sehingga penerbangan ditunda.\n3) Meskipun hujan deras, petani tetap ke sawah.\n4) Karena ada ujian, saya harus belajar."
  },
  kuis: makeSoal([
    ["Supaya sama dengan...", ["Karena", "Agar", "Meskipun", "Jika"], 1, "Supaya = agar."],
    ["Perbedaan setara dan bertingkat...", ["Setara sederajat, bertingkat induk-anak", "Sama", "Bertingkat pendek", "Setara panjang"], 0, "Setara sederajat, bertingkat induk-anak."],
    ["Seandainya termasuk konjungsi...", ["Sebab", "Akibat", "Syarat", "Konsesif"], 2, "Seandainya = syarat."],
    ["Anak kalimat walaupun hujan...", ["Bisa berdiri sendiri", "Tidak bisa", "Kalimat utama", "Jawaban"], 1, "Anak kalimat bergantung."],
    ["Dia pintar sehingga juara kelas. Konjungsi...", ["Sebab", "Akibat", "Syarat", "Konsesif"], 1, "Sehingga = akibat."],
  ]),
})

add("Paragraf & Gagasan Utama", {
  belajar: {
    tujuan: ["Memahami paragraf", "Menemukan gagasan utama", "Mengidentifikasi kalimat penjelas"],
    materi: [
      { judul: "Apa itu Paragraf?", isi: ["Kumpulan kalimat satu gagasan utuh.", "Syarat: kesatuan, koherensi, pengembangan.", "Ideal 3-7 kalimat."], contoh: ["Satu gagasan: paragraf manfaat membaca — semua kalimat mendukung topik."] },
      { judul: "Gagasan Utama", isi: ["Inti/ide pokok paragraf.", "Kalimat utama = yang mengandung gagasan utama.", "Kalimat penjelas = mengembangkan gagasan utama."], contoh: ["Utama: Membaca banyak manfaat.", "Penjelas: Pertama, menambah ilmu. Kedua, melatih fokus."] },
      { judul: "Pola Pengembangan", isi: ["Deduktif: utama di awal = umum ke khusus.", "Induktif: utama di akhir = khusus ke umum.", "Campuran: utama di awal dan ditegaskan di akhir."], contoh: ["Deduktif: Olahraga penting. Olahraga lancarkan darah.", "Induktif: Olahraga lancarkan darah. Jelas olahraga penting."] },
    ],
    rangkuman: ["Paragraf = kumpulan kalimat satu gagasan.", "Gagasan utama = inti paragraf.", "Deduktif: di awal. Induktif: di akhir."]
  },
  latihan: makeSoal([
    ["Gagasan utama deduktif di...", ["Awal", "Akhir", "Tengah", "Awal dan akhir"], 0, "Deduktif = utama di awal."],
    ["Kalimat penjelas berfungsi...", ["Menjadi inti", "Mengembangkan gagasan utama", "Menutup", "Mengganti utama"], 1, "Penjelas = mengembangkan."],
    ["Pertama, kedua, ketiga termasuk...", ["Kalimat utama", "Penanda urutan penjelas", "Gagasan utama", "Konjungsi"], 1, "Penanda urutan penjelas."],
    ["Paragraf baik harus memiliki...", ["Kesatuan ide", "Kata asing", "Banyak kalimat", "Majas"], 0, "Syarat = kesatuan."],
    ["Dengan demikian biasanya di paragraf...", ["Deduktif", "Induktif (simpulan)", "Deskriptif", "Campuran"], 1, "Dengan demikian = simpulan."],
    ["Induktif gagasan utama di...", ["Awal", "Akhir", "Tengah", "Setiap kalimat"], 1, "Induktif = utama di akhir."],
    ["Syarat paragraf baik kecuali...", ["Kesatuan", "Koherensi", "Minimal 10 kalimat", "Pengembangan"], 2, "Tidak ada syarat panjang."],
    ["BUKAN fungsi kalimat penjelas...", ["Memberi contoh", "Menyajikan data", "Menjadi gagasan utama", "Memberi alasan"], 2, "Gagasan utama = fungsi kalimat utama."],
    ["Jadi, menjaga kesehatan sangat penting. Letak...", ["Awal (deduktif)", "Akhir (induktif)", "Tengah", "Tidak jelas"], 1, "Jadi = simpulan di akhir."],
    ["Koherensi berarti...", ["Banyak kata", "Hubungan padu antarkalimat", "Panjang", "Indah"], 1, "Koherensi = kepaduan."],
  ]),
  praktik: {
    petunjuk: "Buat paragraf deduktif dan induktif tentang Manfaat Membaca. Masing-masing 4-5 kalimat.",
    tips: ["Deduktif: manfaat umum di awal lalu rinci", "Induktif: rincian dulu, simpulan di akhir"],
    contoh: "Deduktif: Membaca buku punya banyak manfaat. Pertama, menambah wawasan. Kedua, melatih fokus. Ketiga, mengurangi stres.\n\nInduktif: Membaca menambah wawasan. Membaca melatih fokus. Membaca mengurangi stres. Jelas, membaca punya banyak manfaat."
  },
  kuis: makeSoal([
    ["Gagasan utama = ...", ["Ide pokok", "Kalimat penjelas", "Contoh", "Data"], 0, "Gagasan utama = ide pokok."],
    ["Deduktif dimulai dengan...", ["Contoh", "Gagasan umum", "Data", "Simpulan"], 1, "Deduktif = umum ke khusus."],
    ["Di samping itu termasuk penanda...", ["Utama", "Tambahan penjelas", "Simpulan", "Akhir"], 1, "Di samping itu = tambahan."],
    ["Tidak termasuk pola paragraf...", ["Deduktif", "Induktif", "Reduktif", "Campuran"], 2, "Tidak ada reduktif."],
    ["Ide pokok disebut juga...", ["Gagasan utama", "Kalimat penjelas", "Topik kalimat", "Rangkuman"], 0, "Ide pokok = gagasan utama."],
  ]),
})

add("Kohesi & Koherensi", {
  belajar: {
    tujuan: ["Memahami kohesi (paduan bentuk)", "Memahami koherensi (paduan makna)", "Menggunakan konjungsi antarkalimat"],
    materi: [
      { judul: "Kohesi", isi: ["Kepaduan antarkalimat secara bentuk.", "Alat: pronomina (dia, -nya), repetisi (pengulangan), substitusi, elipsis (penghilangan), konjungsi."], contoh: ["Pronomina: Andi pandai. Dia rajin.", "Repetisi: Belajar itu penting. Belajar membuka pintu ilmu."] },
      { judul: "Koherensi", isi: ["Hubungan makna logis antarkalimat.", "Konjungsi antarkalimat: oleh karena itu, selain itu, dengan demikian, sementara itu."], contoh: ["Dia rajin. Oleh karena itu, nilainya bagus.", "Dia pandai. Namun, dia malas."] },
    ],
    rangkuman: ["Kohesi = paduan bentuk (pronomina, repetisi, elipsis).", "Koherensi = paduan makna logis.", "Gunakan konjungsi antarkalimat."]
  },
  latihan: makeSoal([
    ["Ani pandai. Dia rajin. Dia sebagai alat...", ["Repetisi", "Pronomina", "Elipsis", "Konjungsi"], 1, "Dia = pronomina."],
    ["Koherensi berkaitan dengan...", ["Bentuk kata", "Hubungan makna logis", "Ejaan", "Tanda baca"], 1, "Koherensi = hubungan makna."],
    ["Oleh karena itu menunjukkan...", ["Penambahan", "Sebab-akibat", "Pertentangan", "Urutan"], 1, "Sebab-akibat."],
    ["Elipsis adalah...", ["Pengulangan", "Penghilangan unsur", "Kata ganti", "Kata hubung"], 1, "Elipsis = penghilangan."],
    ["Selain itu fungsinya...", ["Menentang", "Menambah informasi", "Menyimpulkan", "Urutan"], 1, "Selain itu = tambahan."],
    ["Repetisi berfungsi...", ["Mengganti", "Mengulang kata kunci", "Menghilangkan", "Menyingkat"], 1, "Repetisi = pengulangan."],
    ["Dengan demikian termasuk konjungsi...", ["Antarkalimat simpulan", "Intrakalimat", "Penambahan", "Sebab"], 0, "Simpulan (antarkalimat)."],
    ["Saya suka kopi. [Saya] minum setiap pagi. Ini...", ["Repetisi", "Elipsis", "Pronomina", "Konjungsi"], 1, "Saya dihilangkan = elipsis."],
    ["Kohesi tanpa koherensi...", ["Tulisan indah", "Padu bentuk tapi tak nyambung", "Sempurna", "Ideal"], 1, "Bentuk padu, makna tidak logis."],
    ["Sementara itu termasuk konjungsi...", ["Antarkalimat", "Intrakalimat", "Penambahan", "Urutan"], 0, "Antarkalimat."],
  ]),
  praktik: {
    petunjuk: "Perbaiki paragraf agar kohesif dan koheren:\n\nBudi anak rajin. Budi selalu belajar. Nilai Budi bagus. Budi disayang guru.",
    tips: ["Ganti Budi dengan Dia", "Tambahkan karena atau sehingga", "Gabung kalimat berhubungan"],
    contoh: "Budi anak yang rajin. Dia selalu belajar setiap hari. Karena rajin, nilainya bagus. Oleh karena itu, dia disayang guru."
  },
  kuis: makeSoal([
    ["Namun termasuk konjungsi...", ["Penambahan", "Pertentangan", "Sebab", "Akibat"], 1, "Namun = pertentangan."],
    ["Alat kohesi mengulang kata kunci...", ["Pronomina", "Repetisi", "Elipsis", "Konjungsi"], 1, "Repetisi = pengulangan."],
    ["Koherensi baik membuat pembaca...", ["Bingung", "Mudah mengikuti alur", "Menebak", "Berhenti"], 1, "Mudah mengikuti alur."],
    ["Pertama... Kedua... Ketiga... menunjukkan...", ["Sebab", "Urutan", "Penambahan", "Pertentangan"], 1, "Urutan."],
    ["Akhirnya menandai...", ["Awal", "Penutup/kesimpulan", "Pertentangan", "Tambahan"], 1, "Penutup."],
  ]),
})

add("Fakta & Opini", {
  belajar: {
    tujuan: ["Membedakan fakta dan opini", "Mengidentifikasi fakta dalam teks", "Menyampaikan opini dengan data"],
    materi: [
      { judul: "Fakta", isi: ["Informasi yang dapat dibuktikan.", "Ciri: data, angka, tanggal, peristiwa nyata.", "Kata kunci: berdasarkan data, menurut riset, pada tahun."], contoh: ["Jumlah penduduk Indonesia 278 juta jiwa (BPS).", "Gempa Lombok 2018 berkekuatan 7,0 SR."] },
      { judul: "Opini", isi: ["Pendapat/pandangan pribadi.", "Ciri: kata subjektif (menurut saya, sebaiknya, mungkin).", "Opini baik didukung fakta."], contoh: ["Menurut saya, pendidikan adalah prioritas.", "Sebaiknya pemerintah turunkan harga BBM."] },
      { judul: "Asumsi", isi: ["Dugaan belum terbukti.", "Kata: sepertinya, barangkali, agaknya.", "Asumsi perlu diuji dengan data."], contoh: ["Sepertinya hujan akan turun.", "Barangkali dia tidak datang karena macet."] },
    ],
    rangkuman: ["Fakta = dapat dibuktikan.", "Opini = pendapat pribadi.", "Asumsi = dugaan belum terbukti.", "Opini kuat = didukung fakta."]
  },
  latihan: makeSoal([
    ["Harga minyak US$80/barel termasuk...", ["Fakta", "Opini", "Asumsi", "Saran"], 0, "Harga bisa dicek = fakta."],
    ["Sebaiknya kita belajar lebih giat termasuk...", ["Fakta", "Opini", "Asumsi", "Perintah"], 1, "Sebaiknya = opini."],
    ["Barangkali dia sakit termasuk...", ["Fakta", "Opini", "Asumsi", "Perintah"], 2, "Barangkali = asumsi."],
    ["Kata kunci fakta...", ["Sepertinya", "Berdasarkan data", "Menurut saya", "Mungkin"], 1, "Berdasarkan data = fakta."],
    ["Opini baik didukung...", ["Perasaan", "Fakta/data", "Tebakan", "Khayalan"], 1, "Opini kuat = data."],
    ["Menurut saya menandai...", ["Fakta", "Opini", "Asumsi", "Data"], 1, "Menurut saya = opini."],
    ["Fakta bersifat...", ["Subjektif", "Objektif", "Relatif", "Tergantung"], 1, "Fakta = objektif."],
    ["Sepertinya menandai...", ["Fakta", "Opini", "Asumsi", "Data"], 2, "Sepertinya = asumsi."],
    ["Perbedaan fakta dan opini...", ["Panjang", "Kebenaran terverifikasi", "Jumlah kata", "Struktur"], 1, "Fakta terverifikasi."],
    ["Data BPS: inflasi 3,5% termasuk...", ["Fakta", "Opini", "Asumsi", "Prediksi"], 0, "Data BPS = fakta."],
  ]),
  praktik: {
    petunjuk: "Kelompokkan ke F (Fakta), O (Opini), A (Asumsi):\n1) Jumlah pengguna internet 215 juta jiwa (2023).\n2) Menurut saya, internet sangat bermanfaat.\n3) Sepertinya angka ini naik tahun depan.\n4) Data We Are Social: online 7 jam/hari.",
    tips: ["Cari data/angka = F", "Menurut saya = O", "Sepertinya = A"],
    contoh: "1) F (data 215 juta)\n2) O (menurut saya)\n3) A (sepertinya)\n4) F (sumber data)"
  },
  kuis: makeSoal([
    ["Indonesia merdeka 17 Agustus 1945 adalah...", ["Fakta", "Opini", "Asumsi", "Legenda"], 0, "Peristiwa sejarah = fakta."],
    ["Saya rasa belajar itu penting adalah...", ["Fakta", "Opini", "Asumsi", "Data"], 1, "Saya rasa = opini."],
    ["Mungkin dia akan datang adalah...", ["Fakta", "Opini", "Asumsi", "Pasti"], 2, "Mungkin = asumsi."],
    ["Fakta dalam iklan...", ["Rasanya paling enak", "Kandungan vitamin C 50mg", "Kamu pasti suka", "Sangat berkhasiat"], 1, "Kandungan 50mg = terukur."],
    ["Kesimpulan berdasarkan data dari...", ["Opini", "Asumsi", "Fakta", "Prediksi"], 2, "Berdasarkan data = fakta."],
  ]),
})

// Level 4
add("Teks Deskripsi", {
  belajar: {
    tujuan: ["Memahami ciri teks deskripsi", "Mengenal majas dalam deskripsi", "Menulis deskripsi dengan panca indra"],
    materi: [
      { judul: "Pengertian Teks Deskripsi", isi: ["Teks yang menggambarkan objek dengan detail.", "Tujuan: pembaca seolah melihat/mendengar/merasakan.", "Ciri: melibatkan panca indra, banyak kata sifat."], contoh: ["Pantai itu indah. Pasir putih lembut. Angin sepoi membelai wajah."] },
      { judul: "Struktur Teks Deskripsi", isi: ["Identifikasi: pengenalan objek.", "Deskripsi bagian: ciri fisik, suasana, detail.", "Simpulan/kesan: penutup."], contoh: ["Identifikasi: Rumah itu sudah tua.", "Deskripsi: Catnya kusam, jendela berdebu.", "Kesan: Rumah itu penuh kenangan."] },
      { judul: "Majas dalam Deskripsi", isi: ["Personifikasi: benda mati seolah hidup (angin membelai).", "Metafora: perbandingan tanpa kata (bunga desa).", "Hiperbola: melebih-lebihkan (menangis keras sekali)."], contoh: ["Personifikasi: Mentari tersenyum pagi ini.", "Metafora: Dia adalah bintang kelas.", "Hiperbola: Suaranya menggelegar."] },
    ],
    rangkuman: ["Deskripsi = gambaran detail panca indra.", "Struktur: identifikasi + deskripsi + kesan.", "Gunakan majas: personifikasi, metafora, hiperbola."]
  },
  latihan: makeSoal([
    ["Tujuan teks deskripsi...", ["Menceritakan kisah", "Menggambarkan objek", "Menyajikan data", "Mengajak berdebat"], 1, "Deskripsi = menggambarkan."],
    ["Struktur: identifikasi, ..., kesan.", ["Deskripsi bagian", "Narasi", "Konflik", "Alur"], 0, "Deskripsi bagian = ciri fisik."],
    ["Angin membelai wajah adalah...", ["Metafora", "Personifikasi", "Hiperbola", "Litotes"], 1, "Angin seolah hidup = personifikasi."],
    ["Bunga desa adalah majas...", ["Personifikasi", "Metafora", "Hiperbola", "Denotasi"], 1, "Bunga desa = perbandingan."],
    ["Sinar lampu seterang matahari adalah...", ["Personifikasi", "Metafora", "Hiperbola", "Simile"], 3, "Perbandingan dengan kata 'seterang' = simile."],
    ["Suasananya sunyi, hanya suara jangkrik. Ini...", ["Identifikasi", "Deskripsi bagian", "Simpulan", "Amanat"], 1, "Deskripsi suasana."],
    ["Majas yang melebih-lebihkan...", ["Personifikasi", "Metafora", "Hiperbola", "Simile"], 2, "Hiperbola = melebih-lebihkan."],
    ["Dinding rumah itu dicat biru termasuk...", ["Identifikasi", "Deskripsi visual", "Kesan", "Majas"], 1, "Warna biru = deskripsi visual."],
    ["Kata sifat dominan dalam...", ["Narasi", "Deskripsi", "Prosedur", "Eksposisi"], 1, "Deskripsi banyak kata sifat."],
    ["Kalimat: Pantai ini sangat memesona. Itu...", ["Identifikasi", "Deskripsi", "Kesan/penutup", "Pengantar"], 2, "Kesan subjektif."],
  ]),
  praktik: {
    petunjuk: "Deskripsikan pasar tradisional dalam 2 paragraf.\nParagraf 1: identifikasi (lokasi, suasana umum)\nParagraf 2: detail panca indra (aroma, suara, pemandangan)",
    tips: ["Gunakan minimal 3 panca indra", "Akhiri dengan kesanmu"],
    contoh: ""
  },
  kuis: makeSoal([
    ["Ciri utama deskripsi...", ["Alur cerita", "Detail panca indra", "Dialog", "Konflik"], 1, "Panca indra = ciri utama."],
    ["Struktur deskripsi: identifikasi, ..., kesan.", ["Narasi", "Deskripsi bagian", "Prolog", "Epilog"], 1, "Deskripsi bagian."],
    ["Hiperbola adalah...", ["Perbandingan", "Melebih-lebihkan", "Personifikasi", "Pengulangan"], 1, "Hiperbola = berlebihan."],
    ["Teks deskripsi tidak...", ["Menggambarkan", "Mendeskripsikan", "Menyajikan data objektif", "Melukiskan"], 2, "Deskripsi subjektif juga."],
    ["Personifikasi memberi sifat...", ["Manusia ke benda mati", "Benda ke manusia", "Hewan ke benda", "Abstrak ke nyata"], 0, "Manusia ke benda mati."],
  ]),
})

add("Teks Narasi", {
  belajar: {
    tujuan: ["Memahami teks narasi", "Mengenal alur dan tokoh", "Menulis cerita dengan struktur"],
    materi: [
      { judul: "Pengertian Narasi", isi: ["Cerita tentang peristiwa/kejadian.", "Ada tokoh, alur, latar, konflik.", "Tujuan: menghibur atau menyampaikan amanat."], contoh: ["Pada suatu hari, Sita berjalan ke hutan..."] },
      { judul: "Struktur Narasi", isi: ["Orientasi: pengenalan tokoh dan latar.", "Komplikasi: awal konflik.", "Resolusi: penyelesaian.", "Koda: pesan moral (opsional)."], contoh: ["Ori: Sita tinggal di desa kecil.", "Komplikasi: Suatu hari ia tersesat.", "Resolusi: Ia menemukan jalan pulang.", "Koda: Pengalaman itu mengajarkannya."] },
      { judul: "Alur", isi: ["Alur maju: A ke B ke C (kronologis).", "Alur mundur: flashback.", "Alur campuran: maju-mundur."], contoh: ["Maju: lahir, sekolah, kerja.", "Mundur: flashback masa kecil."] },
    ],
    rangkuman: ["Narasi = cerita dengan tokoh dan alur.", "Struktur: orientasi, komplikasi, resolusi.", "Alur: maju, mundur, campuran."]
  },
  latihan: makeSoal([
    ["Narasi bertujuan...", ["Mendeskripsikan", "Menghibur/bercerita", "Mengajar", "Meyakinkan"], 1, "Narasi = bercerita."],
    ["Komplikasi berisi...", ["Pesan moral", "Konflik mulai muncul", "Penyelesaian", "Pengenalan"], 1, "Komplikasi = konflik."],
    ["Alur yang kronologis disebut...", ["Mundur", "Maju", "Campuran", "Flashback"], 1, "Kronologis = maju."],
    ["Resolusi adalah...", ["Pembukaan", "Penyelesaian konflik", "Pengenalan", "Konflik"], 1, "Resolusi = penyelesaian."],
    ["Si kancil mencuri timun termasuk...", ["Deskripsi", "Narasi", "Prosedur", "Laporan"], 1, "Cerita fabel = narasi."],
    ["Orientasi berisi...", ["Tokoh dan latar", "Konflik", "Penyelesaian", "Pesan"], 0, "Orientasi = pengenalan."],
    ["Alur flashback disebut...", ["Maju", "Mundur", "Campuran", "Lurus"], 1, "Flashback = mundur."],
    ["Tokoh protagonis adalah...", ["Jahat", "Baik/utama", "Pendukung", "Antagonis"], 1, "Tokoh utama baik."],
    ["Koda berisi...", ["Pesan moral opsional", "Konflik baru", "Pengenalan", "Latar"], 0, "Koda = pesan moral."],
    ["Cerpen termasuk...", ["Narasi", "Deskripsi", "Eksposisi", "Argumentasi"], 0, "Cerpen = narasi."],
  ]),
  praktik: {
    petunjuk: "Tulis cerita pendek (3 paragraf) tentang pengalaman paling berkesan.\nParagraf 1: orientasi (kapan, di mana, siapa)\nParagraf 2: komplikasi (apa yang terjadi)\nParagraf 3: resolusi + koda",
    tips: ["Gunakan alur maju", "Hidupkan dengan dialog"],
    contoh: ""
  },
  kuis: makeSoal([
    ["Struktur narasi yang benar...", ["Resolusi-komplikasi-orientasi", "Orientasi-komplikasi-resolusi", "Komplikasi-orientasi-resolusi", "Orientasi-resolusi-komplikasi"], 1, "Ori ke komplikasi ke resolusi."],
    ["Tokoh antagonis adalah...", ["Tokoh utama", "Tokoh jahat/lawan", "Tokoh pembantu", "Narator"], 1, "Antagonis = lawan."],
    ["Akhir cerita bahagia disebut...", ["Tragedi", "Happy ending", "Suspense", "Klimaks"], 1, "Happy ending."],
    ["Latar meliputi...", ["Tokoh", "Tempat, waktu, suasana", "Alur", "Amanat"], 1, "Latar = tempat, waktu, suasana."],
    ["Teks narasi tidak...", ["Berurutan", "Kronologis", "Memiliki konflik", "Berisi langkah-langkah"], 3, "Langkah-langkah = prosedur."],
  ]),
})

add("Teks Prosedur", {
  belajar: {
    tujuan: ["Memahami teks prosedur", "Mengenal struktur dan ciri", "Menulis langkah prosedur"],
    materi: [
      { judul: "Pengertian Prosedur", isi: ["Teks petunjuk melakukan sesuatu.", "Tujuan: membantu pembaca melakukan langkah.", "Contoh: resep, petunjuk penggunaan, panduan."], contoh: ["Resep mie instan: 1) Rebus air. 2) Masukkan mie. 3) Tiriskan. 4) Campur bumbu."] },
      { judul: "Struktur Prosedur", isi: ["Tujuan: hasil akhir yang ingin dicapai.", "Alat/bahan: apa yang diperlukan.", "Langkah-langkah: urutan cara kerja.", "Penutup (opsional): hasil/saran."], contoh: ["Tujuan: Membuat kopi.", "Bahan: kopi, gula, air panas.", "Langkah: 1) Siapkan cangkir. 2) Masukkan kopi."] },
      { judul: "Ciri Bahasa", isi: ["Kalimat imperatif (perintah): rebus, aduk, potong.", "Kata kerja aktif: masukkan, tuang.", "Konjungsi temporal: kemudian, selanjutnya, setelah itu."], contoh: ["Imperatif: Potong bawang halus-halus.", "Temporal: Setelah itu, tuang santan."] },
    ],
    rangkuman: ["Prosedur = petunjuk langkah.", "Struktur: tujuan, bahan, langkah.", "Bahasa imperatif dan konjungsi temporal."]
  },
  latihan: makeSoal([
    ["Tujuan teks prosedur...", ["Menghibur", "Memberi petunjuk", "Mendeskripsikan", "Berargumentasi"], 1, "Prosedur = petunjuk."],
    ["Imperatif adalah kalimat...", ["Tanya", "Perintah", "Berita", "Seru"], 1, "Imperatif = perintah."],
    ["Selanjutnya termasuk konjungsi...", ["Temporal", "Sebab", "Akibat", "Pertentangan"], 0, "Selanjutnya = waktu."],
    ["Bukan unsur prosedur...", ["Tujuan", "Alat/bahan", "Langkah", "Konflik"], 3, "Konflik = narasi."],
    ["Resep masakan termasuk...", ["Narasi", "Deskripsi", "Prosedur", "Eksposisi"], 2, "Resep = prosedur."],
    ["Setelah itu, masukkan garam. Kata setelah itu...", ["Imperatif", "Temporal", "Verba", "Nomina"], 1, "Temporal = waktu."],
    ["Cara mengoperasikan mesin cuci termasuk...", ["Narasi", "Prosedur", "Deskripsi", "Argumentasi"], 1, "Petunjuk = prosedur."],
    ["Potong, aduk, rebus termasuk kata...", ["Benda", "Sifat", "Perintah/imperatif", "Bilangan"], 2, "Imperatif."],
    ["Struktur prosedur: ..., bahan, langkah.", ["Tujuan", "Konflik", "Orientasi", "Resolusi"], 0, "Tujuan dulu."],
    ["Langkah harus urut karena...", ["Indah", "Logis kronologis", "Panjang", "Pendek"], 1, "Urut = logis."],
  ]),
  praktik: {
    petunjuk: "Tulis prosedur membuat nasi goreng (minimal 5 langkah).\nAwali dengan tujuan dan bahan.",
    tips: ["Gunakan kata imperatif", "Gunakan konjungsi temporal", "Urutkan secara logis"],
    contoh: "Tujuan: Membuat nasi goreng sederhana.\nBahan: nasi 1 piring, telur 1, bawang 2 siung, kecap.\nLangkah: 1) Iris bawang. 2) Tumis bawang. 3) Masukkan telur. 4) Masukkan nasi. 5) Tambah kecap. 6) Aduk rata."
  },
  kuis: makeSoal([
    ["Ciri bahasa prosedur...", ["Metafora", "Imperatif", "Personifikasi", "Hiperbola"], 1, "Imperatif = perintah."],
    ["Kemudian termasuk konjungsi...", ["Temporal", "Sebab", "Akibat", "Pilihan"], 0, "Kemudian = waktu."],
    ["Bukan teks prosedur...", ["Resep", "Panduan", "Cerpen", "Petunjuk"], 2, "Cerpen = narasi."],
    ["Setelah itu sinonim...", ["Meskipun", "Selanjutnya", "Karena", "Tetapi"], 1, "Setelah itu = selanjutnya."],
    ["Teks prosedur kompleks memiliki...", ["Banyak langkah terperinci", "Konflik", "Tokoh", "Dialog"], 0, "Kompleks = langkah detail."],
  ]),
})

add("Teks Eksplanasi", {
  belajar: {
    tujuan: ["Memahami teks eksplanasi", "Mengenal hubungan kausalitas", "Menjelaskan fenomena alam dan sosial"],
    materi: [
      { judul: "Pengertian Eksplanasi", isi: ["Teks yang menjelaskan proses fenomena.", "Fokus pada sebab-akibat.", "Fenomena alam, sosial, budaya."], contoh: ["Terjadinya hujan: penguapan, kondensasi, presipitasi."] },
      { judul: "Struktur Eksplanasi", isi: ["Pernyataan umum: fenomena yang dijelaskan.", "Deretan penjelas: proses sebab-akibat.", "Interpretasi: simpulan."], contoh: ["Umum: banjir terjadi karena beberapa faktor.", "Penjelas: hujan deras, drainase buruk, sampah.", "Interpretasi: perlu perbaikan sistem drainase."] },
      { judul: "Ciri Bahasa", isi: ["Konjungsi kausal: karena, sebab, akibatnya, sehingga.", "Kata teknis sesuai bidang.", "Fakta dan data ilmiah."], contoh: ["Kausal: Banjir terjadi karena hujan deras.", "Teknis: kondensasi, evaporasi."] },
    ],
    rangkuman: ["Eksplanasi = menjelaskan fenomena.", "Struktur: umum, penjelas, interpretasi.", "Fokus pada sebab-akibat."]
  },
  latihan: makeSoal([
    ["Teks eksplanasi menjelaskan...", ["Cerita", "Proses fenomena", "Petunjuk", "Pendapat"], 1, "Proses fenomena."],
    ["Konjungsi kausal: akibatnya, ..., sehingga.", ["Kemudian", "Karena", "Lalu", "Selanjutnya"], 1, "Karena = sebab."],
    ["Pernyataan umum berisi...", ["Fenomena yang dijelaskan", "Langkah", "Konflik", "Tokoh"], 0, "Umum = fenomena."],
    ["Bukan teks eksplanasi...", ["Proses tsunami", "Terjadinya hujan", "Resep kue", "Siklus air"], 2, "Resep = prosedur."],
    ["Interpretasi berisi...", ["Langkah", "Simpulan", "Konflik", "Bahan"], 1, "Interpretasi = simpulan."],
    ["Kata teknis dalam eksplanasi...", ["Indah", "Evaporasi", "Panas", "Cepat"], 1, "Evaporasi = teknis."],
    ["Sebab akibat adalah inti...", ["Narasi", "Deskripsi", "Eksplanasi", "Prosedur"], 2, "Eksplanasi = sebab akibat."],
    ["Gempa terjadi karena pergeseran lempeng. Ini...", ["Deskripsi", "Narasi", "Eksplanasi", "Prosedur"], 2, "Menjelaskan sebab gempa."],
    ["Konjungsi kausalitas...", ["Dan", "Kemudian", "Karena", "Lalu"], 2, "Karena = kausal."],
    ["Teks eksplanasi berdasar...", ["Opini", "Fakta/data", "Imajinasi", "Perasaan"], 1, "Eksplanasi = fakta."],
  ]),
  praktik: {
    petunjuk: "Jelaskan proses terjadinya pelangi dalam 3 paragraf.\nP1: pernyataan umum (pelangi = fenomena optik)\nP2: penjelas (pembiasan cahaya, tetesan air)\nP3: interpretasi (simpulan)",
    tips: ["Gunakan konjungsi kausal", "Sertakan kata teknis", "Alirkan sebab-akibat"],
    contoh: "Pelangi adalah fenomena optik saat hujan ringan dan matahari bersinar.\nCahaya matahari dibiaskan oleh tetesan air di udara. Karena panjang gelombang berbeda, muncullah tujuh warna.\nJadi, pelangi terjadi karena pembiasan cahaya pada titik air hujan."
  },
  kuis: makeSoal([
    ["Inti teks eksplanasi...", ["Alur", "Sebab-akibat", "Langkah", "Tokoh"], 1, "Sebab-akibat."],
    ["Struktur eksplanasi: umum, penjelas, ...", ["Langkah", "Interpretasi", "Resolusi", "Koda"], 1, "Interpretasi."],
    ["Karena, akibatnya termasuk konjungsi...", ["Temporal", "Kausal", "Pertentangan", "Pilihan"], 1, "Kausal."],
    ["Fenomena sosial bisa dijelaskan...", ["Narasi", "Eksplanasi", "Prosedur", "Pantun"], 1, "Eksplanasi = sosial juga."],
    ["Deretan penjelas berisi...", ["Proses sebab-akibat", "Petunjuk", "Dialog", "Koda"], 0, "Proses sebab-akibat."],
  ]),
})

add("Teks Argumentasi", {
  belajar: {
    tujuan: ["Memahami teks argumentasi", "Menyusun argumen logis", "Membedakan fakta dan opini dalam argumen"],
    materi: [
      { judul: "Pengertian Argumentasi", isi: ["Teks yang meyakinkan pembaca.", "Disertai alasan logis, data, dan fakta.", "Tujuan: memengaruhi opini/sikap."], contoh: ["Belajar online efektif. Data: 80% siswa nilai naik. Alasan: fleksibel dan mandiri."] },
      { judul: "Struktur Argumentasi", isi: ["Pendahuluan: pernyataan sudut pandang.", "Argumen pendukung: alasan + data.", "Penegasan ulang: simpulan."], contoh: ["Pendahuluan: Sampah plastik perlu dilarang.", "Argumen: 1) Sulit terurai 500 tahun. 2) Merusak laut.", "Penegasan: Oleh karena itu, larangan plastik penting."] },
      { judul: "Jenis Argumen", isi: ["Logis: alasan masuk akal.", "Emotif: sentuhan perasaan.", "Otoritas: pendapat ahli.", "Data: angka, statistik."], contoh: ["Logis: Jika terus membuang sampah, banjir terjadi.", "Emotif: Bayangkan anak-anak kita hidup di sampah.", "Otoritas: WHO menyatakan polusi udara berbahaya."] },
    ],
    rangkuman: ["Argumentasi = meyakinkan dengan alasan.", "Struktur: pendahuluan, argumen, penegasan.", "Didukung data dan fakta."]
  },
  latihan: makeSoal([
    ["Tujuan argumentasi...", ["Menghibur", "Meyakinkan pembaca", "Mendeskripsikan", "Bercerita"], 1, "Meyakinkan = tujuan."],
    ["Argumen logis didasari...", ["Perasaan", "Akal sehat", "Khayalan", "Imajinasi"], 1, "Logis = akal sehat."],
    ["Pendahuluan argumentasi berisi...", ["Data", "Sudut pandang penulis", "Langkah", "Bahan"], 1, "Sudut pandang."],
    ["Menurut WHO termasuk argumen...", ["Logis", "Emotif", "Otoritas", "Data"], 2, "WHO = otoritas."],
    ["Bukan argumen yang baik...", ["Data riset", "Opini tanpa data", "Fakta", "Logika"], 1, "Argumen baik = data."],
    ["Penegasan ulang di...", ["Awal", "Akhir/simpulan", "Tengah", "Semua"], 1, "Penegasan di akhir."],
    ["Argumen emotif menyentuh...", ["Logika", "Perasaan pembaca", "Data", "Fakta"], 1, "Emotif = perasaan."],
    ["Argumentasi berbeda deskripsi karena...", ["Menggambarkan", "Meyakinkan", "Menghibur", "Cerita"], 1, "Argumentasi = meyakinkan."],
    ["Bayangkan jika ... termasuk argumen...", ["Logis", "Emotif", "Otoritas", "Data"], 1, "Bayangkan = emotif."],
    ["Oleh karena itu, ... termasuk...", ["Pendahuluan", "Argumen", "Penegasan ulang", "Langkah"], 2, "Penegasan ulang."],
  ]),
  praktik: {
    petunjuk: "Buat teks argumentasi 3 paragraf tentang Manfaat Membaca Buku.\nP1: pendahuluan (setuju membaca penting)\nP2: argumen (3 alasan + data)\nP3: penegasan ulang",
    tips: ["Campur argumen logis dan data", "Akhiri ajakan/simpulan kuat"],
    contoh: "Membaca buku adalah kebiasaan yang sangat bermanfaat.\nPertama, membaca menambah wawasan. Kedua, melatih fokus. Data menunjukkan siswa yang rajin membaca 30% lebih baik dalam ujian. Ketiga, mengurangi stres.\nJelas, membaca buku harus dibiasakan sejak dini."
  },
  kuis: makeSoal([
    ["Tujuan argumen emotif...", ["Data", "Sentuh perasaan", "Logika", "Angka"], 1, "Emotif = perasaan."],
    ["Argumentasi baik berisi...", ["Fakta dan alasan logis", "Cerita", "Deskripsi", "Dialog"], 0, "Fakta + alasan."],
    ["Contoh argumen otoritas...", ["Saya pikir", "Menurut Mendikbud", "Mungkin", "Sepertinya"], 1, "Mendikbud = otoritas."],
    ["Struktur: pendahuluan, ..., penegasan.", ["Langkah", "Argumen", "Bahan", "Tujuan"], 1, "Argumen di tengah."],
    ["Perbedaan opini dan argumentasi...", ["Sama", "Opini tanpa data, argumentasi dengan data", "Argumentasi pendek", "Opini panjang"], 1, "Argumen = opini + data."],
  ]),
})

// Level 5
add("Puisi & Rima", {
  belajar: {
    tujuan: ["Memahami puisi sebagai karya sastra", "Mengenal rima dan irama", "Menulis puisi sederhana"],
    materi: [
      { judul: "Apa itu Puisi?", isi: ["Karya sastra ekspresif dengan diksi padat.", "Unsur: tema, diksi, rima, irama, majas.", "Jenis: puisi lama (pantun, syair) dan puisi baru (modern)."], contoh: ["Derai-derai Cemara (Chairil Anwar)", "Aku ini binatang jalang dari kumpulannya terbuang."] },
      { judul: "Rima", isi: ["Persamaan bunyi dalam puisi.", "Rima akhir: a-a-a-a (sama), a-b-a-b (silang), a-a-b-b (berpeluk).", "Rima dalam: bunyi di tengah baris."], contoh: ["A-a-a-a: Aduh pantas / Kau bungkus nasi / Tiga lembar / Daun waru.", "A-b-a-b: Kalau ada jarum patah / Jangan dimasukkan ke dalam peti / Kalau ada kataku salah / Jangan dimasukkan ke dalam hati."] },
      { judul: "Diksi dan Majas", isi: ["Diksi: pilihan kata tepat dan bermakna.", "Majas dalam puisi: personifikasi, metafora, hiperbola, repetisi.", "Imaji: gambaran penglihatan, pendengaran, perasaan."], contoh: ["Personifikasi: Malam merangkak perlahan.", "Metafora: Engkau matahariku.", "Imaji visual: Senja merah di ufuk barat."] },
    ],
    rangkuman: ["Puisi = ekspresi dengan kata padat.", "Rima = persamaan bunyi.", "Diksi dan majas memperindah puisi."]
  },
  latihan: makeSoal([
    ["Rima a-b-a-b disebut...", ["Sama", "Silang", "Berpeluk", "Bebas"], 1, "a-b-a-b = silang."],
    ["Personifikasi memberi sifat...", ["Benda mati hidup", "Manusia ke hewan", "Hewan ke benda", "Angka"], 0, "Benda mati seolah hidup."],
    ["Diksi adalah...", ["Pilihan kata", "Persamaan bunyi", "Majas", "Tema"], 0, "Diksi = pilihan kata."],
    ["A-a-b-b adalah rima...", ["Sama", "Silang", "Berpeluk", "Tengah"], 2, "a-a-b-b = berpeluk."],
    ["Bukan unsur puisi...", ["Rima", "Tokoh", "Diksi", "Majas"], 1, "Tokoh = prosa."],
    ["Aku ini binatang jalang adalah puisi...", ["Chairil Anwar", "WS Rendra", "Sapardi", "Taufik"], 0, "Chairil Anwar = pelopor."],
    ["Imaji visual berkaitan dengan...", ["Pendengaran", "Penglihatan", "Perasaan", "Gerak"], 1, "Visual = penglihatan."],
    ["Puisi lama terikat pada...", ["Bebas", "Aturan rima dan baris", "Tidak ada aturan", "Prosa"], 1, "Puisi lama = terikat aturan."],
    ["Repetisi adalah...", ["Pengulangan", "Perbandingan", "Personifikasi", "Hiperbola"], 0, "Repetisi = ulang."],
    ["Makna konotatif adalah...", ["Makna sebenarnya", "Makna kias", "Kata sifat", "Kata kerja"], 1, "Konotasi = kiasan."],
  ]),
  praktik: {
    petunjuk: "Tulis puisi 2 bait (8 baris) tentang Alam atau Cita-cita.\nPerhatikan rima dan diksi.",
    tips: ["Tentukan tema dulu", "Gunakan majas", "Perhatikan rima akhir"],
    contoh: ""
  },
  kuis: makeSoal([
    ["Ciri puisi baru...", ["Terikat aturan", "Bebas", "Dibatasi baris", "Harus 4 baris"], 1, "Puisi baru = bebas."],
    ["Rima ujung baris disebut...", ["Dalam", "Akhir", "Tengah", "Awal"], 1, "Rima akhir = ujung."],
    ["Metafora membandingkan tanpa...", ["Kata hubung", "Obyek", "Kata", "Bunyi"], 0, "Tanpa kata hubung."],
    ["Larik dalam puisi = ...", ["Bait", "Baris", "Kata", "Suku kata"], 1, "Larik = baris."],
    ["Bait adalah...", ["Satu kata", "Kumpulan baris", "Satu kalimat", "Satu huruf"], 1, "Bait = kumpulan baris."],
  ]),
})

add("Pantun & Syair", {
  belajar: {
    tujuan: ["Membedakan pantun dan syair", "Memahami struktur pantun", "Menulis pantun"],
    materi: [
      { judul: "Pantun", isi: ["Puisi lama 4 baris per bait.", "Baris 1-2: sampiran (pengantar).", "Baris 3-4: isi (pesan).", "Rima a-b-a-b.", "Setiap baris 8-12 suku kata."], contoh: ["Kalau ada jarum patah (sampiran)", "Jangan dimasukkan ke dalam peti (sampiran)", "Kalau ada kataku salah (isi)", "Jangan dimasukkan ke dalam hati (isi)"] },
      { judul: "Syair", isi: ["Puisi lama 4 baris per bait.", "Semua baris adalah isi (tidak ada sampiran).", "Rima a-a-a-a.", "Bercerita tentang nasihat, agama, sejarah."], contoh: ["Wahai ananda intan mutiara (isi)", "Banyaklah sabar janganlah marah (isi)", "Jika kesal dalam dada (isi)", "Segera ingat pada Yang Esa (isi)"] },
      { judul: "Perbedaan Pantun dan Syair", isi: ["Pantun: sampiran + isi, rima a-b-a-b.", "Syair: semua isi, rima a-a-a-a.", "Pantun untuk sindiran/nasihat, syair untuk cerita."], contoh: ["Pantun: 2 sampiran + 2 isi.", "Syair: 4 baris isi."] },
    ],
    rangkuman: ["Pantun: 4 baris, sampiran-isi, a-b-a-b.", "Syair: 4 baris isi, a-a-a-a.", "Pantun sindiran, syair cerita/nasihat."]
  },
  latihan: makeSoal([
    ["Pantun terdiri dari...", ["4 baris", "2 baris", "6 baris", "8 baris"], 0, "4 baris = pantun."],
    ["Rima pantun...", ["a-a-a-a", "a-b-a-b", "a-a-b-b", "bebas"], 1, "a-b-a-b = pantun."],
    ["Sampiran adalah baris...", ["3-4", "1-2", "1-4", "2-3"], 1, "Sampiran = baris 1-2."],
    ["Syair bersajak...", ["a-b-a-b", "a-a-a-a", "a-a-b-b", "a-b-b-a"], 1, "a-a-a-a = syair."],
    ["Semua baris syair adalah...", ["Sampiran", "Isi", "Pengantar", "Penutup"], 1, "Semua baris = isi."],
    ["Pantun jenaka bertujuan...", ["Nasihat", "Humor", "Cerita", "Agama"], 1, "Jenaka = humor."],
    ["Bukan ciri pantun...", ["4 baris", "a-b-a-b", "Semua baris isi", "Sampiran-isi"], 2, "Semua isi = syair."],
    ["Jumlah suku kata pantun...", ["5-7", "8-12", "12-15", "Bebas"], 1, "8-12 suku kata."],
    ["Syair biasanya bertema...", ["Cinta", "Nasihat/agama", "Humor/sejarah", "Lucu"], 1, "Syair = nasihat/agama/sejarah."],
    ["Pantun sebagai alat...", ["Cerita", "Sindiran/nasihat", "Dongeng", "Laporan"], 1, "Pantun = sindiran/nasihat."],
  ]),
  praktik: {
    petunjuk: "Buat 2 pantun: 1 nasihat + 1 jenaka.\nPerhatikan rima a-b-a-b dan suku kata 8-12.",
    tips: ["Buat sampiran dulu (baris 1-2)", "Isi di baris 3-4", "Akhiri bunyi sama a-b-a-b"],
    contoh: ""
  },
  kuis: makeSoal([
    ["Pantun kilat (karmina) terdiri...", ["4 baris", "2 baris", "6 baris", "8 baris"], 1, "Karmina = 2 baris."],
    ["Syair berasal dari...", ["Jawa", "Arab/Melayu", "Sunda", "Bali"], 1, "Syair = Arab/Melayu."],
    ["Seloka adalah...", ["Pantun jenaka", "Syair sindiran", "Puisi bebas", "Prosa"], 1, "Seloka = syair sindiran."],
    ["Baris 3-4 pantun disebut...", ["Sampiran", "Isi", "Pengantar", "Pembuka"], 1, "Isi = pesan."],
    ["Ciri khas syair...", ["Sampiran", "Cerita berima a-a-a-a", "4 baris saja", "Jenaka"], 1, "Cerita berima a-a-a-a."],
  ]),
})

add("Cerpen & Alur", {
  belajar: {
    tujuan: ["Memahami cerpen sebagai prosa fiksi", "Mengenal unsur intrinsik cerpen", "Menulis cerpen sederhana"],
    materi: [
      { judul: "Pengertian Cerpen", isi: ["Cerita pendek fiksi. umumnya 1.000-10.000 kata.", "Fokus pada satu peristiwa/konflik.", "Tujuan: menghibur dengan amanat."], contoh: ["Robohnya Surau Kami (AA Navis)", "Sepotong Senja untuk Pacarku (Seno Gumira)"] },
      { judul: "Unsur Intrinsik", isi: ["Tema: gagasan utama.", "Tokoh: protagonis, antagonis, tritagonis.", "Alur: maju, mundur, campuran.", "Latar: tempat, waktu, suasana.", "Sudut pandang: orang pertama, ketiga.", "Amanat: pesan moral."], contoh: ["Tema: perjuangan hidup.", "Tokoh: Budi (protagonis), Pak Lurah (antagonis).", "Alur maju: miskin, merantau, sukses."] },
      { judul: "Alur Cerpen", isi: ["Orientasi: pengenalan tokoh/latar.", "Komplikasi: masalah mulai muncul.", "Klimaks: puncak konflik.", "Resolusi: penyelesaian.", "Koda: amanat."], contoh: ["Ori: Budi tinggal di desa miskin.", "Komplikasi: Kemarau panjang, paceklik.", "Klimaks: Budi putus asa.", "Resolusi: Ia merantau, akhirnya sukses."] },
    ],
    rangkuman: ["Cerpen = fiksi pendek, satu konflik.", "Unsur: tema, tokoh, alur, latar, sudut pandang, amanat.", "Alur: orientasi, komplikasi, klimaks, resolusi."]
  },
  latihan: makeSoal([
    ["Cerpen singkatan dari...", ["Cerita panjang", "Cerita pendek", "Cerita bersambung", "Cerita anak"], 1, "Cerita pendek."],
    ["Bukan unsur intrinsik...", ["Tema", "Tokoh", "Biografi penulis", "Amanat"], 2, "Biografi = ekstrinsik."],
    ["Klimaks adalah...", ["Pengenalan", "Puncak konflik", "Penyelesaian", "Penutup"], 1, "Klimaks = puncak konflik."],
    ["Sudut pandang orang pertama = kata...", ["Dia", "Aku", "Mereka", "Kamu"], 1, "Aku = orang pertama."],
    ["Amanat adalah...", ["Tema", "Pesan moral", "Latar", "Tokoh"], 1, "Amanat = pesan."],
    ["Cerpen Robohnya Surau Kami karya...", ["Chairil", "AA Navis", "Pramoedya", "Seno"], 1, "AA Navis = pengarang."],
    ["Tokoh antagonis adalah...", ["Tokoh utama", "Lawan tokoh utama", "Pembantu", "Narator"], 1, "Antagonis = lawan."],
    ["Alur flashback = alur...", ["Maju", "Mundur", "Campuran", "Lurus"], 1, "Flashback = mundur."],
    ["Latar waktu: pada pagi hari termasuk...", ["Tempat", "Waktu", "Suasana", "Sosial"], 1, "Pagi = waktu."],
    ["Cerpen umumnya ... kata.", ["100-500", "1.000-10.000", "50.000", "100.000"], 1, "1.000-10.000 kata."],
  ]),
  praktik: {
    petunjuk: "Tulis cerpen 3-4 paragraf tentang Persahabatan.\nSertakan: orientasi, komplikasi, resolusi, dan amanat.",
    tips: ["Tentukan tema dan tokoh dulu", "Buat alur sederhana", "Akhiri dengan pesan"],
    contoh: ""
  },
  kuis: makeSoal([
    ["Cerpen disebut fiksi karena...", ["Berdasar data", "Rekayasa imajinasi", "Fakta", "Ilmiah"], 1, "Fiksi = imajinasi."],
    ["Struktur cerpen: orientasi, ..., klimaks, resolusi.", ["Komplikasi", "Pengenalan", "Penutup", "Amanat"], 0, "Komplikasi = awal konflik."],
    ["Tritagonis adalah...", ["Lawan", "Penengah", "Utama", "Narator"], 1, "Tritagonis = penengah."],
    ["Pengarang cerpen Terlena karya...", ["NH Dini", "Putu Wijaya", "Pramoedya", "Sapardi"], 0, "NH Dini."],
    ["Inti cerpen terletak pada...", ["Orientasi", "Konflik", "Latar", "Tokoh"], 1, "Konflik = inti cerita."],
  ]),
})

add("Artikel & Feature", {
  belajar: {
    tujuan: ["Memahami artikel dan feature", "Membedakan jenis artikel", "Menulis artikel sederhana"],
    materi: [
      { judul: "Pengertian Artikel", isi: ["Tulisan faktual dan opini di media.", "Tujuan: informatif, persuasif, atau menghibur.", "Jenis: artikel opini, artikel ilmiah populer, feature."], contoh: ["Artikel opini: Opini tentang pendidikan di Kompas.", "Artikel ilmiah populer: bahaya mikroplastik."] },
      { judul: "Struktur Artikel", isi: ["Judul: menarik dan mewakili isi.", "Pendahuluan: latar belakang, mengapa penting.", "Isi: fakta, data, argumen.", "Penutup: simpulan dan saran."], contoh: ["Judul: Darurat Sampah Plastik.", "Pendahuluan: Indonesia penghasil sampah plastik kedua."] },
      { judul: "Feature", isi: ["Artikel mendalam dengan gaya bercerita.", "Lead naratif untuk menarik pembaca.", "Human interest: fokus pada kisah manusia."], contoh: ["Feature: perjuangan nelayan tradisional di tengah modernisasi.", "Lead: Ombak menghantam perahu kecil Pak Kario."] },
    ],
    rangkuman: ["Artikel = tulisan faktual di media.", "Struktur: judul, pendahuluan, isi, penutup.", "Feature = artikel mendalam bergaya cerita."]
  },
  latihan: makeSoal([
    ["Tujuan artikel informatif...", ["Menghibur", "Memberi informasi", "Mempengaruhi", "Menjual"], 1, "Informatif = informasi."],
    ["Feature menggunakan gaya...", ["Kaku", "Bercerita", "Ilmiah", "Formal"], 1, "Feature = bercerita."],
    ["Judul artikel harus...", ["Panjang", "Menarik dan mewakili isi", "Bombastis", "Puitis"], 1, "Menarik dan representatif."],
    ["Artikel opini berisi...", ["Data mentah", "Pendapat penulis", "Petunjuk", "Resep"], 1, "Opini = pendapat."],
    ["Bukan jenis artikel...", ["Opini", "Ilmiah populer", "Resep masakan", "Feature"], 2, "Resep = prosedur."],
    ["Lead naratif digunakan di...", ["Artikel opini", "Feature", "Berita", "Laporan"], 1, "Feature = lead naratif."],
    ["Struktur artikel: judul, ..., isi, penutup.", ["Daftar isi", "Pendahuluan", "Abstrak", "Lampiran"], 1, "Pendahuluan = latar belakang."],
    ["Artikel ilmiah populer menggunakan bahasa...", ["Sulit", "Populer/mudah dimengerti", "Inggris", "Daerah"], 1, "Populer = mudah."],
    ["Human interest artinya...", ["Minat manusia", "Fakta", "Data", "Ilmiah"], 0, "Minat/kisah manusia."],
    ["Contoh judul feature...", ["Hasil Penelitian Terbaru", "Berjuang di Tengah Badai", "Resep Kue", "Panduan"], 1, "Feature = judul naratif."],
  ]),
  praktik: {
    petunjuk: "Tulis artikel singkat (3 paragraf) tentang Pentingnya Literasi Digital.\nP1: pendahuluan (kenapa penting)\nP2: isi (data, fakta, manfaat)\nP3: penutup (simpulan, saran)",
    tips: ["Gunakan data akurat", "Gaya bahasa populer", "Akhiri dengan ajakan"],
    contoh: ""
  },
  kuis: makeSoal([
    ["Artikel berbeda dengan berita karena...", ["Berdasar data", "Mengandung opini", "Lebih pendek", "Lebih panjang"], 1, "Artikel = opini + data."],
    ["Feature menonjolkan sisi...", ["Keras", "Humanis/manusiawi", "Ilmiah", "Statistik"], 1, "Humanis = sisi manusia."],
    ["Penutup artikel berisi...", ["Opini baru", "Simpulan dan saran", "Langkah", "Resep"], 1, "Simpulan dan saran."],
    ["Artikel bisa ditemukan di...", ["Buku", "Koran/majalah", "Novel", "Puisi"], 1, "Koran/majalah = media artikel."],
    ["Tujuan artikel persuasif...", ["Menghibur", "Mempengaruhi/mengajak", "Mendidik", "Menceritakan"], 1, "Persuasif = memengaruhi."],
  ]),
})

add("Pidato & Retorika", {
  belajar: {
    tujuan: ["Memahami pidato", "Mengenal teknik retorika", "Menyusun naskah pidato"],
    materi: [
      { judul: "Pengertian Pidato", isi: ["Penyampaian gagasan di depan umum.", "Tujuan: informatif, persuasif, rekreatif.", "Pidato efektif: jelas, lugas, menarik."], contoh: ["Pidato kenegaraan presiden.", "Pidato sambutan acara sekolah."] },
      { judul: "Struktur Pidato", isi: ["Pembukaan: salam, sapaan, ucapan syukur.", "Isi: inti gagasan, argumen, data.", "Penutup: simpulan, harapan, salam."], contoh: ["Pembukaan: Assalamualaikum, Selamat pagi Bapak/Ibu.", "Isi: Hari ini kita bahas pentingnya menjaga lingkungan.", "Penutup: Mari kita jaga bumi untuk anak cucu."] },
      { judul: "Retorika", isi: ["Seni berbicara meyakinkan.", "Teknik: repetisi (ulang kata kunci), retoris (pertanyaan tanpa jawab), analogi, metafora.", "Intonasi, gestur, kontak mata."], contoh: ["Retoris: Siapa yang tidak ingin sukses?", "Repetisi: Kita harus bersatu. Kita harus berjuang.", "Analogi: Hidup seperti roda yang berputar."] },
    ],
    rangkuman: ["Pidato = bicara di depan umum.", "Struktur: pembukaan, isi, penutup.", "Retorika: repetisi, retoris, analogi."]
  },
  latihan: makeSoal([
    ["Kalimat retoris adalah...", ["Perintah", "Pertanyaan tanpa jawab", "Ajakan", "Larangan"], 1, "Retoris = tanya tanpa jawab."],
    ["Struktur pidato: ..., isi, penutup.", ["Pembukaan", "Orientasi", "Abstrak", "Langkah"], 0, "Pembukaan = salam+sapaan."],
    ["Intonasi berkaitan dengan...", ["Kata", "Nada suara", "Gerak", "Pakaian"], 1, "Intonasi = nada."],
    ["Tujuan persuasif = ...", ["Menghibur", "Mengajak/memengaruhi", "Mendidik", "Melapor"], 1, "Persuasif = ajak."],
    ["Repetisi dalam pidato...", ["Mengulang kata kunci", "Bertanya", "Bercerita", "Melawak"], 0, "Repetisi = ulang."],
    ["Bukan teknik retorika...", ["Analogi", "Data mentah", "Repetisi", "Retoris"], 1, "Data mentah = bukan retorika."],
    ["Pidato rekreatif bertujuan...", ["Serius", "Menghibur", "Mendidik", "Membujuk"], 1, "Rekreatif = hiburan."],
    ["Assalamualaikum termasuk...", ["Isi", "Pembukaan", "Penutup", "Inti"], 1, "Salam = pembukaan."],
    ["Analog = ...", ["Perbandingan", "Ulang", "Tanya", "Cerita"], 0, "Analog = perbandingan."],
    ["Kontak mata penting karena...", ["Buat gugup", "Bangun koneksi audiens", "Lihat catatan", "Bosan"], 1, "Kontak mata = koneksi."],
  ]),
  praktik: {
    petunjuk: "Buat naskah pidato 3 paragraf tentang Semangat Belajar.\nP1: pembukaan (salam, sapaan)\nP2: isi (pentingnya belajar, manfaat)\nP3: penutup (ajakan, salam)",
    tips: ["Gunakan kalimat retoris", "Ulang kata kunci", "Akhiri dengan ajakan"],
    contoh: ""
  },
  kuis: makeSoal([
    ["Orator adalah...", ["Pendengar", "Pembicara pidato", "Penulis", "Panitia"], 1, "Orator = pembicara."],
    ["Pidato tanpa persiapan disebut...", ["Naskah", "Impromptu", "Resmi", "Formal"], 1, "Impromptu = spontan."],
    ["Kalimat Mari kita ... termasuk...", ["Pembukaan", "Ajakan/penutup", "Isi", "Retoris"], 1, "Mari kita = ajakan."],
    ["Pertanyaan retoris tujuan...", ["Mencari jawab", "Menggugah pemikiran", "Menghitung", "Menguji"], 1, "Menggugah = retoris."],
    ["Pidato informatif bertujuan...", ["Menghibur", "Memberi pengetahuan", "Mengajak", "Melawak"], 1, "Informatif = pengetahuan."],
  ]),
})


const levels = [
  {
    level: 1, title: "Dasar", subtitle: "Mulai dari sini -- kuasai EYD, huruf kapital, dan diksi",
    description: "Fondasi bahasa Indonesia: ejaan yang benar, huruf kapital, tanda baca, kata baku, pilihan kata, sinonim, antonim, polisemi.",
    color: "from-emerald-500 to-teal-600", emoji: "🌱", order: 1, xpReward: 1500, coinReward: 350,
    units: [
      { title: "Ejaan & Huruf Kapital", subtitle: "EYD dan penggunaan huruf kapital", emoji: "📖", order: 1, topik: "EYD" },
      { title: "Tanda Baca Dasar", subtitle: "Penggunaan tanda baca: titik, koma, tanya, seru", emoji: "✏", order: 2, topik: "TANDA_BACA" },
      { title: "Diksi & Makna Kata", subtitle: "Pilihan kata, denotasi, dan konotasi", emoji: "💬", order: 3, topik: "DIKSI" },
      { title: "Kata Baku & Kalimat Efektif", subtitle: "Kata baku dan syarat kalimat efektif", emoji: "📝", order: 4, topik: "BAKU" },
      { title: "Sinonim, Antonim, Polisemi", subtitle: "Padanan, lawan kata, dan makna ganda", emoji: "🔀", order: 5, topik: "SINONIM" },
    ],
  },
  {
    level: 2, title: "Pembangun", subtitle: "Bangun kalimat dari dasar hingga luas",
    description: "Kalimat sederhana, imbuhan prefiks dan sufiks, kalimat aktif-pasif, dan perluasan kalimat.",
    color: "from-blue-500 to-indigo-600", emoji: "📐", order: 2, xpReward: 1800, coinReward: 400,
    units: [
      { title: "Kalimat Sederhana", subtitle: "Struktur S-P dan pola dasar", emoji: "📐", order: 1, topik: "SEDERHANA" },
      { title: "Imbuhan Prefiks", subtitle: "Awalan ber-, meN-, di-, ter-, per-", emoji: "🔤", order: 2, topik: "PREFIKS" },
      { title: "Imbuhan Sufiks & Konfiks", subtitle: "Akhiran -kan, -i, dan gabungan imbuhan", emoji: "🔠", order: 3, topik: "SUFIKS" },
      { title: "Kalimat Aktif & Pasif", subtitle: "Perbedaan subjek pelaku dan penderita", emoji: "🔄", order: 4, topik: "AKTIF_PASIF" },
      { title: "Kalimat Luas dengan Keterangan", subtitle: "Memperluas kalimat dengan keterangan", emoji: "📐", order: 5, topik: "LUAS" },
    ],
  },
  {
    level: 3, title: "Struktur", subtitle: "Susun kalimat majemuk dan paragraf",
    description: "Kalimat majemuk setara dan bertingkat, paragraf, kohesi-koherensi, serta fakta dan opini.",
    color: "from-purple-500 to-pink-600", emoji: "🔗", order: 3, xpReward: 2000, coinReward: 450,
    units: [
      { title: "Kalimat Majemuk Setara", subtitle: "Gabungan klausa setara dengan konjungsi", emoji: "➕", order: 1, topik: "SETARA" },
      { title: "Kalimat Majemuk Bertingkat", subtitle: "Induk dan anak kalimat", emoji: "📊", order: 2, topik: "BERTINGKAT" },
      { title: "Paragraf & Gagasan Utama", subtitle: "Paragraf deduktif, induktif, dan campuran", emoji: "📄", order: 3, topik: "PARAGRAF" },
      { title: "Kohesi & Koherensi", subtitle: "Kepaduan bentuk dan makna antarkalimat", emoji: "🔗", order: 4, topik: "KOHESI" },
      { title: "Fakta & Opini", subtitle: "Membedakan fakta, opini, dan asumsi", emoji: "🔍", order: 5, topik: "FAKTA" },
    ],
  },
  {
    level: 4, title: "Teks", subtitle: "Kuasai berbagai jenis teks",
    description: "Teks deskripsi, narasi, prosedur, eksplanasi, dan argumentasi -- lengkap dengan ciri dan strukturnya.",
    color: "from-violet-500 to-purple-600", emoji: "📚", order: 4, xpReward: 2200, coinReward: 480,
    units: [
      { title: "Teks Deskripsi", subtitle: "Menggambarkan objek secara detail", emoji: "🖼", order: 1, topik: "DESKRIPSI" },
      { title: "Teks Narasi", subtitle: "Menceritakan peristiwa dan kisah", emoji: "📖", order: 2, topik: "NARASI" },
      { title: "Teks Prosedur", subtitle: "Langkah-langkah melakukan sesuatu", emoji: "📋", order: 3, topik: "PROSEDUR" },
      { title: "Teks Eksplanasi", subtitle: "Menjelaskan proses fenomena", emoji: "🔬", order: 4, topik: "EKSPLANASI" },
      { title: "Teks Argumentasi", subtitle: "Meyakinkan dengan alasan dan data", emoji: "💪", order: 5, topik: "ARGUMENTASI" },
    ],
  },
  {
    level: 5, title: "Kreatif", subtitle: "Hasilkan karya tulis kreatif",
    description: "Kreasikan kemampuanmu: puisi, pantun, cerpen, artikel, dan pidato.",
    color: "from-amber-500 to-orange-600", emoji: "🏆", order: 5, xpReward: 2500, coinReward: 500,
    units: [
      { title: "Puisi & Rima", subtitle: "Majas, rima, dan menulis puisi", emoji: "🌟", order: 1, topik: "PUISI" },
      { title: "Pantun & Syair", subtitle: "Puisi lama: pantun dan syair", emoji: "🎵", order: 2, topik: "PANTUN" },
      { title: "Cerpen & Alur", subtitle: "Menulis cerpen dengan alur dan konflik", emoji: "✍", order: 3, topik: "CERPEN" },
      { title: "Artikel & Feature", subtitle: "Menulis artikel informatif dan feature", emoji: "📰", order: 4, topik: "ARTIKEL" },
      { title: "Pidato & Retorika", subtitle: "Teknik bicara di depan umum", emoji: "🎤", order: 5, topik: "PIDATO" },
    ],
  },
]

async function seed() {
  console.log("Membersihkan data lama...")
  await db.userUnitProgress.deleteMany({})
  await db.learningUnit.deleteMany({})
  await db.learningLevel.deleteMany({})
  console.log("Data lama dibersihkan")

  for (const lvl of levels) {
    const { units: unitData, ...levelData } = lvl
    const created = await db.learningLevel.create({ data: levelData })
    console.log("Level " + lvl.level + ": " + created.title)

    for (const u of unitData) {
      const c = data[u.title]
      await db.learningUnit.create({
        data: {
          ...u,
          levelId: created.id,
          xpReward: 60,
          coinReward: 15,
          content: c ? JSON.stringify(c) : null,
          isActive: true,
        },
      })
      console.log("  " + u.title + (c ? "" : " (placeholder)"))
    }
  }

  console.log("\nSeeding selesai! 25 unit baru dengan 5 level tematik.")
}

seed().catch(e => { console.error(e); process.exit(1) })
