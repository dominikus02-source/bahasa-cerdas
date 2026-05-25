"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  BookOpen, ArrowLeft, Send, CheckCircle, XCircle, Lightbulb,
  Target, Sparkles, Brain, Maximize2, Minimize2, Eye, EyeOff,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Soal = { id: number; soal: string; opsi: string[]; jawaban: number; penjelasan: string }
type Konten = {
  belajar: { tujuan: string[]; materi: { judul: string; isi: string[]; contoh: string[]; catatan?: string }[]; rangkuman: string[] }
  latihan: Soal[]
  praktik: { petunjuk: string; tips: string[]; contoh?: string }
  kuis: Soal[]
}

type TabKey = "belajar" | "latihan" | "praktik" | "kuis"

const TAB_ORDER: TabKey[] = ["belajar", "latihan", "praktik", "kuis"]

export default function UnitPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const unitId = params.unitId as string

  const [data, setData] = useState<any>(null)
  const [content, setContent] = useState<Konten | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>("belajar")
  const [showAnswers, setShowAnswers] = useState(false)
  const [groups, setGroups] = useState<{ id: string; name: string; grade: string }[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [tenggat, setTenggat] = useState("")
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [presentMode, setPresentMode] = useState(false)
  const [presentTab, setPresentTab] = useState<TabKey>("belajar")

  useEffect(() => {
    fetch(`/api/guru/panduan/${unitId}`)
      .then(r => r.json())
      .then(d => { if (d.data) { setData(d.data); if (d.data.content) setContent(JSON.parse(d.data.content)) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [unitId])

  useEffect(() => {
    fetch("/api/group").then(r => r.json()).then(d => { if (d.data) setGroups(d.data) }).catch(() => {})
  }, [])

  const goTab = useCallback((dir: 1 | -1) => {
    setPresentTab(prev => {
      const idx = TAB_ORDER.indexOf(prev)
      const next = idx + dir
      if (next < 0 || next >= TAB_ORDER.length) return prev
      return TAB_ORDER[next]
    })
  }, [])

  useEffect(() => {
    if (!presentMode) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresentMode(false)
      if (e.key === "ArrowRight") goTab(1)
      if (e.key === "ArrowLeft") goTab(-1)
      if (e.key === "a" || e.key === "A") setShowAnswers(prev => !prev)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [presentMode, goTab])

  const handleAssign = async () => {
    if (!data || selectedGroups.length === 0) return
    setAssignLoading(true)
    try {
      const res = await fetch("/api/guru/penugasan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: data.id, groupIds: selectedGroups, judul: data.title, tenggat: tenggat || null }),
      })
      if (res.ok) { setAssignSuccess(true); setTimeout(() => { setShowAssign(false); setAssignSuccess(false); setSelectedGroups([]); setTenggat("") }, 1500) }
    } catch {}
    setAssignLoading(false)
  }

  if (loading) return (
    <div className="p-6 max-w-4xl mx-auto animate-pulse space-y-4">
      <div className="h-8 bg-slate-200 rounded w-1/3" /><div className="h-4 bg-slate-100 rounded w-1/2" /><div className="h-64 bg-slate-100 rounded-xl" />
    </div>
  )

  if (!data || !content) return (
    <div className="p-6 max-w-4xl mx-auto text-center py-16">
      <p className="text-slate-500">Unit tidak ditemukan</p>
      <Button variant="outline" onClick={() => router.back()} className="mt-4">Kembali</Button>
    </div>
  )

  const tabs = [
    { key: "belajar" as TabKey, label: "Belajar", icon: BookOpen },
    { key: "latihan" as TabKey, label: "Latihan", icon: Target, count: content.latihan.length },
    { key: "praktik" as TabKey, label: "Praktik", icon: Lightbulb },
    { key: "kuis" as TabKey, label: "Kuis", icon: Sparkles, count: content.kuis.length },
  ]

  if (presentMode) return (
    <PresentationView
      data={data}
      content={content}
      tab={presentTab}
      setTab={setPresentTab}
      showAnswers={showAnswers}
      setShowAnswers={setShowAnswers}
      onClose={() => { setPresentMode(false); setShowAnswers(false) }}
      goTab={goTab}
    />
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg mt-1">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-[10px]">{data.grade} — Semester {data.semester}</Badge>
            <Badge variant="secondary" className="text-[10px]">KD {data.kd || "-"}</Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{data.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{data.level?.title}</p>
        </div>
        <Button onClick={() => setPresentMode(true)} variant="outline" className="shrink-0 border-emerald-200 text-emerald-600 hover:bg-emerald-50">
          <Maximize2 className="w-4 h-4 mr-2" />
          Tayangkan
        </Button>
        <Button onClick={() => setShowAssign(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
          <Send className="w-4 h-4 mr-2" />
          Kirim ke Kelas
        </Button>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeTab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <t.icon className="w-4 h-4" />{t.label}
            {t.count !== undefined && <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-[9px]">{t.count}</span>}
          </button>
        ))}
      </div>

      <ContentPanel content={content} tab={activeTab} showAnswers={showAnswers} setShowAnswers={setShowAnswers} />
    </div>
  )
}

function ContentPanel({ content, tab, showAnswers, setShowAnswers }: {
  content: Konten; tab: TabKey; showAnswers: boolean; setShowAnswers: (v: boolean) => void
}) {
  if (tab === "belajar") return <BelajarContent content={content.belajar} />
  if (tab === "latihan") return <SoalContent label="Latihan" soal={content.latihan} showAnswers={showAnswers} setShowAnswers={setShowAnswers} />
  if (tab === "praktik") return <PraktikContent content={content.praktik} />
  if (tab === "kuis") return <SoalContent label="Kuis" soal={content.kuis} showAnswers={showAnswers} setShowAnswers={setShowAnswers} />
  return null
}

function BelajarContent({ content }: { content: Konten["belajar"] }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-emerald-500" />Tujuan Pembelajaran</h2>
        <ul className="space-y-1.5">
          {content.tujuan.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
              {t}
            </li>
          ))}
        </ul>
      </div>
      {content.materi.map((m, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900 mb-3">{m.judul}</h2>
          <div className="space-y-2">
            {m.isi.map((line, j) => renderContentLine(line, j))}
          </div>
          {m.contoh.length > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">Contoh:</p>
              {m.contoh.map((c, j) => <p key={j} className="text-sm text-amber-900 whitespace-pre-line">{c}</p>)}
            </div>
          )}
          {m.catatan && (
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">{m.catatan}</p>
            </div>
          )}
        </div>
      ))}
      {content.rangkuman.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h3 className="font-bold text-emerald-800 mb-2 text-sm">Rangkuman</h3>
          <ul className="space-y-1">
            {content.rangkuman.map((r, i) => (
              <li key={i} className="text-sm text-emerald-700 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SoalContent({ label, soal, showAnswers, setShowAnswers }: { label: string; soal: Soal[]; showAnswers: boolean; setShowAnswers: (v: boolean) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{soal.length} soal {label.toLowerCase()}</p>
        <Button variant="outline" size="sm" onClick={() => setShowAnswers(!showAnswers)}
          className={`text-xs ${showAnswers ? "text-emerald-600 border-emerald-200" : ""}`}>
          {showAnswers ? <><EyeOff className="w-3.5 h-3.5 mr-1" />Sembunyikan Jawaban</> : <><Eye className="w-3.5 h-3.5 mr-1" />Tampilkan Jawaban</>}
        </Button>
      </div>
      {soal.map((q, i) => (
        <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-900 mb-3"><span className={`font-bold mr-2 ${label === "Kuis" ? "text-violet-600" : "text-emerald-600"}`}>{i + 1}.</span>{q.soal}</p>
          <div className="space-y-1.5 mb-2">
            {q.opsi.map((o, j) => {
              const isCorrect = j === q.jawaban
              return (
                <div key={j} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${showAnswers && isCorrect ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-slate-700"}`}>
                  <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-500 font-medium shrink-0">
                    {String.fromCharCode(65 + j)}
                  </span>
                  {o}{showAnswers && isCorrect && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
                </div>
              )
            })}
          </div>
          {showAnswers && q.penjelasan && <p className="text-xs text-slate-500 italic mt-2 border-t border-slate-100 pt-2">{q.penjelasan}</p>}
        </div>
      ))}
    </div>
  )
}

function PraktikContent({ content }: { content: Konten["praktik"] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" />Petunjuk Praktik</h2>
      <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-4">{content.petunjuk}</div>
      {content.tips.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
          <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1"><Brain className="w-3.5 h-3.5" />Tips</p>
          <ul className="space-y-1">{content.tips.map((t, i) => <li key={i} className="text-sm text-blue-700 flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />{t}</li>)}</ul>
        </div>
      )}
      {content.contoh && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">Contoh:</p>
          <p className="text-sm text-amber-900 whitespace-pre-line">{content.contoh}</p>
        </div>
      )}
    </div>
  )
}

function PresentationView({ data, content, tab, setTab, showAnswers, setShowAnswers, onClose, goTab }: {
  data: any; content: Konten; tab: TabKey; setTab: (t: TabKey) => void
  showAnswers: boolean; setShowAnswers: (v: boolean) => void; onClose: () => void; goTab: (d: 1 | -1) => void
}) {
  const tabs = [
    { key: "belajar" as TabKey, label: "Belajar", icon: BookOpen },
    { key: "latihan" as TabKey, label: "Latihan", icon: Target, count: content.latihan.length },
    { key: "praktik" as TabKey, label: "Praktik", icon: Lightbulb },
    { key: "kuis" as TabKey, label: "Kuis", icon: Sparkles, count: content.kuis.length },
  ]

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      {/* Bar */}
      <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Tutup (Esc)">
            <Minimize2 className="w-4 h-4 text-slate-500" />
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-[10px]">{data.grade} — Semester {data.semester}</Badge>
          <span className="text-sm font-semibold text-slate-800 truncate">{data.title}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">←</kbd><span className="hidden sm:inline">/</span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">→</kbd>
          <span className="hidden sm:inline">ganti bagian</span>
          <span className="mx-1">·</span>
          <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">A</kbd>
          <span className="hidden sm:inline">jawaban</span>
          <span className="mx-1">·</span>
          <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">Esc</kbd>
          <span className="hidden sm:inline">tutup</span>
        </div>
      </div>

      {/* Tab nav */}
      <div className="px-6 py-2 border-b border-slate-100 flex items-center gap-1.5 shrink-0 bg-slate-50/50">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? "bg-white text-emerald-700 shadow-sm border border-emerald-200" : "text-slate-500 hover:text-slate-700"}`}>
            <t.icon className="w-4 h-4" />{t.label}
            {t.count !== undefined && <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-[10px] font-bold">{t.count}</span>}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setShowAnswers(!showAnswers)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showAnswers ? "bg-emerald-100 text-emerald-700" : "text-slate-400 hover:text-slate-600"}`}>
          {showAnswers ? <><EyeOff className="w-3.5 h-3.5" />Sembunyi</> : <><Eye className="w-3.5 h-3.5" />Jawaban</>}
        </button>
      </div>

      {/* Content — scrollable, large text */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto text-lg space-y-6">
          {tab === "belajar" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Target className="w-6 h-6 text-emerald-500" />Tujuan Pembelajaran</h2>
                <ul className="space-y-2">
                  {content.belajar.tujuan.map((t, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-slate-800">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {content.belajar.materi.map((m, i) => (
                <div key={i}>
                  <h2 className="text-xl font-bold text-slate-900 mb-4">{m.judul}</h2>
                  <div className="space-y-3">{[...m.isi.filter(l => !l.startsWith("R:")), ...(m.contoh.length > 0 ? ["---CONTOH---"] : []), ...m.contoh].map((line, j) => {
                    if (line === "---CONTOH---") return <div key={j} className="bg-amber-50 border border-amber-200 rounded-lg p-4"><p className="text-sm font-semibold text-amber-800 mb-2">Contoh:</p></div>
                    if (m.contoh.includes(line)) return <p key={j} className="text-amber-900 bg-amber-50/50 -mt-2 px-4 py-1 rounded-lg">{line}</p>
                    if (!line.trim()) return <div key={j} className="h-3" />
                    const isBullet = line.startsWith("•")
                    const isNumbered = /^\d+\./.test(line)
                    if (isBullet) return <p key={j} className="flex items-start gap-3 text-slate-800"><span className="w-2 h-2 rounded-full bg-emerald-400 mt-2.5 shrink-0" />{line.slice(1).trim()}</p>
                    if (isNumbered) { const m2 = line.match(/^(\d+)\.\s*(.*)/); if (m2) return <p key={j} className="flex items-start gap-3"><span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">{m2[1]}</span><span className="text-slate-800">{m2[2]}</span></p> }
                    return <p key={j} className="text-slate-800 leading-relaxed">{line}</p>
                  })}</div>
                  {m.catatan && <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3"><Sparkles className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" /><p className="text-blue-800">{m.catatan}</p></div>}
                </div>
              ))}
              {content.belajar.rangkuman.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                  <h3 className="font-bold text-emerald-800 mb-3">Rangkuman</h3>
                  <ul className="space-y-2">{content.belajar.rangkuman.map((r, i) => (
                    <li key={i} className="flex items-start gap-3 text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" /><span>{r}</span></li>
                  ))}</ul>
                </div>
              )}
            </div>
          )}

          {tab === "latihan" && <SoalPresentation soal={content.latihan} label="Latihan" showAnswers={showAnswers} color="emerald" />}
          {tab === "praktik" && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Lightbulb className="w-6 h-6 text-amber-500" />Praktik</h2>
              <div className="text-slate-800 leading-relaxed whitespace-pre-line text-lg mb-6">{content.praktik.petunjuk}</div>
              {content.praktik.tips.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <p className="font-semibold text-blue-800 mb-2 flex items-center gap-2"><Brain className="w-5 h-5" />Tips</p>
                  <ul className="space-y-2">{content.praktik.tips.map((t, i) => <li key={i} className="flex items-start gap-3 text-blue-700"><span className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />{t}</li>)}</ul>
                </div>
              )}
              {content.praktik.contoh && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="font-semibold text-amber-800 mb-2">Contoh:</p>
                  <p className="text-amber-900 whitespace-pre-line">{content.praktik.contoh}</p>
                </div>
              )}
            </div>
          )}
          {tab === "kuis" && <SoalPresentation soal={content.kuis} label="Kuis" showAnswers={showAnswers} color="violet" />}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <button onClick={() => goTab(-1)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100">
          <ChevronLeft className="w-4 h-4" />Sebelumnya
        </button>
        <span className="text-xs text-slate-400">
          {tab.charAt(0).toUpperCase() + tab.slice(1)} · {TAB_ORDER.indexOf(tab) + 1}/{TAB_ORDER.length}
        </span>
        <button onClick={() => goTab(1)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100">
          Selanjutnya<ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function SoalPresentation({ soal, label, showAnswers, color }: { soal: Soal[]; label: string; showAnswers: boolean; color: string }) {
  const colorClasses = color === "violet" ? "text-violet-600" : "text-emerald-600"
  const bgColor = color === "violet" ? "bg-violet-50" : "bg-emerald-50"

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Target className={`w-6 h-6 ${colorClasses}`} />{label} ({soal.length} soal)</h2>
      <div className="space-y-6">
        {soal.map((q, i) => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-lg font-semibold text-slate-900 mb-4"><span className={`font-bold mr-3 ${colorClasses}`}>{i + 1}.</span>{q.soal}</p>
            <div className="space-y-2">
              {q.opsi.map((o, j) => {
                const isCorrect = j === q.jawaban
                return (
                  <div key={j} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base ${showAnswers && isCorrect ? `${bgColor} border-2 border-emerald-300` : "border border-slate-200"}`}>
                    <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 ${isCorrect && showAnswers ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-slate-500"}`}>
                      {String.fromCharCode(65 + j)}
                    </span>
                    <span className={isCorrect && showAnswers ? "font-semibold text-emerald-800" : "text-slate-800"}>{o}</span>
                    {showAnswers && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto shrink-0" />}
                  </div>
                )
              })}
            </div>
            {showAnswers && q.penjelasan && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-800">{q.penjelasan}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function renderContentLine(line: string, key: number) {
  if (!line.trim()) return <div key={key} className="h-2" />
  if (line.startsWith("R:")) return null

  let className = "text-sm text-slate-700 leading-relaxed"
  let prefix = null

  if (line.startsWith("✓")) { className = "text-sm text-emerald-700 flex items-start gap-2"; prefix = <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />; line = line.slice(1).trim() }
  else if (line.startsWith("✗")) { className = "text-sm text-red-600 flex items-start gap-2"; prefix = <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />; line = line.slice(1).trim() }
  else if (/^\d+\./.test(line)) { const m = line.match(/^(\d+)\.\s*(.*)/); if (m) { className = "text-sm text-slate-700 flex items-start gap-2"; prefix = <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{m[1]}</span>; line = m[2] } }
  else if (line.startsWith("•")) { className = "text-sm text-slate-700 flex items-start gap-2"; prefix = <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />; line = line.slice(1).trim() }
  else if (line.startsWith("PENTING:")) { className = "text-sm text-amber-800 bg-amber-50 px-3 py-2 rounded-lg flex items-start gap-2"; prefix = <span className="font-bold shrink-0">PENTING:</span>; line = line.replace("PENTING:", "").trim() }
  else if (line.startsWith("BENAR:")) { className = "text-sm text-emerald-700 flex items-start gap-2"; prefix = <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />; line = line.replace("BENAR:", "").trim() }
  else if (line.startsWith("SALAH:")) { className = "text-sm text-red-600 flex items-start gap-2"; prefix = <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />; line = line.replace("SALAH:", "").trim() }
  else if (line.startsWith("Tips")) { className = "text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg flex items-start gap-2"; prefix = <Brain className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" /> }

  return <p key={key} className={className}>{prefix}{line}</p>
}
