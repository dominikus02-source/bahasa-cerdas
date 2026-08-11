/**
 * Kuis Tempur 2.0 — progresi level & komposisi musuh (murni, tanpa React/DB).
 *
 * Semua angka pertarungan Kuis Tempur dikumpulkan di sini supaya bisa diuji
 * dan tidak menyebar di dalam komponen. Dua hal yang diatur:
 *
 *  1. PROGRESI PEMAIN — Ronde (1..99) kini mengubah statistik sungguhan:
 *     nyawa maksimum dan kerusakan peluru naik pelan, bukan sekadar angka
 *     di HUD. Semakin tinggi ronde, semakin kuat murid bertahan.
 *
 *  2. KESULITAN MUSUH DINAMIS — musuh tidak lagi satu cetakan (HP 100, semua
 *     identik). Tiap bot lahir dengan arketipe acak (ringan/sedang/berat/
 *     penembak) yang bobotnya bergeser mengikuti ronde: ronde rendah penuh
 *     musuh ringan, ronde tinggi dipenuhi musuh kuat dan penembak.
 *
 * Prinsip: server XP & batas harian TIDAK tersentuh di sini — modul ini hanya
 * statistik pertarungan klien.
 */

/** Arketipe musuh. Berat/penembak lebih umum di ronde tinggi. */
export type TipeBot = "ringan" | "sedang" | "berat" | "penembak"

/** Label Bahasa Indonesia untuk umpan & pembeda visual. */
export const LABEL_TIPE: Record<TipeBot, string> = {
  ringan: "Si Cepat",
  sedang: "Seimbang",
  berat: "Si Kuat",
  penembak: "Penembak",
}

/** Warna cincin/nama bot sesuai arketipe — sekali lihat langsung terbaca. */
export const WARNA_TIPE: Record<TipeBot, string> = {
  ringan: "#34D399",
  sedang: "#FBBF24",
  berat: "#F87171",
  penembak: "#C084FC",
}

/** Statistik akhir satu bot (sudah dikalikan pengali arketipe). */
export type StatBot = {
  tipe: TipeBot
  hpMax: number
  dmg: number
  laju: number
  peluangTembak: number
  sebaran: number
}

/**
 * Banyaknya lawan awal per ronde (3 lawan di ronde 1, naik tiap 2 ronde
 * sampai maksimal 7). Rumus sama dengan versi sebelumnya — dipindah ke sini
 * supaya bisa diuji dan dipakai ulang oleh lahirBot.
 */
export function lawanBot(level: number): number {
  const l = Math.min(Math.max(level, 1), 99)
  return Math.min(3 + Math.floor((l - 1) / 2), 7)
}

/**
 * Statistik dasar arena per ronde (faktor bersama semua bot).
 * Nilai identik dengan `aturanLevel` lama — dipindah dari komponen.
 */
export function statDasarBot(level: number) {
  const n = Math.min(level, 10)
  return {
    peluangTembak: 0.001 + n * 0.0005,
    lajuPeluru: 2.8 + n * 0.25,
    dmgBot: 9 + n,
    sebaran: 0.55 - n * 0.03,
    lajuZona: n <= 2 ? 0 : 0.05 + n * 0.015, // dua ronde pertama tanpa kabut
    lajuBot: 0.35 + n * 0.05,
  }
}

/** Statistik pemain per ronde — nyawa & kerusakan peluru bertumbuh pelan. */
export function kurvaPemain(level: number) {
  const l = Math.min(Math.max(level, 1), 99)
  return {
    hpMax: Math.min(100 + (l - 1) * 4, 200),
    dmgTembak: Math.min(34 + Math.floor((l - 1) / 3), 50),
  }
}

/**
 * Bobot arketipe per band ronde (daftar 10 = persentase). Ronde rendah
 * didominasi musuh ringan/sedang; ronde tinggi penuh kuat & penembak.
 */
const KOMPOSISI: { sampai: number; daftar: TipeBot[] }[] = [
  // 1–3:  ringan 30% · sedang 60% · berat 10% · penembak 0%
  { sampai: 3, daftar: ["ringan", "ringan", "ringan", "sedang", "sedang", "sedang", "sedang", "sedang", "sedang", "berat"] },
  // 4–9:  ringan 20% · sedang 40% · berat 20% · penembak 20%
  { sampai: 9, daftar: ["ringan", "ringan", "sedang", "sedang", "sedang", "sedang", "berat", "berat", "penembak", "penembak"] },
  // 10–19: ringan 20% · sedang 40% · berat 20% · penembak 20%
  { sampai: 19, daftar: ["ringan", "ringan", "sedang", "sedang", "sedang", "sedang", "berat", "berat", "penembak", "penembak"] },
  // 20–99: ringan 10% · sedang 30% · berat 30% · penembak 30%
  { sampai: 99, daftar: ["ringan", "sedang", "sedang", "sedang", "berat", "berat", "berat", "penembak", "penembak", "penembak"] },
]

const PENGALI: Record<TipeBot, { hp: number; dmg: number; laju: number; peluang: number; sebaran: number }> = {
  ringan: { hp: 0.6, dmg: 0.8, laju: 1.35, peluang: 0.7, sebaran: 1.15 },
  sedang: { hp: 1, dmg: 1, laju: 1, peluang: 1, sebaran: 1 },
  berat: { hp: 1.8, dmg: 1.3, laju: 0.72, peluang: 1.1, sebaran: 0.85 },
  penembak: { hp: 0.8, dmg: 0.9, laju: 0.95, peluang: 2.4, sebaran: 0.65 },
}

/**
 * Lahirkan satu bot dengan arketipe acak. `index` hanya untuk konsistensi
 * posisi di daftar; `rng` bisa disuntikkan agar hasilnya deterministik saat
 * diuji (default: Math.random).
 */
export function komposisiBot(level: number, index: number, rng: () => number = Math.random): StatBot {
  const n = Math.min(Math.max(level, 1), 99)
  const band = KOMPOSISI.find((b) => n <= b.sampai) ?? KOMPOSISI[KOMPOSISI.length - 1]
  const tipe = band.daftar[Math.floor(rng() * band.daftar.length)]
  const dasar = statDasarBot(n)
  const p = PENGALI[tipe]

  return {
    tipe,
    // HP dasar naik tiap ronde (60 + 5/ronde, cap 260) lalu dikalikan arketipe.
    hpMax: Math.round(Math.min(60 + n * 5, 260) * p.hp),
    dmg: Math.round(dasar.dmgBot * p.dmg),
    laju: dasar.lajuBot * p.laju,
    peluangTembak: dasar.peluangTembak * p.peluang,
    sebaran: Math.max(0.12, dasar.sebaran * p.sebaran),
  }
}
