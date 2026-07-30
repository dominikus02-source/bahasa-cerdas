// Bentuk soal Arena Junior + penyaring kunci jawaban + penilai.
//
// ATURAN KERAS: `jawaban` tidak boleh pernah sampai ke klien. Semua yang
// dikirim ke browser harus lewat `sanitasiSoal()`, dan penilaian hanya
// dilakukan di server lewat `nilaiJawaban()`.

export type TipeSoal = "pilih-gambar" | "pilih-teks" | "pilih-kata"

export type OpsiSoal = {
  id: string
  /** Teks pada tombol pilihan. Kosongkan bila opsi berupa gambar saja. */
  label?: string
  /** Jalur gambar di /public. */
  gambar?: string
}

export type Soal = {
  id: string
  tipe: TipeSoal
  /** Kalimat perintah, dibacakan/ditampilkan besar. */
  perintah: string
  /** Teks besar yang jadi bahan soal (mis. huruf "A" atau sebuah kata). */
  sorot?: string
  /** Gambar acuan untuk soal "pilih-kata". */
  gambar?: string
  opsi: OpsiSoal[]
  jawaban: string
  /** Ditampilkan setelah dijawab, bahasa anak. */
  pembahasan?: string
}

export type IsiPelajaran = { versi: 1; soal: Soal[] }

export type SoalAman = Omit<Soal, "jawaban" | "pembahasan">

/** Bentuk `content` yang tersimpan di database belum tentu valid — cek dulu. */
export function bacaIsiPelajaran(content: unknown): IsiPelajaran | null {
  if (!content || typeof content !== "object") return null
  const isi = content as Partial<IsiPelajaran>
  if (!Array.isArray(isi.soal) || isi.soal.length === 0) return null
  const semuaValid = isi.soal.every(
    (s) =>
      s &&
      typeof s.id === "string" &&
      typeof s.perintah === "string" &&
      Array.isArray(s.opsi) &&
      s.opsi.length >= 2 &&
      typeof s.jawaban === "string" &&
      s.opsi.some((o) => o.id === s.jawaban)
  )
  return semuaValid ? (isi as IsiPelajaran) : null
}

/** Buang kunci jawaban & pembahasan sebelum dikirim ke browser. */
export function sanitasiSoal(soal: Soal[]): SoalAman[] {
  return soal.map(({ jawaban: _jawaban, pembahasan: _pembahasan, ...aman }) => aman)
}

/** PRNG deterministik (mulberry32) dengan benih dari teks. */
function prng(benih: string) {
  let h = 1779033703 ^ benih.length
  for (let i = 0; i < benih.length; i++) {
    h = Math.imul(h ^ benih.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HURUF_OPSI = ["a", "b", "c", "d", "e"]

/**
 * Mengacak urutan opsi DAN menomori ulang id-nya, deterministik dari `benih`.
 *
 * Dipakai dua kali dengan tujuan berbeda:
 *  1. Saat seed — supaya kunci tidak selalu opsi pertama di database.
 *  2. Saat menyajikan soal ke murid, dengan benih yang memuat nomor percobaan —
 *     supaya kunci yang terlihat pada percobaan ke-N tidak berlaku lagi di
 *     percobaan ke-N+1. Tanpa ini, murid bisa menjawab asal, membaca kunci dari
 *     pembahasan, lalu mengulang dengan jawaban contekan.
 */
export function acakOpsi(soal: Soal[], benih: string): Soal[] {
  return soal.map((s, indeks) => {
    const rng = prng(`${benih}:${s.id}:${indeks}`)
    const opsi = [...s.opsi]
    for (let i = opsi.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[opsi[i], opsi[j]] = [opsi[j], opsi[i]]
    }
    const posisiBenar = opsi.findIndex((o) => o.id === s.jawaban)
    return {
      ...s,
      opsi: opsi.map((o, i) => ({ ...o, id: HURUF_OPSI[i] })),
      jawaban: HURUF_OPSI[posisiBenar],
    }
  })
}

/** Benih pengacakan untuk satu percobaan milik satu murid. */
export function benihPercobaan(userId: string, lessonId: string, percobaan: number) {
  return `${userId}|${lessonId}|${percobaan}`
}

export const NILAI_LULUS = 70

export function bintangDari(nilai: number) {
  if (nilai >= 95) return 3
  if (nilai >= 85) return 2
  if (nilai >= NILAI_LULUS) return 1
  return 0
}

export type HasilPenilaian = {
  nilai: number
  benar: number
  total: number
  lulus: boolean
  bintang: number
  rincian: Array<{ soalId: string; benar: boolean; jawabanBenar: string; pembahasan?: string }>
}

/**
 * Menilai jawaban murid. Satu-satunya tempat kunci jawaban dibandingkan.
 * Soal yang tidak dijawab dihitung salah.
 */
export function nilaiJawaban(soal: Soal[], jawabanMurid: Record<string, unknown>): HasilPenilaian {
  const rincian = soal.map((s) => {
    const dijawab = jawabanMurid[s.id]
    const benar = typeof dijawab === "string" && dijawab === s.jawaban
    return { soalId: s.id, benar, jawabanBenar: s.jawaban, pembahasan: s.pembahasan }
  })

  const benar = rincian.filter((r) => r.benar).length
  const total = soal.length
  const nilai = total > 0 ? Math.round((benar / total) * 100) : 0

  return { nilai, benar, total, lulus: nilai >= NILAI_LULUS, bintang: bintangDari(nilai), rincian }
}
