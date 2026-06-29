"use client"

import { useState } from "react"
import Link from "next/link"
import { TrendingUp, Award, Search, Calendar, Filter } from "lucide-react"

interface ResultItem {
  id: string
  userId: string
  userName: string
  paketId: string
  paketTitle: string
  paketType: string
  attemptNumber: number
  totalScore: number | null
  predikat: string | null
  percentage: number | null
  finishedAt: string | null
  hasCert: boolean
}

interface Props {
  results: ResultItem[]
}

export function HasilSimulasiClient({ results }: Props) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"semua" | "UKBI" | "TKA">("semua")

  const filtered = results.filter(r => {
    if (filter === "UKBI" && !r.paketType.includes("UKBI")) return false
    if (filter === "TKA" && !r.paketType.includes("TKA")) return false
    if (search && !r.userName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp size={24} />
          <h1 className="text-xl font-bold">Hasil Simulasi Murid</h1>
        </div>
        <p className="text-sm text-emerald-200">Pantau hasil simulasi UKBI dan TKA murid.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5">
          {(["semua", "UKBI", "TKA"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f === "semua" ? "Semua" : f}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari murid..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Award size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Belum ada hasil simulasi</p>
          <p className="text-sm text-gray-400 mt-1">Hasil akan muncul setelah murid menyelesaikan simulasi.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Murid</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Paket</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Skor</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Predikat</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Percobaan</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Tanggal</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Dokumen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.userName}</td>
                    <td className="px-4 py-3 text-gray-600">{r.paketTitle}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900">{r.totalScore ?? "-"}</td>
                    <td className="px-4 py-3 text-center">
                      {r.predikat && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                          {r.predikat}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{r.attemptNumber}</td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {r.finishedAt ? new Date(r.finishedAt).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.hasCert ? (
                        <Link
                          href="/guru/dokumen-latihan"
                          className="text-xs text-emerald-600 font-semibold hover:underline"
                        >
                          Lihat
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
