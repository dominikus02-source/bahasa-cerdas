"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  BookOpen, Clock, CheckCircle, FileText, ChevronRight, AlertCircle,
  GraduationCap, Library,
} from "lucide-react"

interface Submission {
  status: string
  score: number | null
  attemptNumber: number
  submittedAt: string | null
}

interface Assignment {
  id: string
  quiz: {
    id: string
    title: string
    description: string | null
    type: string
    timeLimit: number | null
    maxAttempts: number
    kelas: string
    _count: { questions: number }
  }
  group: { id: string; name: string }
  dueDate: string | null
  isOverdue: boolean
  submission: Submission | null
  _count: { submissions: number }
}

type Tab = "available" | "inProgress" | "completed"

export default function TugasPage() {
  const [available, setAvailable] = useState<Assignment[]>([])
  const [inProgress, setInProgress] = useState<Assignment[]>([])
  const [completed, setCompleted] = useState<Assignment[]>([])
  const [penugasans, setPenugasans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("available")

  useEffect(() => {
    Promise.all([
      fetch("/api/murid/tugas").then(r => r.json()),
      fetch("/api/murid/penugasan").then(r => r.json()),
    ])
      .then(([t, p]) => {
        setAvailable(t.available || [])
        setInProgress(t.inProgress || [])
        setCompleted(t.completed || [])
        setPenugasans(p.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const penugasanAvailable = penugasans.filter(p => p.submission?.status !== "COMPLETED")
  const penugasanCompleted = penugasans.filter(p => p.submission?.status === "COMPLETED")

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "available", label: "Tersedia", count: available.length + penugasanAvailable.length },
    { key: "inProgress", label: "Dikerjakan", count: inProgress.length },
    { key: "completed", label: "Selesai", count: completed.length + penugasanCompleted.length },
  ]

  const data: Record<Tab, Assignment[]> = { available, inProgress, completed }
  const penugasanForTab = tab === "available" ? penugasanAvailable : tab === "completed" ? penugasanCompleted : []

  const formatDate = (d: string | null) => {
    if (!d) return ""
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })
  }

  const typeBadge = (type: string) => {
    const map: Record<string, string> = {
      LATIHAN: "bg-blue-100 text-blue-700",
      TUGAS: "bg-amber-100 text-amber-700",
      UJIAN: "bg-red-100 text-red-700",
    }
    return map[type] || "bg-gray-100 text-gray-600"
  }

  const totalTersedia = available.length + penugasanAvailable.length

  return (
    <div className="arena-page px-4 py-4">

      {/* ════════════════════════════════════════ */}
      {/* RUANG PEMBELAJARAN — Hero Card           */}
      {/* ════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 mb-5 shadow-lg shadow-emerald-500/25">
        {/* Decorative blobs */}
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute top-2 right-12 w-10 h-10 rounded-full bg-emerald-400/10" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white">Ruang Pembelajaran</h1>
              <p className="text-xs text-emerald-200">Fokus belajar & selesaikan tugasmu di sini!</p>
            </div>
          </div>

          {/* 2 Sub-card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {/* ── Ruang Tugas ── */}
            <Link
              href="/arena/tugas"
              onClick={() => setTab("available")}
              className="group flex items-start gap-3 bg-white/95 rounded-xl p-4 hover:bg-white hover:shadow-lg hover:shadow-emerald-900/20 active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900">Ruang Tugas</h3>
                  {totalTersedia > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                      {totalTersedia}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Tugas & latihan dari Buku Panduan Guru</p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-emerald-600 group-hover:gap-2 transition-all">
                  {totalTersedia > 0 ? `${totalTersedia} tugas tersedia` : "Lihat semua tugas"} <ChevronRight size={14} />
                </div>
              </div>
            </Link>

            {/* ── Ruang Materi ── */}
            <Link
              href="/arena/materi"
              className="group flex items-start gap-3 bg-white/95 rounded-xl p-4 hover:bg-white hover:shadow-lg hover:shadow-emerald-900/20 active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                <Library className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900">Ruang Materi</h3>
                <p className="text-xs text-gray-500 mt-0.5">Modul, PPT, PDF, dan video dari guru</p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-violet-600 group-hover:gap-2 transition-all">
                  Lihat Materi <ChevronRight size={14} />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
                tab === t.key ? "bg-violet-100 text-violet-700" : "bg-gray-200 text-gray-500"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
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
      ) : data[tab].length === 0 && penugasanForTab.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-500">Tidak ada tugas</p>
          <p className="text-xs text-gray-400 mt-1">
            {tab === "available" ? "Belum ada tugas dari gurumu" :
             tab === "inProgress" ? "Kamu sedang tidak mengerjakan tugas" :
             "Belum ada tugas yang selesai"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {penugasanForTab.map(p => {
            const done = p.submission?.status === "COMPLETED"
            const score = p.submission?.score
            return (
              <Link
                key={p.id}
                href={`/arena/tugas/${p.id}/kerjakan`}
                className="block bg-white rounded-2xl border border-emerald-100 p-4 active:scale-[0.98] transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-2">
                    <h3 className="font-bold text-sm text-gray-900 truncate">{p.judul}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{p.groupName} · Tugas Materi</p>
                  </div>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                    BUKU PANDUAN
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <BookOpen size={12} /> Materi + Latihan + Praktik
                  </span>
                  {p.tenggat && (
                    <span className="flex items-center gap-1">
                      <AlertCircle size={12} /> {formatDate(p.tenggat)}
                    </span>
                  )}
                </div>
                {done && score !== null && score !== undefined ? (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-900">Nilai {score}</span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                    +{p.xpReward || 50} XP · +{p.coinReward || 10} Koin
                  </div>
                )}
              </Link>
            )
          })}
          {data[tab].map(a => (
            <Link
              key={a.id}
              href={tab === "completed" ? `/murid/tugasku/${a.id}/result` : `/murid/tugasku/${a.id}/take`}
              className="block bg-white rounded-2xl border border-gray-100 p-4 active:scale-[0.98] transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <h3 className="font-bold text-sm text-gray-900 truncate">{a.quiz.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{a.group.name}</p>
                </div>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${typeBadge(a.quiz.type)}`}>
                  {a.quiz.type}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <FileText size={12} /> {a.quiz._count.questions} soal
                </span>
                {a.quiz.timeLimit && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {a.quiz.timeLimit} menit
                  </span>
                )}
                {a.dueDate && (
                  <span className={`flex items-center gap-1 ${a.isOverdue ? "text-red-500" : ""}`}>
                    <AlertCircle size={12} /> {formatDate(a.dueDate)}
                  </span>
                )}
              </div>

              {a.submission?.status === "GRADED" && a.submission.score !== null && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        a.submission.score >= 80 ? "bg-emerald-500" :
                        a.submission.score >= 60 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${a.submission.score}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-900">{a.submission.score}</span>
                </div>
              )}

              {a.submission?.status === "SUBMITTED" && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
                  <Clock size={12} /> Menunggu penilaian
                </div>
              )}

              {tab === "available" && (
                <div className="mt-2 flex items-center justify-end text-violet-600 text-[11px] font-semibold gap-0.5">
                  Kerjakan <ChevronRight size={14} />
                </div>
              )}
              {tab === "inProgress" && (
                <div className="mt-2 flex items-center justify-end text-amber-600 text-[11px] font-semibold gap-0.5">
                  Lanjutkan <ChevronRight size={14} />
                </div>
              )}
              {tab === "completed" && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                  <CheckCircle size={12} /> Selesai
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
