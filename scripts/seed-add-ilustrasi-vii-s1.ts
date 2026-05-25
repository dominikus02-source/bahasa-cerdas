// @ts-nocheck
import { db } from "../lib/db"

const ilustrasi: Record<string, Record<string, string>> = {
  "Bab 1: Teks Deskripsi": {
    "Apa Itu Teks Deskripsi?": "[Ilustrasi: Seorang siswa berdiri di depan meja yang penuh dengan benda-benda unik — vas bunga, jam antik, dan patung kecil. Ia memegang buku catatan dan pena, tersenyum sambil mengamati setiap benda dengan saksama. Di belakangnya, papan tulis bertuliskan 'DESKRIPSI: Melukis dengan Kata-Kata'. Gaya ilustrasi kartun sekolah dengan warna biru dan kuning.]",
    "Struktur Teks Deskripsi": "[Ilustrasi: Diagram rumah dengan tiga bagian yang diberi label. Atap: IDENTIFIKASI (pengenalan objek). Dinding: KLASIFIKASI (pembagian kategori). Pondasi: DESKRIPSI BAGIAN (ciri-ciri detail). Di samping rumah, tanda panah dari bawah ke atas menunjukkan urutan penulisan. Gaya ilustrasi infografis dengan warna hijau dan biru.]",
    "Kaidah Kebahasaan Teks Deskripsi": "[Ilustrasi: Papan tulis besar dengan tempelan sticky note warna-warni. Setiap sticky note menampilkan satu kaidah kebahasaan — kata sifat (hijau), kata kerja (biru), kata sambung (kuning), kalimat perinci (merah), dan kata depan (ungu). Sebuah pensil raksasa berdiri di samping papan. Gaya ilustrasi kartun edukatif dengan warna pastel.]",
    rangkuman: "[Ilustrasi: Seorang pelajar duduk di taman dengan buku terbuka, memandang keindahan alam sekitar — pohon rindang, bunga mekar, dan awan putih. Ekspresi wajahnya penuh inspirasi. Gelembung pikiran di atas kepalanya berisi kata-kata: 'indah', 'hijau', 'sejuk', 'cerah'. Gaya ilustrasi puitis dengan palet alami.]",
  },
  "Bab 2: Cerita Fantasi": {
    "Apa Itu Cerita Fantasi?": "[Ilustrasi: Sebuah buku terbuka di atas meja kayu, dari halamannya keluar cahaya keemasan. Dari cahaya itu muncul kastil melayang di awan, naga kecil terbang, dan peri dengan sayap berkilau. Seorang anak duduk di kursi, membaca dengan takjub. Gaya ilustrasi fantasi dengan warna ungu, biru laut, dan emas.]",
    "Struktur dan Kebahasaan Cerita Fantasi": "[Ilustrasi: Peta petualangan bergaya kuno dengan tiga titik perhentian. Titik 1: ORIENTASI (desa kecil) — pengenalan tokoh dan latar. Titik 2: KONFLIK (gunung berapi) — muncul masalah. Titik 3: RESOLUSI (istana) — penyelesaian. Garis putus-putus menghubungkan ketiganya. Gaya ilustrasi peta fantasi dengan warna cokelat dan emas.]",
    "Tips Menulis Cerita Fantasi yang Menarik": "[Ilustrasi: Meja penulis dengan mesin tik, di sampingnya secangkir kopi mengeluarkan uap berbentuk bintang. Dari kertas mesin tik, kata-kata terbang keluar dan berubah menjadi karakter fantasi — pangeran, naga mini, dan botol ajaib. Lampu meja menyorot ke mesin tik. Gaya ilustrasi kreatif dengan warna hangat.]",
    rangkuman: "[Ilustrasi: Seorang penulis cilik duduk di bawah pohon besar dengan buku catatan di pangkuan. Dari ujung penanya, kata-kata berubah menjadi gelembung-gelembung berisi gambar-gambar fantasi — kastil, peri, bintang, dan bulan sabit. Sinar matahari menembus dedaunan. Gaya ilustrasi surealis dengan palet hangat.]",
  },
  "Bab 3: Teks Prosedur": {
    "Apa Itu Teks Prosedur?": "[Ilustrasi: Dapur mini dengan seorang anak yang antusias mengikuti resep kue. Di atas meja, bahan-bahan tertata rapi — tepung, telur, gula, mentega. Buku resep terbuka dengan langkah-langkah bergambar. Tangan anak itu memegang whisk, siap mencampur adonan. Gaya ilustrasi kartun tutorial dengan warna kuning dan merah.]",
    "Struktur Teks Prosedur": "[Ilustrasi: Diagram alur vertikal dengan tiga kotak besar berwarna berbeda. Kotak 1 (merah): TUJUAN — judul dan hasil akhir. Kotak 2 (kuning): ALAT & BAHAN — daftar kebutuhan. Kotak 3 (hijau): LANGKAH-LANGKAH — nomor urut dari 1 sampai 5. Panah besar menghubungkan kotak-kotak tersebut. Gaya ilustrasi infografis prosedur.]",
    "Jenis-Jenis Teks Prosedur": "[Ilustrasi: Tiga buku berbeda ukuran berjejer di rak. Buku 1: PROSEDUR SEDERHANA (tipis, 2-3 langkah, ikon sikat gigi). Buku 2: PROSEDUR PROTOKOL (sedang, langkah berurutan, ikon resep masakan). Buku 3: PROSEDUR KOMPLEKS (tebal, banyak langkah, ikon perakitan meja). Gaya ilustrasi perbandingan dengan warna-warna cerah.]",
    "Kaidah Kebahasaan Teks Prosedur": "[Ilustrasi: Papan buletin dengan 6 kartu berwarna yang ditempel. Kartu 1: KATA IMPERATIF '—kan, -lah'. Kartu 2: KATA KERJA AKTIF. Kartu 3: KONJUNGSI TEMPORAL. Kartu 4: KATA BILANGAN. Kartu 5: KATA TEKNIS. Kartu 6: KALIMAT EFEKTIF. Jepitan kertas mini menghias setiap kartu. Gaya ilustrasi infografis papan buletin.]",
    "Tips Menulis Teks Prosedur yang Jelas": "[Ilustrasi: Seorang anak duduk di meja belajar sambil memegang pensil, tersenyum puas melihat buku tulisnya yang penuh dengan langkah-langkah prosedur yang rapi. Di sudut meja, sebuah lampu meja dan segelas air. Di belakangnya, papan visi dengan tempelan kertas bertuliskan 'TULISANMU HARUS JELAS!' Gaya ilustrasi kartun motivasi dengan warna oranye.]",
    rangkuman: "[Ilustrasi: Sebuah papan tulis hijau di ruang kelas dengan kapur berwarna-warni. Tertulis: '✓ Langkah urut & logis ✓ Kata perintah ✓ Bahasa sederhana ✓ Alat & bahan lengkap'. Di samping tulisan, gambar ikon centang besar hijau. Sebuah penghapus dan kapur tergeletak di papan tulis. Gaya ilustrasi suasana kelas dengan warna hijau dan putih.]",
  },
  "Bab 4: Teks LHO": {
    "Apa Itu Teks Laporan Hasil Observasi?": "[Ilustrasi: Seorang siswa berdiri di halaman sekolah memegang buku catatan dan teropong, mengamati burung-burung di pohon. Di pangkuannya, buku sketsa berisi gambar daun dan serangga. Temannya di samping sedang menulis sesuatu di clipboard. Latar belakang: halaman sekolah yang hijau. Gaya ilustrasi kartun observasi dengan warna hijau dan biru.]",
    "Struktur Teks LHO": "[Ilustrasi: Diagram piramida tiga tingkat. Tingkat atas (biru muda): PERNYATAAN UMUM — definisi objek. Tingkat tengah (biru sedang): DESKRIPSI BAGIAN — ciri, sifat, perilaku. Tingkat bawah (biru tua): SIMPULAN — kesimpulan umum. Setiap tingkat dihubungkan garis dari atas ke bawah. Gaya ilustrasi struktur piramida informatif.]",
    "Kaidah Kebahasaan Teks LHO": "[Ilustrasi: Microscope raksasa dengan lensa berbentuk kaca pembesar yang memperbesar sebuah paragraf. Di dalam paragraf yang diperbesar, kata-kata tertentu di-highlight: ISTILAH TEKNIS (kuning), KATA KERJA (hijau), KALIMAT PASIF (biru), KONJUNGSI (merah). Gaya ilustrasi sains dengan warna putih dan biru.]",
    "Langkah-Langkah Melakukan Observasi": "[Ilustrasi: Infografis alur 5 langkah berbentuk lingkaran. Langkah 1 (topi): Tentukan topik. Langkah 2 (mata): Amati objek. Langkah 3 (buku): Catat data. Langkah 4 (kotak centang): Klasifikasikan. Langkah 5 (bintang): Susun laporan. Panah melingkar menghubungkan setiap langkah. Tangan kecil menunjuk ke langkah 1. Gaya ilustrasi alur sirkuler.]",
    "Perbedaan LHO dengan Teks Deskripsi": "[Ilustrasi: Dua kolom perbandingan di papan tulis. Kolom kiri: 'LHO — objektif, data, sistematis, berdasarkan observasi' dengan ikon mikroskop. Kolom kanan: 'DESKRIPSI — subjektif, opini, menggambarkan, berdasarkan pengamatan' dengan ikon kuas lukis. Tanda panah berwarna-warni menghubungkan kedua kolom. Gaya ilustrasi perbandingan dengan warna kontras.]",
    rangkuman: "[Ilustrasi: Seorang pelajar berdiri di samping poster besar yang menampilkan rangkuman LHO. Poster itu berisi ikon-ikon: mikroskop (pengamatan), buku catatan (data), diagram (sistematis), dan centang (objektif). Pelajar itu mengacungkan jempol dengan bangga. Gaya ilustrasi presentasi dengan warna hijau tosca.]",
  },
  "Bab 5: Puisi Rakyat": {
    "Apa Itu Puisi Rakyat?": "[Ilustrasi: Sekelompok anak-anak duduk melingkar di bawah pohon beringin besar. Seorang nenek duduk di tengah, membacakan pantun dan syair dengan penuh semangat. Anak-anak mendengarkan dengan gembira. Di atas pohon, kata-kata bertebaran: pantun, syair, gurindam. Gaya ilustrasi tradisional dengan warna cokelat dan hijau daun.]",
    "Pantun — Si Jenaka Penuh Makna": "[Ilustrasi: Empat baris kalimat berwarna-warni membentuk pola a-b-a-b. Baris 1 (merah) dan 3 (biru) bersajak, baris 2 (kuning) dan 4 (hijau) bersajak. Dua baris pertama (sampiran) bergambar buah-buahan, dua baris terakhir (isi) bergambar buku dan pena. Gaya ilustrasi sajak dengan warna-warna cerah.]",
    "Syair — Bait Bersajak Penuh Kisah": "[Ilustrasi: Buku kuno terbuka dengan halaman menguning. Setiap baris puisi diawali dengan huruf kapital berhiaskan ornamen melayu. Empat baris setiap bait bersajak a-a-a-a, digambarkan dengan pita-pita yang menghubungkan ujung setiap baris. Di samping buku, tinta dan pena bulu ayam. Gaya ilustrasi klasik Melayu dengan warna cokelat dan emas.]",
    "Gurindam — Dua Baris Penuh Makna": "[Ilustrasi: Penghulu desa duduk di serambi masjid sambil memegang buku kecil. Di papan di sampingnya tertulis gurindam 2 baris dengan aksara indah. Warga desa mendengarkan dengan khusyuk. Dua baris digambarkan seperti anak tangga — baris pertama sebab, baris kedua akibat. Gaya ilustrasi budaya dengan warna hijau dan krem.]",
    "Perbandingan Pantun, Syair, dan Gurindam": "[Ilustrasi: Tabel perbandingan besar dengan tiga kolom. Kolom 1: PANTUN (4 baris, a-b-a-b, sampiran+isi) dengan ikon buah. Kolom 2: SYAIR (4 baris, a-a-a-a, semua isi) dengan ikon buku kisah. Kolom 3: GURINDAM (2 baris, a-a, isi) dengan ikon tangga. Setiap kolom diberi warna berbeda. Gaya ilustrasi tabel informatif.]",
    rangkuman: "[Ilustrasi: Seorang anak berdiri di panggung kecil, membaca puisi dengan percaya diri. Lampu panggung menyorotnya. Di latar belakang, layar menampilkan kata-kata: 'PANTUN (a-b-a-b)', 'SYAIR (a-a-a-a)', 'GURINDAM (2 baris)'. Tepuk tangan dari penonton digambarkan dengan gelembung bintang. Gaya ilustrasi panggung dengan warna ungu dan emas.]",
  },
  "Bab 6: Cerpen": {
    "Mengenal Cerita Pendek": "[Ilustrasi: Sebuah buku cerita terbuka di tengah halaman, dari buku itu muncul karakter-karakter mini seperti wayang — seorang anak berlari, seorang ibu tersenyum, dan seekor kucing lucu. Di latar belakang, pemandangan desa dengan sawah dan gunung. Gaya ilustrasi naratif dengan palet warna cerah.]",
    "Unsur Intrinsik Cerpen": "[Ilustrasi: Lingkaran konsentris seperti target panah. Lingkaran paling luar: LOKASI + WAKTU. Lingkaran kedua: TOKOH + ALUR. Lingkaran ketiga: TEMA. Pusat: AMANAT. Setiap lingkaran memiliki warna dan ikon yang berbeda. Panah dari luar ke dalam menunjukkan bagaimana unsur-unsur saling terkait. Gaya ilustrasi diagram konsentris.]",
    "Unsur Ekstrinsik dan Jenis Cerpen": "[Ilustrasi: Pohon besar dengan akar menjulur ke tanah (latar belakang pengarang, sosial budaya), batang kokoh (cerpen sebagai hasil karya), dan cabang-cabang berdaun (berbagai jenis cerpen). Matahari di atas pohon melambangkan 'inspirasi penulis'. Gaya ilustrasi metaforis dengan warna hijau dan biru.]",
    rangkuman: "[Ilustrasi: Seorang pelajar duduk santai di kursi baca, memegang buku cerpen dengan senyum puas. Di sekelilingnya, balon-balon kata berisi istilah penting: 'TEMA', 'TOKOH', 'ALUR', 'LATAR', 'AMANAT'. Rak buku di belakang penuh dengan buku cerpen warna-warni. Gaya ilustrasi perpustakaan cozy dengan warna cokelat dan krem.]",
  },
}

async function main() {
  const units = await db.learningUnit.findMany({
    where: { grade: "VII", semester: 1, isActive: true },
    orderBy: { order: "asc" },
  })

  for (const unit of units) {
    const data = ilustrasi[unit.title]
    if (!data) {
      console.log(`  ${unit.title} — tidak ada data ilustrasi, lewati`)
      continue
    }

    const c = JSON.parse(unit.content)
    let changes = 0

    // Add to materi isi arrays
    for (const m of c.belajar.materi) {
      const img = data[m.judul]
      if (img) {
        // Add after the first non-empty line of isi
        const insertAt = m.isi.findIndex(l => l.trim().length > 0 && !l.startsWith("["))
        if (insertAt >= 0) {
          m.isi.splice(insertAt + 1, 0, "", img, "")
          changes++
          console.log(`  ${unit.title} → ${m.judul}: +ilustrasi`)
        }
      }
    }

    // Add to rangkuman
    if (data.rangkuman && c.belajar.rangkuman?.length > 0) {
      c.belajar.rangkuman.unshift(data.rangkuman)
      changes++
      console.log(`  ${unit.title} → rangkuman: +ilustrasi`)
    }

    if (changes > 0) {
      await db.learningUnit.update({
        where: { id: unit.id },
        data: { content: JSON.stringify(c) },
      })
      console.log(`  ✅ ${unit.title} — diperbarui (${changes} ilustrasi)`)
    } else {
      console.log(`  ${unit.title} — tidak ada perubahan`)
    }
  }

  console.log("\nSelesai! Ilustrasi ditambahkan ke Grade VII Semester 1.")
}

main().catch(console.error).finally(() => process.exit())
