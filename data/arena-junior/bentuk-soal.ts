// Pembentuk soal yang dipakai bersama oleh bank soal tiap jenjang.
//
// Opsi jawaban benar selalu ditulis pertama di kode supaya mudah dibaca dan
// diperiksa manusia. Urutannya diacak saat disimpan ke database (lihat
// scripts/seed-arena-junior-soal.ts), jadi murid tidak bisa menghafal "selalu A".

import type { Soal } from "@/lib/arena-junior/soal"
import { gambarSoal } from "@/lib/arena-junior/gambar-soal"

const HURUF_OPSI = ["a", "b", "c", "d"]

export function buatPembentuk(prefix: string) {
  let urut = 0
  const id = () => `${prefix}${++urut}`

  /** Pilih huruf/kata berdasarkan teks yang disorot. */
  function teks(
    perintah: string,
    sorot: string,
    benar: string,
    pengecoh: string[],
    pembahasan?: string
  ): Soal {
    return {
      id: id(),
      tipe: "pilih-teks",
      perintah,
      sorot,
      opsi: [
        { id: "a", label: benar },
        ...pengecoh.map((p, i) => ({ id: HURUF_OPSI[i + 1], label: p })),
      ],
      jawaban: "a",
      pembahasan,
    }
  }

  /** Pilih gambar yang cocok dengan sebuah kata. */
  function gambar(
    perintah: string,
    kataBenar: string,
    kataPengecoh: string[],
    pembahasan?: string
  ): Soal {
    return {
      id: id(),
      tipe: "pilih-gambar",
      perintah,
      opsi: [
        { id: "a", label: kataBenar, gambar: gambarSoal(kataBenar) ?? undefined },
        ...kataPengecoh.map((k, i) => ({
          id: HURUF_OPSI[i + 1],
          label: k,
          gambar: gambarSoal(k) ?? undefined,
        })),
      ],
      jawaban: "a",
      pembahasan,
    }
  }

  /** Pilih kata yang cocok dengan sebuah gambar. */
  function kata(
    perintah: string,
    kataGambar: string,
    pengecoh: string[],
    pembahasan?: string
  ): Soal {
    return {
      id: id(),
      tipe: "pilih-kata",
      perintah,
      gambar: gambarSoal(kataGambar) ?? undefined,
      opsi: [
        { id: "a", label: kataGambar },
        ...pengecoh.map((p, i) => ({ id: HURUF_OPSI[i + 1], label: p })),
      ],
      jawaban: "a",
      pembahasan,
    }
  }

  return { teks, gambar, kata }
}
