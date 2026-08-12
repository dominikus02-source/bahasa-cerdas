import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import cache from "@/lib/redis"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"
import {
  Flame, Zap, Coins, Target, Trophy, Award, Gift,
  ChevronRight, Gamepad2, CheckCircle2, Medal, Swords,
  Clock, Mountain, TreePine, Users,
} from "lucide-react"
import { trackDailyStreak, getOrCreateDailyQuests } from "@/lib/coins"
import { jenjangMurid } from "@/lib/arena-junior/kurikulum"
import { getQuestMeta, questProgressText } from "@/lib/quest-meta"
import { getLevelProgress, levelFromXp } from "@/lib/gamification/levels"
import { rankFromLevel } from "@/lib/gamification/ranks"
import { RankChip } from "@/components/gamification/RankChip"
import { BadgeIcon } from "@/components/gamification/BadgeIcon"
import { SiaranBanner } from "@/components/arena/SiaranBanner"
import { getDisplayName } from "@/lib/nickname"
import { getWeeklyCompetition } from "@/lib/gamification/motivation"
import { listUserBadges, type BadgeView } from "@/lib/gamification/badge-engine"
import { listAchievements, type AchievementView } from "@/lib/gamification/achievement-engine"
import WeeklyCountdown from "@/components/arena/player/WeeklyCountdown"
import { LeaderboardPanel } from "@/components/arena/player/leaderboard-panel"

function initials(name: string) {
  return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"
}

// ARENA 4.1 — VISUAL POLISH: Competitive Hub BahasaCerdas.
// Hero = player identity (light premium canvas). Kuis Tempur = signature
// immersive dark zone. Misi/Liga/Gim = activity cards, bukan navbar.
// Kompetisi minggu ini = jantung motivasi. Reward berada di akhir.
// Warna: violet = aksi/progres, gold/amber = rank/hadiah/koin,
// emerald = selesai, merah = battle, dark navy hanya zona battle.
// Semua data dari existing engines/API. Tidak ada mock.

// Gim sekunder section Game Arena — data sama seperti hub gim (/arena/game).
const GIM_SEKUNDER: { title: string; desc: string; href: string; icon: any; xp: string }[] = [
  { title: "Menara Cerdas", desc: "Panjat menara dengan soal pelajaranmu!", href: "/arena/game/menara", icon: Mountain, xp: "+60 XP" },
  { title: "Irama Kata", desc: "Kata jatuh di 4 jalur — ketuk yang sesuai aturan!", href: "/arena/game/irama-kata", icon: Clock, xp: "+60 XP" },
  { title: "Petualangan Kata", desc: "Bantu Zelby menangkap kata yang benar di hutan!", href: "/arena/game/petualangan-kata", icon: TreePine, xp: "+90 XP" },
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

  const [aktivitas, competition, badges, achievements] = await Promise.all([
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
    getWeeklyCompetition(user.id).catch(() => null),
    listUserBadges(user.id).catch(() => [] as BadgeView[]),
    listAchievements(user.id).catch(() => [] as AchievementView[]),
  ])

  const unlockedBadges = badges.filter((b) => b.unlocked).length
  const profileHref = isGuruPreview ? "/guru/akun" : "/murid/profile"
  const questPct = Math.round((doneQuest / Math.max(totalQuest, 1)) * 100)
  const adaMisiAktif = totalQuest > 0 && doneQuest < totalQuest
  const kuisTempurHref = "/arena/game/kuis-tempur"
  const recentPlayers = aktivitas.map((a: any) => ({ userId: a.userId, user: a.user ? { fullName: a.user.fullName } : null }))

  return (
    <div className="arena-page mx-auto p-4 md:p-6 space-y-8">
      {/* Siaran platform — kabar sistem & acara untuk semua murid. */}
      <SiaranBanner />

      {/* ── 1. ARENA RANK HERO — player identity (light premium canvas) ── */}
      <section
        aria-label="Identitas pemain"
        className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 shadow-sm dark:border-violet-500/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900"
      >
        <div className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-500/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-amber-100/60 blur-3xl dark:bg-amber-500/5" />

        <div className="relative z-10 flex flex-col gap-4 p-4 md:gap-5 md:px-6 md:py-6">
          {/* Identitas + stat */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 p-[3px] shadow-md shadow-amber-500/20 md:h-16 md:w-16">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-xl font-black text-white">
                  {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : initials(nameOf(user))}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Arena BahasaCerdas</p>
                <h1 className="truncate text-lg font-black text-gray-900 md:text-xl dark:text-white">{nameOf(user)}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <RankChip rank={displayRank} size={16} />
                  <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                    Tingkat {displayLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Stat ringkas — streak / XP / koin */}
            <div className="flex flex-wrap items-center gap-2">
              <span title="Rentetan harian" className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1.5 text-xs font-bold text-gray-900 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                <Flame className="h-3.5 w-3.5 text-orange-500" /> {user.streak || 0}
                <span className="font-medium text-gray-400 dark:text-slate-500">hari</span>
              </span>
              <span title="Total XP" className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1.5 text-xs font-bold text-gray-900 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                <Zap className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" /> {totalXp.toLocaleString()}
                <span className="font-medium text-gray-400 dark:text-slate-500">XP</span>
              </span>
              <span title="Koin" className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-3 py-1.5 text-xs font-bold text-gray-900 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                <Coins className="h-3.5 w-3.5 text-amber-500" /> {user.coins || 0}
              </span>
            </div>
          </div>

          {/* Progress + CTA */}
          <div className="flex flex-col gap-3 border-t border-violet-100/70 pt-4 md:flex-row md:items-center md:justify-between dark:border-slate-800">
            <div className="w-full md:max-w-sm">
              <div className="mb-1.5 flex items-baseline justify-between text-[11px] font-bold text-gray-500 dark:text-slate-400">
                <span>Menuju tingkat {displayLevel + 1}</span>
                <span className="tabular-nums text-violet-700 dark:text-violet-300">
                  {progress.current}/{progress.needed} XP
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500"
                  style={{ width: `${progress.pct * 100}%` }}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {adaMisiAktif && (
                <Link
                  href="/arena/misi"
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm shadow-violet-600/30 transition-all hover:bg-violet-500 active:scale-[0.98] dark:bg-violet-500 dark:hover:bg-violet-400"
                >
                  Lanjutkan Misi <ChevronRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                href={profileHref}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-violet-200 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-violet-500/40 dark:hover:text-violet-300"
              >
                Lihat Profil <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. KUIS TEMPUR — signature Arena (dark immersive zone) ── */}
      <section aria-label="Kuis Tempur" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B0A1A] via-[#1B1035] to-[#2D1566] text-white shadow-lg shadow-indigo-950/30">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-red-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:px-7 md:py-7">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                <Swords size={12} /> Kuis Tempur
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-200">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 live-dot2" /> Terpopuler
              </span>
            </div>
            <h2 className="mt-3 text-xl font-black md:text-2xl">Jawab benar. Serang lawan. Bertahan sampai akhir.</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
              Lawan murid lain secara langsung — siapa paling cepat dan benar dialah pemenangnya.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-amber-400/90 px-3 py-1.5 text-[11px] font-extrabold text-amber-950">
                <Zap size={12} /> +80 XP
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-200 backdrop-blur">
                <Clock size={12} /> ±5 menit
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-200 backdrop-blur">
                <Users size={12} /> 2–8 pemain
              </span>
            </div>
          </div>
          <Link
            href={kuisTempurHref}
            className="group flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-600/30 transition-all hover:from-violet-500 hover:to-purple-500 hover:shadow-violet-500/40 active:scale-[0.98]"
          >
            Main Sekarang <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ── 3. ARENA ACTIONS — 3 activity cards (MISI / LIGA / GIM) ── */}
      <section aria-label="Aksi Arena">
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/arena/misi" className="group flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/[0.06] dark:border-slate-700/60 dark:bg-slate-800/70 dark:hover:border-violet-500/30">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
              <Target size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-gray-900 dark:text-slate-100">Misi</p>
              <p className="truncate text-[11px] text-gray-400 dark:text-slate-400">{doneQuest}/{totalQuest} misi selesai</p>
              <span className="mt-1 inline-block text-[11px] font-bold text-violet-600 dark:text-violet-400">Lanjutkan Misi →</span>
            </div>
          </Link>
          <Link href="/arena/league" className="group flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md hover:shadow-amber-500/[0.06] dark:border-slate-700/60 dark:bg-slate-800/70 dark:hover:border-amber-500/30">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
              <Trophy size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-gray-900 dark:text-slate-100">Liga</p>
              <p className="truncate text-[11px] text-gray-400 dark:text-slate-400">
                {competition?.my ? `#${competition.my.rank} minggu ini` : "Kompetisi mingguan"}
              </p>
              <span className="mt-1 inline-block text-[11px] font-bold text-amber-600 dark:text-amber-400">Kejar Peringkat →</span>
            </div>
          </Link>
          <Link href="/arena/game" className="group flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/[0.06] dark:border-slate-700/60 dark:bg-slate-800/70 dark:hover:border-indigo-500/30">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <Gamepad2 size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-gray-900 dark:text-slate-100">Gim</p>
              <p className="truncate text-[11px] text-gray-400 dark:text-slate-400">Kuis Tempur & gim solo</p>
              <span className="mt-1 inline-block text-[11px] font-bold text-indigo-600 dark:text-indigo-400">Main Sekarang →</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── 4. KOMPETISI MINGGU INI — jantung Arena (Misi + Liga) ── */}
      <section aria-label="Kompetisi Minggu Ini">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
            <Medal size={18} />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Kompetisi Minggu Ini</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">Misi harian dan liga mingguan — minggu ini kamu mengejar sesuatu.</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Misi Hari Ini */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/70">
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-slate-100">
                <Target size={16} className="text-violet-500" /> Misi Hari Ini
              </h3>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                {doneQuest}/{totalQuest} selesai
              </span>
            </div>
            {totalQuest > 0 && (
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all" style={{ width: `${questPct}%` }} />
              </div>
            )}
            {quests.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-400">Belum ada misi hari ini.</p>
            ) : (
              <div className="space-y-1">
                {quests.slice(0, 3).map((q: any) => {
                  const meta = getQuestMeta(q.questType)
                  const pct = Math.min(100, (Math.min(q.progress, q.target) / Math.max(q.target, 1)) * 100)
                  return (
                    <div key={q.id} className="flex items-center gap-3 py-2">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${q.completed ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" : `bg-gradient-to-br ${meta.warna} text-white`}`}>
                        {q.completed ? <CheckCircle2 size={18} /> : <meta.Icon size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${q.completed ? "text-gray-400 line-through dark:text-slate-500" : "text-gray-900 dark:text-slate-100"}`}>{meta.label}</p>
                        {!q.completed && (
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                              <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="shrink-0 text-xs text-gray-400 dark:text-slate-400">{questProgressText(Math.min(q.progress, q.target), q.target, q.completed)}</span>
                          </div>
                        )}
                      </div>
                      {q.rewardCoins > 0 && (
                        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <Coins size={12} />{q.rewardCoins}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <Link href="/arena/misi" className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-violet-50 py-2 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20">
              Lanjutkan Misi <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Liga Minggu Ini */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/70">
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-slate-100">
                <Trophy size={16} className="text-amber-500" /> Liga Minggu Ini
              </h3>
              <Link href="/arena/league" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">
                Lihat Liga
              </Link>
            </div>
            {competition ? (
              <div className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-black text-gray-900 dark:text-slate-100">{competition.my ? `#${competition.my.rank}` : "—"}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-gray-500 dark:text-slate-400">{competition.my?.weeklyXp.toLocaleString() ?? 0} XP minggu ini</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400"><WeeklyCountdown endsAt={competition.periodEndsAt} baseline={competition.now} /></p>
                    <p className="text-[10px] font-medium text-gray-400 dark:text-slate-500">tersisa minggu ini</p>
                  </div>
                </div>
                {competition.above && competition.my && competition.my.rank > 1 ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    Hanya <span className="font-black">{competition.gapToNext.toLocaleString("id-ID")} XP</span> di depanmu — kejar #{competition.above.rank}!
                  </p>
                ) : competition.totalParticipants > 0 ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-gray-600 dark:bg-slate-700/40 dark:text-slate-300">
                    Bersaing dengan {competition.totalParticipants.toLocaleString("id-ID")} murid lain
                  </p>
                ) : null}
                <Link href="/arena/league" className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:from-amber-400 hover:to-orange-400">
                  Kejar Ranking <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-gray-500 dark:bg-slate-700/40 dark:text-slate-400">
                Kompetisi mingguan sedang disiapkan.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 5. GAME ARENA — featured (mini) + 3 gim sekunder (light) ── */}
      <section aria-label="Game Arena">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <Gamepad2 size={18} />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Game Arena</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Main cepat, kumpulkan XP.</p>
            </div>
          </div>
          <Link href="/arena/game" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">
            Lihat Semua Gim
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Link href={kuisTempurHref} className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B0A1A] to-[#2D1566] p-5 text-white shadow-md transition-all hover:shadow-lg hover:shadow-violet-900/30">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-600/20 blur-xl" />
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
                  <Swords size={10} /> Kuis Tempur
                </div>
                <p className="mt-2 text-sm font-extrabold">Mode battle langsung</p>
                <p className="mt-1 text-[11px] text-slate-300">Jawab cepat, kalahkan lawan. Solo vs bot tersedia.</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400/90 px-2 py-1 text-[10px] font-extrabold text-amber-950">
                <Zap size={10} /> +80 XP
              </span>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-300 transition-all group-hover:gap-2">
              Main Sekarang <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {GIM_SEKUNDER.map((g) => (
              <Link key={g.href} href={g.href} className="group flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/[0.06] dark:border-slate-700/60 dark:bg-slate-800/70 dark:hover:border-violet-500/30">
                <div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                    <g.icon size={16} />
                  </span>
                  <p className="mt-2.5 text-sm font-bold text-gray-900 dark:text-slate-100">{g.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-400 dark:text-slate-400">{g.desc}</p>
                </div>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">{g.xp}</span>
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-gray-400 dark:text-slate-500">
          {recentPlayers.length > 0 ? `${recentPlayers.length} pemenang terbaru sedang aktif berkompetisi` : "Ajak temanmu — lawan siapa pun di arena pertarungan"}
        </p>
      </section>

      {/* ── 6. PAPAN PERINGKAT — social proof ── */}
      <section aria-label="Papan Peringkat">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
              <Medal size={18} />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Papan Peringkat</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Ada murid lain yang sedang bersaing denganmu.</p>
            </div>
          </div>
          <Link href="/arena/player/leaderboard" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">
            Lihat Semua
          </Link>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/70">
          <LeaderboardPanel compact />
        </div>
      </section>

      {/* ── 7. REWARD & PENCAPAIAN — setelah activity (PLAY → COMPETE → PROGRESS → REWARD) ── */}
      <section aria-label="Reward dan Pencapaian">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
            <Gift size={18} />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Reward & Pencapaian</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">Kumpulkan lencana, klaim hadiah, tukar koinmu.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/70">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Koin + Toko */}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 p-4 dark:from-amber-500/10 dark:to-yellow-500/10">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-sm">
                  <Coins className="h-6 w-6 text-white" />
                </span>
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-slate-100">{user.coins || 0}</p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">koin kamu</p>
                </div>
              </div>
              <Link href="/arena/toko-koin" className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:from-amber-400 hover:to-yellow-400">
                Toko Koin <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Lencana */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-gray-900 dark:text-slate-100">Lencana</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-400">{unlockedBadges} dari {badges.length} terbuka</p>
                <div className="mt-2 flex items-center gap-1.5">
                  {badges.slice(0, 6).map((b) => (
                    <div key={b.id} className={`flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700/40 ${b.unlocked ? "ring-2 ring-amber-300/50" : ""}`}>
                      <BadgeIcon icon={b.icon} size={22} alt={b.name} className={b.unlocked ? "" : "grayscale opacity-70"} />
                    </div>
                  ))}
                  {badges.length === 0 && <span className="text-[11px] text-gray-400">Belum ada lencana</span>}
                </div>
              </div>
              <Link href="/arena/player/badges" className="flex shrink-0 items-center gap-1 rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 transition-all hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Koleksi <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Pencapaian preview */}
          <div className="mt-5 border-t border-gray-100 pt-4 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-extrabold text-gray-900 dark:text-slate-100">
                <Award size={15} className="text-violet-500" /> Pencapaian
              </p>
              <Link href="/arena/player/achievements" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">
                Lihat Semua
              </Link>
            </div>
            <div className="mt-3 space-y-1">
              {achievements.slice(0, 3).map((a) => {
                const pct = Math.min(100, (a.progress / Math.max(a.target, 1)) * 100)
                return (
                  <div key={a.id} className="flex items-center gap-3 py-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-sm">
                      <BadgeIcon icon={a.icon} size={22} alt={a.name} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{a.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                          <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-600" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="shrink-0 text-[10px] text-gray-400 dark:text-slate-400">
                          {a.completed ? (a.claimed ? "Diklaim" : "+" + a.rewardXP + " XP") : `${a.progress}/${a.target}`}
                        </span>
                      </div>
                    </div>
                    {a.completed && <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />}
                  </div>
                )
              })}
              {achievements.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-slate-400">Belum ada pencapaian — teruslah belajar dan bermain!</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}