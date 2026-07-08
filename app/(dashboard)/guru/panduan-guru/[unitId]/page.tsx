"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  BookOpen, ArrowLeft, Send, CheckCircle, XCircle, Lightbulb,
  Target, Sparkles, Brain, Maximize2, Minimize2, Eye, EyeOff,
  ChevronLeft, ChevronRight, ImageIcon, Loader2, Wand2,
  FileText, HelpCircle, ClipboardList,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Soal = { id: number; tipe?: "PG" | "BENAR_SALAH" | "ISIAN"; soal: string; opsi: string[]; jawaban: number | string; penjelasan: string }
type Konten = {
  belajar: { tujuan: string[]; materi: { judul: string; isi: string[]; contoh: string[]; catatan?: string }[]; rangkuman: string[] }
  latihan: Soal[]
  praktik: { petunjuk: string; tips: string[]; contoh?: string }
  kuis: Soal[]
  guide?: {
    learningGoals: string[]
    keyConcepts: {
      definition: string
      characteristics: string[]
      structure: { name: string; description: string }[]
      languageFeatures: string[]
      examples: { label: string; content: string; analysis?: string }[]
    }
    languageFocus: { aspects: string[]; notes?: string }
    activities: { opening: string[]; core: string[]; group: string[]; reflection: string[] }
    studentTasks: { type: string; description: string }[]
    assessment: { diagnostic: { question: string; purpose: string }[]; formative: { method: string; criteria: string[] }[]; summative: { type: string; description: string }[] }
    rubric: { aspects: { name: string; criteria: { level: string; description: string }[] }[] }
    differentiation: { support: string[]; challenge: string[] }
    remedial: string[]
    enrichment: string[]
    teacherNotes: string[]
    tags: string[]
  }
}

type TabKey = "belajar" | "latihan" | "praktik" | "kuis" | "panduan"

const TAB_ORDER: TabKey[] = ["belajar", "latihan", "praktik", "kuis", "panduan"]

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
  const [ilustrasiUrls, setIlustrasiUrls] = useState<Record<string, string>>({})

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

  useEffect(() => {
    if (!content) return
    const prompts = new Set<string>()
    content.belajar.materi.forEach(m => {
      ;(m.isi ?? []).forEach(l => { const t = l.trim(); if (t.startsWith("[Ilustrasi:")) prompts.add(t.slice(11).trim().replace(/\]$/, "")) })
      ;(m.contoh ?? []).forEach(c => { const t = c.trim(); if (t.startsWith("[Ilustrasi:")) prompts.add(t.slice(11).trim().replace(/\]$/, "")) })
    })
    if (prompts.size === 0) return
    ;(async () => {
      const results = await Promise.allSettled(
        [...prompts].map(async prompt => {
          const res = await fetch(`/api/ai/ilustrasi?prompt=${encodeURIComponent(prompt)}`)
          const data = await res.json()
          if (data.url) return [prompt, data.url] as const
          return null
        })
      )
      const newUrls: Record<string, string> = {}
      results.forEach(r => {
        if (r.status === "fulfilled" && r.value) newUrls[r.value[0]] = r.value[1]
      })
      setIlustrasiUrls(prev => ({ ...prev, ...newUrls }))
    })()
  }, [content])

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
    { key: "panduan" as TabKey, label: "Panduan Guru", icon: ClipboardList },
  ]

  const gradeParam = data?.grade?.toLowerCase() || ""

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
      ilustrasiUrls={ilustrasiUrls}
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
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => setPresentMode(true)} variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50">
            <Maximize2 className="w-4 h-4 mr-2" />
            Tayangkan
          </Button>
          <Button onClick={() => setShowAssign(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Send className="w-4 h-4 mr-2" />
            Kirim ke Kelas
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          size="sm"
          variant="outline"
          className="border-violet-200 text-violet-600 hover:bg-violet-50"
          onClick={() => window.open(`/guru/ai-tools?tool=rpp&topic=${encodeURIComponent(data.title)}&grade=${gradeParam}`, "_blank")}
        >
          <FileText className="w-3.5 h-3.5 mr-1" />
          Buat RPP
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-violet-200 text-violet-600 hover:bg-violet-50"
          onClick={() => window.open(`/guru/ai-tools?tool=soal&topic=${encodeURIComponent(data.title)}&grade=${gradeParam}`, "_blank")}
        >
          <HelpCircle className="w-3.5 h-3.5 mr-1" />
          Buat Soal
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-violet-200 text-violet-600 hover:bg-violet-50"
          onClick={() => window.open(`/guru/ai-tools?tool=ppt&topic=${encodeURIComponent(data.title)}&grade=${gradeParam}`, "_blank")}
        >
          <Wand2 className="w-3.5 h-3.5 mr-1" />
          Buat PPT
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

      <ContentPanel content={content} tab={activeTab} showAnswers={showAnswers} setShowAnswers={setShowAnswers} ilustrasiUrls={ilustrasiUrls} />
    </div>
  )
}

function ContentPanel({ content, tab, showAnswers, setShowAnswers, ilustrasiUrls }: {
  content: Konten; tab: TabKey; showAnswers: boolean; setShowAnswers: (v: boolean) => void; ilustrasiUrls: Record<string, string>
}) {
  if (tab === "belajar") return <BelajarContent content={content.belajar} ilustrasiUrls={ilustrasiUrls} />
  if (tab === "latihan") return <SoalContent label="Latihan" soal={content.latihan} showAnswers={showAnswers} setShowAnswers={setShowAnswers} />
  if (tab === "praktik") return <PraktikContent content={content.praktik} />
  if (tab === "kuis") return <SoalContent label="Kuis" soal={content.kuis} showAnswers={showAnswers} setShowAnswers={setShowAnswers} />
  if (tab === "panduan" && content.guide) return <GuideContent guide={content.guide} />
  return null
}

function BelajarContent({ content, ilustrasiUrls }: { content: Konten["belajar"]; ilustrasiUrls: Record<string, string> }) {
  const renderLine = (line: string, key: number) => {
    if (!line.trim()) return <div key={key} className="h-2" />
    if (line.startsWith("R:")) return null
    const t = line.trim()
    if (t.startsWith("[Ilustrasi:")) {
      const prompt = t.slice(11).trim().replace(/\]$/, "")
      const url = ilustrasiUrls[prompt]
      return (
        <div key={key} className="my-3 rounded-xl overflow-hidden border border-violet-200 bg-violet-50">
          {url ? (
            <img src={url} alt={prompt} className="w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex items-center justify-center h-48 bg-violet-100 animate-pulse">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm">
            <ImageIcon className="w-4 h-4 text-violet-500 shrink-0" />
            <p className="text-xs text-violet-700 italic">{prompt}</p>
          </div>
        </div>
      )
    }
    return renderContentLine(line, key)
  }

  const renderContohLine = (line: string, key: number) => {
    const t = line.trim()
    if (t.startsWith("[Ilustrasi:")) {
      const prompt = t.slice(11).trim().replace(/\]$/, "")
      const url = ilustrasiUrls[prompt]
      return (
        <div key={key} className="my-2 rounded-xl overflow-hidden border border-amber-200 bg-amber-50">
          {url ? (
            <img src={url} alt={prompt} className="w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex items-center justify-center h-48 bg-amber-100 animate-pulse">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm">
            <ImageIcon className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 italic">{prompt}</p>
          </div>
        </div>
      )
    }
    return <p key={key} className="text-sm text-amber-900 whitespace-pre-line">{line}</p>
  }

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
            {(m.isi ?? []).map((line, j) => renderLine(line, j))}
          </div>
          {(m.contoh?.length ?? 0) > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">Contoh:</p>
              {(m.contoh ?? []).map((c, j) => renderContohLine(c, j))}
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
      {(content.rangkuman?.length ?? 0) > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h3 className="font-bold text-emerald-800 mb-2 text-sm">Rangkuman</h3>
          <ul className="space-y-1">
            {content.rangkuman!.map((r, i) => (
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
      {soal.map((q, i) => {
        const tipe = q.tipe || "PG"
        const jawabStr = tipe === "ISIAN" ? q.jawaban as string : (q.opsi[q.jawaban as number] ?? "")
        const jawabNum = q.jawaban as number
        return (
        <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-900 mb-3">
            <span className={`font-bold mr-2 ${label === "Kuis" ? "text-violet-600" : "text-emerald-600"}`}>{i + 1}.</span>
            {q.soal}
            {tipe !== "PG" && <span className="ml-2 text-[10px] text-slate-400 font-normal">({tipe === "BENAR_SALAH" ? "Benar/Salah" : "Isian"})</span>}
          </p>
          {tipe === "ISIAN" ? (
            <div className="text-sm text-slate-600">
              {showAnswers && <p className="text-emerald-700 font-medium">Jawaban: <strong>{jawabStr}</strong></p>}
            </div>
          ) : (
          <div className="space-y-1.5 mb-2">
            {q.opsi.map((o, j) => {
              const isCorrect = tipe === "BENAR_SALAH" ? j === jawabNum : j === jawabNum
              return (
                <div key={j} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${showAnswers && isCorrect ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-slate-700"}`}>
                  <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-500 font-medium shrink-0">
                    {tipe === "BENAR_SALAH" ? (j === 0 ? "✓" : "✗") : String.fromCharCode(65 + j)}
                  </span>
                  {o}{showAnswers && isCorrect && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
                </div>
              )
            })}
          </div>
          )}
          {showAnswers && q.penjelasan && <p className="text-xs text-slate-500 italic mt-2 border-t border-slate-100 pt-2">{q.penjelasan}</p>}
        </div>
        )
      })}
    </div>
  )
}

function PraktikContent({ content }: { content: Konten["praktik"] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" />Petunjuk Praktik</h2>
      <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed mb-4">{content.petunjuk ?? ""}</div>
      {(content.tips?.length ?? 0) > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
          <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1"><Brain className="w-3.5 h-3.5" />Tips</p>
          <ul className="space-y-1">{(content.tips ?? []).map((t, i) => <li key={i} className="text-sm text-blue-700 flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />{t}</li>)}</ul>
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

function PresentationView({ data, content, tab, setTab, showAnswers, setShowAnswers, onClose, goTab, ilustrasiUrls }: {
  data: any; content: Konten; tab: TabKey; setTab: (t: TabKey) => void
  showAnswers: boolean; setShowAnswers: (v: boolean) => void; onClose: () => void; goTab: (d: 1 | -1) => void; ilustrasiUrls: Record<string, string>
}) {
  const tabs = [
    { key: "belajar" as TabKey, label: "Belajar", icon: BookOpen },
    { key: "latihan" as TabKey, label: "Latihan", icon: Target, count: content.latihan.length },
    { key: "praktik" as TabKey, label: "Praktik", icon: Lightbulb },
    { key: "kuis" as TabKey, label: "Kuis", icon: Sparkles, count: content.kuis.length },
    { key: "panduan" as TabKey, label: "Panduan Guru", icon: ClipboardList },
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
                  <div className="space-y-3">{(() => {
                    const c = m.contoh ?? []
                    const items = [...(m.isi ?? []).filter(l => !l.startsWith("R:")), ...(c.length > 0 ? ["---CONTOH---"] : []), ...c]
                    return items.map((line, j) => {
                    const t = line.trim()
                    if (line === "---CONTOH---") return <div key={j} className="bg-amber-50 border border-amber-200 rounded-lg p-4"><p className="text-sm font-semibold text-amber-800 mb-2">Contoh:</p></div>
                    if (t.startsWith("[Ilustrasi:")) { const p = t.slice(11).trim().replace(/\]$/, ""); const u = ilustrasiUrls[p]; return <div key={j} className="my-3 rounded-xl overflow-hidden border border-violet-200 bg-violet-50">{u ? <img src={u} alt={p} className="w-full object-cover" loading="lazy" /> : <div className="flex items-center justify-center h-48 bg-violet-100 animate-pulse"><Loader2 className="w-6 h-6 text-violet-400 animate-spin" /></div>}<div className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm"><ImageIcon className="w-4 h-4 text-violet-500 shrink-0" /><p className="text-xs text-violet-700 italic">{p}</p></div></div> }
                    if (c.includes(line)) return <p key={j} className="text-amber-900 bg-amber-50/50 -mt-2 px-4 py-1 rounded-lg">{line}</p>
                    if (!line.trim()) return <div key={j} className="h-3" />
                    const isBullet = line.startsWith("•")
                    const isNumbered = /^\d+\./.test(line)
                    if (isBullet) return <p key={j} className="flex items-start gap-3 text-slate-800"><span className="w-2 h-2 rounded-full bg-emerald-400 mt-2.5 shrink-0" />{line.slice(1).trim()}</p>
                    if (isNumbered) { const m2 = line.match(/^(\d+)\.\s*(.*)/); if (m2) return <p key={j} className="flex items-start gap-3"><span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">{m2[1]}</span><span className="text-slate-800">{m2[2]}</span></p> }
                    return <p key={j} className="text-slate-800 leading-relaxed">{line}</p>
                  })})()}</div>
                  {m.catatan && <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3"><Sparkles className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" /><p className="text-blue-800">{m.catatan}</p></div>}
                </div>
              ))}
              {(content.belajar.rangkuman?.length ?? 0) > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                  <h3 className="font-bold text-emerald-800 mb-3">Rangkuman</h3>
                  <ul className="space-y-2">{content.belajar.rangkuman!.map((r, i) => (
                    <li key={i} className="flex items-start gap-3 text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" /><span>{r}</span></li>
                  ))}</ul>
                </div>
              )}
            </div>
          )}

          {tab === "latihan" && <SoalPresentation soal={content.latihan} label="Latihan" showAnswers={showAnswers} color="emerald" />}
          {tab === "panduan" && content.guide && <PanduanPresentation guide={content.guide} />}
          {tab === "praktik" && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Lightbulb className="w-6 h-6 text-amber-500" />Praktik</h2>
              <div className="text-slate-800 leading-relaxed whitespace-pre-line text-lg mb-6">{content.praktik.petunjuk ?? ""}</div>
              {(content.praktik.tips?.length ?? 0) > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <p className="font-semibold text-blue-800 mb-2 flex items-center gap-2"><Brain className="w-5 h-5" />Tips</p>
                  <ul className="space-y-2">{(content.praktik.tips ?? []).map((t, i) => <li key={i} className="flex items-start gap-3 text-blue-700"><span className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />{t}</li>)}</ul>
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

function PanduanPresentation({ guide }: { guide: NonNullable<Konten["guide"]> }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Target className="w-6 h-6 text-emerald-500" />Tujuan Pembelajaran</h2>
        <ul className="space-y-2">
          {guide.learningGoals.map((t, i) => (
            <li key={i} className="flex items-start gap-3 text-slate-800">
              <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">{i + 1}</span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><BookOpen className="w-6 h-6 text-blue-500" />Konsep Utama</h2>
        <p className="text-slate-800 leading-relaxed text-lg mb-4">{guide.keyConcepts.definition}</p>

        <h3 className="font-semibold text-slate-800 mb-2">Ciri-Ciri</h3>
        <ul className="space-y-1 mb-4">
          {guide.keyConcepts.characteristics.map((c, i) => (
            <li key={i} className="flex items-start gap-3 text-slate-700"><span className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />{c}</li>
          ))}
        </ul>

        <h3 className="font-semibold text-slate-800 mb-2">Struktur</h3>
        <div className="space-y-2 mb-4">
          {guide.keyConcepts.structure.map((s, i) => (
            <div key={i} className="flex items-start gap-3 text-base">
              <Badge variant="outline" className="text-xs shrink-0 mt-0.5 bg-blue-50 text-blue-700 border-blue-200">{s.name}</Badge>
              <span className="text-slate-600">{s.description}</span>
            </div>
          ))}
        </div>

        <h3 className="font-semibold text-slate-800 mb-2">Kebahasaan</h3>
        <ul className="space-y-1">
          {guide.keyConcepts.languageFeatures.map((f, i) => (
            <li key={i} className="flex items-start gap-3 text-slate-700"><span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" />{f}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Brain className="w-6 h-6 text-violet-500" />Kegiatan Pembelajaran</h2>
        {guide.activities.opening.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800 mb-2">Pembukaan</h3>
            <ol className="space-y-1">
              {guide.activities.opening.map((a, i) => (<li key={i} className="flex items-start gap-3 text-slate-700"><span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>{a}</li>))}
            </ol>
          </div>
        )}
        {guide.activities.core.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800 mb-2">Inti</h3>
            <ol className="space-y-1">
              {guide.activities.core.map((a, i) => (<li key={i} className="flex items-start gap-3 text-slate-700"><span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>{a}</li>))}
            </ol>
          </div>
        )}
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
        {soal.map((q, i) => {
          const tipe = q.tipe || "PG"
          const jawabStr = tipe === "ISIAN" ? q.jawaban as string : (q.opsi[q.jawaban as number] ?? "")
          const jawabNum = q.jawaban as number
          return (
          <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-lg font-semibold text-slate-900 mb-4">
              <span className={`font-bold mr-3 ${colorClasses}`}>{i + 1}.</span>
              {q.soal}
              {tipe !== "PG" && <span className="ml-2 text-sm text-slate-400 font-normal">({tipe === "BENAR_SALAH" ? "Benar/Salah" : "Isian"})</span>}
            </p>
            {tipe === "ISIAN" ? (
              <div className="text-lg text-slate-600">
                {showAnswers && <p className="text-emerald-700 font-medium">Jawaban: <strong>{jawabStr}</strong></p>}
              </div>
            ) : (
            <div className="space-y-2">
              {q.opsi.map((o, j) => {
                const isCorrect = j === jawabNum
                return (
                  <div key={j} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base ${showAnswers && isCorrect ? `${bgColor} border-2 border-emerald-300` : "border border-slate-200"}`}>
                    <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 ${isCorrect && showAnswers ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-slate-500"}`}>
                      {tipe === "BENAR_SALAH" ? (j === 0 ? "✓" : "✗") : String.fromCharCode(65 + j)}
                    </span>
                    <span className={isCorrect && showAnswers ? "font-semibold text-emerald-800" : "text-slate-800"}>{o}</span>
                    {showAnswers && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto shrink-0" />}
                  </div>
                )
              })}
            </div>
            )}
            {showAnswers && q.penjelasan && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-800">{q.penjelasan}</p>
              </div>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}

function GuideContent({ guide }: { guide: NonNullable<Konten["guide"]> }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-emerald-500" />Tujuan Pembelajaran</h2>
        <ul className="space-y-1.5">
          {guide.learningGoals.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-500" />Konsep Utama</h2>
        <p className="text-sm text-slate-700 mb-4">{guide.keyConcepts.definition}</p>

        <h3 className="font-semibold text-sm text-slate-800 mb-2">Ciri-Ciri</h3>
        <ul className="space-y-1 mb-4">
          {guide.keyConcepts.characteristics.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />{c}
            </li>
          ))}
        </ul>

        <h3 className="font-semibold text-sm text-slate-800 mb-2">Struktur</h3>
        <div className="space-y-2 mb-4">
          {guide.keyConcepts.structure.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5 bg-blue-50 text-blue-700 border-blue-200">{s.name}</Badge>
              <span className="text-slate-600">{s.description}</span>
            </div>
          ))}
        </div>

        <h3 className="font-semibold text-sm text-slate-800 mb-2">Ciri Kebahasaan</h3>
        <ul className="space-y-1 mb-4">
          {guide.keyConcepts.languageFeatures.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{f}
            </li>
          ))}
        </ul>

        <h3 className="font-semibold text-sm text-slate-800 mb-2">Fokus Bahasa</h3>
        <ul className="space-y-1 mb-2">
          {guide.languageFocus.aspects.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />{a}
            </li>
          ))}
        </ul>
        {guide.languageFocus.notes && (
          <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800">{guide.languageFocus.notes}</p>
          </div>
        )}

        {guide.keyConcepts.examples.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-sm text-slate-800 mb-2">Contoh</h3>
            {guide.keyConcepts.examples.map((ex, i) => (
              <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-2">
                <p className="text-xs font-semibold text-amber-800 mb-1">{ex.label}</p>
                <p className="text-sm text-amber-900 whitespace-pre-line mb-2">{ex.content}</p>
                {ex.analysis && <p className="text-xs text-amber-700 italic">{ex.analysis}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Brain className="w-4 h-4 text-violet-500" />Kegiatan Pembelajaran</h2>
        {guide.activities.opening.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-slate-800 mb-2">Pembukaan</h3>
            <ol className="space-y-1">
              {guide.activities.opening.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  {a}
                </li>
              ))}
            </ol>
          </div>
        )}
        {guide.activities.core.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-slate-800 mb-2">Inti</h3>
            <ol className="space-y-1">
              {guide.activities.core.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  {a}
                </li>
              ))}
            </ol>
          </div>
        )}
        {guide.activities.group.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-slate-800 mb-2">Kelompok</h3>
            <ul className="space-y-1">
              {guide.activities.group.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />{a}
                </li>
              ))}
            </ul>
          </div>
        )}
        {guide.activities.reflection.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-slate-800 mb-2">Refleksi</h3>
            <ul className="space-y-1">
              {guide.activities.reflection.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-emerald-500" />Assessment</h2>
        {guide.assessment.diagnostic.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-slate-800 mb-2">Diagnostik</h3>
            <ul className="space-y-1">
              {guide.assessment.diagnostic.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg p-2">
                  <span className="text-xs font-bold text-slate-400 shrink-0">Q{i + 1}</span>
                  <div>
                    <p className="text-sm">{d.question}</p>
                    <p className="text-xs text-slate-400 italic">Tujuan: {d.purpose}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {guide.assessment.formative.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-slate-800 mb-2">Formatif</h3>
            <ul className="space-y-2">
              {guide.assessment.formative.map((f, i) => (
                <li key={i} className="text-sm text-slate-700 bg-blue-50 rounded-lg p-2">
                  <p className="font-medium text-blue-800">{f.method}</p>
                  <ul className="space-y-0.5 mt-1">
                    {f.criteria.map((c, j) => (
                      <li key={j} className="flex items-start gap-1.5 text-xs text-blue-700">
                        <CheckCircle className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />{c}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}
        {guide.assessment.summative.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-slate-800 mb-2">Sumatif</h3>
            <ul className="space-y-1">
              {guide.assessment.summative.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div><span className="font-medium">{s.type}:</span> {s.description}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-amber-500" />Rubrik Penilaian</h2>
        {guide.rubric.aspects.map((aspect, i) => (
          <div key={i} className="mb-3 last:mb-0">
            <h3 className="font-semibold text-sm text-slate-800 mb-1.5">{aspect.name}</h3>
            <div className="space-y-1">
              {aspect.criteria.map((c, j) => (
                <div key={j} className="flex items-start gap-2 text-xs">
                  <Badge variant="outline" className={`text-[10px] shrink-0 mt-0.5 ${
                    c.level === "Sangat Baik" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    c.level === "Baik" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    c.level === "Cukup" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-red-50 text-red-700 border-red-200"
                  }`}>{c.level}</Badge>
                  <span className="text-slate-600">{c.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Brain className="w-4 h-4 text-violet-500" />Diferensiasi</h2>
        {guide.differentiation.support.length > 0 && (
          <div className="mb-3">
            <h3 className="font-semibold text-sm text-blue-700 mb-1.5">Dukungan</h3>
            <ul className="space-y-1">
              {guide.differentiation.support.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />{s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {guide.differentiation.challenge.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-amber-700 mb-1.5">Pengayaan</h3>
            <ul className="space-y-1">
              {guide.differentiation.challenge.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />{c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {guide.teacherNotes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 className="font-bold text-amber-800 mb-2 text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4" />Catatan Guru</h2>
          <ul className="space-y-1">
            {guide.teacherNotes.map((n, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />{n}
              </li>
            ))}
          </ul>
        </div>
      )}
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
