import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlayerTheme } from "@/components/arena/player/player-theme";
import { PlayerPageShell } from "@/components/arena/player/page-shell";
import { AchievementGrid } from "@/components/arena/player/achievement-grid";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const user = await getUser();
  if (!user) redirect("/arena/login");

  return (
    <PlayerTheme>
      <PlayerPageShell title="Pencapaian" subtitle="Selesaikan tantangan untuk membuka hadiah XP dan koin." name={user.fullName || user.nickname || "Pemain"}>
        <AchievementGrid />
      </PlayerPageShell>
    </PlayerTheme>
  );
}
