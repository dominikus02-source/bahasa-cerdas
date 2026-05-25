// @ts-nocheck
import { db } from "../../lib/db"
import ejaanHurufKapital from "./materi/01-ejaan-huruf-kapital"
import teksDeskripsi from "./materi/02-teks-deskripsi"
import ceritaFantasi from "./materi/03-cerita-fantasi"
import teksProsedur from "./materi/04-teks-prosedur"
import teksLHO from "./materi/05-teks-lho"
import puisiRakyat from "./materi/06-puisi-rakyat"
import cerpen from "./materi/07-cerpen"

type UnitModule = { default: import("../types").Konten }

const units: { title: string; konten: import("../types").Konten }[] = [
  { title: "Ejaan & Huruf Kapital", konten: ejaanHurufKapital },
  { title: "Bab 1: Teks Deskripsi", konten: teksDeskripsi },
  { title: "Bab 2: Cerita Fantasi", konten: ceritaFantasi },
  { title: "Bab 3: Teks Prosedur", konten: teksProsedur },
  { title: "Bab 4: Teks LHO", konten: teksLHO },
  { title: "Bab 5: Puisi Rakyat", konten: puisiRakyat },
  { title: "Bab 6: Cerpen", konten: cerpen },
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
