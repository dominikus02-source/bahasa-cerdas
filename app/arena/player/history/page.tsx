import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlayerTheme } from "@/components/arena/player/player-theme";
import { PlayerPageShell } from "@/components/arena/player/page-shell";
import { HistoryTabs } from "@/components/arena/player/history-tabs";

export const dynamic = "force-dynamic";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/arena/login");
  const { tab } = await searchParams;

  return (
    <PlayerTheme>
      <PlayerPageShell title="Riwayat" subtitle="Catatan lengkap XP dan koin yang kamu peroleh." name={user.fullName || user.nickname || "Pemain"}>
        <HistoryTabs initialTab={tab === "koin" ? "koin" : "xp"} />
      </PlayerPageShell>
    </PlayerTheme>
  );
}
