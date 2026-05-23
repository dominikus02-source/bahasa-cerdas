import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Flame, Zap, Target, Bot, PenLine, Rocket, Star, Gift, Trophy, BookOpen, ChevronRight, Sparkles, Award, TrendingUp, Gamepad2 } from "lucide-react"
import { trackDailyStreak, getOrCreateDailyQuests } from "@/lib/coins"
import { TugasCard } from "./tugas-card"

function xpProgress(xp: number, level: number) {
  const needed = level * 150
  const current = xp % needed
  return { current, needed, pct: Math.min(Math.round((current / needed) * 100), 100) }
}

function streakMsg(streak: number) {
  if (streak >= 60) return { msg: "Legenda Abadi!", emoji: <Trophy className="w-4 h-4 text-yellow-400" /> }
  if (streak >= 30) return { msg: "Dedikasi Luar Biasa!", emoji: <Award className="w-4 h-4 text-yellow-400" /> }
  if (streak >= 14) return { msg: "Keren Banget!", emoji: <Sparkles className="w-4 h-4 text-orange-400" /> }
  if (streak >= 7) return { msg: "Luar Biasa!", emoji: <Flame className="w-4 h-4 text-orange-400" /> }
  if (streak >= 3) return { msg: "Mantap!", emoji: <Flame className="w-4 h-4 text-amber-400" /> }
  return null
}

export default async function BerandaPage() {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")
  if (user.role !== "MURID" && !user.isFounder) redirect("/guru/beranda")

  await trackDailyStreak(user.id)
  const quests = await getOrCreateDailyQuests(user.id)
  const doneQuest = quests.filter((q: any) => q.completed).length
  const totalQuest = quests.length

  const progress = xpProgress(user.xp || 0, user.level || 1)
  const streak = streakMsg(user.streak || 0)

  const [aktivitas, juaraBaru] = await Promise.all([
    db.gameResult.findMany({
      where: { rank: 1 },
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
        room: { select: { code: true, gameType: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.studentKarya.findMany({
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
      },
      where: { userId: { not: user.id } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ])

  let trendingKarya = await db.studentKarya.findMany({
    include: {
      user: { select: { id: true, fullName: true, avatar: true } },
    },
    orderBy: { likesCount: "desc" },
    take: 6,
  })

  if (trendingKarya.length === 0) {
    trendingKarya = await db.studentKarya.findMany({
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    })
  }

  return (
    <div className="px-4 py-5 arena-page">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shrink-0 border-2 border-white/50 overflow-hidden">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">{user.fullName?.charAt(0).toUpperCase() || "M"}</span>
            )}
          </div>
          <div>
            <p className="text-xl font-extrabold text-gray-900">Halo, {user.fullName?.split(" ")[0]}!</p>
            <p className="text-base text-gray-500">Selamat datang di Arena</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Streak</span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{user.streak || 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">hari berturut-turut</p>
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-4 border border-violet-100">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="w-5 h-5 text-violet-500" />
            <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Level</span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{user.level || 1}</p>
          <p className="text-xs text-gray-500 mt-0.5">{user.xp?.toLocaleString() || 0} XP</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-100">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Koin</span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{user.coins || 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Koin Cerdas</p>
        </div>
      </div>

      {/* XP Progress + Streak */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Level {user.level || 1}</p>
              <p className="text-[10px] text-gray-500">{progress.current}/{progress.needed} XP menuju level {user.level + 1}</p>
            </div>
          </div>
          {streak && (
            <div className="flex items-center gap-1.5 bg-white/60 px-3 py-1.5 rounded-full">
              {streak.emoji}
              <span className="text-xs font-bold text-gray-700">{streak.msg}</span>
            </div>
          )}
        </div>
        <div className="w-full h-2.5 bg-white/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all animate-pulse"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </div>

      {/* Misi progress */}
      {totalQuest > 0 && (
        <Link href="/arena/misi" className="flex items-center gap-3 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-100 p-4 mb-4 hover:shadow-md transition-all active:scale-[0.98]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
            <Star className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Misi Harian</p>
            <p className="text-[10px] text-gray-500">{doneQuest}/{totalQuest} selesai</p>
          </div>
          <div className="w-16 h-1.5 bg-white/60 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${totalQuest > 0 ? (doneQuest / totalQuest) * 100 : 0}%` }} />
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </Link>
      )}

      {/* Ruang Tugas */}
      <TugasCard />

      {/* Aktivitas — FOMO */}
      {(aktivitas.length > 0 || juaraBaru.length > 0) && (
        <div className="mb-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Aktivitas
          </h2>
          <div className="space-y-2">
            {aktivitas.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {a.user?.fullName?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {a.user?.fullName?.split(" ")[0] || "User"} <span className="font-normal text-gray-500">juara 1</span>
                  </p>
                  <p className="text-xs text-gray-400 truncate">{a.room?.code || "Battle"} • +{a.xpEarned || 0} XP</p>
                </div>
                <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
            ))}
            {juaraBaru.map((k: any) => (
              <Link key={k.id} href={`/arena/feed/${k.id}`} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 hover:shadow-sm transition-all">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {k.user?.fullName?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {k.user?.fullName?.split(" ")[0] || "User"} <span className="font-normal text-gray-500">nulis baru</span>
                  </p>
                  <p className="text-xs text-gray-400 truncate">{k.title}</p>
                </div>
                <PenLine className="w-4 h-4 text-violet-400 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Jalur Cerdas */}
      <Link href="/arena/jalur-cerdas" className="block bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all active:scale-[0.99] arena-card mb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-white">Jalur Cerdas</p>
            <p className="text-sm text-violet-200">Belajar dari dasar sampai mahir</p>
          </div>
          <ChevronRight className="w-6 h-6 text-white/60" />
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/20">
          <span className="text-xs text-violet-200 flex items-center gap-1"><Trophy className="w-3.5 h-3.5" />4 Level</span>
          <span className="text-xs text-violet-200 flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />13 Materi</span>
          <span className="text-xs text-violet-200 flex items-center gap-1"><Zap className="w-3.5 h-3.5" />1.400 XP</span>
        </div>
      </Link>

      {/* Quick actions */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Aksi Cepat</h2>
        <div className="grid grid-cols-4 gap-3">
          <QuickAction icon={<Bot className="w-6 h-6" />} label="AI" href="/arena/ai" warna="from-emerald-500 to-teal-600" />
          <QuickAction icon={<PenLine className="w-6 h-6" />} label="Tulis" href="/arena/tulis" warna="from-amber-500 to-orange-600" />
          <QuickAction icon={<Gift className="w-6 h-6" />} label="Kotak" href="/arena/mystery-box" warna="from-rose-500 to-pink-600" />
          <QuickAction icon={<Gamepad2 className="w-6 h-6" />} label="Gim" href="/arena/game" warna="from-blue-500 to-cyan-600" />
        </div>
      </div>

      {/* Karya Terpopuler */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Karya Terpopuler</h2>
          <Link href="/arena/feed" className="text-sm text-violet-600 font-semibold">Lihat semua</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {trendingKarya.map((karya: any) => (
            <Link
              key={karya.id}
              href={`/arena/feed/${karya.id}`}
              className="shrink-0 w-48 bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all arena-card"
            >
              <p className="text-xs font-bold text-violet-600 uppercase mb-1">{karya.type}</p>
              <p className="text-base font-bold text-gray-900 leading-snug line-clamp-2 mb-2">{karya.title}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{karya.user?.fullName?.split(" ")[0] || "User"}</span>
                <span>-</span>
                <span>{karya.likesCount || 0} suka</span>
              </div>
            </Link>
          ))}
          {trendingKarya.length === 0 && (
            <p className="text-sm text-gray-400 py-6 w-full text-center">Belum ada karya. Jadilah yang pertama!</p>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon, label, href, warna }: { icon: React.ReactNode; label: string; href: string; warna: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all active:scale-95"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${warna} flex items-center justify-center text-white shadow-sm`}>
        {icon}
      </div>
      <span className="text-xs font-bold text-gray-700">{label}</span>
    </Link>
  )
}
