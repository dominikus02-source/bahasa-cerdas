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

// Buku Panduan - Kelas X Semester 1
import teksLhoX from "./materi/38-teks-lho-x"
import eksposisiX from "./materi/39-eksposisi-x"
import anekdotX from "./materi/40-anekdot-x"
import hikayatX from "./materi/41-hikayat-x"
import negosiasiX from "./materi/42-negosiasi-x"
import debatX from "./materi/43-debat-x"

// Buku Panduan - Kelas X Semester 2
import biografiXS2 from "./materi/44-biografi-x-s2"
import puisiKontemporerXS2 from "./materi/45-puisi-kontemporer-x-s2"
import cerpenXS2 from "./materi/46-cerpen-x-s2"
import fiksiNonfiksiXS2 from "./materi/47-fiksi-nonfiksi-x-s2"
import pantunSyairXS2 from "./materi/48-pantun-syair-x-s2"
import prosedurKompleksXS2 from "./materi/49-prosedur-kompleks-x-s2"

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
  // Buku Panduan - Kelas X Semester 1
  { title: "Bab 1: Teks LHO", konten: teksLhoX, grade: "X", semester: 1 },
  { title: "Bab 2: Eksposisi", konten: eksposisiX, grade: "X", semester: 1 },
  { title: "Bab 3: Anekdot", konten: anekdotX, grade: "X", semester: 1 },
  { title: "Bab 4: Hikayat", konten: hikayatX, grade: "X", semester: 1 },
  { title: "Bab 5: Negosiasi", konten: negosiasiX, grade: "X", semester: 1 },
  { title: "Bab 6: Debat", konten: debatX, grade: "X", semester: 1 },
  // Buku Panduan - Kelas X Semester 2
  { title: "Bab 1: Biografi", konten: biografiXS2, grade: "X", semester: 2 },
  { title: "Bab 2: Puisi Kontemporer", konten: puisiKontemporerXS2, grade: "X", semester: 2 },
  { title: "Bab 3: Cerpen", konten: cerpenXS2, grade: "X", semester: 2 },
  { title: "Bab 4: Fiksi/Nonfiksi", konten: fiksiNonfiksiXS2, grade: "X", semester: 2 },
  { title: "Bab 5: Pantun/Syair", konten: pantunSyairXS2, grade: "X", semester: 2 },
  { title: "Bab 6: Prosedur Kompleks", konten: prosedurKompleksXS2, grade: "X", semester: 2 },
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
