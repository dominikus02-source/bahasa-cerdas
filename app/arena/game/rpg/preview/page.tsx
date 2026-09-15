/**
 * Controlled internal preview for the unpublished Pendekar Suryakerta RPG.
 *
 * This is deliberately a server component. Access is decided from the verified
 * server session, server-only environment variables, and the unpublished
 * registry state before the existing client runtime is rendered.
 */

import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { gameById } from "@/lib/arena/game-registry";
import {
  canUseRpgFounderPreview,
  currentRpgPreviewEnvironment,
} from "@/lib/arena/rpg-founder-preview";
import RpgClient from "../RpgClient";

export default async function RpgFounderPreviewPage() {
  const user = await getUser();
  if (!user) redirect("/arena/login");

  const access = canUseRpgFounderPreview(user, currentRpgPreviewEnvironment());

  if (!access.allowed) {
    redirect("/arena/game");
  }

  // Preview exists only while the regular route remains unpublished. If a
  // launch changes registry status later, this hidden route fails closed.
  const game = gameById("rpg");
  if (!game || !game.unpublished) redirect("/arena/game");

  return <RpgClient playerId={user.id} playerName={user.fullName || "Pendekar"} />;
}
