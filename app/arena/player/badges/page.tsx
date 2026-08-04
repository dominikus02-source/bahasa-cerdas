import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlayerTheme } from "@/components/arena/player/player-theme";
import { PlayerPageShell } from "@/components/arena/player/page-shell";
import { BadgeGrid } from "@/components/arena/player/badge-grid";

export const dynamic = "force-dynamic";

export default async function BadgesPage() {
  const user = await getUser();
  if (!user) redirect("/arena/login");

  return (
    <PlayerTheme>
      <PlayerPageShell title="Koleksi Badge" subtitle="Semua badge yang bisa kamu raih di BahasaCerdas." name={user.fullName || user.nickname || "Pemain"}>
        <BadgeGrid />
      </PlayerPageShell>
    </PlayerTheme>
  );
}
