import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getOrCreateDailyQuests, trackDailyStreak, getClaimedQuestIds } from "@/lib/coins"
import { Flame, CheckCircle2, PenLine, MessageCircle, Heart, Zap, Sparkles, Target } from "lucide-react"
import { ClaimButton } from "./claim-button"
import { getQuestMeta, questProgressText } from "@/lib/quest-meta"

export default async function MisiHarianPage() {
  const user = await getUser()
  if (!user) redirect("/arena/login")

  await trackDailyStreak(user.id)
  const quests = await getOrCreateDailyQuests(user.id)
  const userData = await db.user.findUnique({
    where: { id: user.id },
    select: { streak: true, coins: true, xp: true },
  })

  const claimedIds = await getClaimedQuestIds(user.id, quests.map((q: any) => q.id))

  const completedQuests = quests.filter((q: any) => q.completed).length
  const totalQuests = quests.length
  const semuaSelesai = completedQuests === totalQuests && totalQuests > 0

  return (
    <div className="px-4 py-5 arena-page">
      {/* Header — konsep Arena 2.0: icon chip + eyebrow + judul + subjudul */}
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 shadow-sm dark:bg-violet-500/15 dark:text-violet-300">
          <Target className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Arena BahasaCerdas</p>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Misi</h1>
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Selesaikan misi harian, kumpulkan koin dan XP!</p>
        </div>
      </div>

      {/* Streak card */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-5 mb-5 shadow-lg shadow-orange-200/50">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 dark:bg-slate-900/20 backdrop-blur flex items-center justify-center text-3xl">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-lg">{userData?.streak || 0} Hari Streak</p>
            <p className="text-orange-100 text-sm">Teruslah belajar setiap hari!</p>
          </div>
          <div className="text-right">
            <p className="text-white font-bold text-2xl">{completedQuests}/{totalQuests}</p>
            <p className="text-orange-100 text-xs">Misi Selesai</p>
          </div>
        </div>
        <div className="w-full h-2 bg-white/20 dark:bg-slate-900/20 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-white dark:bg-slate-800/90 rounded-full transition-all duration-700"
            style={{ width: `${totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Daftar misi */}
      <div className="space-y-3 mb-6">
        {quests.map((quest: any) => {
          const meta = getQuestMeta(quest.questType)
          const progress = Math.min(quest.progress, quest.target)
          const progressPct = quest.target > 0 ? (progress / quest.target) * 100 : 0
          const isDone = quest.completed

          return (
            <div
              key={quest.id}
              className={`bg-white dark:bg-slate-800/90 rounded-2xl border p-5 transition-all ${
                isDone ? "border-emerald-200 bg-emerald-50/50" : "border-gray-100 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.warna} flex items-center justify-center text-2xl shadow-md shrink-0`}>
                  {isDone ? <CheckCircle2 className="w-7 h-7 text-white" /> : <meta.Icon className="w-7 h-7 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-slate-100 text-base">{meta.label}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {progress}/{quest.target} — {questProgressText(progress, quest.target, isDone)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">+{quest.rewardCoins} Koin</p>
                  {isDone && <ClaimButton questId={quest.id} alreadyClaimed={claimedIds.has(quest.id)} />}
                </div>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-slate-800/80 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isDone ? "bg-emerald-400" : "bg-violet-400"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Semua selesai */}
      {semuaSelesai && (
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-center shadow-lg mb-6">
          <div className="w-16 h-16 rounded-full bg-white/20 dark:bg-slate-900/20 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-9 h-9 text-white" />
          </div>
          <p className="text-white font-bold text-lg">Semua misi selesai!</p>
          <p className="text-emerald-100 text-sm mt-1">Besok kembali lagi untuk misi baru</p>
        </div>
      )}

      {/* Info koin — theme-aware penuh (dark: variant utk background & chip) */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 dark:border-amber-500/20 dark:from-amber-500/10 dark:to-yellow-500/10">
        <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-amber-800 dark:text-amber-300">
          <Zap className="w-5 h-5" /> Cara Dapat Koin
        </h3>
        <div className="space-y-3">
          <Link href="/arena/tulis" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center"><PenLine className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Tulis Karya</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">+10 koin setiap karya baru</p>
            </div>
          </Link>
          <Link href="/arena/feed" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center"><Heart className="w-5 h-5 text-rose-600 dark:text-rose-400" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Dapat Suka</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">+2 koin setiap suka dari orang lain</p>
            </div>
          </Link>
          <Link href="/arena/feed" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center"><MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Beri Komentar</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">+1 koin setiap komentar</p>
            </div>
          </Link>
          <Link href="/arena/jalur-cerdas" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center"><Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Rentetan Harian</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">+5 koin setiap login berturut-turut</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
