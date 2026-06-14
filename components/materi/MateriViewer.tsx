"use client"

import { useState, useEffect, useRef } from "react"
import { X, ExternalLink, Download, AlertTriangle, Loader2, Maximize2 } from "lucide-react"
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
  const [fullscreen, setFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const blobUrlRef = useRef<string | null>(null)

  const isPDF = materi.fileType === "PDF"
  const isPPTX = materi.fileType === "PPTX"

  useEffect(() => {
    document.body.style.overflow = "hidden"
    if (isPDF) loadPdf()
    else setLoading(false)
    return () => {
      document.body.style.overflow = ""
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fullscreen) { document.exitFullscreen?.(); setFullscreen(false) }
        else onClose()
      }
    }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [fullscreen, onClose])

  const loadPdf = async () => {
    if (!materi.fileUrl) { setLoadError(true); setLoading(false); return }

    if (materi.fileKey) {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.storage.from("documents").download(materi.fileKey)
        if (data && !error) {
          const url = URL.createObjectURL(data)
          blobUrlRef.current = url
          setBlobUrl(url)
          setLoading(false)
          return
        }
      } catch {}
    }

    try {
      const res = await fetch(materi.fileUrl)
      if (res.ok) {
        const url = URL.createObjectURL(await res.blob())
        blobUrlRef.current = url
        setBlobUrl(url)
        setLoading(false)
        return
      }
    } catch {}

    setLoadError(true)
    setLoading(false)
  }

  const getPptxViewerUrl = () => {
    if (!materi.fileUrl) return ""
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(materi.fileUrl)}`
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.()
      setFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setFullscreen(false)
    }
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

  if (!materi.fileUrl) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <p className="text-gray-600 mb-4">File tidak tersedia</p>
          <button onClick={onClose} className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600">Tutup</button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black/90 flex flex-col">
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors">
            <ExternalLink size={14} /> Buka
          </button>
          <button onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors">
            <Download size={14} /> Download
          </button>
          <button onClick={toggleFullscreen}
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 transition-colors" title="Fullscreen">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center bg-gray-800/30">
        {loading && isPDF && (
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-white/50 mx-auto mb-3" />
            <p className="text-sm text-white/40">Memuat file...</p>
          </div>
        )}

        {isPDF && !loading && blobUrl && !loadError && (
          <iframe src={blobUrl} className="w-full h-full border-0" title={materi.title} />
        )}

        {isPPTX && (
          <iframe
            src={getPptxViewerUrl()}
            className="w-full h-full border-0"
            title={materi.title}
            allow="fullscreen"
          />
        )}

        {!isPDF && !isPPTX && (
          <div className="text-center p-8">
            <p className="text-gray-400 mb-4">Pratinjau tidak tersedia untuk {materi.fileType}</p>
            <button onClick={handleDownload}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700">
              <Download size={16} className="inline mr-1" /> Download
            </button>
          </div>
        )}

        {isPDF && !loading && loadError && (
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">File tidak dapat ditampilkan</h3>
            <p className="text-sm text-gray-400 mb-6">Gagal memuat file. Buka di tab baru untuk melihat.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={openInNewTab}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100">
                <ExternalLink size={16} /> Buka di Tab Baru
              </button>
              <button onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700">
                <Download size={16} /> Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
