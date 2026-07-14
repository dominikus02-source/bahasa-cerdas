"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  BookOpen, ArrowLeft, Send, CheckCircle, XCircle, Lightbulb,
  Target, Sparkles, Brain, Maximize2, Minimize2, Eye, EyeOff,
  ChevronLeft, ChevronRight, ImageIcon, Loader2,
  FileText, HelpCircle, ClipboardList,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Soal = { id: number; tipe?: "PG" | "BENAR_SALAH" | "ISIAN"; soal: string; opsi: string[]; jawaban: number | string; penjelasan: string }
type Praktik = { petunjuk: string; tips: string[]; contoh?: string }
type PracticeSoal = {
  id: string
  type: "pilihan_ganda" | "jawaban_singkat" | "uraian" | "produksi"
  questionText: string
  options?: string[]
  correctAnswer: string | string[]
  explanation: string
  skillTarget: string
  difficulty: "mudah" | "sedang" | "menantang"
}
type Konten = {
  belajar: { tujuan: string[]; materi: { judul: string; isi: string[]; contoh: string[]; catatan?: string }[]; rangkuman: string[] }
  latihan: Soal[]
  // Opsional — seed buku-panduan (VII–XII) tidak menulis `praktik`; kontennya
  // diturunkan dari guide.worksheet (LKPD) via resolvePraktik(). Konten lama
  // yang punya `praktik` tetap dipakai apa adanya.
  praktik?: Praktik
  kuis: Soal[]
  readingPractice?: {
    title: string
    stimulusTitle: string
    stimulusText: string
    questions: PracticeSoal[]
  }
  quickQuiz?: {
    title: string
    stimulusTitle?: string
    stimulusText?: string
    questions: PracticeSoal[]
  }
  guide?: {
    overview?: string
    learningGoals: string[]
    keywords?: string[]
    suggestedDuration?: string
    // Struktur nyata yang ditulis seed (lihat data/buku-panduan/types.ts TeachingSection).
    // Field lama (keyConcepts/languageFocus/activities dangkal) sudah tidak dipakai —
    // dulu menyebabkan crash karena tidak pernah cocok dengan data asli.
    teachingContent?: {
      textNature: { definition: string; characteristics: string[]; socialFunction: string; lifeBenefits: string; distinction: string }
      contentComposition: { infoPoints: string[]; buildingElements: string[]; mainIdeas: string | string[]; partRelationships: string; simpleExample: string }
      textVariants: { types: string | string[]; variantDescriptions: { name: string; description: string; example: string }[] | string[]; groupingBasis: string }
      structurePattern: { generalPattern: { name: string; description: string }[] | string[]; variationNotes: string; readingGuide: string }
      languageFeatures: { register: string; features: { name: string; description: string; example: string }[] | string[]; wordChoice: string; sentencePattern: string; conjunctions: string; style: string; spelling: string; punctuation: string }
      productionProcedure: { preProduction: string | string[]; production: string | string[]; revision: string | string[]; editing: string | string[]; publication: string | string[]; bestPractices: string | string[] }
    }
    exampleText?: { title: string; content: string; analysis: { structure: string; content: string; language: string; strengths: string; improvements: string } }
    learningActivities?: { opening: string[]; core: string[]; group: string[]; individual: string[]; reflection: string[] }
    worksheet?: { title: string; purpose: string; instructions: string[]; activities: { name: string; items: string[] }[] | string; studentOutput: string }
    readingPractice?: {
      stimulusTitle: string
      stimulusText: string
      multipleChoice: { question: string; options: string[]; correctIndex: number; explanation: string; skillTarget: string }[]
      shortAnswer: { question: string; sampleAnswer: string; explanation: string }[]
      essay: { question: string; guidance: string; rubricNote: string }[]
    }
    assessment: { diagnostic: { question: string; purpose: string }[]; formative: { method: string; criteria: string[] }[]; summative: { type: string; description: string }[] }
    rubric: { aspects: { name: string; criteria: { level: string | number; description: string }[] }[] }
    differentiation: { support: string[]; regular?: string[]; challenge: string[] }
    remedial: string[]
    enrichment: string[]
    teacherNotes?: { teachingStrategies: string[]; commonMisconceptions: { misconception: string; correction: string }[]; feedbackGuide: string[]; classroomManagement: string[] }
    reflection?: { studentQuestions: string[]; teacherQuestions: string[] }
    reviewStatus?: string
    tags: string[]
  }
}

function toList(v: string | string[] | undefined): string[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

/**
 * Resolve the "Praktik" tab content. Prefers an explicit `praktik` block (older
 * content), otherwise derives one from the LKPD worksheet in guide.worksheet so
 * the tab stays useful for buku-panduan units (which don't ship `praktik`).
 * Returns null when there's genuinely nothing to show — never throws.
 */
function resolvePraktik(content: Konten): Praktik | null {
  const p = content.praktik
  if (p && (p.petunjuk || (p.tips?.length ?? 0) > 0 || p.contoh)) return p
  const ws = content.guide?.worksheet
  if (ws && (ws.purpose || ws.title || (ws.instructions?.length ?? 0) > 0)) {
    return {
      petunjuk: [ws.title, ws.purpose].filter(Boolean).join("\n\n"),
      tips: ws.instructions ?? [],
      contoh: ws.studentOutput || undefined,
    }
  }
  return null
}

function toPracticeSoal(q: Soal): PracticeSoal {
  let type: PracticeSoal["type"]
  let correctAnswer: string | string[]
  if (q.tipe === "BENAR_SALAH") {
    type = "pilihan_ganda"
    correctAnswer = q.opsi[q.jawaban as number] ?? ""
  } else if (q.tipe === "ISIAN") {
    type = "jawaban_singkat"
    correctAnswer = q.jawaban as string
  } else {
    type = "pilihan_ganda"
    correctAnswer = q.opsi[q.jawaban as number] ?? ""
  }
  return {
    id: String(q.id),
    type,
    questionText: q.soal,
    options: q.tipe === "ISIAN" ? undefined : q.opsi,
    correctAnswer,
    explanation: q.penjelasan,
    skillTarget: "Pemahaman umum",
    difficulty: "sedang",
  }
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
      <p className="text-sm text-slate-400">Belum ada materi {label.toLowerCase()} untuk bab ini.</p>
    </div>
  )
}

type TabKey = "belajar" | "latihan" | "praktik" | "kuis" | "panduan"

function getTabOrder(_content: Konten | null): TabKey[] {
  return ["belajar", "latihan", "praktik", "kuis", "panduan"]
}

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
  const [jenis, setJenis] = useState<"MATERI" | "KUIS">("MATERI")
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
    fetch("/api/group").then(r => r.json()).then(d => { setGroups(d.groups || d.data || []) }).catch(() => {})
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
      const order = getTabOrder(content)
      const idx = order.indexOf(prev)
      const next = idx + dir
      if (next < 0 || next >= order.length) return prev
      return order[next]
    })
  }, [content])

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
        body: JSON.stringify({
          unitId: data.id,
          groupIds: selectedGroups,
          judul: jenis === "KUIS" ? `Ulangan Harian: ${data.title}` : data.title,
          jenis,
          tenggat: tenggat || null,
        }),
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
    { key: "latihan" as TabKey, label: "Latihan", icon: Target, count: content.latihan.length + (content.readingPractice?.questions.length ?? 0) },
    { key: "praktik" as TabKey, label: "Praktik", icon: Lightbulb },
    { key: "kuis" as TabKey, label: "Kuis", icon: Sparkles, count: content.kuis.length + (content.quickQuiz?.questions.length ?? 0) },
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

      {/* Kirim ke Kelas modal — Tugas Materi vs Ulangan Harian (Kuis) */}
      {showAssign && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => !assignLoading && setShowAssign(false)}>
          <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {assignSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-bold text-slate-900">Terkirim ke kelas!</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Kirim ke Kelas</h2>
                <p className="text-xs text-slate-500 mb-4">{data.title}</p>

                <div className="flex gap-2 mb-2">
                  <button onClick={() => setJenis("MATERI")} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${jenis === "MATERI" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>Tugas Materi</button>
                  <button onClick={() => setJenis("KUIS")} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${jenis === "KUIS" ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500"}`}>Ulangan Harian</button>
                </div>
                <p className="text-[11px] text-slate-400 mb-4">
                  {jenis === "MATERI"
                    ? "Murid menerima Materi + Latihan + Praktik (tanpa kunci jawaban). Kuis & Panduan Guru tidak dikirim."
                    : "Murid mengerjakan Kuis sebagai ulangan harian — nilai otomatis langsung keluar."}
                </p>

                <p className="text-xs font-semibold text-slate-600 mb-2">Pilih Kelas</p>
                {groups.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Belum ada kelas. Buat dulu di KelasKu.</p>
                ) : (
                  <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
                    {groups.map(g => {
                      const sel = selectedGroups.includes(g.id)
                      return (
                        <button key={g.id} onClick={() => setSelectedGroups(prev => sel ? prev.filter(x => x !== g.id) : [...prev, g.id])}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm ${sel ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
                          <span className="font-medium text-slate-700">{g.name} <span className="text-xs text-slate-400">· {g.grade}</span></span>
                          {sel && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        </button>
                      )
                    })}
                  </div>
                )}

                <label className="block text-xs font-semibold text-slate-600 mb-1">Tenggat (opsional)</label>
                <input type="date" value={tenggat} onChange={e => setTenggat(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm mb-4" />

                <div className="flex gap-2">
                  <button onClick={() => setShowAssign(false)} disabled={assignLoading} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm">Batal</button>
                  <button onClick={handleAssign} disabled={assignLoading || selectedGroups.length === 0} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50">
                    {assignLoading ? "Mengirim..." : "Kirim"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ContentPanel({ content, tab, showAnswers, setShowAnswers, ilustrasiUrls }: {
  content: Konten; tab: TabKey; showAnswers: boolean; setShowAnswers: (v: boolean) => void; ilustrasiUrls: Record<string, string>
}) {
  if (tab === "belajar") return <BelajarContent content={content.belajar} ilustrasiUrls={ilustrasiUrls} />
  if (tab === "latihan") {
    const merged = {
      title: "Latihan",
      stimulusTitle: content.readingPractice?.stimulusTitle,
      stimulusText: content.readingPractice?.stimulusText,
      questions: [...content.latihan.map(toPracticeSoal), ...(content.readingPractice?.questions ?? [])],
    }
    return <PracticeQuizContent data={merged} color="emerald" type="Latihan" showAnswers={showAnswers} setShowAnswers={setShowAnswers} />
  }
  if (tab === "praktik") { const p = resolvePraktik(content); return p ? <PraktikContent content={p} /> : <EmptyState label="Praktik" /> }
  if (tab === "kuis") {
    const merged = {
      title: "Kuis",
      stimulusTitle: content.quickQuiz?.stimulusTitle,
      stimulusText: content.quickQuiz?.stimulusText,
      questions: [...content.kuis.map(toPracticeSoal), ...(content.quickQuiz?.questions ?? [])],
    }
    return <PracticeQuizContent data={merged} color="violet" type="Kuis" showAnswers={showAnswers} setShowAnswers={setShowAnswers} />
  }
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

function PraktikContent({ content }: { content: Praktik }) {
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
    { key: "latihan" as TabKey, label: "Latihan", icon: Target, count: content.latihan.length + (content.readingPractice?.questions.length ?? 0) },
    { key: "praktik" as TabKey, label: "Praktik", icon: Lightbulb },
    { key: "kuis" as TabKey, label: "Kuis", icon: Sparkles, count: content.kuis.length + (content.quickQuiz?.questions.length ?? 0) },
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

          {tab === "latihan" && (() => {
            const merged = {
              title: "Latihan",
              stimulusTitle: content.readingPractice?.stimulusTitle,
              stimulusText: content.readingPractice?.stimulusText,
              questions: [...content.latihan.map(toPracticeSoal), ...(content.readingPractice?.questions ?? [])],
            }
            return <PracticePresentation data={merged} color="emerald" type="Latihan" showAnswers={showAnswers} />
          })()}
          {tab === "panduan" && content.guide && <PanduanPresentation guide={content.guide} />}
          {tab === "praktik" && (() => {
            const praktik = resolvePraktik(content)
            if (!praktik) return <EmptyState label="Praktik" />
            return (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Lightbulb className="w-6 h-6 text-amber-500" />Praktik</h2>
              <div className="text-slate-800 leading-relaxed whitespace-pre-line text-lg mb-6">{praktik.petunjuk ?? ""}</div>
              {(praktik.tips?.length ?? 0) > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <p className="font-semibold text-blue-800 mb-2 flex items-center gap-2"><Brain className="w-5 h-5" />Tips</p>
                  <ul className="space-y-2">{(praktik.tips ?? []).map((t, i) => <li key={i} className="flex items-start gap-3 text-blue-700"><span className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />{t}</li>)}</ul>
                </div>
              )}
              {praktik.contoh && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="font-semibold text-amber-800 mb-2">Contoh:</p>
                  <p className="text-amber-900 whitespace-pre-line">{praktik.contoh}</p>
                </div>
              )}
            </div>
          )})()}
          {tab === "kuis" && (() => {
            const merged = {
              title: "Kuis",
              stimulusTitle: content.quickQuiz?.stimulusTitle,
              stimulusText: content.quickQuiz?.stimulusText,
              questions: [...content.kuis.map(toPracticeSoal), ...(content.quickQuiz?.questions ?? [])],
            }
            return <PracticePresentation data={merged} color="violet" type="Kuis" showAnswers={showAnswers} />
          })()}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <button onClick={() => goTab(-1)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100">
          <ChevronLeft className="w-4 h-4" />Sebelumnya
        </button>
        <span className="text-xs text-slate-400">
          {tab.charAt(0).toUpperCase() + tab.slice(1)} · {getTabOrder(content).indexOf(tab) + 1}/{getTabOrder(content).length}
        </span>
        <button onClick={() => goTab(1)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100">
          Selanjutnya<ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function PanduanPresentation({ guide }: { guide: NonNullable<Konten["guide"]> }) {
  const tc = guide.teachingContent
  const activities = guide.learningActivities
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

      {tc && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><BookOpen className="w-6 h-6 text-blue-500" />Konsep Utama</h2>
          <p className="text-slate-800 leading-relaxed text-lg mb-4">{tc.textNature.definition}</p>

          <h3 className="font-semibold text-slate-800 mb-2">Ciri-Ciri</h3>
          <ul className="space-y-1 mb-4">
            {tc.textNature.characteristics.map((c, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-700"><span className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />{c}</li>
            ))}
          </ul>

          <h3 className="font-semibold text-slate-800 mb-2">Struktur</h3>
          <div className="space-y-2 mb-4">
            {(Array.isArray(tc.structurePattern.generalPattern) ? tc.structurePattern.generalPattern : []).map((s, i) => (
              typeof s === "string" ? (
                <p key={i} className="text-slate-700">{s}</p>
              ) : (
                <div key={i} className="flex items-start gap-3 text-base">
                  <Badge variant="outline" className="text-xs shrink-0 mt-0.5 bg-blue-50 text-blue-700 border-blue-200">{s.name}</Badge>
                  <span className="text-slate-600">{s.description}</span>
                </div>
              )
            ))}
          </div>

          <h3 className="font-semibold text-slate-800 mb-2">Kebahasaan</h3>
          <ul className="space-y-1">
            {(Array.isArray(tc.languageFeatures.features) ? tc.languageFeatures.features : []).map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
                {typeof f === "string" ? f : `${f.name}: ${f.description}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><Brain className="w-6 h-6 text-violet-500" />Kegiatan Pembelajaran</h2>
        {(activities?.opening.length ?? 0) > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800 mb-2">Pembukaan</h3>
            <ol className="space-y-1">
              {activities!.opening.map((a, i) => (<li key={i} className="flex items-start gap-3 text-slate-700"><span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>{a}</li>))}
            </ol>
          </div>
        )}
        {(activities?.core.length ?? 0) > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800 mb-2">Inti</h3>
            <ol className="space-y-1">
              {activities!.core.map((a, i) => (<li key={i} className="flex items-start gap-3 text-slate-700"><span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>{a}</li>))}
            </ol>
          </div>
        )}
      </div>

      {guide.readingPractice && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><FileText className="w-6 h-6 text-indigo-500" />Bacaan Latihan</h2>
          <p className="text-sm font-semibold text-slate-700 mb-2">{guide.readingPractice.stimulusTitle}</p>
          <p className="text-slate-700 leading-relaxed whitespace-pre-line">{guide.readingPractice.stimulusText}</p>
        </div>
      )}
    </div>
  )
}

function PracticeQuizContent({ data, color, type, showAnswers, setShowAnswers }: { data: NonNullable<Konten["readingPractice" | "quickQuiz"]>; color: string; type: string; showAnswers: boolean; setShowAnswers: (v: boolean) => void }) {
  const colorClasses = color === "violet" ? "text-violet-600" : "text-emerald-600"
  const difficultyBadge = (d: string) => {
    if (d === "mudah") return "bg-emerald-100 text-emerald-700"
    if (d === "sedang") return "bg-amber-100 text-amber-700"
    return "bg-red-100 text-red-700"
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{data.questions.length} soal</p>
        <Button variant="outline" size="sm" onClick={() => setShowAnswers(!showAnswers)} className={`text-xs ${showAnswers ? "text-emerald-600 border-emerald-200" : ""}`}>
          {showAnswers ? <><EyeOff className="w-3.5 h-3.5 mr-1" />Sembunyikan Jawaban</> : <><Eye className="w-3.5 h-3.5 mr-1" />Tampilkan Jawaban</>}
        </Button>
      </div>
      {data.stimulusText && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h3 className="font-bold text-blue-800 text-sm mb-2">{data.stimulusTitle || "Stimulus"}</h3>
          <p className="text-sm text-blue-900 whitespace-pre-line leading-relaxed">{data.stimulusText}</p>
        </div>
      )}
      {data.questions.map((q, i) => {
        const isCorrectOpt = (o: string) => Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(o) : q.correctAnswer === o
        return (
        <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-2 mb-2">
            <span className={`font-bold ${colorClasses}`}>{i + 1}.</span>
            <span className="text-sm font-medium text-slate-900">{q.questionText}</span>
            <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${difficultyBadge(q.difficulty)}`}>{q.difficulty}</span>
          </div>
          {q.skillTarget && <p className="text-[10px] text-slate-400 mb-2">Target: {q.skillTarget}</p>}
          {q.options ? (
            <div className="space-y-1.5 mb-2">
              {q.options.map((o, j) => (
                <div key={j} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${showAnswers && isCorrectOpt(o) ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-slate-700 bg-slate-50"}`}>
                  <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-500 font-medium shrink-0">{String.fromCharCode(65 + j)}</span>
                  {o}{showAnswers && isCorrectOpt(o) && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded-lg p-3 text-sm">
              {showAnswers && <p className="text-emerald-700 font-medium mb-1">Jawaban: <strong>{Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : q.correctAnswer}</strong></p>}
              <p className="text-xs text-slate-400 italic">({q.type === "uraian" ? "Jawaban uraian" : q.type === "produksi" ? "Jawaban terbuka" : "Jawaban singkat"})</p>
            </div>
          )}
          {showAnswers && q.explanation && (
            <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-800">{q.explanation}</p>
            </div>
          )}
        </div>
        )
      })}
    </div>
  )
}

function PracticePresentation({ data, color, type, showAnswers }: { data: NonNullable<Konten["readingPractice" | "quickQuiz"]>; color: string; type: string; showAnswers: boolean }) {
  const colorClasses = color === "violet" ? "text-violet-600" : "text-emerald-600"
  const difficultyBadge = (d: string) => {
    if (d === "mudah") return "bg-emerald-100 text-emerald-700"
    if (d === "sedang") return "bg-amber-100 text-amber-700"
    return "bg-red-100 text-red-700"
  }
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><BookOpen className={`w-6 h-6 ${colorClasses}`} />{type} ({data.questions.length} soal)</h2>
      {data.stimulusText && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <h3 className="font-bold text-blue-800 text-lg mb-3">{data.stimulusTitle || "Stimulus"}</h3>
          <p className="text-blue-900 whitespace-pre-line leading-relaxed text-lg">{data.stimulusText}</p>
        </div>
      )}
      <div className="space-y-6">
        {data.questions.map((q, i) => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className={`font-bold text-lg ${colorClasses}`}>{i + 1}.</span>
              <span className="text-lg font-semibold text-slate-900 flex-1">{q.questionText}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyBadge(q.difficulty)}`}>{q.difficulty}</span>
              </div>
            </div>
            {q.skillTarget && <p className="text-sm text-slate-400 mb-3">Target keterampilan: {q.skillTarget}</p>}
            {q.options ? (
              <div className="space-y-2">
                {q.options.map((o, j) => {
                  const isCorrect = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(o) : q.correctAnswer === o
                  return (
                    <div key={j} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base ${showAnswers && isCorrect ? "bg-emerald-50 border-2 border-emerald-300" : "border border-slate-200"}`}>
                      <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 ${showAnswers && isCorrect ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-slate-500"}`}>
                        {String.fromCharCode(65 + j)}
                      </span>
                      <span className={showAnswers && isCorrect ? "font-semibold text-emerald-800" : "text-slate-800"}>{o}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="border border-dashed border-slate-300 rounded-xl p-4 text-sm text-slate-400">
                {showAnswers && <p className="text-emerald-700 font-medium mb-1">Jawaban: <strong>{Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : q.correctAnswer}</strong></p>}
                <p className="text-slate-400 italic">({q.type === "uraian" ? "Jawaban uraian" : q.type === "produksi" ? "Jawaban terbuka (produksi)" : "Jawaban singkat"})</p>
              </div>
            )}
            {showAnswers && q.explanation && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-800">{q.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function GuideContent({ guide }: { guide: NonNullable<Konten["guide"]> }) {
  const [showKunci, setShowKunci] = useState(false)
  const tc = guide.teachingContent
  const activities = guide.learningActivities

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-emerald-500" />Ringkasan &amp; Tujuan Pembelajaran</h2>
        {guide.overview && <p className="text-sm text-slate-600 mb-3 leading-relaxed">{guide.overview}</p>}
        <ul className="space-y-1.5">
          {guide.learningGoals.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
              {t}
            </li>
          ))}
        </ul>
        {guide.suggestedDuration && <p className="text-xs text-slate-400 mt-3">Alokasi waktu disarankan: {guide.suggestedDuration}</p>}
      </div>

      {tc && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-500" />Pemahaman Materi</h2>

          <div>
            <p className="text-sm text-slate-700 mb-2">{tc.textNature.definition}</p>
            <h3 className="font-semibold text-xs uppercase tracking-wide text-slate-500 mb-1.5">Ciri-Ciri</h3>
            <ul className="space-y-1 mb-2">
              {tc.textNature.characteristics.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />{c}</li>
              ))}
            </ul>
            <p className="text-xs text-slate-500"><span className="font-medium">Fungsi sosial:</span> {tc.textNature.socialFunction}</p>
            <p className="text-xs text-slate-500 mt-1"><span className="font-medium">Manfaat:</span> {tc.textNature.lifeBenefits}</p>
            <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800">{tc.textNature.distinction}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-slate-800 mb-1.5">Komposisi Isi</h3>
            <ul className="space-y-1 mb-2">
              {tc.contentComposition.buildingElements.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{b}</li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">{tc.contentComposition.partRelationships}</p>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-slate-800 mb-1.5">Jenis / Varian</h3>
            <div className="space-y-2">
              {(Array.isArray(tc.textVariants.variantDescriptions) ? tc.textVariants.variantDescriptions : []).map((v, i) => (
                typeof v === "string" ? (
                  <p key={i} className="text-sm text-slate-700">{v}</p>
                ) : (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-slate-800">{v.name}:</span> <span className="text-slate-600">{v.description}</span>
                  </div>
                )
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-slate-800 mb-1.5">Struktur</h3>
            <div className="space-y-2">
              {(Array.isArray(tc.structurePattern.generalPattern) ? tc.structurePattern.generalPattern : []).map((s, i) => (
                typeof s === "string" ? (
                  <p key={i} className="text-sm text-slate-700">{s}</p>
                ) : (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5 bg-blue-50 text-blue-700 border-blue-200">{s.name}</Badge>
                    <span className="text-slate-600">{s.description}</span>
                  </div>
                )
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-slate-800 mb-1.5">Kaidah dan Fitur Kebahasaan</h3>
            <ul className="space-y-1 mb-2">
              {(Array.isArray(tc.languageFeatures.features) ? tc.languageFeatures.features : []).map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  {typeof f === "string" ? f : <span><span className="font-medium">{f.name}:</span> {f.description}</span>}
                </li>
              ))}
            </ul>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
              <p><span className="font-medium">Diksi:</span> {tc.languageFeatures.wordChoice}</p>
              <p><span className="font-medium">Konjungsi:</span> {tc.languageFeatures.conjunctions}</p>
              <p><span className="font-medium">Kalimat:</span> {tc.languageFeatures.sentencePattern}</p>
              <p><span className="font-medium">Ejaan/Tanda Baca:</span> {tc.languageFeatures.spelling}, {tc.languageFeatures.punctuation}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-slate-800 mb-1.5">Prosedur Memproduksi Teks</h3>
            <ol className="space-y-1">
              {[
                { label: "Praproduksi", v: tc.productionProcedure.preProduction },
                { label: "Produksi", v: tc.productionProcedure.production },
                { label: "Revisi", v: tc.productionProcedure.revision },
                { label: "Penyuntingan", v: tc.productionProcedure.editing },
                { label: "Publikasi", v: tc.productionProcedure.publication },
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <span><span className="font-medium">{step.label}:</span> {toList(step.v).join(" ")}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {guide.exampleText && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-amber-500" />Contoh dan Analisis</h2>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-3">
            <p className="text-xs font-semibold text-amber-800 mb-1">{guide.exampleText.title}</p>
            <p className="text-sm text-amber-900 whitespace-pre-line">{guide.exampleText.content}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-600">
            <p><span className="font-medium text-slate-800">Struktur:</span> {guide.exampleText.analysis.structure}</p>
            <p><span className="font-medium text-slate-800">Gagasan:</span> {guide.exampleText.analysis.content}</p>
            <p><span className="font-medium text-slate-800">Kebahasaan:</span> {guide.exampleText.analysis.language}</p>
            <p><span className="font-medium text-slate-800">Kekuatan:</span> {guide.exampleText.analysis.strengths}</p>
          </div>
          {guide.exampleText.analysis.improvements && (
            <p className="text-xs text-slate-500 mt-2 italic">Bagian yang bisa diperbaiki: {guide.exampleText.analysis.improvements}</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Brain className="w-4 h-4 text-violet-500" />Kegiatan Pembelajaran</h2>
        {(activities?.opening.length ?? 0) > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-slate-800 mb-2">Pembukaan</h3>
            <ol className="space-y-1">
              {activities!.opening.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  {a}
                </li>
              ))}
            </ol>
          </div>
        )}
        {(activities?.core.length ?? 0) > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-slate-800 mb-2">Inti</h3>
            <ol className="space-y-1">
              {activities!.core.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  {a}
                </li>
              ))}
            </ol>
          </div>
        )}
        {(activities?.group.length ?? 0) > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-slate-800 mb-2">Kelompok</h3>
            <ul className="space-y-1">
              {activities!.group.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />{a}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(activities?.individual.length ?? 0) > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-slate-800 mb-2">Individu</h3>
            <ul className="space-y-1">
              {activities!.individual.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />{a}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(activities?.reflection.length ?? 0) > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-slate-800 mb-2">Refleksi</h3>
            <ul className="space-y-1">
              {activities!.reflection.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {guide.worksheet && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900 mb-1 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-emerald-500" />Lembar Kerja Peserta Didik</h2>
          <p className="text-sm font-medium text-slate-800 mb-1">{guide.worksheet.title}</p>
          <p className="text-xs text-slate-500 mb-3">{guide.worksheet.purpose}</p>
          <h3 className="font-semibold text-xs uppercase tracking-wide text-slate-500 mb-1.5">Petunjuk Kerja</h3>
          <ol className="space-y-1 mb-3">
            {guide.worksheet.instructions.map((ins, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                {ins}
              </li>
            ))}
          </ol>
          {Array.isArray(guide.worksheet.activities) && guide.worksheet.activities.length > 0 && (
            <div className="space-y-2 mb-3">
              {guide.worksheet.activities.map((act, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-slate-700 mb-1">{act.name}</p>
                  <ul className="space-y-0.5">
                    {act.items.map((it, j) => <li key={j} className="text-xs text-slate-600">• {it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500 italic">Hasil kerja peserta didik: {guide.worksheet.studentOutput}</p>
        </div>
      )}

      {guide.readingPractice && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-500" />Latihan dan Kuis Berbasis Bacaan</h2>
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4">
            <p className="text-xs font-semibold text-indigo-800 mb-2">{guide.readingPractice.stimulusTitle}</p>
            <p className="text-sm text-indigo-900 whitespace-pre-line leading-relaxed">{guide.readingPractice.stimulusText}</p>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-slate-800">Soal Pilihan Ganda ({guide.readingPractice.multipleChoice.length}), Isian Singkat ({guide.readingPractice.shortAnswer.length}), dan Uraian ({guide.readingPractice.essay.length})</h3>
            <Button variant="outline" size="sm" onClick={() => setShowKunci(v => !v)}>
              {showKunci ? <><EyeOff className="w-3.5 h-3.5 mr-1" />Sembunyikan Kunci</> : <><Eye className="w-3.5 h-3.5 mr-1" />Tampilkan Kunci</>}
            </Button>
          </div>

          <ol className="space-y-2 mb-3">
            {guide.readingPractice.multipleChoice.map((q, i) => (
              <li key={i} className="text-sm bg-slate-50 rounded-lg p-2.5">
                <p className="text-slate-800 mb-1"><span className="font-medium">{i + 1}.</span> {q.question}</p>
                <div className="ml-4 space-y-0.5">
                  {q.options.map((op, j) => (
                    <p key={j} className={`text-xs ${showKunci && j === q.correctIndex ? "text-emerald-700 font-semibold" : "text-slate-600"}`}>
                      {String.fromCharCode(65 + j)}. {op}{showKunci && j === q.correctIndex ? " ✓" : ""}
                    </p>
                  ))}
                </div>
                {showKunci && <p className="text-xs text-indigo-700 italic mt-1 ml-4">Pembahasan: {q.explanation}</p>}
              </li>
            ))}
          </ol>

          {guide.readingPractice.shortAnswer.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold text-xs uppercase tracking-wide text-slate-500 mb-1.5">Isian Singkat</h4>
              <ol className="space-y-1.5">
                {guide.readingPractice.shortAnswer.map((q, i) => (
                  <li key={i} className="text-sm text-slate-700 bg-slate-50 rounded-lg p-2.5">
                    <p>{i + 1}. {q.question}</p>
                    {showKunci && <p className="text-xs text-emerald-700 mt-1">Kunci: {q.sampleAnswer} — <span className="italic text-slate-500">{q.explanation}</span></p>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {guide.readingPractice.essay.length > 0 && (
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-wide text-slate-500 mb-1.5">Soal Uraian</h4>
              <ol className="space-y-1.5">
                {guide.readingPractice.essay.map((q, i) => (
                  <li key={i} className="text-sm text-slate-700 bg-slate-50 rounded-lg p-2.5">
                    <p>{i + 1}. {q.question}</p>
                    {showKunci && <p className="text-xs text-emerald-700 mt-1">Panduan jawaban: {q.guidance} — <span className="italic text-slate-500">{q.rubricNote}</span></p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-emerald-500" />Asesmen</h2>
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
            <h3 className="font-semibold text-sm text-blue-700 mb-1.5">Konten/Proses (Dukungan)</h3>
            <ul className="space-y-1">
              {guide.differentiation.support.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />{s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(guide.differentiation.regular?.length ?? 0) > 0 && (
          <div className="mb-3">
            <h3 className="font-semibold text-sm text-slate-700 mb-1.5">Reguler</h3>
            <ul className="space-y-1">
              {guide.differentiation.regular!.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />{s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {guide.differentiation.challenge.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-amber-700 mb-1.5">Produk (Tantangan)</h3>
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

      {(guide.remedial.length > 0 || guide.enrichment.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {guide.remedial.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-2 text-sm flex items-center gap-2"><Target className="w-4 h-4 text-red-500" />Remedial</h2>
              <ul className="space-y-1">
                {guide.remedial.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />{r}</li>
                ))}
              </ul>
            </div>
          )}
          {guide.enrichment.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-2 text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-500" />Pengayaan</h2>
              <ul className="space-y-1">
                {guide.enrichment.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {guide.teacherNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <h2 className="font-bold text-amber-800 text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4" />Catatan Guru</h2>
          {guide.teacherNotes.teachingStrategies.length > 0 && (
            <div>
              <h3 className="font-semibold text-xs uppercase tracking-wide text-amber-700 mb-1">Strategi Mengajar</h3>
              <ul className="space-y-1">
                {guide.teacherNotes.teachingStrategies.map((n, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-900"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />{n}</li>
                ))}
              </ul>
            </div>
          )}
          {guide.teacherNotes.commonMisconceptions.length > 0 && (
            <div>
              <h3 className="font-semibold text-xs uppercase tracking-wide text-amber-700 mb-1">Miskonsepsi Umum</h3>
              <ul className="space-y-1">
                {guide.teacherNotes.commonMisconceptions.map((m, i) => (
                  <li key={i} className="text-sm text-amber-900"><span className="font-medium">{m.misconception}</span> → {m.correction}</li>
                ))}
              </ul>
            </div>
          )}
          {guide.teacherNotes.feedbackGuide.length > 0 && (
            <div>
              <h3 className="font-semibold text-xs uppercase tracking-wide text-amber-700 mb-1">Panduan Umpan Balik</h3>
              <ul className="space-y-1">
                {guide.teacherNotes.feedbackGuide.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-900"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
          )}
          {guide.teacherNotes.classroomManagement.length > 0 && (
            <div>
              <h3 className="font-semibold text-xs uppercase tracking-wide text-amber-700 mb-1">Pengelolaan Kelas</h3>
              <ul className="space-y-1">
                {guide.teacherNotes.classroomManagement.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-900"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {guide.reflection && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-2 text-sm flex items-center gap-2"><HelpCircle className="w-4 h-4 text-violet-500" />Refleksi Peserta Didik</h2>
            <ul className="space-y-1">
              {guide.reflection.studentQuestions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />{q}</li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-2 text-sm flex items-center gap-2"><HelpCircle className="w-4 h-4 text-emerald-500" />Refleksi Guru</h2>
            <ul className="space-y-1">
              {guide.reflection.teacherQuestions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{q}</li>
              ))}
            </ul>
          </div>
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
