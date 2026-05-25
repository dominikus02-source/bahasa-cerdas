// @ts-nocheck
import { db } from "../../lib/db"

// Jalur Cerdas
import ejaanHurufKapital from "./materi/01-ejaan-huruf-kapital"

// Buku Panduan - Kelas VII Semester 1
import teksDeskripsi from "./materi/02-teks-deskripsi"
import ceritaFantasi from "./materi/03-cerita-fantasi"
import teksProsedurVii from "./materi/04-teks-prosedur"
import teksLHO from "./materi/05-teks-lho"
import puisiRakyat from "./materi/06-puisi-rakyat"
import cerpenVii from "./materi/07-cerpen"

// Buku Panduan - Kelas VII Semester 2
import suratPribadiDinas from "./materi/08-surat-pribadi-dinas"
import teksBeritaVii from "./materi/09-teks-berita"
import iklanSloganPosterVii from "./materi/10-iklan-slogan-poster"
import teksEksposisiVii from "./materi/11-teks-eksposisi"
import fiksiNonfiksiVii from "./materi/12-fiksi-nonfiksi"
import pantunSyair from "./materi/13-pantun-syair"

// Buku Panduan - Kelas VIII Semester 1
import teksBeritaViii from "./materi/14-teks-berita"
import iklanSloganPosterViii from "./materi/15-iklan-slogan-poster"
import teksEksposisiViii from "./materi/16-teks-eksposisi"
import puisi from "./materi/17-puisi"
import teksProsedurViii from "./materi/18-teks-prosedur"
import dramaSmt1 from "./materi/19-drama"

// Buku Panduan - Kelas VIII Semester 2
import teksUlasan from "./materi/20-teks-ulasan"
import teksPersuasi from "./materi/21-teks-persuasi"
import dramaSmt2 from "./materi/22-drama"
import fiksiNonfiksiViii from "./materi/23-fiksi-nonfiksi"
import suratResmi from "./materi/24-surat-resmi"
import teksTanggapan from "./materi/25-teks-tanggapan"

const units: { title: string; konten: any }[] = [
  // Jalur Cerdas
  { title: "Ejaan & Huruf Kapital", konten: ejaanHurufKapital },
  // Buku Panduan - Kelas VII Semester 1
  { title: "Bab 1: Teks Deskripsi", konten: teksDeskripsi },
  { title: "Bab 2: Cerita Fantasi", konten: ceritaFantasi },
  { title: "Bab 3: Teks Prosedur", konten: teksProsedurVii },
  { title: "Bab 4: Teks LHO", konten: teksLHO },
  { title: "Bab 5: Puisi Rakyat", konten: puisiRakyat },
  { title: "Bab 6: Cerpen", konten: cerpenVii },
  // Buku Panduan - Kelas VII Semester 2
  { title: "Bab 1: Surat Pribadi dan Dinas", konten: suratPribadiDinas },
  { title: "Bab 2: Teks Berita", konten: teksBeritaVii },
  { title: "Bab 3: Iklan, Slogan, Poster", konten: iklanSloganPosterVii },
  { title: "Bab 4: Teks Eksposisi", konten: teksEksposisiVii },
  { title: "Bab 5: Buku Fiksi dan Nonfiksi", konten: fiksiNonfiksiVii },
  { title: "Bab 6: Pantun dan Syair", konten: pantunSyair },
  // Buku Panduan - Kelas VIII Semester 1
  { title: "Bab 1: Teks Berita", konten: teksBeritaViii },
  { title: "Bab 2: Iklan, Slogan, Poster", konten: iklanSloganPosterViii },
  { title: "Bab 3: Teks Eksposisi", konten: teksEksposisiViii },
  { title: "Bab 4: Puisi", konten: puisi },
  { title: "Bab 5: Teks Prosedur", konten: teksProsedurViii },
  { title: "Bab 6: Drama", konten: dramaSmt1 },
  // Buku Panduan - Kelas VIII Semester 2
  { title: "Bab 1: Teks Ulasan", konten: teksUlasan },
  { title: "Bab 2: Teks Persuasi", konten: teksPersuasi },
  { title: "Bab 3: Drama", konten: dramaSmt2 },
  { title: "Bab 4: Fiksi/Nonfiksi", konten: fiksiNonfiksiViii },
  { title: "Bab 5: Surat Resmi", konten: suratResmi },
  { title: "Bab 6: Teks Tanggapan", konten: teksTanggapan },
]

async function seedMateri() {
  console.log("Mulai seeding materi...")

  for (const { title, konten } of units) {
    const unit = await db.learningUnit.findFirst({
      where: { title, isActive: true },
      include: { level: true },
    })

    if (!unit) {
      console.log(`  Unit "${title}" tidak ditemukan di DB. Lewati.`)
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
