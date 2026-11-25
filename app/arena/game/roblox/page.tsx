import { redirect } from "next/navigation";
import RobloxLinkPanel from "@/components/arena/roblox/RobloxLinkPanel";
import { gameById } from "@/lib/arena/game-registry";
import { getRobloxPageStatus } from "@/lib/roblox/service";
import { getUser } from "@/lib/supabase/server";

export default async function RobloxArenaPage() {
  const user = await getUser();
  if (!user) redirect("/arena/login");

  const game = gameById("roblox");
  if (!game) redirect("/arena/game");

  let status = null;
  try {
    status = await getRobloxPageStatus(user.id);
  } catch {
    status = null;
  }

  if (!status) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <p className="text-bc-body text-bc-text">Tautan Roblox belum siap. Coba lagi nanti.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">
      <RobloxLinkPanel
        title={game.title}
        description={game.description}
        accentColor={game.accentColor}
        gradient={game.gradient}
        initialStatus={status}
      />
    </div>
  );
}
