"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PenLine, Mic, Loader2, CheckCircle2, Save, Sparkles, Send, X, Eye,
  Users, Check, ShieldCheck, Brain,
} from "lucide-react";

interface DimCell { skor?: number; komentar?: string }
interface RubrikRow { kriteria?: string; skor?: number; catatan?: string }
interface AiFeedback {
  ringkasan?: string; nilai?: number
  rubrik?: RubrikRow[]
  kelebihan?: string[]; kelemahan?: string[]; kesalahanTerbesar?: string[]
  kompetensiBelum?: string[]; rekomendasi?: string
  komentarGuru?: string; komentarMurid?: string; dimensi?: Record<string, DimCell>
  komentarGuruDisetujui?: string
}

interface Item {
  id: string; studentId: string; student: string; groupId: string; groupName: string
  seksi: string; questionText: string; answer: string; transcript: string | null
  isAudio: boolean; score: number; aiConfidence: number | null; aiReviewedAt: string | null
  reviewStatus: string | null; rubric: unknown; wordLimit: { min?: number; max?: number } | null
  createdAt: string; aiFeedback?: AiFeedback | null
}

interface GroupOpt { id: string; name: string; memberCount: number }

const WRITING_DIMS = [
  { key: "struktur", label: "Struktur" }, { key: "tataBahasa", label: "Tata Bahasa" },
  { key: "ejaan", label: "Ejaan" }, { key: "koherensi", label: "Koherensi" },
  { key: "kohesi", label: "Kohesi" }, { key: "pilihanKata", label: "Pilihan Kata" },
  { key: "orisinalitas", label: "Orisinalitas" },
]
const SPEAKING_DIMS = [
  { key: "kelancaran", label: "Kelancaran" }, { key: "pelafalan", label: "Pelafalan" },
  { key: "kosakata", label: "Kosakata" }, { key: "kejelasan", label: "Kejelasan" },
  { key: "grammar", label: "Grammar" },
]

function confBadge(c?: number | null) {
  if (c == null) return { label: "Belum Dinilai", cls: "bg-slate-100 text-slate-600 border-slate-200" }
  if (c >= 90) return { label: `AI ${c}% · Yakin`, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
  if (c >= 70) return { label: `AI ${c}% · Cek`, cls: "bg-amber-50 text-amber-700 border-amber-200" }
  return { label: `AI ${c}% · Review`, cls: "bg-rose-50 text-rose-700 border-rose-200" }
}

/**
 * TinjauSimulasiView — AI Review Center: queue jawaban Menulis/Berbicara,
 * konfidensi AI, approve batch, nilai manual, kirim feedback ke murid.
 *
 * Dipakai oleh 2 konteks:
 * - Route legacy /guru/tinjau-simulasi (standalone, hero besar).
 * - Hub /guru/evaluasi-simulasi?tab=tinjau (hub = true, hero disembunyikan).
 */
export function TinjauSimulasiView({ hub = false }: { hub?: boolean }) {
  const [items, setItems] = useState<Item[]>([])
  const [groups, setGroups] = useState<GroupOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [scores, setScores] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [filter, setFilter] = useState({ kelas: "", seksi: "ALL", status: "", q: "", page: 1 })
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [checklist, setChecklist] = useState<Set<string>>(new Set())
  const [feedbackModal, setFeedbackModal] = useState<Item | null>(null)
  const [feedbackText, setFeedbackText] = useState("")
  const [flash, setFlash] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.kelas) params.set("groupId", filter.kelas)
      if (filter.seksi) params.set("seksi", filter.seksi)
      if (filter.status) params.set("status", filter.status)
      if (filter.q) params.set("search", filter.q)
      params.set("page", String(filter.page))
      params.set("limit", "20")
      const res = await fetch(`/api/guru/tinjau-konstruktif?${params}`)
      if (!res.ok) throw new Error()
      const d = await res.json()
      setItems(d.items || [])
      setTotal(d.total || 0)
      setTotalPages(d.totalPages || 1)
      setScores((prev) => {
        const init: Record<string, string> = { ...prev }
        ;(d.items || []).forEach((it: Item) => { init[it.id] = String(it.score ?? "") })
        return init
      })
    } catch {} finally { setLoading(false) }
  }, [filter])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    fetch("/api/guru/simulasi/rekap?summary=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.groups) setGroups(d.groups)
      })
      .catch(() => {})
  }, [])

  const update = (k: keyof typeof filter, v: string) => setFilter((f) => ({ ...f, [k]: v, page: 1 }))

  const runAction = async (action: string, body: Record<string, unknown>) => {
    setBusyId(String(body.answerId || "bulk"))
    setFlash("")
    try {
      const res = await fetch("/api/guru/tinjau-konstruktif", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setFlash(d.error || "Gagal"); return false }
      await load()
      return true
    } catch { setFlash("Gagal memproses"); return false }
    finally { setBusyId(null) }
  }

  const save = async (id: string) => {
    const ok = await runAction("score", { answerId: id, score: Number(scores[id] || 0) })
    if (ok) setFlash("Nilai tersimpan")
  }
  const aiReview = async (id: string) => {
    setFlash("AI sedang menilai...")
    const ok = await runAction("ai", { answerId: id })
    if (ok) setFlash("Selesai dinilai AI")
  }
  const approveOne = async (id: string) => {
    const ok = await runAction("approve", { answerId: id })
    if (ok) setFlash("Jawaban disetujui")
  }
  const approveAll = async () => {
    const ids = [...checklist]
    if (ids.length === 0) { setFlash("Pilih jawaban dulu"); return }
    const ok = await runAction("approve", { answerIds: ids })
    if (ok) { setChecklist(new Set()); setFlash(`${ids.length} jawaban disetujui`) }
  }

  const toggleCheck = (id: string) => {
    setChecklist((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  const sendFeedback = async () => {
    if (!feedbackModal) return
    const ok = await runAction("kirim", { answerId: feedbackModal.id, komentar: feedbackText, score: Number(scores[feedbackModal.id] || 0) })
    if (ok) { setFeedbackModal(null); setFeedbackText(""); setFlash("Feedback terkirim ke murid") }
  }

  const statusBadge = (it: Item) => {
    if (it.reviewStatus === "APPROVED")
      return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">Disetujui</span>
    if (it.aiReviewedAt)
      return <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold">Menunggu Guru</span>
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">Menunggu AI</span>
  }

  return (
    <div className={hub ? "mx-auto max-w-5xl" : "mx-auto max-w-5xl p-4 sm:p-6"}>
      {/* Hero (khusus standalone) */}
      {!hub && (
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-5 mb-6 text-white shadow-lg shadow-violet-600/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><Brain size={22} /></div>
            <div>
              <h1 className="text-xl font-bold">AI Review Center</h1>
              <p className="text-sm text-violet-100">Jawaban Menulis & Berbicara dinilai AI. Tinjau confidence, setujui, atau kirim feedback — batch bila perlu.</p>
            </div>
          </div>
        </div>
      )}

      {flash && <div className="mb-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2 text-sm text-slate-700 font-medium">{flash}</div>}

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 mb-4 flex flex-wrap gap-2 items-center">
        <select value={filter.kelas} onChange={(e) => update("kelas", e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white">
          <option value="">Semua Kelas</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div className="flex gap-1">
          {(["", "MENULIS", "BERBICARA"] as const).map((f) => (
            <button key={f || "ALL"} onClick={() => update("seksi", f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter.seksi === f ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {f === "MENULIS" ? "Menulis" : f === "BERBICARA" ? "Berbicara" : "Semua"}
            </button>
          ))}
        </div>
        <select value={filter.status} onChange={(e) => update("status", e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white">
          <option value="">Semua Status</option>
          <option value="MENUNGGU_PENILAIAN_AI">Menunggu Penilaian AI</option>
          <option value="AI_SELESAI_MENILAI">AI Selesai Menilai</option>
          <option value="MENUNGGU_PERSETUJUAN_GURU">Menunggu Persetujuan Guru</option>
          <option value="SELESAI">Disetujui / Selesai</option>
        </select>
        <input value={filter.q} onChange={(e) => update("q", e.target.value)} placeholder="Cari murid..." className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 flex-1 min-w-40 bg-white" />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500 flex items-center gap-1"><Users size={13} />{checklist.size || 0} dipilih · {total} total</span>
          <button
            onClick={approveAll}
            disabled={checklist.size === 0 || busyId === "bulk"}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 font-semibold"
          >
            {busyId === "bulk" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check size={14} />}
            Approve ({checklist.size})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-slate-400">
          <Sparkles size={40} className="mx-auto text-slate-200 mb-3" />
          <p>Belum ada jawaban Menulis/Berbicara dari murid kelasmu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const conf = confBadge(it.aiConfidence)
            const isWriting = it.seksi !== "BERBICARA"
            const dims = dimsFor(it.seksi)
            const fb = it.aiFeedback
            return (
              <div key={it.id} className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <label className="mt-1">
                    <input type="checkbox" checked={checklist.has(it.id)} onChange={() => toggleCheck(it.id)} className="h-4 w-4 accent-emerald-600" />
                  </label>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold ${isWriting ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {isWriting ? <PenLine className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                        {isWriting ? "Menulis" : "Berbicara"}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{it.student}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{it.groupName}</span>
                      {statusBadge(it)}
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${conf.cls}`}>{conf.label}</span>
                    </div>

                    {it.questionText && <p className="mb-2 text-xs text-slate-500">Soal: {it.questionText}</p>}

                    {it.isAudio ? (
                      <audio controls src={it.answer} className="w-full" preload="none">Browser tidak mendukung pemutar audio.</audio>
                    ) : (
                      <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                        {it.answer || <span className="text-slate-400">(kosong)</span>}
                      </div>
                    )}

                    {/* AI ringkas */}
                    {fb?.ringkasan && (
                      <div className="mt-2 rounded-lg bg-violet-50 border border-violet-100 p-2.5 text-xs text-slate-700">
                        <span className="font-bold text-violet-700 flex items-center gap-1"><Sparkles size={12} /> AI:</span> {fb.ringkasan}
                      </div>
                    )}

                    {/* Detail */}
                    {expanded === it.id && fb && (
                      <div className="mt-3 space-y-3">
                        {fb.dimensi && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {dims.map((d) => {
                              const cell = fb.dimensi?.[d.key]
                              const sc = Number(cell?.skor ?? 0)
                              return (
                                <div key={d.key} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] font-semibold text-slate-500">{d.label}</span>
                                    <span className={`text-[11px] font-bold ${sc >= 70 ? "text-emerald-600" : sc >= 50 ? "text-amber-600" : "text-rose-600"}`}>{sc}</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                    <div className={`h-full ${sc >= 70 ? "bg-emerald-500" : sc >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${sc}%` }} />
                                  </div>
                                  {cell?.komentar && <p className="mt-1 text-[11px] text-slate-500 leading-snug">{cell.komentar}</p>}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {Array.isArray(fb.rubrik) && fb.rubrik.length > 0 && (
                          <div className="rounded-lg border border-slate-100 p-2.5">
                            <p className="text-[11px] font-bold text-slate-500 mb-1.5">Rubrik</p>
                            {fb.rubrik.map((r, i) => (
                              <div key={i} className="flex items-center gap-2 py-0.5 text-xs">
                                <span className="flex-1 text-slate-600">{r.kriteria || "-"}</span>
                                <span className={`font-bold ${(r.skor || 0) >= 70 ? "text-emerald-600" : "text-amber-600"}`}>{r.skor ?? 0}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {fb.kelebihan && fb.kelebihan.length > 0 && (
                          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5">
                            <p className="text-[11px] font-bold text-emerald-700 mb-1">Kelebihan</p>
                            {fb.kelebihan.map((s, i) => <p key={i} className="text-xs text-slate-700">• {s}</p>)}
                          </div>
                        )}
                        {fb.kelemahan && fb.kelemahan.length > 0 && (
                          <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-2.5">
                            <p className="text-[11px] font-bold text-rose-700 mb-1">Kelemahan</p>
                            {fb.kelemahan.map((s, i) => <p key={i} className="text-xs text-slate-700">• {s}</p>)}
                          </div>
                        )}
                        {fb.kesalahanTerbesar && fb.kesalahanTerbesar.length > 0 && (
                          <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-2.5">
                            <p className="text-[11px] font-bold text-amber-700 mb-1">Kesalahan Terbesar</p>
                            {fb.kesalahanTerbesar.map((s, i) => <p key={i} className="text-xs text-slate-700">• {s}</p>)}
                          </div>
                        )}
                        {fb.kompetensiBelum && fb.kompetensiBelum.length > 0 && (
                          <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-2.5">
                            <p className="text-[11px] font-bold text-violet-700 mb-1">Kompetensi Belum Dikuasai</p>
                            {fb.kompetensiBelum.map((s, i) => <p key={i} className="text-xs text-slate-700">• {s}</p>)}
                          </div>
                        )}
                        {fb.rekomendasi && (
                          <div className="rounded-lg border border-sky-100 bg-sky-50/50 p-2.5 text-xs text-slate-700">
                            <span className="font-bold text-sky-700">Rekomendasi Latihan: </span>{fb.rekomendasi}
                          </div>
                        )}
                        {fb.komentarGuru && (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
                            <span className="font-bold">Komentar untuk Guru: </span>{fb.komentarGuru}
                          </div>
                        )}
                        {fb.komentarMurid && (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs text-slate-700">
                            <span className="font-bold text-emerald-700">Siap Kirim ke Murid: </span>{fb.komentarMurid}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Aksi */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className="text-xs font-medium text-slate-500">Nilai (0-100):</label>
                      <input
                        type="number" min={0} max={100}
                        value={scores[it.id] ?? ""}
                        onChange={(e) => setScores((s) => ({ ...s, [it.id]: e.target.value }))}
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                      />
                      <button
                        onClick={() => save(it.id)}
                        disabled={busyId === it.id}
                        className="flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                      >
                        {busyId === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save size={14} />} Simpan
                      </button>
                      <button
                        onClick={() => aiReview(it.id)}
                        disabled={busyId === it.id}
                        className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        {busyId === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles size={14} />} Nilai AI
                      </button>
                      <button
                        onClick={() => { setFeedbackModal(it); setFeedbackText(fb?.komentarMurid || "") }}
                        className="flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-200"
                      >
                        <Send size={14} /> Kirim Feedback
                      </button>
                      {it.reviewStatus !== "APPROVED" && (
                        <button
                          onClick={() => approveOne(it.id)}
                          disabled={busyId === it.id}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {busyId === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 size={14} />} Setujui
                        </button>
                      )}
                      <button onClick={() => setExpanded(expanded === it.id ? null : it.id)} className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
                        {expanded === it.id ? "Sembunyikan" : <><Eye size={13} /> Detail Analisis</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 py-2">
              <p className="text-xs text-slate-500">Total {total} · Hal {filter.page}/{totalPages}</p>
              <div className="flex gap-2">
                <button disabled={filter.page <= 1} onClick={() => setFilter((f) => ({ ...f, page: f.page - 1 }))} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40">←</button>
                <button disabled={filter.page >= totalPages} onClick={() => setFilter((f) => ({ ...f, page: f.page + 1 }))} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40">→</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal kirim feedback */}
      {feedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Send size={16} className="text-emerald-600" /> Kirim Feedback ke {feedbackModal.student}</h3>
              <button onClick={() => setFeedbackModal(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
            </div>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
              placeholder="Tulis komentar untuk murid ini..."
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setFeedbackModal(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Batal</button>
              <button onClick={sendFeedback} className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">Kirim</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function dimsFor(seksi: string) {
  return seksi === "BERBICARA" ? SPEAKING_DIMS : WRITING_DIMS
}
