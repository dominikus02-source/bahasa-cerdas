"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Presentation, Upload, Search, Grid3x3, List,
  Eye, Trash2, Edit2, X, FileText, ChevronLeft, ChevronRight,
  Maximize2, Minimize2, Download, BookOpen
} from "lucide-react"
import { MateriViewer } from "@/components/materi/MateriViewer"
import { FILE_TYPE_LABELS } from "@/lib/upload"

interface Materi {
  id: string
  title: string
  description: string | null
  content: string
  fileUrl: string | null
  fileKey: string | null
  fileType: string | null
  grade: string | null
  semester: number | null
  tahunAjaran: string | null
  tema: string | null
  subtema: string | null
  isPublished: boolean
  isPremium: boolean
  price: number
  downloads: number
  subject: string | null
  createdAt: string
  updatedAt: string
}

type LevelTab = "SD" | "SMP" | "SMA"

const GRADES_BY_LEVEL: Record<LevelTab, string[]> = {
  SD: ["SD Kelas 1", "SD Kelas 2", "SD Kelas 3", "SD Kelas 4", "SD Kelas 5", "SD Kelas 6"],
  SMP: ["SMP Kelas 7", "SMP Kelas 8", "SMP Kelas 9"],
  SMA: ["SMA Kelas 10", "SMA Kelas 11", "SMA Kelas 12"],
}

export default function MateriAjarPage() {
  const [materis, setMateris] = useState<Materi[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<LevelTab>("SD")
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showUpload, setShowUpload] = useState(false)
  const [showViewer, setShowViewer] = useState(false)
  const [viewingMateri, setViewingMateri] = useState<Materi | null>(null)
  const [editingMateri, setEditingMateri] = useState<Materi | null>(null)

  const fetchMateris = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "24" })
      const res = await fetch(`/api/guru/materi?${params}`)
      const data = await res.json()
      if (data.data) {
        setMateris(data.data)
        setTotalPages(data.totalPages || 1)
      }
    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchMateris() }, [fetchMateris])

  const grades = GRADES_BY_LEVEL[activeTab]
  const filtered = materis.filter(m => {
    const matchLevel = m.grade ? grades.includes(m.grade) : false
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.description || "").toLowerCase().includes(search.toLowerCase())
    return matchLevel && matchSearch
  })

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus materi ini?")) return
    try {
      const res = await fetch(`/api/guru/materi?id=${id}`, { method: "DELETE" })
      if (res.ok) fetchMateris()
    } catch (err) { console.error(err) }
  }

  const handlePresent = (materi: Materi) => {
    setViewingMateri(materi)
    setShowViewer(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Presentation className="text-emerald-500" size={28} />
            Materi Ajar
          </h1>
          <p className="text-gray-500 mt-1">Kelola dan presentasikan materi PPT/PDF untuk SD–SMA</p>
        </div>
        <button
          onClick={() => { setEditingMateri(null); setShowUpload(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
        >
          <Upload size={18} /> Upload Materi
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-50 rounded-xl p-1">
            {(["SD", "SMP", "SMA"] as LevelTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1) }}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[200px] relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={`Cari materi ${activeTab}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 ${viewMode === "grid" ? "bg-emerald-50 text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Grid3x3 size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 ${viewMode === "list" ? "bg-emerald-50 text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-28 bg-gray-100 rounded-xl mb-4" />
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Belum ada materi {activeTab}</h3>
          <p className="text-gray-500 mb-4">Upload PPT atau PDF untuk mulai mengajar</p>
          <button
            onClick={() => { setEditingMateri(null); setShowUpload(true) }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
          >
            <Upload size={16} /> Upload Sekarang
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(m => (
            <MateriCard key={m.id} materi={m} onPresent={() => handlePresent(m)} onDelete={() => handleDelete(m.id)} onEdit={() => { setEditingMateri(m); setShowUpload(true) }} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {filtered.map(m => (
            <div key={m.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs ${m.fileType === "PPTX" ? "bg-orange-500" : "bg-red-500"}`}>
                {m.fileType || "FILE"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{m.title}</p>
                <p className="text-xs text-gray-500">{m.grade || "—"} • {m.fileType ? FILE_TYPE_LABELS[m.fileType] || m.fileType : "No file"}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handlePresent(m)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Presentasi">
                  <Maximize2 size={16} />
                </button>
                <button onClick={() => { setEditingMateri(m); setShowUpload(true) }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(m.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600">Halaman {page} dari {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {showUpload && (
        <UploadModal
          level={activeTab}
          onClose={() => { setShowUpload(false); setEditingMateri(null) }}
          editMateri={editingMateri}
          onDone={() => { setShowUpload(false); setEditingMateri(null); fetchMateris() }}
        />
      )}

      {showViewer && viewingMateri && (
        <MateriViewer
          materi={viewingMateri}
          onClose={() => { setShowViewer(false); setViewingMateri(null) }}
        />
      )}
    </div>
  )
}

function MateriCard({ materi, onPresent, onDelete, onEdit }: { materi: Materi; onPresent: () => void; onDelete: () => void; onEdit: () => void }) {
  const isPPT = materi.fileType === "PPTX"
  const isPDF = materi.fileType === "PDF"

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-gray-100 transition-all group">
      <div className={`h-28 flex items-center justify-center ${isPPT ? "bg-gradient-to-br from-orange-100 to-amber-50" : isPDF ? "bg-gradient-to-br from-red-50 to-rose-50" : "bg-gradient-to-br from-blue-50 to-indigo-50"}`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xs shadow-lg ${isPPT ? "bg-gradient-to-br from-orange-500 to-amber-500" : isPDF ? "bg-gradient-to-br from-red-500 to-rose-500" : "bg-gradient-to-br from-blue-500 to-indigo-500"}`}>
          {materi.fileType || "FILE"}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{materi.title}</h3>
          {materi.isPublished && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Published</span>
          )}
        </div>
        {materi.grade && (
          <p className="text-xs text-gray-500 mb-3">{materi.grade}</p>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={onPresent}
            disabled={!materi.fileUrl}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Maximize2 size={14} /> Presentasi
          </button>
          <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function UploadModal({ level, onClose, editMateri, onDone }: { level: LevelTab; onClose: () => void; editMateri: Materi | null; onDone: () => void }) {
  const [title, setTitle] = useState(editMateri?.title || "")
  const [grade, setGrade] = useState(editMateri?.grade || GRADES_BY_LEVEL[level][0])
  const [file, setFile] = useState<File | null>(null)
  const [isPublished, setIsPublished] = useState(editMateri?.isPublished || false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [dragOver, setDragOver] = useState(false)

  const grades = GRADES_BY_LEVEL[level]

  useEffect(() => {
    if (!editMateri) {
      setGrade(GRADES_BY_LEVEL[level][0])
    }
  }, [level, editMateri])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError("Judul wajib diisi"); return }
    if (!editMateri && !file) { setError("File wajib diupload"); return }

    setUploading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("title", title)
      formData.append("grade", grade)
      formData.append("isPublished", String(isPublished))
      if (file) formData.append("file", file)

      if (editMateri) {
        formData.append("id", editMateri.id)
        const res = await fetch("/api/guru/materi", { method: "PUT", body: formData })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Gagal update") }
      } else {
        const res = await fetch("/api/guru/materi", { method: "POST", body: formData })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Gagal upload") }
      }
      onDone()
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan")
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      const ext = dropped.name.split(".").pop()?.toLowerCase()
      if (["pdf", "pptx", "docx", "xlsx", "zip"].includes(ext || "")) {
        setFile(dropped)
        setError("")
      } else {
        setError("File harus PDF, PPTX, DOCX, XLSX, atau ZIP")
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{editMateri ? "Edit Materi" : "Upload Materi"}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Tingkat: <span className="font-semibold text-emerald-600">{level}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Judul Materi *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: Teks Prosedur"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kelas *</label>
            <select
              value={grade}
              onChange={e => setGrade(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {!editMateri && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">File (PDF/PPTX) *</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragOver ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600">
                    <FileText size={20} />
                    <span className="text-sm font-medium">{file.name}</span>
                    <button type="button" onClick={() => setFile(null)} className="ml-2 text-gray-400 hover:text-red-500">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Drag & drop atau <label className="text-emerald-600 font-medium cursor-pointer hover:underline">browse<input type="file" className="hidden" accept=".pdf,.pptx,.docx,.xlsx" onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} /></label></p>
                    <p className="text-xs text-gray-400 mt-1">PDF, PPTX, DOCX, XLSX (max 50MB)</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={isPublished}
              onChange={e => setIsPublished(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="isPublished" className="text-sm text-gray-700">Publikasikan (bisa diakses siswa)</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Batal
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Upload...</>
              ) : (
                <><Upload size={16} /> {editMateri ? "Update" : "Upload"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
