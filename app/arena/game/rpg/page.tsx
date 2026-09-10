/**
 * RPG Game Route — Pendekar Suryakerta: Legenda Nusantara.
 *
 * STATUS: UNPUBLISHED (lihat `unpublished` di lib/arena/game-registry.ts).
 *
 * Guard server-side (BUKAN kondisional client/CSS):
 * - user belum login → /arena/login (pola sama seperti /arena/game)
 * - gim UNPUBLISHED → /arena/game untuk SEMUA user, tanpa pengecualian
 *
 * Launch mendatang: PUBLISHED + KHUSUS PREMIUM — ganti cabang kedua dengan
 * cek entitlement server-side memakai arsitektur Premium proyek yang ada.
 */

import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { gameById } from "@/lib/arena/game-registry";
import RpgClient from "./RpgClient";

export default async function RpgPage() {
  const user = await getUser();
  if (!user) redirect("/arena/login");

  const game = gameById("rpg");
  if (!game || game.unpublished) redirect("/arena/game");

  return <RpgClient />;
}
