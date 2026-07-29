/**
 * Validator Arena Junior — read-only, tidak mengubah data.
 *
 * Memeriksa:
 *  1. Berkas kurikulum ada dan bentuknya benar (7 stage × 6 unit × 3 pelajaran)
 *  2. Tabel ArenaJuniorLesson / ArenaJuniorProgress sudah ada di database
 *  3. RLS aktif di kedua tabel (schema public diekspos PostgREST)
 *  4. Foreign key ArenaJuniorProgress → User terpasang
 *  5. Jumlah pelajaran per jenjang sesuai kurikulum
 */

import fs from "node:fs"
import path from "node:path"
import { createScriptPrisma } from "./script-prisma"
import { arenaJuniorGradeFor, GRADE_OPTIONS } from "../lib/kurikulum/jenjang"
import { KARAKTER, gambarKarakter } from "../lib/arena-junior/karakter"
import { BANK_GAMBAR, gambarSoal, TOTAL_GAMBAR, kataMudah } from "../lib/arena-junior/gambar-soal"
import { bacaIsiPelajaran, sanitasiSoal } from "../lib/arena-junior/soal"

const prisma = createScriptPrisma()

let lulus = 0
let gagal = 0

function cek(nama: string, ok: boolean, detail = "") {
  if (ok) {
    lulus++
    console.log(`  ✅ ${nama}${detail ? ` — ${detail}` : ""}`)
  } else {
    gagal++
    console.log(`  ❌ ${nama}${detail ? ` — ${detail}` : ""}`)
  }
}

async function main() {
  console.log("\n🔎 Validasi Arena Junior\n")

  // 1. Kurikulum
  console.log("Kurikulum (berkas)")
  const file = path.join(process.cwd(), "data/arena-junior/curriculum-map.json")
  const adaBerkas = fs.existsSync(file)
  cek("berkas curriculum-map.json ada", adaBerkas, file.replace(process.cwd() + "/", ""))

  let totalPelajaran = 0
  if (adaBerkas) {
    const { stages } = JSON.parse(fs.readFileSync(file, "utf-8")) as { stages: any[] }
    totalPelajaran = stages.reduce(
      (n, s) => n + s.units.reduce((m: number, u: any) => m + u.lessons.length, 0),
      0
    )
    cek("7 stage (TK + Kelas 1–6)", stages.length === 7, `${stages.length} stage`)
    cek("126 pelajaran", totalPelajaran === 126, `${totalPelajaran} pelajaran`)
    const tanpaTipe = stages.flatMap((s: any) =>
      s.units.flatMap((u: any) => u.lessons.filter((l: any) => !l.lessonType))
    )
    cek("semua pelajaran punya lessonType", tanpaTipe.length === 0, `${tanpaTipe.length} kosong`)
  }

  // 2-4. Database
  console.log("\nDatabase")
  const tabel: Array<{ tablename: string; rowsecurity: boolean }> = await prisma.$queryRawUnsafe(
    `SELECT tablename, rowsecurity FROM pg_tables
     WHERE schemaname = 'public' AND tablename IN ('ArenaJuniorLesson', 'ArenaJuniorProgress')
     ORDER BY tablename`
  )
  const namaTabel = tabel.map((t) => t.tablename)
  const adaTabel = namaTabel.length === 2
  cek(
    "tabel ArenaJuniorLesson + ArenaJuniorProgress ada",
    adaTabel,
    namaTabel.length ? namaTabel.join(", ") : "belum dibuat — jalankan prisma/migrations/manual/2026-07-29_arena_junior.sql"
  )

  if (adaTabel) {
    const tanpaRls = tabel.filter((t) => !t.rowsecurity).map((t) => t.tablename)
    cek("RLS aktif di kedua tabel", tanpaRls.length === 0, tanpaRls.join(", ") || "keduanya aktif")

    const fk: Array<{ constraint_name: string }> = await prisma.$queryRawUnsafe(
      `SELECT constraint_name FROM information_schema.table_constraints
       WHERE table_schema = 'public' AND table_name = 'ArenaJuniorProgress'
         AND constraint_type = 'FOREIGN KEY'`
    )
    cek("2 foreign key di ArenaJuniorProgress", fk.length === 2, `${fk.length} terpasang`)

    // 5. Isi
    console.log("\nIsi kurikulum di database")
    const perJenjang = await prisma.arenaJuniorLesson.groupBy({
      by: ["grade"],
      _count: { _all: true },
      orderBy: { grade: "asc" },
    })
    const total = perJenjang.reduce((n, g) => n + g._count._all, 0)
    if (total === 0) {
      console.log("  ⚠️  Belum ada pelajaran — jalankan: npm run seed:arena-junior")
    } else {
      for (const g of perJenjang) {
        cek(`${g.grade}: 18 pelajaran`, g._count._all === 18, `${g._count._all}`)
      }
      cek(`total ${totalPelajaran || 126} pelajaran`, total === (totalPelajaran || 126), `${total}`)
    }

    // Aturan "turun bebas, naik bertahap": murid jenjang ke-n boleh mengakses
    // jenjangnya sendiri + semua jenjang di bawahnya.
    if (total > 0) {
      console.log("\nJangkauan per jenjang (turun bebas, naik bertahap)")
      const urutan = ["TK", "K1", "K2", "K3", "K4", "K5", "K6"] as const
      for (const [i, g] of urutan.entries()) {
        const tersedia = await prisma.arenaJuniorLesson.count({
          where: { grade: { in: urutan.slice(0, i + 1) as any }, isActive: true },
        })
        const harusnya = (i + 1) * 18
        cek(`murid ${g} dapat ${harusnya} pelajaran`, tersedia === harusnya, `${tersedia}`)
      }
    }
  }

  // Bank soal yang sudah masuk database.
  console.log("\nBank soal di database")
  const berisi = await prisma.arenaJuniorLesson.findMany({
    where: { content: { not: null } },
    select: { id: true, title: true, grade: true, content: true },
  })
  cek("ada pelajaran yang sudah berisi soal", berisi.length > 0, `${berisi.length} pelajaran`)

  let totalSoal = 0
  const rusak: string[] = []
  const bocor: string[] = []
  const sebaranKunci = new Map<string, number>()

  for (const p of berisi) {
    const isi = bacaIsiPelajaran(p.content)
    if (!isi) {
      rusak.push(p.title)
      continue
    }
    totalSoal += isi.soal.length
    for (const s of isi.soal) {
      sebaranKunci.set(s.jawaban, (sebaranKunci.get(s.jawaban) ?? 0) + 1)
      // Kunci jawaban tidak boleh ikut terbawa saat disanitasi.
      const aman = JSON.stringify(sanitasiSoal([s]))
      if (aman.includes('"jawaban"') || aman.includes('"pembahasan"')) {
        bocor.push(`${p.title} · ${s.id}`)
      }
    }
  }

  cek("semua isi pelajaran berbentuk valid", rusak.length === 0, rusak.join(", ") || `${totalSoal} soal`)
  cek(
    "sanitasi tidak membocorkan kunci jawaban",
    bocor.length === 0,
    bocor.join(", ") || `${totalSoal} soal diperiksa`
  )

  // Kalau kunci selalu "a", murid yang membuka inspect element langsung tahu
  // jawabannya. Seed mengacak urutan opsi sekaligus menomori ulang id-nya.
  const sebaran = [...sebaranKunci.entries()].sort()
  const terbanyak = Math.max(...sebaran.map(([, n]) => n))
  cek(
    "kunci jawaban tersebar, tidak selalu opsi pertama",
    sebaran.length >= 3 && terbanyak < totalSoal * 0.6,
    sebaran.map(([k, n]) => `${k}:${n}`).join(" ")
  )

  // Karakter: setiap characterHint di database wajib punya berkas gambar.
  console.log("\nKarakter & aset gambar")
  const hints = await prisma.arenaJuniorLesson.groupBy({
    by: ["characterHint"],
    _count: { _all: true },
  })
  for (const h of hints) {
    const dikenal = (KARAKTER as readonly string[]).includes(h.characterHint)
    cek(
      `"${h.characterHint}" karakter resmi`,
      dikenal,
      `${h._count._all} pelajaran${dikenal ? "" : " — tidak punya aset gambar"}`
    )
  }
  const poseWajib = ["idle", "happy", "celebrate", "thinking"] as const
  const gambarHilang: string[] = []
  for (const k of KARAKTER) {
    for (const pose of poseWajib) {
      const jalur = gambarKarakter(k, pose)
      if (!fs.existsSync(path.join(process.cwd(), "public", jalur))) gambarHilang.push(jalur)
    }
  }
  cek(
    "semua gambar karakter yang dirujuk ada berkasnya",
    gambarHilang.length === 0,
    gambarHilang.join(", ") || `${KARAKTER.length} karakter × ${poseWajib.length} pose`
  )

  // Bank gambar soal: setiap kata di manifes wajib punya berkas, dan
  // sebaliknya setiap berkas wajib terdaftar (tidak ada gambar yatim).
  console.log("\nBank gambar soal")
  const soalHilang: string[] = []
  for (const daftar of Object.values(BANK_GAMBAR)) {
    for (const { kata } of daftar) {
      const jalur = gambarSoal(kata)
      if (!jalur || !fs.existsSync(path.join(process.cwd(), "public", jalur))) {
        soalHilang.push(kata)
      }
    }
  }
  cek(
    "semua kata di manifes punya berkas gambar",
    soalHilang.length === 0,
    soalHilang.join(", ") || `${TOTAL_GAMBAR} gambar`
  )

  const berkasNyata = (["hewan", "buah"] as const).flatMap((kategori) => {
    const dir = path.join(process.cwd(), "public/arena-junior/soal", kategori)
    return fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).map((f) => f.replace(/\.webp$/, ""))
      : []
  })
  const yatim = berkasNyata.filter((k) => !gambarSoal(k))
  cek("tidak ada gambar yatim (ada berkas tapi tak terdaftar)", yatim.length === 0, yatim.join(", ") || "bersih")
  console.log(
    `  ℹ️  Layak jenjang awal: ${kataMudah("hewan").length} hewan, ${kataMudah("buah").length} buah`
  )

  // Pemetaan Group.grade → jenjang Arena Junior
  console.log("\nPemetaan kelas → jenjang Arena Junior")
  const petaHarusnya: Array<[string, string | null]> = [
    ["TK", "TK"],
    ["I", "K1"],
    ["VI", "K6"],
    ["VII", null],
    ["XII", null],
    ["Lainnya", null],
  ]
  for (const [dari, ke] of petaHarusnya) {
    const hasil = arenaJuniorGradeFor(dari)
    cek(
      `"${dari}" → ${ke ?? "bukan TK/SD"}`,
      hasil === ke,
      hasil === null ? "bukan TK/SD" : hasil
    )
  }
  cek(
    "TK + kelas I–VI tersedia di GRADE_OPTIONS (form buat kelas)",
    ["TK", "I", "II", "III", "IV", "V", "VI"].every((v) =>
      GRADE_OPTIONS.some((g) => g.value === v)
    ),
    GRADE_OPTIONS.filter((g) => g.jenjang === "TK" || g.jenjang === "SD")
      .map((g) => g.value)
      .join(", ")
  )

  const kelasTkSd = await prisma.group.count({ where: { isActive: true, grade: { in: ["TK", "I", "II", "III", "IV", "V", "VI"] } } })
  if (kelasTkSd === 0) {
    console.log("  ⚠️  Belum ada kelas TK/SD di database — guru perlu membuat satu")
    console.log("      dulu (Kelasku → Buat Kelas) sebelum murid bisa masuk Arena Junior.")
  } else {
    cek("ada kelas TK/SD aktif", true, `${kelasTkSd} kelas`)
  }

  const sisaLama: Array<{ tablename: string }> = await prisma.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename IN ('arena_junior_lessons', 'arena_junior_progress')`
  )
  cek(
    "tabel percobaan lama (snake_case) sudah dibuang",
    sisaLama.length === 0,
    sisaLama.map((t) => t.tablename).join(", ") || "bersih"
  )

  console.log(`\n${gagal === 0 ? "✅" : "❌"} ${lulus} lulus, ${gagal} gagal\n`)
  await prisma.$disconnect()
  process.exit(gagal === 0 ? 0 : 1)
}

main().catch(async (e) => {
  console.error("❌ Validator gagal:", e instanceof Error ? e.message : e)
  await prisma.$disconnect()
  process.exit(1)
})
