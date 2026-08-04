import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import cache from "@/lib/redis"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"
import {
  Flame, Zap, Coins, Target, Bot, PenLine, Rocket, Star, Gift,
  Trophy, BookOpen, ChevronRight, Award,
  MessageCircle, Users, Clock, Swords, Crown, GraduationCap,
  Globe, FileCheck2,
} from "lucide-react"
import { trackDailyStreak, getOrCreateDailyQuests } from "@/lib/coins"
import { jenjangMurid } from "@/lib/arena-junior/kurikulum"
import { getQuestMeta, questProgressText } from "@/lib/quest-meta"
import { getLevelProgress, levelFromXp } from "@/lib/gamification/levels"
import { rankFromLevel } from "@/lib/gamification/ranks"
import { RankChip } from "@/components/gamification/RankChip"
import { SiaranBanner } from "@/components/arena/SiaranBanner"
import { getDisplayName } from "@/lib/nickname"
import { PembelajaranCard } from "./pembelajaran-card"
import BattleCard from "@/components/arena/BattleCard"
import LeagueMini from "./league-mini"
import { UnitIcon } from "@/components/arena/UnitIcon"
import NextActionCard from "@/components/arena/player/NextActionCard"
import MentorCard from "@/components/arena/player/MentorCard"
import SkillRadar from "@/components/arena/player/SkillRadar"

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
  if (!user) redirect("/arena/login")

  // Murid TK–SD punya dasbor sendiri (Arena Junior). Login mengarahkan semua
  // murid ke sini, jadi pembelokan dilakukan di beranda saja — BUKAN di layout,
  // supaya tidak menambah query database pada setiap navigasi di dalam Arena.
  if (user.role === "MURID") {
    const jenjang = await jenjangMurid(user.id)
    if (jenjang) redirect("/junior")
  }

  const isGuruPreview = user.role !== "MURID" && !user.isFounder
  const nameOf = (u: { fullName: string; nickname?: string | null }) =>
    isGuruPreview ? u.fullName : getDisplayName(u, "peer")

  if (!isGuruPreview) await trackDailyStreak(user.id)
  const quests = await getOrCreateDailyQuests(user.id)
  const doneQuest = quests.filter((q: any) => q.completed).length
  const totalQuest = quests.length

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

  const displayLevel = levelFromXp(totalXp)
  const displayRank = rankFromLevel(displayLevel)
  const progress = getLevelProgress(totalXp)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayCoinAgg = await db.coinTransaction.aggregate({
    where: { userId: user.id, createdAt: { gte: todayStart }, amount: { gt: 0 } },
    _sum: { amount: true },
  })
  const koinHariIni = todayCoinAgg._sum.amount || 0

  const [aktivitas, tugasCount, jalurStats, myKaryaCount, materiCount, jalurProgress] = await Promise.all([
    cache.getOrSet("arena:aktivitas", () =>
      db.gameResult.findMany({
        where: { rank: 1 },
        include: {
          user: { select: { id: true, fullName: true, nickname: true, avatar: true } },
          room: { select: { code: true, gameType: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
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

        const penugasans = await db.penugasan.findMany({ where: { groupId: { in: groupIds } }, select: { id: true } })
        const penugasanIds = penugasans.map(p => p.id)

        const [doneAssignments, donePenugasans] = await Promise.all([
          db.quizSubmission.groupBy({ by: ["assignmentId"], where: { userId: user.id, assignmentId: { in: assignIds } }, _count: true }),
          db.penugasanSubmission.groupBy({ by: ["penugasanId"], where: { userId: user.id, penugasanId: { in: penugasanIds } }, _count: true }),
        ])
        const doneIds = new Set([
          ...doneAssignments.map(a => a.assignmentId),
          ...donePenugasans.map(p => p.penugasanId),
        ])
        return assignIds.length + penugasanIds.length - doneIds.size
      } catch { return 0 }
    })(),
    db.userUnitProgress.aggregate({
      where: { userId: user.id },
      _sum: { xpEarned: true },
    }),
    db.studentKarya.count({ where: { userId: user.id } }),
    (async () => {
      try {
        const ids = (await db.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } })).map(m => m.groupId)
        if (ids.length === 0) return 0
        return await db.materiKirim.count({ where: { groupId: { in: ids } } })
      } catch { return 0 }
    })(),
    (async () => {
      try {
        const completed = await db.userUnitProgress.count({ where: { userId: user.id, completed: true } });
        const jalurLevels = await db.learningLevel.findMany({ where: { type: "JALUR" }, select: { id: true } });
        const total = await db.learningUnit.count({ where: { levelId: { in: jalurLevels.map(l => l.id) }, isActive: true } });
        return { completed, total };
      } catch { return { completed: 0, total: 72 } }
    })(),
  ])

  const leagueRows = await cache.getOrSet("arena:league-mini:top5", async () =>
    db.user.findMany({
      where: { role: "MURID", xp: { gt: 0 } },
      orderBy: { xp: "desc" },
      take: 5,
      select: { id: true, fullName: true, nickname: true, xp: true },
    }),
    120
  )

  const dailyCoinRows = await cache.getOrSet("arena:league-mini:daily:v2", async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const earned = await db.coinTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: today }, amount: { gt: 0 }, user: { role: "MURID" } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    })
    const userIds = earned.map(e => e.userId)
    if (userIds.length === 0) return []
    const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, nickname: true } })
    return earned.map(e => {
      const u = users.find(us => us.id === e.userId)
      return { id: e.userId, fullName: u?.fullName || "", nickname: u?.nickname, xp: (e._sum.amount || 0) }
    })
  }, 120)


  return (
    <div className="arena-page max-w-5xl mx-auto p-4 md:p-6">
      {/* Siaran platform — kabar sistem & acara untuk semua murid. */}
      <SiaranBanner />
      {/* Hero Card */}
      <div className="arena-hero bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-[24px] p-5 md:p-6 mb-6 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-white font-bold text-2xl border-4 border-white/30 shadow-lg shrink-0 overflow-hidden">
              {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : initials(nameOf(user))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-violet-200 font-medium">Arena BahasaCerdas</p>
              <h2 className="text-xl md:text-2xl font-extrabold truncate mt-0.5">{nameOf(user)}</h2>
              <div className="flex items-center gap-2 mt-2">
                <RankChip rank={displayRank} size={16} className="bg-white/20 backdrop-blur" />
                <span className="bg-white/15 backdrop-blur rounded-full px-3 py-1 text-xs">Tingkat {displayLevel}</span>
              </div>
            </div>
            <Link href="/arena/misi" className="shrink-0 bg-white/20 backdrop-blur hover:bg-white/30 rounded-2xl p-2 transition-all">
              <Gift size={24} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-3 md:p-4">
              <div className="flex items-center gap-2 text-amber-300 mb-1">
                <Flame size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide">Rentetan</span>
              </div>
              <p className="text-xl md:text-2xl font-extrabold">{user.streak || 0} <span className="text-sm font-normal text-violet-200">hari</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-3 md:p-4">
              <div className="flex items-center gap-2 text-amber-300 mb-1">
                <Zap size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide">XP</span>
              </div>
              <p className="text-xl md:text-2xl font-extrabold">{totalXp.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-3 md:p-4">
              <div className="flex items-center gap-2 text-amber-300 mb-1">
                <Coins size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide">Koin</span>
              </div>
              <p className="text-xl md:text-2xl font-extrabold">{user.coins || 0}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-3 md:p-4">
              <div className="flex items-center gap-2 text-amber-300 mb-1">
                <Target size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide">Koin Hari Ini</span>
              </div>
              <p className="text-xl md:text-2xl font-extrabold">+{koinHariIni}</p>
            </div>
          </div>

          <div className="mt-5 bg-white/10 backdrop-blur rounded-2xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold">Kemajuan Tingkat {displayLevel}</span>
              <span className="text-violet-200">{progress.current} / {progress.needed} XP</span>
            </div>
              <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full transition-all duration-500" style={{ width: `${progress.pct * 100}%` }} />
              </div>
          </div>
        </div>
      </div>

      {/* Sprint 5 — Learning Loop: rekomendasi aksi berikutnya */}
      <div className="space-y-3 mb-5">
        <NextActionCard className="mb-3" />
        <div className="grid sm:grid-cols-2 gap-3">
          <MentorCard />
          <SkillRadar />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Tugas Card */}
          <PembelajaranCard tugasCount={tugasCount} materiCount={materiCount} />

          {/* Jalur Cerdas Card */}
          <Link href="/arena/jalur-cerdas" className="block group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all">
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-extrabold text-white">Jalur Cerdas</h2>
                    <p className="text-xs text-violet-200">Latihan Bahasa Indonesia dari nol sampai mahir</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                    <p className="text-lg font-extrabold text-white">{displayLevel}</p>
                    <p className="text-[10px] text-violet-200 mt-0.5">Tingkat</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                    <p className="text-lg font-extrabold text-white">{jalurProgress.completed}</p>
                    <p className="text-[10px] text-violet-200 mt-0.5">Unit Selesai</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                    <p className="text-lg font-extrabold text-white">{totalXp.toLocaleString()}</p>
                    <p className="text-[10px] text-violet-200 mt-0.5">XP Total</p>
                  </div>
                </div>
                <div className="mt-3 bg-white/10 backdrop-blur rounded-xl p-3">
                  <div className="flex justify-between text-xs text-violet-200 mb-1.5">
                    <span>Progress Jalur Cerdas</span>
                    <span>{Math.round((jalurProgress.completed / Math.max(jalurProgress.total, 1)) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full transition-all" style={{ width: `${(jalurProgress.completed / Math.max(jalurProgress.total, 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Simulasi dan Ujian — UKBI / TKA / BIGT / Hasil */}
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <GraduationCap size={18} className="text-indigo-500" />
              Simulasi dan Ujian
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/arena/simulasi/ukbi", label: "Simulasi UKBI", desc: "Merespons kaidah, membaca, mendengarkan", icon: BookOpen, warna: "from-indigo-500 to-violet-600" },
                { href: "/arena/simulasi/tka", label: "Simulasi TKA", desc: "Tes Kemampuan Akademik, SD s.d. UTBK", icon: BookOpen, warna: "from-emerald-500 to-teal-600" },
                { href: "/arena/simulasi/bigt", label: "BIGT", desc: "BahasaCerdas International Global Test", icon: Globe, warna: "from-blue-500 to-indigo-600" },
                { href: "/arena/simulasi/hasil", label: "Hasil Ujian", desc: "Skor, riwayat & dokumen latihan", icon: FileCheck2, warna: "from-amber-500 to-orange-600" },
              ].map((s) => (
                <Link key={s.href} href={s.href} className="block bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-violet-200 transition-all">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.warna} flex items-center justify-center mb-2`}>
                    <s.icon size={20} className="text-white" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">{s.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{s.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-3">Aksi Cepat</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { href: "/arena/tulis", label: "Tulis Karya", icon: PenLine, warna: "from-violet-500 to-purple-600" },
                { href: "/arena/ai", label: "AI Cerdik", icon: Bot, warna: "from-blue-500 to-indigo-600" },
                { href: "/arena/mystery-box", label: "Kotak Misterius", icon: Gift, warna: "from-amber-500 to-yellow-600" },
                { href: "/arena/gabung-kelas", label: "Gabung Kelas", icon: Users, warna: "from-teal-500 to-cyan-600" },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="flex flex-col items-center gap-2 bg-white rounded-2xl p-4 border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all text-center">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${a.warna} flex items-center justify-center`}>
                    <a.icon size={22} className="text-white" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Aktivitas Terbaru */}
          {aktivitas.length > 0 && (
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Crown size={18} className="text-amber-500" />
                Pemenang Game
              </h3>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {aktivitas.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                      {a.user?.avatar ? <img src={a.user.avatar} alt="" className="w-full h-full object-cover" /> : nameOf(a.user).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{nameOf(a.user)}</p>
                      <p className="text-xs text-gray-400">Juara {a.room?.gameType?.replace(/_/g, " ") || "Game"}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {(() => { const d = new Date(a.createdAt); const now = new Date(); const diff = now.getTime() - d.getTime(); const jam = Math.floor(diff / 3600000); if (jam < 1) return "baru saja"; if (jam < 24) return `${jam}j`; return `${Math.floor(jam / 24)}h`; })()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* League Mini */}
          <LeagueMini
            userId={user.id}
            harian={dailyCoinRows.map(u => ({ id: u.id, fullName: u.fullName, displayName: u.nickname || undefined, xp: u.xp }))}
            mingguan={leagueRows.map(u => ({ id: u.id, fullName: u.fullName, displayName: u.nickname || undefined, xp: u.xp }))}
          />

          {/* Stats */}
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 text-white">
            <h4 className="font-bold text-sm mb-4 text-violet-200">Statistik Kamu</h4>
            <div className="divide-y divide-white/10">
              {[
                { icon: PenLine, label: "Total Karya", value: myKaryaCount, color: "text-pink-300" },
                { icon: Star, label: "Tingkat", value: displayLevel, color: "text-amber-300" },
                { icon: Flame, label: "Rentetan", value: `${user.streak || 0} hari`, color: "text-orange-300" },
                { icon: Coins, label: "Koin Terkumpul", value: user.coins || 0, color: "text-amber-300" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <s.icon size={15} className={s.color} />
                  </div>
                  <span className="text-sm text-violet-100 flex-1">{s.label}</span>
                  <span className="font-bold">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Misi Harian */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Target size={18} className="text-orange-500" />
                Misi Harian
              </h3>
              <Link href="/arena/misi" className="text-xs font-semibold text-violet-600 hover:text-violet-700">{doneQuest}/{totalQuest} selesai</Link>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              {quests.length === 0 ? (
                <p className="text-sm text-gray-400">Belum ada misi hari ini.</p>
              ) : (
                <div className="space-y-2">
                  {quests.slice(0, 3).map((q: any) => {
                    const meta = getQuestMeta(q.questType)
                    const progress = Math.min(q.progress, q.target)
                    return (
                      <div key={q.id} className="flex items-center gap-3 py-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${q.completed ? "bg-emerald-100 text-emerald-600" : `bg-gradient-to-br ${meta.warna} text-white`}`}>
                          <meta.Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${q.completed ? "text-gray-400 line-through" : "text-gray-900"}`}>{meta.label}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full" style={{ width: `${Math.min(100, (progress / q.target) * 100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">{questProgressText(progress, q.target, q.completed)}</span>
                          </div>
                        </div>
                        {q.rewardCoins > 0 && (
                          <span className="text-xs font-bold text-amber-600 shrink-0 flex items-center gap-1">
                            <Coins size={12} />{q.rewardCoins}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
