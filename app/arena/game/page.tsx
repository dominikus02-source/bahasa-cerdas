import { getUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { levelFromXp } from "@/lib/gamification/levels"
import { rankFromLevel } from "@/lib/gamification/ranks"
import GameHubClient from "@/components/arena/game-hub/GameHubClient"
import { MULTIPLAYER_ENABLED } from "@/lib/features"

/**
 * ARENA GAME HUB 2.0 — game launcher BahasaCerdas.
 *
 * Halaman ini sengaja SE-RAMPING mungkin: hanya menyediakan ringkasan pemain
 * (identitas + XP/level/rank) lalu menyerahkan discovery ke GameHubClient
 * (client) yang murni digerakkan oleh game registry (lib/arena/game-registry.ts).
 *
 * Tidak ada fetch leaderboard/league/badge/prestasi/riwayat di sini — sesuai
 * misi: "Arena bukan tempat melihat statistik permainan. Arena adalah tempat
 * bermain." Semua itu tetap bisa diakses lewat route masing-masing
 * (/arena/player, /arena/league, /arena/misi, /arena/player/badges).
 *
 * Light/dark: shell arena (app/arena/layout.tsx) sudah theme-aware
 * (bg-gray-50 dark:bg-slate-950 + gradient) dan semua kartu di client memakai
 * Tailwind `dark:` variant — tidak ada warna hardcode di sini.
 */
export default async function ArenaGimPage() {
  const user = await getUser()
  if (!user) redirect("/arena/login")

  const level = levelFromXp(user.xp || 0)
  const rank = rankFromLevel(level)

  return (
    <div className="game-hub arena-page">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <GameHubClient
          user={{
            id: user.id,
            fullName: user.fullName,
            nickname: user.nickname,
            avatar: user.avatar,
            xp: user.xp || 0,
          }}
          level={level}
          rank={rank}
          multiplayerEnabled={MULTIPLAYER_ENABLED}
        />
      </div>
    </div>
  )
}
