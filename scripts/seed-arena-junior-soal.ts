/**
 * Mengisi bank soal Arena Junior ke kolom `content`.
 *
 *   npx tsx scripts/seed-arena-junior-soal.ts            # rencana saja
 *   npx tsx scripts/seed-arena-junior-soal.ts --execute  # tulis ke database
 *
 * Sumber: data/arena-junior/soal-tk.ts dan soal-k1.ts.
 * Satu unit punya 15 soal; pelajaran ke-n mengambil 5 soal miliknya sendiri.
 *
 * Pengacakan: di berkas sumber, jawaban benar selalu ditulis pertama supaya
 * mudah diperiksa manusia. Kalau disimpan apa adanya, murid yang membuka
 * inspect element akan melihat opsi ber-id "a" selalu benar. Maka di sini
 * urutan opsi diacak DAN id-nya dinomori ulang mengikuti posisi baru.
 * Pengacakannya deterministik (diturunkan dari id soal), jadi seed ulang
 * menghasilkan susunan yang sama — tidak mengacaukan idempotensi.
 */

import { createScriptPrisma } from "./script-prisma"
import { SOAL_TK } from "../data/arena-junior/soal-tk"
import { SOAL_K1 } from "../data/arena-junior/soal-k1"
import { bacaIsiPelajaran, type Soal } from "../lib/arena-junior/soal"

const prisma = createScriptPrisma()
const EXECUTE = process.argv.includes("--execute")

const BANK: Record<string, Record<string, Soal[]>> = { TK: SOAL_TK, K1: SOAL_K1 }
const SOAL_PER_PELAJARAN = 5

/** PRNG deterministik sederhana (mulberry32) dengan benih dari teks. */
function benih(teks: string) {
  let h = 1779033703 ^ teks.length
  for (let i = 0; i < teks.length; i++) {
    h = Math.imul(h ^ teks.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HURUF = ["a", "b", "c", "d", "e"]

function acakOpsi(soal: Soal): Soal {
  const rng = benih(soal.id)
  const opsi = [...soal.opsi]
  for (let i = opsi.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[opsi[i], opsi[j]] = [opsi[j], opsi[i]]
  }
  const idLama = soal.jawaban
  const posisiBenar = opsi.findIndex((o) => o.id === idLama)
  const opsiBaru = opsi.map((o, i) => ({ ...o, id: HURUF[i] }))
  return { ...soal, opsi: opsiBaru, jawaban: HURUF[posisiBenar] }
}

async function main() {
  const pelajaran = await prisma.arenaJuniorLesson.findMany({
    where: { grade: { in: ["TK", "K1"] } },
    orderBy: [{ grade: "asc" }, { unitOrder: "asc" }, { lessonOrder: "asc" }],
    select: { id: true, grade: true, unitTitle: true, lessonOrder: true, title: true },
  })

  const rencana: Array<{ id: string; judul: string; jumlah: number }> = []
  const dilewati: string[] = []

  for (const p of pelajaran) {
    const bankUnit = BANK[p.grade]?.[p.unitTitle]
    if (!bankUnit) {
      dilewati.push(`${p.grade} · ${p.unitTitle} · ${p.title}`)
      continue
    }
    const mulai = (p.lessonOrder - 1) * SOAL_PER_PELAJARAN
    const potongan = bankUnit.slice(mulai, mulai + SOAL_PER_PELAJARAN)
    if (potongan.length < SOAL_PER_PELAJARAN) {
      dilewati.push(`${p.grade} · ${p.title} (bank kurang: ${potongan.length} soal)`)
      continue
    }
    rencana.push({ id: p.id, judul: `${p.grade} · ${p.title}`, jumlah: potongan.length })

    if (EXECUTE) {
      const isi = { versi: 1 as const, soal: potongan.map(acakOpsi) }
      if (!bacaIsiPelajaran(isi)) {
        throw new Error(`Isi pelajaran tidak valid untuk ${p.title}`)
      }
      await prisma.arenaJuniorLesson.update({ where: { id: p.id }, data: { content: isi } })
    }
  }

  console.log(`\n📝 Pelajaran yang diisi soal: ${rencana.length}`)
  console.log(`   Total soal: ${rencana.reduce((n, r) => n + r.jumlah, 0)}`)
  if (dilewati.length) {
    console.log(`\n⏭️  Dilewati (belum ada banknya): ${dilewati.length}`)
    for (const d of dilewati.slice(0, 8)) console.log(`   · ${d}`)
    if (dilewati.length > 8) console.log(`   … dan ${dilewati.length - 8} lagi`)
  }

  if (!EXECUTE) {
    console.log("\n🧪 Belum ada yang ditulis. Jalankan dengan --execute untuk menerapkan.")
    return
  }

  const terisi = await prisma.arenaJuniorLesson.count({ where: { content: { not: null } } })
  console.log(`\n✅ Selesai. Pelajaran dengan soal di database: ${terisi}`)
}

main()
  .catch((e) => {
    console.error("❌ Gagal:", e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
