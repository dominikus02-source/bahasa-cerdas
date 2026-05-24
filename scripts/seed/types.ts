export type Soal = { id: number; soal: string; opsi: string[]; jawaban: number; penjelasan: string }
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
export function makeSoal(arr: [string, string[], number, string][]): Soal[] {
  return arr.map(([soal, opsi, jawaban, penjelasan], i) => ({ id: i + 1, soal, opsi, jawaban, penjelasan }))
}
