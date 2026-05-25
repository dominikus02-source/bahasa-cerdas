"use client"

import { useEffect, useState, useCallback } from "react"
import { BookOpen, ChevronRight, Download, FileSpreadsheet, Users, GraduationCap, Search, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

type Group = { id: string; name: string; grade: string }

export default function GradebookPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

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

  const exportCSV = () => {
    if (!data) return
    const headers = ["Nama", ...data.penugasans.map((p: any) => p.title)]
    const rows = data.students.map((s: any) => [
      s.fullName,
      ...data.penugasans.map((p: any) => {
        const prog = s.progress.find((sp: any) => sp.unitId === p.unitId)
        return prog?.completed ? (prog.score || "✓") : "-"
      }),
    ])
    const csv = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `nilai-${selectedGroup}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Buku Nilai</h1>
          <p className="text-sm text-slate-500">Rekap nilai penugasan Buku Panduan per kelas</p>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap mb-6">
        {groups.map(g => (
          <button
            key={g.id}
            onClick={() => loadGroup(g.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
              selectedGroup === g.id
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <Users className="w-4 h-4" />
            {g.name}
            <Badge variant="secondary" className="text-[10px]">{g.grade}</Badge>
          </button>
        ))}
        {groups.length === 0 && !loading && (
          <p className="text-sm text-slate-400">Belum ada kelas. Buat kelas dulu di KelasKu.</p>
        )}
      </div>

      {selectedGroup && (
        <Card className="border-slate-100">
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">
                <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
                Memuat data...
              </div>
            ) : data ? (
              <>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Cari siswa..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-10 max-w-xs h-9 text-sm"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={exportCSV} className="text-emerald-600 border-emerald-200">
                    <Download className="w-4 h-4 mr-1" />
                    Export CSV
                  </Button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left py-3 px-4 font-semibold text-slate-600 text-xs sticky left-0 bg-slate-50/50 min-w-[150px]">Nama</th>
                      {data.penugasans.map((p: any) => (
                        <th key={p.id} className="text-center py-3 px-2 font-semibold text-slate-600 text-xs min-w-[90px] max-w-[120px]">
                          <span className="truncate block">{p.title}</span>
                        </th>
                      ))}
                      <th className="text-center py-3 px-3 font-semibold text-slate-600 text-xs">Rata-rata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={data.penugasans.length + 2} className="text-center py-10 text-sm text-slate-400">
                          Tidak ada siswa
                        </td>
                      </tr>
                    ) : filteredStudents.map((student: any) => {
                      const scores = data.penugasans.map((p: any) => {
                        const prog = student.progress.find((sp: any) => sp.unitId === p.unitId)
                        return prog
                      })
                      const completed = scores.filter((s: any) => s?.completed)
                      const avg = completed.length > 0
                        ? Math.round(completed.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / completed.length)
                        : 0

                      return (
                        <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 sticky left-0 bg-white hover:bg-slate-50/50">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                {student.fullName.charAt(0)}
                              </div>
                              <span className="text-sm font-medium text-slate-800 truncate">{student.fullName}</span>
                            </div>
                          </td>
                          {scores.map((s: any, i: number) => (
                            <td key={i} className="text-center py-2.5 px-2">
                              {s?.completed ? (
                                <span className={`text-xs font-bold ${
                                  (s.score || 0) >= 80 ? "text-emerald-600" :
                                  (s.score || 0) >= 60 ? "text-amber-600" : "text-red-500"
                                }`}>
                                  {s.score || "✓"}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          ))}
                          <td className="text-center py-2.5 px-3">
                            <span className={`text-xs font-bold ${
                              avg >= 80 ? "text-emerald-600" :
                              avg >= 60 ? "text-amber-600" : "text-slate-400"
                            }`}>
                              {completed.length > 0 ? avg : "—"}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="p-8 text-center text-sm text-slate-400">
                Tidak ada data
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
