"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Presentation, Search, Grid3x3, List,
  Maximize2, BookOpen, ChevronLeft, ChevronRight,
  Upload, X, Loader2, FileText, Check, AlertTriangle
} from "lucide-react"
import { MateriViewer } from "@/components/materi/MateriViewer"
import { FILE_TYPE_LABELS } from "@/lib/upload"
import { createClient } from "@/lib/supabase/client"

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
  const [showViewer, setShowViewer] = useState(false)
  const [viewingMateri, setViewingMateri] = useState<Materi | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState({ title: "", description: "", grade: "SMP Kelas 7" })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

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
            <p className="text-gray-500 mt-1">Materi pembelajaran BahasaCerdas untuk SD–SMA</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
              <Upload size={16} /> Upload Materi
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium">
              <BookOpen size={16} />
              Materi Resmi BC
            </div>
          </div>
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
          <p className="text-gray-500">Materi akan ditambahkan oleh admin BahasaCerdas</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(m => (
            <MateriCard key={m.id} materi={m} onPresent={() => handlePresent(m)} />
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

      {showViewer && viewingMateri && (
        <MateriViewer
          materi={viewingMateri}
          onClose={() => { setShowViewer(false); setViewingMateri(null) }}
        />
      )}

      {/* ═══ Upload Modal ═══ */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => { if (!uploading) setShowUpload(false) }}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <button onClick={() => { if (!uploading) setShowUpload(false) }} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <X size={16} className="text-gray-500" />
            </button>
            <h2 className="font-bold text-lg text-gray-900 mb-4">Upload Materi Ajar</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Judul *</label>
                <input value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="RPP Teks Deskripsi Kelas 7" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Deskripsi</label>
                <textarea value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Jenjang *</label>
                <select value={uploadForm.grade} onChange={e => setUploadForm({ ...uploadForm, grade: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none">
                  {Object.entries(GRADES_BY_LEVEL).flatMap(([level, grades]) => grades.map(g => ({ level, grade: g }))).map(({ level, grade }) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">File *</label>
                <input type="file" accept=".pdf,.pptx,.docx,.xlsx,.zip,.mp4"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden" id="materi-file-input" />
                <label htmlFor="materi-file-input"
                  className="flex items-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                  {uploadFile ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText size={20} className="text-emerald-600 shrink-0" />
                      <span className="text-sm font-medium text-gray-700 truncate">{uploadFile.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                      <button onClick={e => { e.stopPropagation(); setUploadFile(null) }} className="p-1 rounded hover:bg-red-100 ml-auto">
                        <X size={14} className="text-red-500" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 justify-center">
                      <Upload size={20} className="text-gray-400" />
                      <span className="text-sm text-gray-500 font-medium">Klik untuk pilih file</span>
                    </div>
                  )}
                </label>
                <p className="text-[10px] text-gray-400 mt-1">PDF, PPTX, DOCX, XLSX, ZIP, MP4 — Maks 50MB</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowUpload(false); setUploadFile(null); setUploadForm({ title: "", description: "", grade: "SMP Kelas 7" }) }}
                  className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Batal
                </button>
                <button onClick={async () => {
                  if (!uploadForm.title || !uploadFile) return
                  setUploading(true)
                  try {
                    // 1. Upload file directly to Supabase Storage (bypass Vercel 4.5MB limit)
                    const supabase = createClient()
                    const fileExt = uploadFile.name.split(".").pop()?.toLowerCase() || "pdf"
                    const fileName = `materi/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`

                    const { data: uploadData, error: uploadError } = await supabase.storage
                      .from("documents")
                      .upload(fileName, uploadFile, {
                        cacheControl: "31536000",
                        upsert: false,
                      })

                    if (uploadError) {
                      const isRLS = uploadError.message?.toLowerCase().includes("row-level security") ||
                                    uploadError.message?.includes("policy")
                      if (isRLS) {
                        alert("Izin upload ditolak. Hubungi admin untuk mengaktifkan izin storage.")
                      } else {
                        alert("Gagal upload file: " + uploadError.message)
                      }
                      return
                    }

                    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(uploadData.path)

                    // 2. Send metadata only to API (no file)
                    const fd = new FormData()
                    fd.set("title", uploadForm.title)
                    fd.set("description", uploadForm.description)
                    fd.set("grade", uploadForm.grade)
                    fd.set("isPublished", "true")
                    fd.set("fileUrl", urlData.publicUrl)
                    fd.set("fileKey", uploadData.path)
                    fd.set("fileType", fileExt.toUpperCase())

                    const res = await fetch("/api/guru/materi", { method: "POST", body: fd })
                    const data = await res.json()
                    if (res.ok) {
                      setShowUpload(false); setUploadFile(null)
                      setUploadForm({ title: "", description: "", grade: "SMP Kelas 7" })
                      fetchMateris()
                    } else {
                      alert(data.error || "Gagal upload")
                    }
                  } catch (e: any) { alert(e?.message || "Error") }
                  setUploading(false)
                }} disabled={uploading || !uploadForm.title || !uploadFile}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><Upload size={16} /> Upload</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MateriCard({ materi, onPresent }: { materi: Materi; onPresent: () => void }) {
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
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Resmi</span>
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
        </div>
      </div>
    </div>
  )
}
