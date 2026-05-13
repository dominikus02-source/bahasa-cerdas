"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import {
  Flame, Zap, Trophy, BookOpen, Star, Target,
  ChevronRight, Gamepad2, ClipboardList, Clock,
  TrendingUp, Award, Shield, Crown, GraduationCap
} from "lucide-react"
import { useUserStore } from "@/store"

export default function MuridBerandaPage() {
  const user = useUserStore()
  const [tugas, setTugas] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/murid/tugas")
      .then(r => r.ok ? r.json() : [])
      .then(d => setTugas(d.data || []))
      .catch(() => {})
  }, [])

  const leagueColors: Record<string, string> = {
    BRONZE: "from-amber-600 to-amber-800",
    SILVER: "from-gray-300 to-gray-500",
    GOLD: "from-yellow-400 to-amber-500",
    DIAMOND: "from-cyan-400 to-blue-500",
  }

  const leagueIcons: Record<string, string> = {
    BRONZE: "🥉",
    SILVER: "🥈",
    GOLD: "🥇",
    DIAMOND: "💎",
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 11) return "Pagi"
    if (h < 15) return "Siang"
    if (h < 18) return "Sore"
    return "Malam"
  }

  const levelXP = 500
  const currentLevelXP = user.xp % levelXP
  const levelProgress = (currentLevelXP / levelXP) * 100

  const quickActions = [
    { href: "/murid/kuis-game", label: "Main Kuis", icon: Gamepad2, color: "from-violet-500 to-purple-600", desc: "Multiplayer & peringkat" },
    { href: "/murid/tugasku", label: "Tugasku", icon: ClipboardList, color: "from-blue-500 to-blue-600", desc: "Latihan harian" },
    { href: "/murid/ukbi", label: "Simulasi UKBI", icon: GraduationCap, color: "from-emerald-500 to-emerald-600", desc: "5 seksi resmi" },
    { href: "/murid/progresku", label: "Progresku", icon: TrendingUp, color: "from-amber-500 to-orange-600", desc: "Statistik & pencapaian" },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-sm text-gray-400">Selamat {greeting()},</p>
        <h1 className="text-2xl font-semibold text-gray-900 mt-0.5">
          {user.fullName} 👋
          {user.isFounder && <span className="ml-2 text-sm bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Founder</span>}
        </h1>
      </div>

      <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-6 mb-6 text-white shadow-xl shadow-violet-500/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-white/20`}>
                {leagueIcons[user.league] || "🥉"} {user.league}
              </span>
              <span className="text-xs text-violet-200">Level {user.level}</span>
            </div>
            <p className="text-3xl font-bold">{user.xp.toLocaleString("id")} XP</p>
            <p className="text-violet-200 text-sm mt-0.5">
              {levelXP - currentLevelXP} XP lagi ke Level {user.level + 1}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end mb-1">
              <Flame size={18} className="text-orange-300" />
              <span className="text-2xl font-bold">{user.streak}</span>
            </div>
            <p className="text-violet-200 text-xs">hari streak</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-violet-200 mb-1.5">
            <span>{currentLevelXP} XP</span>
            <span>{levelXP} XP</span>
          </div>
          <div className="h-3 bg-violet-900/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-4">
          <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-violet-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900 leading-tight">+{user.xp}</p>
            <p className="text-[11px] text-gray-400">Total XP</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-4">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Target size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900 leading-tight">0%</p>
            <p className="text-[11px] text-gray-400">Akurasi</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-4">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <ClipboardList size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900 leading-tight">0</p>
            <p className="text-[11px] text-gray-400">Tugas selesai</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-4">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Star size={16} className="text-amber-500" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900 leading-tight">0</p>
            <p className="text-[11px] text-gray-400">Koleksi kata</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="group">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all group-hover:scale-[1.02]">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-md`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">{action.label}</h3>
              <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Kata dari Koleksimu</h3>
            <Link href="/murid/progresku" className="text-xs text-violet-600 flex items-center gap-0.5 hover:underline">
              Lihat koleksi <ChevronRight size={12} />
            </Link>
          </div>
          
          <div className="text-center py-8">
            <BookOpen size={32} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400 mb-1">Belum punya koleksi kata</p>
            <p className="text-xs text-gray-400">Main kuis dan menangkan kata baru!</p>
            <Link href="/murid/kuis-game" className="mt-3 inline-block text-xs text-violet-600 underline">
              Main Kuis Game
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-1.5">
              <Trophy size={16} className="text-amber-500" /> Leaderboard
            </h3>
          </div>

          <div className="space-y-3">
            {[
              { rank: 1, name: "Kamu", xp: user.xp, league: user.league, isMe: true },
              { rank: 2, name: "Ahmad F.", xp: 2450, league: "GOLD", isMe: false },
              { rank: 3, name: "Siti R.", xp: 1890, league: "SILVER", isMe: false },
            ].map((u) => (
              <div key={u.rank} className={`flex items-center gap-3 p-2.5 rounded-xl ${u.isMe ? "bg-violet-50 border border-violet-100" : ""}`}>
                <span className={`w-6 text-center text-sm font-bold ${u.rank === 1 ? "text-amber-500" : "text-gray-300"}`}>
                  {u.rank === 1 ? "🥇" : u.rank === 2 ? "🥈" : "🥉"}
                </span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-xs font-bold text-violet-700">
                  {u.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${u.isMe ? "text-violet-700" : "text-gray-800"}`}>
                    {u.isMe ? "Kamu" : u.name}
                  </p>
                  <p className="text-[10px] text-gray-400">{u.xp.toLocaleString("id")} XP</p>
                </div>
                <span className="text-sm">{leagueIcons[u.league] || "🥉"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {tugas.length > 0 && (
        <div className="bg-white rounded-2xl border border-violet-100 p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ClipboardList size={16} className="text-violet-600" /> Tugas Baru
          </h3>
          <div className="space-y-2">
            {tugas.map((t: any) => (
              <Link key={t.id} href={`/kompetisi/${t.groupQuiz.quizId}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 hover:bg-violet-100 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                  <GraduationCap size={16} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{t.groupQuiz.title}</p>
                  <p className="text-xs text-gray-500">{t.groupQuiz.group?.name} • {t.groupQuiz.dueDate ? `Tenggat ${new Date(t.groupQuiz.dueDate).toLocaleDateString("id")}` : "Belum ada tenggat"}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
        <div className="space-y-2">
          <Link href="/murid/kuis-game" className="flex items-center gap-3 p-3 rounded-xl hover:bg-violet-50 transition-colors group">
            <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
              <Gamepad2 size={16} className="text-violet-600" />
            </div>
            <span className="text-sm text-gray-700 group-hover:text-violet-700">Main Kuis Game</span>
            <ChevronRight size={16} className="ml-auto text-gray-300" />
          </Link>
          <Link href="/murid/ukbi" className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 transition-colors group">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Shield size={16} className="text-emerald-600" />
            </div>
            <span className="text-sm text-gray-700 group-hover:text-emerald-700">Simulasi UKBI</span>
            <ChevronRight size={16} className="ml-auto text-gray-300" />
          </Link>
          <Link href="/murid/progresku" className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors group">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp size={16} className="text-blue-600" />
            </div>
            <span className="text-sm text-gray-700 group-hover:text-blue-700">Lihat Progres</span>
            <ChevronRight size={16} className="ml-auto text-gray-300" />
          </Link>
        </div>
      </div>
    </div>
  )
}
