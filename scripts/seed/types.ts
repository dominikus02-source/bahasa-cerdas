export type TipeSoal = "PG" | "BENAR_SALAH" | "ISIAN"

export type Soal = {
  id: number
  tipe?: TipeSoal        // default "PG"
  soal: string
  opsi: string[]          // PG: 4 opsi, BENAR_SALAH: ["Benar","Salah"], ISIAN: [kunci jawaban]
  jawaban: number | string // PG/BS: index of correct opsi, ISIAN: teks jawaban benar
  penjelasan: string
}

export type Konten = {
  belajar: {
    tujuan: string[]
    materi: { judul: string; isi: string[]; contoh: string[]; catatan?: string }[]
    rangkuman: string[]
  }
  latihan: Soal[]
  praktik: { petunjuk: string; tips: string[]; contoh?: string }
  kuis: Soal[]
}

export function makeSoal(arr: [string, string[], number | string, string][], tipe?: TipeSoal): Soal[] {
  return arr.map(([soal, opsi, jawaban, penjelasan], i) => ({ id: i + 1, tipe, soal, opsi, jawaban, penjelasan }))
}

export function bs(soal: string, jawaban: number, penjelasan: string): Soal {
  return { id: 0, tipe: "BENAR_SALAH", soal, opsi: ["Benar", "Salah"], jawaban, penjelasan }
}

export function isian(soal: string, kunci: string, penjelasan: string): Soal {
  return { id: 0, tipe: "ISIAN", soal, opsi: [kunci], jawaban: kunci, penjelasan }
}

export function pg(soal: string, opsi: string[], jawaban: number, penjelasan: string): Soal {
  return { id: 0, tipe: "PG", soal, opsi, jawaban, penjelasan }
}
