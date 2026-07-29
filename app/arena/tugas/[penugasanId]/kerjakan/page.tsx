"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  BookOpen, Target, Lightbulb, ArrowRight, ArrowLeft, CheckCircle2, Trophy, Loader2,
  Upload, FileText, Clock, Award,
} from "lucide-react"

type Q = { id: string; question: string; options: string[]; tipe: "PG" | "BENAR_SALAH" | "ISIAN" }
type Materi = { judul: string; isi: string[]; contoh: string[]; catatan?: string }
type Sub = {
  status: string; score: number | null
  praktikUrl?: string | null; praktikNilai?: number | null; praktikCatatan?: string | null; praktikDinilai?: boolean
}
type Data = {
  jenis: string
  judul: string
  unitTitle: string
  belajar?: { tujuan: string[]; materi: Materi[]; rangkuman: string[] }
  latihan?: Q[]
  kuis?: Q[]
  reading?: { title: string; text: string } | null
  praktik?: { petunjuk: string; tips: string[]; contoh?: string } | null
  submission: Sub | null
}
type Phase = "belajar" | "latihan" | "praktik" | "kuis" | "done"

function QuestionList({ questions, answers, setAnswers }: {
  questions: Q[]; answers: Record<string, string | number>; setAnswers: (fn: (a: Record<string, string | number>) => Record<string, string | number>) => void
}) {
  return (
    <>
      {questions.map((q, idx) => (
        <div key={q.id} className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="font-semibold text-gray-900 text-sm mb-3"><span className="text-violet-500 mr-1">{idx + 1}.</span>{q.question}</p>
          {q.tipe === "ISIAN" ? (
            <input
              value={(answers[q.id] as string) ?? ""}
              onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
              placeholder="Ketik jawaban..."
              className="w-full rounded-xl border-2 border-gray-200 focus:border-violet-500 focus:outline-none p-3 text-sm"
            />
          ) : (
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const selected = Number(answers[q.id]) === oi
                return (
                  <button
                    key={oi}
                    onClick={() => setAnswers(a => ({ ...a, [q.id]: oi }))}
                    className={`w-full flex items-center gap-2.5 text-left p-3 rounded-xl border-2 text-sm transition-all ${selected ? "border-violet-500 bg-violet-50 font-medium" : "border-gray-200 hover:border-violet-300"}`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold shrink-0 ${selected ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-500"}`}>{String.fromCharCode(65 + oi)}</span>
                    {opt}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </>
  )
}

export default function KerjakanTugasPage() {
  const { penugasanId } = useParams<{ penugasanId: string }>()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>("belajar")
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; correct: number; total: number } | null>(null)
  const [error, setError] = useState("")
  const [praktikUrl, setPraktikUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/murid/penugasan/${penugasanId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const dt: Data = d.data
        setData(dt)
        setPhase(dt.jenis === "KUIS" ? "kuis" : dt.jenis === "LATIHAN" ? "latihan" : dt.jenis === "PRAKTIK" ? "praktik" : "belajar")
        setPraktikUrl(dt.submission?.praktikUrl ?? null)
      })
      .catch(() => setError("Gagal memuat tugas."))
      .finally(() => setLoading(false))
  }, [penugasanId])

  const isKuis = data?.jenis === "KUIS"
  const hasLatihan = (data?.latihan?.length ?? 0) > 0
  const hasPraktik = !!data?.praktik

  const submit = async () => {
    if (submitting) return
    setSubmitting(true); setError("")
    try {
      const res = await fetch(`/api/murid/penugasan/${penugasanId}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }),
      })
      if (!res.ok) throw new Error()
      const d = await res.json()
      setResult(d.data); setPhase("done")
    } catch {
      setError(isKuis ? "Ulangan belum berhasil dikirim. Coba lagi." : "Tugas belum berhasil dikirim. Coba lagi.")
    } finally { setSubmitting(false) }
  }

  const uploadPraktik = async (file: File) => {
    setUploading(true); setError("")
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("folder", "praktik")
      const up = await fetch("/api/upload/file", { method: "POST", body: fd })
      const upd = await up.json()
      if (!up.ok || !upd.url) throw new Error(upd.error || "gagal")
      const res = await fetch(`/api/murid/penugasan/${penugasanId}/praktik`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: upd.url }),
      })
      if (!res.ok) throw new Error()
      setPraktikUrl(upd.url)
    } catch {
      setError("Berkas praktik belum berhasil diunggah. Coba lagi.")
    } finally { setUploading(false) }
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
  if (!data) return (
    <div className="p-6 text-center py-20">
      <p className="text-gray-500">{error || "Tugas tidak ditemukan."}</p>
      <Link href="/arena/tugas" className="inline-block mt-4 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold">Kembali</Link>
    </div>
  )

  const steps: Phase[] = isKuis ? ["kuis"]
    : data.jenis === "LATIHAN" ? ["latihan"]
    : data.jenis === "PRAKTIK" ? ["praktik"]
    : (["belajar", ...(hasLatihan ? ["latihan"] : []), ...(hasPraktik ? ["praktik"] : [])] as Phase[])
  const stepLabel: Record<Phase, string> = { belajar: "Belajar", latihan: "Latihan", praktik: "Praktik", kuis: "Ulangan", done: "" }
  const nextPhase = steps[steps.indexOf(phase) + 1]

  return (
    <div className="owns-bottom-bar min-h-screen bg-[#F7F6FF] pb-28">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/arena/tugas" className="text-gray-400 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="min-w-0">
          <p className="text-[11px] text-violet-500 font-semibold truncate">{isKuis ? "Ulangan Harian" : "Tugas"} · {data.unitTitle}</p>
          <h1 className="text-sm font-bold text-gray-900 truncate">{data.judul}</h1>
        </div>
      </div>

      {phase !== "done" && steps.length > 1 && (
        <div className="flex items-center gap-1.5 px-4 pt-3">
          {steps.map((p) => <div key={p} className={`h-1.5 flex-1 rounded-full ${phase === p ? "bg-violet-500" : "bg-violet-100"}`} />)}
        </div>
      )}

      <div className="px-4 py-4 max-w-2xl mx-auto">
        {/* KUIS */}
        {phase === "kuis" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700">Ulangan harian — jawab semua soal, nilaimu langsung keluar setelah dikirim.</p>
            </div>
            {(data.kuis?.length ?? 0) === 0
              ? <p className="text-center text-gray-400 py-10 text-sm">Belum ada soal ulangan.</p>
              : <QuestionList questions={data.kuis!} answers={answers} setAnswers={setAnswers} />}
          </div>
        )}

        {/* BELAJAR */}
        {phase === "belajar" && data.belajar && (
          <div className="space-y-4">
            {data.belajar.tujuan.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-violet-500" /> Tujuan Pembelajaran</h2>
                <ul className="space-y-1.5">
                  {data.belajar.tujuan.map((t, i) => <li key={i} className="flex gap-2 text-sm text-gray-600"><span className="text-violet-400 font-bold">{i + 1}.</span>{t}</li>)}
                </ul>
              </div>
            )}
            {data.belajar.materi.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-violet-500" />{m.judul}</h3>
                <div className="space-y-1.5 text-sm text-gray-700 leading-relaxed">{m.isi.map((line, j) => <p key={j}>{line}</p>)}</div>
                {m.contoh.length > 0 && (
                  <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-[11px] font-bold text-amber-600 uppercase mb-1">Contoh</p>
                    {m.contoh.map((c, j) => <p key={j} className="text-sm text-amber-800">{c}</p>)}
                  </div>
                )}
                {m.catatan && <p className="mt-2 text-xs text-blue-600 bg-blue-50 rounded-lg p-2">{m.catatan}</p>}
              </div>
            ))}
            {data.belajar.rangkuman.length > 0 && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
                <h3 className="font-bold text-emerald-700 mb-2">Rangkuman</h3>
                <ul className="space-y-1.5">{data.belajar.rangkuman.map((r, i) => <li key={i} className="flex gap-2 text-sm text-emerald-800"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />{r}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        {/* LATIHAN */}
        {phase === "latihan" && (
          <div className="space-y-4">
            {data.reading && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200/70 p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Bacaan</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{data.reading.text}</p>
              </div>
            )}
            {!hasLatihan ? <p className="text-center text-gray-400 py-10 text-sm">Tidak ada latihan.</p>
              : <QuestionList questions={data.latihan!} answers={answers} setAnswers={setAnswers} />}
          </div>
        )}

        {/* PRAKTIK */}
        {phase === "praktik" && data.praktik && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-2"><Lightbulb className="w-4 h-4 text-amber-500" /> Petunjuk Praktik</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{data.praktik.petunjuk}</p>
            </div>
            {data.praktik.tips.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-bold text-gray-900 mb-2">Langkah</h3>
                <ul className="space-y-1.5">{data.praktik.tips.map((t, i) => <li key={i} className="flex gap-2 text-sm text-gray-600"><span className="text-amber-500 font-bold">{i + 1}.</span>{t}</li>)}</ul>
              </div>
            )}

            {/* Upload hasil praktik → guru review */}
            <div className="bg-white rounded-2xl border-2 border-dashed border-violet-200 p-4">
              <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2"><Upload className="w-4 h-4 text-violet-500" /> Unggah Hasil Praktik</h3>
              <p className="text-xs text-gray-500 mb-3">Foto atau dokumen hasil kerjamu. Guru akan menilai secara manual.</p>
              {data.submission?.praktikDinilai ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <p className="text-sm font-bold text-emerald-700">Sudah dinilai: {data.submission.praktikNilai}</p>
                  {data.submission.praktikCatatan && <p className="text-xs text-emerald-600 mt-1">Catatan guru: {data.submission.praktikCatatan}</p>}
                </div>
              ) : praktikUrl ? (
                <div className="flex items-center gap-2 bg-violet-50 rounded-xl p-3">
                  <FileText className="w-4 h-4 text-violet-600 shrink-0" />
                  <a href={praktikUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-700 font-medium truncate flex-1">Berkas terkirim — lihat</a>
                  <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1"><Clock size={12} /> Menunggu review</span>
                  <button onClick={() => fileRef.current?.click()} className="text-[11px] text-gray-400 underline shrink-0">Ganti</button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full py-3 rounded-xl bg-violet-50 text-violet-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengunggah...</> : <><Upload className="w-4 h-4" /> Pilih Berkas</>}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadPraktik(f) }} />
            </div>
          </div>
        )}

        {/* DONE */}
        {phase === "done" && result && (
          <div className="text-center py-10">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4"><Trophy className="w-10 h-10 text-white" /></div>
            <h2 className="text-2xl font-black text-gray-900">{isKuis ? "Ulangan Selesai!" : "Tugas Selesai!"}</h2>
            <p className="text-5xl font-black text-violet-600 my-3">{result.score}</p>
            <p className="text-sm text-gray-500">{result.total > 0 ? `${result.correct} dari ${result.total} benar` : "Selesai"}</p>
            <p className="text-xs text-gray-400 mt-1">Nilaimu otomatis masuk ke rekap guru.</p>
            {!isKuis && hasPraktik && !data.submission?.praktikDinilai && (
              <p className="text-xs text-amber-600 mt-2">Praktikmu menunggu penilaian guru.</p>
            )}
            <Link href="/arena/tugas" className="inline-block mt-6 px-6 py-3 bg-violet-600 text-white rounded-xl text-sm font-bold">Kembali ke Tugas</Link>
          </div>
        )}

        {error && phase !== "done" && <p className="text-xs text-red-500 text-center mt-4">{error}</p>}
      </div>

      {/* Bottom action */}
      {phase !== "done" && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-gray-100 px-4 py-3 safe-area-bottom">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => { if (nextPhase) setPhase(nextPhase); else submit() }}
              disabled={submitting}
              className="w-full py-3.5 bg-violet-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</>
                : nextPhase ? <>Lanjut ke {stepLabel[nextPhase]} <ArrowRight className="w-4 h-4" /></>
                : isKuis ? <>Selesaikan Ulangan <ArrowRight className="w-4 h-4" /></>
                : <>Selesaikan Tugas <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
