import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getWeeklyCompetition } from "@/lib/gamification/motivation";

/**
 * GET /arena/competition — payload "Kompetisi Minggu Ini" + Hall of Fame.
 * Role-gated: murid melihat kompetisinya sendiri; guru/founder membaca versi
 * tanpa `my` (kompetisi murid) untuk preview.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await getWeeklyCompetition(user.id);

  return NextResponse.json(payload);
}
