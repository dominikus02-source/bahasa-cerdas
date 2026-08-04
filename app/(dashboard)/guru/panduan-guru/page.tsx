"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BookOpen, ChevronDown, ChevronRight, Send, Search, X, Calendar, Loader2, Check, GraduationCap, Eye, PenLine, FlaskConical, Award, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

type Unit = {
  id: string
  title: string
  topik: string | null
  kd: string | null
  grade: string | null
  semester: number | null
  order: number
}

type Level = {
  id: string
  level: number
  title: string
  description: string | null
  units: Unit[]
}

const GRADES = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]
const GRADE_OFFSET: Record<string, number> = {
  I: 13, II: 15, III: 17, IV: 19, V: 21, VI: 23,
  VII: 1, VIII: 3, IX: 5, X: 7, XI: 9, XII: 11,
}
const SEMESTERS = [1, 2]

const JENIS_OPTIONS: { value: "MATERI" | "LATIHAN" | "PRAKTIK" | "KUIS"; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "MATERI", label: "Materi Lengkap", desc: "Belajar + latihan + praktik", icon: <BookOpen className="w-4 h-4" /> },
  { value: "LATIHAN", label: "Latihan Saja", desc: "Hanya soal latihan, dinilai otomatis", icon: <PenLine className="w-4 h-4" /> },
  { value: "PRAKTIK", label: "Praktik Saja", desc: "Murid unggah hasil, guru menilai", icon: <FlaskConical className="w-4 h-4" /> },
  { value: "KUIS", label: "Kuis / Ulangan", desc: "Soal ulangan harian, dinilai otomatis", icon: <Award className="w-4 h-4" /> },
]

export default function PanduanGuruPage() {
  const router = useRouter()
  const [levels, setLevels] = useState<Level[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGrade, setExpandedGrade] = useState<string | null>("I")
  const [expandedSem, setExpandedSem] = useState<number | null>(1)
  const [search, setSearch] = useState("")
  const [assignUnit, setAssignUnit] = useState<Unit & { levelTitle: string } | null>(null)
  const [groups, setGroups] = useState<{ id: string; name: string; grade: string }[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [tenggat, setTenggat] = useState("")
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState(false)
  const [assignError, setAssignError] = useState("")
  const [jenis, setJenis] = useState<"MATERI" | "LATIHAN" | "PRAKTIK" | "KUIS">("MATERI")

  useEffect(() => {
    fetch("/api/guru/panduan")
      .then(r => r.json())
      .then(d => { if (d.data) setLevels(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch("/api/group")
      .then(r => r.json())
      .then(d => { if (d.groups) setGroups(d.groups) })
      .catch(() => {})
  }, [])

  const toggleGrade = useCallback((g: string) => {
    setExpandedGrade(prev => prev === g ? null : g)
    setExpandedSem(1)
  }, [])

  /**
   * Ambil unit satu kelas+semester.
   *
   * Ada DUA bentuk data yang masuk ke halaman ini:
   *   - SD  : satu LearningLevel per kelas, memuat kedua semester sekaligus
   *           (disintesis dari data/buku-panduan di /api/guru/panduan)
   *   - SMP/SMA: satu level PER SEMESTER, diambil dari database
   *
   * Versi lama hanya menangani bentuk kedua — ia mencari level `base + semester - 1`
   * lalu mengembalikan SELURUH unitnya tanpa menyaring. Untuk SD, level kedua
   * tidak pernah ada, sehingga semua 10 bab menumpuk di Semester 1 dan
   * Semester 2 selalu kosong.
   *
   * Sekarang unit dari kedua level dikumpulkan lalu disaring dengan medan
   * `semester` milik unit itu sendiri — benar untuk kedua bentuk. Bila seluruh
   * unit tidak punya `semester` (data lama), pembagian per level dipakai lagi
   * sebagai cadangan agar tidak ada bab yang hilang.
   */
  const unitKelas = useCallback((grade: string) => {
    const base = GRADE_OFFSET[grade as keyof typeof GRADE_OFFSET]
    if (!base || levels.length === 0) return { a: undefined, b: undefined }
    return {
      a: levels.find(l => l.level === base),
      b: levels.find(l => l.level === base + 1),
    }
  }, [levels])

  const getLevel = useCallback((grade: string, semester: number) => {
    const { a, b } = unitKelas(grade)
    return semester === 1 ? a : (b ?? a)
  }, [unitKelas])

  const unitSemester = useCallback((grade: string, semester: number) => {
    const { a, b } = unitKelas(grade)
    const semua = [...(a?.units ?? []), ...(b?.units ?? [])]
    if (semua.length === 0) return []

    const adaPenandaSemester = semua.some(u => u.semester === 1 || u.semester === 2)
    if (adaPenandaSemester) return semua.filter(u => u.semester === semester)

    // Cadangan untuk data lama tanpa medan semester.
    return semester === 1 ? (a?.units ?? []) : (b?.units ?? [])
  }, [unitKelas])

  const filteredUnits = useCallback((grade: string, semester: number) => {
    const units = unitSemester(grade, semester)
    if (!search) return units
    const q = search.toLowerCase()
    return units.filter(u => u.title.toLowerCase().includes(q))
  }, [unitSemester, search])

  const handleAssign = async () => {
    if (!assignUnit || selectedGroups.length === 0) return
    setAssignLoading(true)
    setAssignError("")
    try {
      const res = await fetch("/api/guru/penugasan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: assignUnit.id,
          groupIds: selectedGroups,
          judul: assignUnit.title,
          tenggat: tenggat || null,
          jenis,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        setAssignSuccess(true)
        setTimeout(() => { setAssignUnit(null); setAssignSuccess(false); setSelectedGroups([]); setTenggat(""); setJenis("MATERI") }, 1500)
      } else {
        setAssignError(d.error || "Gagal mengirim tugas.")
      }
    } catch {
      setAssignError("Gagal mengirim tugas.")
    }
    setAssignLoading(false)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Buku Ajar</h1>
          <p className="text-sm text-slate-500">Browse materi berdasarkan jenjang kelas &mdash; Kirim ke kelas sebagai penugasan</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Cari bab..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Grade Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {GRADES.map(grade => {
            const hasAny = [1, 2].some(sem => filteredUnits(grade, sem).length > 0)
            if (!hasAny) return null
            const isExpanded = expandedGrade === grade

            return (
              <Card key={grade} className="border border-slate-100 overflow-hidden">
                <button
                  onClick={() => toggleGrade(grade)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {grade}
                  </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">Kelas {grade}</h3>
                      <p className="text-xs text-slate-500">2 semester &middot; {[1, 2].reduce((sum, s) => sum + unitSemester(grade, s).length, 0)} bab</p>
                    </div>
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {SEMESTERS.map(sem => {
                      const units = filteredUnits(grade, sem)
                      // Judul level dipakai tombol "Kirim" saat menugaskan bab ke kelas.
                      const lvl = getLevel(grade, sem)
                      const isSemExpanded = expandedSem === sem

                      return (
                        <div key={sem}>
                          <button
                            onClick={() => setExpandedSem(isSemExpanded ? null : sem)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left text-sm"
                          >
                            <GraduationCap className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-slate-700">Semester {sem}</span>
                            {/* Hitung dari daftar yang benar-benar ditampilkan. Memakai lvl.units.length
                                menghitung SELURUH level — untuk SD satu level memuat kedua
                                semester, sehingga keduanya sama-sama tertulis 10 bab. */}
                            <Badge variant="secondary" className="ml-auto text-xs">{units.length} bab</Badge>
                            {isSemExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          </button>

                          {isSemExpanded && (
                            <div className="px-4 pb-3 space-y-1">
                              {units.length === 0 ? (
                                <p className="text-xs text-slate-400 py-2 text-center">Belum ada bab</p>
                              ) : (
                                units.map(unit => (
                                    <Link
                                      key={unit.id}
                                      href={`/guru/panduan-guru/${unit.id}`}
                                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 group"
                                    >
                                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                                        {unit.order}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{unit.title}</p>
                                        <p className="text-xs text-slate-400 truncate">CP: {unit.kd || "-"}</p>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-xs text-slate-400"><Eye className="w-3.5 h-3.5" /></span>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAssignUnit({ ...unit, levelTitle: lvl?.title || "" }); setJenis("MATERI"); setAssignError(""); setSelectedGroups([]); setTenggat("") }}
                                        >
                                          <Send className="w-3.5 h-3.5 mr-1" />
                                          Kirim
                                        </Button>
                                      </div>
                                    </Link>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Assign Modal */}
      {assignUnit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !assignLoading && setAssignUnit(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Kirim ke Kelas</h3>
              <button onClick={() => setAssignUnit(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              <span className="font-medium">{assignUnit.title}</span>
              <br />
              <span className="text-xs text-slate-400">{assignUnit.levelTitle}</span>
            </p>

            {assignSuccess ? (
              <div className="flex flex-col items-center gap-3 py-8 text-emerald-600">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <p className="font-medium">Berhasil dikirim!</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-slate-700 mb-2">Kirim Apa:</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {JENIS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setJenis(opt.value)}
                      className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                        jenis === opt.value ? "border-emerald-300 bg-emerald-50" : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className={`flex items-center gap-1.5 text-sm font-medium ${jenis === opt.value ? "text-emerald-700" : "text-slate-800"}`}>
                        {opt.icon}
                        {opt.label}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                <p className="text-xs font-medium text-slate-700 mb-2">Pilih Kelas:</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
                  {groups.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada kelas. Buat kelas dulu di KelasKu.</p>
                  ) : (
                    groups.map(g => (
                      <label
                        key={g.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedGroups.includes(g.id)
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(g.id)}
                          onChange={() => setSelectedGroups(prev =>
                            prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                          )}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{g.name}</p>
                          <p className="text-xs text-slate-400">Kelas {g.grade}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                <div className="mb-4">
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Tenggat (opsional):</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="date"
                      value={tenggat}
                      onChange={e => setTenggat(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {assignError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {assignError}
                  </div>
                )}

                <Button
                  onClick={handleAssign}
                  disabled={selectedGroups.length === 0 || assignLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  {assignLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Kirim ke {selectedGroups.length} Kelas
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
