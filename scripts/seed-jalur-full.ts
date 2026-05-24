import { db } from "../lib/db"

interface KontenUnit {
  belajar: { tujuan: string[]; materi: { judul: string; isi: string[]; contoh: string[]; catatan?: string }[]; rangkuman: string[] }
  latihan: { id: number; soal: string; opsi: string[]; jawaban: number; penjelasan: string }[]
  praktik: { petunjuk: string; tips: string[]; contoh?: string }
  kuis: { id: number; soal: string; opsi: string[]; jawaban: number; penjelasan: string }[]
}

const content: Record<string, KontenUnit> = {}
function addContent(key: string, c: KontenUnit) { content[key] = c }

addContent("Teks Deskripsi", {
  belajar: { tujuan: ["Memahami pengertian teks deskripsi", "Mengidentifikasi ciri-ciri teks deskripsi", "Menyusun teks deskripsi sederhana"],
    materi: [
      { judul: "Apa itu Teks Deskripsi?", isi: ["Teks deskripsi menggambarkan objek secara terperinci sehingga pembaca seolah melihat, mendengar, atau merasakan sendiri.", "Tujuannya membuat pembaca memiliki gambaran jelas tentang sesuatu yang dideskripsikan.", "Contoh: deskripsi pantai, kamar, atau benda kesayangan."], contoh: ["Pantai Parangtritis memiliki hamparan pasir hitam yang lembut. Ombaknya bergulung-gulung memecah di karang-karang besar."], catatan: "Kata kunci: seolah-olah melihat, mendengar, merasakan" },
      { judul: "Ciri-ciri Teks Deskripsi", isi: ["Menggambarkan objek secara detail (bentuk, warna, ukuran, suasana).", "Menggunakan kata-kata konkret dan spesifik.", "Mengandung majas untuk memperkuat gambaran.", "Kalimat perincian: 'ada...', 'yaitu...', 'seperti...'"], contoh: ["Konkret: 'meja kayu jati ukiran' (bukan hanya 'meja')"] },
    ], rangkuman: ["Teks deskripsi menggambarkan objek secara detail.", "Kata konkret, kalimat perincian, majas.", "Gunakan panca indera sebagai panduan."] },
  latihan: [
    { id: 1, soal: "Teks deskripsi bertujuan untuk...", opsi: ["Menceritakan kisah fiktif", "Menggambarkan objek secara detail", "Menyampaikan argumen", "Memberikan petunjuk"], jawaban: 1, penjelasan: "Teks deskripsi bertujuan menggambarkan objek." },
    { id: 2, soal: "Kata konkret terdapat pada...", opsi: ["Kebahagiaan", "Meja kayu jati", "Keindahan", "Cinta"], jawaban: 1, penjelasan: "'Meja kayu jati' bisa dilihat dan diraba." },
    { id: 3, soal: "Yang BUKAN ciri teks deskripsi adalah...", opsi: ["Mengandung majas", "Kata konkret", "Berisi argumen", "Kalimat perincian"], jawaban: 2, penjelasan: "Argumen adalah ciri teks argumentasi." },
    { id: 4, soal: "'Aroma kopi tercium dari dapur' termasuk deskripsi...", opsi: ["Visual", "Auditif", "Pencium", "Peraba"], jawaban: 2, penjelasan: "'Aroma' berkaitan dengan indera penciuman." },
    { id: 5, soal: "Majas 'angin berbisik' termasuk...", opsi: ["Metafora", "Personifikasi", "Hiperbola", "Simile"], jawaban: 1, penjelasan: "Personifikasi: benda mati seolah memiliki sifat manusia." },
  ],
  praktik: { petunjuk: "Pilihlah satu tempat favoritmu. Tulislah teks deskripsi 3-5 kalimat menggunakan kata konkret dan kalimat perincian!", tips: ["Gunakan 3 dari 5 panca indera", "Mulai dengan kalimat pembuka menarik"], contoh: "Kelasku memiliki dinding bercat putih bersih. Di sudut kanan terdapat rak buku berisi puluhan novel. Jendela besar menghadap taman." },
  kuis: [
    { id: 1, soal: "'Aroma kopi tercium dari dapur' — indera...", opsi: ["Penglihatan", "Pendengaran", "Penciuman", "Peraba"], jawaban: 2, penjelasan: "Aroma = penciuman." },
    { id: 2, soal: "'Di sudut ruangan' menggunakan kata depan...", opsi: ["Di", "Ke", "Dari", "Pada"], jawaban: 0, penjelasan: "'Di' menunjukkan tempat." },
    { id: 3, soal: "Yang BUKAN panca indera...", opsi: ["Penglihatan", "Pendengaran", "Perasaan", "Penciuman"], jawaban: 2, penjelasan: "'Perasaan' bukan indera fisik." },
    { id: 4, soal: "Kalimat perincian yang tepat...", opsi: ["Rumah itu besar", "Rumah memiliki 3 kamar tidur, 2 kamar mandi, halaman luas", "Rumah itu bagus", "Rumah mahal"], jawaban: 1, penjelasan: "Memberikan rincian spesifik." },
    { id: 5, soal: "Deskripsi visual berkaitan dengan...", opsi: ["Pendengaran", "Penglihatan", "Penciuman", "Peraba"], jawaban: 1, penjelasan: "Visual = penglihatan." },
  ],
})

addContent("Puisi Rakyat & Cerita Fantasi", {
  belajar: { tujuan: ["Memahami pantun, gurindam, syair", "Mengenal cerita fantasi", "Membedakan puisi rakyat dan cerita fantasi"],
    materi: [
      { judul: "Puisi Rakyat", isi: ["Pantun: bersajak a-b-a-b, 4 baris. Baris 1-2 sampiran, 3-4 isi.", "Gurindam: 2 baris, a-a, berisi nasihat.", "Syair: 4 baris, a-a-a-a, berisi cerita atau nasihat."], contoh: ["Pantun:\nKalau ada jarum yang patah\nJangan disimpan di dalam peti\nKalau ada kata yang salah\nJangan disimpan di dalam hati"] },
      { judul: "Cerita Fantasi", isi: ["Mengandung unsur magis, dunia imajinasi.", "Tokoh dengan kekuatan supranatural, latar dunia paralel."], contoh: ["Seorang anak menemukan tangga pelangi yang membawanya ke kerajaan awan."] },
    ], rangkuman: ["Pantun: a-b-a-b, sampiran dan isi.", "Gurindam: 2 baris, a-a, nasihat.", "Syair: a-a-a-a, cerita.", "Cerita fantasi: unsur magis."] },
  latihan: [
    { id: 1, soal: "Pantun memiliki pola rima...", opsi: ["a-a-a-a", "a-b-a-b", "a-b-b-a", "a-a-b-b"], jawaban: 1, penjelasan: "Pantun bersajak a-b-a-b." },
    { id: 2, soal: "Baris 1-2 pantun disebut...", opsi: ["Isi", "Sampiran", "Amanat", "Larik"], jawaban: 1, penjelasan: "Baris 1-2 sampiran, 3-4 isi." },
    { id: 3, soal: "Gurindam terdiri dari... baris", opsi: ["2", "3", "4", "5"], jawaban: 0, penjelasan: "Gurindam 2 baris per bait." },
    { id: 4, soal: "Syair memiliki rima...", opsi: ["a-b-a-b", "a-a-b-b", "a-a-a-a", "a-b-b-a"], jawaban: 2, penjelasan: "Syair bersajak a-a-a-a." },
    { id: 5, soal: "Cerita fantasi memiliki latar...", opsi: ["Dunia nyata", "Dunia imajinasi", "Sekolah", "Pasar"], jawaban: 1, penjelasan: "Cerita fantasi berlatar dunia imajinasi." },
  ],
  praktik: { petunjuk: "Buatlah satu bait pantun tema 'Persahabatan'! 4 baris, a-b-a-b.", tips: ["Sampiran tentang alam", "8-12 suku kata per baris"], contoh: "Pergi ke pasar membeli duku\nJangan lupa membeli salak\nSahabat sejati sejak kecil selalu\nSaling membantu tanpa pamrih walau berat" },
  kuis: [
    { id: 1, soal: "'Jika ingin hidupmu berarti\nRajin-rajinlah belajar setiap hari' termasuk...", opsi: ["Pantun", "Gurindam", "Syair", "Cerita fantasi"], jawaban: 1, penjelasan: "2 baris, a-a, nasihat → gurindam." },
    { id: 2, soal: "Perbedaan pantun dan syair terletak pada...", opsi: ["Jumlah baris", "Pola rima", "Tema", "Panjang baris"], jawaban: 1, penjelasan: "Pantun a-b-a-b, syair a-a-a-a." },
    { id: 3, soal: "Majas dalam cerita fantasi sering menggunakan...", opsi: ["Hiperbola", "Personifikasi", "Metafora", "Semua benar"], jawaban: 3, penjelasan: "Cerita fantasi kaya berbagai majas." },
    { id: 4, soal: "Cermatilah pantun:\n'Buah semangka buah kedondong\nDimakan sambil duduk termenung\nKalau kamu suka menolong\nPastilah banyak temanmu yang bingung'\nPantun ini tidak sempurna karena...", opsi: ["Rimanya tidak a-b-a-b", "Terlalu panjang", "Tidak ada sampiran", "Isinya tidak bermakna"], jawaban: 0, penjelasan: "'nung' dan 'bung' tidak sama." },
    { id: 5, soal: "Tokoh dalam cerita fantasi biasanya memiliki...", opsi: ["Kekuatan biasa", "Kekuatan supranatural", "Pekerjaan tetap", "Rumah mewah"], jawaban: 1, penjelasan: "Tokoh fantasi memiliki kekuatan magis/supranatural." },
  ],
})

const levels = [
  {
    level: 1, title: "Pemula", subtitle: "Kelas 7 — Dasar-dasar Bahasa Indonesia",
    description: "Mulai dari sini! Pelajari teks deskripsi, puisi rakyat, prosedur, berita, surat, dan tanggapan.",
    color: "from-emerald-500 to-teal-600", emoji: "🌱", order: 1, xpReward: 1200, coinReward: 300,
    units: [
      { title: "Teks Deskripsi", subtitle: "Mendeskripsikan objek secara detail", emoji: "🖼️", order: 1, topik: "DESKRIPSI" },
      { title: "Puisi Rakyat & Cerita Fantasi", subtitle: "Pantun, gurindam, syair, dan fantasi", emoji: "📖", order: 2, topik: "PUISI_RAKYAT" },
      { title: "Teks Prosedur", subtitle: "Langkah-langkah melakukan sesuatu", emoji: "📋", order: 3, topik: "PROSEDUR" },
      { title: "Teks Berita", subtitle: "Menyampaikan informasi aktual", emoji: "📰", order: 4, topik: "BERITA" },
      { title: "Buku Bergambar & Teks Tanggapan", subtitle: "Fiksi, nonfiksi, dan cara menanggapinya", emoji: "📚", order: 5, topik: "TANGGAPAN" },
      { title: "Surat Pribadi & Resmi", subtitle: "Menulis surat untuk berbagai keperluan", emoji: "✉️", order: 6, topik: "SURAT" },
    ],
  },
  {
    level: 2, title: "Terampil", subtitle: "Kelas 8 — Mengembangkan kemampuan",
    description: "Laporan observasi, iklan, artikel, resensi, puisi, dan pidato.",
    color: "from-blue-500 to-indigo-600", emoji: "📝", order: 2, xpReward: 1500, coinReward: 375,
    units: [
      { title: "Laporan Hasil Observasi", subtitle: "Melaporkan hasil pengamatan", emoji: "🔬", order: 1, topik: "LHO" },
      { title: "Iklan Slogan Poster", subtitle: "Membujuk dengan kata dan visual", emoji: "📊", order: 2, topik: "IKLAN" },
      { title: "Artikel Ilmiah Populer", subtitle: "Menulis artikel yang mudah dipahami", emoji: "📝", order: 3, topik: "ARTIKEL" },
      { title: "Resensi", subtitle: "Mengulas karya fiksi", emoji: "📖", order: 4, topik: "RESENSI" },
      { title: "Puisi", subtitle: "Menciptakan puisi dengan majas", emoji: "🌟", order: 5, topik: "PUISI" },
      { title: "Pidato", subtitle: "Berbicara di depan umum", emoji: "🎤", order: 6, topik: "PIDATO" },
    ],
  },
  {
    level: 3, title: "Mahir", subtitle: "Kelas 9 — Siap menghadapi tantangan",
    description: "Teks rekon, eksplanasi, laporan, dan argumentasi.",
    color: "from-purple-500 to-pink-600", emoji: "🎭", order: 3, xpReward: 1800, coinReward: 450,
    units: [
      { title: "Teks Rekon", subtitle: "Menceritakan pengalaman masa lalu", emoji: "📖", order: 1, topik: "REKON" },
      { title: "Teks Eksplanasi", subtitle: "Menjelaskan proses fenomena", emoji: "🔍", order: 2, topik: "EKSPLANASI" },
      { title: "Teks Laporan", subtitle: "Menyajikan informasi faktual", emoji: "📊", order: 3, topik: "LAPORAN" },
      { title: "Teks Argumentasi", subtitle: "Meyakinkan dengan argumen logis", emoji: "💪", order: 4, topik: "ARGUMENTASI" },
    ],
  },
  {
    level: 4, title: "Juara", subtitle: "Persiapan UKBI — Mahir Berbahasa",
    description: "Kosakata, wacana akademik, kaidah bahasa, esai, presentasi, dan simulasi UKBI.",
    color: "from-amber-500 to-orange-600", emoji: "🏆", order: 4, xpReward: 2000, coinReward: 500,
    units: [
      { title: "Kosakata & Istilah", subtitle: "Memperkaya perbendaharaan kata", emoji: "📖", order: 1, topik: "KOSAKATA" },
      { title: "Wacana Akademik", subtitle: "Memahami teks ilmiah", emoji: "🎓", order: 2, topik: "WACANA" },
      { title: "Kaidah Bahasa Lanjutan", subtitle: "Konjungsi, kohesi, koherensi", emoji: "📝", order: 3, topik: "KAIDAH" },
      { title: "Menulis Esai", subtitle: "Mengembangkan gagasan secara sistematis", emoji: "✏️", order: 4, topik: "ESAI" },
    ],
  },
]

async function seed() {
  console.log("🧹 Membersihkan data lama...")
  await db.learningUnit.deleteMany({})
  await db.learningLevel.deleteMany({})
  await db.userUnitProgress.deleteMany({})

  for (const lvl of levels) {
    const { units: unitData, ...levelData } = lvl
    const created = await db.learningLevel.create({ data: levelData })
    console.log(`✅ Level: ${created.title}`)

    for (const u of unitData) {
      const c = content[u.title]
      await db.learningUnit.create({
        data: {
          ...u,
          levelId: created.id,
          xpReward: 50,
          coinReward: 10,
          content: c ? JSON.stringify(c) : null,
          isActive: true,
        },
      })
      console.log(`  ✅ Unit: ${u.title} ${c ? "(dengan konten)" : "(placeholder)"}`)
    }
  }

  console.log("\n🎉 Seeding selesai!")
}

seed().catch(e => { console.error(e); process.exit(1) })
