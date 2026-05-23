"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BookOpen, ChevronRight, FileText } from "lucide-react"

export function TugasCard() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/murid/tugas")
      .then(r => r.json())
      .then(d => {
        const pending = (d.available?.length || 0) + (d.inProgress?.length || 0)
        setCount(pending)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (count === 0) return null

  return (
    <Link
      href="/arena/tugas"
      className="flex items-center gap-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-4 mb-4 hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
        <BookOpen className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-900">Ruang Tugas</p>
        <p className="text-[10px] text-gray-500">Ada {count} tugas menunggumu</p>
      </div>
      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold">
        {count}
      </span>
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </Link>
  )
}
