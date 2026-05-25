// @ts-nocheck
import { db } from "../../lib/db"
import ejaanHurufKapital from "./materi/01-ejaan-huruf-kapital"
import teksDeskripsi from "./materi/02-teks-deskripsi"
import ceritaFantasi from "./materi/03-cerita-fantasi"
import teksProsedur from "./materi/04-teks-prosedur"
import teksLHO from "./materi/05-teks-lho"
import puisiRakyat from "./materi/06-puisi-rakyat"
import cerpen from "./materi/07-cerpen"
import suratPribadiDinas from "./materi/08-surat-pribadi-dinas"
import teksBerita from "./materi/09-teks-berita"
import iklanSloganPoster from "./materi/10-iklan-slogan-poster"
import teksEksposisi from "./materi/11-teks-eksposisi"
import fiksiNonfiksi from "./materi/12-fiksi-nonfiksi"
import pantunSyair from "./materi/13-pantun-syair"

type UnitModule = { default: import("../types").Konten }

const units: { title: string; konten: import("../types").Konten }[] = [
  // Jalur Cerdas
  { title: "Ejaan & Huruf Kapital", konten: ejaanHurufKapital },
  // Buku Panduan - Kelas VII Semester 1
  { title: "Bab 1: Teks Deskripsi", konten: teksDeskripsi },
  { title: "Bab 2: Cerita Fantasi", konten: ceritaFantasi },
  { title: "Bab 3: Teks Prosedur", konten: teksProsedur },
  { title: "Bab 4: Teks LHO", konten: teksLHO },
  { title: "Bab 5: Puisi Rakyat", konten: puisiRakyat },
  { title: "Bab 6: Cerpen", konten: cerpen },
  // Buku Panduan - Kelas VII Semester 2
  { title: "Bab 1: Surat Pribadi dan Dinas", konten: suratPribadiDinas },
  { title: "Bab 2: Teks Berita", konten: teksBerita },
  { title: "Bab 3: Iklan, Slogan, Poster", konten: iklanSloganPoster },
  { title: "Bab 4: Teks Eksposisi", konten: teksEksposisi },
  { title: "Bab 5: Buku Fiksi dan Nonfiksi", konten: fiksiNonfiksi },
  { title: "Bab 6: Pantun dan Syair", konten: pantunSyair },
]

async function seedMateri() {
  console.log("Mulai seeding materi...")

  const semuaLevel = await db.learningLevel.findMany({ include: { units: true } })

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
