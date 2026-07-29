/**
 * Penjaga XP — batas atas yang dihitung server untuk setiap pemberian XP.
 *
 * Latar belakang (28 Jul 2026): tiga murid mencapai Level 751 (~375.000 XP)
 * memakai autoclicker. Dua akun teratas hanya berselisih 15 XP — pola khas
 * skrip, bukan permainan. Penyebabnya `/api/game/xp` menerima `xpEarned`
 * mentah dari badan permintaan:
 *
 *     const baseXp = xpEarned ?? Math.floor((score || 0) / 10)
 *
 * Tanpa batas, tanpa jeda, tanpa verifikasi. Klien memang membatasi dirinya
 * sendiri (TebakKata: `Math.min(..., 60)`), tetapi batas di klien tidak
 * mengikat siapa pun yang memanggil endpoint langsung.
 *
 * Prinsip modul ini: **server tidak pernah mempercayai angka XP dari klien.**
 * Klien boleh melapor apa yang terjadi (benar berapa, skor berapa); berapa XP
 * yang layak diberikan diputuskan di sini.
 */

/**
 * Batas XP untuk SATU kali submit, per sumber.
 *
 * Angkanya sengaja di atas hasil terbaik permainan jujur supaya pemain normal
 * tidak pernah menyentuhnya — ini jaring pengaman, bukan penyeimbang permainan.
 * Rujukan: TebakKata membatasi diri di 60, Menara Cerdas di 100.
 */
export const BATAS_XP_PER_SUBMIT: Record<string, number> = {
  GAME: 120,
  KATASTRA: 400,
  MENARA: 120,
  JALUR_CERDAS: 200,
  KOMPETENSI: 1000,
  PENUGASAN: 500,
};

const BATAS_DEFAULT = 120;

/**
 * Batas XP per murid per hari.
 *
 * Bermain wajar seharian pun sulit menembus angka ini; autoclicker menembusnya
 * dalam hitungan menit. Inilah pertahanan terakhir kalau ada jalur pemanenan
 * baru yang belum terpikirkan — pembatas laju TIDAK bisa diandalkan untuk ini
 * karena `lib/rate-limit.ts` gagal-terbuka saat Redis mati (`if (!cache) return
 * { success: true }`), dan env KV_* pernah hilang diam-diam.
 */
export const BATAS_XP_HARIAN = 5000;

/** Awal hari ini menurut WIB, dipakai untuk menghitung kuota harian. */
export function awalHariWIB(now: Date = new Date()): Date {
  // Geser ke WIB, potong ke tengah malam, lalu kembalikan ke UTC.
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  wib.setUTCHours(0, 0, 0, 0);
  return new Date(wib.getTime() - 7 * 60 * 60 * 1000);
}

/**
 * Pangkas XP satu submit ke batas sumbernya.
 *
 * Nilai tak wajar (negatif, NaN, Infinity, bukan angka) dijadikan 0 — bukan
 * ditolak — supaya permainan yang sah tetap selesai normal meski payload-nya
 * aneh karena bug klien.
 */
export function batasiXpSubmit(sumber: string, xpDiminta: number): number {
  const batas = BATAS_XP_PER_SUBMIT[sumber] ?? BATAS_DEFAULT;
  if (!Number.isFinite(xpDiminta) || xpDiminta <= 0) return 0;
  return Math.min(Math.floor(xpDiminta), batas);
}

export type HasilKuota = {
  /** XP yang benar-benar boleh diberikan setelah kuota harian dihitung. */
  xp: number;
  /** True kalau permintaan dipotong karena kuota harian habis. */
  terpotong: boolean;
  /** Sisa kuota SEBELUM pemberian ini. */
  sisaSebelum: number;
};

/**
 * Sisakan XP sesuai kuota harian murid.
 *
 * `xpHariIni` harus dipasok pemanggil (dihitung dari jejak yang tersedia,
 * mis. GameResult), karena belum ada tabel ledger XP menyeluruh.
 */
export function terapkanKuotaHarian(xpHariIni: number, xpDiminta: number): HasilKuota {
  const terpakai = Number.isFinite(xpHariIni) && xpHariIni > 0 ? xpHariIni : 0;
  const sisa = Math.max(0, BATAS_XP_HARIAN - terpakai);
  const diberikan = Math.min(xpDiminta, sisa);
  return {
    xp: diberikan,
    terpotong: diberikan < xpDiminta,
    sisaSebelum: sisa,
  };
}
