import { getUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { trackDailyStreak } from "@/lib/coins"
import { jenjangMurid } from "@/lib/arena-junior/kurikulum"
import { SiaranBanner } from "@/components/arena/SiaranBanner"
import ArenaHomepage from "@/components/arena/ArenaHomepage"
import { getPlayerProfile } from "@/lib/gamification/player"

export const dynamic = "force-dynamic"

/**
 * ARENA 2.0 — ARENA HOME (Game Hub Experience)
 *
 * Server component: fetches user data + PlayerProfile for real weeklyXp/seasonXp.
 * Client component (ArenaHomepage): renders the game lobby UI.
 *
 * All gamification data comes from the server — no client-side entitlement spoofing.
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

  // Query PlayerProfile for real weeklyXp/seasonXp (same source as leaderboard).
  const profile = await getPlayerProfile(user.id)

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
        weeklyXp={profile.weeklyXp}
        seasonXp={profile.seasonXp}
        isFounder={!!user.isFounder}
      />
    </div>
  )
}
