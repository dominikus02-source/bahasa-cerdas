// Bank gambar untuk soal Arena Junior.
//
// Berkas ada di public/junior/soal/<kategori>/<kata>.webp — hasil
// pengecilan aset KataPlay (2250–3600px PNG, 74 MB) ke 512px WebP (1,2 MB).
// Penulis soal memakai `gambarSoal("kucing")`, bukan menebak nama berkas.

export type KategoriGambar = "hewan" | "buah"

/**
 * Kata yang punya gambar, dikelompokkan per kategori.
 *
 * Kolom `mudah` menandai kata yang layak dipakai di jenjang TK–Kelas 1:
 * dikenal anak Indonesia sehari-hari dan mudah diucapkan. Sisanya disimpan
 * untuk jenjang lebih tinggi atau tidak dipakai sama sekali.
 */
export const BANK_GAMBAR: Record<KategoriGambar, Array<{ kata: string; mudah: boolean }>> = {
  hewan: [
    { kata: "anjing", mudah: true },
    { kata: "bebek", mudah: true },
    { kata: "gajah", mudah: true },
    { kata: "kelinci", mudah: true },
    { kata: "kodok", mudah: true },
    { kata: "kucing", mudah: true },
    { kata: "monyet", mudah: true },
    { kata: "sapi", mudah: true },
    { kata: "singa", mudah: true },
    { kata: "zebra", mudah: true },
    { kata: "badak", mudah: false },
    { kata: "beruang", mudah: false },
    { kata: "koala", mudah: false },
    { kata: "lumba-lumba", mudah: false },
    { kata: "pinguin", mudah: false },
    { kata: "rakun", mudah: false },
    { kata: "rubah", mudah: false },
    { kata: "tupai", mudah: false },
  ],
  buah: [
    { kata: "jeruk", mudah: true },
    { kata: "mangga", mudah: true },
    { kata: "melon", mudah: true },
    { kata: "nangka", mudah: true },
    { kata: "pepaya", mudah: true },
    { kata: "pir", mudah: true },
    { kata: "semangka", mudah: true },
    { kata: "stroberi", mudah: true },
    { kata: "buah-naga", mudah: false },
    { kata: "delima", mudah: false },
    { kata: "jambu-biji", mudah: false },
    { kata: "jeruk-bali", mudah: false },
    { kata: "jeruk-nipis", mudah: false },
    { kata: "kesemek", mudah: false },
    { kata: "kiwi", mudah: false },
    { kata: "lemon", mudah: false },
    { kata: "mandarin", mudah: false },
    { kata: "persik", mudah: false },
    { kata: "plum", mudah: false },
    { kata: "frambos", mudah: false },
    // Kacang-kacangan & biji: bukan buah, dan kosakatanya jauh dari
    // keseharian anak. Disimpan agar tidak hilang, tapi jangan dipakai
    // untuk soal "buah".
    { kata: "biji-bunga-matahari", mudah: false },
    { kata: "biji-labu", mudah: false },
    { kata: "kacang-pinus", mudah: false },
    { kata: "kacang-tanah", mudah: false },
    { kata: "kemiri", mudah: false },
    { kata: "kenari", mudah: false },
    { kata: "pistasi", mudah: false },
    { kata: "pinggul-mawar", mudah: false },
    { kata: "jus", mudah: false }, // bukan buah — minuman
  ],
}

const KATEGORI_PER_KATA = new Map<string, KategoriGambar>(
  (Object.entries(BANK_GAMBAR) as Array<[KategoriGambar, Array<{ kata: string }>]>).flatMap(
    ([kategori, daftar]) => daftar.map((d) => [d.kata, kategori] as [string, KategoriGambar])
  )
)

/** Jalur gambar untuk sebuah kata, atau null bila belum ada gambarnya. */
export function gambarSoal(kata: string): string | null {
  const kunci = kata.trim().toLowerCase().replace(/\s+/g, "-")
  const kategori = KATEGORI_PER_KATA.get(kunci)
  return kategori ? `/junior/soal/${kategori}/${kunci}.webp` : null
}

/** Kata yang layak untuk jenjang awal (TK–Kelas 1). */
export function kataMudah(kategori: KategoriGambar) {
  return BANK_GAMBAR[kategori].filter((d) => d.mudah).map((d) => d.kata)
}

export const TOTAL_GAMBAR = Object.values(BANK_GAMBAR).reduce((n, d) => n + d.length, 0)
