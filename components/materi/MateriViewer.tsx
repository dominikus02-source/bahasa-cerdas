"use client"

import { useState, useEffect } from "react"
import { X, ExternalLink, Download, AlertTriangle, Loader2, FileText } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Materi {
  id: string
  title: string
  fileUrl: string | null
  fileKey: string | null
  fileType: string | null
  grade: string | null
  description: string | null
}

interface Props {
  materi: Materi
  onClose: () => void
}

export function MateriViewer({ materi, onClose }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.body.style.overflow = "hidden"
    loadFile()
    return () => {
      document.body.style.overflow = ""
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [onClose])

  const loadFile = async () => {
    if (!materi.fileUrl) {
      setLoadError(true)
      setLoading(false)
      return
    }

    // Try Supabase client download first (handles auth)
    if (materi.fileKey) {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.storage.from("documents").download(materi.fileKey)
        if (data && !error) {
          const url = URL.createObjectURL(data)
          setBlobUrl(url)
          setLoading(false)
          return
        }
      } catch {}
    }

    // Fallback: fetch with credentials
    try {
      const res = await fetch(materi.fileUrl, { credentials: "include" })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        setBlobUrl(url)
        setLoading(false)
        return
      }
    } catch {}

    // Direct URL as last resort
    setBlobUrl(materi.fileUrl)
    setLoading(false)
  }

  const openInNewTab = () => {
    if (materi.fileUrl) window.open(materi.fileUrl, "_blank")
  }

  const handleDownload = async () => {
    if (materi.fileKey) {
      const supabase = createClient()
      const { data } = await supabase.storage.from("documents").download(materi.fileKey)
      if (data) {
        const a = document.createElement("a")
        a.href = URL.createObjectURL(data)
        a.download = `${materi.title}.${materi.fileType?.toLowerCase() || "file"}`
        a.click()
        URL.revokeObjectURL(a.href)
        return
      }
    }
    if (materi.fileUrl) {
      const a = document.createElement("a")
      a.href = materi.fileUrl
      a.download = `${materi.title}.${materi.fileType?.toLowerCase() || "file"}`
      a.target = "_blank"
      a.click()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-gray-900/80 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shrink-0">
            <X size={20} className="text-white" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{materi.title}</p>
            {materi.grade && <p className="text-xs text-gray-400">{materi.grade}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={openInNewTab}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors"
            title="Buka di Tab Baru">
            <ExternalLink size={14} /> Buka
          </button>
          <button onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors"
            title="Download">
            <Download size={14} /> Download
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative flex items-center justify-center bg-gray-800/30">
        {loading && (
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-white/50 mx-auto mb-3" />
            <p className="text-sm text-white/40">Memuat file...</p>
          </div>
        )}

        {!loading && blobUrl && !loadError && (
          <iframe
            src={blobUrl}
            className="w-full h-full border-0"
            title={materi.title}
            sandbox="allow-scripts allow-same-origin"
          />
        )}

        {!loading && loadError && (
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">File tidak dapat ditampilkan</h3>
            <p className="text-sm text-gray-400 mb-6">Gagal memuat file. Coba buka di tab baru atau download.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={openInNewTab}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
                <ExternalLink size={16} /> Buka di Tab Baru
              </button>
              <button onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
                <Download size={16} /> Download
              </button>
            </div>
          </div>
        )}

        {!loading && !blobUrl && !loadError && (
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-gray-500" />
            </div>
            <p className="text-sm text-gray-400 mb-6">Tipe file tidak mendukung pratinjau.</p>
            <button onClick={handleDownload}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
              <Download size={16} className="inline mr-1" /> Download
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
