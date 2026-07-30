/**
 * Uji logika akun murid TK–SD. Tanpa database, tanpa jaringan.
 *   npx tsx scripts/test-arena-junior-akun.ts
 *
 * Fokusnya kebijakan yang menentukan alur masuk anak layak dipakai atau tidak:
 * bentuk PIN, kekuatan PIN yang dihasilkan, bentuk email sintetis, dan yang
 * paling penting — penguncian setelah PIN salah berulang.
 */

import {
  MAKS_GAGAL_PIN,
  MENIT_TERKUNCI,
  buatEmailSintetis,
  buatPin,
  pinValid,
  sandiDariPin,
  setelahPinBenar,
  setelahPinSalah,
  slugNama,
  statusKunci,
} from "../lib/arena-junior/akun"

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

console.log("\n🔎 Uji akun Arena Junior\n")

console.log("Bentuk PIN")
cek("4 angka diterima", pinValid("0417"))
cek("3 angka ditolak", !pinValid("041"))
cek("5 angka ditolak", !pinValid("04170"))
cek("huruf ditolak", !pinValid("04a7"))
cek("kosong ditolak", !pinValid(""))
cek("spasi ditolak", !pinValid(" 417"))

console.log("\nPIN yang dihasilkan")
const seribu = Array.from({ length: 1000 }, () => buatPin())
cek("semuanya berbentuk sah", seribu.every(pinValid))
const lemah = seribu.filter((p) => /^(\d)\1{3}$/.test(p) || p === "1234" || p === "4321")
cek("tidak ada pola mudah ditebak", lemah.length === 0, `${lemah.length} lemah dari 1000`)
const unik = new Set(seribu).size
cek("cukup beragam (bukan konstan)", unik > 800, `${unik} nilai unik dari 1000`)

console.log("\nEmail sintetis")
cek("nama Indonesia jadi slug bersih", slugNama("Ahmad Rizki Pratama") === "ahmad.rizki.pratama", slugNama("Ahmad Rizki Pratama"))
cek("tanda baca dibuang", slugNama("Nur'aini, S.") === "nur.aini.s", slugNama("Nur'aini, S."))
cek("huruf beraksen diluruskan", slugNama("José Fernández") === "jose.fernandez", slugNama("José Fernández"))
cek("nama kosong tetap punya slug", slugNama("###") === "murid", slugNama("###"))
const e1 = buatEmailSintetis("Budi", "TKUJI1")
const e2 = buatEmailSintetis("Budi", "TKUJI1")
cek("berbentuk email", /^[^@\s]+@[^@\s]+$/.test(e1), e1)
cek("dua anak senama tetap beda email", e1 !== e2)
cek("bukan domain sungguhan", e1.endsWith(".local"))

console.log("\nTurunan kata sandi")
const sandi = sandiDariPin("0417", e1)
cek("panjang lewat batas minimum Supabase", sandi.length >= 8, `${sandi.length} karakter`)
cek("deterministik", sandiDariPin("0417", e1) === sandi)
cek("PIN beda → sandi beda", sandiDariPin("0418", e1) !== sandi)
cek("anak beda → sandi beda", sandiDariPin("0417", e2) !== sandi)
let ditolak = false
try {
  sandiDariPin("41", e1)
} catch {
  ditolak = true
}
cek("PIN tidak sah ditolak, bukan diterima diam-diam", ditolak)

console.log("\nPenguncian setelah PIN salah (pengaman utama)")
const t0 = new Date("2026-07-30T10:00:00Z")
let gagalPin = 0
let terkunciSampai: Date | null = null
for (let i = 1; i < MAKS_GAGAL_PIN; i++) {
  const h = setelahPinSalah(gagalPin, t0)
  gagalPin = h.gagalPin
  terkunciSampai = h.terkunciSampai
  const s = statusKunci({ gagalPin, terkunciSampai }, t0)
  cek(`salah ke-${i} belum mengunci`, !s.terkunci && s.sisaPercobaan === MAKS_GAGAL_PIN - i)
}
const kunci = setelahPinSalah(gagalPin, t0)
const sKunci = statusKunci(kunci, t0)
cek(`salah ke-${MAKS_GAGAL_PIN} mengunci`, sKunci.terkunci)
cek(
  `terkunci sekitar ${MENIT_TERKUNCI} menit`,
  sKunci.terkunci && Math.abs(sKunci.detikTersisa - MENIT_TERKUNCI * 60) <= 1,
  sKunci.terkunci ? `${sKunci.detikTersisa} detik` : ""
)

const setelahLewat = statusKunci(kunci, new Date(t0.getTime() + (MENIT_TERKUNCI + 1) * 60_000))
cek("terbuka lagi setelah waktunya lewat", !setelahLewat.terkunci)

const reset = setelahPinBenar(t0)
cek("berhasil masuk mereset penghitung", reset.gagalPin === 0 && reset.terkunciSampai === null)
cek("berhasil masuk mencatat waktu", reset.terakhirMasuk === t0)

// Kalau penghitung tidak direset, anak yang pernah 4x salah akan langsung
// terkunci pada satu kesalahan berikutnya berbulan-bulan kemudian.
const setelahReset = setelahPinSalah(reset.gagalPin, t0)
cek(
  "satu kesalahan setelah berhasil masuk tidak langsung mengunci",
  !statusKunci(setelahReset, t0).terkunci
)

// Batas brute force: 5 percobaan per 15 menit = 480/hari. Menebak 4 angka
// butuh ~10 hari terus-menerus; tanpa penguncian hanya hitungan menit.
const perHari = (MAKS_GAGAL_PIN * 24 * 60) / MENIT_TERKUNCI
cek(
  "laju tebakan maksimum tetap rendah",
  perHari < 600,
  `${perHari} percobaan/hari, butuh ~${Math.round(10000 / perHari)} hari untuk 10.000 kombinasi`
)

console.log(`\n${gagal === 0 ? "✅" : "❌"} ${lulus} lulus, ${gagal} gagal\n`)
process.exit(gagal === 0 ? 0 : 1)
