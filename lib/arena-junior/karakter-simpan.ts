// Karakter terpilih murid — satu kunci bersama untuk semua gim/arena.
//
// Sebelumnya Kuis Tempur memilih karakter lewat state lokal yang hilang tiap
// halaman dibuka ulang: murid memilih Hazel, keluar, masuk lagi → kembali ke
// Zelby. Tidak ada sistem "karakter aktif" di database (PlayerProfile.avatar
// adalah foto profil, bukan maskot), jadi pilihan disimpan di perangkat lewat
// localStorage dengan satu kunci yang bisa dibagikan gim mana pun.

import { normalkanKarakter, type Karakter } from "@/lib/arena-junior/karakter"

export const KUNCI_KARAKTER = "bc-karakter"

/**
 * Baca karakter terpilih. Tidak pernah melempar: storage bisa mati (privacy
 * mode, SSR) dan isi kunci bisa apa saja → jatuh ke zelby (default resmi).
 */
export function bacaKarakter(): Karakter {
  if (typeof localStorage === "undefined") return "zelby"
  try {
    return normalkanKarakter(localStorage.getItem(KUNCI_KARAKTER))
  } catch {
    return "zelby"
  }
}

/** Simpan pilihan karakter. Gagal menyimpan tidak menggagalkan permainan. */
export function simpanKarakter(karakter: Karakter): void {
  try {
    localStorage.setItem(KUNCI_KARAKTER, karakter)
  } catch {
    // storage penuh/diblokir — pilihan tetap berlaku selama sesi berjalan
  }
}
