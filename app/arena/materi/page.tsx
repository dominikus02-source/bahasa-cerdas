"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, FileText, Download, Eye, Loader2, BookOpen } from "lucide-react"

type MateriKirim = {
  id: string
  createdAt: string
  groupName: string
  teacherName: string | null
  materi: {
    id: string
    title: string
    description: string | null
    fileUrl: string | null
    fileType: string | null
    tema: string | null
    subject: string | null
    grade: string | null
  }
}

const FILE_COLOR: Record<string, string> = {
  PDF: "bg-red-50 text-red-600 border-red-100",
  PPTX: "bg-orange-50 text-orange-600 border-orange-100",
  DOCX: "bg-blue-50 text-blue-600 border-blue-100",
  XLSX: "bg-emerald-50 text-emerald-600 border-emerald-100",
}

export default function MateriDariGuruPage() {
  const [items, setItems] = useState<MateriKirim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/murid/materi")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setItems(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const previewUrl = (m: MateriKirim["materi"]) => {
    if (!m.fileUrl) return null
    return m.fileType === "PDF" ? m.fileUrl : `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(m.fileUrl)}`
  }

  return (
    <div className="arena-page px-4 py-4">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/arena/tugas" className="text-gray-400 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Materi dari Guru</h1>
          <p className="text-xs text-gray-500">File yang dikirim gurumu</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-500">Belum ada materi</p>
          <p className="text-xs text-gray-400 mt-1">Gurumu belum mengirim materi apa pun</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(k => {
            const badge = FILE_COLOR[k.materi.fileType || ""] || "bg-gray-50 text-gray-600 border-gray-100"
            const url = previewUrl(k.materi)
            return (
              <div key={k.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 font-bold text-[11px] ${badge}`}>
                    {k.materi.fileType || "FILE"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{k.materi.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{k.groupName} · dari {k.teacherName || "Guru"}</p>
                    {k.materi.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{k.materi.description}</p>}
                  </div>
                </div>
                {url && (
                  <div className="flex gap-2 mt-3">
                    <a
                      href={url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-50 text-violet-700 text-xs font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5" /> Lihat
                    </a>
                    <a
                      href={k.materi.fileUrl!} target="_blank" rel="noopener noreferrer" download
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 text-gray-700 text-xs font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
