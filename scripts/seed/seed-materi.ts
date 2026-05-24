// @ts-nocheck
import { db } from "../../lib/db"
import ejaanHurufKapital from "./materi/01-ejaan-huruf-kapital"

type UnitModule = { default: import("../types").Konten }

const units: { title: string; konten: import("../types").Konten }[] = [
  { title: "Ejaan & Huruf Kapital", konten: ejaanHurufKapital },
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
