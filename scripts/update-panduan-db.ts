import { db } from "../lib/db"

async function main() {
  console.log("Updating Buku Panduan database...")

  // 1. Update title: Cerpen → Teks Cerita Rakyat (Kelas VII Semester 1, Bab 6)
  const oldUnit = await db.learningUnit.findFirst({
    where: { title: "Bab 6: Cerpen", grade: "VII", semester: 1, isActive: true },
    include: { level: true },
  })

  if (oldUnit) {
    console.log(`Found "Bab 6: Cerpen" (VII S1) — ID: ${oldUnit.id}`)
    // Update title
    const newContent = {
      belajar: {
        tujuan: ["Memahami cerita rakyat", "Membedakan legenda dan fabel", "Menulis cerita rakyat"],
        materi: [{
          judul: "Apa Itu Cerita Rakyat?",
          isi: [
            "Cerita rakyat: kisah turun-temurun dalam masyarakat.",
            "Legenda: cerita asal-usul tempat (Malin Kundang, Tangkuban Perahu).",
            "Fabel: cerita hewan berperilaku manusia (Kancil dan Buaya).",
            "Struktur: orientasi, komplikasi, resolusi, pesan moral.",
            "R:Cerita rakyat = kisah turun-temurun.",
            "R:Legenda = asal-usul tempat.",
            "R:Fabel = cerita hewan berkarakter manusia.",
          ],
          contoh: [],
        }],
        rangkuman: [
          "Cerita rakyat = kisah turun-temurun.",
          "Legenda = asal-usul tempat.",
          "Fabel = cerita hewan berkarakter manusia.",
        ],
      },
      latihan: [
        { id: 1, soal: "Legenda adalah cerita tentang...", opsi: ["Hewan", "Asal-usul tempat", "Masa depan"], jawaban: 1, penjelasan: "" },
        { id: 2, soal: "Fabel bercerita tentang...", opsi: ["Manusia", "Hewan", "Dewa"], jawaban: 1, penjelasan: "" },
        { id: 3, soal: "Contoh legenda...", opsi: ["Kancil dan Buaya", "Tangkuban Perahu", "Si Kancil"], jawaban: 1, penjelasan: "" },
      ],
      praktik: { petunjuk: "Tulis cerita fabel 3-5 kalimat tentang kancil yang cerdik.", tips: [] },
      kuis: [
        { id: 1, soal: "Cerita rakyat disebarkan secara...", opsi: ["Tertulis", "Lisan", "Digital"], jawaban: 1, penjelasan: "" },
        { id: 2, soal: "Pesan moral dalam cerita rakyat disebut...", opsi: ["Tema", "Amanat", "Alur"], jawaban: 1, penjelasan: "" },
        { id: 3, soal: "Legenda Sangkuriang berasal dari...", opsi: ["Jawa Barat", "Jawa Tengah", "Bali"], jawaban: 0, penjelasan: "" },
      ],
    }

    await db.learningUnit.update({
      where: { id: oldUnit.id },
      data: {
        title: "Bab 6: Teks Cerita Rakyat",
        content: JSON.stringify(newContent),
      },
    })
    console.log('  → Updated to "Bab 6: Teks Cerita Rakyat" ✅')
  } else {
    console.log('"Bab 6: Cerpen" (VII S1) — not found in DB, skipping.')
  }

  // 2. Remove "Bab 3: Iklan, Slogan, Poster" (Kelas VII Semester 2)
  const iklanUnit = await db.learningUnit.findFirst({
    where: { title: "Bab 3: Iklan, Slogan, Poster", grade: "VII", semester: 2, isActive: true },
  })

  if (iklanUnit) {
    // Renumber Bab 4 → 3, Bab 5 → 4, Bab 6 → 5
    const bab4 = await db.learningUnit.findFirst({
      where: { title: "Bab 4: Surat Pribadi dan Dinas", grade: "VII", semester: 2, isActive: true },
    })
    if (bab4) await db.learningUnit.update({ where: { id: bab4.id }, data: { title: "Bab 3: Surat Pribadi dan Dinas" } })

    const bab5 = await db.learningUnit.findFirst({
      where: { title: "Bab 5: Buku Fiksi dan Nonfiksi", grade: "VII", semester: 2, isActive: true },
    })
    if (bab5) await db.learningUnit.update({ where: { id: bab5.id }, data: { title: "Bab 4: Buku Fiksi dan Nonfiksi" } })

    const bab6 = await db.learningUnit.findFirst({
      where: { title: "Bab 6: Puisi Rakyat", grade: "VII", semester: 2, isActive: true },
    })
    if (bab6) await db.learningUnit.update({ where: { id: bab6.id }, data: { title: "Bab 5: Puisi Rakyat" } })

    // Deactivate the Iklan unit
    await db.learningUnit.update({
      where: { id: iklanUnit.id },
      data: { isActive: false },
    })
    console.log('  → "Bab 3: Iklan, Slogan, Poster" deactivated ✅')
    console.log('  → Bab 4→3, 5→4, 6→5 renumbered ✅')
  } else {
    console.log('"Bab 3: Iklan, Slogan, Poster" (VII S2) — not found, skipping.')
  }

  console.log("\nDone!")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
