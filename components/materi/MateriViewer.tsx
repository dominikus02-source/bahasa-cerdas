"use client"

import { useState, useRef, useEffect } from "react"
import { X, ExternalLink, Download, AlertTriangle, Loader2 } from "lucide-react"

interface Materi {
  id: string
  title: string
  fileUrl: string | null
  fileType: string | null
  grade: string | null
  description: string | null
}

interface Props {
  materi: Materi
  onClose: () => void
}

export function MateriViewer({ materi, onClose }: Props) {
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    document.body.style.overflow = "hidden"
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        setLoadError(true)
        setLoading(false)
      }
    }, 10000)
    return () => {
      document.body.style.overflow = ""
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [loading])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [onClose])

  const isPDF = materi.fileType === "PDF"
  const isPPTX = materi.fileType === "PPTX"
  const fileUrl = materi.fileUrl

  const getViewerUrl = () => {
    if (!fileUrl) return ""
    if (isPDF) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
    }
    if (isPPTX) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
    }
    return fileUrl
  }

  const openInNewTab = () => {
    if (fileUrl) window.open(fileUrl, "_blank")
  }

  const handleDownload = () => {
    if (fileUrl) {
      const a = document.createElement("a")
      a.href = fileUrl
      a.download = `${materi.title}.${materi.fileType?.toLowerCase() || "file"}`
      a.target = "_blank"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handleLoad = () => {
    setLoading(false)
  }

  const handleError = () => {
    setLoadError(true)
    setLoading(false)
  }

  if (!fileUrl) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md">
          <p className="text-gray-600 mb-4">File tidak tersedia untuk materi ini</p>
          <button onClick={onClose} className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600">
            Tutup
          </button>
        </div>
      </div>
    )
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
      <div className="flex-1 relative flex items-center justify-center">
        {loading && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 size={32} className="animate-spin text-white/50 mx-auto mb-3" />
              <p className="text-sm text-white/40">Memuat file...</p>
            </div>
          </div>
        )}

        {loadError ? (
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">File tidak dapat ditampilkan</h3>
            <p className="text-sm text-gray-400 mb-6">Browser memblokir tampilan file. Buka di tab baru untuk melihat.</p>
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
        ) : (
          <iframe
            ref={iframeRef}
            src={getViewerUrl()}
            className="w-full h-full border-0"
            title={materi.title}
            onLoad={handleLoad}
            onError={handleError}
            allow="fullscreen"
          />
        )}
      </div>
    </div>
  )
}
