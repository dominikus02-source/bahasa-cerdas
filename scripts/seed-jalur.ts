import { db } from "../lib/db"

async function seed() {
  const levels = [
    {
      level: 1,
      title: "Fondasi",
      subtitle: "Dasar-dasar Bahasa Indonesia",
      description: "Mulai dari sini! Pelajari ejaan, kosakata, dan kalimat efektif.",
      color: "from-emerald-500 to-teal-600",
      emoji: "🌱",
      order: 1,
      xpReward: 200,
      coinReward: 50,
      units: [
        { title: "Ejaan & EYD", subtitle: "Pedoman ejaan yang benar", emoji: "✏️", order: 1, xpReward: 50, coinReward: 10, topik: "EYD" },
        { title: "Kosakata Dasar", subtitle: "Kata baku dan tidak baku", emoji: "📖", order: 2, xpReward: 50, coinReward: 10, topik: "KOSAKATA" },
        { title: "Kalimat Efektif", subtitle: "Kalimat yang jelas dan benar", emoji: "💬", order: 3, xpReward: 50, coinReward: 10, topik: "KALIMAT" },
      ],
    },
    {
      level: 2,
      title: "Teks",
      subtitle: "Mengenal jenis-jenis teks",
      description: "Pelajari struktur dan ciri teks narasi, deskripsi, prosedur, dan eksposisi.",
      color: "from-blue-500 to-indigo-600",
      emoji: "📝",
      order: 2,
      xpReward: 300,
      coinReward: 75,
      units: [
        { title: "Teks Narasi", subtitle: "Cerita berdasarkan urutan waktu", emoji: "📚", order: 1, xpReward: 75, coinReward: 15, topik: "NARASI" },
        { title: "Teks Deskripsi", subtitle: "Cerita berdasarkan hasil pengamatan", emoji: "🖼️", order: 2, xpReward: 75, coinReward: 15, topik: "DESKRIPSI" },
        { title: "Teks Prosedur", subtitle: "Teks yang berisi petunjuk", emoji: "📋", order: 3, xpReward: 75, coinReward: 15, topik: "PROSEDUR" },
        { title: "Teks Eksposisi", subtitle: "Teks yang berisi informasi", emoji: "📊", order: 4, xpReward: 75, coinReward: 15, topik: "EKSPOSISI" },
      ],
    },
    {
      level: 3,
      title: "Sastra",
      subtitle: "Dunia sastra Indonesia",
      description: "Puisi, cerpen, pantun, dan gurindam — kenali dan ciptakan!",
      color: "from-purple-500 to-pink-600",
      emoji: "🎭",
      order: 3,
      xpReward: 400,
      coinReward: 100,
      units: [
        { title: "Puisi & Majas", subtitle: "Irama, rima, dan gaya bahasa", emoji: "🌟", order: 1, xpReward: 100, coinReward: 20, topik: "PUISI" },
        { title: "Cerpen & Unsur Intrinsik", subtitle: "Membangun cerita pendek", emoji: "📖", order: 2, xpReward: 100, coinReward: 20, topik: "CERPEN" },
        { title: "Pantun & Gurindam", subtitle: "Puisi lama yang penuh nasihat", emoji: "🎶", order: 3, xpReward: 100, coinReward: 20, topik: "PANTUN" },
      ],
    },
    {
      level: 4,
      title: "Mahir",
      subtitle: "Level teratas! Siap UKBI!",
      description: "Argumentasi, debat, pidato, dan simulasi UKBI.",
      color: "from-amber-500 to-orange-600",
      emoji: "🏆",
      order: 4,
      xpReward: 500,
      coinReward: 150,
      units: [
        { title: "Teks Argumentasi", subtitle: "Meyakinkan dengan argumen", emoji: "💪", order: 1, xpReward: 125, coinReward: 25, topik: "ARGUMENTASI" },
        { title: "Debat & Pidato", subtitle: "Bicara di depan umum", emoji: "🎤", order: 2, xpReward: 125, coinReward: 25, topik: "DEBAT" },
        { title: "Simulasi UKBI", subtitle: "Uji Kemahiran Berbahasa Indonesia", emoji: "🎯", order: 3, xpReward: 250, coinReward: 100, topik: "UKBI" },
      ],
    },
  ]

  for (const lvl of levels) {
    const { units, ...levelData } = lvl
    const created = await db.learningLevel.create({ data: levelData })
    console.log(`✅ Level: ${created.title}`)

    for (const u of units) {
      await db.learningUnit.create({
        data: { ...u, levelId: created.id },
      })
      console.log(`  ✅ Unit: ${u.title}`)
    }
  }

  console.log("\n🎉 Seeding selesai!")
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
