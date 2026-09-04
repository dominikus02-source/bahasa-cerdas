"use client"

import { useState } from "react"
import { Share2, Copy, Check, ExternalLink } from "lucide-react"

type Props = {
  taskType: "QUIZ" | "PENUGASAN"
  quizId?: string
  penugasanId?: string
  groupId: string
}

export default function ShareTaskButton({ taskType, quizId, penugasanId, groupId }: Props) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleShare = async () => {
    if (url) {
      setOpen(!open)
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/guru/tugas/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType, quizId, penugasanId, groupId }),
      })
      const data = await res.json()
      if (data.data?.url) {
        setUrl(data.data.url)
        setOpen(true)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        className="text-[var(--clr-text-3)] hover:text-[var(--clr-accent-strong)] p-2 shrink-0"
        aria-label="Bagikan tugas"
        title="Bagikan tugas"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
        ) : (
          <Share2 size={16} />
        )}
      </button>

      {open && url && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[var(--clr-border)] rounded-lg shadow-lg p-3 w-72">
          <p className="text-xs font-semibold text-[var(--clr-text)] mb-2">Link Tugas</p>
          <div className="flex items-center gap-1 bg-[var(--clr-surface)] rounded px-2 py-1.5 mb-2">
            <code className="text-[11px] text-[var(--clr-text-3)] flex-1 truncate">{url}</code>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[var(--clr-text-3)] hover:text-[var(--clr-accent-strong)] p-1 shrink-0"
              aria-label="Salin link"
            >
              {copied ? <Check size={14} className="text-[var(--clr-accent-strong)]" /> : <Copy size={14} />}
            </button>
          </div>
          <div className="flex gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[var(--clr-accent-strong)] hover:underline flex items-center gap-1"
            >
              <ExternalLink size={12} /> Buka
            </a>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] text-[var(--clr-text-3)] hover:text-[var(--clr-text)] ml-auto"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
