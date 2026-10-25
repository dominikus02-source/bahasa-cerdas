/**
 * KATEGORI UMUM — sub-kategori yang boleh DIPILIH pengguna peran UMUM.
 *
 * CLIENT-SAFE (tanpa import Node/DB): dipakai UI register/pilih-peran dan
 * validasi server.
 *
 * ATURAN PRODUK:
 * - Opsi yang TERLIHAT & bisa dipilih hanya: Mahasiswa, Dosen, Umum.
 * - Nilai enum DB lain (INVESTOR, TAMU) adalah nilai internal/teknis: TIDAK
 *   PERNAH ditampilkan, diberi label, atau diterima dari input pengguna.
 * - Kategori hanya identitas/analitik — BUKAN dasar otorisasi. DOSEN tetap
 *   Role UMUM (tanpa alat guru, tanpa trial Pro, tanpa berjualan karya).
 */

export const KATEGORI_UMUM_PILIHAN = ["MAHASISWA", "DOSEN", "UMUM"] as const;
export type KategoriUmumPilihan = (typeof KATEGORI_UMUM_PILIHAN)[number];

export const KATEGORI_UMUM_LABEL: Record<KategoriUmumPilihan, string> = {
  MAHASISWA: "Mahasiswa",
  DOSEN: "Dosen",
  UMUM: "Umum",
};

export const KATEGORI_UMUM_DESKRIPSI: Record<KategoriUmumPilihan, string> = {
  MAHASISWA: "Kuliah dan ingin mengasah bahasa Indonesia.",
  DOSEN: "Mengajar di perguruan tinggi dan ingin menjelajah.",
  UMUM: "Siapa pun yang ingin belajar dan bermain kata.",
};

export function isKategoriUmumPilihan(value: unknown): value is KategoriUmumPilihan {
  return typeof value === "string" && (KATEGORI_UMUM_PILIHAN as readonly string[]).includes(value);
}

/** Label tampilan untuk nilai DB apa pun. Nilai internal (INVESTOR/TAMU) atau
 * tak dikenal → null, sehingga UI tidak pernah menampilkannya. */
export function kategoriUmumLabel(value: unknown): string | null {
  return isKategoriUmumPilihan(value) ? KATEGORI_UMUM_LABEL[value] : null;
}
