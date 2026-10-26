import { getUser } from "@/lib/supabase/server";
import { isUmum, UMUM_HOME } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { PlayerTheme } from "@/components/arena/player/player-theme";
import { PlayerPageShell } from "@/components/arena/player/page-shell";
import { LeaderboardPanel } from "@/components/arena/player/leaderboard-panel";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const user = await getUser();
  if (!user) redirect("/arena/login");
  // UMUM: halaman ini di luar allowlist Arena UMUM (lib/auth/roles.ts).
  // Guard di level halaman karena layout tidak dirender ulang saat navigasi klien.
  if (isUmum(user.role)) redirect(UMUM_HOME);

  return (
    <PlayerTheme>
      <PlayerPageShell title="Leaderboard" subtitle="Lihat posisi kamu dan teman-temanmu." name={user.fullName || user.nickname || "Pemain"}>
        <LeaderboardPanel />
      </PlayerPageShell>
    </PlayerTheme>
  );
}
