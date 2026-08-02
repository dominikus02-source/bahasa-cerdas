import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlayerTheme } from "@/components/arena/player/player-theme";
import { PlayerPageShell } from "@/components/arena/player/page-shell";
import { LeaderboardPanel } from "@/components/arena/player/leaderboard-panel";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const user = await getUser();
  if (!user) redirect("/auth/arena-login");

  return (
    <PlayerTheme>
      <PlayerPageShell title="Papan Peringkat" subtitle="Bersainglah untuk menjadi yang teratas minggu ini!" name={user.fullName || user.nickname || "Pemain"}>
        <LeaderboardPanel />
      </PlayerPageShell>
    </PlayerTheme>
  );
}
