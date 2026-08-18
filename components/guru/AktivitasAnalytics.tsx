"use client"

import { useState, useEffect } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import { TrendingUp, BookOpen, Heart, MessageCircle } from "lucide-react"

type Minggu = { minggu: string; karya: number; like: number; komentar: number; muridBerkarya: number }

export default function AktivitasAnalytics() {
  const [weeks, setWeeks] = useState<Minggu[]>([])
  const [totals, setTotals] = useState({ karya: 0, like: 0, komentar: 0 })
  const [range, setRange] = useState(8)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/guru/dashboard/analytics?weeks=${range}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        if (cancelled) return
        setWeeks(d.weeks || [])
        setTotals(d.totals || { karya: 0, like: 0, komentar: 0 })
      })
      .catch(() => { if (!cancelled) setError("Gagal memuat tren") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [range])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-500" /> Tren Literasi Murid
        </h3>
        <div className="flex gap-1 rounded-full bg-gray-100 p-0.5">
          {[4, 8, 12].map(n => (
            <button
              key={n}
              onClick={() => setRange(n)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${range === n ? "bg-emerald-600 text-white shadow" : "text-gray-500 hover:text-emerald-700"}`}
            >
              {n} mgg
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-56 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 py-8 text-center">{error}</p>
      ) : weeks.length === 0 || totals.karya + totals.like + totals.komentar === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-500">Belum ada aktivitas karya murid.</p>
          <p className="text-xs text-gray-400 mt-1">Ajak muridmu mulai berkarya di KelasKu &amp; Hasil Karya.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">
              <BookOpen size={11} /> {totals.karya} karya
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
              <Heart size={11} /> {totals.like} like
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 text-sky-700">
              <MessageCircle size={11} /> {totals.komentar} komentar
            </span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeks} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-border)" vertical={false} />
                <XAxis dataKey="minggu" tick={{ fontSize: 10, fill: "var(--clr-text-3)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--clr-text-3)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(99,102,241,0.06)" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="karya" name="Karya" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="like" name="Like" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="komentar" name="Komentar" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            Puncak minggu ini: {weeks[weeks.length - 1]?.karya ?? 0} karya · {weeks[weeks.length - 1]?.muridBerkarya ?? 0} murid berkarya
          </div>
        </>
      )}
    </div>
  )
}
