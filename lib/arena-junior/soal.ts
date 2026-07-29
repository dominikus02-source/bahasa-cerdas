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
