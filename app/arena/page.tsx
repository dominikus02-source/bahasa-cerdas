import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import cache from "@/lib/redis"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"
import {
  Flame, Zap, Coins, Target, Bot, PenLine, Rocket, Star, Gift,
  Trophy, BookOpen, ChevronRight, Sparkles, Award, Gamepad2, Heart,
  MessageCircle, Users, Clock, Swords, Crown, GraduationCap,
} from "lucide-react"
import { trackDailyStreak, getOrCreateDailyQuests } from "@/lib/coins"
import { jenjangMurid } from "@/lib/arena-junior/kurikulum"
import { calcLevelProgress, calcLevel, calcLeagueFromXP } from "@/lib/xp"
import { TugasCard } from "./tugas-card"
import BattleCard from "@/components/arena/BattleCard"
import LeagueMini from "./league-mini"
import { UnitIcon } from "@/components/arena/UnitIcon"

function initials(name: string) {
  return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"
}

const INITIALS_COLORS = [
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-orange-500 to-amber-600",
]

export default async function BerandaPage() {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")

  // Murid TK–SD punya dasbor sendiri (Arena Junior). Login mengarahkan semua
  // murid ke sini, jadi pembelokan dilakukan di beranda saja — BUKAN di layout,
  // supaya tidak menambah query database pada setiap navigasi di dalam Arena.
  if (user.role === "MURID") {
    const jenjang = await jenjangMurid(user.id)
    if (jenjang) redirect("/arena-junior")
  }

  // Guru boleh mengintip dasbor murid (mode pratinjau) tanpa berubah peran.
  // Founder tetap mendapat pengalaman murid penuh seperti sebelumnya.
  const isGuruPreview = user.role !== "MURID" && !user.isFounder

  // Jangan tulis streak/koin untuk pratinjau guru — akun guru tak boleh terubah.
  if (!isGuruPreview) await trackDailyStreak(user.id)
  const quests = await getOrCreateDailyQuests(user.id)
  const doneQuest = quests.filter((q: any) => q.completed).length
  const totalQuest = quests.length

  // Compute total XP from all tracked sources for bulletproof accuracy
  const [jalurXpAgg, gameXpAgg] = await Promise.all([
    db.userUnitProgress.aggregate({
      where: { userId: user.id },
      _sum: { xpEarned: true },
    }),
    db.gameResult.aggregate({
      where: { userId: user.id },
      _sum: { xpEarned: true },
    }),
  ])
  const computedTotalXp = (jalurXpAgg._sum.xpEarned || 0) + (gameXpAgg._sum.xpEarned || 0)
  const totalXp = Math.max(user.xp || 0, computedTotalXp)

  const displayLevel = calcLevel(totalXp)
  const displayLeague = calcLeagueFromXP(totalXp)
  const progress = calcLevelProgress(totalXp, displayLevel)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  // This stat read GameResult, which only the offline multiplayer server ever
  // wrote to — the table is empty, so it showed 0 for every student regardless
  // of what they did today. Coins earned today is the ledger daily activity
  // actually writes to.
  const todayCoinAgg = await db.coinTransaction.aggregate({
    where: { userId: user.id, createdAt: { gte: todayStart }, amount: { gt: 0 } },
    _sum: { amount: true },
  })
  const koinHariIni = todayCoinAgg._sum.amount || 0

  const [aktivitas, juaraBaru, tugasCount, jalurStats] = await Promise.all([
    cache.getOrSet("arena:aktivitas", () =>
      db.gameResult.findMany({
        where: { rank: 1 },
        include: {
          user: { select: { id: true, fullName: true, avatar: true } },
          room: { select: { code: true, gameType: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      60
    ),
    cache.getOrSet("arena:juara-baru", () =>
      db.studentKarya.findMany({
        include: { user: { select: { id: true, fullName: true, avatar: true } } },
        where: { userId: { not: user.id } },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      60
    ),
    (async () => {
      try {
        const memberships = await db.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } })
        const groupIds = memberships.map(m => m.groupId)
        if (groupIds.length === 0) return 0
        const assignments = await db.quizAssignment.findMany({ where: { groupId: { in: groupIds }, isPublished: true }, select: { id: true } })
        const assignIds = assignments.map(a => a.id)
        if (assignIds.length === 0) return 0
        const submissions = await db.quizSubmission.findMany({ where: { userId: user.id, assignmentId: { in: assignIds } }, select: { assignmentId: true, status: true } })
        const submittedIds = new Set(submissions.filter(s => s.status === "SUBMITTED" || s.status === "GRADED").map(s => s.assignmentId))
        return assignIds.filter(id => !submittedIds.has(id)).length
      } catch { return 0 }
    })(),
    (async () => {
      try {
        const levels = await db.learningLevel.findMany({
          where: { type: "JALUR" },
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            units: {
              where: { isActive: true },
              orderBy: { order: "asc" },
              select: { id: true, title: true, emoji: true },
            },
          },
        })
        const levelCount = levels.length
        // Flatten units in curriculum order, remembering their level title.
        const orderedUnits = levels.flatMap((l) =>
          l.units.map((u) => ({ ...u, levelTitle: l.title }))
        )
        const unitCount = orderedUnits.length
        const progressRows = await db.userUnitProgress.findMany({
          where: { userId: user.id },
          select: { unitId: true, completed: true, xpEarned: true },
        })
        const xp = progressRows.reduce((s, p) => s + (p.xpEarned || 0), 0)
        const completedIds = new Set(progressRows.filter((p) => p.completed).map((p) => p.unitId))
        const completedCount = orderedUnits.filter((u) => completedIds.has(u.id)).length
        // Resume point = first unit in curriculum order the student hasn't finished.
        const nextUnit = orderedUnits.find((u) => !completedIds.has(u.id)) || null
        const isFirstTime = progressRows.length === 0
        return { levelCount, unitCount, xp, nextUnit, completedCount, isFirstTime }
      } catch { return { levelCount: 0, unitCount: 0, xp: 0, nextUnit: null, completedCount: 0, isFirstTime: true } }
    })(),
  ])

  let trendingKarya = await db.studentKarya.findMany({
    include: { user: { select: { id: true, fullName: true, avatar: true } } },
    orderBy: { likesCount: "desc" },
    take: 6,
  })
  if (trendingKarya.length === 0) {
    trendingKarya = await db.studentKarya.findMany({
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    })
  }

  const topUsers = await db.user.findMany({
    where: { xp: { gt: 0 } },
    orderBy: { xp: "desc" },
    take: 3,
    select: { id: true, fullName: true, xp: true },
  })

  // Daily standings for the mini league widget. Mirrors /arena/league so both
  // places agree; cached because every student loads this page.
  const topHarian = await cache.getOrSet<{ id: string; fullName: string; xp: number }[]>(
    "arena:liga:harian:top3",
    async () => {
      const earned = await db.coinTransaction.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: todayStart }, amount: { gt: 0 }, user: { role: "MURID" } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 3,
      })
      if (earned.length === 0) return []
      const users = await db.user.findMany({
        where: { id: { in: earned.map(e => e.userId) } },
        select: { id: true, fullName: true },
      })
      const map = Object.fromEntries(users.map(u => [u.id, u.fullName]))
      return earned
        .filter(e => map[e.userId])
        .map(e => ({ id: e.userId, fullName: map[e.userId], xp: e._sum.amount || 0 }))
    },
    120
  )

  const limaMenitLalu = new Date(Date.now() - 5 * 60 * 1000)
  const sepuluhMenitLalu = new Date(Date.now() - 10 * 60 * 1000)

  const [onlineCount, recentBattles, recentPlayers] = await Promise.all([
    db.user.count({ where: { lastActiveAt: { gte: limaMenitLalu }, role: "MURID" } }),
    db.gameResult.count({ where: { createdAt: { gte: sepuluhMenitLalu } } }),
    db.gameResult.findMany({
      where: { createdAt: { gte: sepuluhMenitLalu } },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      distinct: ["userId"],
    }),
  ])

  return (
    <div className="beranda arena-page">
      {isGuruPreview && (
        <div className="mx-4 mt-3 mb-1 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <GraduationCap size={16} className="text-emerald-600 shrink-0" />
          <p className="flex-1 text-[12px] font-medium text-emerald-800">
            Mode Pratinjau Guru — kamu melihat tampilan murid. Peranmu tetap Guru.
          </p>
          <Link href="/guru/beranda" className="text-[12px] font-bold text-emerald-700 whitespace-nowrap hover:underline">
            Kembali
          </Link>
        </div>
      )}
      {/* HERO */}
      <div className="hero-section">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="relative">
              <div className="w-[46px] h-[46px] rounded-2xl border-2 border-white/40 bg-gradient-to-br from-purple-300 to-purple-600 flex items-center justify-center text-white font-extrabold text-xl overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{user.fullName?.charAt(0).toUpperCase() || "M"}</span>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Halo, {user.fullName?.split(" ")[0]}!</h2>
              <p className="text-xs text-white/65">{displayLeague || "Perunggu"} &middot; Tingkat {displayLevel}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mb-5">
            <div className="hero-stat">
              <Flame size={16} className="text-orange-300 mx-auto mb-0.5" />
              <p className="font-extrabold text-xl text-white">{user.streak || 0}</p>
              <p className="text-[10px] text-white/60 font-medium">Streak</p>
            </div>
            <div className="hero-stat">
              <Zap size={16} className="text-yellow-300 mx-auto mb-0.5" />
              <p className="font-extrabold text-xl text-white">{koinHariIni.toLocaleString()}</p>
              <p className="text-[10px] text-white/60 font-medium">Koin Hari Ini</p>
            </div>
            <div className="hero-stat">
              <Coins size={16} className="text-amber-300 mx-auto mb-0.5" />
              <p className="font-extrabold text-xl text-white">{user.coins || 0}</p>
              <p className="text-[10px] text-white/60 font-medium">Koin</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[11px] text-white/70 font-semibold">Tingkat {displayLevel} &rarr; Tingkat {displayLevel + 1}</span>
              <span className="text-[11px] text-amber-300 font-bold">{progress.current} / {progress.needed} XP</span>
            </div>
            <div className="h-2 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full relative xp-fill-anim"
                style={{ "--fill-w": `${progress.pct}%` } as React.CSSProperties}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── BELAJAR: the one thing that matters most on this screen ──
          This card used to sit eighth, below quick actions, friend activity
          and assignments — which is why only 5 of 157 students had ever opened
          the learning path. It is now the first thing after the hero, given
          the visual weight of a primary action rather than a list row. */}
      {jalurStats.nextUnit && (
        <div className="beranda-section">
          <Link href={`/arena/jalur-cerdas/${jalurStats.nextUnit.id}`} className="belajar-hero group">
            <div className="belajar-hero-top">
              <div className="belajar-medali"><UnitIcon emoji={jalurStats.nextUnit.emoji} className="w-7 h-7" /></div>
              <div className="flex-1 min-w-0">
                <p className="belajar-eyebrow">
                  {jalurStats.isFirstTime ? "Mulai perjalananmu" : jalurStats.nextUnit.levelTitle}
                </p>
                <h3 className="belajar-judul">{jalurStats.nextUnit.title}</h3>
              </div>
            </div>

            {jalurStats.unitCount > 0 && (
              <div className="belajar-progres">
                <div className="belajar-bar">
                  <div
                    className="belajar-bar-isi"
                    style={{ width: `${Math.max(3, Math.round((jalurStats.completedCount / jalurStats.unitCount) * 100))}%` }}
                  />
                </div>
                <span className="belajar-hitung">
                  {jalurStats.completedCount}/{jalurStats.unitCount}
                </span>
              </div>
            )}

            <span className="belajar-tombol">
              {jalurStats.isFirstTime ? "MULAI BELAJAR" : "LANJUTKAN"}
            </span>
          </Link>
        </div>
      )}

      {/* Semua materi selesai — ajak mengulang */}
      {!jalurStats.nextUnit && jalurStats.unitCount > 0 && (
        <div className="beranda-section">
          <Link href="/arena/jalur-cerdas" className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-sm active:scale-[0.98] transition-transform">
            <Trophy size={24} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm">Semua materi selesai!</h4>
              <p className="text-[11px] text-white/80">Ulangi materi untuk memperkuat pemahamanmu</p>
            </div>
            <ChevronRight size={20} className="text-white/70 shrink-0" />
          </Link>
        </div>
      )}

      {/* STREAK BANNER */}
      {(user.streak || 0) > 0 && (
        <div className="streak-banner">
          <div className="fire-anim">
            <Flame size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-white">
              Pertahankan streak {user.streak} hari-mu!
            </p>
            <p className="text-[11px] text-white/75">Main 1 gim lagi hari ini untuk menjaga api</p>
          </div>
          <Link href="/arena/game" className="bg-white/25 rounded-[10px] px-3 py-1.5 text-[11px] font-bold text-white shrink-0">
            Main!
          </Link>
        </div>
      )}

      {/* MISI HARIAN */}
      {totalQuest > 0 && (
        <div className="beranda-section">
          <div className="beranda-section-head">
            <h3 className="flex items-center gap-1.5">
              <Target size={16} className="text-purple-600" /> Misi Harian
            </h3>
            <Link href="/arena/misi" className="text-xs font-semibold text-purple-600">Lihat semua</Link>
          </div>
          <div className="misi-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Star size={18} className="text-amber-500" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A1033]">Misi Harian</h4>
                  <p className="text-[11px] text-[#9B93B8]">{doneQuest} dari {totalQuest} selesai</p>
                </div>
              </div>
              <span className="font-extrabold text-xl text-amber-500">
                {totalQuest > 0 ? Math.round((doneQuest / totalQuest) * 100) : 0}%
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {quests.slice(0, 3).map((q: any) => {
                const iconMap: Record<string, any> = {
                  MEMBERI_LIKE: { icon: Heart, color: "text-red-400" },
                  MENGOMENTARI: { icon: MessageCircle, color: "text-blue-400" },
                  MENULIS: { icon: PenLine, color: "text-purple-400" },
                  MENJAWAB_KUIS: { icon: Zap, color: "text-amber-400" },
                  MAIN_GAME: { icon: Gamepad2, color: "text-emerald-400" },
                  STREAK_LOGIN: { icon: Flame, color: "text-orange-400" },
                  BACA_MATERI: { icon: BookOpen, color: "text-cyan-400" },
                }
                const meta = iconMap[q.questType] || { icon: Star, color: "text-amber-400" }
                const Icon = meta.icon
                const pct = q.target > 0 ? Math.min(Math.round((q.progress / q.target) * 100), 100) : 0
                return (
                  <div key={q.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${q.completed ? "bg-emerald-50" : "bg-[#F4F2FF]"}`}>
                    <Icon size={16} className={meta.color} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${q.completed ? "text-emerald-600 line-through" : "text-[#1A1033]"}`}>
                        {q.questType === "MEMBERI_LIKE" ? `Beri Suka ${q.target} Karya` : q.questType === "MENGOMENTARI" ? `Komentari ${q.target} Karya` : q.questType === "MENULIS" ? `Tulis ${q.target} Karya` : q.questType === "MENJAWAB_KUIS" ? `Jawab ${q.target} Soal Kuis` : q.questType === "MAIN_GAME" ? `Main ${q.target} Gim` : q.questType === "BACA_MATERI" ? `Selesaikan ${q.target} Materi` : `Streak ${q.target} Hari`}
                      </p>
                      <p className="text-[10px] text-[#9B93B8]">{q.progress}/{q.target} selesai</p>
                      <div className="h-1 bg-black/5 rounded-full overflow-hidden mt-1">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-amber-500 shrink-0">+{q.rewardCoins} <Coins size={10} className="inline" /></span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* AKSI CEPAT */}
      <div className="beranda-section">
        <div className="beranda-section-head">
          <h3 className="flex items-center gap-1.5">
            <Zap size={16} className="text-purple-600" /> Aksi Cepat
          </h3>
        </div>
        {/* Six actions in a five-column grid left one orphan on its own row.
            Three columns on phones and six on wider screens divide evenly. */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <QuickAction icon={<Bot size={22} />} label="AI Cerdik" href="/arena/ai" warna="from-cyan-500 to-blue-600" />
          <QuickAction icon={<PenLine size={22} />} label="Tulis" href="/arena/tulis" warna="from-orange-500 to-red-600" />
          <QuickAction icon={<Gift size={22} />} label="Kotak" href="/arena/mystery-box" warna="from-amber-500 to-orange-600" />
          <QuickAction icon={<Gamepad2 size={22} />} label="Gim" href="/arena/game" warna="from-purple-600 to-violet-700" />
          <QuickAction icon={<Users size={22} />} label="Kelas" href="/murid/gabung-kelas" warna="from-emerald-500 to-teal-600" />
          <QuickAction icon={<Coins size={22} />} label="Toko" href="/arena/toko-koin" warna="from-amber-500 to-yellow-600" />
        </div>
      </div>

      {/* AKTIVITAS TEMAN */}
      {(aktivitas.length > 0 || juaraBaru.length > 0) && (
        <div className="beranda-section">
          <div className="beranda-section-head">
            <h3 className="flex items-center gap-1.5">
              <Users size={16} className="text-purple-600" /> Aktivitas Teman
            </h3>
            <Link href="/arena/feed" className="text-xs font-semibold text-purple-600">Semua</Link>
          </div>
          <div className="activity-feed">
            {aktivitas.slice(0, 2).map((a: any) => (
              <div key={a.id} className="flex items-center gap-2.5 p-3 bg-white border-b border-black/[0.04]">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {a.user?.fullName?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#1A1033]">
                    <span className="text-purple-600">{a.user?.fullName?.split(" ")[0] || "User"}</span> baru mengalahkan lawan di Adu Cepat
                  </p>
                  <p className="text-[11px] text-[#9B93B8]">{waktuLalu(a.createdAt)} &middot; +{a.xpEarned || 0} XP</p>
                </div>
                <Swords size={16} className="text-purple-400 shrink-0" />
              </div>
            ))}
            {juaraBaru.slice(0, 2).map((k: any) => (
              <Link key={k.id} href={`/arena/feed/${k.id}`} className="flex items-center gap-2.5 p-3 bg-white border-b border-black/[0.04]">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {k.user?.fullName?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#1A1033]">
                    <span className="text-purple-600">{k.user?.fullName?.split(" ")[0] || "User"}</span> menulis {k.type?.toLowerCase() || "karya"} baru
                  </p>
                  <p className="text-[11px] text-[#9B93B8]">{k.title} &middot; {k.likesCount || 0} suka</p>
                </div>
                <PenLine size={16} className="text-purple-400 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* TUGAS CARD */}
      <div className="beranda-section">
        <TugasCard pendingCount={tugasCount} />
      </div>

      {/* JALUR CERDAS — full width, no side padding */}
      <div className="-mx-4 mt-5">
        <Link href="/arena/jalur-cerdas" className="flex flex-col gap-3 bg-gradient-to-r from-purple-600 to-violet-500 px-5 py-4 shadow-lg shadow-purple-500/30 active:scale-[0.98] transition-transform relative overflow-hidden">
          <div className="absolute top-[-30px] right-[-30px] w-[160px] h-[160px] bg-white/10 rounded-full pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-[16px] flex items-center justify-center backdrop-blur shrink-0">
              <Rocket size={26} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-extrabold text-lg text-white truncate">Jalur Cerdas</h4>
              <p className="text-sm text-white/70 truncate">Latihan Bahasa Indonesia dari nol sampai mahir</p>
            </div>
            <ChevronRight size={22} className="text-white/60 shrink-0" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-white/10 rounded-xl py-2.5 px-2 text-center min-w-0">
              <p className="font-extrabold text-lg text-white whitespace-nowrap">{jalurStats.levelCount} Level</p>
              <p className="text-[10px] text-white/70 mt-0.5"><GraduationCap size={11} className="inline mr-0.5" />Tingkat</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-xl py-2.5 px-2 text-center min-w-0">
              <p className="font-extrabold text-lg text-white whitespace-nowrap">{jalurStats.unitCount} Materi</p>
              <p className="text-[10px] text-white/70 mt-0.5"><BookOpen size={11} className="inline mr-0.5" />Pelajaran</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-xl py-2.5 px-2 text-center min-w-0">
              <p className="font-extrabold text-lg text-white whitespace-nowrap">{jalurStats.xp.toLocaleString()} XP</p>
              <p className="text-[10px] text-white/70 mt-0.5"><Zap size={11} className="inline mr-0.5" />Total</p>
            </div>
          </div>
        </Link>
      </div>

      {/* SIMULASI & UJIAN — belajar serius, tetap di dalam Arena */}
      <div className="beranda-section">
        <div className="beranda-section-head">
          <h3 className="flex items-center gap-1.5">
            <Award size={16} className="text-violet-500" /> Simulasi & Ujian
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Link href="/murid/simulasi/ukbi" className="flex flex-col items-center gap-1.5 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm active:scale-95 transition-transform">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <BookOpen size={20} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">Simulasi UKBI</span>
          </Link>
          <Link href="/murid/simulasi/tka" className="flex flex-col items-center gap-1.5 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm active:scale-95 transition-transform">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">Simulasi TKA</span>
          </Link>
          <Link href="/murid/dokumen-latihan" className="flex flex-col items-center gap-1.5 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm active:scale-95 transition-transform">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Award size={20} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">Dokumen Latihan</span>
          </Link>
        </div>
      </div>

      {/* LIGA MINI */}
      {(topUsers.length > 0 || topHarian.length > 0) && (
        <div className="beranda-section">
          <div className="beranda-section-head">
            <h3 className="flex items-center gap-1.5">
              <Trophy size={16} className="text-amber-500" /> Liga
            </h3>
            <Link href="/arena/league" className="text-xs font-semibold text-purple-600">Lihat semua</Link>
          </div>
          <LeagueMini userId={user.id} harian={topHarian} mingguan={topUsers} />
        </div>
      )}

      {/* Teaser for a mode that is not available yet. It used to sit third from
          the top, so the third thing a student saw was a large card for
          something they cannot open — prime space spent on a promise. Moved
          below the sections that offer something to actually do. */}
      <div className="px-4 mt-4">
        <BattleCard onlineCount={onlineCount} recentBattles={recentBattles} recentPlayers={recentPlayers} />
      </div>

      {/* KARYA TERPOPULER */}
      <div className="beranda-section pb-6">
        <div className="beranda-section-head">
          <h3 className="flex items-center gap-1.5">
            <Flame size={16} className="text-orange-500" /> Karya Terpopuler
          </h3>
          <Link href="/arena/feed" className="text-xs font-semibold text-purple-600">Lihat semua</Link>
        </div>
        <div className="karya-scroll">
          {trendingKarya.map((karya: any) => (
            <Link key={karya.id} href={`/arena/feed/${karya.id}`} className="karya-card">
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1.5">
                {karya.type || "Karya"}
              </p>
              <p className="font-bold text-sm text-[#1A1033] leading-tight mb-1 line-clamp-2">{karya.title}</p>
              <p className="text-[11px] text-[#9B93B8] leading-relaxed mb-2 line-clamp-2">{karya.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-[7px] bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-[8px] font-bold text-white">
                    {karya.user?.fullName?.charAt(0) || "?"}
                  </div>
                  <span className="text-[10px] text-[#9B93B8]">{karya.user?.fullName?.split(" ")[0] || "User"}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-red-500 font-semibold">
                  <Heart size={10} /> {karya.likesCount || 0}
                </div>
              </div>
            </Link>
          ))}
          {trendingKarya.length === 0 && (
            <p className="text-sm text-[#9B93B8] w-full text-center py-6">Belum ada karya. Jadilah yang pertama!</p>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon, label, href, warna }: { icon: React.ReactNode; label: string; href: string; warna: string }) {
  // The whole tile is the target, not just the 54px icon, and every tile is the
  // same height so a longer label cannot knock the row out of alignment.
  return (
    <Link
      href={href}
      className="quick-action group flex flex-col items-center justify-start gap-1.5 rounded-2xl px-1 py-2.5 hover:bg-white active:scale-[0.97] transition-all"
    >
      <div className={`quick-icon bg-gradient-to-br ${warna} text-white shadow-md group-hover:shadow-lg transition-shadow`}>
        {icon}
      </div>
      <span className="quick-label text-[11px] font-semibold text-[#5A5278] text-center leading-tight">{label}</span>
    </Link>
  )
}

function waktuLalu(tanggal: Date) {
  const diff = Date.now() - new Date(tanggal).getTime()
  const menit = Math.floor(diff / 60000)
  if (menit < 1) return "baru saja"
  if (menit < 60) return `${menit}m`
  const jam = Math.floor(menit / 60)
  if (jam < 24) return `${jam}j`
  return `${Math.floor(jam / 24)}h`
}
