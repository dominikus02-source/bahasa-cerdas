// Akun murid TK–SD: pendaftaran oleh guru, anak masuk dengan PIN 4 angka.
//
// Anak usia 4–10 tahun tidak bisa mengetik email dan tidak bisa mengingat kata
// sandi. Jadi yang dilihat anak hanya: pilih kelas → ketuk namanya → 4 angka.
//
// Di balik layar tetap Supabase Auth. Setiap anak punya email sintetis yang
// tidak pernah ia lihat, dan kata sandi Supabase-nya DITURUNKAN dari PIN —
// karena PIN 4 angka sendiri di bawah panjang minimum Supabase.
//
// Konsekuensi keamanan yang harus dipegang: rahasia efektifnya hanya 4 angka
// (10.000 kemungkinan). Karena itu penguncian setelah beberapa kali salah
// bukan fitur tambahan, tapi syarat supaya alur ini layak dipakai.

export const PANJANG_PIN = 4
export const MAKS_GAGAL_PIN = 5
export const MENIT_TERKUNCI = 15

/** Domain email sintetis. Tidak pernah menerima surel sungguhan. */
export const DOMAIN_SINTETIS = "junior.bahasacerdas.local"

/** PIN yang terlalu mudah ditebak — jangan pernah dihasilkan otomatis. */
const PIN_TERLARANG = new Set([
  "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999",
  "1234", "4321", "0123", "1230", "2345", "3456", "4567", "5678", "6789",
])

export function pinValid(pin: string): boolean {
  return new RegExp(`^\\d{${PANJANG_PIN}}$`).test(pin)
}

/**
 * PIN acak yang tidak termasuk pola mudah ditebak.
 * Memakai crypto, bukan Math.random — ini kredensial.
 */
export function buatPin(): string {
  for (let coba = 0; coba < 50; coba++) {
    const angka = new Uint32Array(1)
    crypto.getRandomValues(angka)
    const pin = String(angka[0] % 10 ** PANJANG_PIN).padStart(PANJANG_PIN, "0")
    if (!PIN_TERLARANG.has(pin)) return pin
  }
  // Praktis tidak akan sampai sini; kalau iya, jangan kembalikan PIN lemah.
  throw new Error("Gagal membuat PIN")
}

/** Ubah nama anak menjadi bagian lokal email yang aman. */
export function slugNama(nama: string): string {
  const bersih = nama
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40)
  return bersih || "murid"
}

/**
 * Email sintetis untuk Supabase Auth. Sufiks acak menjamin unik walau ada dua
 * anak bernama sama di satu kelas.
 */
export function buatEmailSintetis(nama: string, kodeKelas: string): string {
  const acak = new Uint32Array(1)
  crypto.getRandomValues(acak)
  const sufiks = acak[0].toString(36).slice(0, 5)
  return `${slugNama(nama)}.${kodeKelas.toLowerCase()}.${sufiks}@${DOMAIN_SINTETIS}`
}

/**
 * Kata sandi Supabase yang sebenarnya, diturunkan dari PIN.
 *
 * Dipakai baik saat membuat akun maupun saat masuk, jadi harus deterministik
 * dari nilai yang tersedia di kedua saat itu. `emailSintetis` memenuhi syarat
 * itu dan sekaligus membuat panjangnya melewati batas minimum Supabase.
 *
 * Ini BUKAN pengganti penguncian: emailSintetis bukan rahasia, jadi kekuatan
 * sesungguhnya tetap 4 angka PIN.
 */
export function sandiDariPin(pin: string, emailSintetis: string): string {
  if (!pinValid(pin)) throw new Error("PIN harus 4 angka")
  return `aj.${pin}.${emailSintetis}`
}

export type StatusKunci =
  | { terkunci: false; sisaPercobaan: number }
  | { terkunci: true; detikTersisa: number }

/** Apakah akun ini sedang dikunci karena PIN salah berulang. */
export function statusKunci(
  akun: { gagalPin: number; terkunciSampai: Date | null },
  sekarang: Date = new Date()
): StatusKunci {
  if (akun.terkunciSampai && akun.terkunciSampai > sekarang) {
    return {
      terkunci: true,
      detikTersisa: Math.ceil((akun.terkunciSampai.getTime() - sekarang.getTime()) / 1000),
    }
  }
  return { terkunci: false, sisaPercobaan: Math.max(0, MAKS_GAGAL_PIN - akun.gagalPin) }
}

/**
 * Bagaimana penghitung berubah setelah satu percobaan PIN yang salah.
 * Dipisah dari akses database supaya kebijakannya bisa diuji tanpa DB.
 */
export function setelahPinSalah(
  gagalSebelumnya: number,
  sekarang: Date = new Date()
): { gagalPin: number; terkunciSampai: Date | null } {
  const gagalPin = gagalSebelumnya + 1
  if (gagalPin < MAKS_GAGAL_PIN) return { gagalPin, terkunciSampai: null }
  return {
    gagalPin,
    terkunciSampai: new Date(sekarang.getTime() + MENIT_TERKUNCI * 60_000),
  }
}

/** Penghitung direset penuh setiap kali berhasil masuk. */
export function setelahPinBenar(sekarang: Date = new Date()) {
  return { gagalPin: 0, terkunciSampai: null, terakhirMasuk: sekarang }
}
