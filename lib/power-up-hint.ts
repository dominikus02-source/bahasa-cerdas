/**
 * Penentuan opsi yang dicoret oleh Hint Token.
 *
 * Pilihannya sengaja DITENTUKAN SECARA PASTI (deterministik) dari identitas
 * soal, bukan diacak ulang tiap klik. Alasannya anti-curang: kalau tiap
 * pemakaian mengacak lagi, murid bisa memakai/memuat ulang berkali-kali untuk
 * mencoret opsi salah yang berbeda sampai tersisa jawaban benar. Dengan cara
 * ini, satu soal selalu menghasilkan satu opsi yang sama — sekali dipakai,
 * tidak ada informasi baru yang bisa dikeruk.
 */

/** Hash kecil dan stabil (FNV-1a 32-bit) supaya hasilnya sama di sesi mana pun. */
function hash(teks: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < teks.length; i++) {
    h ^= teks.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Mengembalikan indeks satu opsi yang SALAH, atau `null` kalau tidak ada opsi
 * salah yang bisa dicoret (mis. soal hanya punya satu opsi).
 */
export function pilihOpsiSalah(
  kunciSoal: string | number,
  jumlahOpsi: number,
  indeksJawabanBenar: number
): number | null {
  const salah: number[] = [];
  for (let i = 0; i < jumlahOpsi; i++) {
    if (i !== indeksJawabanBenar) salah.push(i);
  }
  if (salah.length === 0) return null;
  return salah[hash(`${kunciSoal}`) % salah.length];
}
