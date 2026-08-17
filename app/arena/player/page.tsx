import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlayerTheme } from "@/components/arena/player/player-theme";
import { PlayerDashboard } from "@/components/arena/player/player-dashboard";

export const dynamic = "force-dynamic";

export default async function PlayerPage() {
  const user = await getUser();
  if (!user) redirect("/arena/login");

  return (
    <PlayerTheme>
      <PlayerDashboard name={user.fullName || user.nickname || "Pemain"} />
    </PlayerTheme>
  );
}
