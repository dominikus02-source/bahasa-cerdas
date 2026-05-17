"use client"

import { useState, useRef, useEffect } from "react"
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2, Download } from "lucide-react"

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
  const [fullscreen, setFullscreen] = useState(false)
  const [slideMode, setSlideMode] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fullscreen) setFullscreen(false)
        else onClose()
      }
      if (slideMode && e.key === "ArrowRight") nextSlide()
      if (slideMode && e.key === "ArrowLeft") prevSlide()
    }
    window.addEventListener("keydown", handleEsc)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", handleEsc)
      document.body.style.overflow = ""
    }
  }, [fullscreen, slideMode, onClose])

  const isPDF = materi.fileType === "PDF"
  const isPPTX = materi.fileType === "PPTX"
  const fileUrl = materi.fileUrl

  const getViewerUrl = () => {
    if (!fileUrl) return ""
    if (isPDF) return fileUrl
    if (isPPTX) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}&wdStartOn=1&wdEmbedCode=0`
    }
    return fileUrl
  }

  const nextSlide = () => {
    if (isPPTX && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ method: "Next" }), "*")
    }
  }

  const prevSlide = () => {
    if (isPPTX && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ method: "Prev" }), "*")
    }
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
    <div
      ref={containerRef}
      className={`fixed z-50 bg-gray-900 transition-all ${fullscreen ? "inset-0" : "inset-4 rounded-2xl overflow-hidden shadow-2xl"}`}
    >
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors shrink-0">
            <X size={18} className="text-gray-300" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{materi.title}</p>
            {materi.grade && <p className="text-xs text-gray-400">{materi.grade}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isPPTX && (
            <>
              <button
                onClick={() => setSlideMode(!slideMode)}
                className={`p-1.5 rounded-lg transition-colors ${slideMode ? "bg-emerald-600 text-white" : "hover:bg-gray-700 text-gray-300"}`}
                title="Mode Slide"
              >
                {slideMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              {slideMode && (
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={prevSlide} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={nextSlide} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
          <button onClick={handleDownload} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors" title="Download">
            <Download size={16} />
          </button>
          <button onClick={toggleFullscreen} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors" title="Fullscreen">
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div className={`${fullscreen ? "h-[calc(100vh-44px)]" : "h-[calc(100vh-100px)]"}`}>
        {isPDF ? (
          <iframe
            ref={iframeRef}
            src={`${fileUrl}#toolbar=0&navpanes=0`}
            className="w-full h-full border-0"
            title={materi.title}
          />
        ) : isPPTX ? (
          <iframe
            ref={iframeRef}
            src={getViewerUrl()}
            className="w-full h-full border-0"
            title={materi.title}
            allow="fullscreen"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">Preview tidak tersedia</p>
              <button onClick={handleDownload} className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600">
                Download File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
