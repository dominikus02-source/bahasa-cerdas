import { getUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { trackDailyStreak } from "@/lib/coins"
import { jenjangMurid } from "@/lib/arena-junior/kurikulum"
import { SiaranBanner } from "@/components/arena/SiaranBanner"
import ArenaHomepage from "@/components/arena/ArenaHomepage"

export const dynamic = "force-dynamic"

/**
 * ARENA 2.0 — ARENA HOME (Game Hub Experience)
 *
 * Server component: fetches user data, tracks streak, redirects juniors.
 * Client component (ArenaHomepage): renders the game lobby UI with
 * contextual hero, featured game, leaderboard, rank journey, and quick access.
 *
 * All gamification data (XP, level, rank, coins, streak) comes from the
 * server — no client-side entitlement spoofing.
 * Leaderboard is fetched client-side from existing API for freshness.
 */
export default async function BerandaPage() {
  const user = await getUser()
  if (!user) redirect("/arena/login")

  // Murid TK–SD punya dasbor sendiri (Arena Junior).
  if (user.role === "MURID") {
    const jenjang = await jenjangMurid(user.id)
    if (jenjang) redirect("/junior")
  }

  const isGuruPreview = user.role !== "MURID" && !user.isFounder
  if (!isGuruPreview) await trackDailyStreak(user.id)

  return (
    <div className="arena-page">
      <SiaranBanner />
      <ArenaHomepage
        userId={user.id}
        fullName={user.fullName}
        nickname={user.nickname}
        avatar={user.avatar}
        xp={user.xp || 0}
        streak={user.streak || 0}
        coins={user.coins || 0}
        equippedBackground={user.equippedBackground}
        equippedFrame={user.equippedFrame}
        equippedBadge={user.equippedBadge}
        equippedNameColor={user.equippedNameColor}
        equippedNameplate={user.equippedNameplate}
        weeklyXp={0}
        seasonXp={0}
        isFounder={!!user.isFounder}
      />
    </div>
  )
}
