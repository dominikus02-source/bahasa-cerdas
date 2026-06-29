/**
 * Seed Jalur Cerdas Core Curriculum — replaces PANDUAN-copied JALUR data
 * with a proper Duolingo-style Bahasa Indonesia ability path.
 *
 * 12 Levels, 72 units, from basic huruf/vokal to mahir menulis argumen.
 * Suitable for all ages (SD and above), NOT grade-based.
 *
 * Safety:
 * - Dry-run by default (--execute to apply)
 * - Only touches JALUR type records
 * - PANDUAN, UKBI/TKA, User/Profile untouched
 * - Aborts if any UserUnitProgress exists for JALUR units
 * - No global deleteMany — scoped delete by type="JALUR"
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()
const EXECUTE = process.argv.includes("--execute")
const DRY_RUN = !EXECUTE

interface UnitDef {
  title: string
  subtitle?: string
  description: string
  topik?: string
  emoji?: string
  xpReward?: number
  coinReward?: number
}

interface LevelDef {
  level: number
  title: string
  subtitle: string
  description: string
  color: string
  emoji: string
  xpReward: number
  coinReward: number
  units: UnitDef[]
}

const CURRICULUM: LevelDef[] = [
  {
    level: 1,
    title: "Mulai dari Bahasa",
    subtitle: "Kenali bunyi, huruf, dan kata pertama",
    description: "Belajar mengenali bunyi bahasa, huruf vokal dan konsonan, serta membaca kata pendek. Cocok untuk pemula yang baru mulai belajar Bahasa Indonesia.",
    color: "from-violet-500 to-purple-600",
    emoji: "🔤",
    xpReward: 100,
    coinReward: 20,
    units: [
      { title: "Mengenal Bunyi dan Huruf", description: "Belajar bunyi bahasa dan bentuk huruf", emoji: "👂", topik: "fonetik", xpReward: 50, coinReward: 10 },
      { title: "Huruf Vokal dan Konsonan", description: "Membedakan huruf vokal (a,i,u,e,o) dan konsonan", emoji: "🅰️", topik: "fonetik", xpReward: 50, coinReward: 10 },
      { title: "Suku Kata Sederhana", description: "Gabungan huruf menjadi suku kata", emoji: "🧩", topik: "fonetik", xpReward: 50, coinReward: 10 },
      { title: "Membaca Kata Pendek", description: "Latihan membaca kata 2-3 suku kata", emoji: "📖", topik: "membaca", xpReward: 50, coinReward: 10 },
      { title: "Mendengar dan Memilih Kata", description: "Latihan mendengar lalu memilih kata yang tepat", emoji: "🎧", topik: "menyimak", xpReward: 50, coinReward: 10 },
      { title: "Latihan Cepat Level 1", description: "Review semua materi Level 1 dalam soal cepat", emoji: "⚡", topik: "review", xpReward: 100, coinReward: 20 },
    ],
  },
  {
    level: 2,
    title: "Ejaan Dasar",
    subtitle: "Tanda baca dan huruf kapital",
    description: "Menguasai aturan dasar ejaan: huruf kapital, tanda titik, koma, tanya, dan seru. Fondasi menulis yang rapi dan benar.",
    color: "from-fuchsia-500 to-purple-600",
    emoji: "✏️",
    xpReward: 100,
    coinReward: 20,
    units: [
      { title: "Huruf Kapital", description: "Kapan menggunakan huruf kapital di awal kalimat dan nama", emoji: "⬆️", topik: "ejaan", xpReward: 50, coinReward: 10 },
      { title: "Tanda Titik", description: "Mengakhiri kalimat dengan tanda titik", emoji: "🔴", topik: "ejaan", xpReward: 50, coinReward: 10 },
      { title: "Tanda Koma", description: "Menggunakan koma untuk jeda dan pemisah", emoji: "🟤", topik: "ejaan", xpReward: 50, coinReward: 10 },
      { title: "Tanda Tanya dan Seru", description: "Kalimat tanya dan kalimat seru", emoji: "❓", topik: "ejaan", xpReward: 50, coinReward: 10 },
      { title: "Menulis Kata dengan Tepat", description: "Latihan menulis ulang kata dengan ejaan benar", emoji: "✅", topik: "ejaan", xpReward: 50, coinReward: 10 },
      { title: "Latihan Cepat Level 2", description: "Review semua materi Level 2", emoji: "⚡", topik: "review", xpReward: 100, coinReward: 20 },
    ],
  },
  {
    level: 3,
    title: "Kata Baku",
    subtitle: "Bahasa Indonesia yang benar dan resmi",
    description: "Mengenal kata baku dan tidak baku, kata serapan, serta kesalahan kata sehari-hari. Jadi lebih percaya diri menulis formal.",
    color: "from-pink-500 to-fuchsia-600",
    emoji: "📚",
    xpReward: 100,
    coinReward: 20,
    units: [
      { title: "Kata Baku dan Tidak Baku", description: "Membedakan kata resmi dan tidak resmi", emoji: "📗", topik: "kata-baku", xpReward: 50, coinReward: 10 },
      { title: "Kata Serapan Umum", description: "Kata dari bahasa asing yang diserap ke Indonesia", emoji: "🌍", topik: "kata-baku", xpReward: 50, coinReward: 10 },
      { title: "Kesalahan Kata Sehari-hari", description: "Kata yang sering salah dalam percakapan dan tulisan", emoji: "⚠️", topik: "kata-baku", xpReward: 50, coinReward: 10 },
      { title: "Memilih Kata yang Tepat", description: "Latihan memilih kata baku dalam kalimat", emoji: "🎯", topik: "kata-baku", xpReward: 50, coinReward: 10 },
      { title: "Perbaiki Kata dalam Kalimat", description: "Mengoreksi kata tidak baku dalam kalimat", emoji: "🔧", topik: "kata-baku", xpReward: 50, coinReward: 10 },
      { title: "Latihan Cepat Level 3", description: "Review semua materi Level 3", emoji: "⚡", topik: "review", xpReward: 100, coinReward: 20 },
    ],
  },
  {
    level: 4,
    title: "Makna Kata",
    subtitle: "Sinonim, antonim, dan arti dalam konteks",
    description: "Perkaya kosakata dengan memahami sinonim, antonim, homonim, serta makna denotatif dan konotatif.",
    color: "from-rose-500 to-pink-600",
    emoji: "💡",
    xpReward: 100,
    coinReward: 20,
    units: [
      { title: "Sinonim", description: "Kata yang memiliki arti sama atau mirip", emoji: "🔄", topik: "kosakata", xpReward: 50, coinReward: 10 },
      { title: "Antonim", description: "Kata yang memiliki arti berlawanan", emoji: "↔️", topik: "kosakata", xpReward: 50, coinReward: 10 },
      { title: "Homonim Sederhana", description: "Kata yang sama bunyi tapi beda arti", emoji: "🔊", topik: "kosakata", xpReward: 50, coinReward: 10 },
      { title: "Makna Denotatif dan Konotatif", description: "Arti sebenarnya vs arti kiasan", emoji: "🎨", topik: "kosakata", xpReward: 50, coinReward: 10 },
      { title: "Kosakata dalam Konteks", description: "Memilih kata yang sesuai dengan konteks kalimat", emoji: "📝", topik: "kosakata", xpReward: 50, coinReward: 10 },
      { title: "Latihan Cepat Level 4", description: "Review semua materi Level 4", emoji: "⚡", topik: "review", xpReward: 100, coinReward: 20 },
    ],
  },
  {
    level: 5,
    title: "Bentuk Kata",
    subtitle: "Imbuhan dan akhiran",
    description: "Memahami kata dasar dan berbagai imbuhan: me-, ber-, pe-, per-, -kan, -i. Kunci membentuk kalimat yang benar.",
    color: "from-orange-500 to-rose-600",
    emoji: "🧱",
    xpReward: 100,
    coinReward: 20,
    units: [
      { title: "Kata Dasar", description: "Mengenal kata tanpa imbuhan", emoji: "📦", topik: "morfologi", xpReward: 50, coinReward: 10 },
      { title: "Imbuhan Me-", description: "Penggunaan awalan me- dan perubahannya", emoji: "➕", topik: "morfologi", xpReward: 50, coinReward: 10 },
      { title: "Imbuhan Ber-", description: "Penggunaan awalan ber-", emoji: "➕", topik: "morfologi", xpReward: 50, coinReward: 10 },
      { title: "Imbuhan Pe- dan Per-", description: "Awalan pe- dan per- membentuk kata benda/kata kerja", emoji: "➕", topik: "morfologi", xpReward: 50, coinReward: 10 },
      { title: "Akhiran -kan dan -i", description: "Akhiran -kan dan -i pada kata kerja", emoji: "➖", topik: "morfologi", xpReward: 50, coinReward: 10 },
      { title: "Latihan Cepat Level 5", description: "Review semua materi Level 5", emoji: "⚡", topik: "review", xpReward: 100, coinReward: 20 },
    ],
  },
  {
    level: 6,
    title: "Kalimat Jelas",
    subtitle: "Subjek, predikat, objek, dan kalimat efektif",
    description: "Belajar struktur kalimat yang benar: subjek, predikat, objek, keterangan. Membuat kalimat efektif dan tidak berbelit-belit.",
    color: "from-amber-500 to-orange-600",
    emoji: "📐",
    xpReward: 100,
    coinReward: 20,
    units: [
      { title: "Subjek dan Predikat", description: "Inti kalimat: siapa dan apa yang dilakukan", emoji: "👤", topik: "sintaksis", xpReward: 50, coinReward: 10 },
      { title: "Objek dan Keterangan", description: "Pelengkap kalimat: objek dan info tambahan", emoji: "📍", topik: "sintaksis", xpReward: 50, coinReward: 10 },
      { title: "Kalimat Efektif", description: "Kalimat yang jelas, ringkas, dan tepat", emoji: "✅", topik: "sintaksis", xpReward: 50, coinReward: 10 },
      { title: "Kalimat Tidak Efektif", description: "Mengenali kalimat ambigu atau berlebihan", emoji: "❌", topik: "sintaksis", xpReward: 50, coinReward: 10 },
      { title: "Memperbaiki Kalimat", description: "Mengubah kalimat tidak efektif menjadi efektif", emoji: "🔨", topik: "sintaksis", xpReward: 50, coinReward: 10 },
      { title: "Latihan Cepat Level 6", description: "Review semua materi Level 6", emoji: "⚡", topik: "review", xpReward: 100, coinReward: 20 },
    ],
  },
  {
    level: 7,
    title: "Kata Penghubung",
    subtitle: "di, ke, dari, dan, tetapi, karena",
    description: "Menguasai kata depan dan konjungsi untuk menghubungkan kata, kalimat, dan gagasan secara logis.",
    color: "from-yellow-500 to-amber-600",
    emoji: "🔗",
    xpReward: 100,
    coinReward: 20,
    units: [
      { title: "Kata Depan di, ke, dari", description: "Penggunaan kata depan yang benar", emoji: "🗺️", topik: "konjungsi", xpReward: 50, coinReward: 10 },
      { title: "Konjungsi dan, tetapi, karena", description: "Menghubungkan kata dan kalimat", emoji: "🔀", topik: "konjungsi", xpReward: 50, coinReward: 10 },
      { title: "Urutan Waktu", description: "Kata penghubung waktu: sebelum, sesudah, ketika", emoji: "⏰", topik: "konjungsi", xpReward: 50, coinReward: 10 },
      { title: "Sebab Akibat", description: "Kata penghubung sebab-akibat: karena, sehingga, akibatnya", emoji: "➡️", topik: "konjungsi", xpReward: 50, coinReward: 10 },
      { title: "Menggabungkan Kalimat", description: "Latihan menggabungkan dua kalimat dengan konjungsi", emoji: "🧩", topik: "konjungsi", xpReward: 50, coinReward: 10 },
      { title: "Latihan Cepat Level 7", description: "Review semua materi Level 7", emoji: "⚡", topik: "review", xpReward: 100, coinReward: 20 },
    ],
  },
  {
    level: 8,
    title: "Paragraf",
    subtitle: "Gagasan utama dan kalimat pendukung",
    description: "Belajar menyusun paragraf: kalimat utama, gagasan utama, gagasan pendukung, dan urutan yang logis.",
    color: "from-lime-500 to-green-600",
    emoji: "📋",
    xpReward: 100,
    coinReward: 20,
    units: [
      { title: "Kalimat Utama", description: "Kalimat yang menjadi inti paragraf", emoji: "1️⃣", topik: "paragraf", xpReward: 50, coinReward: 10 },
      { title: "Gagasan Utama", description: "Ide pokok yang mendasari paragraf", emoji: "💭", topik: "paragraf", xpReward: 50, coinReward: 10 },
      { title: "Gagasan Pendukung", description: "Detail yang memperkuat gagasan utama", emoji: "🔩", topik: "paragraf", xpReward: 50, coinReward: 10 },
      { title: "Urutan Paragraf", description: "Menyusun kalimat menjadi paragraf yang runtut", emoji: "🔢", topik: "paragraf", xpReward: 50, coinReward: 10 },
      { title: "Menyusun Paragraf Pendek", description: "Latihan menulis paragraf 3-5 kalimat", emoji: "✍️", topik: "paragraf", xpReward: 50, coinReward: 10 },
      { title: "Latihan Cepat Level 8", description: "Review semua materi Level 8", emoji: "⚡", topik: "review", xpReward: 100, coinReward: 20 },
    ],
  },
  {
    level: 9,
    title: "Membaca Pemahaman",
    subtitle: "Cari informasi dalam teks",
    description: "Latihan membaca dan memahami teks: informasi tersurat, tersirat, tujuan teks, dan menyimpulkan isi bacaan.",
    color: "from-emerald-500 to-lime-600",
    emoji: "🔍",
    xpReward: 100,
    coinReward: 20,
    units: [
      { title: "Informasi Tersurat", description: "Menemukan informasi yang jelas dalam teks", emoji: "📖", topik: "membaca", xpReward: 50, coinReward: 10 },
      { title: "Informasi Tersirat", description: "Menangkap maksud yang tidak ditulis langsung", emoji: "🔎", topik: "membaca", xpReward: 50, coinReward: 10 },
      { title: "Menjawab Pertanyaan Teks", description: "Latihan menjawab berdasarkan teks bacaan", emoji: "❓", topik: "membaca", xpReward: 50, coinReward: 10 },
      { title: "Menemukan Tujuan Teks", description: "Mengapa teks ini ditulis?", emoji: "🎯", topik: "membaca", xpReward: 50, coinReward: 10 },
      { title: "Menyimpulkan Isi Teks", description: "Membuat kesimpulan dari teks bacaan", emoji: "📝", topik: "membaca", xpReward: 50, coinReward: 10 },
      { title: "Latihan Cepat Level 9", description: "Review semua materi Level 9", emoji: "⚡", topik: "review", xpReward: 100, coinReward: 20 },
    ],
  },
  {
    level: 10,
    title: "Bernalar dalam Bahasa",
    subtitle: "Fakta, opini, alasan, dan bukti",
    description: "Belajar berpikir kritis dalam bahasa: membedakan fakta dan opini, mencari alasan dan bukti, membandingkan informasi.",
    color: "from-teal-500 to-emerald-600",
    emoji: "🧠",
    xpReward: 100,
    coinReward: 20,
    units: [
      { title: "Fakta dan Opini", description: "Membedakan fakta (nyata) dan opini (pendapat)", emoji: "📊", topik: "nalar", xpReward: 50, coinReward: 10 },
      { title: "Alasan dan Bukti", description: "Mengidentifikasi alasan dan bukti dalam argumen", emoji: "🔗", topik: "nalar", xpReward: 50, coinReward: 10 },
      { title: "Sebab dan Akibat", description: "Hubungan sebab-akibat dalam pernyataan", emoji: "➡️", topik: "nalar", xpReward: 50, coinReward: 10 },
      { title: "Membandingkan Informasi", description: "Mencari persamaan dan perbedaan dari dua sumber", emoji: "⚖️", topik: "nalar", xpReward: 50, coinReward: 10 },
      { title: "Menilai Pernyataan", description: "Menilai apakah pernyataan didukung bukti", emoji: "✅", topik: "nalar", xpReward: 50, coinReward: 10 },
      { title: "Latihan Cepat Level 10", description: "Review semua materi Level 10", emoji: "⚡", topik: "review", xpReward: 100, coinReward: 20 },
    ],
  },
  {
    level: 11,
    title: "Menulis Ringkas",
    subtitle: "Ringkasan, judul, dan pesan jelas",
    description: "Latihan menulis ringkas dan padat: membuat ringkasan, memilih judul, menghapus kata berlebihan, dan menulis pesan efektif.",
    color: "from-cyan-500 to-teal-600",
    emoji: "✂️",
    xpReward: 100,
    coinReward: 20,
    units: [
      { title: "Menulis Kalimat Pendek", description: "Latihan menulis kalimat singkat dan jelas", emoji: "📏", topik: "menulis", xpReward: 50, coinReward: 10 },
      { title: "Membuat Ringkasan", description: "Meringkas teks panjang menjadi intinya", emoji: "📄", topik: "menulis", xpReward: 50, coinReward: 10 },
      { title: "Memilih Judul", description: "Memilih judul yang mewakili isi teks", emoji: "🏷️", topik: "menulis", xpReward: 50, coinReward: 10 },
      { title: "Menghapus Kata Berlebihan", description: "Mengedit kalimat dengan membuang kata tidak perlu", emoji: "🗑️", topik: "menulis", xpReward: 50, coinReward: 10 },
      { title: "Menulis Pesan yang Jelas", description: "Latihan menulis pesan singkat yang mudah dipahami", emoji: "💬", topik: "menulis", xpReward: 50, coinReward: 10 },
      { title: "Latihan Cepat Level 11", description: "Review semua materi Level 11", emoji: "⚡", topik: "review", xpReward: 100, coinReward: 20 },
    ],
  },
  {
    level: 12,
    title: "Mahir Berbahasa",
    subtitle: "Teks panjang, sunting, dan tantangan akhir",
    description: "Tahap akhir: membaca teks panjang, menyunting kalimat, menulis pendapat, menyusun argumen, dan menghadapi tantangan final.",
    color: "from-sky-500 to-cyan-600",
    emoji: "🏆",
    xpReward: 100,
    coinReward: 20,
    units: [
      { title: "Membaca Teks Panjang", description: "Memahami teks 3-5 paragraf", emoji: "📚", topik: "membaca", xpReward: 50, coinReward: 10 },
      { title: "Menyunting Kalimat", description: "Mengoreksi kesalahan ejaan, kata, dan struktur kalimat", emoji: "✏️", topik: "sunting", xpReward: 50, coinReward: 10 },
      { title: "Menulis Pendapat", description: "Menuangkan opini dalam paragraf pendek", emoji: "💭", topik: "menulis", xpReward: 50, coinReward: 10 },
      { title: "Menyusun Argumen Ringan", description: "Mendukung pendapat dengan alasan dan bukti", emoji: "⚔️", topik: "nalar", xpReward: 50, coinReward: 10 },
      { title: "Simulasi Tantangan Akhir", description: "Soal campuran dari semua level", emoji: "🎯", topik: "review", xpReward: 150, coinReward: 30 },
      { title: "Final Review Jalur Cerdas", description: "Ujian akhir seluruh materi dan sertifikat", emoji: "🎓", topik: "review", xpReward: 200, coinReward: 50 },
    ],
  },
]

async function main() {
  if (DRY_RUN) {
    console.log("🧪 DRY RUN — run with --execute to apply")
  }

  // 1. Check existing JALUR levels
  const existingLevels = await db.learningLevel.findMany({
    where: { type: "JALUR" },
    include: { _count: { select: { units: true } } },
  })
  const existingUnitIds = (
    await db.learningUnit.findMany({
      where: { levelId: { in: existingLevels.map((l) => l.id) } },
      select: { id: true },
    })
  ).map((u) => u.id)

  // 2. Check progress — abort if exists
  const progress = await db.userUnitProgress.count({
    where: { unitId: { in: existingUnitIds } },
  })
  if (progress > 0 && EXECUTE) {
    console.error(`❌ ABORT: ${progress} UserUnitProgress records exist for JALUR units.`)
    console.error("   Cannot safely replace JALUR data with existing user progress.")
    console.error("   Manual migration required.")
    await db.$disconnect()
    process.exit(1)
  }

  // 3. Summary
  console.log("\n=== CURRENT JALUR DATA ===")
  console.log(`Levels: ${existingLevels.length}`)
  console.log(`Units: ${existingUnitIds.length}`)
  console.log(`User progress: ${progress}`)
  console.log()

  if (existingLevels.length > 0) {
    console.log("Existing JALUR level titles (will be replaced):")
    for (const l of existingLevels) {
      console.log(`  ${l.level}. ${l.title} (${l._count.units} units)`)
    }
    console.log()
  }

  console.log("=== NEW CURRICULUM ===")
  console.log("Levels: 12, Units: 72")
  console.log("Content: General Bahasa Indonesia ability path (Duolingo-style)")
  console.log("Audience: All ages (SD and above), NOT grade-based")
  console.log()

  for (const l of CURRICULUM) {
    console.log(`Level ${l.level} — ${l.title}: ${l.units.length} units`)
    for (const u of l.units) {
      console.log(`  ${u.title}`)
    }
    console.log()
  }

  if (DRY_RUN) {
    console.log("🧪 DRY RUN — would delete old JALUR data and create new curriculum")
    console.log(`   Delete: ${existingUnitIds.length} units + ${existingLevels.length} levels`)
    console.log(`   Create: 72 units + 12 levels`)
    console.log()
    console.log("Run with --execute to apply.")
    await db.$disconnect()
    return
  }

  // 4. EXECUTE: delete old JALUR data
  console.log("🗑️  Deleting old JALUR units...")
  await db.learningUnit.deleteMany({
    where: { levelId: { in: existingLevels.map((l) => l.id) } },
  })

  console.log("🗑️  Deleting old JALUR levels...")
  await db.learningLevel.deleteMany({
    where: { type: "JALUR" },
  })

  // 5. Create new JALUR curriculum
  console.log("📦 Creating new JALUR levels and units...")
  for (const l of CURRICULUM) {
    const level = await db.learningLevel.create({
      data: {
        type: "JALUR",
        level: l.level,
        title: l.title,
        subtitle: l.subtitle,
        description: l.description,
        color: l.color,
        emoji: l.emoji,
        order: l.level,
        xpReward: l.xpReward,
        coinReward: l.coinReward,
      },
    })

    let unitOrder = 0
    for (const u of l.units) {
      unitOrder++
      await db.learningUnit.create({
        data: {
          levelId: level.id,
          title: u.title,
          subtitle: u.subtitle,
          description: u.description,
          topik: u.topik,
          order: unitOrder,
          emoji: u.emoji,
          xpReward: u.xpReward ?? 50,
          coinReward: u.coinReward ?? 10,
          isActive: true,
          grade: null,
          semester: null,
          kd: null,
        },
      })
    }

    console.log(`  ✅ Level ${l.level}: "${l.title}" — ${l.units.length} units`)
  }

  // 6. Verify
  const finalLevels = await db.learningLevel.count({ where: { type: "JALUR" } })
  const finalUnits = await db.learningUnit.count({
    where: { level: { type: "JALUR" } },
  })
  console.log()
  console.log("=== VERIFICATION ===")
  console.log(`JALUR levels: ${finalLevels} (expected 12)`)
  console.log(`JALUR units: ${finalUnits} (expected 72)`)

  if (finalLevels === 12 && finalUnits === 72) {
    console.log("✅ Jalur Cerdas Core Curriculum successfully seeded!")
  } else {
    console.log("⚠️  Count mismatch — check seed data")
  }

  const panduanLevels = await db.learningLevel.count({ where: { type: "PANDUAN" } })
  const panduanUnits = await db.learningUnit.count({
    where: { level: { type: "PANDUAN" } },
  })
  console.log(`PANDUAN levels: ${panduanLevels} (should be 12, unchanged)`)
  console.log(`PANDUAN units: ${panduanUnits} (should be 71, unchanged)`)

  await db.$disconnect()
}

main().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
