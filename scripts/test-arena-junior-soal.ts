/**
 * Tes murni (tanpa database) untuk aturan soal Arena Junior.
 *
 * Yang dibuktikan:
 *  1. Sanitasi tidak membocorkan kunci jawaban / pembahasan
 *  2. Pengacakan deterministik — benih sama menghasilkan urutan sama
 *  3. Urutan opsi BERBEDA antar percobaan
 *  4. CELAH CURANG TERTUTUP: kunci jawaban dari percobaan ke-N tidak lagi
 *     bernilai benar di percobaan ke-N+1
 *  5. Penilaian benar: semua benar = 100, semua salah = 0, tak dijawab = salah
 *  6. Ambang bintang sesuai nilai
 */

import {
  acakOpsi,
  bacaIsiPelajaran,
  benihPercobaan,
  bintangDari,
  nilaiJawaban,
  sanitasiSoal,
  type Soal,
} from "../lib/arena-junior/soal"
import { SOAL_TK } from "../data/arena-junior/soal-tk"
import { SOAL_K1 } from "../data/arena-junior/soal-k1"

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

/** Jawaban sempurna untuk satu susunan soal. */
function jawabSemuaBenar(soal: Soal[]) {
  return Object.fromEntries(soal.map((s) => [s.id, s.jawaban]))
}

const USER = "user_uji"
const LESSON = "lesson_uji"

function main() {
  console.log("\n🔎 Tes aturan soal Arena Junior\n")

  const semuaBank = [...Object.values(SOAL_TK), ...Object.values(SOAL_K1)]
  const contoh = semuaBank[0].slice(0, 5)

  // 1. Sanitasi
  console.log("Sanitasi")
  const aman = JSON.stringify(sanitasiSoal(contoh))
  cek("tidak ada field `jawaban`", !aman.includes('"jawaban"'))
  cek("tidak ada field `pembahasan`", !aman.includes('"pembahasan"'))
  const kunciAsli = contoh.map((s) => s.jawaban)
  cek(
    "soal tetap utuh setelah disanitasi",
    sanitasiSoal(contoh).length === contoh.length &&
      sanitasiSoal(contoh).every((s, i) => s.opsi.length === contoh[i].opsi.length),
    `${contoh.length} soal, kunci disimpan di server (${kunciAsli.join("")})`
  )

  // 2. Determinisme
  console.log("\nPengacakan")
  const p1a = acakOpsi(contoh, benihPercobaan(USER, LESSON, 1))
  const p1b = acakOpsi(contoh, benihPercobaan(USER, LESSON, 1))
  cek(
    "benih sama → urutan sama",
    JSON.stringify(p1a) === JSON.stringify(p1b),
    "deterministik, aman untuk seed ulang"
  )

  const p2 = acakOpsi(contoh, benihPercobaan(USER, LESSON, 2))
  const urutan = (s: Soal[]) => s.map((q) => q.opsi.map((o) => o.label).join("|")).join("//")
  cek(
    "percobaan 1 vs 2 → urutan berbeda",
    urutan(p1a) !== urutan(p2),
    "opsi diacak ulang setiap percobaan"
  )

  const murid2 = acakOpsi(contoh, benihPercobaan("user_lain", LESSON, 1))
  cek("murid berbeda → urutan berbeda", urutan(p1a) !== urutan(murid2))

  cek(
    "setiap soal punya tepat satu kunci yang valid",
    p1a.every((s) => s.opsi.filter((o) => o.id === s.jawaban).length === 1)
  )

  // 3. Celah curang
  console.log("\nCelah curang (contek kunci percobaan lalu)")
  const kunciPercobaan1 = jawabSemuaBenar(p1a)
  const nilaiSah = nilaiJawaban(p1a, kunciPercobaan1)
  cek("kunci percobaan 1 → nilai 100 di percobaan 1", nilaiSah.nilai === 100, `${nilaiSah.nilai}`)

  const nilaiContek = nilaiJawaban(p2, kunciPercobaan1)
  cek(
    "kunci percobaan 1 TIDAK lolos di percobaan 2",
    nilaiContek.nilai < 100,
    `nilai contekan hanya ${nilaiContek.nilai}`
  )

  // Uji lebih luas: berapa sering contekan tetap lolos di seluruh bank soal?
  let totalUji = 0
  let contekLolos = 0
  for (const [i, bank] of semuaBank.entries()) {
    const potong = bank.slice(0, 5)
    const a = acakOpsi(potong, benihPercobaan(USER, `l${i}`, 1))
    const b = acakOpsi(potong, benihPercobaan(USER, `l${i}`, 2))
    const hasil = nilaiJawaban(b, jawabSemuaBenar(a))
    totalUji++
    if (hasil.nilai >= 70) contekLolos++
  }
  cek(
    "contekan tidak pernah cukup untuk lulus di seluruh bank",
    contekLolos === 0,
    `${contekLolos} dari ${totalUji} unit`
  )

  // 4. Penilaian
  console.log("\nPenilaian")
  cek("semua benar = 100", nilaiJawaban(p1a, jawabSemuaBenar(p1a)).nilai === 100)
  const semuaSalah = Object.fromEntries(
    p1a.map((s) => [s.id, s.opsi.find((o) => o.id !== s.jawaban)!.id])
  )
  cek("semua salah = 0", nilaiJawaban(p1a, semuaSalah).nilai === 0)
  cek("tidak dijawab dihitung salah", nilaiJawaban(p1a, {}).nilai === 0)
  const separuh = { ...jawabSemuaBenar(p1a) }
  delete separuh[p1a[0].id]
  cek(
    "1 dari 5 tak dijawab = 80",
    nilaiJawaban(p1a, separuh).nilai === 80,
    `${nilaiJawaban(p1a, separuh).nilai}`
  )

  // 5. Bintang
  console.log("\nAmbang bintang")
  cek("100 → 3 bintang", bintangDari(100) === 3)
  cek("95 → 3 bintang", bintangDari(95) === 3)
  cek("85 → 2 bintang", bintangDari(85) === 2)
  cek("80 → 1 bintang", bintangDari(80) === 1)
  cek("70 → 1 bintang", bintangDari(70) === 1)
  cek("69 → 0 bintang (belum lulus)", bintangDari(69) === 0)

  // 6. Bentuk bank soal
  console.log("\nBentuk bank soal")
  let totalSoal = 0
  const cacat: string[] = []
  for (const [unit, bank] of [
    ...Object.entries(SOAL_TK).map((e) => ["TK " + e[0], e[1]] as const),
    ...Object.entries(SOAL_K1).map((e) => ["K1 " + e[0], e[1]] as const),
  ]) {
    if (bank.length !== 15) cacat.push(`${unit}: ${bank.length} soal (harus 15)`)
    totalSoal += bank.length
    for (const s of bank) {
      if (!bacaIsiPelajaran({ versi: 1, soal: [s] })) cacat.push(`${unit} · ${s.id} tidak valid`)
      if (new Set(bank.map((x) => x.id)).size !== bank.length) break
    }
  }
  cek("setiap unit tepat 15 soal", cacat.length === 0, cacat.slice(0, 3).join("; ") || `${totalSoal} soal`)

  const semuaId = semuaBank.flat().map((s) => s.id)
  cek("id soal unik", new Set(semuaId).size === semuaId.length, `${semuaId.length} soal`)

  // Perbandingan PEKA huruf besar-kecil dengan sengaja: sebagian soal Kelas 1
  // justru menguji huruf kapital di awal kalimat ("Ani menyiram bunga." vs
  // "ani menyiram bunga."), jadi kedua opsi itu memang berbeda bagi murid.
  // Menormalkan ke huruf kecil akan salah menuduhnya sebagai opsi kembar.
  const opsiKembar = semuaBank
    .flat()
    .filter((s) => new Set(s.opsi.map((o) => (o.label ?? "").trim())).size !== s.opsi.length)
  cek(
    "tidak ada opsi berteks kembar dalam satu soal",
    opsiKembar.length === 0,
    opsiKembar.map((s) => s.id).join(", ") || "bersih"
  )

  // Tetap tandai kalau ada soal yang bedanya HANYA huruf besar-kecil padahal
  // perintahnya tidak menyinggung penulisan/huruf kapital — itu biasanya salah tulis.
  const kapitalMencurigakan = semuaBank.flat().filter((s) => {
    const kecil = s.opsi.map((o) => (o.label ?? "").trim().toLowerCase())
    if (new Set(kecil).size === s.opsi.length) return false
    return !/penulisan|huruf|kapital|besar/i.test(s.perintah)
  })
  cek(
    "beda huruf besar-kecil hanya pada soal yang memang membahasnya",
    kapitalMencurigakan.length === 0,
    kapitalMencurigakan.map((s) => `${s.id}: ${s.perintah}`).join("; ") || "bersih"
  )

  console.log(`\n${gagal === 0 ? "✅" : "❌"} ${lulus} lulus, ${gagal} gagal\n`)
  process.exit(gagal === 0 ? 0 : 1)
}

main()
