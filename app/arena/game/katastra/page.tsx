"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Flame, Zap, Trophy, Swords, Puzzle, Play, Users, ChevronRight, TrendingUp, Sparkles, ArrowLeft,
} from "lucide-react"

const LEAGUE_META: Record<string, { label: string; color: string; bg: string }> = {
  BRONZE: { label: "Perunggu", color: "text-amber-700", bg: "bg-amber-100" },
  SILVER: { label: "Perak", color: "text-slate-600", bg: "bg-slate-100" },
  GOLD: { label: "Emas", color: "text-yellow-600", bg: "bg-yellow-100" },
  DIAMOND: { label: "Berlian", color: "text-cyan-600", bg: "bg-cyan-100" },
}

const MODES = [
  {
    id: "dash", title: "Lari Kata",
    desc: "Jawab secepat mungkin! 60 detik, 20 soal, kumpulkan Poin Pengalaman sebanyak-banyaknya.",
    icon: Zap, color: "from-violet-500 to-purple-600", href: "/murid/katastra/dash",
    players: "Solo", time: "~3 menit",
  },
  {
    id: "duel", title: "Duel Kata",
    desc: "Hadang temanmu dalam adu cepat menjawab soal Bahasa Indonesia real-time!",
    icon: Swords, color: "from-orange-500 to-red-600", href: "#", players: "2 Pemain", time: "~5 menit", comingSoon: true,
  },
  {
    id: "puzzle", title: "Teka-teki Makna",
    desc: "Tebak hubungan 16 kata dalam 4 grup. Teka-teki harian yang bikin penasaran!",
    icon: Puzzle, color: "from-emerald-500 to-teal-600", href: "#", players: "Solo", time: "~5 menit", comingSoon: true,
  },
]

const DAILY_REWARDS = [
  { day: 1, reward: "50 PP" }, { day: 2, reward: "75 PP" },
  { day: 3, reward: "100 PP", bonus: "Kotak Misteri" }, { day: 4, reward: "150 PP" },
  { day: 5, reward: "200 PP", bonus: "Bingkai Langka" }, { day: 6, reward: "250 PP" },
  { day: 7, reward: "500 PP", bonus: "Gelar Legendaris" },
]

export default function KatastraArenaPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/katastra/daily").then(r => r.json()).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const league = data?.league || "BRONZE"
  const meta = LEAGUE_META[league]
  const streak = data?.streak || 0
  const level = data?.level || 1
  const xp = data?.xp || 0
  const xpNext = level * level * 100
  const xpProgress = Math.min((xp / xpNext) * 100, 100)
  const playedToday = data?.playedToday || false

  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-b from-slate-900 via-violet-950 to-slate-900 text-white overflow-auto">
      <Link
        href="/arena/game"
        className="fixed top-3 left-3 z-[70] w-9 h-9 rounded-xl bg-white/90 backdrop-blur-md border border-gray-200 shadow-md flex items-center justify-center text-gray-700 hover:bg-white active:scale-95 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <div className="relative overflow-hidden px-4 pt-14 pb-8 bg-gradient-to-br from-violet-600 via-violet-700 to-purple-900">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-400/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px]" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-extrabold flex items-center gap-2">
                <Sparkles className="text-yellow-300" size={24} />
                KataStra
              </h1>
              <p className="text-violet-200 text-xs mt-0.5">Taklukkan Kata, Kuasai Bahasa!</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-lg font-bold shadow-lg">
                  {level}
                </div>
                <div>
                  <p className="font-bold text-sm">Tingkat {level}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Flame size={18} className={streak > 0 ? "text-orange-400" : "text-white/30"} />
                <span className={`font-bold text-lg ${streak > 0 ? "text-orange-400" : "text-white/50"}`}>{streak}</span>
              </div>
            </div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-400 to-pink-500 rounded-full transition-all duration-500" style={{ width: `${xpProgress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-violet-200 mt-1">
              <span>{xp.toLocaleString()} PP</span>
              <span>{xpNext.toLocaleString()} PP</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-violet-200 flex items-center gap-1">
                <Flame size={14} className="text-orange-400" /> Rentetan Harian
              </p>
              {playedToday ? (
                <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full font-medium">Selesai</span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full font-medium animate-pulse">Main sekarang!</span>
              )}
            </div>
            <div className="flex justify-between gap-1">
              {DAILY_REWARDS.map((r, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < streak ? "bg-yellow-400 text-yellow-900 shadow-md" : i === streak && !playedToday
                      ? "bg-violet-400 text-white ring-2 ring-violet-300 animate-pulse" : "bg-white/10 text-white/30"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="text-center">
                    <p className={`text-[8px] leading-tight font-medium ${i <= streak ? "text-violet-200" : "text-white/30"}`}>{r.reward}</p>
                    {r.bonus && <p className={`text-[7px] leading-tight ${i <= streak ? "text-yellow-300" : "text-white/20"}`}>+{r.bonus}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Play size={18} className="text-violet-400" /> Pilih Mode
          </h2>
        </div>

        {MODES.map((mode) => (
          <Link
            key={mode.id}
            href={mode.comingSoon ? "#" : mode.href}
            className={`block bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all ${mode.comingSoon ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-lg shrink-0`}>
                <mode.icon size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm">{mode.title}</h3>
                  {mode.comingSoon && <span className="text-[9px] px-1.5 py-0.5 bg-violet-500/30 text-violet-300 rounded-full font-medium">SEGERA</span>}
                </div>
                <p className="text-xs text-violet-200/70 mt-1 line-clamp-2">{mode.desc}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-violet-300/50 flex items-center gap-1"><Users size={10} /> {mode.players}</span>
                  <span className="text-[10px] text-violet-300/50">{mode.time}</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-violet-400/50 mt-1" />
            </div>
          </Link>
        ))}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <TrendingUp size={16} className="text-violet-400 mb-1" />
            <p className="text-xs text-violet-200/60">Poin Pengalaman Hari Ini</p>
            <p className="text-lg font-bold">{loading ? "..." : xp}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <Trophy size={16} className="text-yellow-400 mb-1" />
            <p className="text-xs text-violet-200/60">Peringkat</p>
            <p className="text-lg font-bold">{meta.label}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
