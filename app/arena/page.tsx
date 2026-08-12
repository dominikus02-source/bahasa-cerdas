import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import cache from "@/lib/redis"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"
import {
  Flame, Zap, Coins, Target, Bot, Trophy, Award, Gift,
  ChevronRight, Gamepad2, CheckCircle2,
} from "lucide-react"
import { trackDailyStreak, getOrCreateDailyQuests } from "@/lib/coins"
import { jenjangMurid } from "@/lib/arena-junior/kurikulum"
import { getQuestMeta, questProgressText } from "@/lib/quest-meta"
import { getLevelProgress, levelFromXp } from "@/lib/gamification/levels"
import { rankFromLevel } from "@/lib/gamification/ranks"
import { RankChip } from "@/components/gamification/RankChip"
import { SiaranBanner } from "@/components/arena/SiaranBanner"
import { getDisplayName } from "@/lib/nickname"
import { getWeeklyCompetition } from "@/lib/gamification/motivation"
import { listUserBadges, type BadgeView } from "@/lib/gamification/badge-engine"
import { listAchievements, type AchievementView } from "@/lib/gamification/achievement-engine"
import WeeklyCountdown from "@/components/arena/player/WeeklyCountdown"
import BattleCard from "@/components/arena/BattleCard"
import NextActionCard from "@/components/arena/player/NextActionCard"
import { LeaderboardPanel } from "@/components/arena/player/leaderboard-panel"

function initials(name: string) {
  return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"
}

const RARITY_STYLES: Record<string, string> = {
  BRONZE: "from-amber-600 to-orange-800",
  SILVER: "from-slate-400 to-slate-600",
  GOLD: "from-yellow-400 to-amber-600",
  LEGENDARY: "from-fuchsia-500 to-purple-700",
}

// Slot gim tambahan di section Gim. Cukup tambahkan objek di sini — kartu
// muncul otomatis tanpa mengubah IA utama (engine game tidak disentuh).
const GIM_TAMBAHAN: { title: string; desc: string; href: string; badge?: string }[] = [
  // { title: "Menara Cerdas", desc: "Panjat menara dengan soal pelajaranmu", href: "/arena/game/menara", badge: "Baru" },
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

  const [aktivitas, competition, badges, achievements, recentBattles] = await Promise.all([
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
    db.gameResult.count({ where: { createdAt: { gte: todayStart } } }),
  ])

  const unlockedBadges = badges.filter((b) => b.unlocked).length
  const profileHref = isGuruPreview ? "/guru/akun" : "/murid/profile"
  const questPct = Math.round((doneQuest / Math.max(totalQuest, 1)) * 100)

  return (
    <div className="arena-page max-w-6xl mx-auto p-4 md:p-6">
      {/* Siaran platform — kabar sistem & acara untuk semua murid. */}
      <SiaranBanner />

      {/* A — Hero pemain (kompak, horizontal di desktop) */}
      <div className="arena-hero relative overflow-hidden rounded-[20px] bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-lg shadow-violet-500/20">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-14 -left-10 h-44 w-44 rounded-full bg-white/5" />
        <div className="relative z-10 flex flex-col gap-4 p-4 md:flex-row md:items-center md:gap-5 md:px-6 md:py-5">
          {/* Identitas */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-lg font-bold text-white border-2 border-white/30 shadow-lg">
              {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : initials(nameOf(user))}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-200">Arena BahasaCerdas</p>
              <h2 className="truncate text-base font-extrabold md:text-lg">{nameOf(user)}</h2>
              <div className="mt-1 flex items-center gap-2">
                <RankChip rank={displayRank} size={14} className="bg-white/20 backdrop-blur" />
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">Tingkat {displayLevel}</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden h-12 w-px bg-white/15 md:block" />

          {/* Stat ringkas */}
          <div className="flex flex-wrap items-center gap-2">
            <span title="Rentetan harian" className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
              <Flame className="h-3.5 w-3.5 text-amber-300" /> {user.streak || 0} <span className="font-medium text-violet-200">hari</span>
            </span>
            <span title="Total XP" className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
              <Zap className="h-3.5 w-3.5 text-amber-300" /> {totalXp.toLocaleString()} <span className="font-medium text-violet-200">XP</span>
            </span>
            <span title="Koin" className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
              <Coins className="h-3.5 w-3.5 text-amber-300" /> {user.coins || 0}
            </span>
          </div>

          {/* Progress + CTA */}
          <div className="flex items-center gap-3 md:ml-auto">
            <div className="w-full md:w-40">
              <div className="mb-1 flex justify-between text-[10px] font-semibold text-violet-200">
                <span>Menuju tingkat {displayLevel + 1}</span>
                <span>{progress.current}/{progress.needed}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 transition-all duration-500" style={{ width: `${progress.pct * 100}%` }} />
              </div>
            </div>
            <Link href={profileHref} className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-2 text-xs font-bold backdrop-blur transition-colors hover:bg-white/25">
              Lihat Profil <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* B — Aksi Berikutnya (CTA utama halaman) */}
      <NextActionCard className="mt-5" />

      {/* AI BC — companion, subtle tapi visible */}
      <Link href="/arena/ai" className="group mt-4 flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 transition-colors hover:border-violet-200 dark:border-violet-500/20 dark:bg-violet-500/10 dark:hover:border-violet-500/40">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-gray-900 dark:text-slate-100">
            AI BC <span className="font-normal text-gray-500 dark:text-slate-400">· Teman belajarmu siap membantu.</span>
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400">
          Tanya AI BC <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>

      {/* C + D — Misi Hari Ini | Liga */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Misi Hari Ini — checklist actionable */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Target size={18} className="text-orange-500" />
              Misi Hari Ini
            </h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              {doneQuest}/{totalQuest} selesai
            </span>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-800/70">
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
            <Link href="/arena/misi" className="mt-3 flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10">
              Lihat Semua Misi <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Liga — event competition mingguan */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              Liga
            </h3>
            <Link href="/arena/league" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">
              Lihat Liga
            </Link>
          </div>
          {competition ? (
            <Link href="/arena/league" className="group block">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-5 shadow-lg shadow-orange-500/20 transition-all group-hover:shadow-xl group-hover:shadow-orange-500/30">
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/5" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-200" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-100">Liga Minggu Ini</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-3xl font-black text-white">{competition.my ? `#${competition.my.rank}` : "—"}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-amber-100">{competition.my?.weeklyXp.toLocaleString() ?? 0} XP minggu ini</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-white"><WeeklyCountdown endsAt={competition.periodEndsAt} baseline={competition.now} /></p>
                      <p className="text-[10px] font-medium text-amber-100/90">tersisa minggu ini</p>
                    </div>
                  </div>
                  {competition.above && competition.my && competition.my.rank > 1 ? (
                    <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-amber-50">
                      Hanya <span className="font-black text-white">{competition.gapToNext.toLocaleString("id-ID")} XP</span> di depanmu — kejar #{competition.above.rank}!
                    </p>
                  ) : competition.totalParticipants > 0 ? (
                    <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-amber-50">
                      Bersaing dengan {competition.totalParticipants.toLocaleString("id-ID")} murid lain
                    </p>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-amber-100/80">XP dihitung ulang tiap Senin</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-black text-orange-600 shadow-md transition-all group-hover:gap-2">
                      {competition.above && competition.my && competition.my.rank > 1 ? "Kejar Mereka" : "Lihat Liga"} <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 text-sm text-gray-500 dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-400">
              Kompetisi mingguan sedang disiapkan.
            </div>
          )}
        </div>
      </div>

      {/* E + F — Gim | Papan Peringkat */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Gim — satu kartu utama (Kuis Tempur), slot tambahan expandable */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Gamepad2 size={18} className="text-violet-500" />
              Gim
            </h3>
            <Link href="/arena/game" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">
              Semua Gim
            </Link>
          </div>
          <BattleCard
            onlineCount={0}
            recentBattles={recentBattles}
            recentPlayers={aktivitas.map((a: any) => ({ userId: a.userId, user: a.user ? { fullName: a.user.fullName } : null }))}
          />
          {GIM_TAMBAHAN.length > 0 && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {GIM_TAMBAHAN.map((g) => (
                <Link key={g.href} href={g.href} className="rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-violet-200 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70">
                  <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{g.title}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400">{g.desc}</p>
                  {g.badge && <span className="mt-2 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">{g.badge}</span>}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Papan Peringkat — social ranking */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              Papan Peringkat
            </h3>
            <Link href="/arena/player/leaderboard" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">
              Lihat Semua
            </Link>
          </div>
          <LeaderboardPanel compact />
        </div>
      </div>

      {/* G + H — Pencapaian | Koleksi & Hadiah */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Pencapaian — preview lencana (maks 8, bukan wall of icons) */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Award size={18} className="text-violet-500" />
              Pencapaian
            </h3>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
              {unlockedBadges} dari {badges.length} terbuka
            </span>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-800/70">
            {badges.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-400">Belum ada lencana — selesaikan misi dan mainkan gim untuk membukanya.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {badges.slice(0, 8).map((b) => {
                  const target = (b.condition as any)?.target ?? 1
                  const pct = Math.min(100, (b.progress / Math.max(target, 1)) * 100)
                  return (
                    <div key={b.id} className={`flex flex-col items-center gap-1.5 ${!b.unlocked ? "opacity-60" : ""}`}>
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-lg shadow-sm ${RARITY_STYLES[b.rarity] ?? "from-violet-500 to-purple-600"} ${!b.unlocked ? "grayscale" : ""} ${b.unlocked ? "ring-2 ring-amber-300/50" : ""}`}>
                        {b.icon}
                      </div>
                      <p className="line-clamp-1 text-center text-[10px] font-semibold leading-tight text-gray-700 dark:text-slate-300">{b.name}</p>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <Link href="/arena/player/badges" className="mt-3 flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10">
              Lihat Semua Lencana <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Koleksi & Hadiah — closing section */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Gift size={18} className="text-pink-500" />
              Koleksi & Hadiah
            </h3>
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <Coins size={14} />{user.coins || 0} koin
            </span>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-800/70">
            <Link href="/arena/toko-koin" className="group flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-3 transition-all hover:border-amber-200 hover:shadow-md dark:border-amber-500/20 dark:from-amber-500/10 dark:to-yellow-500/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 shadow-sm">
                  <Coins className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-slate-100">Toko Koin</p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">Tukar koinmu dengan hadiah menarik</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-amber-500 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <div className="mt-4 space-y-1">
              {achievements.slice(0, 3).map((a) => {
                const pct = Math.min(100, (a.progress / Math.max(a.target, 1)) * 100)
                return (
                  <div key={a.id} className="flex items-center gap-3 py-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-lg shadow-sm">
                      {a.icon}
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
            <Link href="/arena/player/achievements" className="mt-3 flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10">
              Lihat Semua Pencapaian <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
