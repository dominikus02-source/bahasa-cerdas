// @ts-nocheck
import { db } from "../../lib/db"

// Buku Panduan - Kelas IX Semester 1
import laporanPercobaan from "./materi/26-laporan-percobaan"
import pidatoPersuasif from "./materi/27-pidato-persuasif"
import cerpenIx from "./materi/28-cerpen"
import teksTanggapanIx from "./materi/29-teks-tanggapan"
import teksDiskusi from "./materi/30-teks-diskusi"
import puisiIx from "./materi/31-puisi"

// Buku Panduan - Kelas IX Semester 2
import teksEksplanasi from "./materi/32-teks-eksplanasi"
import laporanIx from "./materi/33-laporan"
import dramaIx from "./materi/34-drama"
import resensi from "./materi/35-resensi"
import artikel from "./materi/36-artikel"
import kti from "./materi/37-kti"

const units: { title: string; konten: any; grade?: string; semester?: number }[] = [
  // Buku Panduan - Kelas IX Semester 1
  { title: "Bab 1: Laporan Percobaan", konten: laporanPercobaan, grade: "IX", semester: 1 },
  { title: "Bab 2: Pidato Persuasif", konten: pidatoPersuasif, grade: "IX", semester: 1 },
  { title: "Bab 3: Cerpen", konten: cerpenIx, grade: "IX", semester: 1 },
  { title: "Bab 4: Teks Tanggapan", konten: teksTanggapanIx, grade: "IX", semester: 1 },
  { title: "Bab 5: Teks Diskusi", konten: teksDiskusi, grade: "IX", semester: 1 },
  { title: "Bab 6: Puisi", konten: puisiIx, grade: "IX", semester: 1 },
  // Buku Panduan - Kelas IX Semester 2
  { title: "Bab 1: Teks Eksplanasi", konten: teksEksplanasi, grade: "IX", semester: 2 },
  { title: "Bab 2: Laporan", konten: laporanIx, grade: "IX", semester: 2 },
  { title: "Bab 3: Drama", konten: dramaIx, grade: "IX", semester: 2 },
  { title: "Bab 4: Resensi", konten: resensi, grade: "IX", semester: 2 },
  { title: "Bab 5: Artikel", konten: artikel, grade: "IX", semester: 2 },
  { title: "Bab 6: Karya Tulis Ilmiah", konten: kti, grade: "IX", semester: 2 },
]

async function seedMateri() {
  console.log("Mulai seeding materi...")

  for (const { title, konten, grade, semester } of units) {
    const where: any = { title, isActive: true }
    if (grade) where.grade = grade
    if (semester) where.semester = semester

    const unit = await db.learningUnit.findFirst({
      where,
      include: { level: true },
    })

    if (!unit) {
      const info = grade ? ` (${grade} Sem ${semester})` : ""
      console.log(`  "${title}"${info} tidak ditemukan di DB. Lewati.`)
      continue
    }

    await db.learningUnit.update({
      where: { id: unit.id },
      data: { content: JSON.stringify(konten) },
    })

    console.log(`  "${title}" — konten diperbarui! Level: ${unit.level.title}`)
  }

  console.log("\nSelesai! Materi diperbarui untuk semua unit yang cocok.")
}

seedMateri().catch(e => { console.error(e); process.exit(1) })
