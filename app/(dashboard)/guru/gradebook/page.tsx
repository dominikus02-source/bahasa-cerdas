"use client"

import { useEffect, useState, useCallback } from "react"
import { BookOpen, Download, FileSpreadsheet, Search, Users, BarChart3, FileText, ChevronDown } from "lucide-react"

type Group = { id: string; name: string; grade: string }

const SUMBER_COLOR: Record<string, string> = {
  MANUAL: "bg-slate-100 text-slate-500",
  PENUGASAN: "bg-blue-50 text-blue-600",
  KARYA: "bg-purple-50 text-purple-600",
  QUIZ: "bg-amber-50 text-amber-600",
  GAME: "bg-green-50 text-green-600",
  JALUR_CERDAS: "bg-teal-50 text-teal-600",
  UKBI_TKA: "bg-indigo-50 text-indigo-600",
  MATERI_LATIHAN: "bg-orange-50 text-orange-600",
}

const getColor = (skor: number | null | undefined) => {
  if (skor === null || skor === undefined) return "text-gray-300"
  if (skor >= 85) return "text-emerald-600"
  if (skor >= 70) return "text-green-600"
  if (skor >= 60) return "text-amber-600"
  if (skor >= 40) return "text-orange-600"
  return "text-red-600"
}

export default function GradebookPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [view, setView] = useState<"kategori" | "penugasan">("kategori")

  useEffect(() => {
    fetch("/api/guru/gradebook")
      .then(r => r.json())
      .then(d => { if (d.data) setGroups(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadGroup = useCallback(async (id: string) => {
    setSelectedGroup(id)
    setLoading(true)
    const res = await fetch(`/api/guru/gradebook?groupId=${id}`)
    const d = await res.json()
    if (d.data) setData(d.data)
    setLoading(false)
  }, [])

  const filteredStudents = data?.students?.filter((s: any) =>
    s.fullName.toLowerCase().includes(search.toLowerCase())
  ) || []

  const columns = view === "kategori" ? data?.kategoris || [] : data?.penugasans || []

  const exportCSV = () => {
    if (!data) return
    if (view === "kategori") {
      const headers = ["Nama", ...data.kategoris.map((k: any) => k.nama), "Rata-rata"]
      const rows = filteredStudents.map((s: any) => [
        s.fullName,
        ...data.kategoris.map((k: any) => {
          const score = s.scores?.[data.kategoris.indexOf(k)]
          return score?.skor ?? ""
        }),
        s.overall ?? "",
      ])
      const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n")
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `gradebook-${selectedGroup}-kategori.csv`; a.click()
      URL.revokeObjectURL(url)
    } else {
      const headers = ["Nama", ...data.penugasans.map((p: any) => p.title)]
      const rows = filteredStudents.map((s: any) => [
        s.fullName,
        ...data.penugasans.map((p: any) => {
          const prog = s.progress.find((sp: any) => sp.unitId === p.unitId)
          return prog?.completed ? (prog.score || "✓") : "-"
        }),
      ])
      const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n")
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `gradebook-${selectedGroup}-penugasan.csv`; a.click()
      URL.revokeObjectURL(url)
    }
  }

  const exportDOCX = async () => {
    const res = await fetch(`/api/guru/nilai/export?groupId=${selectedGroup}&format=docx&view=${view}`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `gradebook-${selectedGroup}-${view}.docx`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 rounded-2xl p-5 text-white mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">Buku Nilai</p>
            <p className="text-sm text-emerald-200 mt-0.5">
              Rekap nilai per kategori dan penugasan. Hubungkan dengan Penilaian Siswa untuk input manual.
            </p>
          </div>
          <BookOpen size={24} />
        </div>
      </div>

      {/* Class buttons */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {groups.map(g => (
          <button key={g.id} onClick={() => loadGroup(g.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
              selectedGroup === g.id
                ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200"
            }`}>
            <Users size={15} />
            {g.name}
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{g.grade}</span>
          </button>
        ))}
        {groups.length === 0 && !loading && (
          <p className="text-sm text-gray-400">Belum ada kelas. Buat kelas dulu di KelasKu.</p>
        )}
      </div>

      {selectedGroup && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin w-7 h-7 border-[3px] border-emerald-500 border-t-transparent rounded-full" />
            </div>
          ) : data ? (
            <>
              {/* Toolbar */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 max-w-xs">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Cari siswa..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400" />
                </div>
                <div className="flex items-center gap-2">
                  {/* View toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
                    <button onClick={() => setView("kategori")}
                      className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                        view === "kategori" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}>
                      Per Kategori
                    </button>
                    <button onClick={() => setView("penugasan")}
                      className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                        view === "penugasan" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}>
                      Per Tugas
                    </button>
                  </div>
                  {/* Export */}
                  <div className="relative group">
                    <button onClick={exportCSV}
                      className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-all">
                      <Download size={14} /> CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats bar (kategori view only) */}
              {view === "kategori" && data.kategoriStats?.length > 0 && (
                <div className="px-4 py-3 border-b border-gray-50 bg-emerald-50/30">
                  <div className="flex gap-4 flex-wrap text-xs">
                    {data.kategoriStats.map((stat: any) => (
                      <div key={stat.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-emerald-100">
                        <span className="font-semibold text-gray-600">{stat.nama}:</span>
                        <span className="text-emerald-600 font-bold">Rata {stat.average}</span>
                        <span className="text-gray-400">Tertinggi {stat.max}</span>
                        <span className="text-gray-400">Terendah {stat.min}</span>
                        <span className="text-gray-400">({stat.count} nilai)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs sticky left-0 bg-gray-50 min-w-[160px]">Nama Siswa</th>
                      {columns.map((col: any) => (
                        <th key={col.id} className="text-center py-3 px-3 font-semibold text-gray-600 text-xs min-w-[90px]">
                          <span className="truncate block max-w-[120px] mx-auto">{col.title || col.nama}</span>
                        </th>
                      ))}
                      <th className="text-center py-3 px-3 font-semibold text-emerald-700 text-xs bg-emerald-50/50 min-w-[70px]">Rata-rata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 2} className="text-center py-12 text-sm text-gray-400">
                          <Users size={24} className="mx-auto mb-2 text-gray-300" />
                          Tidak ada siswa
                        </td>
                      </tr>
                    ) : filteredStudents.map((student: any) => (
                      <tr key={student.id} className="border-b border-gray-50 hover:bg-emerald-50/20 transition-colors">
                        <td className="py-2.5 px-4 sticky left-0 bg-white hover:bg-emerald-50/20">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {student.fullName.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-gray-800 truncate">{student.fullName}</span>
                          </div>
                        </td>
                        {view === "kategori"
                          ? data.kategoris.map((k: any) => {
                              const score = student.scores?.[data.kategoris.indexOf(k)]
                              return (
                                <td key={k.id} className="text-center py-2.5 px-3 relative group">
                                  {score ? (
                                    <span className={`inline-block text-xs font-bold px-2 py-1 rounded ${getColor(score.skor)} bg-gray-50`}
                                      title={score.keterangan || score.sumberType}>
                                      {score.skor}
                                      <span className="text-[8px] text-gray-400 ml-1">({score.count})</span>
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-300">—</span>
                                  )}
                                </td>
                              )
                            })
                          : data.penugasans.map((p: any) => {
                              const prog = student.progress.find((sp: any) => sp.unitId === p.unitId)
                              return (
                                <td key={p.id} className="text-center py-2.5 px-2">
                                  {prog?.completed ? (
                                    <span className={`text-xs font-bold ${
                                      (prog.score || 0) >= 80 ? "text-emerald-600" :
                                      (prog.score || 0) >= 60 ? "text-amber-600" : "text-red-500"
                                    }`}>
                                      {prog.score || "✓"}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-300">—</span>
                                  )}
                                </td>
                              )
                            })
                        }
                        <td className={`text-center py-2.5 px-3 font-bold text-xs ${getColor(student.overall)} bg-emerald-50/30`}>
                          {student.overall ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-sm text-gray-400">Tidak ada data</div>
          )}
        </div>
      )}

      {!selectedGroup && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <BarChart3 size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">Pilih kelas untuk melihat Buku Nilai</p>
          <p className="text-xs text-gray-400 mt-1">Nilai dari penugasan, kuis, game, dan simulasi akan muncul di sini.</p>
        </div>
      )}
    </div>
  )
}
