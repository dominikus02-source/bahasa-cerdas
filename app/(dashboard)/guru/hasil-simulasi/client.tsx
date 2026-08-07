"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  Brain, Users, Search, AlertTriangle, Download, RefreshCw,
  Loader2, Sparkles, HeartPulse, CheckCircle2, TrendingUp, GraduationCap,
} from "lucide-react"

interface GroupOpt { id: string; name: string; memberCount: number }
interface SeksiStat { seksi: string; avg: number; count: number }

interface Stats {
  hariIni: { mengikuti: number; selesai: number; belumSelesai: number }
  rataRata: number
  selesaiCount: number
  totalAttempts: number
  aiTemuan: { jumlah: number; seksi: string } | null
  siapUKBI: number
  perluPendampingan: number
  statusCounts: Record<string, number>
  seksiStats: SeksiStat[]
}

interface Row {
  userId: string; userName: string; groupId: string; groupName: string
  paketId: string; paketTitle: string; paketType: string; attemptNumber: number
  status: string; score: number; percentage: number; predikat: string | null
  startedAt: string | null; finishedAt: string | null; pendingReview: number
  constructedCount: number; approvedCount: number; hasCert: boolean
}

interface ClassSummary { summary: string; ai: boolean }
interface Insight {
  topikTersulitMingguIni: string | null; topikTerbaik: string | null
  kompetensiNaik: string | null; kompetensiTurun: string | null
  kelasTerbaik: { name: string; rataRata: number } | null
  muridPalingBerkembang: { name: string; delta: number } | null
  muridPerluPerhatian: Array<{ name: string; percentage: number }> | null
  rekomendasi: string
}

interface RekapData {
  stats: Stats
  rows: Row[]
  groups: GroupOpt[]
  total: number
  totalPages: number
  classSummary?: ClassSummary | null
  insight?: Insight | null
}

const STATUS_LABEL: Record<string, string> = {
  BELUM_DIKERJAKAN: "Belum Dikerjakan",
  SEDANG_DIKERJAKAN: "Sedang Dikerjakan",
  MENUNGGU_PENILAIAN_AI: "Menunggu Penilaian AI",
  AI_SELESAI_MENILAI: "AI Selesai Menilai",
  MENUNGGU_PERSETUJUAN_GURU: "Menunggu Guru",
  SELESAI: "Selesai",
}
const STATUS_COLOR: Record<string, string> = {
  BELUM_DIKERJAKAN: "bg-slate-100 text-slate-600",
  SEDANG_DIKERJAKAN: "bg-blue-100 text-blue-700",
  MENUNGGU_PENILAIAN_AI: "bg-amber-100 text-amber-700",
  AI_SELESAI_MENILAI: "bg-cyan-100 text-cyan-700",
  MENUNGGU_PERSETUJUAN_GURU: "bg-violet-100 text-violet-700",
  SELESAI: "bg-emerald-100 text-emerald-700",
}

export function PusatEvaluasiClient({ guruName }: { guruName: string }) {
  const [filter, setFilter] = useState({ groupId: "", jenis: "SEMUA", status: "", search: "", from: "", to: "" })
  const [groups, setGroups] = useState<GroupOpt[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [classSummary, setClassSummary] = useState<ClassSummary | null>(null)
  const [insight, setInsight] = useState<Insight | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.groupId) params.set("groupId", filter.groupId)
      if (filter.jenis !== "SEMUA") params.set("jenis", filter.jenis)
      if (filter.status) params.set("status", filter.status)
      if (filter.search) params.set("search", filter.search)
      if (filter.from) params.set("from", filter.from)
      if (filter.to) params.set("to", filter.to)
      params.set("page", String(page))
      params.set("limit", "20")
      params.set("summary", filter.groupId ? "1" : "0")
      params.set("insight", "1")
      const res = await fetch(`/api/guru/simulasi/rekap?${params}`, { cache: "no-store" })
      if (!res.ok) throw new Error()
      const d: RekapData = await res.json()
      setStats(d.stats)
      setRows(d.rows || [])
      setGroups(d.groups || [])
      setTotalPages(d.totalPages || 1)
      setTotal(d.total || 0)
      if (d.classSummary) setClassSummary(d.classSummary)
      if (d.insight) setInsight(d.insight)
    } catch {
      // biarkan data tetap
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => { void load() }, [load])

  const update = (k: keyof typeof filter, v: string) => {
    setPage(1)
    setFilter((f) => ({ ...f, [k]: v }))
  }
  const reset = () => {
    setPage(1)
    setFilter({ groupId: "", jenis: "SEMUA", status: "", search: "", from: "", to: "" })
  }

  const exportFile = (format: string) => {
    const params = new URLSearchParams()
    params.set("format", format)
    if (filter.groupId) params.set("groupId", filter.groupId)
    if (filter.jenis !== "SEMUA") params.set("jenis", filter.jenis)
    if (filter.search) params.set("search", filter.search)
    window.open(`/api/guru/dokumen-siswa?${params}`, "_blank")
  }

  const predikatColor = (p: string | null) => {
    if (!p) return "bg-gray-100 text-gray-700"
    const map: Record<string, string> = {
      Istimewa: "bg-emerald-100 text-emerald-700", "Sangat Unggul": "bg-teal-100 text-teal-700",
      Unggul: "bg-cyan-100 text-cyan-700", Madya: "bg-blue-100 text-blue-700",
      Semenjana: "bg-amber-100 text-amber-700", Terbatas: "bg-rose-100 text-rose-700",
      A: "bg-emerald-100 text-emerald-700", B: "bg-blue-100 text-blue-700",
      C: "bg-amber-100 text-amber-700", D: "bg-slate-100 text-slate-700",
    }
    return map[p] || "bg-gray-100 text-gray-700"
  }

  const statusKeys = Object.keys(STATUS_LABEL)

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-5 sm:p-6 mb-6 text-white shadow-lg shadow-emerald-600/20">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
            <Brain size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Pusat Evaluasi Pembelajaran</h1>
            <p className="text-sm text-emerald-100">Asisten AI membantu guru mengetahui siapa yang belum mengerjakan, siapa perlu remedial, materi tersulit, dan kelas paling berkembang. {guruName ? `Halo, ${guruName}!` : ""}</p>
          </div>
        </div>
      </div>

      {/* Insight AI */}
      {insight && (
        <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl p-4 sm:p-5 mb-6 text-white shadow-lg shadow-violet-600/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-amber-300" />
            <h2 className="font-bold text-sm">Insight AI Minggu Ini</h2>
            <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded-full ml-auto">{insight.muridPerluPerhatian?.length || 0} perlu perhatian</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-xs mb-3">
            {insight.topikTersulitMingguIni && (
              <div className="bg-white/10 rounded-xl p-2.5">
                <p className="text-violet-300 mb-0.5">Topik tersulit</p>
                <p className="font-bold flex items-center gap-1"><AlertTriangle size={12} className="text-amber-300" /> {insight.topikTersulitMingguIni}</p>
              </div>
            )}
            {insight.topikTerbaik && (
              <div className="bg-white/10 rounded-xl p-2.5">
                <p className="text-violet-300 mb-0.5">Topik terbaik</p>
                <p className="font-bold flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-300" /> {insight.topikTerbaik}</p>
              </div>
            )}
            {insight.kelasTerbaik && (
              <div className="bg-white/10 rounded-xl p-2.5">
                <p className="text-violet-300 mb-0.5">Kelas terbaik minggu ini</p>
                <p className="font-bold">{insight.kelasTerbaik.name} · {insight.kelasTerbaik.rataRata}</p>
              </div>
            )}
            {insight.muridPalingBerkembang && (
              <div className="bg-white/10 rounded-xl p-2.5">
                <p className="text-violet-300 mb-0.5">Murid paling berkembang</p>
                <p className="font-bold">{insight.muridPalingBerkembang.name} (+{insight.muridPalingBerkembang.delta})</p>
              </div>
            )}
            {insight.kompetensiNaik && (
              <div className="bg-white/10 rounded-xl p-2.5">
                <p className="text-violet-300 mb-0.5">Kompetensi naik</p>
                <p className="font-bold text-emerald-300">{insight.kompetensiNaik}</p>
              </div>
            )}
            {insight.kompetensiTurun && (
              <div className="bg-white/10 rounded-xl p-2.5">
                <p className="text-violet-300 mb-0.5">Kompetensi turun</p>
                <p className="font-bold text-rose-300">{insight.kompetensiTurun}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-white/80 bg-white/10 rounded-lg p-2.5 leading-relaxed">{insight.rekomendasi}</p>
        </div>
      )}

      {/* AI Ringkasan Kelas */}
      {classSummary && (
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-4 mb-6 text-white shadow-lg shadow-sky-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={15} className="text-sky-200" />
            <h3 className="font-bold text-sm flex items-center gap-2">Ringkasan Kelas oleh AI
              {classSummary.ai && <span className="text-[10px] px-1.5 py-0.5 bg-white/25 rounded-full">AI</span>}
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-sky-50">{classSummary.summary}</p>
        </div>
      )}

      {/* Filter bar global: Kelas → Tanggal → Jenis → Status → Cari */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 mb-4 shadow-sm flex flex-wrap items-center gap-2">
        <select value={filter.groupId} onChange={(e) => update("groupId", e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Semua Kelas</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.memberCount})</option>)}
        </select>
        <input type="date" value={filter.from} onChange={(e) => update("from", e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5" />
        <span className="text-xs text-slate-400">→</span>
        <input type="date" value={filter.to} onChange={(e) => update("to", e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5" />
        <div className="flex gap-1">
          {(["SEMUA", "UKBI", "TKA"] as const).map((j) => (
            <button key={j} onClick={() => update("jenis", j)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter.jenis === j ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {j === "SEMUA" ? "Semua" : j}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filter.search} onChange={(e) => update("search", e.target.value)} placeholder="Cari murid..." className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-700 px-2">Reset</button>
        <div className="flex gap-1.5 ml-auto">
          <button onClick={() => exportFile("csv")} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"><Download size={13} /> CSV</button>
          <button onClick={() => exportFile("docx")} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"><Download size={13} /> DOC</button>
        </div>
      </div>

      {/* Statistik KPI */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1.5"><Users size={14} /><span>Hari Ini</span></div>
            <p className="text-2xl font-bold text-slate-900">{stats.hariIni.mengikuti}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stats.hariIni.selesai} selesai · {stats.hariIni.belumSelesai} belum</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1.5"><TrendingUp size={14} /><span>Nilai Rata-rata</span></div>
            <p className="text-2xl font-bold text-emerald-600">{stats.rataRata}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stats.selesaiCount} dari {stats.totalAttempts} selesai</p>
          </div>
          <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-1.5"><AlertTriangle size={14} /><span>AI Menemukan Lemah</span></div>
            {stats.aiTemuan ? (
              <>
                <p className="text-2xl font-bold text-amber-600">{stats.aiTemuan.jumlah} murid</p>
                <p className="text-xs text-amber-700 mt-0.5">lemah di <b>{stats.aiTemuan.seksi}</b></p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-emerald-600">0</p>
                <p className="text-xs text-slate-500 mt-0.5">belum ada temuan lemah</p>
              </>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-violet-200 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-violet-400 text-xs font-semibold mb-1.5"><GraduationCap size={14} /><span>Kesiapan</span></div>
            <p className="text-2xl font-bold text-violet-600">{stats.siapUKBI}</p>
            <p className="text-xs text-violet-600 mt-0.5">{stats.perluPendampingan} perlu pendampingan</p>
          </div>
        </div>
      )}

      {/* Pipeline status chips */}
      {stats && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button onClick={() => update("status", "")} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filter.status === "" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            Semua ({total})
          </button>
          {statusKeys.map((k) => (
            <button key={k} onClick={() => update("status", filter.status === k ? "" : k)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filter.status === k ? STATUS_COLOR[k] + " ring-2 ring-slate-300 ring-offset-1" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {STATUS_LABEL[k]} ({stats.statusCounts[k] || 0})
            </button>
          ))}
        </div>
      )}

      {/* Tabel hasil */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <AlertTriangle size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Belum ada data sesuai filter</p>
          <p className="text-sm text-slate-400 mt-1">Murid kelasmu akan muncul setelah menyelesaikan simulasi.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Murid</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Kelas</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Paket</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Skor</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Predikat</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Tanggal</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.userId}-${r.paketId}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{r.userName}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{r.groupName}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-40 truncate">{r.paketTitle}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[11px] px-2 py-1 rounded-full font-bold whitespace-nowrap ${STATUS_COLOR[r.status] || "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                      {r.pendingReview > 0 && (
                        <span className="block text-[10px] text-amber-600 mt-0.5">{r.pendingReview} perlu AI/guru</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{r.score}{r.percentage ? <span className="text-slate-400 font-normal"> · {r.percentage.toFixed(0)}%</span> : null}</td>
                    <td className="px-4 py-3 text-center">
                      {r.predikat && <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${predikatColor(r.predikat)}`}>{r.predikat}</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400 whitespace-nowrap">
                      {r.finishedAt ? new Date(r.finishedAt).toLocaleDateString("id-ID") : r.startedAt ? new Date(r.startedAt).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {r.pendingReview > 0 && (
                          <Link href="/guru/tinjau-simulasi" className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold whitespace-nowrap">Tinjau</Link>
                        )}
                        {r.hasCert && (
                          <Link href="/guru/dokumen-latihan" className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold whitespace-nowrap">Dokumen</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">Total {total} baris · Hal {page}/{totalPages}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40">← Sebelum</button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40">Berikut →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CTA ke halaman lain */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        <Link href="/guru/tinjau-simulasi" className="bg-white rounded-2xl border border-violet-200 p-4 hover:bg-violet-50/50 transition-colors">
          <div className="flex items-center gap-2 text-violet-700 font-bold text-sm mb-1"><Sparkles size={16} /> AI Review Center</div>
          <p className="text-xs text-slate-500">Tinjau jawaban Menulis/Berbicara yang dinilai AI, atur penilaian, kirim feedback.</p>
        </Link>
        <Link href="/guru/dokumen-latihan" className="bg-white rounded-2xl border border-emerald-200 p-4 hover:bg-emerald-50/50 transition-colors">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-1"><GraduationCap size={16} /> Repository Pembelajaran</div>
          <p className="text-xs text-slate-500">Kumpulan dokumen hasil murid: jenis, kelas, jumlah murid, dan ringkasan AI.</p>
        </Link>
      </div>
    </div>
  )
}