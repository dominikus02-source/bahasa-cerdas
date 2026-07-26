"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Presentation, Search, Grid3x3, List,
  Maximize2, BookOpen, ChevronLeft, ChevronRight,
  Upload, X, Loader2, FileText, Check,
  Sparkles, Download, Eye, Crown, Folder, Send, AlertCircle
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
type Folder = "" | "MODUL" | "PPT" | "PDF"

const GRADES_BY_LEVEL: Record<LevelTab, string[]> = {
  SD: ["SD Kelas 1", "SD Kelas 2", "SD Kelas 3", "SD Kelas 4", "SD Kelas 5", "SD Kelas 6"],
  SMP: ["SMP Kelas 7", "SMP Kelas 8", "SMP Kelas 9"],
  SMA: ["SMA Kelas 10", "SMA Kelas 11", "SMA Kelas 12"],
}

const FOLDERS: { value: Folder; label: string; hint: string }[] = [
  { value: "MODUL", label: "Modul Ajar", hint: "DOCX, XLSX, ZIP" },
  { value: "PPT", label: "PPT", hint: "Presentasi" },
  { value: "PDF", label: "PDF", hint: "Dokumen PDF" },
]

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
  const [uploadForm, setUploadForm] = useState({ title: "", description: "", grade: "SMP Kelas 7", tema: "" })
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [sort, setSort] = useState<"recent" | "popular">("recent")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [kelasFilter, setKelasFilter] = useState<string>("") // grade spesifik, "" = semua di jenjang
  const [folder, setFolder] = useState<Folder>("")
  const [folderCounts, setFolderCounts] = useState<{ MODUL: number; PPT: number; PDF: number }>({ MODUL: 0, PPT: 0, PDF: 0 })
  const [quota, setQuota] = useState<{ used: number; limit: number | null; unlimited: boolean } | null>(null)
  const [detailMateri, setDetailMateri] = useState<Materi | null>(null)
  const [kirimMateri, setKirimMateri] = useState<Materi | null>(null)

  // Debounce kotak pencarian → cari di server (bukan hanya di halaman yang termuat)
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const getSid = () => {
    try { const stored = localStorage.getItem("bc-user"); if (stored) return JSON.parse(stored).state?.supabaseId || "" } catch {}
    return ""
  }

  const fetchMateris = useCallback(async () => {
    setLoading(true)
    try {
      const sid = getSid()
      const params = new URLSearchParams({ page: String(page), limit: "24", sort })
      if (sid) params.set("supabaseId", sid)
      if (debouncedSearch) params.set("q", debouncedSearch)
      if (kelasFilter) params.set("grade", kelasFilter)
      else if (activeTab) params.set("level", activeTab)
      if (folder) params.set("folder", folder)
      const res = await fetch(`/api/guru/materi?${params}`)
      const data = await res.json()
      if (data.data) {
        setMateris(data.data)
        setTotalPages(data.totalPages || 1)
        if (data.quota) setQuota(data.quota)
        if (data.folderCounts) setFolderCounts(data.folderCounts)
      }
    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [page, sort, debouncedSearch, activeTab, kelasFilter, folder])

  useEffect(() => { fetchMateris() }, [fetchMateris])

  const handlePresent = (m: Materi) => {
    setViewingMateri(m)
    setShowViewer(true)
  }

  // Pencarian & filter jenjang dilakukan di server (lihat fetchMateris).
  const filtered = materis

  return (
    <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Presentation className="text-emerald-500" size={28} />
              Bank Modul Ajar
            </h1>
            <p className="text-gray-500 mt-1">Cari modul ajar sesuai tema, unduh, atau buat sendiri dengan AI</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
              <Upload size={16} /> Unggah Modul
            </button>
            {quota && (
              quota.unlimited ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium">
                  <Download size={16} /> Unduhan tak terbatas
                </div>
              ) : (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${quota.used >= (quota.limit ?? 10) ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                  <Download size={16} /> Sisa unduhan: {Math.max(0, (quota.limit ?? 10) - quota.used)}/{quota.limit ?? 10}
                </div>
              )
            )}
          </div>
        </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-50 rounded-xl p-1">
            {(["SD", "SMP", "SMA"] as LevelTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setKelasFilter(""); setFolder(""); setPage(1) }}
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
              placeholder="Cari modul ajar berdasarkan tema, judul, atau kata kunci..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <select
            value={sort}
            onChange={e => { setSort(e.target.value as "recent" | "popular"); setPage(1) }}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="recent">Terbaru</option>
            <option value="popular">Terpopuler</option>
          </select>

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

        {/* Pilih kelas (per kelas, tidak dicampur) */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs font-medium text-gray-400 mr-1">Kelas:</span>
          <button
            onClick={() => { setKelasFilter(""); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${kelasFilter === "" ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
          >
            Semua
          </button>
          {(GRADES_BY_LEVEL[activeTab] || []).map(g => (
            <button
              key={g}
              onClick={() => { setKelasFilter(g); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${kelasFilter === g ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
            >
              {g.replace(/^(SD|SMP|SMA)\s*/, "")}
            </button>
          ))}
        </div>

        {/* Folder: Modul Ajar / PPT / PDF */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs font-medium text-gray-400 mr-1">Folder:</span>
          <button
            onClick={() => { setFolder(""); setPage(1) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${folder === "" ? "bg-gray-800 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
          >
            Semua
          </button>
          {FOLDERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setFolder(f.value); setPage(1) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${folder === f.value ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
              title={f.hint}
            >
              <Folder size={13} /> {f.label}
              <span className={`ml-0.5 px-1.5 rounded-full text-[10px] ${folder === f.value ? "bg-white/20" : "bg-gray-200 text-gray-500"}`}>
                {folderCounts[f.value as "MODUL" | "PPT" | "PDF"] ?? 0}
              </span>
            </button>
          ))}
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
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {debouncedSearch ? `Tidak ada modul ajar untuk "${debouncedSearch}"` : `Belum ada modul ajar ${activeTab}`}
          </h3>
          <p className="text-gray-500 mb-4">
            {debouncedSearch ? "Coba kata kunci/tema lain, atau buat sendiri dengan AI." : "Unggah modul ajar atau buat dengan AI."}
          </p>
          <a href="/guru/ai-tools?tool=rpp" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
            <Sparkles size={16} /> Buat dengan AI
          </a>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(m => (
            <MateriCard key={m.id} materi={m} onView={() => setDetailMateri(m)} onKirim={() => setKirimMateri(m)} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {filtered.map(m => (
            <div key={m.id} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
              <button onClick={() => setDetailMateri(m)} className="flex-1 flex items-center gap-4 text-left min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 ${m.fileType === "PPTX" ? "bg-orange-500" : m.fileType === "PDF" ? "bg-red-500" : "bg-blue-500"}`}>
                  {m.fileType || "FILE"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{m.title}</p>
                  <p className="text-xs text-gray-500 truncate">{m.grade || "—"}{m.tema ? ` • ${m.tema}` : ""}</p>
                </div>
                <span className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><Eye size={15} /> Lihat</span>
              </button>
              {m.fileUrl && (
                <button onClick={() => setKirimMateri(m)} className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 rounded-lg px-3 py-2 hover:bg-violet-100 transition-colors">
                  <Send size={14} /> Kirim
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {detailMateri && (
        <MateriDetailModal
          materi={detailMateri}
          quota={quota}
          getSid={getSid}
          onClose={() => setDetailMateri(null)}
          onQuota={(q) => setQuota(q)}
          onPresent={() => { const m = detailMateri; setDetailMateri(null); if (m) handlePresent(m) }}
          onKirim={() => { const m = detailMateri; setDetailMateri(null); if (m) setKirimMateri(m) }}
        />
      )}

      {kirimMateri && (
        <MateriKirimModal materi={kirimMateri} onClose={() => setKirimMateri(null)} />
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
            <h2 className="font-bold text-lg text-gray-900 mb-1">Unggah Modul Ajar</h2>
            <p className="text-xs text-gray-500 mb-4">Bisa pilih banyak file Word/PDF sekaligus. Isi tema agar mudah ditemukan guru saat mencari.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Tema *</label>
                <input value={uploadForm.tema} onChange={e => setUploadForm({ ...uploadForm, tema: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="mis. Teks Deskripsi, Puisi, Teks Prosedur" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Judul <span className="font-normal text-gray-400">(opsional — jika banyak file, otomatis dari nama file)</span></label>
                <input value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Kosongkan untuk memakai nama file" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Deskripsi</label>
                <textarea value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">Jenjang / Kelas *</label>
                <select value={uploadForm.grade} onChange={e => setUploadForm({ ...uploadForm, grade: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none">
                  {Object.entries(GRADES_BY_LEVEL).flatMap(([level, grades]) => grades.map(g => ({ level, grade: g }))).map(({ level, grade }) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">File * <span className="font-normal text-gray-400">(bisa pilih banyak)</span></label>
                <input type="file" multiple accept=".pdf,.docx,.pptx,.xlsx,.zip"
                  onChange={e => {
                    const picked = Array.from(e.target.files || [])
                    const allowed = ["pdf", "docx", "pptx", "xlsx", "zip"]
                    const valid = picked.filter(f => allowed.includes(f.name.split(".").pop()?.toLowerCase() || ""))
                    if (valid.length < picked.length) alert("Sebagian file dilewati — hanya PDF, DOCX, PPTX, XLSX, ZIP.")
                    setUploadFiles(valid)
                  }}
                  className="hidden" id="materi-file-input" />
                <label htmlFor="materi-file-input"
                  className="flex items-center gap-2 justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                  <Upload size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-500 font-medium">{uploadFiles.length > 0 ? `${uploadFiles.length} file dipilih — klik untuk ganti` : "Klik untuk pilih file (bisa banyak)"}</span>
                </label>
                {uploadFiles.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {uploadFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-2 py-1.5">
                        <FileText size={14} className="text-emerald-600 shrink-0" />
                        <span className="truncate flex-1 text-gray-700">{f.name}</span>
                        <span className="text-gray-400 shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                        <button onClick={() => setUploadFiles(files => files.filter((_, idx) => idx !== i))} className="p-0.5 rounded hover:bg-red-100 shrink-0">
                          <X size={12} className="text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-1">Word (DOCX), PDF, PPTX, XLSX, ZIP — Maks 50MB per file</p>
              </div>
              {uploadProgress && (
                <div className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                  Mengunggah {uploadProgress.done}/{uploadProgress.total} file...
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowUpload(false); setUploadFiles([]); setUploadForm({ title: "", description: "", grade: "SMP Kelas 7", tema: "" }) }}
                  disabled={uploading}
                  className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                  Batal
                </button>
                <button onClick={async () => {
                  if (uploadFiles.length === 0 || !uploadForm.tema.trim()) return
                  setUploading(true)
                  setUploadProgress({ done: 0, total: uploadFiles.length })
                  const supabase = createClient()
                  const { data: { user } } = await supabase.auth.getUser()
                  const userId = user?.id || "anonymous"
                  let sid = ""
                  try { const stored = localStorage.getItem("bc-user"); if (stored) sid = JSON.parse(stored).state?.supabaseId || "" } catch {}
                  let ok = 0, failed = 0, rlsBlocked = false
                  for (const f of uploadFiles) {
                    try {
                      const fileExt = f.name.split(".").pop()?.toLowerCase() || "pdf"
                      const fileName = `${userId}/materi/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
                      const { data: uploadData, error: uploadError } = await supabase.storage
                        .from("documents").upload(fileName, f, { cacheControl: "31536000", upsert: false })
                      if (uploadError || !uploadData) {
                        if (uploadError?.message?.toLowerCase().includes("row-level security") || uploadError?.message?.includes("policy")) rlsBlocked = true
                        failed++
                      } else {
                        const { data: urlData } = supabase.storage.from("documents").getPublicUrl(uploadData.path)
                        const baseName = f.name.replace(/\.[^.]+$/, "")
                        const title = (uploadFiles.length === 1 && uploadForm.title.trim()) ? uploadForm.title.trim() : baseName
                        const fd = new FormData()
                        fd.set("title", title)
                        fd.set("description", uploadForm.description)
                        fd.set("grade", uploadForm.grade)
                        fd.set("tema", uploadForm.tema.trim())
                        fd.set("isPublished", "true")
                        fd.set("fileUrl", urlData.publicUrl)
                        fd.set("fileKey", uploadData.path)
                        fd.set("fileType", fileExt.toUpperCase())
                        if (sid) fd.set("supabaseId", sid)
                        const res = await fetch("/api/guru/materi", { method: "POST", body: fd })
                        if (res.ok) ok++; else failed++
                      }
                    } catch { failed++ }
                    setUploadProgress(p => ({ done: (p?.done || 0) + 1, total: uploadFiles.length }))
                  }
                  setUploading(false); setUploadProgress(null)
                  if (rlsBlocked) alert("Izin upload ditolak. Hubungi admin untuk mengaktifkan izin storage.")
                  else if (failed > 0) alert(`${ok} berhasil diunggah, ${failed} gagal.`)
                  if (ok > 0) {
                    setShowUpload(false); setUploadFiles([])
                    setUploadForm({ title: "", description: "", grade: "SMP Kelas 7", tema: "" })
                    setSort("recent"); setPage(1); fetchMateris()
                  }
                }} disabled={uploading || uploadFiles.length === 0 || !uploadForm.tema.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {uploading ? <><Loader2 size={16} className="animate-spin" /> Mengunggah...</> : <><Upload size={16} /> Unggah {uploadFiles.length > 0 ? `(${uploadFiles.length})` : ""}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MateriCard({ materi, onView, onKirim }: { materi: Materi; onView: () => void; onKirim: () => void }) {
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
        {materi.tema && (
          <span className="inline-block text-[10px] px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full font-medium mb-1.5">{materi.tema}</span>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          {materi.grade && <span>{materi.grade}</span>}
          {materi.grade && <span className="text-gray-300">•</span>}
          <span className="flex items-center gap-1"><Download size={11} /> {materi.downloads ?? 0}</span>
        </div>
        {materi.fileUrl && (
          <div className="flex gap-2">
            <button onClick={onView}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
              <Eye size={14} /> Detail
            </button>
            <button onClick={onKirim}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors">
              <Send size={14} /> Kirim
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

type Quota = { used: number; limit: number | null; unlimited: boolean }

function MateriDetailModal({ materi, quota, getSid, onClose, onQuota, onPresent, onKirim }: {
  materi: Materi; quota: Quota | null; getSid: () => string; onClose: () => void; onQuota: (q: Quota) => void; onPresent: () => void; onKirim: () => void
}) {
  const [downloading, setDownloading] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [msg, setMsg] = useState("")
  const [done, setDone] = useState(false)
  const isPPT = materi.fileType === "PPTX"
  const isPDF = materi.fileType === "PDF"

  const preview = () => {
    if (!materi.fileUrl) return
    const url = isPDF ? materi.fileUrl : `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(materi.fileUrl)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const download = async () => {
    if (!materi.fileUrl) return
    setDownloading(true); setMsg(""); setLimitReached(false)
    try {
      const res = await fetch(`/api/guru/materi/${materi.id}/download`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supabaseId: getSid() }),
      })
      const data = await res.json()
      if (res.status === 403 && data.limitReached) { setLimitReached(true); setMsg(data.error); return }
      if (!res.ok || !data.fileUrl) { setMsg(data.error || "Gagal mengunduh."); return }
      if (typeof data.used === "number") onQuota({ used: data.used, limit: data.limit, unlimited: data.unlimited })
      const ext = (materi.fileType || "docx").toLowerCase()
      const resp = await fetch(data.fileUrl)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `${materi.title}.${ext}`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch { setMsg("Gagal mengunduh. Coba lagi.") }
    finally { setDownloading(false) }
  }

  const remaining = quota && !quota.unlimited ? Math.max(0, (quota.limit ?? 10) - quota.used) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-gray-100 flex items-center justify-center">
          <X size={16} className="text-gray-500" />
        </button>
        <div className={`h-24 flex items-center justify-center ${isPPT ? "bg-gradient-to-br from-orange-100 to-amber-50" : isPDF ? "bg-gradient-to-br from-red-50 to-rose-50" : "bg-gradient-to-br from-blue-50 to-indigo-50"}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xs shadow-lg ${isPPT ? "bg-gradient-to-br from-orange-500 to-amber-500" : isPDF ? "bg-gradient-to-br from-red-500 to-rose-500" : "bg-gradient-to-br from-blue-500 to-indigo-500"}`}>
            {materi.fileType || "FILE"}
          </div>
        </div>
        <div className="p-5">
          <h2 className="font-bold text-gray-900 mb-2">{materi.title}</h2>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {materi.tema && <span className="text-[11px] px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full font-medium">{materi.tema}</span>}
            {materi.grade && <span className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">{materi.grade}</span>}
            <span className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium flex items-center gap-1"><Download size={11} /> {materi.downloads ?? 0}x diunduh</span>
          </div>
          {materi.description && <p className="text-sm text-gray-600 mb-4">{materi.description}</p>}
          <p className="text-xs text-gray-400 mb-4">💡 Pratinjau dulu untuk memastikan modul sesuai kebutuhanmu — pratinjau tidak mengurangi kuota unduh.</p>

          {limitReached ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <Crown size={24} className="mx-auto text-amber-500 mb-2" />
              <p className="text-sm font-semibold text-red-700 mb-1">Batas unduh gratis tercapai</p>
              <p className="text-xs text-gray-600 mb-3">{msg}</p>
              <a href="/guru/berlangganan" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors">
                <Crown size={15} /> Upgrade ke Premium
              </a>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <button onClick={preview}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                  <Eye size={16} /> Pratinjau
                </button>
                <button onClick={download} disabled={downloading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {downloading ? <><Loader2 size={16} className="animate-spin" /> Mengunduh...</> : done ? <><Check size={16} /> Terunduh</> : <><Download size={16} /> Unduh</>}
                </button>
              </div>
              <button onClick={onKirim} className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors">
                <Send size={16} /> Kirim ke Kelas
              </button>
              {isPPT && (
                <button onClick={onPresent} className="w-full mt-2 flex items-center justify-center gap-2 py-2 text-xs font-semibold text-orange-700 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors">
                  <Maximize2 size={14} /> Presentasi
                </button>
              )}
              {msg && !limitReached && <p className="text-xs text-red-500 mt-2">{msg}</p>}
              {remaining !== null && <p className="text-[11px] text-gray-400 mt-3 text-center">Sisa kuota unduh gratismu: {remaining} modul</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MateriKirimModal({ materi, onClose }: { materi: Materi; onClose: () => void }) {
  const [groups, setGroups] = useState<{ id: string; name: string; grade: string }[]>([])
  const [sentGroupIds, setSentGroupIds] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/group").then(r => r.json()).catch(() => ({})),
      fetch(`/api/guru/materi/${materi.id}/kirim`).then(r => r.json()).catch(() => ({})),
    ]).then(([g, k]) => {
      setGroups(g.groups || [])
      setSentGroupIds((k.data || []).map((row: { groupId: string }) => row.groupId))
    }).finally(() => setLoading(false))
  }, [materi.id])

  const send = async () => {
    if (selected.length === 0) return
    setSending(true); setError("")
    try {
      const res = await fetch(`/api/guru/materi/${materi.id}/kirim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds: selected }),
      })
      const d = await res.json()
      if (res.ok) {
        setSuccess(true)
        setTimeout(onClose, 1500)
      } else {
        setError(d.error || "Gagal mengirim materi.")
      }
    } catch {
      setError("Gagal mengirim materi.")
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !sending && onClose()}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-gray-900">Kirim ke Kelas</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4 truncate">{materi.title}</p>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8 text-violet-600">
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <p className="font-medium">Materi terkirim!</p>
          </div>
        ) : loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : groups.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">Belum ada kelas. Buat kelas dulu di KelasKu.</p>
        ) : (
          <>
            <div className="space-y-1.5 max-h-56 overflow-y-auto mb-4">
              {groups.map(g => {
                const alreadySent = sentGroupIds.includes(g.id)
                const checked = selected.includes(g.id)
                return (
                  <label
                    key={g.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      checked ? "border-violet-300 bg-violet-50" : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setSelected(prev => prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id])}
                      className="rounded text-violet-600 focus:ring-violet-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{g.name}</p>
                      <p className="text-xs text-gray-400">Kelas {g.grade}</p>
                    </div>
                    {alreadySent && <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Sudah dikirim</span>}
                  </label>
                )
              })}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={send}
              disabled={selected.length === 0 || sending}
              className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Kirim ke {selected.length} Kelas
            </button>
          </>
        )}
      </div>
    </div>
  )
}
