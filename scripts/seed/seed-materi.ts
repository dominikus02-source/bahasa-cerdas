// @ts-nocheck
import { db } from "../../lib/db"

// Buku Panduan - Kelas VII Semester 1 (PDF-aligned)
import teksDeskripsiKonten from "./materi/pdf-7-s1"
import ceritaRakyatKonten from "./materi/pdf-7-s1-unit2"
import laporanObservasiKonten from "./materi/pdf-7-s1-unit3"
import puisiRakyatKonten from "./materi/pdf-7-s1-unit4"
import teksProsedurKonten from "./materi/pdf-7-s2-unit5"
import teksSuratKonten from "./materi/pdf-7-s2-unit6"
import ceritaFantasiKonten from "./materi/pdf-7-s2-unit7"
import giatLiterasiKonten from "./materi/pdf-7-s2-unit8"

// Buku Panduan - Kelas IX Semester 1
import laporanPercobaan from "./materi/26-laporan-percobaan"
import pidatoPersuasif from "./materi/27-pidato-persuasif"
import cerpenIx from "./materi/28-cerpen"
import teksTanggapanIx from "./materi/29-teks-tanggapan"
import teksDiskusi from "./materi/30-teks-diskusi"
import puisiIx from "./materi/31-puisi"

// Buku Panduan - Kelas IX Semester 2
import teksEksplanasi from "./materi/32-teks-eksplanasi"

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

// Buku Panduan - Kelas XI Semester 1
import prosedurXiS1 from "./materi/50-prosedur-xi-s1"
import eksplanasiXiS1 from "./materi/51-eksplanasi-xi-s1"
import ceramahXiS1 from "./materi/52-ceramah-xi-s1"
import cerpenXiS1 from "./materi/53-cerpen-xi-s1"
import puisiAngkatanXiS1 from "./materi/54-puisi-angkatan-xi-s1"
import dramaXiS1 from "./materi/55-drama-xi-s1"

// Buku Panduan - Kelas XI Semester 2
import artikelXiS2 from "./materi/56-artikel-xi-s2"
import resensiXiS2 from "./materi/57-resensi-xi-s2"
import proposalXiS2 from "./materi/58-proposal-xi-s2"
import ktiXiS2 from "./materi/59-kti-xi-s2"
import novelXiS2 from "./materi/60-novel-xi-s2"
import debatXiS2 from "./materi/61-debat-xi-s2"

// Buku Panduan - Kelas XII Semester 1
import suratLamaranXiiS1 from "./materi/62-surat-lamaran-xii-s1"
import ceritaSejarahXiiS1 from "./materi/63-cerita-sejarah-xii-s1"
import teksEditorialXiiS1 from "./materi/64-teks-editorial-xii-s1"
import novelXiiS1 from "./materi/65-novel-xii-s1"
import artikelXiiS1 from "./materi/66-artikel-xii-s1"
import puisiXiiS1 from "./materi/67-puisi-xii-s1"

// Buku Panduan - Kelas XII Semester 2
import kritikSastraXiiS2 from "./materi/68-kritik-sastra-xii-s2"
import esaiXiiS2 from "./materi/69-esai-xii-s2"
import ktiXiiS2 from "./materi/70-kti-xii-s2"
import resensiXiiS2 from "./materi/71-resensi-xii-s2"
import dramaXiiS2 from "./materi/72-drama-xii-s2"
import prosedurXiiS2 from "./materi/73-prosedur-xii-s2"

const units: { title: string; konten: any; grade?: string; semester?: number }[] = [
  // Buku Panduan - Kelas VII Semester 1 (PDF-aligned)
  { title: "Bab 1: Teks Deskripsi", konten: teksDeskripsiKonten, grade: "VII", semester: 1 },
  { title: "Bab 2: Teks Cerita Rakyat (Fabel dan Legenda)", konten: ceritaRakyatKonten, grade: "VII", semester: 1 },
  { title: "Bab 3: Teks Laporan Hasil Observasi", konten: laporanObservasiKonten, grade: "VII", semester: 1 },
  { title: "Bab 4: Teks Puisi Rakyat", konten: puisiRakyatKonten, grade: "VII", semester: 1 },
  // Buku Panduan - Kelas VII Semester 2
  { title: "Bab 5: Teks Prosedur", konten: teksProsedurKonten, grade: "VII", semester: 2 },
  { title: "Bab 6: Teks Surat", konten: teksSuratKonten, grade: "VII", semester: 2 },
  { title: "Bab 7: Teks Cerita Fantasi", konten: ceritaFantasiKonten, grade: "VII", semester: 2 },
  { title: "Bab 8: Giat Literasi — Teks Fiksi dan Nonfiksi", konten: giatLiterasiKonten, grade: "VII", semester: 2 },
  // Buku Panduan - Kelas IX Semester 1
  { title: "Bab 1: Teks Tanggapan Kritis", konten: teksTanggapanIx, grade: "IX", semester: 1 },
  { title: "Bab 2: Teks Cerpen", konten: cerpenIx, grade: "IX", semester: 1 },
  { title: "Bab 3: Teks Pidato Persuasif", konten: pidatoPersuasif, grade: "IX", semester: 1 },
  // Buku Panduan - Kelas IX Semester 2
  { title: "Bab 4: Teks Laporan (Penelitian) Percobaan", konten: laporanPercobaan, grade: "IX", semester: 2 },
  { title: "Bab 5: Teks Cerita Inspiratif", konten: teksEksplanasi, grade: "IX", semester: 2 },
  { title: "Bab 6: Teks Diskusi", konten: teksDiskusi, grade: "IX", semester: 2 },
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
  // Buku Panduan - Kelas XII Semester 1
  { title: "Bab 1: Surat Lamaran", konten: suratLamaranXiiS1, grade: "XII", semester: 1 },
  { title: "Bab 2: Cerita Sejarah", konten: ceritaSejarahXiiS1, grade: "XII", semester: 1 },
  { title: "Bab 3: Teks Editorial", konten: teksEditorialXiiS1, grade: "XII", semester: 1 },
  { title: "Bab 4: Novel", konten: novelXiiS1, grade: "XII", semester: 1 },
  { title: "Bab 5: Artikel", konten: artikelXiiS1, grade: "XII", semester: 1 },
  { title: "Bab 6: Puisi", konten: puisiXiiS1, grade: "XII", semester: 1 },
  // Buku Panduan - Kelas XI Semester 1
  { title: "Bab 1: Prosedur", konten: prosedurXiS1, grade: "XI", semester: 1 },
  { title: "Bab 2: Eksplanasi", konten: eksplanasiXiS1, grade: "XI", semester: 1 },
  { title: "Bab 3: Ceramah", konten: ceramahXiS1, grade: "XI", semester: 1 },
  { title: "Bab 4: Cerpen", konten: cerpenXiS1, grade: "XI", semester: 1 },
  { title: "Bab 5: Puisi Angkatan", konten: puisiAngkatanXiS1, grade: "XI", semester: 1 },
  { title: "Bab 6: Drama", konten: dramaXiS1, grade: "XI", semester: 1 },
  // Buku Panduan - Kelas XI Semester 2
  { title: "Bab 1: Artikel", konten: artikelXiS2, grade: "XI", semester: 2 },
  { title: "Bab 2: Resensi", konten: resensiXiS2, grade: "XI", semester: 2 },
  { title: "Bab 3: Proposal", konten: proposalXiS2, grade: "XI", semester: 2 },
  { title: "Bab 4: KTI", konten: ktiXiS2, grade: "XI", semester: 2 },
  { title: "Bab 5: Novel", konten: novelXiS2, grade: "XI", semester: 2 },
  { title: "Bab 6: Debat", konten: debatXiS2, grade: "XI", semester: 2 },
  // Buku Panduan - Kelas XII Semester 2
  { title: "Bab 1: Kritik Sastra", konten: kritikSastraXiiS2, grade: "XII", semester: 2 },
  { title: "Bab 2: Esai", konten: esaiXiiS2, grade: "XII", semester: 2 },
  { title: "Bab 3: KTI", konten: ktiXiiS2, grade: "XII", semester: 2 },
  { title: "Bab 4: Resensi", konten: resensiXiiS2, grade: "XII", semester: 2 },
  { title: "Bab 5: Drama", konten: dramaXiiS2, grade: "XII", semester: 2 },
  { title: "Bab 6: Prosedur", konten: prosedurXiiS2, grade: "XII", semester: 2 },
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
