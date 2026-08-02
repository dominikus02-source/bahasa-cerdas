import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlayerTheme } from "@/components/arena/player/player-theme";
import { PlayerPageShell } from "@/components/arena/player/page-shell";
import { ProfileTabs } from "@/components/arena/player/profile-tabs";

export const dynamic = "force-dynamic";

export default async function PlayerProfilePage() {
  const user = await getUser();
  if (!user) redirect("/auth/arena-login");

  return (
    <PlayerTheme>
      <PlayerPageShell title="Profil Pemain" subtitle="Ringkasan lengkap pencapaian dan koleksimu." name={user.fullName || user.nickname || "Pemain"}>
        <ProfileTabs />
      </PlayerPageShell>
    </PlayerTheme>
  );
}
