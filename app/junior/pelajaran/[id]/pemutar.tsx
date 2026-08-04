"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, X, Star, ArrowLeft } from "lucide-react"
import type { SoalAman } from "@/lib/arena-junior/soal"
import { gambarKarakter } from "@/lib/arena-junior/karakter"

type Hasil = {
  nilai: number
  benar: number
  total: number
  lulus: boolean
  bintang: number
  xpDiberikan: number
  rincian: Array<{ soalId: string; benar: boolean; jawabanBenar: string; pembahasan?: string }>
}

export function Pemutar({
  pelajaranId,
  judul,
  karakter,
  percobaan,
  soal,
}: {
  pelajaranId: string
  judul: string
  karakter: string
  /** Nomor percobaan yang menentukan urutan opsi; dikirim balik saat submit. */
  percobaan: number
  soal: SoalAman[]
}) {
  const router = useRouter()
  const [ke, setKe] = useState(0)
  const [jawaban, setJawaban] = useState<Record<string, string>>({})
  const [mengirim, setMengirim] = useState(false)
  const [hasil, setHasil] = useState<Hasil | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  const sekarang = soal[ke]
  const terakhir = ke === soal.length - 1
  const dipilih = sekarang ? jawaban[sekarang.id] : undefined

  async function kirim(semua: Record<string, string>) {
    setMengirim(true)
    setGalat(null)
    try {
      const res = await fetch(`/api/arena-junior/pelajaran/${pelajaranId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jawaban: semua, percobaan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Gagal mengirim jawaban")
      setHasil(data as Hasil)
      router.refresh() // segarkan jalur & XP di dasbor
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal mengirim jawaban")
    } finally {
      setMengirim(false)
    }
  }

  function pilih(opsiId: string) {
    if (!sekarang || mengirim) return
    const semua = { ...jawaban, [sekarang.id]: opsiId }
    setJawaban(semua)
    if (terakhir) {
      void kirim(semua)
    } else {
      // Jeda pendek supaya anak melihat pilihannya tersorot dulu.
      setTimeout(() => setKe((n) => n + 1), 220)
    }
  }

  if (hasil) {
    return <LayarHasil hasil={hasil} judul={judul} karakter={karakter} soal={soal} />
  }

  if (!sekarang) return null

  const persen = Math.round((ke / soal.length) * 100)

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/junior"
          aria-label="Keluar dari pelajaran"
          className="rounded-full bg-white p-2 text-slate-500 shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div
          className="h-4 flex-1 overflow-hidden rounded-full bg-white"
          role="progressbar"
          aria-valuenow={ke + 1}
          aria-valuemin={1}
          aria-valuemax={soal.length}
          aria-label={`Soal ${ke + 1} dari ${soal.length}`}
        >
          <div
            className="h-4 rounded-full bg-[#4ECDC4] transition-all duration-300"
            style={{ width: `${persen}%` }}
          />
        </div>
        <span className="text-sm font-bold text-slate-500">
          {ke + 1}/{soal.length}
        </span>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Image
            src={gambarKarakter(karakter, "happy")}
            alt=""
            width={128}
            height={128}
            className="h-14 w-14 shrink-0 object-contain"
          />
          <h1 className="pt-2 text-xl font-extrabold leading-snug text-slate-800">
            {sekarang.perintah}
          </h1>
        </div>

        {sekarang.sorot && (
          <p className="my-6 text-center text-5xl font-extrabold tracking-wide text-[#D99058]">
            {sekarang.sorot}
          </p>
        )}

        {sekarang.gambar && (
          <div className="my-5 flex justify-center">
            <Image
              src={sekarang.gambar}
              alt=""
              width={512}
              height={512}
              className="h-40 w-40 object-contain"
            />
          </div>
        )}

        <div
          className={
            sekarang.tipe === "pilih-gambar"
              ? "mt-5 grid grid-cols-2 gap-3"
              : "mt-5 flex flex-col gap-3"
          }
        >
          {sekarang.opsi.map((o) => {
            const aktif = dipilih === o.id
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => pilih(o.id)}
                disabled={mengirim}
                aria-label={o.label}
                className={`rounded-2xl border-4 p-3 text-lg font-bold transition active:translate-y-0.5 disabled:opacity-60 ${
                  aktif
                    ? "border-[#4ECDC4] bg-[#4ECDC4]/10"
                    : "border-slate-100 bg-slate-50 hover:border-[#FFD54A]"
                }`}
              >
                {o.gambar && (
                  <Image
                    src={o.gambar}
                    alt=""
                    width={256}
                    height={256}
                    className="mx-auto h-24 w-24 object-contain"
                  />
                )}
                <span className={o.gambar ? "mt-1 block text-sm" : ""}>{o.label}</span>
              </button>
            )
          })}
        </div>

        {mengirim && (
          <p className="mt-5 text-center text-sm font-semibold text-slate-500">
            Memeriksa jawabanmu…
          </p>
        )}
        {galat && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-center">
            <p className="font-bold text-red-700">{galat}</p>
            <button
              type="button"
              onClick={() => void kirim(jawaban)}
              className="mt-2 rounded-xl bg-red-600 px-5 py-2 font-bold text-white"
            >
              Coba kirim lagi
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function LayarHasil({
  hasil,
  judul,
  karakter,
  soal,
}: {
  hasil: Hasil
  judul: string
  karakter: string
  soal: SoalAman[]
}) {
  const perSoal = new Map(hasil.rincian.map((r) => [r.soalId, r]))

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
        <Image
          src={gambarKarakter(karakter, hasil.lulus ? "celebrate" : "thinking")}
          alt=""
          width={256}
          height={256}
          className="mx-auto h-36 w-36 object-contain"
          priority
        />
        <h1 className="mt-2 text-2xl font-extrabold text-slate-800">
          {hasil.lulus ? "Hebat sekali!" : "Ayo coba lagi!"}
        </h1>
        <p className="mt-1 text-slate-600">
          Benar {hasil.benar} dari {hasil.total} soal · {judul}
        </p>

        <div className="mt-4 flex justify-center gap-1" aria-label={`${hasil.bintang} dari 3 bintang`}>
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              className={`h-9 w-9 ${
                n <= hasil.bintang ? "fill-[#FFD54A] text-[#FFD54A]" : "text-slate-200"
              }`}
              aria-hidden
            />
          ))}
        </div>

        {hasil.xpDiberikan > 0 && (
          <p className="mt-3 inline-block rounded-full bg-[#FFF1D2] px-4 py-1 font-extrabold text-[#8B5A2B]">
            +{hasil.xpDiberikan} XP
          </p>
        )}
        {hasil.xpDiberikan === 0 && hasil.lulus && (
          <p className="mt-3 text-sm text-slate-400">
            Pelajaran ini sudah pernah selesai, jadi tidak ada XP tambahan.
          </p>
        )}

        <Link
          href="/junior"
          className="mt-6 block rounded-2xl bg-[#FF8C42] px-8 py-4 text-lg font-extrabold text-white shadow-lg"
        >
          Kembali ke jalur
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {soal.map((s, i) => {
          const r = perSoal.get(s.id)
          const benar = r?.benar ?? false
          const labelBenar = s.opsi.find((o) => o.id === r?.jawabanBenar)?.label
          return (
            <div key={s.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    benar ? "bg-[#4ECDC4]" : "bg-red-400"
                  }`}
                >
                  {benar ? (
                    <Check className="h-4 w-4 text-white" strokeWidth={3} aria-hidden />
                  ) : (
                    <X className="h-4 w-4 text-white" strokeWidth={3} aria-hidden />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-700">
                    {i + 1}. {s.perintah}
                  </p>
                  {!benar && labelBenar && (
                    <p className="mt-1 text-sm text-slate-600">
                      Jawaban yang benar: <strong>{labelBenar}</strong>
                    </p>
                  )}
                  {r?.pembahasan && <p className="mt-1 text-sm text-slate-500">{r.pembahasan}</p>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
