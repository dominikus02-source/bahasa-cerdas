"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  BookOpen, Clock, CheckCircle, FileText, ChevronRight, AlertCircle,
  ArrowLeft, Library,
} from "lucide-react"

interface Submission {
  id: string
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
      LATIHAN: "bg-blue-100 text-blue-700 dark:text-blue-300",
      TUGAS: "bg-amber-100 text-amber-700 dark:text-amber-300",
      UJIAN: "bg-red-100 text-red-700 dark:text-red-300",
    }
    return map[type] || "bg-gray-100 dark:bg-slate-800/80 text-gray-600"
  }

  const totalTersedia = available.length + penugasanAvailable.length

  return (
    <div className="arena-page px-4 py-4">

      <div className="flex items-center gap-3 mb-5">
        <Link href="/arena" className="text-gray-400 hover:text-gray-700 dark:text-slate-300"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow shrink-0">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">Ruang Tugas</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400">Tugas & latihan dari Buku Panduan Guru</p>
        </div>
        <Link
          href="/arena/materi"
          className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-300 shrink-0"
        >
          <Library className="w-3.5 h-3.5" /> Materi
        </Link>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800/80 rounded-xl p-1 mb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.key ? "bg-white dark:bg-slate-800/90 text-gray-900 dark:text-slate-100 shadow-sm" : "text-gray-500"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
                tab === t.key ? "bg-violet-100 text-violet-700 dark:text-violet-300" : "bg-gray-200 text-gray-500"
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
            <div key={i} className="bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-slate-800/80 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : data[tab].length === 0 && penugasanForTab.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800/80 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Tidak ada tugas</p>
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
                className="block bg-white dark:bg-slate-800/90 rounded-2xl border border-emerald-100 p-4 active:scale-[0.98] transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-2">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-slate-100 truncate">{p.judul}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{p.groupName} · Tugas Materi</p>
                  </div>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:text-emerald-300 shrink-0">
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
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-900 dark:text-slate-100">Nilai {score}</span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    +{p.xpReward || 50} XP · +{p.coinReward || 10} Koin
                  </div>
                )}
              </Link>
            )
          })}
          {data[tab].map(a => (
            <Link
              key={a.id}
              // Stays inside /arena: the Android APK scopes itself to that prefix, so
              // /murid/tugasku would open a browser tab instead of a screen.
              // The two routes take DIFFERENT ids — /take wants the assignment,
              // /result wants the submission that /api/murid/quiz/submission looks up.
              href={tab === "completed" ? `/arena/tugas/${a.submission?.id}/result` : `/arena/tugas/${a.id}/take`}
              className="block bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 active:scale-[0.98] transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-slate-100 truncate">{a.quiz.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{a.group.name}</p>
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
                  <span className={`flex items-center gap-1 ${a.isOverdue ? "text-red-500 dark:text-red-400" : ""}`}>
                    <AlertCircle size={12} /> {formatDate(a.dueDate)}
                  </span>
                )}
              </div>

              {a.submission?.status === "GRADED" && a.submission.score !== null && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        a.submission.score >= 80 ? "bg-emerald-500" :
                        a.submission.score >= 60 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${a.submission.score}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-900 dark:text-slate-100">{a.submission.score}</span>
                </div>
              )}

              {a.submission?.status === "SUBMITTED" && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  <Clock size={12} /> Menunggu penilaian
                </div>
              )}

              {tab === "available" && (
                <div className="mt-2 flex items-center justify-end text-violet-600 dark:text-violet-400 text-[11px] font-semibold gap-0.5">
                  Kerjakan <ChevronRight size={14} />
                </div>
              )}
              {tab === "inProgress" && (
                <div className="mt-2 flex items-center justify-end text-amber-600 dark:text-amber-400 text-[11px] font-semibold gap-0.5">
                  Lanjutkan <ChevronRight size={14} />
                </div>
              )}
              {tab === "completed" && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
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
