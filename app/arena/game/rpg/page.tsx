/**
 * RPG Game Route — Pendekar Suryakerta (P2.8 Premium Early Access).
 *
 * Guard server-side (BUKAN kondisional client/CSS):
 * - user belum login → /arena/login (pola sama seperti /arena/game)
 * - founder-preview path (non-prod allowlist) → langsung main
 * - game PUBLISHED + plan Premium (MURID_PREMIUM/PRO/FOUNDER) → main
 * - game PUBLISHED + plan FREE → halaman terkunci (RpgLocked, bukan error)
 * - game UNPUBLISHED (darurat) → /arena/game (fail closed)
 *
 * Direct URL dilindungi gate yang sama — tidak ada bypass query/localStorage.
 */

import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { requireRpgPlayAccess } from "@/lib/game/rpg/server-access";
import RpgClient from "./RpgClient";
import RpgLocked from "./RpgLocked";

export default async function RpgPage() {
  const user = await getUser();
  if (!user) redirect("/arena/login");

  // P2.10-FREEZE: Founder/admin bypass — always allow access even when unpublished.
  const isPrivileged = user.isFounder || user.role === "ADMIN";

  const access = await requireRpgPlayAccess();
  if (!access.ok) {
    if (access.status === 401) redirect("/arena/login");
    if (isPrivileged && access.error.code === "PREVIEW_DENIED") {
      // Founder/admin: bypass unpublished gate (game is paused, not deleted).
      return <RpgClient playerId={user.id} playerName={user.fullName || "Pendekar"} />;
    }
    if (access.error.code === "PREMIUM_REQUIRED") {
      return <RpgLocked />;
    }
    redirect("/arena/game");
  }

  return <RpgClient playerId={access.userId} playerName={user.fullName || "Pendekar"} />;
}
