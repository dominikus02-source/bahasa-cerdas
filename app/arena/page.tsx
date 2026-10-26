import { getUser } from "@/lib/supabase/server"
import { isUmum, UMUM_HOME } from "@/lib/auth/roles"
import { redirect } from "next/navigation"
import { getOrCreateDailyQuests, trackDailyStreak } from "@/lib/coins"
import { jenjangMurid } from "@/lib/arena-junior/kurikulum"
import { SiaranBanner } from "@/components/arena/SiaranBanner"
import ArenaHomepage from "@/components/arena/ArenaHomepage"

export const dynamic = "force-dynamic"

/**
 * ARENA 2.0 — ARENA HOME (Game Hub Experience)
 *
 * Server component: only reads the canonical player/quest sources. Client
 * component (ArenaHomepage) renders the Player HQ composition.
 *
 * All gamification data comes from the server — no client-side entitlement spoofing.
 */
export default async function BerandaPage() {
  const user = await getUser()
  if (!user) redirect("/arena/login")
  // UMUM: halaman ini di luar allowlist Arena UMUM (lib/auth/roles.ts).
  // Guard di level halaman karena layout tidak dirender ulang saat navigasi klien.
  if (isUmum(user.role)) redirect(UMUM_HOME)

  // Murid TK–SD punya dasbor sendiri (Arena Junior).
  if (user.role === "MURID") {
    const jenjang = await jenjangMurid(user.id)
    if (jenjang) redirect("/junior")
  }

  // Allowlist eksplisit: pratinjau hanya untuk GURU (bukan "selain murid").
  const isGuruPreview = user.role === "GURU" && !user.isFounder
  if (!isGuruPreview) await trackDailyStreak(user.id)

  // Real daily quest rows are passed as a small, serializable view. Reward
  // claiming remains on /arena/misi; this page is read-only.
  const quests = await getOrCreateDailyQuests(user.id)

  return (
    <div className="arena-page">
      <SiaranBanner />
      <ArenaHomepage
        fullName={user.fullName}
        badgeKind={user.badgeKind}
        nickname={user.nickname}
        avatar={user.avatar}
        xp={user.xp || 0}
        streak={user.streak || 0}
        coins={user.coins || 0}
        equippedFrame={user.equippedFrame}
        equippedNameColor={user.equippedNameColor}
        quests={quests.map((quest) => ({
          id: quest.id,
          questType: quest.questType,
          target: quest.target,
          progress: quest.progress,
          completed: quest.completed,
          rewardCoins: quest.rewardCoins,
        }))}
      />
    </div>
  )
}
