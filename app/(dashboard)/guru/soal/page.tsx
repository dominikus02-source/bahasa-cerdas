"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen, Search, Filter, Loader2, Plus, Trash2, Edit3,
  Save, Check, X, ChevronDown, ChevronUp, Brain, Zap,
  AlertTriangle, Layers, ArrowLeft
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout"

const KELAS = ["1","2","3","4","5","6","7","8","9","10","11","12"]
const KD_OPTIONS = [
  { value: "3.1", label: "3.1 - Teks Deskripsi" },
  { value: "3.2", label: "3.2 - Teks Cerita" },
  { value: "3.3", label: "3.3 - Teks Negosiasi" },
  { value: "3.4", label: "3.4 - Teks Eksposisi" },
  { value: "3.5", label: "3.5 - Teks Anekdot" },
  { value: "3.6", label: "3.6 - Teks Laporan" },
  { value: "3.7", label: "3.7 - Surat Resmi" },
  { value: "3.8", label: "3.8 - Karya Sastra" },
  { value: "4.1", label: "4.1 - Menulis Teks" },
  { value: "4.2", label: "4.2 - Menyunting Teks" },
]

interface Soal {
  id: string
  text: string
  type: string
  difficulty: string
  options: string[]
  correctAnswer: string
  explanation: string | null
  isHOTS: boolean
  kelas: string
  topik: string | null
  KD: string | null
  source: string
  soalSetId: string | null
  createdAt: string
}

interface SoalSet {
  id: string
  title: string
  kelas: string
  _count: { questions: number }
}

export default function GuruSoalPage() {
  const router = useRouter()
  const [soals, setSoals] = useState<Soal[]>([])
  const [sets, setSets] = useState<SoalSet[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState("")
  const [filterKelas, setFilterKelas] = useState("")
  const [filterSource, setFilterSource] = useState<"all"|"AI"|"MANUAL">("all")
  const [filterType, setFilterType] = useState("")
  const [kelasList, setKelasList] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showCreateSet, setShowCreateSet] = useState(false)
  const [saveSetId, setSaveSetId] = useState("")
  const [newSetTitle, setNewSetTitle] = useState("")
  const [saving, setSaving] = useState(false)

  const [editSoal, setEditSoal] = useState<Soal | null>(null)
  const [editForm, setEditForm] = useState({ text: "", options: [""], correctAnswer: 0, explanation: "", kelas: "", KD: "", type: "PILIHAN_GANDA" })
  const [showEditModal, setShowEditModal] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")

  let sid = ""
  try { const stored = localStorage.getItem("bc-user"); if (stored) sid = JSON.parse(stored).state?.supabaseId || "" } catch {}

  const fetchSoals = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const params = new URLSearchParams()
      const stored = localStorage.getItem("bc-user")
      let supabaseId = ""
      if (stored) try { supabaseId = JSON.parse(stored).state?.supabaseId || "" } catch {}
      if (supabaseId) params.set("supabaseId", supabaseId)
      const res = await fetchWithTimeout(`/api/guru/soal?${params}`)
      if (!res.ok) throw new Error("Unable to load questions")
      const data = await res.json()
      if (data.data) {
        setSoals(data.data)
        setKelasList(data.kelasList || [])
      }
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSets = useCallback(async () => {
    try {
      const stored = localStorage.getItem("bc-user")
      let supabaseId = ""
      if (stored) try { supabaseId = JSON.parse(stored).state?.supabaseId || "" } catch {}
      const res = await fetch(`/api/guru/soal-set?supabaseId=${supabaseId}`)
      const data = await res.json()
      if (data.data) setSets(data.data)
    } catch {}
  }, [])

  useEffect(() => { void fetchSoals(); void fetchSets() }, [fetchSoals, fetchSets])

  const filtered = soals.filter(s => {
    if (search && !s.text.toLowerCase().includes(search.toLowerCase())) return false
    if (filterKelas && s.kelas !== filterKelas) return false
    if (filterSource !== "all" && s.source !== filterSource) return false
    if (filterType && s.type !== filterType) return false
    return true
  })

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const selectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([])
    else setSelectedIds(filtered.map(s => s.id))
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus soal ini?")) return
    try {
      const stored = localStorage.getItem("bc-user")
      let supabaseId = ""
      if (stored) try { supabaseId = JSON.parse(stored).state?.supabaseId || "" } catch {}
      await fetch(`/api/guru/soal?id=${id}&supabaseId=${supabaseId}`, { method: "DELETE" })
      fetchSoals()
    } catch {}
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Hapus ${selectedIds.length} soal?`)) return
    try {
      const stored = localStorage.getItem("bc-user")
      let supabaseId = ""
      if (stored) try { supabaseId = JSON.parse(stored).state?.supabaseId || "" } catch {}
      await Promise.all(selectedIds.map(id =>
        fetch(`/api/guru/soal?id=${id}&supabaseId=${supabaseId}`, { method: "DELETE" })
      ))
      setSelectedIds([])
      fetchSoals()
    } catch {}
  }

  const handleEdit = (soal: Soal) => {
    setEditSoal(soal)
    setEditForm({
      text: soal.text,
      options: soal.options && soal.options.length > 0 ? soal.options : [""],
      correctAnswer: soal.options ? soal.options.indexOf(soal.correctAnswer) : 0,
      explanation: soal.explanation || "",
      kelas: soal.kelas,
      KD: soal.KD || "",
      type: soal.type || "PILIHAN_GANDA",
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editSoal || !editForm.text) return
    setSaving(true)
    try {
      const stored = localStorage.getItem("bc-user")
      let supabaseId = ""
      if (stored) try { supabaseId = JSON.parse(stored).state?.supabaseId || "" } catch {}
      const res = await fetch("/api/guru/soal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editSoal.id,
          text: editForm.text,
          options: editForm.options,
          correctAnswer: editForm.options[editForm.correctAnswer] || "",
          explanation: editForm.explanation,
          kelas: editForm.kelas,
          KD: editForm.KD,
          type: editForm.type,
          supabaseId,
        }),
      })
      if (res.ok) {
        setShowEditModal(false)
        fetchSoals()
        setSaveMsg("✅ Soal berhasil diperbarui")
        setTimeout(() => setSaveMsg(""), 3000)
      }
    } catch {}
    setSaving(false)
  }

  const handleSaveToSet = async () => {
    if (!saveSetId || selectedIds.length === 0) return
    setSaving(true)
    try {
      const stored = localStorage.getItem("bc-user")
      let supabaseId = ""
      if (stored) try { supabaseId = JSON.parse(stored).state?.supabaseId || "" } catch {}
      const res = await fetch(`/api/guru/soal-set/${saveSetId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: selectedIds, supabaseId }),
      })
      const data = await res.json()
      if (data.success) {
        setShowSaveModal(false)
        setSelectedIds([])
        setSaveMsg(`✅ ${selectedIds.length} soal disimpan ke set`)
        setTimeout(() => setSaveMsg(""), 3000)
        fetchSets()
      } else {
        alert(data.error || "Gagal menyimpan")
      }
    } catch {}
    setSaving(false)
  }

  const handleCreateSetAndSave = async () => {
    if (!newSetTitle) return
    setSaving(true)
    try {
      const stored = localStorage.getItem("bc-user")
      let supabaseId = ""
      if (stored) try { supabaseId = JSON.parse(stored).state?.supabaseId || "" } catch {}
      const res = await fetch("/api/guru/soal-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSetTitle, kelas: soals[0]?.kelas || "", questionIds: selectedIds, supabaseId }),
      })
      const data = await res.json()
      if (data.set) {
        setShowCreateSet(false)
        setNewSetTitle("")
        setSelectedIds([])
        setSaveMsg(`✅ Set "${data.set.title}" dibuat dengan ${selectedIds.length} soal`)
        setTimeout(() => setSaveMsg(""), 3000)
        fetchSets()
      } else {
        alert(data.error || "Gagal")
      }
    } catch {}
    setSaving(false)
  }

  const typeBadge = (type: string) => {
    const m: Record<string, string> = { PILIHAN_GANDA: "PG", ESSAY: "Essay", ISIAN: "Isian" }
    return m[type] || type
  }

  const diffBadge = (diff: string) => {
    const m: Record<string, string> = { EASY: "Mudah", MEDIUM: "Sedang", HARD: "Sulit" }
    return m[diff] || diff
  }

  const diffColor = (diff: string) => {
    if (diff === "EASY") return "bg-green-100 text-green-700"
    if (diff === "HARD") return "bg-red-100 text-red-700"
    return "bg-amber-100 text-amber-700"
  }

  const sourceIcon = (s: string) => s === "AI" ? <Zap size={12} className="text-amber-500" /> : <Brain size={12} className="text-blue-500" />

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={() => router.push("/guru/bank-soal")} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-1">
            <ArrowLeft size={14} /> Kembali ke Bank Soal
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="text-emerald-500" size={28} />
            Semua Soal
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{soals.length} soal · {selectedIds.length} dipilih</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowSaveModal(true)} className="text-emerald-600 border-emerald-300">
                <Save size={14} className="mr-1" /> Simpan ke Set ({selectedIds.length})
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCreateSet(true)} className="text-blue-600 border-blue-300">
                <Plus size={14} className="mr-1" /> Buat Set Baru
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkDelete} className="text-red-600 border-red-300">
                <Trash2 size={14} className="mr-1" /> Hapus
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => router.push("/guru/bank-soal")}>
            <Layers size={14} className="mr-1" /> Kelola Set
          </Button>
        </div>
      </div>

      {saveMsg && (
        <div className="mb-4 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
          <Check size={16} /> {saveMsg}
        </div>
      )}

      {/* Filters */}
      <Card className="p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Cari soal..." />
          </div>
          <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">Semua Kelas</option>
            {kelasList.map(k => <option key={k} value={k}>Kelas {k}</option>)}
          </select>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="all">Semua Sumber</option>
            <option value="AI">AI Generate</option>
            <option value="MANUAL">Manual</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">Semua Tipe</option>
            <option value="PILIHAN_GANDA">PG</option>
            <option value="ESSAY">Essay</option>
            <option value="ISIAN">Isian</option>
          </select>
        </div>
      </Card>

      {/* Soal List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>
      ) : loadError ? (
        <div className="py-16 text-center"><p className="text-sm text-gray-500">Soal belum bisa dimuat.</p><Button className="mt-4" onClick={() => void fetchSoals()}>Coba lagi</Button></div>
      ) : filtered.length === 0 ? (
        <Card className="py-16 text-center">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="font-semibold text-gray-700 mb-1">Belum ada soal</h3>
          <p className="text-sm text-gray-500 mb-4">Generate soal dengan AI atau buat manual</p>
          <Button onClick={() => router.push("/guru/bank-soal")} className="bg-emerald-600">
            <Zap size={16} className="mr-1" /> Buat Soal Baru
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Select all row */}
          <div className="flex items-center gap-2 px-1 py-1">
            <button onClick={selectAll} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedIds.length === filtered.length ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
                {selectedIds.length === filtered.length && <Check size={10} className="text-white" />}
              </div>
              Pilih semua
            </button>
            {selectedIds.length > 0 && (
              <span className="text-xs text-gray-400">{selectedIds.length} soal dipilih</span>
            )}
          </div>

          {filtered.map((soal, idx) => {
            const isExpanded = expandedId === soal.id
            const isSelected = selectedIds.includes(soal.id)
            return (
              <Card key={soal.id} className={`transition-all ${isSelected ? "ring-2 ring-emerald-500" : "hover:shadow-sm"}`}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleSelect(soal.id)} className="mt-1 shrink-0">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-300 hover:border-emerald-400"}`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] text-gray-400 font-mono">#{soals.length - idx}</span>
                        <Badge className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700">{typeBadge(soal.type)}</Badge>
                        <Badge className={`text-xs px-2 py-0.5 ${diffColor(soal.difficulty)}`}>{diffBadge(soal.difficulty)}</Badge>
                        <Badge className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600">Kelas {soal.kelas}</Badge>
                        {soal.isHOTS && <Badge className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700">HOTS</Badge>}
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                          {sourceIcon(soal.source)} {soal.source}
                        </span>
                        {soal.KD && <span className="text-[10px] text-gray-400">KD {soal.KD}</span>}
                      </div>

                      <p className="text-sm font-medium text-gray-900">{soal.text}</p>

                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          {soal.type === "PILIHAN_GANDA" && soal.options.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider">Opsi Jawaban</p>
                              {soal.options.map((opt, i) => (
                                <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                                  soal.correctAnswer === opt
                                    ? "bg-green-50 border border-green-200 text-green-800 font-medium"
                                    : "bg-gray-50 text-gray-700"
                                }`}>
                                  <span className={"w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 " + (soal.correctAnswer === opt ? "bg-green-500 text-white" : "bg-gray-300 text-white")}>{String.fromCharCode(65 + i)}</span>
                                  {opt}
                                  {soal.correctAnswer === opt && <Check size={12} className="text-green-600 ml-auto" />}
                                </div>
                              ))}
                            </div>
                          )}
                          {soal.type !== "PILIHAN_GANDA" && soal.correctAnswer && (
                            <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-[10px] uppercase text-green-600 font-semibold tracking-wider mb-0.5">Jawaban</p>
                              <p className="text-sm font-medium text-green-800">{soal.correctAnswer}</p>
                            </div>
                          )}
                          {soal.explanation && (
                            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-[10px] uppercase text-blue-600 font-semibold tracking-wider mb-0.5">Pembahasan</p>
                              <p className="text-sm text-blue-800">{soal.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleEdit(soal)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors" title="Ubah">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(soal.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors" title="Hapus">
                        <Trash2 size={14} />
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : soal.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors" title={isExpanded ? "Tutup" : "Detail"}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Save to Set Modal */}
      <Modal isOpen={showSaveModal} onClose={() => setShowSaveModal(false)} title="Simpan Soal ke Set" className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{selectedIds.length} soal akan ditambahkan ke set</p>
          <select value={saveSetId} onChange={e => setSaveSetId(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm bg-white">
            <option value="">Pilih set...</option>
            {sets.map(s => (
              <option key={s.id} value={s.id}>
                {s.title} ({s._count?.questions || 0} soal)
              </option>
            ))}
          </select>
          {sets.length === 0 && (
            <p className="text-xs text-amber-600">Belum ada set. Buat set baru dulu.</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowSaveModal(false)} className="flex-1">Batal</Button>
            <Button onClick={handleSaveToSet} disabled={!saveSetId || saving} className="flex-1 bg-emerald-600">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Set Modal */}
      <Modal isOpen={showCreateSet} onClose={() => setShowCreateSet(false)} title="Buat Set Baru" className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{selectedIds.length} soal akan dimasukkan ke set baru</p>
          <input value={newSetTitle} onChange={e => setNewSetTitle(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 text-sm"
            placeholder="Nama set, contoh: Puisi Kelas 7" />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreateSet(false)} className="flex-1">Batal</Button>
            <Button onClick={handleCreateSetAndSave} disabled={!newSetTitle || saving} className="flex-1 bg-emerald-600">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? "..." : "Buat & Simpan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Ubah Soal" className="max-w-lg">
        <div className="space-y-4">
          <textarea value={editForm.text} onChange={e => setEditForm({ ...editForm, text: e.target.value })}
            className="w-full rounded-lg border px-4 py-2 text-sm" rows={3} placeholder="Teks pertanyaan" />
          {editForm.type === "PILIHAN_GANDA" && (
            <div className="space-y-2">
              {editForm.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name="correct" checked={editForm.correctAnswer === i}
                    onChange={() => setEditForm({ ...editForm, correctAnswer: i })}
                    className="text-emerald-600 focus:ring-emerald-500" />
                  <input value={opt} onChange={e => {
                    const opts = [...editForm.options]
                    opts[i] = e.target.value
                    setEditForm({ ...editForm, options: opts })
                  }} className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
                    placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
                </div>
              ))}
            </div>
          )}
          <textarea value={editForm.explanation} onChange={e => setEditForm({ ...editForm, explanation: e.target.value })}
            className="w-full rounded-lg border px-4 py-2 text-sm" rows={2} placeholder="Pembahasan (opsional)" />
          <div className="grid grid-cols-2 gap-3">
            <select value={editForm.kelas} onChange={e => setEditForm({ ...editForm, kelas: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm bg-white">
              {KELAS.map(k => <option key={k} value={k}>Kelas {k}</option>)}
            </select>
            <select value={editForm.KD} onChange={e => setEditForm({ ...editForm, KD: e.target.value })}
              className="rounded-lg border px-3 py-2 text-sm bg-white">
              <option value="">KD</option>
              {KD_OPTIONS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)} className="flex-1">Batal</Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.text || saving} className="flex-1 bg-emerald-600">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
