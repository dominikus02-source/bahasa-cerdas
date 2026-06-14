// @ts-nocheck
import { db } from "../../lib/db"

// Buku Panduan - Kelas VII Semester 1
import teksDeskripsiKonten from "./materi/pdf-7-s1"
import ceritaRakyatKonten from "./materi/pdf-7-s1-unit2"
import teksProsedurKonten from "./materi/pdf-7-s2-unit5"
import puisiRakyatKonten from "./materi/pdf-7-s1-unit4"
import giatFiksi7Konten from "./materi/pdf-7-s1-unit5"

// Buku Panduan - Kelas VII Semester 2
import laporanObservasiKonten from "./materi/pdf-7-s1-unit3"
import teksSuratKonten from "./materi/pdf-7-s2-unit6"
import ceritaFantasiKonten from "./materi/pdf-7-s2-unit7"
import giatNonfiksi7Konten from "./materi/pdf-7-s2-unit9"

// Buku Panduan - Kelas VIII Semester 1
import teksBeritaKonten from "./materi/pdf-8-s1-unit1"
import teksDramaKonten from "./materi/pdf-8-s1-unit2"
import teksEksplanasiKonten from "./materi/pdf-8-s1-unit3"
import teksEksposisiKonten from "./materi/pdf-8-s2-unit5"
import giatFiksi8Konten from "./materi/pdf-8-s1-unit5"

// Buku Panduan - Kelas VIII Semester 2
import puisiBaruKonten from "./materi/pdf-8-s1-unit4"
import teksUlasanKonten from "./materi/pdf-8-s2-unit6"
import teksPersuasifKonten from "./materi/pdf-8-s2-unit7"
import giatNonfiksi8Konten from "./materi/pdf-8-s2-unit9"

// Buku Panduan - Kelas IX Semester 1
import teksTanggapanIx from "./materi/pdf-9-s1-unit1"
import cerpenIx from "./materi/pdf-9-s1-unit2"
import pidatoPersuasif from "./materi/pdf-9-s1-unit3"
import giatFiksi9Konten from "./materi/pdf-9-s1-unit4"
import laporanPercobaan from "./materi/pdf-9-s2-unit4"

// Buku Panduan - Kelas IX Semester 2
import ceritaInspiratif from "./materi/pdf-9-s2-unit5"
import teksDiskusi from "./materi/pdf-9-s2-unit6"
import giatNonfiksi9Konten from "./materi/pdf-9-s2-unit8"

// Buku Panduan - Kelas I Semester 1 (SD)
import sd1S1Bab1 from "./materi/sd1-s1-bab1"
import sd1S1Bab2 from "./materi/sd1-s1-bab2"
import sd1S1Bab3 from "./materi/sd1-s1-bab3"
import sd1S1Bab4 from "./materi/sd1-s1-bab4"

// Buku Panduan - Kelas I Semester 2 (SD)
import sd1S2Bab1 from "./materi/sd1-s2-bab1"
import sd1S2Bab2 from "./materi/sd1-s2-bab2"
import sd1S2Bab3 from "./materi/sd1-s2-bab3"
import sd1S2Bab4 from "./materi/sd1-s2-bab4"

// Buku Panduan - Kelas II Semester 1 (SD)
import sd2S1Bab1 from "./materi/sd2-s1-bab1"
import sd2S1Bab2 from "./materi/sd2-s1-bab2"
import sd2S1Bab3 from "./materi/sd2-s1-bab3"
import sd2S1Bab4 from "./materi/sd2-s1-bab4"

// Buku Panduan - Kelas II Semester 2 (SD)
import sd2S2Bab1 from "./materi/sd2-s2-bab1"
import sd2S2Bab2 from "./materi/sd2-s2-bab2"
import sd2S2Bab3 from "./materi/sd2-s2-bab3"
import sd2S2Bab4 from "./materi/sd2-s2-bab4"

// Buku Panduan - Kelas III Semester 1 (SD)
import sd3S1Bab1 from "./materi/sd3-s1-bab1"
import sd3S1Bab2 from "./materi/sd3-s1-bab2"
import sd3S1Bab3 from "./materi/sd3-s1-bab3"
import sd3S1Bab4 from "./materi/sd3-s1-bab4"
import sd3S1Bab5 from "./materi/sd3-s1-bab5"

// Buku Panduan - Kelas III Semester 2 (SD)
import sd3S2Bab1 from "./materi/sd3-s2-bab1"
import sd3S2Bab2 from "./materi/sd3-s2-bab2"
import sd3S2Bab3 from "./materi/sd3-s2-bab3"
import sd3S2Bab4 from "./materi/sd3-s2-bab4"
import sd3S2Bab5 from "./materi/sd3-s2-bab5"

// Buku Panduan - Kelas IV Semester 1 (SD)
import sd4S1Bab1 from "./materi/sd4-s1-bab1"
import sd4S1Bab2 from "./materi/sd4-s1-bab2"
import sd4S1Bab3 from "./materi/sd4-s1-bab3"
import sd4S1Bab4 from "./materi/sd4-s1-bab4"
import sd4S1Bab5 from "./materi/sd4-s1-bab5"

// Buku Panduan - Kelas IV Semester 2 (SD)
import sd4S2Bab1 from "./materi/sd4-s2-bab1"
import sd4S2Bab2 from "./materi/sd4-s2-bab2"
import sd4S2Bab3 from "./materi/sd4-s2-bab3"
import sd4S2Bab4 from "./materi/sd4-s2-bab4"
import sd4S2Bab5 from "./materi/sd4-s2-bab5"

const units: { title: string; konten: any; grade?: string; semester?: number }[] = [
  // Kelas VII Semester 1
  { title: "Bab 1: Teks Deskripsi", konten: teksDeskripsiKonten, grade: "VII", semester: 1 },
  { title: "Bab 2: Teks Cerita Rakyat (Fabel dan Legenda)", konten: ceritaRakyatKonten, grade: "VII", semester: 1 },
  { title: "Bab 3: Teks Prosedur", konten: teksProsedurKonten, grade: "VII", semester: 1 },
  { title: "Bab 4: Teks Puisi Rakyat", konten: puisiRakyatKonten, grade: "VII", semester: 1 },
  { title: "Bab 5: Giat Literasi I: Teks Fiksi", konten: giatFiksi7Konten, grade: "VII", semester: 1 },
  // Kelas VII Semester 2
  { title: "Bab 6: Teks Laporan Hasil Observasi", konten: laporanObservasiKonten, grade: "VII", semester: 2 },
  { title: "Bab 7: Teks Surat (Resmi dan Pribadi)", konten: teksSuratKonten, grade: "VII", semester: 2 },
  { title: "Bab 8: Teks Cerita Fantasi", konten: ceritaFantasiKonten, grade: "VII", semester: 2 },
  { title: "Bab 9: Giat Literasi II: Teks Nonfiksi (Pengaya)", konten: giatNonfiksi7Konten, grade: "VII", semester: 2 },
  // Kelas VIII Semester 1
  { title: "Bab 1: Teks Berita", konten: teksBeritaKonten, grade: "VIII", semester: 1 },
  { title: "Bab 2: Teks Drama", konten: teksDramaKonten, grade: "VIII", semester: 1 },
  { title: "Bab 3: Teks Eksplanasi", konten: teksEksplanasiKonten, grade: "VIII", semester: 1 },
  { title: "Bab 4: Teks Eksposisi (Artikel Ilmiah Populer)", konten: teksEksposisiKonten, grade: "VIII", semester: 1 },
  { title: "Bab 5: Giat Literasi I: Teks Fiksi", konten: giatFiksi8Konten, grade: "VIII", semester: 1 },
  // Kelas VIII Semester 2
  { title: "Bab 6: Teks Puisi (Baru)", konten: puisiBaruKonten, grade: "VIII", semester: 2 },
  { title: "Bab 7: Teks Ulasan — Resensi", konten: teksUlasanKonten, grade: "VIII", semester: 2 },
  { title: "Bab 8: Teks Persuasif (Iklan / Poster)", konten: teksPersuasifKonten, grade: "VIII", semester: 2 },
  { title: "Bab 9: Giat Literasi II: Teks Nonfiksi (Pengaya)", konten: giatNonfiksi8Konten, grade: "VIII", semester: 2 },
  // Kelas IX Semester 1
  { title: "Bab 1: Teks Tanggapan Kritis", konten: teksTanggapanIx, grade: "IX", semester: 1 },
  { title: "Bab 2: Teks Cerpen", konten: cerpenIx, grade: "IX", semester: 1 },
  { title: "Bab 3: Teks Pidato Persuasif", konten: pidatoPersuasif, grade: "IX", semester: 1 },
  { title: "Bab 4: Giat Literasi I: Teks Fiksi", konten: giatFiksi9Konten, grade: "IX", semester: 1 },
  { title: "Bab 5: Teks Laporan Percobaan", konten: laporanPercobaan, grade: "IX", semester: 1 },
  // Kelas IX Semester 2
  { title: "Bab 6: Teks Cerita Inspiratif", konten: ceritaInspiratif, grade: "IX", semester: 2 },
  { title: "Bab 7: Teks Diskusi", konten: teksDiskusi, grade: "IX", semester: 2 },
  { title: "Bab 8: Giat Literasi II: Teks Nonfiksi (Pengaya)", konten: giatNonfiksi9Konten, grade: "IX", semester: 2 },
  // Kelas I Semester 1 (SD)
  { title: "Bab 1: Bunyi dan Huruf", konten: sd1S1Bab1, grade: "I", semester: 1 },
  { title: "Bab 2: Membaca Permulaan", konten: sd1S1Bab2, grade: "I", semester: 1 },
  { title: "Bab 3: Menulis Permulaan", konten: sd1S1Bab3, grade: "I", semester: 1 },
  { title: "Bab 4: Kosa Kata", konten: sd1S1Bab4, grade: "I", semester: 1 },
  // Kelas I Semester 2 (SD)
  { title: "Bab 1: Kalimat Sederhana", konten: sd1S2Bab1, grade: "I", semester: 2 },
  { title: "Bab 2: Membaca Cerita", konten: sd1S2Bab2, grade: "I", semester: 2 },
  { title: "Bab 3: Menulis Cerita", konten: sd1S2Bab3, grade: "I", semester: 2 },
  { title: "Bab 4: Puisi Anak", konten: sd1S2Bab4, grade: "I", semester: 2 },
  // Kelas II Semester 1 (SD)
  { title: "Bab 1: Membaca Pemahaman", konten: sd2S1Bab1, grade: "II", semester: 1 },
  { title: "Bab 2: Menulis Kalimat", konten: sd2S1Bab2, grade: "II", semester: 1 },
  { title: "Bab 3: Dongeng", konten: sd2S1Bab3, grade: "II", semester: 1 },
  { title: "Bab 4: Pengumuman", konten: sd2S1Bab4, grade: "II", semester: 1 },
  // Kelas II Semester 2 (SD)
  { title: "Bab 1: Puisi Anak", konten: sd2S2Bab1, grade: "II", semester: 2 },
  { title: "Bab 2: Pantun Anak", konten: sd2S2Bab2, grade: "II", semester: 2 },
  { title: "Bab 3: Cerita Rakyat", konten: sd2S2Bab3, grade: "II", semester: 2 },
  { title: "Bab 4: Laporan Sederhana", konten: sd2S2Bab4, grade: "II", semester: 2 },
  // Kelas III Semester 1 (SD)
  { title: "Bab 1: Teks Deskripsi", konten: sd3S1Bab1, grade: "III", semester: 1 },
  { title: "Bab 2: Teks Petunjuk", konten: sd3S1Bab2, grade: "III", semester: 1 },
  { title: "Bab 3: Dongeng", konten: sd3S1Bab3, grade: "III", semester: 1 },
  { title: "Bab 4: Laporan", konten: sd3S1Bab4, grade: "III", semester: 1 },
  { title: "Bab 5: Puisi", konten: sd3S1Bab5, grade: "III", semester: 1 },
  // Kelas III Semester 2 (SD)
  { title: "Bab 1: Surat Pribadi", konten: sd3S2Bab1, grade: "III", semester: 2 },
  { title: "Bab 2: Wawancara", konten: sd3S2Bab2, grade: "III", semester: 2 },
  { title: "Bab 3: Cerita Fantasi", konten: sd3S2Bab3, grade: "III", semester: 2 },
  { title: "Bab 4: Iklan", konten: sd3S2Bab4, grade: "III", semester: 2 },
  { title: "Bab 5: Pantun", konten: sd3S2Bab5, grade: "III", semester: 2 },
  // Kelas IV Semester 1 (SD)
  { title: "Bab 1: Teks Narasi", konten: sd4S1Bab1, grade: "IV", semester: 1 },
  { title: "Bab 2: Teks Prosedur", konten: sd4S1Bab2, grade: "IV", semester: 1 },
  { title: "Bab 3: Laporan Pengamatan", konten: sd4S1Bab3, grade: "IV", semester: 1 },
  { title: "Bab 4: Puisi", konten: sd4S1Bab4, grade: "IV", semester: 1 },
  { title: "Bab 5: Pantun", konten: sd4S1Bab5, grade: "IV", semester: 1 },
  // Kelas IV Semester 2 (SD)
  { title: "Bab 1: Gagasan Pokok", konten: sd4S2Bab1, grade: "IV", semester: 2 },
  { title: "Bab 2: Teks Eksplanasi", konten: sd4S2Bab2, grade: "IV", semester: 2 },
  { title: "Bab 3: Cerita Fiksi", konten: sd4S2Bab3, grade: "IV", semester: 2 },
  { title: "Bab 4: Surat Resmi", konten: sd4S2Bab4, grade: "IV", semester: 2 },
  { title: "Bab 5: Pengumuman", konten: sd4S2Bab5, grade: "IV", semester: 2 },
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
