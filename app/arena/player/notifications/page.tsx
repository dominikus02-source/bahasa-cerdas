import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlayerTheme } from "@/components/arena/player/player-theme";
import { PlayerPageShell } from "@/components/arena/player/page-shell";
import { NotificationCenter } from "@/components/arena/player/notification-center";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getUser();
  if (!user) redirect("/arena/login");

  return (
    <PlayerTheme>
      <PlayerPageShell title="Notifikasi" subtitle="Aktivitas reward dan pencapaian terbarumu." name={user.fullName || user.nickname || "Pemain"}>
        <NotificationCenter />
      </PlayerPageShell>
    </PlayerTheme>
  );
}
